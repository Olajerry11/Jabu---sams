import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  ShieldCheck, ScanLine, XCircle, User, MessageSquare, Clock, CheckCircle2,
  Upload, Camera, X, WifiOff, ImageIcon, MapPin, ChevronDown, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import {
  doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy,
  onSnapshot, updateDoc, setDoc, getDocs, where, limit, Timestamp
} from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

interface ExeatRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userMatric: string;
  userPhoto: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
}

interface LuggageLog {
  id: string;
  imageUrl: string;
  timestamp: any;
  location: string;
  uploadedByName: string;
}

type ScanLocation = 'Main Gate' | 'Hostel Portal';

const SCAN_LOCATIONS: ScanLocation[] = ['Main Gate', 'Hostel Portal'];

export default function Scanner() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'scanner' | 'messages'>('scanner');
  const [exeatRequests, setExeatRequests] = useState<ExeatRequest[]>([]);
  const [scanLocation, setScanLocation] = useState<ScanLocation>('Main Gate');

  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    studentName?: string;
    studentRole?: string;
    studentPhoto?: string;
    studentUid?: string;
  }>({ status: null, message: '' });

  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Main Gate: luggage upload state
  const [luggageDataUrl, setLuggageDataUrl] = useState<string | null>(null);
  const [luggagePreview, setLuggagePreview] = useState<string | null>(null);
  const [uploadingLuggage, setUploadingLuggage] = useState(false);
  const [luggageUploaded, setLuggageUploaded] = useState(false);
  const luggageInputRef = useRef<HTMLInputElement>(null);

  // Hostel Portal: pre-clearance check results
  const [preClearanceLogs, setPreClearanceLogs] = useState<LuggageLog[] | null>(null);
  const [checkingClearance, setCheckingClearance] = useState(false);

  // ── Security Online Status ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.uid || userData.role !== 'security') return;

    const statusRef = doc(db, 'security_status', userData.uid);

    const goOnline = () => setDoc(statusRef, {
      uid: userData.uid,
      name: userData.name || 'Security',
      email: (userData as any).email || '',
      status: 'online',
      lastSeen: serverTimestamp(),
    }, { merge: true });

    const goOffline = () => setDoc(statusRef, {
      status: 'offline',
      lastSeen: serverTimestamp(),
    }, { merge: true });

    goOnline();
    window.addEventListener('beforeunload', goOffline);
    return () => {
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.uid]);

  // ── QR Scanner Init ───────────────────────────────────────────────────────
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (activeTab === 'scanner' && !scanResult.status) {
      scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (_decodedText: string) => {
          scanner?.clear();
          setIsScanning(false);
          verifyAccess(_decodedText);
        },
        (_error: unknown) => { /* ignore */ }
      );
      setIsScanning(true);
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scanResult.status]);

  // ── Exeat Requests Listener ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'messages') return;
    const q = query(collection(db, 'exeat_requests'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: ExeatRequest[] = [];
      snapshot.forEach((d) => requests.push({ id: d.id, ...d.data() } as ExeatRequest));
      setExeatRequests(requests);
    });
    return () => unsubscribe();
  }, [activeTab]);

  // ── Check if student was cleared at Main Gate (for Hostel Portal mode) ───
  const checkMainGateClearance = async (studentUid: string) => {
    setCheckingClearance(true);
    setPreClearanceLogs(null);
    try {
      // Look for a luggage_log for this student in the past 24 hours
      const sinceMillis = Date.now() - 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, 'luggage_logs'),
        where('studentUid', '==', studentUid)
      );
      const snap = await getDocs(q);
      
      const logs: LuggageLog[] = [];
      snap.forEach((d) => {
         const data = d.data();
         const logMillis = data.timestamp ? data.timestamp.toMillis() : Date.now();
         if (logMillis >= sinceMillis) {
            logs.push({ id: d.id, ...data } as LuggageLog);
         }
      });
      
      logs.sort((a, b) => {
         const timeA = a.timestamp ? a.timestamp.toMillis() : Date.now();
         const timeB = b.timestamp ? b.timestamp.toMillis() : Date.now();
         return timeB - timeA;
      });

      setPreClearanceLogs(logs.slice(0, 5));
    } catch (err) {
      console.error(err);
      setPreClearanceLogs([]);
    } finally {
      setCheckingClearance(false);
    }
  };

  // ── Access Verification ───────────────────────────────────────────────────
  const verifyAccess = async (code: string) => {
    const parts = code.split('-');
    let targetUid = '';

    if (parts.length === 4 && parts[0] === 'JABU' && parts[1] === 'TOTP') {
      targetUid = parts[2];
    } else {
      targetUid = code.trim();
    }

    if (!targetUid) {
      setScanResult({ status: 'error', message: 'Empty or Invalid Barcode' });
      return;
    }

    try {
      let userDoc = await getDoc(doc(db, 'users', targetUid));

      if (!userDoc.exists()) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('matric', '==', targetUid));
        const qs = await getDocs(q);
        if (!qs.empty) {
          userDoc = qs.docs[0];
          targetUid = userDoc.id;
        } else {
          const q2 = query(usersRef, where('staffId', '==', targetUid));
          const qs2 = await getDocs(q2);
          if (!qs2.empty) {
            userDoc = qs2.docs[0];
            targetUid = userDoc.id;
          } else {
            setScanResult({ status: 'error', message: 'User not found in database.' });
            return;
          }
        }
      }

      const targetData = userDoc.data();
      if (!targetData) {
        setScanResult({ status: 'error', message: 'User profile data is corrupt.' });
        return;
      }

      // Log the scan event
      await addDoc(collection(db, 'scans'), {
        scannedBy: userData?.uid || 'system',
        scannedByName: userData?.name || 'System Auto',
        targetUid,
        targetName: targetData.name || 'Unknown',
        targetRole: targetData.role || 'guest',
        status: targetData.status || 'suspended',
        timestamp: serverTimestamp(),
        location: scanLocation,
        rawCode: code,
      });

      // Reset luggage state for new scan
      setLuggageDataUrl(null);
      setLuggagePreview(null);
      setLuggageUploaded(false);
      setPreClearanceLogs(null);

      if (targetData.status === 'active') {
        const result = {
          status: 'success' as const,
          message: 'Access Granted — Valid ID',
          studentName: targetData.name || 'User Profile',
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase(),
          studentPhoto: targetData.photoUrl || targetData.photoURL,
          studentUid: targetUid,
        };
        setScanResult(result);
        showToast(`✅ ${result.studentName} — Access Granted`, 'success');

        // If at Hostel Portal, immediately check if student was cleared at Main Gate
        if (scanLocation === 'Hostel Portal') {
          checkMainGateClearance(targetUid);
        }
      } else {
        setScanResult({
          status: 'error' as const,
          message: `Access Denied — Status: ${targetData.status?.toUpperCase() ?? 'UNKNOWN'}`,
          studentName: targetData.name || 'User Profile',
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase(),
          studentPhoto: targetData.photoUrl || targetData.photoURL,
          studentUid: targetUid,
        });
        showToast(`🚫 ${targetData.name} — Access Denied`, 'error');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setScanResult({ status: 'error', message: 'Database query failed. Try again.' });
    }
  };

  const resetScanner = () => {
    setScanResult({ status: null, message: '' });
    setLuggageDataUrl(null);
    setLuggagePreview(null);
    setLuggageUploaded(false);
    setPreClearanceLogs(null);
    setActiveTab('messages');
    setTimeout(() => setActiveTab('scanner'), 10);
  };

  // ── Luggage Photo Handlers (Main Gate) ────────────────────────────────────
  const handleLuggageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Quick compression to speed up the luggage upload
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800; // Large enough for detail, small enough for fast upload
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setLuggageDataUrl(dataUrl);
                setLuggagePreview(dataUrl);
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLuggageUpload = async () => {
    if (!luggageDataUrl || !scanResult.studentUid) return;
    setUploadingLuggage(true);
    try {
      // Bypass Firebase Storage completely to avoid billing/CORS issues!
      const imageUrl = luggageDataUrl;

      await addDoc(collection(db, 'luggage_logs'), {
        studentUid: scanResult.studentUid,
        studentName: scanResult.studentName || 'Unknown',
        uploadedBy: userData?.uid || 'system',
        uploadedByName: userData?.name || 'Security',
        imageUrl,
        timestamp: serverTimestamp(),
        location: 'Main Gate',
      });

      setLuggageUploaded(true);
      showToast('✅ Luggage verified and logged. Student cleared for hostel entry!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload luggage photo. Try again.', 'error');
    } finally {
      setUploadingLuggage(false);
    }
  };

  const markRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'exeat_requests', id), { status });
      showToast(`Request marked as ${status}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update request', 'error');
    }
  };

  const isOnline = userData?.role === 'security';
  const isHostelPortal = scanLocation === 'Hostel Portal';
  const isMainGate = scanLocation === 'Main Gate';

  // Hostel clearance helpers
  const wasPreCleared = preClearanceLogs !== null && preClearanceLogs.length > 0;
  const notPreCleared = preClearanceLogs !== null && preClearanceLogs.length === 0;

  return (
    <div className="py-8 px-4 sm:px-8 max-w-4xl mx-auto min-h-[85vh] flex flex-col justify-start relative pt-20 sm:pt-24">

      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[50%] w-[60%] h-[60%] rounded-full bg-brand-500/10 blur-[120px] animate-float"></div>
      </div>

      <div className="relative z-10 animate-slide-up w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-white/50 backdrop-blur-md text-brand-600 rounded-2xl border border-white/50 shadow-sm premium-shadow">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Security Console</h1>
                {isOnline ? (
                  <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium mt-1">Verify passes &amp; manage gate requests</p>

              {/* Location Selector */}
              <div className="mt-3 relative inline-block">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm cursor-pointer group">
                  <MapPin className={`w-4 h-4 ${isMainGate ? 'text-brand-500' : 'text-purple-500'}`} />
                  <select
                    value={scanLocation}
                    onChange={(e) => {
                      setScanLocation(e.target.value as ScanLocation);
                      resetScanner();
                    }}
                    className="appearance-none bg-transparent text-sm font-bold text-slate-700 focus:outline-none pr-6 cursor-pointer"
                  >
                    {SCAN_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
                {/* Location description */}
                <p className="text-[11px] font-semibold mt-1.5 ml-1 text-slate-400">
                  {isMainGate
                    ? 'Scan students in & upload luggage photos as proof'
                    : 'Verify main gate clearance before allowing hostel entry'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'scanner' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ScanLine className="w-4 h-4" /> Live Scanner
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MessageSquare className="w-4 h-4" /> Gate Messages
            </button>
          </div>
        </div>

        {/* ─────────────────── SCANNER TAB ─────────────────── */}
        {activeTab === 'scanner' && (
          <div className="max-w-2xl mx-auto glass-panel overflow-hidden premium-shadow animate-fade-in">

            {/* Location banner */}
            <div className={`flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-widest uppercase ${isMainGate ? 'bg-brand-600 text-white' : 'bg-purple-600 text-white'}`}>
              <MapPin className="w-3.5 h-3.5" />
              {scanLocation} — Scanner Active
            </div>

            {/* Scanner viewport */}
            <div className="p-6 sm:p-8 bg-slate-900 text-white min-h-[380px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-stripes opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50 z-0"></div>

              {!scanResult.status ? (
                <div className="w-full max-w-[320px] relative z-10">
                  <div id="reader" className="w-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800 bg-black aspect-square"></div>
                  {isScanning && (
                    <div className="text-center mt-8 animate-pulse flex flex-col items-center gap-3">
                      <div className="w-16 h-1.5 bg-brand-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                      <p className="text-sm font-bold tracking-widest text-brand-400 uppercase">Awaiting Target...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center w-full py-8 fade-in relative z-10">
                  {scanResult.status === 'success' ? (
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-float">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)] animate-float">
                      <XCircle className="w-10 h-10" />
                    </div>
                  )}
                  <h2 className={`text-3xl font-display font-bold mb-2 tracking-tight ${scanResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {scanResult.status === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                  </h2>
                  <p className="text-slate-400 font-medium">{scanResult.message}</p>

                  {scanResult.studentName && (
                    <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-left flex items-center gap-4 mx-auto max-w-sm animate-slide-up">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                        {scanResult.studentPhoto ? (
                          <img src={scanResult.studentPhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : <User className="w-6 h-6 text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg leading-tight">{scanResult.studentName}</p>
                        <p className="text-xs font-bold tracking-wider text-brand-400 bg-brand-500/10 inline-block px-2 py-0.5 rounded-lg mt-1.5 uppercase">{scanResult.studentRole}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetScanner}
                    className="mt-8 px-8 py-3.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-500 transition-all shadow-lg hover:shadow-brand-500/25 active:scale-95 duration-200"
                  >
                    Scan Next Pass
                  </button>
                </div>
              )}
            </div>

            {/* ── MAIN GATE: Luggage Photo Upload ────────────── */}
            {isMainGate && scanResult.status === 'success' && (
              <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4 text-brand-500" />
                  Luggage Inspection &amp; Photo Evidence
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mb-4">
                  Snap &amp; upload the student's luggage. This photo is sent as proof to hostel portals allowing the student to proceed directly to their room.
                </p>

                {luggageUploaded ? (
                  <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Luggage verified &amp; logged!</p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">This student is now pre-cleared. Hostel portal will see this evidence when they scan the QR code.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {luggagePreview ? (
                      <div className="relative mb-4 group w-fit mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={luggagePreview} alt="Luggage preview" className="max-h-48 rounded-2xl object-cover w-full" />
                        <button
                          onClick={() => { setLuggageDataUrl(null); setLuggagePreview(null); }}
                          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => luggageInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 hover:border-brand-400 rounded-2xl p-6 flex flex-col items-center gap-3 text-slate-400 hover:text-brand-500 transition-all mb-4 bg-white hover:bg-brand-50/30"
                      >
                        <Camera className="w-8 h-8" />
                        <span className="text-sm font-bold">Tap to snap or upload luggage photo</span>
                        <span className="text-xs text-slate-400">Rear camera on mobile · Any image format</span>
                      </button>
                    )}

                    <input
                      ref={luggageInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleLuggageFileChange}
                    />

                    <div className="flex gap-3 flex-wrap">
                      {luggageDataUrl && (
                        <button
                          onClick={handleLuggageUpload}
                          disabled={uploadingLuggage}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingLuggage ? 'Uploading...' : 'Upload & Clear Student'}
                        </button>
                      )}
                      {!luggageDataUrl && (
                        <button
                          onClick={() => luggageInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Select Photo
                        </button>
                      )}
                      <button
                        onClick={resetScanner}
                        className="px-5 py-3 bg-white text-slate-400 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 text-sm"
                      >
                        Skip
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── HOSTEL PORTAL: Pre-Clearance Evidence Panel ────────── */}
            {isHostelPortal && scanResult.status === 'success' && (
              <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  Main Gate Clearance Check
                </h3>

                {checkingClearance && (
                  <div className="flex items-center gap-3 py-6 justify-center text-slate-500">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold">Verifying clearance with Main Gate...</p>
                  </div>
                )}

                {!checkingClearance && wasPreCleared && (
                  <div className="space-y-4">
                    {/* Cleared banner */}
                    <div className="flex items-start gap-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-5 py-4 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-bold text-emerald-800">✅ Pre-Cleared at Main Gate</p>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          This student's luggage was inspected and logged at the Main Gate today.
                          <span className="font-bold ml-1">Allow direct room access.</span>
                        </p>
                      </div>
                    </div>

                    {/* Luggage photos as evidence */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Luggage Evidence Photos ({preClearanceLogs!.length})</p>
                      <div className={`grid gap-3 ${preClearanceLogs!.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {preClearanceLogs!.map((log) => (
                          <div key={log.id} className="relative rounded-2xl overflow-hidden border border-emerald-200 shadow-sm group">
                            <img
                              src={log.imageUrl}
                              alt="Luggage evidence"
                              className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                              <p className="text-[10px] text-white font-semibold">
                                {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'} · {log.uploadedByName || 'Security'}
                              </p>
                            </div>
                            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
                              {log.location || 'Main Gate'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={resetScanner}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                    >
                      ✅ Confirm &amp; Allow Entry — Scan Next
                    </button>
                  </div>
                )}

                {!checkingClearance && notPreCleared && (
                  <div className="space-y-4">
                    {/* Not cleared warning */}
                    <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 shadow-sm">
                      <XCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-bold text-amber-800">⚠️ Not Yet Cleared at Main Gate</p>
                        <p className="text-xs text-amber-700 font-medium mt-0.5">
                          No luggage inspection record found for this student in the past 24 hours.
                          <span className="font-bold ml-1">Do not allow entry yet — redirect to Main Gate first.</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetScanner}
                      className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                    >
                      Understood — Scan Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Fallback */}
            <div className="p-6 sm:p-8 bg-white border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div> Manual Override
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Override Token..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono placeholder:font-sans placeholder:text-slate-400 transition-all shadow-inner"
                />
                <button
                  onClick={() => verifyAccess(manualCode)}
                  disabled={!manualCode.trim() || !!scanResult.status}
                  className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 shrink-0"
                >
                  Authenticate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── MESSAGES TAB ─────────────────── */}
        {activeTab === 'messages' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-3xl premium-shadow overflow-hidden p-6 sm:p-8 min-h-[500px]">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recent Gate Requests</h2>
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                  </span>
                  Live Feed
                </div>
              </div>

              {exeatRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No requests yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Gate requests will appear here automatically.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exeatRequests.map((req) => (
                    <div key={req.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 hover:shadow-md hover:border-brand-200 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center text-slate-300">
                            {req.userPhoto ? (
                              <img src={req.userPhoto} alt={req.userName} className="w-full h-full object-cover" />
                            ) : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none">{req.userName}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">{req.userMatric}</p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md border ${
                          req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {req.status}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-100 text-sm font-medium text-slate-700 leading-relaxed shadow-sm mb-4 italic">
                        "{req.reason}"
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {req.timestamp ? new Date(req.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => markRequestStatus(req.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors"
                            >
                              Deny
                            </button>
                            <button
                              onClick={() => markRequestStatus(req.id, 'approved')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

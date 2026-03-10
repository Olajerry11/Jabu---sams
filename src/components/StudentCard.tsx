import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { User, ShieldAlert, ShieldCheck, Printer, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';

export default function StudentCard() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrToken, setQrToken] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Local state to hold real-time status updates from Firestore
  const [liveStatus, setLiveStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const prevStatus = useRef<string>('active');

  // Real-time listener for the user's own status
  useEffect(() => {
    if (!userData?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', userData.uid), (docObj) => {
      if (docObj.exists()) {
        const data = docObj.data();
        if (data.status) {
          const newStatus = data.status as 'active' | 'suspended' | 'expired';
          
          // Notify on status change
          if (prevStatus.current !== newStatus && prevStatus.current !== 'active' || newStatus !== 'active') {
            if (newStatus === 'suspended') {
              showToast('⚠️ Your access has been suspended by an administrator.', 'error');
            } else if (newStatus === 'active' && prevStatus.current !== 'active') {
              showToast('✅ Your access has been reactivated!', 'success');
            }
          }
          
          prevStatus.current = newStatus;
          setLiveStatus(newStatus);
        }
      }
    });

    return () => unsub();
  }, [userData?.uid]);

  // Generate dynamic QR token
  useEffect(() => {
    const generateToken = () => {
      if (!userData) return;
      
      const activeStatus = liveStatus === 'active';
      const randomToken = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Token format: JABU-TOTP-{UID}-{RANDOM}
      setQrToken(activeStatus ? `JABU-TOTP-${userData.uid}-${randomToken}` : '');
      setTimeLeft(30);
    };

    generateToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [liveStatus, userData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Dynamically import html2canvas to avoid bundling it upfront
      const html2canvas = (await import('html2canvas')).default;
      showToast('Generating your ID card image...', 'info');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // high-res
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `JABU-ID-${userData?.name?.replace(/\s+/g, '-') ?? 'card'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('ID Card downloaded successfully!', 'success');
    } catch {
      showToast('Download failed. Try printing instead.', 'error');
    }
  };

  if (!userData) return null;

  const isActive = liveStatus === 'active';

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
      
      {/* ID Card — wrapped with a printable id */}
      <div id="printable-id-card" ref={cardRef} className="bg-white rounded-2xl w-full max-w-sm text-center shadow-[0_10px_40px_rgba(0,0,0,0.1)] no-print-shadow overflow-hidden relative border border-slate-100">
        
        {/* Header Ribbon */}
        <div className="bg-blue-900 text-white p-6 pb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/jabu-logo.png')] bg-center bg-cover mix-blend-overlay"></div>
          <img src="/jabu-logo.png" alt="JABU Logo" className="w-12 h-12 mx-auto mb-2 relative z-10 object-contain drop-shadow-md" />
          <h2 className="m-0 text-2xl font-bold tracking-tight relative z-10">JABU SAMS</h2>
          <p className="m-0 text-xs text-blue-200 uppercase tracking-widest mt-1 relative z-10 font-medium">Digital Identity</p>
        </div>
        
        {/* Profile Avatar */}
        <div className="w-28 h-28 bg-slate-50 rounded-full mx-auto -mt-14 relative z-20 border-4 border-white shadow-sm flex items-center justify-center text-slate-400">
          <User className="w-12 h-12" />
        </div>
        
        {/* User Info */}
        <div className="pt-4 pb-6 px-6">
          <h3 className="m-0 text-xl sm:text-2xl font-bold text-slate-800">{userData.name || 'User Profile'}</h3>
          
          {userData.matric ? (
            <p className="m-0 text-sm text-slate-500 mt-1 font-mono bg-slate-100 inline-block px-3 py-1 rounded-md">{userData.matric}</p>
          ) : (
            <p className="m-0 text-xs text-slate-500 mt-1 font-mono bg-slate-100 inline-block px-3 py-1 rounded-md uppercase">{userData.role.replace(/_/g, ' ')}</p>
          )}

          {(userData as any).department && (
            <p className="text-xs text-slate-400 mt-1">{(userData as any).department}</p>
          )}

          {(userData as any).level && (
            <p className="text-xs font-semibold text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded-md mt-1">{(userData as any).level}</p>
          )}
          
          <div className={`mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {isActive ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isActive 
              ? 'ACCESS GRANTED' 
              : liveStatus === 'expired' ? 'PASS EXPIRED' : 'ACCESS SUSPENDED'
            }
          </div>
        </div>

        {/* Dynamic QR Zone */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col items-center justify-center">
          {isActive ? (
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 transition-opacity">
              <QRCode value={qrToken} size={160} fgColor="#1e3a8a" />
            </div>
          ) : (
            <div className="w-[184px] h-[184px] bg-slate-200/50 rounded-xl flex items-center justify-center border border-slate-200 border-dashed">
              <div className="text-slate-400 text-center px-4">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="text-xs font-semibold">QR DISABLED</span>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
            <span className="relative flex h-2 w-2">
              {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
            </span>
            <span>TOKEN EXPIRES IN</span>
            <span className="font-mono text-blue-600 bg-blue-50 px-1.5 rounded">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Action Buttons — hidden from print */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-sm print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm"
        >
          <Printer className="w-4 h-4" />
          Print ID Card
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 rounded-xl font-semibold text-white hover:bg-blue-700 transition-all shadow-sm text-sm"
        >
          <Download className="w-4 h-4" />
          Download as Image
        </button>
      </div>
      
      <p className="mt-4 text-xs text-slate-400 text-center max-w-xs print:hidden">
        This digital ID is time-sensitive. Present the QR code directly from your screen to gate security.
      </p>
    </div>
  );
}

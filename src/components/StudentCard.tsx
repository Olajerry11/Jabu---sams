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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-brand-500/10 blur-[100px] animate-float"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-accent-500/10 blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Header / Intro */}
        <div className="text-center mb-8">
           <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Digital Identity</h1>
           <p className="text-slate-500 mt-1">Present this pass to access campus facilities.</p>
        </div>

        {/* The ID Card */}
        <div id="printable-id-card" ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-1 shadow-2xl shadow-brand-500/5 overflow-hidden relative border border-white no-print-shadow">
          
          {/* Inner Card Container */}
          <div className="bg-white rounded-[2.25rem] overflow-hidden relative">
            
            {/* Top Ribbon / Branding */}
            <div className="bg-slate-900 text-white p-6 pb-[4.5rem] relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/60 to-transparent"></div>
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <img src="/jabu-logo.png" alt="JABU Logo" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h2 className="m-0 text-xl font-bold tracking-tight leading-none">JABU<span className="text-accent-400">SAMS</span></h2>
                  <p className="m-0 text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-semibold">Campus Pass</p>
                </div>
              </div>
              
              <div className="relative z-10 text-right">
                <p className="text-xs text-slate-400 font-medium">Valid ID</p>
                <div className={`mt-1 flex items-center gap-1.5 px-2.5 py-1 ${isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'} border rounded-lg text-[10px] font-bold tracking-wider`}>
                  {isActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isActive ? 'ACTIVE' : 'SUSPENDED'}
                </div>
              </div>
            </div>
            
            {/* User Profile Area */}
            <div className="px-6 relative flex flex-col items-center">
              {/* Avatar Floating Over Ribbon */}
              <div className="w-24 h-24 bg-white rounded-3xl mx-auto -mt-12 relative z-20 shadow-xl border border-slate-100 flex items-center justify-center text-slate-300 overflow-hidden group">
                <User className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-50 to-transparent opacity-50"></div>
              </div>
              
              {/* Identity Details */}
              <div className="text-center mt-4 mb-6 w-full">
                <h3 className="m-0 text-2xl font-bold text-slate-900 tracking-tight">{userData.name || 'User Profile'}</h3>
                
                <div className="flex items-center justify-center gap-2 mt-2">
                  {userData.matric ? (
                    <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-mono font-medium">{userData.matric}</span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold uppercase tracking-wider">{userData.role.replace(/_/g, ' ')}</span>
                  )}
                  {(userData as any).level && (
                    <span className="px-3 py-1 bg-brand-50 border border-brand-100 text-brand-700 rounded-lg text-sm font-bold">{(userData as any).level}</span>
                  )}
                </div>

                {(userData as any).department && (
                  <p className="text-sm font-medium text-slate-500 mt-2">{(userData as any).department}</p>
                )}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-slate-50/50 border-t border-slate-100 p-8 flex flex-col items-center justify-center">
              
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Scan at Checkpoint</p>

              {isActive ? (
                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 relative group overflow-hidden">
                  <div className="absolute inset-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-colors"></div>
                  <QRCode value={qrToken} size={180} fgColor="#0f172a" className="relative z-10" />
                </div>
              ) : (
                <div className="w-[212px] h-[212px] bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-slate-200 border-dashed relative overflow-hidden">
                  <div className="absolute inset-0 bg-stripes opacity-10"></div>
                  <div className="text-slate-400 text-center px-4 relative z-10">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-40 text-rose-500" />
                    <span className="text-sm font-bold text-rose-500 uppercase tracking-widest">Access Denied</span>
                  </div>
                </div>
              )}
              
              {/* Token Timer */}
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
                </span>
                <span>TOKEN EXPIRES IN</span>
                <span className="font-mono text-brand-600 font-bold ml-1">{timeLeft}s</span>
              </div>

            </div>
          </div>
        </div>

        {/* Action Buttons — hidden from print */}
        <div className="mt-8 flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm focus:ring-2 focus:ring-slate-200 transition-all text-sm"
          >
            <Printer className="w-4 h-4" />
            Print ID
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 border border-slate-900 rounded-2xl font-semibold text-white hover:bg-brand-600 hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/20 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Save Copy
          </button>
        </div>
        
      </div>
    </div>
  );
}

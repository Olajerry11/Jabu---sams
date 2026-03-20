import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { User, ShieldAlert, ShieldCheck, MessageSquare, X, Edit3, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';

const CHANGE_FIELDS = [
  'Full Name',
  'Matric Number',
  'Department',
  'Level',
  'Phone Number',
  'State of Origin',
];

export default function StudentCard() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  // ── QR / Token State ──────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(60);
  const [qrToken, setQrToken] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Live Status ───────────────────────────────────────────────────────────
  const [liveStatus, setLiveStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const prevStatus = useRef<string>('active');

  // ── Exeat Modal State ─────────────────────────────────────────────────────
  const [exeatModalOpen, setExeatModalOpen] = useState(false);
  const [exeatReason, setExeatReason] = useState('');
  const [submittingExeat, setSubmittingExeat] = useState(false);

  // ── Change Request Modal State ────────────────────────────────────────────
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeField, setChangeField] = useState(CHANGE_FIELDS[0]);
  const [changeCurrentValue, setChangeCurrentValue] = useState('');
  const [changeNewValue, setChangeNewValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  // ── Real-time Status Listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', userData.uid), (docObj) => {
      if (docObj.exists()) {
        const data = docObj.data();
        if (data.status) {
          const newStatus = data.status as 'active' | 'suspended' | 'expired';
          if (newStatus === 'suspended' && prevStatus.current !== 'suspended') {
            showToast('⚠️ Your access has been suspended by an administrator.', 'error');
          } else if (newStatus === 'active' && prevStatus.current !== 'active') {
            showToast('✅ Your access has been reactivated!', 'success');
          }
          prevStatus.current = newStatus;
          setLiveStatus(newStatus);
        }
      }
    });
    return () => unsub();
  }, [userData?.uid]);

  // ── 60-second QR Token Generator ─────────────────────────────────────────
  useEffect(() => {
    const generateToken = () => {
      if (!userData) return;
      const activeStatus = liveStatus === 'active';
      const randomToken = Math.random().toString(36).substring(2, 10).toUpperCase();
      setQrToken(activeStatus ? `JABU-TOTP-${userData.uid}-${randomToken}` : '');
      setTimeLeft(60);
    };

    generateToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStatus, userData]);

  // ── Exeat Submit ──────────────────────────────────────────────────────────
  const handleSubmitExeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exeatReason.trim()) return;
    setSubmittingExeat(true);
    try {
      await addDoc(collection(db, 'exeat_requests'), {
        userId: userData?.uid,
        userName: userData?.name,
        userRole: userData?.role,
        userMatric: userData?.matric || (userData as any)?.staffId || 'N/A',
        userPhoto: (userData as any).photoUrl || (userData as any).photoURL || '',
        reason: exeatReason,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      showToast('Gate pass request sent to Security!', 'success');
      setExeatModalOpen(false);
      setExeatReason('');
    } catch (error) {
      console.error(error);
      showToast('Failed to send request. Try again.', 'error');
    } finally {
      setSubmittingExeat(false);
    }
  };

  // ── Change Request Submit ─────────────────────────────────────────────────
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNewValue.trim() || !changeReason.trim()) return;
    setSubmittingChange(true);
    try {
      await addDoc(collection(db, 'change_requests'), {
        userId: userData?.uid,
        userName: userData?.name || '',
        userEmail: (userData as any)?.email || '',
        userPhoto: (userData as any).photoUrl || (userData as any).photoURL || '',
        fieldToChange: changeField,
        currentValue: changeCurrentValue,
        newValue: changeNewValue,
        reason: changeReason,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      showToast('Change request submitted! Admin will review it shortly.', 'success');
      setChangeModalOpen(false);
      setChangeField(CHANGE_FIELDS[0]);
      setChangeCurrentValue('');
      setChangeNewValue('');
      setChangeReason('');
    } catch (error) {
      console.error(error);
      showToast('Failed to submit request. Try again.', 'error');
    } finally {
      setSubmittingChange(false);
    }
  };

  if (!userData) return null;

  const isActive = liveStatus === 'active';
  const isStudentOrStaff = userData.role !== 'admin' && userData.role !== 'security';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-brand-500/10 blur-[100px] animate-float"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-accent-500/10 blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Digital Identity</h1>
          <p className="text-slate-500 mt-1">Present this pass to access campus facilities.</p>
        </div>

        {/* Action Buttons (students/staff only) */}
        {isStudentOrStaff && (
          <div className="mb-6 flex justify-center gap-3 print:hidden flex-wrap">
            <button
              onClick={() => setExeatModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-brand-200 shadow-sm shadow-brand-500/10 text-brand-700 rounded-2xl font-bold hover:bg-brand-50 hover:border-brand-300 transition-all active:scale-95 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Request Gate Pass
            </button>
            <button
              onClick={() => setChangeModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 shadow-sm text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Request Data Change
            </button>
          </div>
        )}

        {/* The ID Card */}
        <div id="printable-id-card" ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-1 shadow-2xl shadow-brand-500/5 overflow-hidden relative border border-white no-print-shadow">
          <div className="bg-white rounded-[2.25rem] overflow-hidden relative">
            
            {/* Top Ribbon */}
            <div className="bg-slate-900 text-white p-6 pb-[4.5rem] relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/60 to-transparent"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 p-1">
                  <img src="/jabu-logo.png" alt="JABU Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="m-0 text-xl font-bold tracking-tight leading-none">JABU<span className="text-accent-400">SAMS</span></h2>
                  <p className="m-0 text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-semibold">Campus Pass</p>
                </div>
              </div>
              <div className="relative z-10 text-right">
                <p className="text-xs text-slate-400 font-medium">Valid ID</p>
                <div className={`mt-1 flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[10px] font-bold tracking-wider ${isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                  {isActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isActive ? 'ACTIVE' : 'SUSPENDED'}
                </div>
              </div>
            </div>

            {/* User Profile */}
            <div className="px-6 relative flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-3xl mx-auto -mt-12 relative z-20 shadow-xl border border-slate-100 flex items-center justify-center text-slate-300 overflow-hidden group">
                {(userData as any).photoUrl ? (
                  <img src={(userData as any).photoUrl} alt="Passport Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <User className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-50 to-transparent opacity-50 pointer-events-none"></div>
              </div>
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
                  {/* Use svg rendering for canvas capture compatibility */}
                  <div id="qr-code-container" style={{ background: 'white', display: 'inline-block', border: '0px solid white' }}>
                    <QRCode value={qrToken || 'pending'} size={180} fgColor="#0f172a" bgColor="#ffffff" className="relative z-10" />
                  </div>
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

              {/* Token Timer — 60 seconds */}
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
                </span>
                <span>TOKEN EXPIRES IN</span>
                <span className={`font-mono font-bold ml-1 ${timeLeft <= 10 ? 'text-rose-500' : 'text-brand-600'}`}>{timeLeft}s</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Exeat / Gate Pass Modal ── */}
      {exeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submittingExeat && setExeatModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl premium-shadow overflow-hidden relative z-10 animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none">Request Gate Pass</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Send a log directly to campus security.</p>
              </div>
              <button onClick={() => setExeatModalOpen(false)} disabled={submittingExeat} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitExeat} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for leaving</label>
                <textarea
                  required
                  rows={3}
                  value={exeatReason}
                  onChange={(e) => setExeatReason(e.target.value)}
                  placeholder="e.g. Medical checkup at Federal Medical Center, Parent pickup for weekend."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none transition-all"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={submittingExeat}
                className={`w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white transition-all ${submittingExeat ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25 active:scale-95'}`}
              >
                {submittingExeat ? 'Transmitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Request Modal ── */}
      {changeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submittingChange && setChangeModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl premium-shadow overflow-hidden relative z-10 animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none">Request Data Change</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Admin will review and approve your request.</p>
              </div>
              <button onClick={() => setChangeModalOpen(false)} disabled={submittingChange} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitChangeRequest} className="p-6 space-y-4">
              {/* Field to change */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Field to Change</label>
                <div className="relative">
                  <select
                    value={changeField}
                    onChange={(e) => setChangeField(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all pr-10"
                  >
                    {CHANGE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Current Value */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Current Value (as registered)</label>
                <input
                  type="text"
                  value={changeCurrentValue}
                  onChange={(e) => setChangeCurrentValue(e.target.value)}
                  placeholder="What it currently says..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              {/* New Value */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correct / New Value <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  placeholder="What it should be changed to..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Change <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain why this needs to be corrected..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none transition-all"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingChange}
                className={`w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white transition-all ${submittingChange ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/25 active:scale-95'}`}
              >
                {submittingChange ? 'Submitting...' : 'Submit Change Request'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

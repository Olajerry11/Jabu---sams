import { useState, useEffect } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Firebase Auth appends query params BEFORE the hash in the URL.
  // We check both window.location.search and React Router's searchParams.
  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get('oobCode') || searchParams.get('oobCode');
  const mode = urlParams.get('mode') || searchParams.get('mode');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'verifying' | 'ready' | 'loading' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setStatus('error');
      setMessage('This link is invalid or has expired. Please request a new password reset link.');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        setEmail(verifiedEmail);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setMessage('This reset link has expired or has already been used. Please request a new one.');
      });
  }, [oobCode, mode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-slate-50 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/10 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-md w-full relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/50 premium-shadow">
            <ShieldCheck className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Set New Password</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">Create a strong new password for your SAMS account.</p>
        </div>

        <div className="glass-panel p-8 sm:p-10 premium-shadow">
          {status === 'verifying' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Verifying your reset link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Password Updated!</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Your password has been reset successfully. You can now sign in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="block w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-brand-600 transition-colors shadow-md active:scale-95"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {(status === 'error') && !oobCode && (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Link Expired or Invalid</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">{message}</p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="block w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-brand-600 transition-colors shadow-md active:scale-95"
              >
                Request New Reset Link
              </button>
            </div>
          )}

          {(status === 'ready' || status === 'loading') && (
            <form onSubmit={handleReset} className="animate-fade-in space-y-5">
              {email && (
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-700 font-semibold text-center">
                  Resetting password for: <span className="font-bold">{email}</span>
                </div>
              )}
              {message && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="font-medium">{message}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white/50"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-4 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all bg-brand-600 hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating Password...
                  </span>
                ) : 'Set New Password'}
              </button>
            </form>
          )}

          {status === 'error' && oobCode && (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Link Expired</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">{message}</p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="block w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-brand-600 transition-colors shadow-md active:scale-95"
              >
                Request New Reset Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

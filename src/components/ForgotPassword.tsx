import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
      setMessage('Password reset link sent! Check your inbox.');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.message || 'Failed to send reset email. Ensure the email is correct.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 relative">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/10 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-slide-up">
        
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/50 premium-shadow group">
            <ShieldCheck className="w-8 h-8 text-brand-600 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Recovery</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide">Reset your SAMS Account Password.</p>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-8 sm:p-10 premium-shadow">
          
          {status === 'success' ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <Mail className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Check your inbox</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">{message}</p>
              
              <Link to="/login" className="block w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-brand-600 transition-colors shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-95 duration-200">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="animate-fade-in">
              {status === 'error' && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-start gap-3 animate-slide-up">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="font-medium">{message}</span>
                </div>
              )}

              <p className="text-sm text-slate-600 mb-8 font-medium leading-relaxed">
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </p>

              <div className="mb-8 group">
                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-brand-600">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                    placeholder="student@jabu.edu.ng"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className={`w-full flex justify-center py-4 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-300 ${
                  status === 'loading' ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-[0.98]'
                }`}
              >
                {status === 'loading' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending Request...
                  </div>
                ) : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
        
        {/* Footer Link */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-bold transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Back to Sign In
          </Link>
        </div>
        
      </div>
    </div>
  );
}

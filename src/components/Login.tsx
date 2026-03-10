import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      showToast(`Welcome back, ${userCredential.user.email}!`, 'success');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 py-12 sm:p-8 relative bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px] mix-blend-multiply animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/20 blur-[120px] mix-blend-multiply animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className={`w-full max-w-5xl flex flex-col lg:grid lg:grid-cols-2 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] premium-shadow overflow-hidden transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/90 to-slate-900/90 mix-blend-overlay"></div>
            <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop" alt="Campus Building" className="w-full h-full object-cover opacity-50" />
          </div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img src="/jabu-logo-app.png" alt="JABU Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">JABU<span className="text-accent-400">SAMS</span></h1>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest mt-0.5">Digital Campus Identity</p>
            </div>
          </div>

          <div className="relative z-10 mt-20">
            <h2 className="text-4xl font-display font-medium leading-tight mb-6">
              Secure, swift, and <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-brand-300 font-bold">seamless access.</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-md">
              Manage student and staff identities, perform swift verifications, and monitor campus security all from one dashboard.
            </p>
          </div>
          
          <div className="relative z-10 hidden lg:block">
             <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-400"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
             </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative z-10">
          <div className="lg:hidden mb-10 flex items-center gap-3 justify-center shrink-0">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shadow-sm shrink-0">
              <img src="/jabu-logo-app.png" alt="JABU Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">JABU<span className="text-brand-600">SAMS</span></h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Digital Identity</p>
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-slate-500">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="email">Email address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                    placeholder="jdoe@jabu.edu.ng"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`group w-full flex items-center justify-center py-4 px-4 rounded-2xl text-sm font-bold text-white transition-all duration-200 ${
                loading 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-slate-900 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]'
              }`}
            >
              {loading ? 'Verifying Identity...' : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Don't have a digital identity yet?{' '}
              <Link to="/register" className="text-brand-600 font-bold hover:text-brand-700 hover:underline underline-offset-4 transition-all">
                Register Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

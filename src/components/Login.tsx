import { useState, useEffect, useMemo } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData) {
      navigate('/');
    }
  }, [userData, navigate]);

  const base = import.meta.env.BASE_URL;
  const carouselImages = useMemo(() => [
    `${base}Login-1.jpg.jpg`,
    `${base}Login-2.jpg.jpg`,
    `${base}Login-3.jpg.jpg`,
  ], [base]);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      showToast(`Welcome back, ${userCredential.user.email}!`, 'success');
      navigate('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid credentials');
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
        
        {/* Top/Left Side - Branding & Carousel */}
        <div className="flex flex-col justify-between p-8 md:p-12 bg-slate-900 text-white relative overflow-hidden min-h-[300px] lg:min-h-full">
          {/* Carousel Backgrounds */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/90 to-slate-900/90 mix-blend-overlay z-10 transition-colors duration-1000"></div>
            {carouselImages.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt="Campus" 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  index === currentImage ? 'opacity-60' : 'opacity-0'
                }`}
              />
            ))}
          </div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shrink-0 p-1">
              <img src={`${import.meta.env.BASE_URL}jabu-logo.png`} alt="JABU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">JABU<span className="text-accent-400">SAMS</span></h1>
              <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-300 tracking-widest mt-0.5">Digital Campus Identity</p>
            </div>
          </div>

          <div className="relative z-10 mt-12 md:mt-20">
            <h2 className="text-3xl md:text-4xl font-display font-medium leading-tight mb-4 md:mb-6">
              Secure, swift, and <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-brand-300 font-bold">seamless access.</span>
            </h2>
            <p className="text-slate-300 text-sm md:text-lg max-w-md">
              Manage student and staff identities, perform swift verifications, and monitor campus security all from one dashboard.
            </p>
          </div>
          
          {/* Carousel Indicators */}
          <div className="relative z-10 mt-8 flex gap-2">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentImage 
                    ? 'w-6 bg-accent-400' 
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Side - Form / Status */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative z-10">

            <div className="animate-fade-in">
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
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-600 focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
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
    </div>
  );
}

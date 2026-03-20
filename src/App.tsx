import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QrCode, ScanLine, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Lazy-loaded routes for massive bundle size reduction
const StudentCard = lazy(() => import('./components/StudentCard'));
const Scanner = lazy(() => import('./components/Scanner'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));

function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: string }) {
  const { userData, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading Access Control...</div>;
  if (!userData) return <Navigate to="/login" replace />;
  if (reqRole && userData.role !== reqRole) return <Navigate to="/" replace />;
  return children;
}

/** Root "/" redirect based on role */
function RoleRedirect() {
  const { userData, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading Access Control...</div>;
  if (!userData) return <Navigate to="/login" replace />;
  if (userData.role === 'admin') return <Navigate to="/admin" replace />;
  if (userData.role === 'security') return <Navigate to="/scanner" replace />;
  return <StudentCard />;
}

function NavLinks() {
  const location = useLocation();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;
  
  const linkClass = (path: string) => `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
    isActive(path) 
      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-500/20' 
      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-95'
  }`;

  if (!userData) return null;

  return (
    <div className="flex w-full md:w-auto overflow-x-auto md:overflow-visible pb-2 md:pb-0 items-center gap-2 sm:gap-3 hide-scrollbar">
      
      {/* Students and teaching/non-teaching staff see their own pass */}
      {userData.role !== 'admin' && userData.role !== 'security' && (
        <Link to="/" className={linkClass('/')}>
          <QrCode className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">My Pass</span>
        </Link>
      )}
      
      {/* Security sees ONLY the Scanner */}
      {userData.role === 'security' && (
        <Link to="/scanner" className={linkClass('/scanner')}>
          <ScanLine className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Scanner</span>
        </Link>
      )}

      {/* Admin sees ONLY the Admin Dashboard (+ scanner access is still via URL) */}
      {userData.role === 'admin' && (
        <>
          <Link to="/admin" className={linkClass('/admin')}>
            <LayoutDashboard className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Admin Dashboard</span>
          </Link>
          <Link to="/scanner" className={linkClass('/scanner')}>
            <ScanLine className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Scanner</span>
          </Link>
        </>
      )}

      <div className="w-px h-8 bg-slate-200 mx-1 md:mx-3 shrink-0 hidden md:block"></div>
      
      <button 
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all ml-auto md:ml-0 shadow-sm ring-1 ring-rose-500/10 hover:ring-rose-500/30 active:scale-95 shrink-0"
      >
        <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}

function StartupAnimation({ onComplete }: { onComplete: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3000); // start fade out at 3s

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 3500); // unmount at 3.5s

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900 text-white transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 p-2 mb-8 animate-bounce">
         <img src={`${import.meta.env.BASE_URL}jabu-logo.png`} alt="JABU Logo" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-center mb-4 px-4 whitespace-nowrap leading-tight animate-fade-in">
        Welcome to <span className="text-brand-400">JABU</span>
      </h1>
      <p className="text-sm md:text-xl font-medium text-slate-300 text-center max-w-lg px-6 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
        The first Entrepreneurial University in Nigeria
      </p>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-brand-300 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}

function App() {
  const { userData } = useAuth(); // Needed to conditionally render nav
  const [showAnimation, setShowAnimation] = useState(() => {
    return !sessionStorage.getItem('hasSeenJabuAnimation');
  });

  const handleAnimationComplete = () => {
    sessionStorage.setItem('hasSeenJabuAnimation', 'true');
    setShowAnimation(false);
  };
  
  return (
    <ToastProvider>
      <Router>
        {showAnimation && <StartupAnimation onComplete={handleAnimationComplete} />}
        <div className="min-h-[100dvh] bg-slate-50 font-sans flex flex-col selection:bg-brand-500/30 selection:text-brand-900">
          
          {/* Global Navigation - Only render when logged in */}
          {userData && (
            <nav className="glass-panel rounded-none border-t-0 border-x-0 border-b border-white/50 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 gap-4 md:gap-0">
                  
                  {/* Branding */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center p-1">
                       <img src="/jabu-logo.png" alt="JABU Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="text-xl font-display font-black text-slate-900 tracking-tight leading-none">
                        JABU<span className="text-brand-600">SAMS</span>
                      </h1>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Campus Identity</p>
                    </div>
                  </div>
                  
                  <NavLinks />
                </div>
              </div>
            </nav>
          )}

          <main className="flex-grow w-full h-full flex flex-col relative">
            <Suspense fallback={
              <div className="flex-grow flex items-center justify-center bg-slate-50 min-h-[50vh]">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                   <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative premium-shadow">
                     <div className="absolute inset-0 rounded-2xl border-2 border-brand-500/20 border-t-brand-600 animate-spin"></div>
                     <img src="/jabu-logo-app.png" alt="Loading" className="w-6 h-6 object-contain opacity-50" />
                   </div>
                   <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Loading Interface...</p>
                </div>
              </div>
            }>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Protected Routes */}
                {/* "/" is role-aware: admin→/admin, security→/scanner, others→StudentCard */}
                <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
                <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute reqRole="admin"><AdminDashboard /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </main>
          
          {/* Global Footer */}
          <footer className="bg-white/50 backdrop-blur-md border-t border-slate-200/50 py-6 mt-auto shrink-0 relative z-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                &copy; {new Date().getFullYear()} Joseph Ayo Babalola University
              </p>
            </div>
          </footer>

        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;

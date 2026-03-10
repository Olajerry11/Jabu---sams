import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QrCode, ScanLine, LayoutDashboard, LogOut } from 'lucide-react';
import StudentCard from './components/StudentCard';
import Scanner from './components/Scanner';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: string }) {
  const { userData, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading Access Control...</div>;
  if (!userData) return <Navigate to="/login" replace />;
  if (reqRole && userData.role !== reqRole) return <Navigate to="/" replace />;
  return children;
}

function NavLinks() {
  const location = useLocation();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;
  
  const linkClass = (path: string) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
    isActive(path) ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

  if (!userData) return null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3">
      <Link to="/" className={linkClass('/')}>
        <QrCode className="w-4 h-4" /> My Pass
      </Link>
      
      {(userData.role === 'admin' || userData.role === 'security') && (
        <Link to="/scanner" className={linkClass('/scanner')}>
          <ScanLine className="w-4 h-4" /> Scanner
        </Link>
      )}

      {userData.role === 'admin' && (
        <Link to="/admin" className={linkClass('/admin')}>
          <LayoutDashboard className="w-4 h-4" /> Admin
        </Link>
      )}

      <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
      
      <button 
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors w-full md:w-auto mt-2 md:mt-0"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
          {/* Global Navigation - Only visible when logged in handled by NavLinks internally */}
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4 md:gap-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                    <img src={`${import.meta.env.BASE_URL}jabu-logo.png`} alt="JABU Logo" className="w-7 h-7 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">JABU<span className="text-blue-600">SAMS</span></h1>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Digital Campus Identity</p>
                  </div>
                </div>
                
                <NavLinks />
              </div>
            </div>
          </nav>

          <main className="flex-grow w-full max-w-5xl mx-auto">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><StudentCard /></ProtectedRoute>} />
              <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute reqRole="admin"><AdminDashboard /></ProtectedRoute>} />
            </Routes>
          </main>
          
          <footer className="bg-white border-t border-slate-200 py-6 mt-12">
            <div className="max-w-5xl mx-auto px-4 text-center">
              <p className="text-sm font-medium text-slate-500">
                &copy; {new Date().getFullYear()} Joseph Ayo Babalola University. All Rights Reserved.
              </p>
            </div>
          </footer>
        </div>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

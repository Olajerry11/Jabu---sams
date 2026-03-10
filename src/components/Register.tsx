import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, KeyRound, User, AlertCircle, Building2, BookOpen } from 'lucide-react';

type Role = 'student' | 'teaching_staff' | 'non_teaching_staff' | 'camp_guest' | 'food_vendor' | 'security';
type Level = '100L' | '200L' | '300L' | '400L' | '500L' | 'Postgraduate' | '';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  
  // Conditional Fields
  const [matric, setMatric] = useState(''); // Students
  const [level, setLevel] = useState<Level>(''); // Students
  const [department, setDepartment] = useState(''); // Students & Staff
  const [company, setCompany] = useState(''); // Vendors & Guests
  const [purpose, setPurpose] = useState(''); // Guests

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Auth Profile
      await updateProfile(user, { displayName: name });
      
      // 2. Prepare dynamic Firestore profile data
      const profileData: any = {
        name,
        email,
        role,
        status: 'active', // Default to active for demo, in prod an admin might need to approve
        createdAt: new Date().toISOString()
      };

      // Add conditional fields based on role
      if (role === 'student') {
        profileData.matric = matric;
        profileData.level = level;
        profileData.department = department;
      } else if (role === 'teaching_staff' || role === 'non_teaching_staff') {
        profileData.department = department;
        profileData.staffId = matric; // Reusing matric field for Staff ID UI
      } else if (role === 'food_vendor') {
        profileData.company = company;
      } else if (role === 'camp_guest') {
        profileData.company = company;
        profileData.purpose = purpose;
        // Guests might get an automatic 48-hour expiration
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 2);
        profileData.expiresAt = expiry.toISOString();
      }

      // 3. Save to Firestore
      await setDoc(doc(db, 'users', user.uid), profileData);
      
      // 4. Redirect to home (ID Card)
      navigate('/');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create an Account</h2>
          <p className="mt-2 text-sm text-slate-500">Register for your JABU Digital Identity.</p>
        </div>

        <form className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-slate-100 rounded-3xl" onSubmit={handleRegister}>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            
            {/* 1. Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none"
                    placeholder="jdoe@jabu.edu.ng"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* 2. Role Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none"
              >
                <option value="student">Student</option>
                <option value="teaching_staff">Teaching Staff</option>
                <option value="non_teaching_staff">Non-Teaching Staff</option>
                <option value="food_vendor">Food Vendor</option>
                <option value="camp_guest">Camp Guest</option>
                <option value="security">Security Personnel</option>
              </select>
            </div>

            {/* 3. Dynamic Conditional Fields */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              
              {/* Student Fields */}
              {role === 'student' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Matric Number</label>
                      <input type="text" required value={matric} onChange={e => setMatric(e.target.value)} placeholder="JABU/..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Level</label>
                      <select required value={level} onChange={e => setLevel(e.target.value as Level)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white">
                        <option value="" disabled>Select Level</option>
                        <option value="100L">100 Level</option>
                        <option value="200L">200 Level</option>
                        <option value="300L">300 Level</option>
                        <option value="400L">400 Level</option>
                        <option value="500L">500 Level</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Department / College</label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </>
              )}

              {/* Staff Fields */}
              {(role === 'teaching_staff' || role === 'non_teaching_staff') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Staff ID</label>
                    <input type="text" required value={matric} onChange={e => setMatric(e.target.value)} placeholder="STF-..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Department / Office</label>
                    <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Registry" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}

              {/* Vendor & Guest Fields */}
              {(role === 'food_vendor' || role === 'camp_guest') && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Organization / Company</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input type="text" required value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Tantalizers" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}

              {/* Guest Only Purpose Field */}
              {role === 'camp_guest' && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Purpose of Visit</label>
                  <textarea required value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="Briefly describe your reason for visiting..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"></textarea>
                </div>
              )}
              
              {role === 'security' && (
                <p className="text-sm text-slate-500 text-center italic py-2">Security accounts may require administrative approval before activation.</p>
              )}

            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-[0.98]'
              }`}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          </div>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-600 font-medium">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

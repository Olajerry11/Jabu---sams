import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, KeyRound, User, AlertCircle, Building2, BookOpen, ArrowRight, Camera } from 'lucide-react';

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
  // Conditional Fields
  const [matric, setMatric] = useState(''); // Students
  const [level, setLevel] = useState<Level>(''); // Students
  const [department, setDepartment] = useState(''); // Students & Staff
  const [company, setCompany] = useState(''); // Vendors & Guests
  const [purpose, setPurpose] = useState(''); // Guests
  
  // Passport Photo
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');

  const [mounted, setMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const carouselImages = [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop",
    "https://plus.unsplash.com/premium_photo-1661909267160-c368ffb34da5?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop"
  ];

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        setPhotoError('Please select a valid image file (JPG/PNG).');
        return;
    }
    
    setPhotoError('');
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 400; // Strict small size
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Compress severely to save weight (quality 0.6)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setPhotoDataUrl(dataUrl);
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) {
        setError('A passport photograph is required to create an identity pass.');
        return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Upload Passport Photo to Firebase Storage
      const imageRef = ref(storage, `passports/${user.uid}.jpg`);
      await uploadString(imageRef, photoDataUrl, 'data_url');
      const photoURL = await getDownloadURL(imageRef);

      // 3. Prepare dynamic Firestore profile data
      const profileData: any = {
        name,
        email,
        role,
        photoUrl: photoURL,
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
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 2);
        profileData.expiresAt = expiry.toISOString();
      }

      // 4. Execute Profile Update and Firestore Database Save concurrently for speed
      await Promise.all([
         updateProfile(user, { displayName: name, photoURL }),
         setDoc(doc(db, 'users', user.uid), profileData)
      ]);
      
      // 5. Securely sign them out and show success screen instead of auto-login
      await auth.signOut();
      setRegistrationSuccess(true);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 py-12 sm:p-8 relative bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/20 blur-[120px] mix-blend-multiply animate-float"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px] mix-blend-multiply animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className={`w-full max-w-6xl flex flex-col-reverse lg:grid lg:grid-cols-5 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] premium-shadow overflow-hidden transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Left Side - Form (Larger for Register) */}
        <div className="lg:col-span-3 p-8 sm:p-12 flex flex-col justify-center relative z-10">
          
          {registrationSuccess ? (
             <div className="text-center animate-fade-in py-12">
               <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center mb-8 border-4 border-white shadow-lg">
                 <UserPlus className="w-10 h-10" />
               </div>
               <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Registration Successful!</h2>
               <p className="mt-4 text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                 Your identity has been securely created. Please log in with your new credentials to verify and preview your Digital ID card.
               </p>
               
               <div className="mt-12 flex justify-center">
                 <button
                   onClick={() => navigate('/login')}
                   className="group flex flex-col sm:flex-row items-center justify-center py-4 px-8 rounded-2xl font-bold text-white bg-slate-900 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto text-center"
                 >
                   Go Back to Login
                   <ArrowRight className="w-4 h-4 mt-1 sm:mt-0 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
               </div>
             </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm mb-6 text-brand-600">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Create your identity</h2>
                <p className="mt-2 text-slate-500">Register for a new digital campus pass.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {error && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-5">
                  
                  {/* Passport Photo Upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 sm:p-6 bg-slate-50/50 border border-slate-200/60 rounded-2xl">
                    <div className="relative group shrink-0">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-300 ${photoDataUrl ? 'border-brand-500 shadow-md ring-4 ring-brand-500/20' : 'border-dashed border-slate-300 bg-white hover:border-brand-400 group-hover:bg-brand-50'}`}>
                        {photoDataUrl ? (
                          <img src={photoDataUrl} alt="Passport Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-8 h-8 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/jpeg, image/png" 
                        onChange={handleImageUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Upload Passport Photograph"
                      />
                      {photoDataUrl && (
                        <div className="absolute -bottom-2 -right-2 bg-white text-emerald-600 rounded-full p-1 shadow-sm border border-emerald-100 pointer-events-none">
                            <div className="bg-emerald-500 w-3 h-3 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Passport Photograph <span className="text-rose-500">*</span></h3>
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        Upload a clear, recent, strictly formatted headshot for authentication. Max size ~400px.
                      </p>
                      {photoError && <p className="text-xs font-bold text-rose-500 bg-rose-50 inline-block px-2 py-1 rounded">{photoError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text" required value={name} onChange={e => setName(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email" required value={email} onChange={e => setEmail(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                          placeholder="jdoe@jabu.edu.ng"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <input
                        type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="py-2 border-b border-slate-100"></div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">User Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="block w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
                    >
                      <option value="student">Student</option>
                      <option value="teaching_staff">Teaching Staff</option>
                      <option value="non_teaching_staff">Non-Teaching Staff</option>
                      <option value="food_vendor">Food Vendor</option>
                      <option value="camp_guest">Camp Guest</option>
                      <option value="security">Security Personnel</option>
                    </select>
                  </div>

                  {/* Dynamic Conditional Fields container */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-inner space-y-5 transition-all">
                    
                    {role === 'student' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matric Number</label>
                            <input type="text" required value={matric} onChange={e => setMatric(e.target.value)} placeholder="JABU/..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
                            <select required value={level} onChange={e => setLevel(e.target.value as Level)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
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
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department / College</label>
                          <div className="relative group">
                            <BookOpen className="w-4 h-4 absolute left-4 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                          </div>
                        </div>
                      </>
                    )}

                    {(role === 'teaching_staff' || role === 'non_teaching_staff') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Staff ID</label>
                          <input type="text" required value={matric} onChange={e => setMatric(e.target.value)} placeholder="STF-..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department / Office</label>
                          <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Registry" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                        </div>
                      </div>
                    )}

                    {(role === 'food_vendor' || role === 'camp_guest') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization / Company</label>
                        <div className="relative group">
                          <Building2 className="w-4 h-4 absolute left-4 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                          <input type="text" required value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Tantalizers" className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                        </div>
                      </div>
                    )}

                    {role === 'camp_guest' && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purpose of Visit</label>
                        <textarea required value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="Briefly describe your reason for visiting..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"></textarea>
                      </div>
                    )}
                    
                    {role === 'security' && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                        <p className="text-sm text-blue-800 font-medium">Security accounts require admin verification post-registration.</p>
                      </div>
                    )}

                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`group w-full flex items-center justify-center py-4 px-4 rounded-2xl text-sm font-bold text-white transition-all duration-200 mt-8 ${
                    loading 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]'
                  }`}
                >
                  {loading ? 'Creating Identity...' : (
                    <>
                      Complete Registration
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-10 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 hover:underline underline-offset-4 transition-all">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right Side - Branding/Image (Smaller for Register) */}
        <div className="flex lg:col-span-2 flex-col justify-between p-8 md:p-12 bg-slate-900 text-white relative overflow-hidden h-full min-h-[300px]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/90 to-slate-900/90 mix-blend-overlay z-10 transition-colors duration-1000"></div>
            {carouselImages.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt="Campus Students" 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  index === currentImage ? 'opacity-60' : 'opacity-0'
                }`}
              />
            ))}
          </div>
          
          <div className="relative z-10 flex flex-col items-end gap-3 self-end">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">JABU<span className="text-accent-400">SAMS</span></h1>
              </div>
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 p-1">
                <img src="/jabu-logo.png" alt="JABU Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto pb-4 md:pb-10 pt-16">
            <h2 className="text-2xl md:text-3xl font-display font-medium leading-tight mb-4 text-right">
              Join the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-accent-400 to-white font-bold">digital campus.</span>
            </h2>
            
            {/* Carousel Indicators placed on the right */}
            <div className="mt-6 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
}

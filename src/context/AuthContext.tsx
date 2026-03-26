import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserData {
  uid: string;
  email: string | null;
  role: 'student' | 'teaching_staff' | 'non_teaching_staff' | 'camp_guest' | 'food_vendor' | 'admin' | 'security';
  name?: string;
  surname?: string;
  firstName?: string;
  otherName?: string;
  matric?: string;
  staffId?: string;
  level?: string;
  department?: string;
  collegeFaculty?: string;
  studentType?: string;
  phone?: string;
  parentPhone?: string;
  company?: string;
  purpose?: string;
  photoUrl?: string;
  photoURL?: string;
  status: 'active' | 'suspended' | 'expired';
  expiresAt?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch role data from users collection
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData({ uid: user.uid, email: user.email, ...docSnap.data() } as UserData);
          } else {
            // Default fallback if user doc isn't created yet
             setUserData({ uid: user.uid, email: user.email, role: 'student', status: 'active' });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({ uid: user.uid, email: user.email, role: 'student', status: 'active' });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({
    currentUser,
    userData,
    loading,
    logout
   
  }), [currentUser, userData, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

import { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, User, ShieldAlert } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface UserData {
  id: string;
  name?: string;
  email: string;
  matric?: string;
  role: string;
  photoUrl?: string;
  status: 'active' | 'suspended' | 'expired';
}

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch real-time users from Firestore
  useEffect(() => {
    // Basic query to get all users, ordered by email
    const q = query(collection(db, 'users'), orderBy('email'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const userList: UserData[] = [];
      snapshot.forEach((doc) => {
        userList.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(userList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    if (userData?.role !== 'admin') {
       alert("Only Administrators can modify user status.");
       return;
    }
    
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      const targetUser = users.find(u => u.id === userId);
      const name = targetUser?.name || 'User';
      if (newStatus === 'suspended') {
        showToast(`${name} has been suspended.`, 'warning');
      } else {
        showToast(`${name}'s access has been restored.`, 'success');
      }
    } catch (error) {
       console.error("Failed to update status", error);
       showToast('Failed to update user status. Check your connection.', 'error');
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.matric?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    expired: users.filter(u => u.status === 'expired').length,
  };

  return (
    <div className="py-8 px-4 sm:px-8 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight mb-2">User Management</h1>
          <p className="text-slate-500 font-medium">View and manage digital identities across the campus.</p>
        </div>
        
        {/* Animated Search bar */}
        <div className="relative max-w-md w-full group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by name, matric, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white shadow-sm transition-all duration-300"
          />
        </div>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        {[
          { label: 'Total Users', value: stats.total, icon: User, color: 'text-brand-600', bg: 'bg-brand-50 border-brand-100' },
          { label: 'Active Passes', value: stats.active, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
          { label: 'Expired Docs', value: stats.expired, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between items-start gap-4 transition-transform hover:-translate-y-1 duration-300 group premium-shadow">
            <div className={`p-3 rounded-2xl border ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-4xl font-display font-bold text-slate-900 leading-none">{loading ? '-' : stat.value}</p>
              <p className="text-sm font-semibold text-slate-500 mt-2">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Synchronizing database...</p>
        </div>
      ) : (
        /* Users Data Table */
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden premium-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold tracking-wide uppercase border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-6 py-5 rounded-tl-[2rem]">Identity</th>
                  <th className="px-6 py-5">Identifier</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right rounded-tr-[2rem]">Manage Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                         <Search className="w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium text-base">No matching identities found.</p>
                      <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 group-hover:bg-white group-hover:border-slate-300 transition-colors">
                            {user.photoUrl ? (
                                <img src={user.photoUrl} alt="Passport Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{user.name || 'Unknown User'}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                          {user.matric || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' :
                          user.status === 'suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' :
                          'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                        }`}>
                          <span className={`h-2 w-2 rounded-full shadow-sm ${
                            user.status === 'active' ? 'bg-emerald-500' :
                            user.status === 'suspended' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}></span>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleStatus(user.id, user.status)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            user.status === 'active'
                              ? 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                              : 'bg-slate-900 text-white border border-slate-900 hover:bg-brand-600 hover:border-brand-600'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend Pass' : 'Activate Pass'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

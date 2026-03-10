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
    <div className="py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">User Management</h1>
          <p className="text-slate-500">View and manage digital identities across the campus.</p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by name, matric, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: User, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Active Passes', value: stats.active, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-100' },
          { label: 'Expired Docs', value: stats.expired, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-0.5">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '-' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading user database...</div>
      ) : (
        /* Users Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">User</th>
                  <th className="px-6 py-4">Identifier</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name || 'Unknown User'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        {user.matric || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          user.status === 'suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
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
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            user.status === 'active'
                              ? 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                              : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Activate'}
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

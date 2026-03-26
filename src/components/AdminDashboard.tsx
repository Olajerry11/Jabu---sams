import { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, User, MessageSquare, Wifi, WifiOff, CheckCircle2, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, getDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface UserData {
  id: string;
  name?: string;
  surname?: string;
  firstName?: string;
  email?: string;
  matric?: string;
  role: string;
  photoUrl?: string;
  photoURL?: string;
  status: 'active' | 'suspended' | 'expired';
}

interface ChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  fieldToChange: string;
  currentValue: string;
  newValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

interface SecurityStatus {
  id: string;
  name: string;
  email?: string;
  status: 'online' | 'offline';
  lastSeen?: Timestamp;
}

type ActiveTab = 'users' | 'change-requests' | 'security';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [securityStatuses, setSecurityStatuses] = useState<SecurityStatus[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  // Fetch real-time users from Firestore
  useEffect(() => {
    // We intentionally do not use orderBy('email') here because it will silently exclude 
    // any legacy or test users who were created without an email field.
    const q = query(collection(db, 'users'));
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

  // Fetch real-time change requests
  useEffect(() => {
    const q = query(collection(db, 'change_requests'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs: ChangeRequest[] = [];
      snapshot.forEach((d) => reqs.push({ id: d.id, ...d.data() } as ChangeRequest));
      setChangeRequests(reqs);
    });
    return () => unsub();
  }, []);

  // Fetch security online status
  useEffect(() => {
    const q = query(collection(db, 'security_status'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      const statuses: SecurityStatus[] = [];
      snapshot.forEach((d) => statuses.push({ id: d.id, ...d.data() } as SecurityStatus));
      setSecurityStatuses(statuses);
    });
    return () => unsub();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    if (userData?.role !== 'admin') {
      showToast('Only Administrators can modify user status.', 'error');
      return;
    }
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      const targetUser = users.find(u => u.id === userId);
      const name = targetUser?.name || 'User';
      showToast(newStatus === 'suspended' ? `${name} has been suspended.` : `${name}'s access has been restored.`, newStatus === 'suspended' ? 'warning' : 'success');
    } catch (error) {
      console.error('Failed to update status', error);
      showToast('Failed to update user status.', 'error');
    }
  };

  const handleChangeRequest = async (req: ChangeRequest, action: 'approved' | 'rejected') => {
    setProcessingReqId(req.id);
    try {
      if (action === 'approved') {
        // Map the field label to the actual Firestore field key
        const fieldMap: Record<string, string> = {
          'Full Name': 'name',
          'Matric Number': 'matric',
          'Department': 'department',
          'Level': 'level',
          'Phone Number': 'phone',
          'State of Origin': 'state',
        };
        const firestoreField = fieldMap[req.fieldToChange] || req.fieldToChange.toLowerCase();
        // Verify user still exists
        const userRef = doc(db, 'users', req.userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, { [firestoreField]: req.newValue });
        }
      }
      // Mark request as approved/rejected
      await updateDoc(doc(db, 'change_requests', req.id), { status: action });
      showToast(action === 'approved' ? `Change approved — user profile updated!` : `Request rejected.`, action === 'approved' ? 'success' : 'warning');
    } catch (error) {
      console.error(error);
      showToast('Failed to process request.', 'error');
    } finally {
      setProcessingReqId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.surname?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.matric?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    pendingChanges: changeRequests.filter(r => r.status === 'pending').length,
  };

  const onlineCount = securityStatuses.filter(s => s.status === 'online').length;

  const tabClass = (tab: ActiveTab) =>
    `flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
      activeTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="py-8 px-4 sm:px-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium">Manage digital identities, change requests &amp; security status.</p>
        </div>
        {activeTab === 'users' && (
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
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: User, color: 'text-brand-600', bg: 'bg-brand-50 border-brand-100' },
          { label: 'Active Passes', value: stats.active, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
          { label: 'Pending Changes', value: stats.pendingChanges, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
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

      {/* Security Status Compact Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-8 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {onlineCount > 0 ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="relative flex h-3 w-3 rounded-full bg-slate-300"></span>
          )}
          <span className="text-sm font-bold text-slate-700">
            {onlineCount} Security Officer{onlineCount !== 1 ? 's' : ''} Online
          </span>
        </div>
        {securityStatuses.slice(0, 5).map(s => (
          <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${s.status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            <span className={`h-2 w-2 rounded-full ${s.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            {s.name}
          </div>
        ))}
        <button onClick={() => setActiveTab('security')} className="ml-auto text-xs font-bold text-brand-600 hover:underline">View all →</button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-8 w-fit">
        <button onClick={() => setActiveTab('users')} className={tabClass('users')}>
          <User className="w-4 h-4" /> All Users
        </button>
        <button onClick={() => setActiveTab('change-requests')} className={tabClass('change-requests')}>
          <MessageSquare className="w-4 h-4" /> Change Requests
          {stats.pendingChanges > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{stats.pendingChanges}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('security')} className={tabClass('security')}>
          <Wifi className="w-4 h-4" /> Security Status
          {onlineCount > 0 && (
            <span className="ml-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{onlineCount}</span>
          )}
        </button>
      </div>

      {/* ==================== TAB: USERS ==================== */}
      {activeTab === 'users' && (
        loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Synchronizing database...</p>
          </div>
        ) : (
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
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 group-hover:bg-white group-hover:border-slate-300 transition-colors">
                              {(user.photoUrl || user.photoURL) ? (
                                <img src={user.photoUrl || user.photoURL} alt="Passport Profile" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-base">
                                {user.firstName || user.surname || (user.name ? user.name.split(' ')[0] : 'Unknown User')}
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email || 'No Email Provided'}</p>
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
                            {user.role.replace(/_/g, ' ')}
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
                              user.status === 'suspended' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}></span>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStatus(user.id, user.status); }}
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
        )
      )}

      {/* ==================== TAB: CHANGE REQUESTS ==================== */}
      {activeTab === 'change-requests' && (
        <div className="animate-fade-in">
          {changeRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center premium-shadow">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="font-bold text-slate-700 text-lg">No change requests yet</p>
              <p className="text-slate-500 text-sm mt-1">When students submit profile change requests, they'll appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {changeRequests.map((req) => (
                <div key={req.id} className={`bg-white rounded-3xl border p-6 premium-shadow transition-all ${
                  req.status === 'pending' ? 'border-amber-200 shadow-amber-500/5' :
                  req.status === 'approved' ? 'border-emerald-200' : 'border-slate-200 opacity-70'
                }`}>
                  {/* User Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-300 shrink-0">
                        {req.userPhoto ? (
                          <img src={req.userPhoto} alt={req.userName} className="w-full h-full object-cover" />
                        ) : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none">{req.userName}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{req.userEmail}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg border ${
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Change Details */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Requested Change</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Field</p>
                        <span className="bg-white text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200">{req.fieldToChange}</span>
                      </div>
                      <div className="text-slate-400 font-bold text-lg">→</div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">From</p>
                        <span className="bg-rose-50 text-rose-600 font-mono text-xs px-3 py-1.5 rounded-lg border border-rose-200 line-through">{req.currentValue || 'N/A'}</span>
                      </div>
                      <div className="text-slate-400 font-bold text-lg">→</div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">To</p>
                        <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-200">{req.newValue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed mb-4 italic">
                    "{req.reason}"
                  </div>

                  {/* Footer: timestamp + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {req.timestamp ? new Date(req.timestamp.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          disabled={processingReqId === req.id}
                          onClick={() => handleChangeRequest(req, 'rejected')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          disabled={processingReqId === req.id}
                          onClick={() => handleChangeRequest(req, 'approved')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {processingReqId === req.id ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: SECURITY STATUS ==================== */}
      {activeTab === 'security' && (
        <div className="animate-fade-in">
          <div className="mb-6 flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${onlineCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              {onlineCount > 0 ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {onlineCount > 0 ? `${onlineCount} Active Now` : 'No Officers Online'}
            </div>
            <p className="text-xs text-slate-400 font-medium">Updates in real-time as officers log in/out</p>
          </div>

          {securityStatuses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center premium-shadow">
              <WifiOff className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700 text-lg">No security personnel registered</p>
              <p className="text-slate-500 text-sm mt-1">Security officers will appear here when they log in and open the Scanner.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {securityStatuses.map((sec) => (
                <div key={sec.id} className={`bg-white rounded-3xl border p-6 premium-shadow flex items-center gap-4 transition-all ${sec.status === 'online' ? 'border-emerald-200 shadow-emerald-500/5' : 'border-slate-100'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${sec.status === 'online' ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-100 border-2 border-slate-200'}`}>
                    {sec.status === 'online' ? (
                      <div className="relative">
                        <Wifi className="w-6 h-6 text-emerald-500" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white">
                          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                        </span>
                      </div>
                    ) : (
                      <WifiOff className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{sec.name}</p>
                    {sec.email && <p className="text-xs text-slate-400 font-medium truncate">{sec.email}</p>}
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase ${sec.status === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sec.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      {sec.status === 'online' ? 'Active / Scanning' : sec.lastSeen ? `Offline · Last seen ${new Date(sec.lastSeen.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== USER DETAILS MODAL ==================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-3xl premium-shadow overflow-hidden relative z-10 animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 leading-none">Identity Details</h3>
              <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 text-slate-400">
                  {(selectedUser as any).photoUrl || (selectedUser as any).photoURL ? (
                      <img src={(selectedUser as any).photoUrl || (selectedUser as any).photoURL} alt="Passport Profile" className="w-full h-full object-cover" />
                  ) : (
                      <User className="w-10 h-10" />
                  )}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900">{selectedUser.name || 'Unknown User'}</h4>
                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{selectedUser.role.replace(/_/g, ' ')}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            selectedUser.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            selectedUser.status === 'suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedUser.status === 'active' ? 'bg-emerald-500' : selectedUser.status === 'suspended' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                            {selectedUser.status}
                        </span>
                    </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Identifier</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.matric || (selectedUser as any).staffId || 'N/A'}</p>
                  </div>
                  {(selectedUser as any).level && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Level</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).level}</p>
                    </div>
                  )}
                  {(selectedUser as any).department && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).department}</p>
                    </div>
                  )}
                  {(selectedUser as any).phone && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).phone}</p>
                    </div>
                  )}
                  {(selectedUser as any).parentPhone && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Parent Phone</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).parentPhone}</p>
                    </div>
                  )}
                  {(selectedUser as any).collegeFaculty && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">College/Faculty</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).collegeFaculty}</p>
                    </div>
                  )}
                  {(selectedUser as any).studentType && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student Type</p>
                        <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).studentType}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Added On</p>
                    <p className="text-sm font-semibold text-slate-900">{(selectedUser as any).createdAt ? new Date((selectedUser as any).createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

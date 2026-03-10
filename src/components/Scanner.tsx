import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShieldCheck, ScanLine, XCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

export default function Scanner() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    studentName?: string;
    studentRole?: string;
    studentPhoto?: string;
  }>({ status: null, message: '' });
  
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (_decodedText: string) => {
        // on success
        scanner.clear();
        setIsScanning(false);
        verifyAccess(_decodedText);
      },
      (_error: unknown) => {
        // on failure - ignore to avoid spamming console
      }
    );
    
    setIsScanning(true);

    return () => {
      scanner.clear().catch((error: unknown) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAccess = async (code: string) => {
    // 1. Try our Dynamic QR Code Format (JABU-TOTP-{UID}-{RANDOM})
    const parts = code.split('-');
    let targetUid = '';
    
    // Check if it's the secure dynamic token format
    if (parts.length === 4 && parts[0] === 'JABU' && parts[1] === 'TOTP') {
      targetUid = parts[2];
    } 
    // 2. Fallback: Treat the code as a direct Matric / Staff ID (Legacy Barcodes)
    else {
      targetUid = code.trim();
    }

    if (!targetUid) {
       setScanResult({
        status: 'error',
        message: 'Empty or Invalid Barcode'
      });
      return;
    }
    
    try {
      let userDoc = await getDoc(doc(db, 'users', targetUid));
      
      // If UID lookup fails, try searching by Matric/Staff ID directly
      if (!userDoc.exists()) {
        const { query, collection, where, getDocs } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('matric', '==', targetUid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
           userDoc = querySnapshot.docs[0];
           targetUid = userDoc.id; // Update UID for logging
        } else {
           // Also try matching against a generic 'staffId' field just in case
           const q2 = query(usersRef, where('staffId', '==', targetUid));
           const querySnapshot2 = await getDocs(q2);
           
           if (!querySnapshot2.empty) {
             userDoc = querySnapshot2.docs[0];
             targetUid = userDoc.id;
           } else {
             setScanResult({ status: 'error', message: 'User not found in database.' });
             return;
           }
        }
      }

      const targetData = userDoc.data();
      
      if (!targetData) {
        setScanResult({ status: 'error', message: 'User profile data is corrupt.' });
        return;
      }
      
      // Log the scan event to Firestore
      await addDoc(collection(db, 'scans'), {
        scannedBy: userData?.uid || 'system',
        scannedByName: userData?.name || 'System Auto',
        targetUid: targetUid,
        targetName: targetData.name || 'Unknown',
        targetRole: targetData.role || 'guest',
        status: targetData.status || 'suspended',
        timestamp: serverTimestamp(),
        location: 'Main Gate',
        rawCode: code
      });

      if (targetData.status === 'active') {
        const result = {
          status: 'success' as const,
          message: 'Access Granted - Valid ID',
          studentName: targetData.name || 'User Profile',
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase(),
          studentPhoto: targetData.photoUrl
        };
        setScanResult(result);
        showToast(`✅ ${result.studentName} — Access Granted`, 'success');
      } else {
        const result = {
          status: 'error' as const,
          message: `Access Denied - Status: ${targetData.status ? targetData.status.toUpperCase() : 'UNKNOWN'}`,
          studentName: targetData.name || 'User Profile',
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase(),
          studentPhoto: targetData.photoUrl
        };
        setScanResult(result);
        showToast(`🚫 ${result.studentName} — ${result.message}`, 'error');
      }

    } catch (error: any) {
      console.error("Verification error:", error);
      setScanResult({ status: 'error', message: 'Database query failed. Try again.' });
    }
  };

  const resetScanner = () => {
    setScanResult({ status: null, message: '' });
    window.location.reload(); // Simple way to re-init the scanner for now
  };

  return (
    <div className="py-8 px-4 sm:px-8 max-w-2xl mx-auto min-h-[85vh] flex flex-col justify-center relative">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[50%] w-[60%] h-[60%] rounded-full bg-brand-500/10 blur-[120px] animate-float"></div>
      </div>

      <div className="relative z-10 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 p-4 bg-white/50 backdrop-blur-md text-brand-600 rounded-2xl border border-white/50 shadow-sm premium-shadow">
            <ScanLine className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Gate Scanner</h1>
            <p className="text-slate-500 font-medium mt-1">Verify digital identities and access passes</p>
          </div>
        </div>

        <div className="glass-panel overflow-hidden premium-shadow">
          
          {/* Scanner Viewport */}
          <div className="p-6 sm:p-8 bg-slate-900 text-white min-h-[350px] flex items-center justify-center relative overflow-hidden group">
             
             {/* Tech Grid Background */}
             <div className="absolute inset-0 bg-stripes opacity-10"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50 z-0"></div>

             {!scanResult.status ? (
               <div className="w-full max-w-sm relative z-10 transition-transform duration-500 hover:scale-[1.02]">
                 <div id="reader" className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black"></div>
                 {isScanning && (
                   <div className="text-center mt-6 animate-pulse flex flex-col items-center justify-center gap-2">
                     <div className="w-12 h-1 bg-brand-500 rounded-full"></div>
                     <p className="text-sm font-semibold tracking-widest text-brand-400 uppercase">
                       Awaiting Target...
                     </p>
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-center w-full py-8 fade-in relative z-10">
                 {scanResult.status === 'success' ? (
                   <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-float">
                     <ShieldCheck className="w-12 h-12" />
                   </div>
                 ) : (
                   <div className="w-24 h-24 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)] animate-float">
                     <XCircle className="w-12 h-12" />
                   </div>
                 )}
                 
                 <h2 className={`text-3xl font-display font-bold mb-2 tracking-tight ${scanResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                   {scanResult.status === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                 </h2>
                 <p className="text-slate-400 font-medium text-lg">{scanResult.message}</p>
                 
                 {scanResult.studentName && (
                   <div className="mt-8 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl text-left flex items-center gap-5 mx-auto max-w-sm animate-slide-up">
                     <div className="w-14 h-14 bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                       {scanResult.studentPhoto ? (
                           <img src={scanResult.studentPhoto} alt="Scanned Profile" className="w-full h-full object-cover" />
                       ) : (
                           <User className="w-7 h-7" />
                       )}
                     </div>
                     <div>
                       <p className="font-bold text-white text-xl leading-tight">{scanResult.studentName}</p>
                       <p className="text-xs font-bold tracking-wider text-brand-400 bg-brand-500/10 inline-block px-2.5 py-1 rounded-lg mt-2 uppercase">
                         {scanResult.studentRole}
                       </p>
                     </div>
                   </div>
                 )}

                 <button 
                   onClick={resetScanner}
                   className="mt-10 px-8 py-3.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-500 transition-all shadow-lg hover:shadow-brand-500/25 active:scale-95 duration-200"
                 >
                   Scan Next Pass
                 </button>
               </div>
             )}

          </div>

          {/* Manual Fallback */}
          <div className="p-6 sm:p-8 bg-white">
            <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Manual Override</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Enter Override Token..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono placeholder:font-sans placeholder:text-slate-400 transition-all shadow-inner"
              />
              <button 
                onClick={() => verifyAccess(manualCode)}
                disabled={!manualCode.trim() || !!scanResult.status}
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 active:scale-95 shrink-0"
              >
                Authenticate
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

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
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase()
        };
        setScanResult(result);
        showToast(`✅ ${result.studentName} — Access Granted`, 'success');
      } else {
        const result = {
          status: 'error' as const,
          message: `Access Denied - Status: ${targetData.status ? targetData.status.toUpperCase() : 'UNKNOWN'}`,
          studentName: targetData.name || 'User Profile',
          studentRole: (targetData.role || '').replace('_', ' ').toUpperCase()
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
    <div className="py-8 px-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <ScanLine className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gate Scanner</h1>
          <p className="text-slate-500 text-sm">Verify digital identities and access passes</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Scanner Viewport */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 min-h-[300px] flex items-center justify-center relative">
           
           {!scanResult.status ? (
             <div className="w-full">
               <div id="reader" className="w-full rounded-xl overflow-hidden shadow-sm"></div>
               {isScanning && (
                 <p className="text-center text-sm text-slate-500 mt-4 animate-pulse">
                   Position QR code within the frame...
                 </p>
               )}
             </div>
           ) : (
             <div className="text-center w-full py-8 fade-in">
               {scanResult.status === 'success' ? (
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-50">
                   <ShieldCheck className="w-10 h-10" />
                 </div>
               ) : (
                 <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-50">
                   <XCircle className="w-10 h-10" />
                 </div>
               )}
               
               <h2 className={`text-2xl font-bold mb-1 ${scanResult.status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {scanResult.status === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
               </h2>
               <p className="text-slate-600 font-medium">{scanResult.message}</p>
               
               {scanResult.studentName && (
                 <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-left flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center shrink-0">
                     <User className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-bold text-slate-900 text-lg leading-tight">{scanResult.studentName}</p>
                     <p className="text-sm font-mono text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">
                       {scanResult.studentRole}
                     </p>
                   </div>
                 </div>
               )}

               <button 
                 onClick={resetScanner}
                 className="mt-8 px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
               >
                 Scan Next Token
               </button>
             </div>
           )}

        </div>

        {/* Manual Fallback */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Manual Verification</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Manual Token (e.g. JABU-TOTP-...)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono placeholder:font-sans"
            />
            <button 
              onClick={() => verifyAccess(manualCode)}
              disabled={!manualCode.trim() || !!scanResult.status}
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Verify
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

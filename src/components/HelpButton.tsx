import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const helpContent: Record<string, { title: string; steps: string[] }> = {
  '/': {
    title: 'My Digital Pass',
    steps: [
      'Your QR code refreshes every 60 seconds — show it to any security officer at campus checkpoints.',
      'The coloured badge at the top right shows your current access status (Active / Suspended).',
      'Tap "Request Gate Pass" to notify security that you are exiting campus with a valid reason.',
      'Tap "Request Data Change" if any of your registered details need to be corrected.',
    ],
  },
  '/admin': {
    title: 'Admin Dashboard',
    steps: [
      'The "All Users" tab lists every registered identity. Tap any row to view their full profile.',
      'Use the search bar to filter students by name, matric number, or email.',
      'Click "Suspend Pass" to block a user\'s access, or "Activate Pass" to restore it.',
      '"Change Requests" shows pending profile edits submitted by users — approve or reject each one.',
      '"Security Status" shows which security officers are currently online on campus.',
    ],
  },
  '/scanner': {
    title: 'Security Scanner',
    steps: [
      'Point the camera at a student\'s QR code on their digital pass to scan their identity.',
      'A green result means the student is active and permitted to pass.',
      'A red result means access is suspended — do not allow entry.',
      'You can manually search for a student by typing their matric number.',
      'Upload luggage or checkpoint photos if required for a logged scan.',
    ],
  },
  '/login': {
    title: 'Signing In',
    steps: [
      'Enter your registered email address and password, then click "Sign In".',
      'Students must use their school email ending in @students.jabu.edu.ng.',
      'If you forgot your password, click "Forgot password?" to receive a reset link.',
      'New users should click "Register" to create a new digital campus identity.',
    ],
  },
  '/register': {
    title: 'Registration',
    steps: [
      'Upload a clear, recent passport photograph — this will appear on your digital ID.',
      'Fill in your full details. Students must select their College/Faculty and Department from the dropdowns.',
      'Use your school email (@students.jabu.edu.ng) when registering as a student.',
      'After registering, you will be signed out and must log in to access your Digital Pass.',
    ],
  },
  '/forgot-password': {
    title: 'Password Recovery',
    steps: [
      'Enter the email address you registered with and click "Send Reset Link".',
      'Check your inbox (and spam folder) for an email from Firebase / JABU SAMS.',
      'Click the link in the email and follow the instructions to set a new password.',
      'Return to the login page to sign in with your new password.',
    ],
  },
};

const defaultHelp = {
  title: 'JABU SAMS Help',
  steps: [
    'JABU SAMS is the Digital Identity & Access Management System for campus.',
    'Students use the app to display their QR-based digital ID pass.',
    'Security officers scan QR codes at checkpoints to verify access.',
    'Admins manage all user profiles, change requests, and security statuses.',
    'Contact the ICT Unit for account-related issues.',
  ],
};

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Match the route — strip hash router prefix if needed
  const normalised = pathname === '' ? '/' : pathname;
  const content = helpContent[normalised] ?? defaultHelp;

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setOpen(true)}
        title="Help"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-brand-600">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold text-base">{content.title}</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {content.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <p className="text-xs text-slate-400 text-center font-medium">
                JABU SAMS · Campus Identity & Access System
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

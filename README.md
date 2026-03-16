# JABU SAMS - Digital Campus Identity System

JABU SAMS (Student Access Management System) is a secure and modern full-stack web application designed for generating, managing, and verifying digital identity passes for students, staff, and guests at Joseph Ayo Babalola University.

## 🚀 Key Features

- **Role-Based Access Control (RBAC):** Users are securely routed based on their roles (Student, Admin, Security, Teaching Staff, etc.).
- **Dynamic Digital IDs:** Students and staff receive a generated digital ID card complete with their passport photograph and personal details.
- **Auto-Refreshing QR Codes:** Generates secure Time-Based One-Time Passwords (TOTP) embedded within QR codes that refresh every 30 seconds to prevent screenshot spoofing.
- **Integrated QR Scanner:** Built-in scanner dashboard for Security personnel to instantly read and verify passes at campus checkpoints.
- **Admin Dashboard:** Administrators can view all registered identities, search records, and instantly suspend/activate access for any user.
- **Responsive & Premium UI:** Built with Tailwind CSS, featuring glassmorphism effects, dynamic animated background carousels, and optimized layouts for both desktop and mobile devices.

## 🛠 Technology Stack

- **Frontend Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Lucide React (Icons)
- **Backend & Database:** Firebase (Authentication, Cloud Firestore)
- **File Storage:** Firebase Storage (for passport image uploads)
- **Routing:** React Router DOM (HashRouter)
- **Utilities:** HTML5-Qrcode (Scanner), React-QR-Code, HTML2Canvas.

## 📦 Local Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Firebase Configuration:**
   Ensure you have configured your Firebase project. The existing configuration is located in `src/firebase.ts`. If setting up a new Firebase environment, ensure Authentication (Email/Password), Firestore, and Storage are all enabled.

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   *The app will be available at `http://localhost:5173/` by default.*

## 🏗 Build & Deployment

To build the project for production, run:
```bash
npm run build
```

### Vercel Deployment
This application is configured as a Single Page Application (SPA). To prevent "404 Not Found" or blank screen errors on refresh, a `vercel.json` file is included at the root directory which correctly proxies all routing requests back to `index.html`.
- Run `npm run build` safely directly on the Vercel dashboard.

## 📂 Project Structure

- `src/components/Login.tsx` & `Register.tsx`: Secure onboarding flows with dynamic mobile-responsive image carousels.
- `src/components/StudentCard.tsx`: The primary dashboard for students. Generates the downloadable digital Identity Pass and rotating QR token.
- `src/components/Scanner.tsx`: Intended for Security roles to read tokens.
- `src/components/AdminDashboard.tsx`: Data-table interface for Admin roles to manage system access.
- `src/context/AuthContext.tsx`: Manages active user states and queries Firestore for user-role definitions upon login.

## 🛡️ Security Notes
- Passwords must be at least 6 characters long.
- Suspended users are immediately flagged defensively when their QR codes are scanned, or actively blocked by real-time Firestore listeners if they attempt to view their `StudentCard`.

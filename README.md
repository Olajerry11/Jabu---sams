# JABU SAMS — Campus Identity & Access Management System

**Joseph Ayo Babalola University, Ikeji-Arakeji, Osun State**
*The First Entrepreneurial University in Nigeria*

---

## Overview

JABU SAMS is a full-stack Progressive Web App (PWA) for managing digital campus identities, QR-based gate passes, and administrative oversight of all campus users.

## Features

| Feature | Description |
|---|---|
| 🎬 Startup Animation | Typewriter animation with logo roll-in on first load |
| 🆔 Digital ID Pass | QR code refreshes every 60 seconds per student |
| 👤 Role-Based Routing | Students, Staff, Security, Admin get different dashboards |
| 🔐 Admin Dashboard | View all users, manage access, approve profile change requests |
| 📷 Passport Photos | Uploaded at registration, compressed & stored in Firestore |
| 🔍 QR Scanner | Security officers scan student passes in real time |
| 📝 Registration | Full form with college/faculty & department dropdowns |
| ♻️ Change Requests | Students self-request profile edits (auto-filled); admins approve/reject |
| 🚪 Gate Pass Requests | Students alert security before leaving campus or for deliveries |
| 🤖 AI Chatbot | Gemini 2.0 Flash-powered assistant answers JABU SAMS questions |
| 🗑️ Delete User | Admins can permanently delete a user record with confirmation; deleted users are instantly signed out |
| 📱 Mobile Optimised | Responsive layout, compressed images, PWA-ready |

## Roles

| Role | Access |
|---|---|
| `student` | Digital ID card, QR code, gate pass requests, change requests |
| `teaching_staff` | Digital ID card, change requests |
| `non_teaching_staff` | Digital ID card, change requests |
| `security` | QR scanner, luggage photo uploads |
| `admin` | Full admin dashboard — all users, change requests, security status |
| `food_vendor` / `camp_guest` | Digital ID card only |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase v12 (Auth, Firestore)
- **Routing**: React Router v7 (HashRouter for GitHub Pages)
- **QR Generation**: `react-qr-code`
- **QR Scanner**: `html5-qrcode`
- **AI Chatbot**: Google Gemini 2.0 Flash (`@google/generative-ai` REST API)
- **Icons**: Lucide React
- **Deployment**: GitHub Pages via GitHub Actions

## Getting Started (Local)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Environment Variables

Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...   # Get free key from https://aistudio.google.com/apikey
```

## Deployment (GitHub Pages)

Pushing to `main` triggers the GitHub Actions workflow which:
1. Installs dependencies
2. Builds with `VITE_GH_PAGES=true` (sets base URL to `/Jabu---sams/`)
3. Deploys the `dist/` folder to the `gh-pages` branch

## Registration Notes

- **Students** must register with a `@students.jabu.edu.ng` email.
- **College/Faculty** and **Department** are pre-filled dropdowns with all JABU programmes.
- Passport photos are compressed to max 400px at 60% JPEG quality before upload.

## Password Reset

The "Forgot Password" page sends a Firebase password reset email. Ensure Firebase Auth has the correct action URL configured in the Firebase Console under **Authentication → Templates**.

---

© Joseph Ayo Babalola University — JABU SAMS

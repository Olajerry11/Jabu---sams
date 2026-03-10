# JABU SAMS (Smart Access Management System)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen)](https://Olajerry11.github.io/Jabu---sams/)

A lightweight **student access management web app** built with **plain HTML/CSS/JavaScript**, **Firebase Firestore**, and **QR code scanning**.

## 📍 Live Demo (GitHub Pages)

This project is configured to deploy to **GitHub Pages** via GitHub Actions.

➡️ View it live at: **https://Olajerry11.github.io/Jabu---sams/**

> Note: The first deploy may take a couple minutes after pushing changes.

It provides:

- ✅ **Student ID Card** with live status updates (Active / Suspended)
- ✅ **QR code generation** for student IDs
- ✅ **Gate Scanner** that verifies students from the cloud database (camera + manual entry)
- ✅ **Admin Panel** to view students, suspend/reactivate access, and seed sample data
- ✅ **Offline caching** using a simple Service Worker (`sw.js`)

---

## 🚀 How It Works

| Page | Purpose |
|------|---------|
| `index.html` | Student ID card that displays student info + live status from Firestore |
| `scanner.html` | Gate scanner that reads QR codes and checks Firestore for access status |
| `admin.html` | Admin dashboard for viewing all students and toggling access |
| `login.html` | Simple PIN-based login gate (PIN is hardcoded to `1234`) |

All Firestore access is handled via `firebase` (compat) libraries and the `students` collection.

---

## 🛠️ Setup (Run Locally)

1. **Clone the repo** (if not already):

   ```bash
   git clone https://github.com/Olajerry11/Jabu---sams.git
   cd "Jabu---sams"
   ```

2. **Run a local web server** (recommended):

   - Using Node.js + `serve`:
     ```bash
     npx serve .
     ```

   - Or using Python:
     ```bash
     python -m http.server 8000
     ```

3. **Open in browser**:
   - Student ID: `http://localhost:5000/index.html` (or port your server uses)
   - Scanner: `scanner.html`
   - Admin: `admin.html`

---

## 🔐 Admin Access

The admin panel is not protected by authentication in this demo. It is accessible directly via `admin.html`.

### Default PIN (for scanner gate login)

- PIN: `1234`

---

## 🧩 Firestore Database

This app uses the `students` collection in Firestore.

### Document ID format

Document IDs are derived from the student's matric number by replacing `/` with `-`.

Example:

- Matric: `JABU/ACC/25/089`
- Document ID: `JABU-ACC-25-089`

### Sample fields

```json
{ "name": "John Doe", "matric": "JABU/ACC/25/089", "status": "active" }
```

---

## 🛠️ Key Files

- `index.html` + `student.js` → Student ID card w/ QR code and real-time status
- `scanner.html` + `scanner.js` → Camera scanner + manual verify
- `admin.html` + `admin.js` → Dashboard + suspend/reactivate logic
- `sw.js` → Simple cache-first service worker for offline assets

---

## 📌 Notes & Improvements

- 🔒 PIN login is hardcoded; real authentication should use Firebase Auth.
- 🔁 The service worker caches the current assets only; it can be extended to cache runtime responses.
- 🧠 Student selection is hardcoded in `student.js` (as a prototype). For multi-user, add a login step.

---

## 🙌 Thanks

Built as a quick proof-of-concept for campus access management using QR codes and Firestore.

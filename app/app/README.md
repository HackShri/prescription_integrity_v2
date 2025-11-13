# App Folder Structure

This document describes the folder structure inside the `app` directory.

```
app/
├── _layout.jsx           # Main layout component for the app
├── index.js              # Entry point for the app
├── auth/                 # Authentication pages
│   ├── login.js          # Login page
│   └── register.js       # Registration page
├── doctor/               # Doctor dashboard/pages
│   └── doctor.js         # Doctor main page
├── patient/              # Patient dashboard/pages
│   ├── index.js          # Patient main page
│   └── prescription/     # Patient prescription pages
│       └── [id].js       # Dynamic route for viewing a specific prescription
├── pharmacist/           # Pharmacist dashboard/pages
│   └── pharmacist.js     # Pharmacist main page
```

- **auth/**: Contains authentication-related pages (login, register).
- **doctor/**: Contains doctor-specific pages and dashboard.
- **patient/**: Contains patient dashboard and prescription-related pages.
- **pharmacist/**: Contains pharmacist dashboard/pages.
- **_layout.jsx**: Main layout for the app.
- **index.js**: Entry point for the app.

This structure helps organize the app by user roles and main features.
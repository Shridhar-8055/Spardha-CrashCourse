# Sri Spardha Academy — Crash Course

A private video-lesson web app for Sri Spardha Academy students. Built with
Next.js (App Router) + React + TypeScript, using a Google Sheet (via Apps
Script) as the datastore.

## Features

- **Login-first** — students sign in with a Name + admin-issued User ID +
  Password.
- **Single-device login** — each student can be logged in on only one device at
  a time.
- **Admin dashboard** (`/admin`) — issue credentials, see who's online, track
  watched videos, reset sessions, disable/delete students. Capped at 50 students.
- **De-branded video player** — YouTube videos play inline with a custom player
  (no YouTube logo, title, or "Watch on YouTube"); the video URL is kept off the
  page. Sort and mark-as-watched supported.
- **Google Sheet as database** — students, logins, and progress are stored in a
  `Students` tab, accessed through a Google Apps Script Web App.

## Setup

See [SETUP.md](./SETUP.md) for the full Google Apps Script + environment setup.

Required environment variables (`.env.local`, not committed):

```
APPS_SCRIPT_URL=...        # deployed Apps Script Web App URL (apps-script/Code.gs)
APPS_SCRIPT_SECRET=...     # must match SECRET inside the Apps Script
ADMIN_PASSWORD=...         # admin dashboard password
SESSION_SECRET=...         # random string for signing the admin cookie
```

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

- Students: `/login`
- Admin: `/admin`

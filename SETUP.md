# Setup — Google Sheets backend (via Apps Script)

This app stores students, login records, and lesson progress in a **Google
Sheet**. It talks to the sheet through a small **Apps Script Web App** — no
Google Cloud project or service account needed.

You'll end up filling these in `.env.local`:
`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET`.

---

## 1. Create the Google Sheet

1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Name it anything (e.g. "CrashCourse Students"). Leave it empty — the script
   creates a **Students** tab with headers automatically.

## 2. Open the Apps Script editor

1. In the sheet, click **Extensions → Apps Script**.
2. A new tab opens with a `Code.gs` file containing a default `myFunction`.

## 3. Paste the script

1. Select all the default code and delete it.
2. Open **`apps-script/Code.gs`** from this project, copy its entire contents,
   and paste into the editor.
3. Near the top, change this line to your own long random string:

   ```js
   var SECRET = 'CHANGE_ME_to_a_long_random_string';
   ```

   Remember this value — it goes into `.env.local` as `APPS_SCRIPT_SECRET`.
4. Click the **Save** icon (💾).

## 4. Deploy as a Web App

1. Top-right → **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" → choose **Web app**.
3. Set:
   - **Description:** anything (e.g. "crashcourse api")
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone**  ← important
4. Click **Deploy**.
5. Click **Authorize access** → pick your Google account.
   - You'll likely see *"Google hasn't verified this app"* — click
     **Advanced → Go to (your project) (unsafe)** → **Allow**. This is your own
     script, so it's safe.
6. Copy the **Web app URL** — it ends in `/exec`. That's your `APPS_SCRIPT_URL`.

> Quick check: paste that URL into a browser. You should see
> `{"ok":true,"service":"crashcourse","tab":"Students"}`.

## 5. Fill in `.env.local`

Open `.env.local` in the project root and set:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfy.../exec
APPS_SCRIPT_SECRET=the-same-secret-you-put-in-the-script
ADMIN_PASSWORD=pick-a-strong-password
SESSION_SECRET=any-long-random-string
```

`APPS_SCRIPT_SECRET` **must exactly match** the `SECRET` in the script.

## 6. Restart the dev server

```bash
npm run dev
```

---

## Using it

- **Admin:** go to `/admin/login`, enter `ADMIN_PASSWORD`, then add students
  (auto-generates a User ID + Password to hand out). You can see who's logged in,
  reset a session (to free a student's device), disable, or delete.
- **Students:** go to `/login`, enter their **name + User ID + password**.
  Each student can only be logged in on **one device at a time** — a second
  device is blocked until they log out or the admin resets their session.
- Up to **50 students** can be created.

## Enabling video renaming (admin dashboard)

The admin "Video names" section lets you rename videos. This stores custom
names in a `VideoTitles` tab inside the **Students** spreadsheet, so it needs
the latest `apps-script/Code.gs` (which includes the `videoTitles` /
`setVideoTitle` actions). After updating the script, **re-deploy a new version**
(see below). Until then, video renaming returns an error but everything else
keeps working.

## If you change the script later

Editing `Code.gs` doesn't update the live URL automatically. Re-deploy:
**Deploy → Manage deployments → (your deployment) → ✏️ Edit → Version: New
version → Deploy**. The URL stays the same.

## Notes

- Passwords are stored in the sheet in plain text **on purpose**, so the admin
  can read and re-share them. Keep the sheet private.
- A session lasts 24 hours, or until logout / admin reset.
- The script uses a lock so simultaneous requests can't corrupt the
  single-device rule.

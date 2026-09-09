# Just Two

A private two-person chat app with saved messages, images, voice notes, reactions, typing status, presence/last-seen, profiles, and a remembered-chat shortcut on the landing page.

## Run on a Mac

Use Node.js 22 LTS.

```bash
npm install
npm start
```

Open http://localhost:3000

## Data safety / persistence

The app saves chat data in SQLite and saves uploaded media on disk. It uses SQLite WAL mode with `synchronous=FULL`, checkpoints on shutdown, and creates rolling database backups every 30 minutes (up to 12 copies).

For cloud hosting, **the database and uploads must live on persistent storage**. Set:

```text
DATA_DIR=/data
```

and mount a persistent volume at `/data`. The following will then survive ordinary app restarts/redeploys:

- `/data/chat.db`
- `/data/uploads/`
- `/data/backups/`

No storage system can guarantee zero data loss in every possible failure. For important chats, also keep an off-platform backup of the persistent volume/database.

## Emergency lock

The red `!` button in a chat locks the entire app. While locked, chat APIs and uploaded media are blocked and connected users are disconnected. The lock state is saved in SQLite, so restarting the server does not clear it.

Default unlock password: `aryan`

Before publishing publicly, change it with an environment variable:

```text
EMERGENCY_PASSWORD=your-long-private-password
```

Do not put the real password in `app.js`, HTML, or GitHub.

## Upload to GitHub

Create an empty repository on GitHub, then in Terminal from this project folder:

```bash
git init
git add .
git commit -m "Initial Just Two chat"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

The `.gitignore` prevents local chat databases, uploads, backups, `.env`, and `node_modules` from being committed.

## Hosting notes

Use a host that supports Node.js, WebSockets, and persistent volumes. Configure:

```text
DATA_DIR=/data
EMERGENCY_PASSWORD=change-this-before-public-use
```

Mount the host's persistent volume at `/data`.


## First-visit onboarding

New browsers see a 3-step privacy and usage guide before using the app. It explains the privacy check, how two-person rooms work, offline/saved messages, media features, and that the site works in modern browsers across computers, tablets/iPads, and phones. The guide is stored as completed in that browser so it does not appear on every visit.
# Just-Two
# Just-Two

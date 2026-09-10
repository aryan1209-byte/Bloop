# Bloop

Bloop is a lightweight private messaging web app built with Node.js, Express, Socket.IO, and SQLite.

## Current build notes
- App/package name is Bloop / `bloop-chat`.
- Preserves existing SQLite chat data.
- Supports invite acceptance/decline state.
- Includes app-wide presence heartbeat and fast last-seen updates.
- Supports text messages, images, camera uploads, voice notes, reactions, typing status, profiles, unread counts, seen receipts, and message deletion.
- Supports activity states including recording audio and taking a photo.
- Uses persistent storage through `DATA_DIR` (Railway uses `/data`).
- SQLite runs in WAL mode with periodic backups.

## Run locally
```bash
npm install
npm start
```

Then open `http://localhost:3000`.

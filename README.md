# Just Two v6

Two-person private chat with persistent SQLite storage, offline history, images, voice notes, reactions, presence, typing, privacy blur and emergency lock.

## v6 changes
- Shorter 3-step first-run guide with Back and First step controls
- First-run identity popup for name + username; later chat popups are customization only
- Multiple saved chats/contacts on Home instead of replacing the previous chat
- Green online, grey offline, yellow last-seen status dots
- Typing status in the header plus animated three-dot typing bubble
- Sent/seen receipts
- Full emoji reaction picker and reaction burst animations
- Dark animated water treatment for KNY Water Night
- Dedicated YouTube/Pinterest link sender; YouTube links embed in chat and Pinterest links render as cards
- Removed the broken chaos spinner; random prompt/joke button remains
- Dark button fixes and no bright white Copy/action buttons
- Privacy shield remains instant with double-tap/double-click to reveal; returning visits begin blurred

## Run
```bash
npm install
npm start
```

For Railway keep `DATA_DIR=/data` and the persistent volume mounted at `/data`.

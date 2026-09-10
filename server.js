import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });
const DATA_DIR = process.env.DATA_DIR || __dirname;
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const db = new Database(process.env.DB_FILE || path.join(DATA_DIR, 'chat.db'));
const PORT = Number(process.env.PORT || 3000);
const heartbeatExpiryTimers = new Map();

app.use(express.json({ limit: '64kb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');
db.pragma('foreign_keys = ON');
db.pragma('wal_autocheckpoint = 500');
db.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  share_token_hash TEXT NOT NULL UNIQUE,
  creator_token_hash TEXT NOT NULL,
  guest_token_hash TEXT,
  invite_status TEXT NOT NULL DEFAULT 'pending',
  invite_status_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('creator','guest')),
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  seen_at INTEGER,
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reactions (
  message_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('creator','guest')),
  emoji TEXT NOT NULL,
  PRIMARY KEY(message_id, role),
  FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS profiles (
  room_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('creator','guest')),
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  last_seen INTEGER,
  username TEXT,
  activity_status TEXT,
  status_at INTEGER,
  PRIMARY KEY(room_id, role),
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, id);
`);

// Lightweight migration for older copies of this project.
const messageColumns = db.prepare('PRAGMA table_info(messages)').all().map(c => c.name);
for (const [name, sql] of [
  ['type', `ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text'`],
  ['media_url', `ALTER TABLE messages ADD COLUMN media_url TEXT`],
  ['deleted_at', `ALTER TABLE messages ADD COLUMN deleted_at INTEGER`],
  ['seen_at', `ALTER TABLE messages ADD COLUMN seen_at INTEGER`]
]) if (!messageColumns.includes(name)) db.exec(sql);


const roomColumns = db.prepare('PRAGMA table_info(rooms)').all().map(c => c.name);
if (!roomColumns.includes('invite_status')) db.exec(`ALTER TABLE rooms ADD COLUMN invite_status TEXT NOT NULL DEFAULT 'pending'`);
if (!roomColumns.includes('invite_status_at')) db.exec(`ALTER TABLE rooms ADD COLUMN invite_status_at INTEGER`);

const profileColumns = db.prepare('PRAGMA table_info(profiles)').all().map(c => c.name);
if (!profileColumns.includes('last_seen')) db.exec(`ALTER TABLE profiles ADD COLUMN last_seen INTEGER`);
if (!profileColumns.includes('username')) db.exec(`ALTER TABLE profiles ADD COLUMN username TEXT`);
if (!profileColumns.includes('activity_status')) db.exec(`ALTER TABLE profiles ADD COLUMN activity_status TEXT`);
if (!profileColumns.includes('status_at')) db.exec(`ALTER TABLE profiles ADD COLUMN status_at INTEGER`);


const EMERGENCY_PASSWORD = process.env.EMERGENCY_PASSWORD || 'aryan';
function getSetting(key, fallback = null) {
  return db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)?.value ?? fallback;
}
function setSetting(key, value) {
  db.prepare(`INSERT INTO app_settings(key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, String(value));
}
function appLocked() { return getSetting('emergency_locked', '0') === '1'; }
function safePasswordMatch(value) {
  const a = crypto.createHash('sha256').update(String(value || '')).digest();
  const b = crypto.createHash('sha256').update(EMERGENCY_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

async function makeBackup() {
  if (typeof db.backup !== 'function') return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUP_DIR, `chat-${stamp}.db`);
  try {
    await db.backup(target);
    const files = fs.readdirSync(BACKUP_DIR).filter(n => n.endsWith('.db')).sort().reverse();
    for (const old of files.slice(12)) try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch {}
  } catch (err) { console.error('Backup failed:', err.message); }
}
setTimeout(makeBackup, 4000);
setInterval(makeBackup, 30 * 60 * 1000).unref();

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const token = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');
const cleanName = value => String(value || '').trim().slice(0, 24);
const cleanUsername = value => String(value || '').trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,20);

function authenticate(roomId, authToken) {
  if (!roomId || !authToken) return null;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return null;
  const h = sha256(authToken);
  if (h === room.creator_token_hash) return { room, role: 'creator' };
  if (room.guest_token_hash && h === room.guest_token_hash) return { room, role: 'guest' };
  return null;
}

function authRequest(req) {
  return authenticate(req.params.roomId, req.header('x-chat-token'));
}

function getProfiles(roomId) {
  const rows = db.prepare('SELECT role, display_name AS displayName, avatar_url AS avatarUrl, username, last_seen AS lastSeen, activity_status AS activityStatus, status_at AS statusAt FROM profiles WHERE room_id = ?').all(roomId);
  const out = {
    creator: { displayName: 'You', avatarUrl: null, username: '', lastSeen: null, activityStatus: null, statusAt: null },
    guest: { displayName: 'Friend', avatarUrl: null, username: '', lastSeen: null, activityStatus: null, statusAt: null }
  };
  for (const p of rows) out[p.role] = { displayName: p.displayName || (p.role === 'creator' ? 'You' : 'Friend'), avatarUrl: p.avatarUrl || null, username: p.username || '', lastSeen: p.lastSeen || null, activityStatus: p.activityStatus || null, statusAt: p.statusAt || null };
  return out;
}

function serializeMessages(roomId) {
  const rows = db.prepare(`
    SELECT id, sender, body, type, media_url AS mediaUrl, created_at AS createdAt, deleted_at AS deletedAt, seen_at AS seenAt
    FROM messages WHERE room_id = ? ORDER BY id ASC LIMIT 1000
  `).all(roomId);
  const reactions = db.prepare(`
    SELECT r.message_id AS messageId, r.role, r.emoji
    FROM reactions r JOIN messages m ON m.id = r.message_id
    WHERE m.room_id = ?
  `).all(roomId);
  const byId = new Map();
  for (const r of reactions) {
    if (!byId.has(r.messageId)) byId.set(r.messageId, []);
    byId.get(r.messageId).push({ role: r.role, emoji: r.emoji });
  }
  return rows.map(m => ({ ...m, reactions: byId.get(m.id) || [] }));
}


function presencePayload(roomId) {
  const socketIds = io.sockets.adapter.rooms.get(roomId) || new Set();
  const onlineRoles = new Set();
  for (const socketId of socketIds) {
    const s = io.sockets.sockets.get(socketId);
    if (s?.data?.role) onlineRoles.add(s.data.role);
  }
  const rows = db.prepare('SELECT role, last_seen AS lastSeen, activity_status AS activityStatus, status_at AS statusAt FROM profiles WHERE room_id = ?').all(roomId);
  const lastSeen = { creator: null, guest: null };
  const activity = { creator: null, guest: null };
  const statusAt = { creator: null, guest: null };
  const recentCutoff = Date.now() - 5500;
  for (const row of rows) {
    lastSeen[row.role] = row.lastSeen || null; activity[row.role] = row.activityStatus || null; statusAt[row.role] = row.statusAt || null;
    if (row.lastSeen && row.lastSeen >= recentCutoff && row.activityStatus !== 'emergency') onlineRoles.add(row.role);
  }
  return { online: [...onlineRoles], lastSeen, activity, statusAt };
}

function emitPresence(roomId) {
  io.to(roomId).emit('presence', presencePayload(roomId));
}

function extensionFor(mime, kind) {
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
    'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3',
  };
  return map[mime] || (kind === 'audio' ? '.webm' : '.bin');
}

function deleteLocalMedia(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = path.basename(url);
  try { fs.unlinkSync(path.join(UPLOAD_DIR, filename)); } catch {}
}


app.get('/api/app-status', (_req, res) => res.json({ locked: appLocked() }));
app.post('/api/emergency/unlock', (req, res) => {
  if (!safePasswordMatch(req.body?.password)) return res.status(401).json({ error: 'Wrong password.' });
  setSetting('emergency_locked', '0');
  res.json({ ok: true });
});
app.post('/api/emergency/lock', (req, res) => {
  const roomId = String(req.body?.roomId || '');
  const authToken = req.header('x-chat-token');
  if (!authenticate(roomId, authToken)) return res.status(401).json({ error: 'Not authorized.' });
  setSetting('emergency_locked', '1');
  res.json({ ok: true });
  setTimeout(() => {
    io.emit('emergency-lock');
    for (const socket of io.sockets.sockets.values()) socket.disconnect(true);
  }, 30);
});

app.use((req, res, next) => {
  if (!appLocked()) return next();
  if (req.path === '/api/app-status' || req.path === '/api/emergency/unlock') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return res.status(423).json({ error: 'App locked.' });
  next();
});

app.post('/api/rooms', (_req, res) => {
  const roomId = token(12);
  const shareToken = token(24);
  const creatorToken = token(32);
  db.prepare('INSERT INTO rooms (id, share_token_hash, creator_token_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(roomId, sha256(shareToken), sha256(creatorToken), Date.now());
  db.prepare(`INSERT OR IGNORE INTO profiles (room_id, role, display_name) VALUES (?, 'creator', 'You')`).run(roomId);
  res.json({ roomId, shareToken, creatorToken });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { shareToken, existingToken } = req.body || {};
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room || !shareToken || sha256(shareToken) !== room.share_token_hash) return res.status(404).json({ error: 'Invalid room link.' });
  if (existingToken) {
    const auth = authenticate(roomId, existingToken);
    if (auth) return res.json({ role: auth.role, authToken: existingToken });
  }
  if (room.invite_status === 'declined') return res.status(410).json({ error: 'This invite was declined.' });
  if (room.guest_token_hash) return res.status(403).json({ error: 'This chat already has its two people.' });
  const guestToken = token(32);
  const result = db.prepare(`UPDATE rooms SET guest_token_hash = ?, invite_status = 'accepted', invite_status_at = ? WHERE id = ? AND guest_token_hash IS NULL AND invite_status != 'declined'`).run(sha256(guestToken), Date.now(), roomId);
  if (!result.changes) return res.status(403).json({ error: 'This chat already has its two people.' });
  db.prepare(`INSERT OR IGNORE INTO profiles (room_id, role, display_name) VALUES (?, 'guest', 'Friend')`).run(roomId);
  res.json({ role: 'guest', authToken: guestToken });
});

app.post('/api/rooms/:roomId/decline', (req, res) => {
  const { roomId } = req.params;
  const { shareToken } = req.body || {};
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room || !shareToken || sha256(shareToken) !== room.share_token_hash) return res.status(404).json({ error: 'Invalid room link.' });
  if (room.guest_token_hash || room.invite_status === 'accepted') return res.status(409).json({ error: 'This invite was already accepted.' });
  db.prepare(`UPDATE rooms SET invite_status = 'declined', invite_status_at = ? WHERE id = ?`).run(Date.now(), roomId);
  io.to(roomId).emit('invite-declined', { roomId });
  res.json({ ok: true });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const unreadCount = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE room_id = ? AND sender != ? AND seen_at IS NULL AND deleted_at IS NULL').get(req.params.roomId, auth.role).n;
  res.json({ role: auth.role, messages: serializeMessages(req.params.roomId), profiles: getProfiles(req.params.roomId), presence: presencePayload(req.params.roomId), unreadCount, inviteStatus: auth.room.invite_status || 'pending', inviteStatusAt: auth.room.invite_status_at || null });
});

app.patch('/api/rooms/:roomId/profile', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const displayName = cleanName(req.body?.displayName);
  const username = cleanUsername(req.body?.username);
  const existing = getProfiles(req.params.roomId)[auth.role];
  const nextName = displayName || existing.displayName || (auth.role === 'creator' ? 'You' : 'Friend');
  const nextUsername = username || existing.username || '';
  db.prepare(`INSERT INTO profiles (room_id, role, display_name, username) VALUES (?, ?, ?, ?)
    ON CONFLICT(room_id, role) DO UPDATE SET display_name = excluded.display_name, username = excluded.username`)
    .run(req.params.roomId, auth.role, nextName, nextUsername);
  const profile = getProfiles(req.params.roomId)[auth.role];
  io.to(req.params.roomId).emit('profile', { role: auth.role, ...profile });
  res.json(profile);
});

app.post('/api/rooms/:roomId/heartbeat', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const roomId = req.params.roomId;
  const now = Date.now();
  db.prepare('UPDATE profiles SET last_seen = ? WHERE room_id = ? AND role = ?').run(now, roomId, auth.role);
  const key = `${roomId}:${auth.role}`;
  clearTimeout(heartbeatExpiryTimers.get(key));
  heartbeatExpiryTimers.set(key, setTimeout(() => { heartbeatExpiryTimers.delete(key); emitPresence(roomId); }, 6000));
  emitPresence(roomId);
  res.json({ ok: true, at: now });
});

app.post('/api/rooms/:roomId/activity-status', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const raw = String(req.body?.status || 'active');
  if (!['active','blurred','emergency','recording-audio','taking-photo'].includes(raw)) return res.status(400).json({ error: 'Invalid status.' });
  const stored = raw === 'active' ? null : raw;
  const now = Date.now();
  db.prepare('UPDATE profiles SET activity_status = ?, status_at = ? WHERE room_id = ? AND role = ?').run(stored, now, req.params.roomId, auth.role);
  emitPresence(req.params.roomId);
  res.json({ ok: true, status: raw, statusAt: now });
});

app.post('/api/rooms/:roomId/upload/:kind', express.raw({ type: '*/*', limit: '8mb' }), (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const kind = req.params.kind;
  if (!['image', 'audio', 'avatar'].includes(kind)) return res.status(400).json({ error: 'Unsupported upload.' });
  const mime = String(req.header('content-type') || '').split(';')[0].toLowerCase();
  const allowed = kind === 'audio' ? mime.startsWith('audio/') : mime.startsWith('image/');
  if (!allowed || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: `Please choose a valid ${kind === 'audio' ? 'audio' : 'image'} file.` });
  const max = kind === 'avatar' ? 3 * 1024 * 1024 : 8 * 1024 * 1024;
  if (req.body.length > max) return res.status(413).json({ error: `File is too large. Maximum ${Math.round(max / 1024 / 1024)} MB.` });
  const filename = `${token(18)}${extensionFor(mime, kind)}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.body);
  const url = `/uploads/${filename}`;

  if (kind === 'avatar') {
    const previous = getProfiles(req.params.roomId)[auth.role].avatarUrl;
    const existingProfile = getProfiles(req.params.roomId)[auth.role];
    db.prepare(`INSERT INTO profiles (room_id, role, display_name, avatar_url, username) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(room_id, role) DO UPDATE SET avatar_url = excluded.avatar_url`)
      .run(req.params.roomId, auth.role, existingProfile.displayName || (auth.role === 'creator' ? 'You' : 'Friend'), url, existingProfile.username || '');
    if (previous && previous !== url) deleteLocalMedia(previous);
    const profile = getProfiles(req.params.roomId)[auth.role];
    io.to(req.params.roomId).emit('profile', { role: auth.role, ...profile });
    return res.json(profile);
  }

  const createdAt = Date.now();
  const type = kind === 'audio' ? 'audio' : 'image';
  const info = db.prepare('INSERT INTO messages (room_id, sender, body, type, media_url, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.roomId, auth.role, '', type, url, createdAt);
  const msg = { id: Number(info.lastInsertRowid), sender: auth.role, body: '', type, mediaUrl: url, createdAt, deletedAt: null, seenAt: null, reactions: [] };
  io.to(req.params.roomId).emit('message', msg);
  res.json(msg);
});

io.use((socket, next) => {
  if (appLocked()) return next(new Error('app_locked'));
  const { roomId, authToken } = socket.handshake.auth || {};
  const auth = authenticate(roomId, authToken);
  if (!auth) return next(new Error('unauthorized'));
  socket.data.roomId = roomId;
  socket.data.role = auth.role;
  next();
});

io.on('connection', socket => {
  const { roomId, role } = socket.data;
  socket.join(roomId);
  db.prepare('UPDATE profiles SET last_seen = ?, activity_status = NULL, status_at = ? WHERE room_id = ? AND role = ?').run(Date.now(), Date.now(), roomId, role);
  emitPresence(roomId);

  socket.on('typing', value => {
    socket.to(roomId).emit('typing', { role, typing: Boolean(value) });
  });

  socket.on('activity-status', (value, ack) => {
    const raw = String(value || 'active');
    if (!['active','blurred','emergency','recording-audio','taking-photo'].includes(raw)) { if (typeof ack === 'function') ack({ ok: false }); return; }
    const stored = raw === 'active' ? null : raw;
    const now = Date.now();
    db.prepare('UPDATE profiles SET activity_status = ?, status_at = ? WHERE room_id = ? AND role = ?').run(stored, now, roomId, role);
    emitPresence(roomId);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('message', raw => {
    if (typeof raw !== 'string') return;
    const body = raw.trim().slice(0, 2000);
    if (!body) return;
    const createdAt = Date.now();
    const info = db.prepare(`INSERT INTO messages (room_id, sender, body, type, created_at) VALUES (?, ?, ?, 'text', ?)`)
      .run(roomId, role, body, createdAt);
    socket.to(roomId).emit('typing', { role, typing: false });
    io.to(roomId).emit('message', { id: Number(info.lastInsertRowid), sender: role, body, type: 'text', mediaUrl: null, createdAt, deletedAt: null, seenAt: null, reactions: [] });
  });

  socket.on('react', ({ messageId, emoji } = {}) => {
    const id = Number(messageId);
    const safeEmoji = String(emoji || '').slice(0, 16);
    if (!Number.isInteger(id) || !safeEmoji) return;
    const msg = db.prepare('SELECT id FROM messages WHERE id = ? AND room_id = ? AND deleted_at IS NULL').get(id, roomId);
    if (!msg) return;
    const existing = db.prepare('SELECT emoji FROM reactions WHERE message_id = ? AND role = ?').get(id, role);
    if (existing?.emoji === safeEmoji) db.prepare('DELETE FROM reactions WHERE message_id = ? AND role = ?').run(id, role);
    else db.prepare(`INSERT INTO reactions(message_id, role, emoji) VALUES (?, ?, ?)
      ON CONFLICT(message_id, role) DO UPDATE SET emoji = excluded.emoji`).run(id, role, safeEmoji);
    const reactions = db.prepare('SELECT role, emoji FROM reactions WHERE message_id = ?').all(id);
    io.to(roomId).emit('reaction', { messageId: id, reactions, emoji: safeEmoji, role });
  });

  socket.on('seen', () => {
    const now = Date.now();
    const rows = db.prepare('SELECT id FROM messages WHERE room_id = ? AND sender != ? AND seen_at IS NULL AND deleted_at IS NULL').all(roomId, role);
    if (!rows.length) return;
    db.prepare('UPDATE messages SET seen_at = ? WHERE room_id = ? AND sender != ? AND seen_at IS NULL').run(now, roomId, role);
    io.to(roomId).emit('seen', { messageIds: rows.map(r => r.id), seenAt: now, viewerRole: role });
  });

  socket.on('delete-message', messageId => {
    const id = Number(messageId);
    if (!Number.isInteger(id)) return;
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND room_id = ? AND sender = ? AND deleted_at IS NULL').get(id, roomId, role);
    if (!msg) return;
    db.prepare('UPDATE messages SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
    db.prepare('DELETE FROM reactions WHERE message_id = ?').run(id);
    io.to(roomId).emit('message-deleted', { messageId: id });
  });

  socket.on('disconnect', () => {
    socket.to(roomId).emit('typing', { role, typing: false });
    setTimeout(() => {
      const ids = io.sockets.adapter.rooms.get(roomId) || new Set();
      const sameRoleStillOnline = [...ids].some(id => io.sockets.sockets.get(id)?.data?.role === role);
      if (!sameRoleStillOnline) db.prepare('UPDATE profiles SET last_seen = ? WHERE room_id = ? AND role = ?').run(Date.now(), roomId, role);
      emitPresence(roomId);
    }, 80);
  });
});

app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => {
  try { db.pragma('wal_checkpoint(FULL)'); await makeBackup(); } catch {}
  process.exit(0);
});
server.listen(PORT, '0.0.0.0', () => console.log(`Private chat running on http://localhost:${PORT}`));

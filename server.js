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
  join_code_hash TEXT UNIQUE,
  join_code TEXT,
  quick_code_hash TEXT UNIQUE,
  quick_code TEXT,
  creator_token_hash TEXT NOT NULL,
  guest_token_hash TEXT,
  invite_status TEXT NOT NULL DEFAULT 'pending',
  invite_status_at INTEGER,
  contact_removed_by TEXT CHECK(contact_removed_by IN ('creator','guest')),
  contact_removed_at INTEGER,
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
  reply_to_id INTEGER,
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
CREATE TABLE IF NOT EXISTS room_access_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('creator','guest')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS room_device_pins (
  room_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('creator','guest')),
  pin_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(room_id, role),
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_transfer_codes (
  code_hash TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('creator','guest')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_room_access_tokens_room ON room_access_tokens(room_id, role);
CREATE INDEX IF NOT EXISTS idx_device_transfer_codes_expiry ON device_transfer_codes(expires_at);


CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY,username TEXT NOT NULL COLLATE NOCASE UNIQUE,display_name TEXT NOT NULL,owner_token_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS friend_requests (id INTEGER PRIMARY KEY AUTOINCREMENT,sender_id TEXT NOT NULL,receiver_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),created_at INTEGER NOT NULL,responded_at INTEGER,UNIQUE(sender_id,receiver_id),FOREIGN KEY(sender_id) REFERENCES people(id) ON DELETE CASCADE,FOREIGN KEY(receiver_id) REFERENCES people(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS friendships (person_a TEXT NOT NULL,person_b TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(person_a,person_b),FOREIGN KEY(person_a) REFERENCES people(id) ON DELETE CASCADE,FOREIGN KEY(person_b) REFERENCES people(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS people_chats (person_a TEXT NOT NULL,person_b TEXT NOT NULL,room_id TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,PRIMARY KEY(person_a,person_b),FOREIGN KEY(person_a) REFERENCES people(id) ON DELETE CASCADE,FOREIGN KEY(person_b) REFERENCES people(id) ON DELETE CASCADE,FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS people_directory_opt_out (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  opted_out_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_people_username ON people(username);CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id,status);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, id);
`);

// Lightweight migration for older copies of this project.
const messageColumns = db.prepare('PRAGMA table_info(messages)').all().map(c => c.name);
for (const [name, sql] of [
  ['type', `ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text'`],
  ['media_url', `ALTER TABLE messages ADD COLUMN media_url TEXT`],
  ['deleted_at', `ALTER TABLE messages ADD COLUMN deleted_at INTEGER`],
  ['seen_at', `ALTER TABLE messages ADD COLUMN seen_at INTEGER`],
  ['reply_to_id', `ALTER TABLE messages ADD COLUMN reply_to_id INTEGER`]
]) if (!messageColumns.includes(name)) db.exec(sql);


const roomColumns = db.prepare('PRAGMA table_info(rooms)').all().map(c => c.name);
if (!roomColumns.includes('invite_status')) db.exec(`ALTER TABLE rooms ADD COLUMN invite_status TEXT NOT NULL DEFAULT 'pending'`);
if (!roomColumns.includes('join_code_hash')) db.exec(`ALTER TABLE rooms ADD COLUMN join_code_hash TEXT`);
if (!roomColumns.includes('join_code')) db.exec(`ALTER TABLE rooms ADD COLUMN join_code TEXT`);
if (!roomColumns.includes('quick_code_hash')) db.exec(`ALTER TABLE rooms ADD COLUMN quick_code_hash TEXT`);
if (!roomColumns.includes('quick_code')) db.exec(`ALTER TABLE rooms ADD COLUMN quick_code TEXT`);
if (!roomColumns.includes('invite_status_at')) db.exec(`ALTER TABLE rooms ADD COLUMN invite_status_at INTEGER`);
if (!roomColumns.includes('contact_removed_by')) db.exec(`ALTER TABLE rooms ADD COLUMN contact_removed_by TEXT`);
if (!roomColumns.includes('contact_removed_at')) db.exec(`ALTER TABLE rooms ADD COLUMN contact_removed_at INTEGER`);

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
const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJoinCode(){
  let raw='';
  for(let i=0;i<8;i++) raw += JOIN_ALPHABET[crypto.randomInt(0, JOIN_ALPHABET.length)];
  return `${raw.slice(0,4)}-${raw.slice(4)}`;
}
const normalizeJoinCode = value => String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
function makeQuickCode(){return String(crypto.randomInt(0,10000)).padStart(4,'0');}
const normalizeQuickCode=value=>String(value||'').replace(/\D/g,'').slice(0,4);
function availableQuickCode(){for(let i=0;i<80;i++){const code=makeQuickCode();if(!db.prepare('SELECT 1 FROM rooms WHERE quick_code_hash = ?').get(sha256(code)))return code;}return null;}
const DEVICE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeDeviceTransferCode(){
  let raw='';
  for(let i=0;i<10;i++) raw += DEVICE_CODE_ALPHABET[crypto.randomInt(0, DEVICE_CODE_ALPHABET.length)];
  return `${raw.slice(0,5)}-${raw.slice(5)}`;
}
const normalizeDeviceTransferCode = value => String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
function issueAdditionalAccessToken(roomId, role){
  const authToken = token(32);
  db.prepare(`INSERT INTO room_access_tokens(room_id, role, token_hash, created_at, last_used_at)
              VALUES (?, ?, ?, ?, ?)`).run(roomId, role, sha256(authToken), Date.now(), Date.now());
  return authToken;
}

const cleanName = value => String(value || '').trim().slice(0, 24);
const cleanUsername = value => String(value || '').trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,20);

function authenticate(roomId, authToken) {
  if (!roomId || !authToken) return null;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return null;
  const h = sha256(authToken);
  if (h === room.creator_token_hash) return { room, role: 'creator' };
  if (room.guest_token_hash && h === room.guest_token_hash) return { room, role: 'guest' };
  const extra = db.prepare('SELECT role FROM room_access_tokens WHERE room_id = ? AND token_hash = ?').get(roomId, h);
  if (extra) {
    db.prepare('UPDATE room_access_tokens SET last_used_at = ? WHERE room_id = ? AND token_hash = ?').run(Date.now(), roomId, h);
    return { room, role: extra.role };
  }
  return null;
}

function authRequest(req) {
  return authenticate(req.params.roomId, req.header('x-chat-token'));
}
function peopleAuth(req){const raw=req.header('x-people-token');if(!raw)return null;return db.prepare('SELECT id,username,display_name AS displayName FROM people WHERE owner_token_hash=?').get(sha256(raw))||null;}
function friendshipPair(a,b){return a<b?[a,b]:[b,a];}
function areFriends(a,b){const [x,y]=friendshipPair(a,b);return Boolean(db.prepare('SELECT 1 FROM friendships WHERE person_a=? AND person_b=?').get(x,y));}
function publicPerson(id){return db.prepare('SELECT id,username,display_name AS displayName FROM people WHERE id=?').get(id)||null;}
function backfillPeopleDirectory(){
  const rows=db.prepare(`SELECT username, MAX(display_name) AS displayName
                         FROM profiles
                         WHERE username IS NOT NULL AND TRIM(username) != ''
                         GROUP BY LOWER(username)`).all();
  const now=Date.now();
  for(const row of rows){
    const username=cleanUsername(row.username).toLowerCase();
    if(username.length<3) continue;
    if(db.prepare('SELECT 1 FROM people_directory_opt_out WHERE username=? COLLATE NOCASE').get(username)) continue;
    if(db.prepare('SELECT 1 FROM people WHERE username=? COLLATE NOCASE').get(username)) continue;
    const id=token(12);
    db.prepare('INSERT OR IGNORE INTO people(id,username,display_name,owner_token_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id,username,cleanName(row.displayName)||username,`legacy:${sha256(username)}`,now,now);
  }
}
backfillPeopleDirectory();


function contactStatePayload(room, role) {
  const removedBy = room?.contact_removed_by || null;
  return {
    removed: Boolean(removedBy),
    removedBy,
    removedAt: room?.contact_removed_at || null,
    removedByMe: Boolean(removedBy && removedBy === role)
  };
}

function canSendInRoom(room, role) {
  return !room?.contact_removed_by || room.contact_removed_by !== role;
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
    SELECT id, sender, body, type, media_url AS mediaUrl, created_at AS createdAt, deleted_at AS deletedAt, seen_at AS seenAt, reply_to_id AS replyToId
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
  const sourceById = new Map(rows.map(m => [m.id, m]));
  return rows.map(m => {
    const source = m.replyToId ? sourceById.get(m.replyToId) : null;
    const replyTo = source ? {
      id: source.id,
      sender: source.sender,
      type: source.deletedAt ? 'deleted' : source.type,
      body: source.deletedAt ? '' : source.body,
      mediaUrl: source.deletedAt ? null : source.mediaUrl,
      deleted: Boolean(source.deletedAt)
    } : null;
    return { ...m, body: m.deletedAt ? '' : m.body, mediaUrl: m.deletedAt ? null : m.mediaUrl, replyTo, reactions: byId.get(m.id) || [] };
  });
}


function presencePayload(roomId) {
  const socketIds = io.sockets.adapter.rooms.get(roomId) || new Set();
  const onlineRoles = new Set();
  const unavailableRoles = new Set();
  for (const socketId of socketIds) {
    const s = io.sockets.sockets.get(socketId);
    if (!s?.data?.role) continue;
    if (s.data.presenceAvailable === false) unavailableRoles.add(s.data.role);
    else onlineRoles.add(s.data.role);
  }
  const rows = db.prepare('SELECT role, last_seen AS lastSeen, activity_status AS activityStatus, status_at AS statusAt FROM profiles WHERE room_id = ?').all(roomId);
  const lastSeen = { creator: null, guest: null };
  const activity = { creator: null, guest: null };
  const statusAt = { creator: null, guest: null };
  const recentCutoff = Date.now() - 5500;
  for (const row of rows) {
    lastSeen[row.role] = row.lastSeen || null; activity[row.role] = row.activityStatus || null; statusAt[row.role] = row.statusAt || null;
    if (row.lastSeen && row.lastSeen >= recentCutoff && row.activityStatus !== 'emergency' && !unavailableRoles.has(row.role)) onlineRoles.add(row.role);
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



function ensureRoomJoinCode(roomId) {
  const existing = db.prepare('SELECT join_code AS joinCode FROM rooms WHERE id = ?').get(roomId)?.joinCode;
  if (existing) return existing;
  let joinCode = null;
  for (let tries = 0; tries < 20; tries++) {
    const candidate = makeJoinCode();
    const normalized = normalizeJoinCode(candidate);
    if (!db.prepare('SELECT 1 FROM rooms WHERE join_code_hash = ?').get(sha256(normalized))) {
      joinCode = candidate;
      db.prepare('UPDATE rooms SET join_code = ?, join_code_hash = ? WHERE id = ?').run(joinCode, sha256(normalized), roomId);
      break;
    }
  }
  return joinCode;
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


app.post('/api/people/register',(req,res)=>{
  const displayName=cleanName(req.body?.displayName),username=cleanUsername(req.body?.username).toLowerCase();
  if(!displayName||username.length<3)return res.status(400).json({error:'Use a name and a username with at least 3 characters.'});
  db.prepare('DELETE FROM people_directory_opt_out WHERE username=? COLLATE NOCASE').run(username);
  const existing=peopleAuth(req);
  if(existing){
    const taken=db.prepare('SELECT id FROM people WHERE username=? COLLATE NOCASE AND id!=?').get(username,existing.id);
    if(taken)return res.status(409).json({error:'That username is already taken.'});
    db.prepare('UPDATE people SET username=?,display_name=?,updated_at=? WHERE id=?').run(username,displayName,Date.now(),existing.id);
    return res.json({profile:publicPerson(existing.id)});
  }
  const same=db.prepare('SELECT id,owner_token_hash AS ownerHash FROM people WHERE username=? COLLATE NOCASE').get(username);
  const peopleToken=token(32),now=Date.now();
  if(same){
    if(!String(same.ownerHash||'').startsWith('legacy:'))return res.status(409).json({error:'That username is already taken.'});
    db.prepare('UPDATE people SET display_name=?,owner_token_hash=?,updated_at=? WHERE id=?')
      .run(displayName,sha256(peopleToken),now,same.id);
    return res.json({peopleToken,profile:publicPerson(same.id)});
  }
  const id=token(12);
  db.prepare('INSERT INTO people(id,username,display_name,owner_token_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)')
    .run(id,username,displayName,sha256(peopleToken),now,now);
  res.json({peopleToken,profile:publicPerson(id)});
});
app.delete('/api/people/me',(req,res)=>{
  const me=peopleAuth(req);
  if(!me)return res.status(401).json({error:'Not signed into People.'});
  const tx=db.transaction(()=>{
    db.prepare('INSERT OR REPLACE INTO people_directory_opt_out(username,opted_out_at) VALUES(?,?)').run(me.username,Date.now());
    db.prepare('DELETE FROM people WHERE id=?').run(me.id);
  });
  tx();
  res.json({ok:true});
});

app.get('/api/people/me',(req,res)=>{const me=peopleAuth(req);if(!me)return res.status(401).json({error:'Set up your Bloop username first.'});const friends=db.prepare(`SELECT p.id,p.username,p.display_name AS displayName FROM friendships f JOIN people p ON p.id=CASE WHEN f.person_a=? THEN f.person_b ELSE f.person_a END WHERE f.person_a=? OR f.person_b=? ORDER BY p.display_name COLLATE NOCASE`).all(me.id,me.id,me.id);const incoming=db.prepare(`SELECT fr.id,p.id AS personId,p.username,p.display_name AS displayName FROM friend_requests fr JOIN people p ON p.id=fr.sender_id WHERE fr.receiver_id=? AND fr.status='pending' ORDER BY fr.created_at DESC`).all(me.id);const outgoing=db.prepare(`SELECT fr.id,p.id AS personId,p.username,p.display_name AS displayName FROM friend_requests fr JOIN people p ON p.id=fr.receiver_id WHERE fr.sender_id=? AND fr.status='pending' ORDER BY fr.created_at DESC`).all(me.id);res.json({profile:publicPerson(me.id),friends,incoming,outgoing});});
app.get('/api/people/discover',(req,res)=>{
  backfillPeopleDirectory();
  const me=peopleAuth(req);
  if(!me)return res.status(401).json({error:'Set up your Bloop username first.'});
  const q=cleanUsername(req.query.q||'').toLowerCase();
  let rows;
  if(q.length>=2){
    rows=db.prepare(`SELECT id,username,display_name AS displayName,owner_token_hash AS ownerHash
                     FROM people WHERE id!=? AND (username LIKE ? OR display_name LIKE ?)
                     ORDER BY username COLLATE NOCASE LIMIT 100`)
      .all(me.id,`%${q}%`,`%${String(req.query.q||'').trim()}%`);
  }else{
    rows=db.prepare(`SELECT id,username,display_name AS displayName,owner_token_hash AS ownerHash
                     FROM people WHERE id!=? ORDER BY username COLLATE NOCASE LIMIT 100`).all(me.id);
  }
  const people=rows.map(p=>({
    id:p.id,username:p.username,displayName:p.displayName,
    activeDirectory:!String(p.ownerHash||'').startsWith('legacy:'),
    state:areFriends(me.id,p.id)?'friends':
      db.prepare("SELECT 1 FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'").get(me.id,p.id)?'outgoing':
      db.prepare("SELECT 1 FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'").get(p.id,me.id)?'incoming':'none'
  }));
  res.json({people});
});
app.get('/api/people/search',(req,res)=>{const me=peopleAuth(req);if(!me)return res.status(401).json({error:'Set up your Bloop username first.'});const q=cleanUsername(req.query.q||'').toLowerCase();if(q.length<2)return res.json({results:[]});const rows=db.prepare(`SELECT id,username,display_name AS displayName FROM people WHERE id!=? AND (username LIKE ? OR display_name LIKE ?) ORDER BY CASE WHEN username=? THEN 0 ELSE 1 END,username LIMIT 20`).all(me.id,`%${q}%`,`%${String(req.query.q||'').trim()}%`,q);res.json({results:rows.map(p=>({...p,state:areFriends(me.id,p.id)?'friends':db.prepare("SELECT 1 FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'").get(me.id,p.id)?'outgoing':db.prepare("SELECT 1 FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'").get(p.id,me.id)?'incoming':'none'}))});});
app.post('/api/people/:personId/request',(req,res)=>{const me=peopleAuth(req);if(!me)return res.status(401).json({error:'Not signed into People.'});const other=publicPerson(req.params.personId);if(!other)return res.status(404).json({error:'Person not found.'});if(other.id===me.id)return res.status(400).json({error:'That is you.'});if(areFriends(me.id,other.id))return res.json({state:'friends'});const reverse=db.prepare("SELECT id FROM friend_requests WHERE sender_id=? AND receiver_id=? AND status='pending'").get(other.id,me.id);if(reverse){db.prepare("UPDATE friend_requests SET status='accepted',responded_at=? WHERE id=?").run(Date.now(),reverse.id);const [a,b]=friendshipPair(me.id,other.id);db.prepare('INSERT OR IGNORE INTO friendships(person_a,person_b,created_at) VALUES(?,?,?)').run(a,b,Date.now());return res.json({state:'friends'});}db.prepare(`INSERT INTO friend_requests(sender_id,receiver_id,status,created_at) VALUES(?,?,'pending',?) ON CONFLICT(sender_id,receiver_id) DO UPDATE SET status='pending',created_at=excluded.created_at,responded_at=NULL`).run(me.id,other.id,Date.now());res.json({state:'outgoing'});});
app.post('/api/people/requests/:requestId/respond',(req,res)=>{const me=peopleAuth(req);if(!me)return res.status(401).json({error:'Not signed into People.'});const fr=db.prepare("SELECT * FROM friend_requests WHERE id=? AND receiver_id=? AND status='pending'").get(req.params.requestId,me.id);if(!fr)return res.status(404).json({error:'Request not found.'});const action=req.body?.action==='accept'?'accepted':'declined';db.prepare('UPDATE friend_requests SET status=?,responded_at=? WHERE id=?').run(action,Date.now(),fr.id);if(action==='accepted'){const [a,b]=friendshipPair(fr.sender_id,fr.receiver_id);db.prepare('INSERT OR IGNORE INTO friendships(person_a,person_b,created_at) VALUES(?,?,?)').run(a,b,Date.now());}res.json({ok:true,state:action});});
app.post('/api/people/:personId/message',(req,res)=>{const me=peopleAuth(req);if(!me)return res.status(401).json({error:'Not signed into People.'});const other=publicPerson(req.params.personId);if(!other)return res.status(404).json({error:'Person not found.'});const [a,b]=friendshipPair(me.id,other.id);let link=db.prepare('SELECT room_id AS roomId FROM people_chats WHERE person_a=? AND person_b=?').get(a,b),roomId=link?.roomId;if(!roomId){roomId=token(12);const now=Date.now(),joinCode=makeJoinCode(),quickCode=availableQuickCode();db.prepare(`INSERT INTO rooms(id,share_token_hash,join_code_hash,join_code,quick_code_hash,quick_code,creator_token_hash,guest_token_hash,invite_status,invite_status_at,created_at) VALUES(?,?,?,?,?,?,?,?, 'accepted', ?,?)`).run(roomId,sha256(token(24)),sha256(normalizeJoinCode(joinCode)),joinCode,quickCode?sha256(quickCode):null,quickCode,sha256(token(32)),sha256(token(32)),now,now);const creator=publicPerson(a),guest=publicPerson(b);db.prepare(`INSERT INTO profiles(room_id,role,display_name,username) VALUES(?,'creator',?,?),(?,'guest',?,?)`).run(roomId,creator.displayName,creator.username,roomId,guest.displayName,guest.username);db.prepare('INSERT INTO people_chats(person_a,person_b,room_id,created_at) VALUES(?,?,?,?)').run(a,b,roomId,now);}const role=me.id===a?'creator':'guest',authToken=issueAdditionalAccessToken(roomId,role);res.json({roomId,role,authToken});});

app.post('/api/rooms', (_req, res) => {
  const roomId = token(12);
  const shareToken = token(24);
  const creatorToken = token(32);
  let joinCode;
  for(let tries=0;tries<12;tries++){
    const candidate=makeJoinCode();
    if(!db.prepare('SELECT 1 FROM rooms WHERE join_code_hash = ?').get(sha256(normalizeJoinCode(candidate)))){joinCode=candidate;break;}
  }
  if(!joinCode) return res.status(503).json({error:'Could not create a join code. Try again.'});
  const quickCode=availableQuickCode();
  if(!quickCode) return res.status(503).json({error:'Could not create a 4-digit code. Try again.'});
  db.prepare('INSERT INTO rooms (id, share_token_hash, join_code_hash, join_code, quick_code_hash, quick_code, creator_token_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(roomId, sha256(shareToken), sha256(normalizeJoinCode(joinCode)), joinCode, sha256(quickCode), quickCode, sha256(creatorToken), Date.now());
  db.prepare(`INSERT OR IGNORE INTO profiles (room_id, role, display_name) VALUES (?, 'creator', 'You')`).run(roomId);
  res.json({ roomId, shareToken, creatorToken, joinCode, quickCode });
});

app.post('/api/join-code', (req,res)=>{
  const raw=String(req.body?.code||'').trim(),quick=normalizeQuickCode(raw),normalized=normalizeJoinCode(raw);let room=null;
  if(/^\d{4}$/.test(raw.replace(/\s/g,''))) room=db.prepare('SELECT * FROM rooms WHERE quick_code_hash=?').get(sha256(quick));
  else if(normalized.length===8) room=db.prepare('SELECT * FROM rooms WHERE join_code_hash=?').get(sha256(normalized));
  else return res.status(400).json({error:'Enter a 4-digit Bloop code.'});
  if(!room)return res.status(404).json({error:'That Bloop code was not found.'});
  if(room.invite_status==='declined')return res.status(410).json({error:'This invite was declined.'});
  if(room.guest_token_hash)return res.status(403).json({error:'This chat already has its two people.'});
  const guestToken=token(32);const result=db.prepare(`UPDATE rooms SET guest_token_hash=?,invite_status='accepted',invite_status_at=? WHERE id=? AND guest_token_hash IS NULL AND invite_status!='declined'`).run(sha256(guestToken),Date.now(),room.id);
  if(!result.changes)return res.status(403).json({error:'This chat already has its two people.'});
  db.prepare(`INSERT OR IGNORE INTO profiles(room_id,role,display_name) VALUES(?,'guest','Friend')`).run(room.id);
  res.json({roomId:room.id,role:'guest',authToken:guestToken});
});
app.post('/api/rooms/:roomId/quick-code',(req,res)=>{
  const auth=authRequest(req);if(!auth)return res.status(401).json({error:'Not authorized.'});if(auth.role!=='creator')return res.status(403).json({error:'Only the person who made the chat can change its quick code.'});
  const code=normalizeQuickCode(req.body?.code);if(!/^\d{4}$/.test(code))return res.status(400).json({error:'Use exactly 4 digits.'});
  if(db.prepare('SELECT id FROM rooms WHERE quick_code_hash=? AND id!=?').get(sha256(code),req.params.roomId))return res.status(409).json({error:'That 4-digit code is already being used. Pick another.'});
  db.prepare('UPDATE rooms SET quick_code_hash=?,quick_code=? WHERE id=?').run(sha256(code),code,req.params.roomId);res.json({quickCode:code});
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



app.post('/api/rooms/:roomId/device-pin', (req, res) => {
  if (appLocked()) return res.status(423).json({ error: 'Bloop is locked.' });
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not allowed.' });
  const pin = String(req.body?.pin || '').trim();
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'Use a 4-digit PIN.' });
  db.prepare(`INSERT INTO room_device_pins(room_id, role, pin_hash, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(room_id, role) DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = excluded.updated_at`)
    .run(req.params.roomId, auth.role, sha256(pin), Date.now());
  res.json({ ok: true });
});

app.post('/api/continue-chat', (req, res) => {
  if (appLocked()) return res.status(423).json({ error: 'Bloop is locked.' });
  const rawCode=String(req.body?.code||'').trim(),normalized=normalizeJoinCode(rawCode),quick=normalizeQuickCode(rawCode);
  const pin=String(req.body?.pin||'').trim();if(!/^\d{4}$/.test(pin))return res.status(400).json({error:'Enter your 4-digit device PIN.'});
  let room=null;if(/^\d{4}$/.test(rawCode.replace(/\s/g,'')))room=db.prepare('SELECT * FROM rooms WHERE quick_code_hash=?').get(sha256(quick));else if(normalized.length===8)room=db.prepare('SELECT * FROM rooms WHERE join_code_hash=?').get(sha256(normalized));else return res.status(400).json({error:'Enter the 4-digit chat code.'});
  if (!room || room.invite_status !== 'accepted' || !room.guest_token_hash)
    return res.status(404).json({ error: 'That existing chat was not found.' });
  const access = db.prepare(`SELECT role FROM room_device_pins WHERE room_id = ? AND pin_hash = ? ORDER BY CASE role WHEN 'guest' THEN 0 ELSE 1 END LIMIT 1`)
    .get(room.id, sha256(pin));
  if (!access) return res.status(403).json({ error: 'That PIN does not match this chat.' });
  const authToken = issueAdditionalAccessToken(room.id, access.role);
  res.json({ roomId: room.id, role: access.role, authToken });
});

app.post('/api/rooms/:roomId/device-transfer-code', (req, res) => {
  if (appLocked()) return res.status(423).json({ error: 'Bloop is locked.' });
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not allowed.' });

  // Remove expired/old unused codes for this room+role, then issue a fresh one.
  const now = Date.now();
  db.prepare('DELETE FROM device_transfer_codes WHERE expires_at < ? OR used_at IS NOT NULL').run(now);
  db.prepare('DELETE FROM device_transfer_codes WHERE room_id = ? AND role = ?').run(req.params.roomId, auth.role);

  let code = null;
  for (let tries = 0; tries < 20; tries++) {
    const candidate = makeDeviceTransferCode();
    const hash = sha256(normalizeDeviceTransferCode(candidate));
    const exists = db.prepare('SELECT 1 FROM device_transfer_codes WHERE code_hash = ?').get(hash);
    if (!exists) { code = candidate; break; }
  }
  if (!code) return res.status(500).json({ error: 'Could not create a device code.' });

  const expiresAt = now + 10 * 60 * 1000;
  db.prepare(`INSERT INTO device_transfer_codes(code_hash, room_id, role, created_at, expires_at)
              VALUES (?, ?, ?, ?, ?)`)
    .run(sha256(normalizeDeviceTransferCode(code)), req.params.roomId, auth.role, now, expiresAt);

  res.json({ code, expiresAt, roomId: req.params.roomId, role: auth.role });
});

app.post('/api/device-transfer/redeem', (req, res) => {
  if (appLocked()) return res.status(423).json({ error: 'Bloop is locked.' });
  const normalized = normalizeDeviceTransferCode(req.body?.code);
  if (normalized.length !== 10) return res.status(400).json({ error: 'Enter the full device code.' });

  const now = Date.now();
  const row = db.prepare(`SELECT code_hash AS codeHash, room_id AS roomId, role, expires_at AS expiresAt, used_at AS usedAt
                          FROM device_transfer_codes WHERE code_hash = ?`)
    .get(sha256(normalized));
  if (!row) return res.status(404).json({ error: 'That device code is not valid.' });
  if (row.usedAt) return res.status(410).json({ error: 'That device code was already used.' });
  if (row.expiresAt < now) {
    db.prepare('DELETE FROM device_transfer_codes WHERE code_hash = ?').run(row.codeHash);
    return res.status(410).json({ error: 'That device code expired. Make a new one on your other device.' });
  }

  const authToken = issueAdditionalAccessToken(row.roomId, row.role);
  db.prepare('UPDATE device_transfer_codes SET used_at = ? WHERE code_hash = ?').run(now, row.codeHash);
  res.json({ roomId: row.roomId, role: row.role, authToken });
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
  const liveRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  const joinCode = liveRoom?.quick_code || liveRoom?.join_code || ensureRoomJoinCode(req.params.roomId);
  res.json({ role: auth.role, messages: serializeMessages(req.params.roomId), profiles: getProfiles(req.params.roomId), presence: presencePayload(req.params.roomId), unreadCount, inviteStatus: auth.room.invite_status || 'pending', inviteStatusAt: auth.room.invite_status_at || null, joinCode, contactState: contactStatePayload(liveRoom, auth.role) });
});


app.post('/api/rooms/:roomId/contact/remove', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const latest = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!latest) return res.status(404).json({ error: 'Chat not found.' });
  if (latest.contact_removed_by && latest.contact_removed_by !== auth.role) {
    return res.status(409).json({ error: 'The other person already removed this chat.' });
  }
  const now = Date.now();
  db.prepare('UPDATE rooms SET contact_removed_by = ?, contact_removed_at = ? WHERE id = ?')
    .run(auth.role, now, req.params.roomId);
  const payload = { removed: true, removedBy: auth.role, removedAt: now };
  io.to(req.params.roomId).emit('contact-state', payload);
  res.json({ ...payload, removedByMe: true });
});

app.post('/api/rooms/:roomId/contact/restore', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const latest = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!latest) return res.status(404).json({ error: 'Chat not found.' });
  if (!latest.contact_removed_by) return res.json({ removed: false, removedBy: null, removedAt: null, removedByMe: false });
  if (latest.contact_removed_by !== auth.role) return res.status(403).json({ error: 'Only the person who removed the chat can restore it.' });
  db.prepare('UPDATE rooms SET contact_removed_by = NULL, contact_removed_at = NULL WHERE id = ?').run(req.params.roomId);
  const payload = { removed: false, removedBy: null, removedAt: null };
  io.to(req.params.roomId).emit('contact-state', payload);
  res.json({ ...payload, removedByMe: false });
});

app.delete('/api/rooms/:roomId/contact', (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const latest = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!latest) return res.status(404).json({ error: 'Chat not found.' });
  if (latest.contact_removed_by !== auth.role) return res.status(403).json({ error: 'Only the person who removed the chat can permanently delete it.' });

  io.to(req.params.roomId).emit('contact-deleted', { roomId: req.params.roomId });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.roomId);
  res.json({ ok: true });

  setTimeout(() => {
    const ids = [...(io.sockets.adapter.rooms.get(req.params.roomId) || [])];
    for (const id of ids) io.sockets.sockets.get(id)?.disconnect(true);
  }, 40);
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
  if (!['active','blurred','emergency','recording-audio','taking-photo','typing'].includes(raw)) return res.status(400).json({ error: 'Invalid status.' });
  const stored = raw === 'active' ? null : raw;
  const now = Date.now();
  db.prepare('UPDATE profiles SET activity_status = ?, status_at = ? WHERE room_id = ? AND role = ?').run(stored, now, req.params.roomId, auth.role);
  emitPresence(req.params.roomId);
  res.json({ ok: true, status: raw, statusAt: now });
});

app.post('/api/rooms/:roomId/upload/:kind', express.raw({ type: '*/*', limit: '8mb' }), (req, res) => {
  const auth = authRequest(req);
  if (!auth) return res.status(401).json({ error: 'Not authorized.' });
  const latestRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!canSendInRoom(latestRoom, auth.role)) return res.status(409).json({ error: 'Restore this chat before sending.' });
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
  const rawReplyId = Number(req.header('x-reply-to') || 0);
  const replySource = rawReplyId ? db.prepare('SELECT id, sender, body, type, media_url AS mediaUrl, deleted_at AS deletedAt FROM messages WHERE id = ? AND room_id = ?').get(rawReplyId, req.params.roomId) : null;
  const replyToId = replySource ? rawReplyId : null;
  const info = db.prepare('INSERT INTO messages (room_id, sender, body, type, media_url, created_at, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.roomId, auth.role, '', type, url, createdAt, replyToId);
  const replyTo = replySource ? { id: replySource.id, sender: replySource.sender, type: replySource.deletedAt ? 'deleted' : replySource.type, body: replySource.deletedAt ? '' : replySource.body, mediaUrl: replySource.deletedAt ? null : replySource.mediaUrl, deleted: Boolean(replySource.deletedAt) } : null;
  const msg = { id: Number(info.lastInsertRowid), sender: auth.role, body: '', type, mediaUrl: url, createdAt, deletedAt: null, seenAt: null, replyToId, replyTo, reactions: [] };
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
  socket.data.presenceAvailable = true;
  next();
});

io.on('connection', socket => {
  const { roomId, role } = socket.data;
  socket.join(roomId);
  db.prepare('UPDATE profiles SET last_seen = ?, activity_status = NULL, status_at = ? WHERE room_id = ? AND role = ?').run(Date.now(), Date.now(), roomId, role);
  emitPresence(roomId);

  socket.on('presence-away', () => {
    socket.data.presenceAvailable = false;
    db.prepare(`UPDATE profiles SET last_seen = ?, activity_status = CASE WHEN activity_status = 'emergency' THEN activity_status ELSE NULL END, status_at = ? WHERE room_id = ? AND role = ?`).run(Date.now(), Date.now(), roomId, role);
    emitPresence(roomId);
  });
  socket.on('presence-back', () => {
    socket.data.presenceAvailable = true;
    db.prepare('UPDATE profiles SET last_seen = ?, status_at = ? WHERE room_id = ? AND role = ?').run(Date.now(), Date.now(), roomId, role);
    emitPresence(roomId);
  });

  socket.on('typing', value => {
    const typing = Boolean(value);
    const now = Date.now();
    db.prepare('UPDATE profiles SET activity_status = ?, status_at = ?, last_seen = ? WHERE room_id = ? AND role = ?')
      .run(typing ? 'typing' : null, now, now, roomId, role);
    socket.to(roomId).emit('typing', { role, typing });
    emitPresence(roomId);
  });

  socket.on('activity-status', (value, ack) => {
    const raw = String(value || 'active');
    if (!['active','blurred','emergency','recording-audio','taking-photo','typing'].includes(raw)) { if (typeof ack === 'function') ack({ ok: false }); return; }
    const stored = raw === 'active' ? null : raw;
    const now = Date.now();
    db.prepare('UPDATE profiles SET activity_status = ?, status_at = ? WHERE room_id = ? AND role = ?').run(stored, now, roomId, role);
    emitPresence(roomId);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('message', raw => {
    const payload = typeof raw === 'string' ? { body: raw, replyToId: null } : (raw && typeof raw === 'object' ? raw : null);
    if (!payload || typeof payload.body !== 'string') return;
    const latestRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!canSendInRoom(latestRoom, role)) {
      socket.emit('send-blocked', { reason: 'removed-by-you' });
      return;
    }
    const body = payload.body.trim().slice(0, 2000);
    if (!body) return;
    const createdAt = Date.now();
    const rawReplyId = Number(payload.replyToId || 0);
    const replySource = rawReplyId ? db.prepare('SELECT id, sender, body, type, media_url AS mediaUrl, deleted_at AS deletedAt FROM messages WHERE id = ? AND room_id = ?').get(rawReplyId, roomId) : null;
    const replyToId = replySource ? rawReplyId : null;
    const info = db.prepare(`INSERT INTO messages (room_id, sender, body, type, created_at, reply_to_id) VALUES (?, ?, ?, 'text', ?, ?)`)
      .run(roomId, role, body, createdAt, replyToId);
    const replyTo = replySource ? { id: replySource.id, sender: replySource.sender, type: replySource.deletedAt ? 'deleted' : replySource.type, body: replySource.deletedAt ? '' : replySource.body, mediaUrl: replySource.deletedAt ? null : replySource.mediaUrl, deleted: Boolean(replySource.deletedAt) } : null;
    socket.to(roomId).emit('typing', { role, typing: false });
    io.to(roomId).emit('message', { id: Number(info.lastInsertRowid), sender: role, body, type: 'text', mediaUrl: null, createdAt, deletedAt: null, seenAt: null, replyToId, replyTo, reactions: [] });
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
      if (!sameRoleStillOnline) db.prepare(`UPDATE profiles SET last_seen = ?, activity_status = CASE WHEN activity_status = 'typing' THEN NULL ELSE activity_status END WHERE room_id = ? AND role = ?`).run(Date.now(), roomId, role);
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

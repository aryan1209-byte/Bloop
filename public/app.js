const $ = id => document.getElementById(id);
const views = ['landing','share','chat','error'];
function show(id){ views.forEach(v => $(v).classList.toggle('hidden', v !== id)); }


const onboardingVersion = 'justtwo:onboarding:v1';
let onboardingStep = 0;
function renderOnboarding(){
  document.querySelectorAll('.onboardingStep').forEach((el,i) => el.classList.toggle('hidden', i !== onboardingStep));
  const bar = $('onboardingProgress');
  if (bar) bar.style.width = `${((onboardingStep + 1) / 3) * 100}%`;
}
function maybeShowOnboarding(){
  onboardingStep = 0;
  renderOnboarding();
  $('onboarding').classList.remove('hidden');
}

document.querySelectorAll('.onboardingNext').forEach(btn => btn.addEventListener('click', () => {
  onboardingStep = Math.min(2, onboardingStep + 1);
  renderOnboarding();
}));
$('finishOnboarding').addEventListener('click', () => {
  $('onboarding').classList.add('hidden');
});
maybeShowOnboarding();

const params = new URLSearchParams(location.search);
const roomId = params.get('room');
const shareToken = params.get('invite');
let currentRoom = roomId, authToken = null, myRole = null, socket = null;
let profiles = { creator:{displayName:'You',avatarUrl:null}, guest:{displayName:'Friend',avatarUrl:null} };
let recorder = null, recordedChunks = [], recordTimer = null, recordStarted = 0;
let lastPresence = {}, typingTimer = null, sentTyping = false, otherTyping = false;
const storageKey = id => `justtwo:${id}:auth`;
const roleKey = id => `justtwo:${id}:role`;
const lastRoomKey = 'justtwo:lastRoom';
const emojis = ['😂','❤️','😭','🔥','👍','👀','✨','💀','😎','🥹','🤝','🎾','🍕','🚀','😴','🤨'];
const reactionChoices = ['❤️','😂','😭','🔥','👍','👀'];

function avatarFallback(role){
  const name = profiles[role]?.displayName || (role === myRole ? 'You' : 'Friend');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#191919"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${name.trim().charAt(0).toUpperCase() || '?'}</text></svg>`)}`;
}
function setAvatar(img, role){ img.src = profiles[role]?.avatarUrl || avatarFallback(role); }
function refreshHeader(){
  const other = myRole === 'creator' ? 'guest' : 'creator';
  setAvatar($('themAvatarTop'), other);
  $('chatPartnerName').textContent = profiles[other]?.displayName || 'Friend';
  setAvatar($('profileAvatar'), myRole);
  $('displayName').value = profiles[myRole]?.displayName || '';
}

$('createBtn').onclick = async () => {
  const r = await fetch('/api/rooms', { method:'POST' }); const data = await r.json();
  currentRoom = data.roomId; authToken = data.creatorToken; myRole = 'creator';
  localStorage.setItem(storageKey(currentRoom), authToken); localStorage.setItem(roleKey(currentRoom), myRole); localStorage.setItem(lastRoomKey, currentRoom);
  $('shareLink').value = `${location.origin}/?room=${encodeURIComponent(currentRoom)}&invite=${encodeURIComponent(data.shareToken)}`;
  show('share');
};
$('copyBtn').onclick = async () => { await navigator.clipboard.writeText($('shareLink').value); $('copyBtn').textContent='Copied ✓'; setTimeout(()=> $('copyBtn').textContent='Copy',1200); };
$('enterBtn').onclick = () => openChat();
function fail(message){ $('errorText').textContent=message; show('error'); }

async function joinFromLink(){
  const existingToken = localStorage.getItem(storageKey(roomId));
  const r = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({shareToken,existingToken}) });
  const data = await r.json(); if (!r.ok) return fail(data.error || 'Could not join.');
  currentRoom=roomId; authToken=data.authToken; myRole=data.role;
  localStorage.setItem(storageKey(currentRoom),authToken); localStorage.setItem(roleKey(currentRoom),myRole); localStorage.setItem(lastRoomKey,currentRoom);
  history.replaceState({},'',`/chat/${currentRoom}`); openChat();
}
async function resumeRoom(id){ currentRoom=id; authToken=localStorage.getItem(storageKey(id)); myRole=localStorage.getItem(roleKey(id)); if(!authToken)return fail('This browser does not have access to that private chat.'); openChat(); }
async function openChat(){
  if(!currentRoom||!authToken)return fail('Missing chat access.');
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/messages`,{headers:{'x-chat-token':authToken}}); const data=await r.json();
  if(!r.ok)return fail(data.error||'Could not open chat.');
  myRole=data.role; profiles=data.profiles||profiles; localStorage.setItem(lastRoomKey,currentRoom); refreshHeader();
  const box=$('messages'); box.innerHTML=''; data.messages.forEach(addMessage); if(!data.messages.length) box.innerHTML='<div class="empty"><b>It’s quiet in here 👀</b><span>Send the first message.</span></div>';
  show('chat'); connectSocket(); scrollBottom();
}
function connectSocket(){
  socket?.disconnect(); socket=io({auth:{roomId:currentRoom,authToken}});
  socket.on('message',msg=>{ clearEmpty(); addMessage(msg); scrollBottom(); });
  socket.on('presence',data=>{ lastPresence=data||{}; updatePresence(lastPresence); });
  socket.on('typing',data=>{
    const other=myRole==='creator'?'guest':'creator';
    if(data?.role!==other)return;
    otherTyping=Boolean(data.typing);
    updatePresence(lastPresence);
  });
  socket.on('reaction',({messageId,reactions})=>updateReactions(messageId,reactions));
  socket.on('message-deleted',({messageId})=>markDeleted(messageId));
  socket.on('profile',data=>{ profiles[data.role]={displayName:data.displayName,avatarUrl:data.avatarUrl}; refreshHeader(); document.querySelectorAll(`[data-sender="${data.role}"] .messageAvatar`).forEach(img=>setAvatar(img,data.role)); });
  socket.on('emergency-lock',()=>showEmergencyLock());
  socket.on('connect_error',err=>{ if(err?.message==='app_locked') showEmergencyLock(); else $('presence').textContent='connection lost'; });
}

function formatLastSeen(ts){
  if(!ts) return 'offline';
  const d=new Date(ts), now=new Date();
  const sameDay=d.toDateString()===now.toDateString();
  const yesterday=new Date(now); yesterday.setDate(now.getDate()-1);
  const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  if(sameDay) return `last seen today at ${time}`;
  if(d.toDateString()===yesterday.toDateString()) return `last seen yesterday at ${time}`;
  return `last seen ${d.toLocaleDateString([],{month:'short',day:'numeric'})} at ${time}`;
}
function updatePresence(data={}){
  const other=myRole==='creator'?'guest':'creator';
  const online=new Set(data.online||[]);
  const presence=$('presence');
  const nextText=(otherTyping && online.has(other))
    ? `${profiles[other]?.displayName || 'This person'} is typing…`
    : (online.has(other)?'online':formatLastSeen(data.lastSeen?.[other]));
  if(presence.textContent!==nextText){
    presence.textContent=nextText;
    presence.classList.remove('statusPulse');
    void presence.offsetWidth;
    presence.classList.add('statusPulse');
  }
}

function setTyping(isTyping){
  if(!socket?.connected)return;
  if(sentTyping!==isTyping){
    sentTyping=isTyping;
    socket.emit('typing',isTyping);
  }
  clearTimeout(typingTimer);
  if(isTyping) typingTimer=setTimeout(()=>setTyping(false),1400);
}

function clearEmpty(){ if($('messages').querySelector('.empty')) $('messages').innerHTML=''; }

function addMessage(msg){
  const row=document.createElement('div'); row.className=`messageRow ${msg.sender===myRole?'mine':'theirs'}`; row.dataset.id=msg.id; row.dataset.sender=msg.sender;
  const avatar=document.createElement('img'); avatar.className='avatar messageAvatar'; avatar.alt=''; setAvatar(avatar,msg.sender);
  const wrap=document.createElement('div'); wrap.className='messageWrap';
  const bubble=document.createElement('div'); bubble.className='msg';
  if(msg.deletedAt){ bubble.classList.add('deleted'); bubble.textContent='Message deleted'; }
  else if(msg.type==='image'){ const img=document.createElement('img'); img.className='messageImage'; img.src=msg.mediaUrl; img.alt='Shared image'; img.loading='lazy'; bubble.append(img); }
  else if(msg.type==='audio'){ const audio=document.createElement('audio'); audio.controls=true; audio.preload='metadata'; audio.src=msg.mediaUrl; bubble.append(audio); }
  else { const text=document.createElement('span'); text.textContent=msg.body; bubble.append(text); }
  const meta=document.createElement('div'); meta.className='meta'; meta.textContent=new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const actions=document.createElement('div'); actions.className='msgActions';
  if(!msg.deletedAt){
    const react=document.createElement('button'); react.type='button'; react.title='React'; react.textContent='♡'; react.onclick=e=>openReactionMenu(e.currentTarget,msg.id); actions.append(react);
    if(msg.sender===myRole){ const del=document.createElement('button'); del.type='button'; del.title='Delete'; del.textContent='⌫'; del.onclick=()=>{ if(confirm('Delete this message?')) socket?.emit('delete-message',msg.id); }; actions.append(del); }
  }
  const reactionBar=document.createElement('div'); reactionBar.className='reactions';
  wrap.append(actions,bubble,reactionBar,meta); row.append(avatar,wrap); $('messages').append(row); updateReactions(msg.id,msg.reactions||[]);
}
function markDeleted(id){ const row=document.querySelector(`.messageRow[data-id="${id}"]`); if(!row)return; const bubble=row.querySelector('.msg'); bubble.className='msg deleted'; bubble.textContent='Message deleted'; row.querySelector('.msgActions').innerHTML=''; row.querySelector('.reactions').innerHTML=''; }
function updateReactions(id,reactions){ const bar=document.querySelector(`.messageRow[data-id="${id}"] .reactions`); if(!bar)return; bar.innerHTML=''; const groups=new Map(); reactions.forEach(r=>groups.set(r.emoji,(groups.get(r.emoji)||0)+1)); groups.forEach((count,emoji)=>{const b=document.createElement('button');b.type='button';b.textContent=`${emoji}${count>1?' '+count:''}`;b.onclick=()=>socket?.emit('react',{messageId:id,emoji});bar.append(b);}); }
function openReactionMenu(target,messageId){
  document.querySelector('.reactionMenu')?.remove(); const menu=document.createElement('div'); menu.className='reactionMenu';
  reactionChoices.forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=()=>{socket?.emit('react',{messageId,emoji});menu.remove();};menu.append(b);});
  target.parentElement.append(menu); setTimeout(()=>document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==target)menu.remove();},{once:true}),0);
}
function scrollBottom(){ $('messages').scrollTop=$('messages').scrollHeight; }

$('form').addEventListener('submit',e=>{e.preventDefault();const value=$('input').value.trim();if(!value||!socket?.connected)return;setTyping(false);socket.emit('message',value);$('input').value='';$('input').style.height='auto';$('emojiTray').classList.add('hidden');});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit();}});
$('input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,130)+'px';setTyping(Boolean(e.target.value.trim()));});
$('input').addEventListener('blur',()=>setTyping(false));

emojis.forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=()=>{$('input').value+=emoji;$('input').focus();setTyping(true);};$('emojiTray').append(b);});
$('emojiBtn').onclick=()=> $('emojiTray').classList.toggle('hidden');
$('imageBtn').onclick=()=> $('imageInput').click();
$('imageInput').onchange=async()=>{const file=$('imageInput').files[0];if(file)await uploadMedia('image',file);$('imageInput').value='';};
async function uploadMedia(kind,blob){
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/${kind}`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':blob.type||'application/octet-stream'},body:blob});
  const data=await r.json().catch(()=>({})); if(!r.ok) alert(data.error||'Upload failed.');
}

$('voiceBtn').onclick=async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return alert('Voice recording is not supported in this browser.');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true}); recordedChunks=[];
    const preferred=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t)); recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);
    recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);}; recorder.onstop=()=>stream.getTracks().forEach(t=>t.stop()); recorder.start();
    recordStarted=Date.now(); $('recordingBar').classList.remove('hidden'); $('form').classList.add('recording');
    recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStarted)/1000);$('recordTime').textContent=`Recording ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},250);
  }catch{ alert('Microphone permission is needed for voice notes.'); }
};
function stopRecording(){ if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(recordTimer);$('recordingBar').classList.add('hidden');$('form').classList.remove('recording'); }
$('cancelRecord').onclick=()=>{stopRecording();recordedChunks=[];};
$('sendRecord').onclick=async()=>{if(!recorder)return;const type=recorder.mimeType||'audio/webm';stopRecording();await new Promise(r=>setTimeout(r,80));const blob=new Blob(recordedChunks,{type});recordedChunks=[];if(blob.size)await uploadMedia('audio',blob);};

$('profileBtn').onclick=()=>{refreshHeader();$('profileDialog').showModal();};
$('avatarPick').onclick=()=> $('avatarInput').click();
$('avatarInput').onchange=async()=>{const file=$('avatarInput').files[0];if(!file)return;const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/avatar`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':file.type},body:file});const data=await r.json();if(!r.ok)return alert(data.error||'Could not upload photo.');profiles[myRole]=data;refreshHeader();$('avatarInput').value='';};
$('saveProfile').onclick=async()=>{const displayName=$('displayName').value.trim();const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/profile`,{method:'PATCH',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({displayName})});const data=await r.json();if(!r.ok)return alert(data.error||'Could not save profile.');profiles[myRole]=data;refreshHeader();$('profileDialog').close();};


async function setupContinueCard(){
  const id=localStorage.getItem(lastRoomKey);
  if(!id)return;
  const token=localStorage.getItem(storageKey(id));
  if(!token)return;
  try{
    const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/messages`,{headers:{'x-chat-token':token}});
    if(!r.ok)return;
    const data=await r.json();
    const role=data.role||localStorage.getItem(roleKey(id));
    const roomProfiles=data.profiles||{};
    const other=role==='creator'?'guest':'creator';
    const otherProfile=roomProfiles[other]||{displayName:'Friend',avatarUrl:null};
    $('continueName').textContent=otherProfile.displayName||'Friend';
    if(otherProfile.avatarUrl){
      $('continueAvatar').src=otherProfile.avatarUrl;
    }else{
      const initial=(otherProfile.displayName||'Friend').trim().charAt(0).toUpperCase()||'?';
      $('continueAvatar').src=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#191919"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${initial}</text></svg>`)}`;
    }
    $('continueCard').classList.remove('hidden');
    $('continueBtn').onclick=()=>resumeRoom(id);
  }catch{}
}

function showEmergencyLock(){
  socket?.disconnect();
  setTyping(false);
  $('lockScreen').classList.remove('hidden');
  $('unlockPassword').value='';
  $('unlockError').textContent='';
  setTimeout(()=>$('unlockPassword').focus(),50);
}
function hideEmergencyLock(){ $('lockScreen').classList.add('hidden'); }

$('unlockForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const password=$('unlockPassword').value;
  const r=await fetch('/api/emergency/unlock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){ $('unlockError').textContent=data.error||'Could not unlock.'; $('unlockPassword').select(); return; }
  hideEmergencyLock();
  location.reload();
});

$('emergencyBtn').onclick=async()=>{
  if(!currentRoom||!authToken)return;
  const ok=confirm('Emergency lock the entire app? Everyone will be kicked out and nothing can be viewed until the password is entered.');
  if(!ok)return;
  const r=await fetch('/api/emergency/lock',{method:'POST',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({roomId:currentRoom})});
  if(!r.ok){ const data=await r.json().catch(()=>({})); return alert(data.error||'Could not lock the app.'); }
  showEmergencyLock();
};

async function boot(){
  try{
    const status=await fetch('/api/app-status').then(r=>r.json());
    if(status.locked){ showEmergencyLock(); return; }
  }catch{}
  const pathMatch=location.pathname.match(/^\/chat\/([^/]+)$/);
  if(roomId&&shareToken)joinFromLink(); else if(pathMatch)resumeRoom(pathMatch[1]); else { show('landing'); setupContinueCard(); }
}
boot();

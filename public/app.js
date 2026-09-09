const $ = id => document.getElementById(id);
const views = ['landing','share','chat','error'];
const show = id => { views.forEach(v => $(v).classList.toggle('hidden', v !== id)); $('appChrome')?.classList.toggle('hidden', id === 'chat'); };

const onboardingVersion = 'justtwo:onboarding:v4';
const returningAtBoot = localStorage.getItem(onboardingVersion)==='done';
let onboardingStep = 0;
function renderOnboarding(){
  const steps=[...document.querySelectorAll('.onboardingStep')];
  steps.forEach((el,i)=>el.classList.toggle('hidden',i!==onboardingStep));
  $('onboardingProgress').style.width=`${((onboardingStep+1)/steps.length)*100}%`;
  $('manualStepLabel').textContent=`${onboardingStep+1} of ${steps.length}`;
}
function maybeShowOnboarding(){
  if(localStorage.getItem(onboardingVersion)==='done') return;
  onboardingStep=0; renderOnboarding(); $('onboarding').classList.remove('hidden');
}
document.querySelectorAll('.onboardingNext').forEach(btn=>btn.addEventListener('click',()=>{ onboardingStep=Math.min(document.querySelectorAll('.onboardingStep').length-1,onboardingStep+1); renderOnboarding(); }));
$('finishOnboarding').addEventListener('click',()=>{ localStorage.setItem(onboardingVersion,'done'); $('onboarding').classList.add('hidden'); goHome(false); });

const params = new URLSearchParams(location.search);
const inviteRoomId = params.get('room');
const inviteToken = params.get('invite');
let pendingInvite = Boolean(inviteRoomId && inviteToken);
let currentRoom = null, authToken = null, myRole = null, socket = null;
let profiles = { creator:{displayName:'You',avatarUrl:null}, guest:{displayName:'Friend',avatarUrl:null} };
let recorder=null, recordedChunks=[], recordTimer=null, recordStarted=0;
let lastPresence={}, typingTimer=null, sentTyping=false, otherTyping=false;
const storageKey=id=>`justtwo:${id}:auth`;
const roleKey=id=>`justtwo:${id}:role`;
const lastRoomKey='justtwo:lastRoom';
const setupKey=(id,role)=>`justtwo:${id}:${role}:setup-v2`;

const THEMES = [
  {id:'midnight',name:'Midnight',note:'clean dark default'},
  {id:'cursed',name:'JJK · Infinity',note:'Gojo / cursed violet'},
  {id:'wisteria',name:'KNY · Water Night',note:'Giyu / deep teal'},
  {id:'tokyo',name:'Tokyo Neon',note:'rain + neon signs'},
  {id:'sakura',name:'Sakura After Dark',note:'muted pink night'},
  {id:'cyber',name:'Cyber Alley',note:'electric blue shadows'},
  {id:'aurora',name:'Aurora',note:'green-blue night'},
  {id:'storm',name:'Storm',note:'charcoal + lightning'},
  {id:'mono',name:'Monochrome',note:'ink black + silver'}
];
const BUBBLE_COLORS=[
  {id:'red',value:'#ef4b4b',label:'Red'},
  {id:'green',value:'#25a56a',label:'Green'},
  {id:'blue',value:'#4e7cf0',label:'Blue'},
  {id:'purple',value:'#7b5ce1',label:'Purple'},
  {id:'orange',value:'#e97838',label:'Orange'},
  {id:'pink',value:'#d9578f',label:'Pink'}
];
const customizationKey='justtwo:appearance:v2';
let appearance={theme:'midnight',bubble:'red',privacy:false};
try{ appearance={...appearance,...JSON.parse(localStorage.getItem(customizationKey)||'{}')}; }catch{}
function applyAppearance(){
  document.documentElement.dataset.theme=appearance.theme;
  const found=BUBBLE_COLORS.find(c=>c.id===appearance.bubble)||BUBBLE_COLORS[0];
  document.documentElement.style.setProperty('--mine-bubble',found.value);
  localStorage.setItem(customizationKey,JSON.stringify(appearance));
  document.querySelectorAll('[data-theme-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.themeChoice===appearance.theme));
  document.querySelectorAll('[data-color-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.colorChoice===appearance.bubble));
  document.body.classList.remove('privacyEnabled');
  ['privacyToggle','dialogPrivacyToggle','setupPrivacyToggle'].forEach(id=>{if($(id))$(id).checked=Boolean(appearance.privacy);});
}
function themeCard(theme){
  const b=document.createElement('button'); b.type='button'; b.className='themeChoice'; b.dataset.themeChoice=theme.id;
  b.innerHTML=`<span class="themeSwatch theme-${theme.id}"></span><span><strong>${theme.name}</strong><small>${theme.note}</small></span>`;
  b.onclick=()=>{appearance.theme=theme.id;applyAppearance();}; return b;
}
function colorDot(color){
  const b=document.createElement('button'); b.type='button'; b.className='colorChoice'; b.dataset.colorChoice=color.id; b.title=color.label; b.setAttribute('aria-label',`${color.label} message colour`); b.style.setProperty('--dot',color.value);
  b.onclick=()=>{appearance.bubble=color.id;applyAppearance();}; return b;
}
function fillAppearanceControls(){
  ['themeGrid','dialogThemeGrid','setupThemeGrid'].forEach(id=>{const el=$(id); if(!el)return; el.innerHTML=''; THEMES.forEach(t=>el.append(themeCard(t)));});
  ['colorChoices','dialogColorChoices','setupColorChoices'].forEach(id=>{const el=$(id); if(!el)return; el.innerHTML=''; BUBBLE_COLORS.forEach(c=>el.append(colorDot(c)));});
  applyAppearance();
}
fillAppearanceControls();
$('shuffleVibe').onclick=()=>{appearance.theme=THEMES[Math.floor(Math.random()*THEMES.length)].id;appearance.bubble=BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)].id;applyAppearance();};
['privacyToggle','dialogPrivacyToggle','setupPrivacyToggle'].forEach(id=>$(id)?.addEventListener('change',e=>{appearance.privacy=e.target.checked;applyAppearance();if(e.target.checked)engagePrivacyShield();}));
const funBits=[
  {type:'mood',text:'quietly chaotic'}, {type:'mood',text:'plot twist pending'}, {type:'mood',text:'certified yap session'},
  {type:'starter',text:'What is the most random thing you thought about today?'}, {type:'starter',text:'Pick one: teleportation or mind reading?'},
  {type:'starter',text:'What tiny thing instantly improves your mood?'}, {type:'starter',text:'What is your current completely unnecessary obsession?'},
  {type:'starter',text:'Send a photo from your camera roll with zero context.'}, {type:'starter',text:'Which fictional world would you survive in for exactly one week?'},
  {type:'chaos',text:'Tiny roast: your typing speed has more confidence than your spelling.'}, {type:'chaos',text:'Tiny roast: I would explain it, but I left my crayons at home.'},
  {type:'chaos',text:'Tiny roast: bold words from someone whose battery is probably at 9%.'}, {type:'chaos',text:'Tiny roast: incredible point. Unfortunately, rejected for dramatic reasons.'},
  {type:'joke',text:'Why did the message cross the chat? It saw you typing and got nervous.'}, {type:'joke',text:'Breaking news: absolutely nothing happened, but we are discussing it anyway.'}
];
let funIndex=0;
$('funBtn').onclick=()=>{funIndex=(funIndex+1+Math.floor(Math.random()*(funBits.length-1)))%funBits.length;const bit=funBits[funIndex];$('funWheel').classList.remove('spin');void $('funWheel').offsetWidth;$('funWheel').classList.add('spin');$('funType').textContent=bit.type.toUpperCase();$('funResult').textContent=bit.text;};

function updateClock(){
  const text=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  $('clock').textContent=text; $('chatClock').textContent=text;
}
updateClock(); setInterval(updateClock,15000);

const emojiData={
  'Recent':['😂','❤️','😭','🔥','👍','🥹','✨','👀','💀','🙏','🤣','😍','😊','🤨','😎','🫶'],
  'Smileys':['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','🙂‍↕️','😏','😒','🙂‍↔️','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣','🤗','🫡','🤔','🫢','🤭','🤫','🤥','😶','🫥','😐','🫤','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👻','💀','☠️','👽','🤖','💩'],
  'People':['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','👃','🧠','🫀','🫁','🦷','👀','👁️','👅','👄'],
  'Hearts':['❤️','🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'],
  'Animals':['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🦎','🦖','🐙','🦑','🦀','🐠','🐟','🐬','🐳','🦈'],
  'Food':['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🥔','🥕','🌽','🌶️','🥐','🍞','🥨','🧀','🥚','🍳','🥞','🧇','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🍜','🍝','🍣','🍙','🍚','🍛','🍦','🍩','🍪','🎂','🍰','🍫','🍿','🧋'],
  'Stuff':['⚽','🏀','🏈','⚾','🎾','🏐','🏓','🏸','🥊','🎮','🕹️','🎲','🧩','🎯','🎸','🎧','🎤','🎬','📱','💻','⌚','📷','💡','📚','✏️','🧸','🎁','🎈','🎉','🎊','✨','🌟','⭐','⚡','🔥','💥','💯','✅','❌','‼️','❓','🚀','🛸','🌙','☀️','🌈']
};
let emojiCategory='Recent';
function renderEmojiCategories(){
  $('emojiCategories').innerHTML=''; Object.keys(emojiData).forEach(name=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.classList.toggle('selected',name===emojiCategory);b.onclick=()=>{emojiCategory=name;$('emojiSearch').value='';renderEmojiCategories();renderEmojiGrid();};$('emojiCategories').append(b);});
}
function renderEmojiGrid(){
  const query=$('emojiSearch').value.trim(); const source=query?Object.values(emojiData).flat():emojiData[emojiCategory];
  $('emojiGrid').innerHTML=''; [...new Set(source)].forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=()=>{$('input').value+=emoji;$('input').focus();setTyping(true);};$('emojiGrid').append(b);});
}
renderEmojiCategories();renderEmojiGrid();
$('emojiSearch').addEventListener('input',renderEmojiGrid);
$('emojiBtn').onclick=()=>{$('emojiTray').classList.toggle('hidden');if(!$('emojiTray').classList.contains('hidden'))$('emojiSearch').focus();};
$('closeEmoji').onclick=()=>$('emojiTray').classList.add('hidden');

const stickerChoices=['😈','💀','🤡','🫵','😭','😂','🙄','🤨','👀','🔥','💅','🗿','🤦','🤓','😤','🥱','😎','🫠','🤝','✨'];
function renderStickers(){
  if(!$('stickerGrid'))return;$('stickerGrid').innerHTML='';
  stickerChoices.forEach(st=>{const b=document.createElement('button');b.type='button';b.className='stickerChoice';b.textContent=st;b.onclick=()=>{if(socket?.connected){socket.emit('message',`::sticker::${st}`);$('mediaTray').classList.add('hidden');}};$('stickerGrid').append(b);});
}
renderStickers();
$('mediaBtn')?.addEventListener('click',()=>{$('mediaTray').classList.toggle('hidden');$('emojiTray').classList.add('hidden');});
$('closeMediaTray')?.addEventListener('click',()=> $('mediaTray').classList.add('hidden'));
$('gifTabBtn')?.addEventListener('click',()=>{$('gifTabBtn').classList.add('selected');$('stickerTabBtn').classList.remove('selected');$('gifPane').classList.remove('hidden');$('stickerPane').classList.add('hidden');});
$('stickerTabBtn')?.addEventListener('click',()=>{$('stickerTabBtn').classList.add('selected');$('gifTabBtn').classList.remove('selected');$('stickerPane').classList.remove('hidden');$('gifPane').classList.add('hidden');});
$('sendGifBtn')?.addEventListener('click',()=>{const url=$('gifUrlInput').value.trim();if(!url||!/^https?:\/\//i.test(url))return alert('Paste a valid GIF link first.');if(socket?.connected){socket.emit('message',url);$('gifUrlInput').value='';$('mediaTray').classList.add('hidden');}});
$('uploadStickerBtn')?.addEventListener('click',()=> $('stickerInput').click());
$('stickerInput')?.addEventListener('change',async()=>{const file=$('stickerInput').files[0];if(file)await uploadMedia('image',file);$('stickerInput').value='';$('mediaTray').classList.add('hidden');});

function avatarFallback(role){
  const name=profiles[role]?.displayName||(role===myRole?'You':'Friend');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#23262b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${(name.trim().charAt(0).toUpperCase()||'?').replace(/[<>&]/g,'')}</text></svg>`)}`;
}
function setAvatar(img,role){ if(img)img.src=profiles[role]?.avatarUrl||avatarFallback(role); }
function refreshHeader(){
  if(!myRole)return; const other=myRole==='creator'?'guest':'creator';
  setAvatar($('themAvatarTop'),other); $('chatPartnerName').textContent=profiles[other]?.displayName||'Friend';
  setAvatar($('profileAvatar'),myRole); $('displayName').value=profiles[myRole]?.displayName||'';
  setAvatar($('setupAvatar'),myRole); $('setupDisplayName').value=profiles[myRole]?.displayName==='You'||profiles[myRole]?.displayName==='Friend'?'':(profiles[myRole]?.displayName||'');
}

async function setupContinueCard(){
  const id=localStorage.getItem(lastRoomKey); $('continueCard').classList.add('hidden');
  if(!id)return; const token=localStorage.getItem(storageKey(id)); if(!token)return;
  try{
    const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/messages`,{headers:{'x-chat-token':token}}); if(!r.ok)return;
    const data=await r.json(); const role=data.role||localStorage.getItem(roleKey(id)); const other=role==='creator'?'guest':'creator'; const p=(data.profiles||{})[other]||{displayName:'Friend',avatarUrl:null};
    $('continueName').textContent=p.displayName||'Friend'; $('continueSub').textContent=data.messages?.length?`${data.messages.length} saved message${data.messages.length===1?'':'s'}`:'No messages yet — say hi.';
    if(p.avatarUrl)$('continueAvatar').src=p.avatarUrl; else {const initial=(p.displayName||'Friend').trim().charAt(0).toUpperCase()||'?';$('continueAvatar').src=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#23262b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${initial}</text></svg>`)}`;}
    $('continueCard').classList.remove('hidden'); $('continueBtn').onclick=()=>resumeRoom(id,true);
  }catch{}
}

function showInviteCard(){ $('inviteCard').classList.toggle('hidden',!pendingInvite); }
async function goHome(replace=true){
  socket?.disconnect(); setTyping(false); show('landing'); showInviteCard(); await setupContinueCard();
  if(replace) history.replaceState({view:'home'},'',pendingInvite?`/?room=${encodeURIComponent(inviteRoomId)}&invite=${encodeURIComponent(inviteToken)}`:'/');
}
$('shareBackBtn').onclick=()=>goHome(); $('errorHomeBtn').onclick=()=>goHome(); $('chatBackBtn').onclick=()=>history.back();

$('createBtn').onclick=async()=>{
  const r=await fetch('/api/rooms',{method:'POST'}); const data=await r.json(); if(!r.ok)return fail(data.error||'Could not create chat.');
  currentRoom=data.roomId;authToken=data.creatorToken;myRole='creator';
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);localStorage.setItem(lastRoomKey,currentRoom);
  $('shareLink').value=`${location.origin}/?room=${encodeURIComponent(currentRoom)}&invite=${encodeURIComponent(data.shareToken)}`; show('share'); history.pushState({view:'share'},'','/');
};
$('copyBtn').onclick=async()=>{await navigator.clipboard.writeText($('shareLink').value);$('copyBtn').textContent='Copied ✓';setTimeout(()=>$('copyBtn').textContent='Copy',1200);};
$('enterBtn').onclick=()=>openChat(true);
$('acceptInviteBtn').onclick=async()=>{
  if(!pendingInvite)return;
  const existingToken=localStorage.getItem(storageKey(inviteRoomId));
  const r=await fetch(`/api/rooms/${encodeURIComponent(inviteRoomId)}/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareToken:inviteToken,existingToken})});
  const data=await r.json(); if(!r.ok)return fail(data.error||'Could not join.');
  currentRoom=inviteRoomId;authToken=data.authToken;myRole=data.role;pendingInvite=false;
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);localStorage.setItem(lastRoomKey,currentRoom);
  history.replaceState({view:'home'},'','/'); await openChat(true);
};
$('declineInviteBtn').onclick=()=>{pendingInvite=false;history.replaceState({view:'home'},'','/');showInviteCard();};
function fail(message){$('errorText').textContent=message;show('error');}
async function resumeRoom(id,pushHistory=true){currentRoom=id;authToken=localStorage.getItem(storageKey(id));myRole=localStorage.getItem(roleKey(id));if(!authToken)return fail('This browser does not have access to that private chat.');await openChat(pushHistory);}
async function openChat(pushHistory=true){
  if(!currentRoom||!authToken)return fail('Missing chat access.');
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/messages`,{headers:{'x-chat-token':authToken}});const data=await r.json();if(!r.ok)return fail(data.error||'Could not open chat.');
  myRole=data.role;profiles=data.profiles||profiles;localStorage.setItem(lastRoomKey,currentRoom);refreshHeader();
  const box=$('messages');box.innerHTML='';data.messages.forEach(addMessage);if(!data.messages.length)box.innerHTML='<div class="empty"><b>It’s quiet in here.</b><span>One of you has to start 😭</span></div>';
  show('chat');connectSocket();scrollBottom();
  if(pushHistory)history.pushState({view:'chat',roomId:currentRoom},'',`/chat/${encodeURIComponent(currentRoom)}`);else history.replaceState({view:'chat',roomId:currentRoom},'',`/chat/${encodeURIComponent(currentRoom)}`);
  maybeShowSetup();
}
function maybeShowSetup(){
  if(!currentRoom||!myRole||localStorage.getItem(setupKey(currentRoom,myRole))==='done')return;
  refreshHeader();applyAppearance();setTimeout(()=>{if(!$('setupDialog').open)$('setupDialog').showModal();},180);
}

function connectSocket(){
  socket?.disconnect();socket=io({auth:{roomId:currentRoom,authToken}});
  socket.on('message',msg=>{clearEmpty();addMessage(msg);scrollBottom();});
  socket.on('presence',data=>{lastPresence=data||{};updatePresence(lastPresence);});
  socket.on('typing',data=>{const other=myRole==='creator'?'guest':'creator';if(data?.role!==other)return;otherTyping=Boolean(data.typing);updatePresence(lastPresence);});
  socket.on('reaction',({messageId,reactions})=>updateReactions(messageId,reactions));
  socket.on('message-deleted',({messageId})=>markDeleted(messageId));
  socket.on('profile',data=>{profiles[data.role]={displayName:data.displayName,avatarUrl:data.avatarUrl};refreshHeader();document.querySelectorAll(`[data-sender="${data.role}"] .messageAvatar`).forEach(img=>setAvatar(img,data.role));});
  socket.on('emergency-lock',()=>showEmergencyLock());
  socket.on('connect_error',err=>{if(err?.message==='app_locked')showEmergencyLock();else $('presence').textContent='connection lost';});
}
function formatLastSeen(ts){if(!ts)return'offline';const d=new Date(ts),now=new Date(),same=d.toDateString()===now.toDateString(),y=new Date(now);y.setDate(now.getDate()-1);const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(same)return`last seen today at ${time}`;if(d.toDateString()===y.toDateString())return`last seen yesterday at ${time}`;return`last seen ${d.toLocaleDateString([],{month:'short',day:'numeric'})} at ${time}`;}
function updatePresence(data={}){const other=myRole==='creator'?'guest':'creator';const online=new Set(data.online||[]);const p=$('presence');const next=(otherTyping&&online.has(other))?'typing…':(online.has(other)?'online':formatLastSeen(data.lastSeen?.[other]));if(p.textContent!==next){p.textContent=next;p.classList.remove('statusPulse');void p.offsetWidth;p.classList.add('statusPulse');}}
function setTyping(value){if(!socket?.connected)return;if(sentTyping!==value){sentTyping=value;socket.emit('typing',value);}clearTimeout(typingTimer);if(value)typingTimer=setTimeout(()=>setTyping(false),1400);}
function clearEmpty(){if($('messages').querySelector('.empty'))$('messages').innerHTML='';}

const reactionChoices=['❤️','😂','😭','🔥','👍','🥹','👀','💀'];
function engagePrivacyShield(){
  $('privacyShield')?.classList.remove('hidden');
  document.body.classList.add('privacyLocked');
}
function releasePrivacyShield(){
  $('privacyShield')?.classList.add('hidden');
  document.body.classList.remove('privacyLocked');
}
let lastShieldTap=0;
function shieldTap(){
  const now=Date.now();
  if(now-lastShieldTap<420){releasePrivacyShield();lastShieldTap=0;}else lastShieldTap=now;
}
$('privacyShield')?.addEventListener('dblclick',releasePrivacyShield);
$('privacyShield')?.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')shieldTap();});
$('privacyShield')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();shieldTap();}});
$('privacyNowBtn')?.addEventListener('click',engagePrivacyShield);
$('chatPrivacyBtn')?.addEventListener('click',engagePrivacyShield);

function addMessage(msg){
  const row=document.createElement('div');row.className=`messageRow ${msg.sender===myRole?'mine':'theirs'}`;row.dataset.id=msg.id;row.dataset.sender=msg.sender;
  const avatar=document.createElement('img');avatar.className='avatar messageAvatar';avatar.alt='';setAvatar(avatar,msg.sender);
  const wrap=document.createElement('div');wrap.className='messageWrap';const bubble=document.createElement('div');bubble.className='msg';
  if(msg.deletedAt){bubble.classList.add('deleted');bubble.textContent='Message deleted';}
  else if(msg.type==='image'){const img=document.createElement('img');img.className='messageImage';img.src=msg.mediaUrl;img.alt='Shared image';img.loading='lazy';bubble.append(img);}
  else if(msg.type==='audio'){const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=msg.mediaUrl;bubble.append(audio);}
  else {if((msg.body||'').startsWith('::sticker::')){bubble.classList.add('stickerMessage');bubble.textContent=msg.body.slice(11);}else{const text=document.createElement('span');text.textContent=msg.body;bubble.append(text);appendLinkPreview(bubble,msg.body);}}
  const meta=document.createElement('div');meta.className='meta';meta.textContent=new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const actions=document.createElement('div');actions.className='msgActions';
  if(!msg.deletedAt){const react=document.createElement('button');react.type='button';react.title='React';react.textContent='♡';react.onclick=e=>openReactionMenu(e.currentTarget,msg.id);actions.append(react);if(msg.sender===myRole){const del=document.createElement('button');del.type='button';del.title='Delete';del.textContent='⌫';del.onclick=()=>{if(confirm('Delete this message?'))socket?.emit('delete-message',msg.id);};actions.append(del);}}
  const reactionBar=document.createElement('div');reactionBar.className='reactions';wrap.append(actions,bubble,reactionBar,meta);row.append(avatar,wrap);$('messages').append(row);updateReactions(msg.id,msg.reactions||[]);
  if(msg.sender!==myRole&&!msg.deletedAt)attachLongPress(bubble,msg.id);
}
function attachLongPress(target,messageId){
  let timer=null,moved=false,startX=0,startY=0;
  target.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;moved=false;startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{if(!moved){navigator.vibrate?.(20);openReactionMenu(target,messageId,true);}},430);});
  target.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-startX)>8||Math.abs(e.clientY-startY)>8){moved=true;clearTimeout(timer);}});
  ['pointerup','pointercancel','pointerleave'].forEach(name=>target.addEventListener(name,()=>clearTimeout(timer)));
  target.addEventListener('contextmenu',e=>{e.preventDefault();openReactionMenu(target,messageId,true);});
}
function markDeleted(id){const row=document.querySelector(`.messageRow[data-id="${id}"]`);if(!row)return;const bubble=row.querySelector('.msg');bubble.className='msg deleted';bubble.textContent='Message deleted';row.querySelector('.msgActions').innerHTML='';row.querySelector('.reactions').innerHTML='';}
function updateReactions(id,reactions){const bar=document.querySelector(`.messageRow[data-id="${id}"] .reactions`);if(!bar)return;bar.innerHTML='';const groups=new Map();reactions.forEach(r=>groups.set(r.emoji,(groups.get(r.emoji)||0)+1));groups.forEach((count,emoji)=>{const b=document.createElement('button');b.type='button';b.textContent=`${emoji}${count>1?' '+count:''}`;b.onclick=()=>socket?.emit('react',{messageId:id,emoji});bar.append(b);});}
function openReactionMenu(target,messageId,longPress=false){
  document.querySelector('.reactionMenu')?.remove();const menu=document.createElement('div');menu.className=`reactionMenu${longPress?' reactionMenuLong':''}`;
  reactionChoices.forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=e=>{e.stopPropagation();socket?.emit('react',{messageId,emoji});menu.remove();};menu.append(b);});
  document.body.append(menu);const rect=target.getBoundingClientRect();const width=Math.min(360,window.innerWidth-20);menu.style.width=`${width}px`;menu.style.left=`${Math.max(10,Math.min(window.innerWidth-width-10,rect.left+rect.width/2-width/2))}px`;menu.style.top=`${Math.max(10,rect.top-64)}px`;
  setTimeout(()=>document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.remove();},{once:true}),0);
}

function appendLinkPreview(bubble,body=''){
  const match=body.match(/https?:\/\/[^\s]+/i); if(!match)return;
  let u;try{u=new URL(match[0]);}catch{return;}
  const host=u.hostname.replace(/^www\./,'');
  if(host==='youtu.be'||host.endsWith('youtube.com')){
    let id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');
    if(!id&&u.pathname.startsWith('/shorts/'))id=u.pathname.split('/')[2];
    if(id){
      const wrap=document.createElement('div');wrap.className='youtubeEmbed';
      wrap.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><a href="${u.href}" target="_blank" rel="noopener">▶ Open on YouTube</a>`;
      bubble.append(wrap);
    }
  } else if(host.endsWith('pinterest.com')||host==='pin.it'){
    const card=document.createElement('a');card.className='linkCard pinterestCard';card.href=u.href;card.target='_blank';card.rel='noopener';card.innerHTML='<span class="linkBadge">P PINTEREST</span><strong>Pinterest Pin</strong><small>Open the Pin in Pinterest</small>';bubble.append(card);
  } else if(/\.gif($|\?)/i.test(u.pathname+u.search)||host.includes('giphy.com')||host.includes('tenor.com')){
    const gif=document.createElement('img');gif.className='gifMessage';gif.src=u.href;gif.alt='GIF';gif.loading='lazy';bubble.append(gif);
  }
}

function scrollBottom(){$('messages').scrollTop=$('messages').scrollHeight;}

$('form').addEventListener('submit',e=>{e.preventDefault();const value=$('input').value.trim();if(!value||!socket?.connected)return;setTyping(false);socket.emit('message',value);$('input').value='';$('input').style.height='auto';$('emojiTray').classList.add('hidden');});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit();}});
$('input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,130)+'px';setTyping(Boolean(e.target.value.trim()));});$('input').addEventListener('blur',()=>setTyping(false));
$('imageBtn').onclick=()=>$('imageInput').click();$('imageInput').onchange=async()=>{const file=$('imageInput').files[0];if(file)await uploadMedia('image',file);$('imageInput').value='';};
async function uploadMedia(kind,blob){const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/${kind}`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':blob.type||'application/octet-stream'},body:blob});const data=await r.json().catch(()=>({}));if(!r.ok)alert(data.error||'Upload failed.');return data;}
$('voiceBtn').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return alert('Voice recording is not supported in this browser.');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedChunks=[];const preferred=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};recorder.onstop=()=>stream.getTracks().forEach(t=>t.stop());recorder.start();recordStarted=Date.now();$('recordingBar').classList.remove('hidden');$('form').classList.add('recording');recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStarted)/1000);$('recordTime').textContent=`Recording ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},250);}catch{alert('Microphone permission is needed for voice notes.');}};
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(recordTimer);$('recordingBar').classList.add('hidden');$('form').classList.remove('recording');}
$('cancelRecord').onclick=()=>{stopRecording();recordedChunks=[];};$('sendRecord').onclick=async()=>{if(!recorder)return;const type=recorder.mimeType||'audio/webm';stopRecording();await new Promise(r=>setTimeout(r,80));const blob=new Blob(recordedChunks,{type});recordedChunks=[];if(blob.size)await uploadMedia('audio',blob);};

async function uploadAvatarFrom(inputId){const file=$(inputId).files[0];if(!file)return null;const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/avatar`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':file.type},body:file});const data=await r.json();if(!r.ok){alert(data.error||'Could not upload photo.');return null;}profiles[myRole]=data;refreshHeader();$(inputId).value='';return data;}
$('profileBtn').onclick=()=>{refreshHeader();applyAppearance();$('profileDialog').showModal();};$('avatarPick').onclick=()=>$('avatarInput').click();$('avatarInput').onchange=()=>uploadAvatarFrom('avatarInput');
$('saveProfile').onclick=async()=>{await saveProfileName($('displayName').value.trim());$('profileDialog').close();};
async function saveProfileName(displayName){const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/profile`,{method:'PATCH',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({displayName})});const data=await r.json();if(!r.ok){alert(data.error||'Could not save profile.');return false;}profiles[myRole]=data;refreshHeader();return true;}
$('setupAvatarPick').onclick=()=>$('setupAvatarInput').click();$('setupAvatarInput').onchange=()=>uploadAvatarFrom('setupAvatarInput');
$('finishSetup').onclick=async()=>{const ok=await saveProfileName($('setupDisplayName').value.trim());if(!ok)return;localStorage.setItem(setupKey(currentRoom,myRole),'done');$('setupDialog').close();};
$('skipSetup').onclick=()=>{localStorage.setItem(setupKey(currentRoom,myRole),'done');$('setupDialog').close();};

function showEmergencyLock(){socket?.disconnect();setTyping(false);$('lockScreen').classList.remove('hidden');$('unlockPassword').value='';$('unlockError').textContent='';setTimeout(()=>$('unlockPassword').focus(),50);}
function hideEmergencyLock(){$('lockScreen').classList.add('hidden');}
$('unlockForm').addEventListener('submit',async e=>{e.preventDefault();const password=$('unlockPassword').value;const r=await fetch('/api/emergency/unlock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});const data=await r.json().catch(()=>({}));if(!r.ok){$('unlockError').textContent=data.error||'Could not unlock.';$('unlockPassword').select();return;}hideEmergencyLock();location.reload();});
async function emergencyLock(){
  let room=currentRoom,token=authToken;
  if(!room||!token){room=localStorage.getItem(lastRoomKey);token=room?localStorage.getItem(storageKey(room)):null;}
  if(!room||!token)return alert('Emergency lock becomes available after this browser has access to a chat.');
  if(!confirm('Lock the entire app now? Everyone will be kicked out until the emergency password is entered.'))return;
  const r=await fetch('/api/emergency/lock',{method:'POST',headers:{'content-type':'application/json','x-chat-token':token},body:JSON.stringify({roomId:room})});if(!r.ok){const data=await r.json().catch(()=>({}));return alert(data.error||'Could not lock the app.');}showEmergencyLock();
}
$('emergencyBtn').onclick=emergencyLock;$('globalEmergencyBtn').onclick=emergencyLock;

window.addEventListener('popstate',async()=>{
  if(location.pathname==='/'||!location.pathname.startsWith('/chat/')){await goHome(false);return;}
  const m=location.pathname.match(/^\/chat\/([^/]+)$/);if(m)await resumeRoom(decodeURIComponent(m[1]),false);
});

async function boot(){
  try{const status=await fetch('/api/app-status').then(r=>r.json());if(status.locked){showEmergencyLock();return;}}catch{}
  applyAppearance();
  const pathMatch=location.pathname.match(/^\/chat\/([^/]+)$/);
  if(pathMatch){currentRoom=decodeURIComponent(pathMatch[1]);authToken=localStorage.getItem(storageKey(currentRoom));myRole=localStorage.getItem(roleKey(currentRoom));if(authToken)await openChat(false);else await goHome(true);}else{history.replaceState({view:'home'},'',location.href);await goHome(false);}
  maybeShowOnboarding();
  if(returningAtBoot) setTimeout(engagePrivacyShield,80);
}
boot();

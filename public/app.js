const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const views = ['landing','share','chat','error'];
const show = id => { views.forEach(v => $(v).classList.toggle('hidden', v !== id)); $('appChrome')?.classList.toggle('hidden', id === 'chat'); };

// v13: full-screen flowing-water backdrop inspired by the supplied reference
function ensureOceanBackdrop(){
  document.querySelector('.oceanBackdrop')?.remove();
  const ocean=document.createElement('div');
  ocean.className='oceanBackdrop oceanBackdropV13';
  ocean.setAttribute('aria-hidden','true');
  ocean.innerHTML=`
    <svg class="waterMap" viewBox="0 0 1600 1100" preserveAspectRatio="xMidYMid slice">
      <rect class="waterBase" width="1600" height="1100"/>

      <g class="waterIslands islandA">
        <path class="waterPlate plate1" d="M-120 40 C90 -40 265 -15 345 90 C427 196 315 270 225 320 C115 383 66 490 -46 454 C-137 425 -183 315 -130 222 C-86 145 -48 95 -120 40Z"/>
        <path class="waterContour contour1" d="M-120 40 C90 -40 265 -15 345 90 C427 196 315 270 225 320 C115 383 66 490 -46 454"/>
      </g>

      <g class="waterIslands islandB">
        <path class="waterPlate plate2" d="M430 -95 C635 -42 782 15 779 132 C775 259 616 252 553 330 C493 405 527 504 409 524 C287 546 219 432 259 335 C306 222 399 180 376 89 C356 16 343 -73 430 -95Z"/>
        <path class="waterContour contour2" d="M430 -95 C635 -42 782 15 779 132 C775 259 616 252 553 330 C493 405 527 504 409 524"/>
      </g>

      <g class="waterIslands islandC">
        <path class="waterPlate plate3" d="M903 -96 C1101 -77 1324 -5 1390 116 C1444 216 1327 276 1195 253 C1077 231 1019 320 944 401 C861 490 731 458 720 345 C710 243 828 189 822 102 C817 24 803 -84 903 -96Z"/>
        <path class="waterContour contour3" d="M903 -96 C1101 -77 1324 -5 1390 116 C1444 216 1327 276 1195 253 C1077 231 1019 320 944 401"/>
      </g>

      <g class="waterIslands islandD">
        <path class="waterPlate plate4" d="M1450 82 C1597 70 1725 168 1708 301 C1695 411 1572 426 1517 511 C1457 604 1511 710 1389 756 C1265 803 1162 711 1180 596 C1197 488 1322 462 1318 359 C1315 267 1337 91 1450 82Z"/>
        <path class="waterContour contour4" d="M1450 82 C1597 70 1725 168 1708 301 C1695 411 1572 426 1517 511 C1457 604 1511 710 1389 756"/>
      </g>

      <g class="waterIslands islandE">
        <path class="waterPlate plate5" d="M-120 586 C61 510 221 547 293 670 C351 770 288 836 206 891 C117 951 80 1070 -35 1121 L-120 1121Z"/>
        <path class="waterContour contour5" d="M-120 586 C61 510 221 547 293 670 C351 770 288 836 206 891 C117 951 80 1070 -35 1121"/>
      </g>

      <g class="waterIslands islandF">
        <path class="waterPlate plate6" d="M467 627 C617 561 794 599 855 715 C917 832 842 900 764 968 C703 1022 727 1116 619 1150 L365 1150 C313 1053 347 963 413 905 C496 832 390 662 467 627Z"/>
        <path class="waterContour contour6" d="M467 627 C617 561 794 599 855 715 C917 832 842 900 764 968 C703 1022 727 1116 619 1150"/>
      </g>

      <g class="waterIslands islandG">
        <path class="waterPlate plate7" d="M1039 560 C1196 518 1357 600 1366 728 C1375 861 1240 888 1192 969 C1158 1028 1184 1093 1120 1150 L861 1150 C810 1052 855 959 929 897 C1014 827 929 590 1039 560Z"/>
        <path class="waterContour contour7" d="M1039 560 C1196 518 1357 600 1366 728 C1375 861 1240 888 1192 969 C1158 1028 1184 1093 1120 1150"/>
      </g>

      <g class="waterDepth">
        <path d="M250 430 C430 338 595 419 713 475 C845 538 1019 482 1144 418 C1248 365 1377 387 1485 462 C1576 525 1645 620 1654 735 L1654 1115 L-40 1115 L-40 908 C93 877 209 835 277 761 C356 676 180 529 250 430Z"/>
      </g>
    </svg>
  `;
  document.body.prepend(ocean);
}
// Background intentionally disabled: keep the page clean and solid.
// ensureOceanBackdrop();

document.addEventListener('pointerdown',e=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target=e.target.closest('button,.contactCard,.themeChoice');
  if(!target) return;
  const ripple=document.createElement('span');
  ripple.className='liquidTapRipple';
  ripple.style.left=`${e.clientX}px`;
  ripple.style.top=`${e.clientY}px`;
  document.body.append(ripple);
  setTimeout(()=>ripple.remove(),560);
},{passive:true});

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
document.querySelectorAll('.onboardingNext').forEach(btn=>btn.addEventListener('click',()=>{ onboardingStep=Math.min(document.querySelectorAll('.onboardingStep').length-1,onboardingStep+1); renderOnboarding(); $('manualStartOver').classList.toggle('hidden',onboardingStep===0); }));
document.querySelectorAll('.onboardingBack').forEach(btn=>btn.addEventListener('click',()=>{onboardingStep=Math.max(0,onboardingStep-1);renderOnboarding();$('manualStartOver').classList.toggle('hidden',onboardingStep===0);}));
$('manualStartOver').addEventListener('click',()=>{onboardingStep=0;renderOnboarding();$('manualStartOver').classList.add('hidden');});
$('finishOnboarding').addEventListener('click',()=>{ localStorage.setItem(onboardingVersion,'done'); $('onboarding').classList.add('hidden'); goHome(false); maybeShowIdentity(); });

const params = new URLSearchParams(location.search);
const inviteRoomId = params.get('room');
const inviteToken = params.get('invite');
const declinedInviteKey = inviteRoomId ? `justtwo:declinedInvite:${inviteRoomId}` : null;
let pendingInvite = Boolean(inviteRoomId && inviteToken && localStorage.getItem(declinedInviteKey)!==inviteToken);
let currentRoom = null, authToken = null, myRole = null, socket = null;
let profiles = { creator:{displayName:'You',avatarUrl:null}, guest:{displayName:'Friend',avatarUrl:null} };
let recorder=null, recordedChunks=[], recordTimer=null, recordStarted=0;
let lastPresence={}, typingTimer=null, sentTyping=false, otherTyping=false;
let homeRefreshTimer=null, homeRefreshBusy=false, lastHomeUnreadTotal=0, homeUnreadReady=false, lastContactsSignature='';
const storageKey=id=>`justtwo:${id}:auth`;
const roleKey=id=>`justtwo:${id}:role`;
const lastRoomKey='justtwo:lastRoom';
const roomsKey='justtwo:rooms:v1';
const identityKey='justtwo:identity:v1';
const setupKey=(id,role)=>`justtwo:${id}:${role}:setup-v3`;
function getRooms(){try{return [...new Set(JSON.parse(localStorage.getItem(roomsKey)||'[]'))];}catch{return[];}}
function rememberRoom(id){const rooms=getRooms().filter(Boolean);if(!rooms.includes(id))rooms.unshift(id);localStorage.setItem(roomsKey,JSON.stringify(rooms.slice(0,30)));localStorage.setItem(lastRoomKey,id);}
function forgetRoom(id){
  const rooms=getRooms().filter(r=>r!==id);localStorage.setItem(roomsKey,JSON.stringify(rooms));
  localStorage.removeItem(storageKey(id));localStorage.removeItem(roleKey(id));
  for(const key of Object.keys(localStorage)){if(key.startsWith(`justtwo:${id}:`)&&key!==storageKey(id)&&key!==roleKey(id))localStorage.removeItem(key);}
  if(localStorage.getItem(lastRoomKey)===id)localStorage.removeItem(lastRoomKey);
  setupContacts({notify:false});
}
async function appHeartbeat(roomId,token){
  if(document.hidden||document.body.classList.contains('privacyLocked'))return;
  try{await fetch(`/api/rooms/${encodeURIComponent(roomId)}/heartbeat`,{method:'POST',headers:{'x-chat-token':token},cache:'no-store'});}catch{}
}
function getIdentity(){try{return JSON.parse(localStorage.getItem(identityKey)||'null');}catch{return null;}}
function maybeShowIdentity(){if(getIdentity())return;setTimeout(()=>{if(!$('identityDialog').open)$('identityDialog').showModal();},120);}

const THEMES = [
  {id:'midnight',name:'Midnight',note:'clean dark default'},
  {id:'cursed',name:'JJK · Infinity',note:'deep cursed violet'},
  {id:'wisteria',name:'KNY · Water Night',note:'deep water teal'},
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
let appearance={theme:'midnight',bubble:'red',privacy:false,idleMinutes:5};
let idleBlurTimer=null;
try{ appearance={...appearance,...JSON.parse(localStorage.getItem(customizationKey)||'{}')}; }catch{}
const THEME_STICKERS={
  midnight:'🌙',
  cursed:'☁️',
  wisteria:'🦋',
  tokyo:'🏎️',
  sakura:'🌸',
  cyber:'⚡',
  aurora:'✨',
  storm:'⛈️',
  mono:'◐'
};
function updateThemeMascot(){
  const sticker=$('themeMascot');
  if(!sticker)return;
  sticker.textContent=THEME_STICKERS[appearance.theme]||'🌙';
  sticker.dataset.themeSticker=appearance.theme;
  sticker.classList.remove('hidden');
}
function applyAppearance(){
  document.documentElement.dataset.theme=appearance.theme;
  const found=BUBBLE_COLORS.find(c=>c.id===appearance.bubble)||BUBBLE_COLORS[0];
  document.documentElement.style.setProperty('--mine-bubble',found.value);
  localStorage.setItem(customizationKey,JSON.stringify(appearance));
  document.querySelectorAll('[data-theme-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.themeChoice===appearance.theme));
  document.querySelectorAll('[data-color-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.colorChoice===appearance.bubble));
  document.body.classList.remove('privacyEnabled');
  ['privacyToggle','dialogPrivacyToggle','setupPrivacyToggle'].forEach(id=>{if($(id))$(id).checked=Boolean(appearance.privacy);});
  ['idleBlurSelect','dialogIdleBlurSelect','setupIdleBlurSelect'].forEach(id=>{if($(id))$(id).value=String(Number.isFinite(Number(appearance.idleMinutes))?Number(appearance.idleMinutes):5);});
  updateThemeMascot();
  resetIdleBlurTimer();
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
['idleBlurSelect','dialogIdleBlurSelect','setupIdleBlurSelect'].forEach(id=>$(id)?.addEventListener('change',e=>{appearance.idleMinutes=Math.max(0,Number(e.target.value)||0);applyAppearance();}));

function resetIdleBlurTimer(){
  clearTimeout(idleBlurTimer);idleBlurTimer=null;
  const mins=Number(appearance.idleMinutes)||0;
  if(!mins||document.body.classList.contains('privacyLocked'))return;
  idleBlurTimer=setTimeout(()=>engagePrivacyShield('idle'),mins*60*1000);
}
function noteActivity(){if(!document.body.classList.contains('privacyLocked'))resetIdleBlurTimer();}
['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,noteActivity,{passive:true,capture:true}));
window.addEventListener('mousemove',noteActivity,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetIdleBlurTimer();});

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
if($('funBtn'))$('funBtn').onclick=()=>{funIndex=(funIndex+1+Math.floor(Math.random()*(funBits.length-1)))%funBits.length;const bit=funBits[funIndex];if($('funType'))$('funType').textContent=bit.type.toUpperCase();if($('funResult'))$('funResult').textContent=bit.text;};

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

function avatarFallback(role){
  const name=profiles[role]?.displayName||(role===myRole?'You':'Friend');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#23262b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${(name.trim().charAt(0).toUpperCase()||'?').replace(/[<>&]/g,'')}</text></svg>`)}`;
}
function setAvatar(img,role){ if(img)img.src=profiles[role]?.avatarUrl||avatarFallback(role); }
function refreshHeader(){
  if(!myRole)return; const other=myRole==='creator'?'guest':'creator';
  setAvatar($('themAvatarTop'),other); $('chatPartnerName').textContent=profiles[other]?.displayName||'Friend';
  setAvatar($('profileAvatar'),myRole);
  setAvatar($('setupAvatar'),myRole);
}

function contactPresence(data, role){
  const presence=data.presence||{};
  const activity=presence.activity?.[role] || data.profiles?.[role]?.activityStatus || null;
  if(activity==='emergency')return{label:'emergency button pressed',cls:'emergency'};
  if(activity==='blurred')return{label:'screen blurred',cls:'blurred'};
  const online=new Set(presence.online||[]);
  if(online.has(role))return{label:'online',cls:'online'};
  const seen=presence.lastSeen?.[role] || data.profiles?.[role]?.lastSeen;
  if(seen)return{label:formatLastSeen(seen),cls:'lastseen'};
  return{label:'offline',cls:'offline'};
}
function showHomeNotice(text){const n=$('homeNotice');if(!n)return;n.textContent=text;n.classList.remove('hidden');clearTimeout(showHomeNotice.t);showHomeNotice.t=setTimeout(()=>n.classList.add('hidden'),3200);}
async function setupContacts({notify=false}={}){
  if(homeRefreshBusy)return;homeRefreshBusy=true;
  const ids=getRooms();
  const results=await Promise.all(ids.map(async id=>{
    const token=localStorage.getItem(storageKey(id));if(!token)return null;
    try{
      appHeartbeat(id,token);
      const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/messages`,{headers:{'x-chat-token':token},cache:'no-store'});if(!r.ok)return null;
      const data=await r.json();const role=data.role||localStorage.getItem(roleKey(id));
      if(role==='creator'&&data.inviteStatus==='declined'){
        const declinedKey=`justtwo:declinedByInvitee:${id}`;
        const firstNotice=localStorage.getItem(declinedKey)!=='1';
        localStorage.setItem(declinedKey,'1');
        const remaining=getRooms().filter(rid=>rid!==id);localStorage.setItem(roomsKey,JSON.stringify(remaining));
        localStorage.removeItem(storageKey(id));localStorage.removeItem(roleKey(id));
        if(firstNotice)setTimeout(()=>showHomeNotice('They didn’t accept your invite, so the chat was removed.'),0);
        return null;
      }
      const other=role==='creator'?'guest':'creator';const p=(data.profiles||{})[other]||{displayName:'Friend',avatarUrl:null,username:''};
      const unread=Number(data.unreadCount||0);const state=contactPresence(data,other);const visibleMessages=(data.messages||[]).filter(m=>!m.deletedAt);const last=visibleMessages.at(-1);const senderLabel=last?(last.sender===role?'You':(p.displayName||'Friend')):'';const preview=last?(last.type==='text'?(last.body||'Message').slice(0,55):last.type==='image'?'Photo':'Voice note'):'No messages yet';const sub=last?`${senderLabel}: ${preview}`:preview;
      return{id,token,p,unread,state,sub};
    }catch{return null;}
  }));
  const valid=results.filter(Boolean);const validIds=valid.map(x=>x.id);let totalUnread=valid.reduce((n,x)=>n+x.unread,0);let newestName=valid.find(x=>x.unread)?.p?.displayName||'Friend';
  if(validIds.length!==ids.length)localStorage.setItem(roomsKey,JSON.stringify(validIds));
  const signature=JSON.stringify(valid.map(x=>[x.id,x.p.displayName,x.p.avatarUrl,x.p.username,x.unread,x.state.label,x.state.cls,x.sub]));
  if(signature!==lastContactsSignature){
    const frag=document.createDocumentFragment();
    valid.forEach(({id,p,unread,state,sub})=>{
      const card=document.createElement('div');card.className='contactCard';card.tabIndex=0;card.setAttribute('role','button');
      const imgWrap=document.createElement('span');imgWrap.className='contactAvatarWrap';
      const img=document.createElement('img');img.className='avatar continueAvatar';img.alt='';
      if(p.avatarUrl)img.src=p.avatarUrl;else{const initial=(p.displayName||'Friend').trim().charAt(0).toUpperCase()||'?';img.src=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#23262b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${initial}</text></svg>`)}`;}
      const statusDot=document.createElement('span');statusDot.className=`presenceDot contactPresenceDot ${state.cls}`;imgWrap.append(img,statusDot);
      const copy=document.createElement('span');copy.className='contactText';copy.innerHTML=`<span class="contactNameRow"><strong>${escapeHtml(p.displayName||'Friend')}</strong><span class="contactStatus ${state.cls}">${escapeHtml(state.label)}</span></span><small>${p.username?'@'+escapeHtml(p.username)+' · ':''}${escapeHtml(sub)}</small>`;
      const side=document.createElement('span');side.className='contactSide';if(unread){const badge=document.createElement('span');badge.className='unreadBadge';badge.textContent=unread===1?'1 new':`${unread} new`;side.append(badge);}
      const remove=document.createElement('button');remove.type='button';remove.className='contactDelete';remove.title='Remove chat from this device';remove.setAttribute('aria-label','Remove chat from this device');remove.textContent='×';remove.onclick=e=>{e.stopPropagation();if(confirm(`Remove ${p.displayName||'this chat'} from this device? Messages on the server are not erased.`))forgetRoom(id);};side.append(remove);
      const arrow=document.createElement('span');arrow.className='contactArrow';arrow.textContent='→';side.append(arrow);
      card.append(imgWrap,copy,side);card.onclick=()=>resumeRoom(id,true);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();resumeRoom(id,true);}};frag.append(card);
    });
    $('contactsList').replaceChildren(frag);lastContactsSignature=signature;
  }
  $('contactsCount').textContent=valid.length?`${valid.length} saved`:'';$('contactsWidget').classList.toggle('hidden',valid.length===0);
  document.title=totalUnread?`(${totalUnread}) Just Two`:'Just Two';
  if(homeUnreadReady&&notify&&totalUnread>lastHomeUnreadTotal)showHomeNotice(`${totalUnread-lastHomeUnreadTotal} new message${totalUnread-lastHomeUnreadTotal===1?'':'s'} from ${newestName}`);
  lastHomeUnreadTotal=totalUnread;homeUnreadReady=true;homeRefreshBusy=false;
}
function startHomeRefresh(){clearInterval(homeRefreshTimer);homeRefreshTimer=setInterval(()=>{if(!$('landing').classList.contains('hidden'))setupContacts({notify:true});},5000);}
function stopHomeRefresh(){clearInterval(homeRefreshTimer);homeRefreshTimer=null;}

function showInviteCard(){ $('inviteCard').classList.toggle('hidden',!pendingInvite); }
async function goHome(replace=true){
  if($('setupDialog')?.open)$('setupDialog').close();
  if($('profileDialog')?.open)$('profileDialog').close();
  socket?.disconnect(); setTyping(false); show('landing'); showInviteCard(); await setupContacts({notify:false}); startHomeRefresh();
  if(replace) history.replaceState({view:'home'},'',pendingInvite?`/?room=${encodeURIComponent(inviteRoomId)}&invite=${encodeURIComponent(inviteToken)}`:'/');
}
$('shareBackBtn').onclick=()=>{
  if($('setupDialog')?.open)$('setupDialog').close();
  currentRoom = null;
  authToken = null;
  myRole = null;
  goHome();
}; $('errorHomeBtn').onclick=()=>goHome(); $('chatBackBtn').onclick=()=>{if($('setupDialog')?.open)$('setupDialog').close();history.back();};

$('createBtn').onclick=async()=>{
  stopHomeRefresh();
  const r=await fetch('/api/rooms',{method:'POST'}); const data=await r.json(); if(!r.ok)return fail(data.error||'Could not create chat.');
  currentRoom=data.roomId;authToken=data.creatorToken;myRole='creator';
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);
  $('shareLink').value=`${location.origin}/?room=${encodeURIComponent(currentRoom)}&invite=${encodeURIComponent(data.shareToken)}`; show('share'); history.pushState({view:'share'},'','/');
};
$('copyBtn').onclick=async()=>{await navigator.clipboard.writeText($('shareLink').value);$('copyBtn').textContent='Copied ✓';setTimeout(()=>$('copyBtn').textContent='Copy',1200);};
$('enterBtn').onclick=()=>{
  rememberRoom(currentRoom);
  openChat(true);
};
$('acceptInviteBtn').onclick=async()=>{
  if(!pendingInvite)return;
  const existingToken=localStorage.getItem(storageKey(inviteRoomId));
  const r=await fetch(`/api/rooms/${encodeURIComponent(inviteRoomId)}/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareToken:inviteToken,existingToken})});
  const data=await r.json(); if(!r.ok)return fail(data.error||'Could not join.');
  currentRoom=inviteRoomId;authToken=data.authToken;myRole=data.role;pendingInvite=false;
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);rememberRoom(currentRoom);
  history.replaceState({view:'home'},'','/'); await openChat(true);
};
$('declineInviteBtn').onclick=async()=>{
  if(!pendingInvite)return;
  try{
    await fetch(`/api/rooms/${encodeURIComponent(inviteRoomId)}/decline`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareToken:inviteToken})});
  }catch{}
  if(declinedInviteKey&&inviteToken)localStorage.setItem(declinedInviteKey,inviteToken);
  pendingInvite=false;history.replaceState({view:'home'},'','/');showInviteCard();showHomeNotice('Invite declined.');
};
function fail(message){$('errorText').textContent=message;show('error');}
async function resumeRoom(id,pushHistory=true){currentRoom=id;authToken=localStorage.getItem(storageKey(id));myRole=localStorage.getItem(roleKey(id));if(!authToken)return fail('This browser does not have access to that private chat.');await openChat(pushHistory);}
async function openChat(pushHistory=true){
  stopHomeRefresh();
  if(!currentRoom||!authToken)return fail('Missing chat access.');
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/messages`,{headers:{'x-chat-token':authToken}});const data=await r.json();if(!r.ok)return fail(data.error||'Could not open chat.');
  myRole=data.role;profiles=data.profiles||profiles;rememberRoom(currentRoom);await syncIdentityToRoom();refreshHeader();
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
  socket.on('message',msg=>{clearEmpty();addMessage(msg);scrollBottom();if(msg.sender!==myRole)socket.emit('seen');});
  socket.on('presence',data=>{lastPresence=data||{};updatePresence(lastPresence);});
  socket.on('typing',data=>{const other=myRole==='creator'?'guest':'creator';if(data?.role!==other)return;otherTyping=Boolean(data.typing);updatePresence(lastPresence);updateTypingBubble();});
  socket.on('reaction',({messageId,reactions,emoji,role})=>{updateReactions(messageId,reactions);if(role&&role!==myRole&&emoji)reactionBurst(emoji);});
  socket.on('seen',({messageIds,seenAt})=>{(messageIds||[]).forEach(id=>markSeen(id,seenAt));});
  socket.on('connect',()=>{socket.emit('seen');});
  socket.on('message-deleted',({messageId})=>markDeleted(messageId));
  socket.on('profile',data=>{profiles[data.role]={...(profiles[data.role]||{}),displayName:data.displayName,avatarUrl:data.avatarUrl,username:data.username||''};refreshHeader();document.querySelectorAll(`[data-sender="${data.role}"] .messageAvatar`).forEach(img=>setAvatar(img,data.role));});
  socket.on('invite-declined',()=>{if(myRole==='creator'&&currentRoom){const id=currentRoom;socket?.disconnect();forgetRoom(id);currentRoom=null;authToken=null;myRole=null;goHome(false).then(()=>showHomeNotice('They didn’t accept your invite, so the chat was removed.'));}});
  socket.on('emergency-lock',()=>showEmergencyLock());
  socket.on('connect_error',err=>{if(err?.message==='app_locked')showEmergencyLock();else $('presence').textContent='connection lost';});
}
function formatLastSeen(ts){if(!ts)return'offline';const d=new Date(ts),now=new Date(),same=d.toDateString()===now.toDateString(),y=new Date(now);y.setDate(now.getDate()-1);const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(same)return`last seen today at ${time}`;if(d.toDateString()===y.toDateString())return`last seen yesterday at ${time}`;return`last seen ${d.toLocaleDateString([],{month:'short',day:'numeric'})} at ${time}`;}
function updatePresence(data={}){const other=myRole==='creator'?'guest':'creator';const online=new Set(data.online||[]);const p=$('presence'),dot=$('presenceDot');const activity=data.activity?.[other]||profiles[other]?.activityStatus;let next,cls;if(activity==='emergency'){next='emergency button pressed';cls='emergency';}else if(activity==='blurred'){next='screen blurred';cls='blurred';}else if(activity==='recording-audio'){next='recording audio…';cls='busy';}else if(activity==='taking-photo'){next='taking a photo…';cls='busy';}else if(otherTyping&&online.has(other)){next='typing…';cls='online';}else if(online.has(other)){next='online';cls='online';}else if(data.lastSeen?.[other]||profiles[other]?.lastSeen){next=formatLastSeen(data.lastSeen?.[other]||profiles[other]?.lastSeen);cls='lastseen';}else{next='offline';cls='offline';}dot.className=`presenceDot ${cls}`;if(p.textContent!==next){p.textContent=next;p.classList.remove('statusPulse');void p.offsetWidth;p.classList.add('statusPulse');}}
function updateTypingBubble(){$('typingBubble').classList.toggle('hidden',!otherTyping);if(otherTyping)setTimeout(scrollBottom,20);}
function setTyping(value){if(!socket?.connected)return;if(sentTyping!==value){sentTyping=value;socket.emit('typing',value);}clearTimeout(typingTimer);if(value)typingTimer=setTimeout(()=>setTyping(false),1400);}
function clearEmpty(){if($('messages').querySelector('.empty'))$('messages').innerHTML='';}

const reactionChoices=[...new Set(Object.values(emojiData).flat())];
async function broadcastActivityStatus(status){
  if(socket?.connected)socket.emit('activity-status',status);
  const jobs=getRooms().map(id=>{const token=localStorage.getItem(storageKey(id));if(!token)return null;return fetch(`/api/rooms/${encodeURIComponent(id)}/activity-status`,{method:'POST',headers:{'content-type':'application/json','x-chat-token':token},body:JSON.stringify({status}),keepalive:true}).catch(()=>null);}).filter(Boolean);
  if(jobs.length)await Promise.allSettled(jobs);
}
async function setCurrentChatActivity(status){
  if(!currentRoom||!authToken)return;
  if(socket?.connected){socket.emit('activity-status',status);return;}
  try{await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/activity-status`,{method:'POST',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({status}),keepalive:true});}catch{}
}
function engagePrivacyShield(reason='manual'){
  clearTimeout(idleBlurTimer);idleBlurTimer=null;
  $('privacyShield')?.classList.remove('hidden');
  document.body.classList.add('privacyLocked');
  broadcastActivityStatus('blurred');
}
function releasePrivacyShield(){
  $('privacyShield')?.classList.add('hidden');
  document.body.classList.remove('privacyLocked');
  broadcastActivityStatus('active');
  resetIdleBlurTimer();
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

function renderMessageContent(bubble,msg){
  if(msg.type==='image'){const img=document.createElement('img');img.className='messageImage';img.src=msg.mediaUrl;img.alt='Shared image';img.loading='lazy';bubble.append(img);}
  else if(msg.type==='audio'){const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=msg.mediaUrl;bubble.append(audio);}
  else {const text=document.createElement('span');text.textContent=msg.body;bubble.append(text);appendLinkPreview(bubble,msg.body);}
}
function addMessage(msg){
  const row=document.createElement('div');row.className=`messageRow ${msg.sender===myRole?'mine':'theirs'}`;row.dataset.id=msg.id;row.dataset.sender=msg.sender;
  if(msg.deletedAt){
    // Deleted messages disappear normally. The other person's deleted messages can
    // only be viewed while the on-screen torch is actively held/dragged.
    if(msg.sender===myRole)return;
    row.classList.add('deletedHidden');
  }
  const avatar=document.createElement('img');avatar.className='avatar messageAvatar';avatar.alt='';setAvatar(avatar,msg.sender);
  const wrap=document.createElement('div');wrap.className='messageWrap';const bubble=document.createElement('div');bubble.className='msg';
  renderMessageContent(bubble,msg);
  const meta=document.createElement('div');meta.className='meta';
  if(msg.deletedAt){const who=profiles[msg.sender]?.displayName||'Friend';const deletedLabel=document.createElement('span');deletedLabel.className='deletedRevealLabel';deletedLabel.textContent=`deleted by ${who} · `;meta.append(deletedLabel);}
  const timeSpan=document.createElement('span');timeSpan.textContent=new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});meta.append(timeSpan);
  if(msg.sender===myRole&&!msg.deletedAt){const receipt=document.createElement('span');receipt.className='receipt';receipt.dataset.receiptFor=msg.id;receipt.textContent=msg.seenAt?'✓✓ seen':'✓ sent';meta.append(receipt);}
  const actions=document.createElement('div');actions.className='msgActions';
  if(!msg.deletedAt){const react=document.createElement('button');react.type='button';react.title='React';react.textContent='♡';react.onclick=e=>openReactionMenu(e.currentTarget,msg.id);actions.append(react);if(msg.sender===myRole){const del=document.createElement('button');del.type='button';del.title='Delete';del.textContent='⌫';del.onclick=()=>{if(confirm('Delete this message? It will disappear from the chat.'))socket?.emit('delete-message',msg.id);};actions.append(del);}}
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
function markSeen(id,seenAt){const r=document.querySelector(`[data-receipt-for="${id}"]`);if(r){r.textContent='✓✓ seen';r.classList.add('seen');}}
function markDeleted(id){const row=document.querySelector(`.messageRow[data-id="${id}"]`);if(!row)return;if(row.dataset.sender===myRole){row.remove();return;}row.classList.add('deletedHidden');row.querySelector('.msgActions')?.replaceChildren();row.querySelector('.reactions')?.replaceChildren();}
function updateReactions(id,reactions){const bar=document.querySelector(`.messageRow[data-id="${id}"] .reactions`);if(!bar)return;bar.innerHTML='';const groups=new Map();reactions.forEach(r=>groups.set(r.emoji,(groups.get(r.emoji)||0)+1));groups.forEach((count,emoji)=>{const b=document.createElement('button');b.type='button';b.textContent=`${emoji}${count>1?' '+count:''}`;b.onclick=()=>socket?.emit('react',{messageId:id,emoji});bar.append(b);});}
function openReactionMenu(target,messageId,longPress=false){
  document.querySelector('.reactionMenu')?.remove();const menu=document.createElement('div');menu.className=`reactionMenu${longPress?' reactionMenuLong':''}`;
  const head=document.createElement('div');head.className='reactionHead';head.innerHTML='<strong>React</strong><button type="button">×</button>';head.querySelector('button').onclick=()=>menu.remove();menu.append(head);
  const grid=document.createElement('div');grid.className='reactionGrid';reactionChoices.forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=e=>{e.stopPropagation();socket?.emit('react',{messageId,emoji});reactionBurst(emoji);menu.remove();};grid.append(b);});menu.append(grid);
  document.body.append(menu);const rect=target.getBoundingClientRect();const width=Math.min(390,window.innerWidth-20);menu.style.width=`${width}px`;menu.style.left=`${Math.max(10,Math.min(window.innerWidth-width-10,rect.left+rect.width/2-width/2))}px`;menu.style.top=`${Math.max(10,Math.min(window.innerHeight-330,rect.top-90))}px`;
  setTimeout(()=>document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.remove();},{once:true}),0);
}
function reactionBurst(emoji){const layer=document.createElement('div');layer.className='reactionBurst';for(let i=0;i<18;i++){const s=document.createElement('span');s.textContent=emoji;s.style.setProperty('--x',`${(Math.random()*120-60).toFixed(1)}vw`);s.style.setProperty('--r',`${Math.random()*360-180}deg`);s.style.setProperty('--d',`${Math.random()*.35}s`);s.style.left=`${30+Math.random()*40}%`;layer.append(s);}document.body.append(layer);setTimeout(()=>layer.remove(),1500);}

let deletedTorchActive=false;
function setDeletedTorch(active){
  deletedTorchActive=Boolean(active);
  $('chat')?.classList.toggle('torchReveal',deletedTorchActive);
  const t=$('deletedTorch');if(t)t.setAttribute('aria-pressed',String(deletedTorchActive));
}
(function setupDeletedTorch(){
  const torch=$('deletedTorch');if(!torch)return;
  let dragging=false,offsetY=0;
  torch.addEventListener('pointerdown',e=>{dragging=true;torch.setPointerCapture?.(e.pointerId);offsetY=e.clientY-torch.getBoundingClientRect().top;setDeletedTorch(true);e.preventDefault();});
  torch.addEventListener('pointermove',e=>{if(!dragging)return;const chat=$('chat').getBoundingClientRect();const h=torch.offsetHeight||46;const y=Math.max(8,Math.min(chat.height-h-8,e.clientY-chat.top-offsetY));torch.style.top=`${y}px`;torch.style.bottom='auto';});
  const stop=e=>{if(!dragging)return;dragging=false;try{torch.releasePointerCapture?.(e.pointerId);}catch{}setDeletedTorch(false);};
  torch.addEventListener('pointerup',stop);torch.addEventListener('pointercancel',stop);
  torch.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();setDeletedTorch(true);}});
  torch.addEventListener('keyup',()=>setDeletedTorch(false));torch.addEventListener('blur',()=>setDeletedTorch(false));
})();

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
  }
}

function scrollBottom(){$('messages').scrollTop=$('messages').scrollHeight;}
$('linkBtn').onclick=()=>{$('linkTray').classList.toggle('hidden');if(!$('linkTray').classList.contains('hidden'))$('linkInput').focus();};
$('closeLinkTray').onclick=()=>{$('linkTray').classList.add('hidden');$('linkInput').value='';};
$('sendLinkBtn').onclick=()=>{const value=$('linkInput').value.trim();if(!value||!socket?.connected)return;try{const u=new URL(value);const h=u.hostname.replace(/^www\./,'');if(!(h==='youtu.be'||h.endsWith('youtube.com')||h==='pin.it'||h.endsWith('pinterest.com')))return alert('Paste a YouTube or Pinterest link.');}catch{return alert('That link does not look valid.');}socket.emit('message',value);$('linkInput').value='';$('linkTray').classList.add('hidden');};

$('form').addEventListener('submit',e=>{e.preventDefault();const value=$('input').value.trim();if(!value||!socket?.connected)return;setTyping(false);socket.emit('message',value);$('input').value='';$('input').style.height='auto';$('emojiTray').classList.add('hidden');});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit();}});
$('input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,130)+'px';setTyping(Boolean(e.target.value.trim()));});$('input').addEventListener('blur',()=>setTyping(false));
$('imageBtn').onclick=()=>$('imageInput').click();$('imageInput').onchange=async()=>{const file=$('imageInput').files[0];if(file)await uploadMedia('image',file);$('imageInput').value='';};
let cameraActivityOpen=false;
$('cameraBtn').onclick=async()=>{cameraActivityOpen=true;await setCurrentChatActivity('taking-photo');$('cameraInput').click();};
$('cameraInput').onchange=async()=>{try{const file=$('cameraInput').files[0];if(file)await uploadMedia('image',file);}finally{$('cameraInput').value='';cameraActivityOpen=false;await setCurrentChatActivity('active');}};
window.addEventListener('focus',()=>{if(!cameraActivityOpen)return;setTimeout(()=>{if(cameraActivityOpen){cameraActivityOpen=false;setCurrentChatActivity('active');}},600);});
async function uploadMedia(kind,blob){const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/${kind}`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':blob.type||'application/octet-stream'},body:blob});const data=await r.json().catch(()=>({}));if(!r.ok)alert(data.error||'Upload failed.');return data;}
$('voiceBtn').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return alert('Voice recording is not supported in this browser.');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedChunks=[];const preferred=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};recorder.onstop=()=>stream.getTracks().forEach(t=>t.stop());recorder.start();await setCurrentChatActivity('recording-audio');recordStarted=Date.now();$('recordTime').textContent='Recording 0:00';$('recordingBar').classList.remove('hidden');$('form').classList.add('recording');recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStarted)/1000);$('recordTime').textContent=`Recording ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},250);}catch{setCurrentChatActivity('active');alert('Microphone permission is needed for voice notes.');}};
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(recordTimer);$('recordingBar').classList.add('hidden');$('form').classList.remove('recording');setCurrentChatActivity('active');}
$('cancelRecord').onclick=()=>{stopRecording();recordedChunks=[];};$('sendRecord').onclick=async()=>{if(!recorder)return;const type=recorder.mimeType||'audio/webm';stopRecording();await new Promise(r=>setTimeout(r,80));const blob=new Blob(recordedChunks,{type});recordedChunks=[];if(blob.size)await uploadMedia('audio',blob);};

async function uploadAvatarFrom(inputId){const file=$(inputId).files[0];if(!file)return null;const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/avatar`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':file.type},body:file});const data=await r.json();if(!r.ok){alert(data.error||'Could not upload photo.');return null;}profiles[myRole]=data;refreshHeader();$(inputId).value='';return data;}
$('profileBtn').onclick=()=>{refreshHeader();applyAppearance();$('profileDialog').showModal();};$('avatarPick').onclick=()=>$('avatarInput').click();$('avatarInput').onchange=()=>uploadAvatarFrom('avatarInput');
$('saveProfile').onclick=()=>{$('profileDialog').close();};
async function syncIdentityToRoom(){
  const identity=getIdentity();if(!identity||!currentRoom||!authToken)return true;
  const mine=profiles[myRole]||{};if(mine.displayName===identity.name&&mine.username===identity.username)return true;
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/profile`,{method:'PATCH',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({displayName:identity.name,username:identity.username})});const data=await r.json().catch(()=>({}));if(!r.ok)return false;profiles[myRole]=data;return true;
}
$('setupAvatarPick').onclick=()=>$('setupAvatarInput').click();$('setupAvatarInput').onchange=()=>uploadAvatarFrom('setupAvatarInput');
$('finishSetup').onclick=()=>{localStorage.setItem(setupKey(currentRoom,myRole),'done');$('setupDialog').close();};
$('skipSetup').onclick=()=>{localStorage.setItem(setupKey(currentRoom,myRole),'done');$('setupDialog').close();};

$('saveIdentity').onclick=async()=>{
  const name=$('identityName').value.trim().slice(0,24);const username=$('identityUsername').value.trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,20);
  if(!name||!username){$('identityError').textContent='Add both a name and username.';return;}
  localStorage.setItem(identityKey,JSON.stringify({name,username}));$('identityDialog').close();if(currentRoom&&authToken){await syncIdentityToRoom();refreshHeader();}
};

function showEmergencyLock(){socket?.disconnect();setTyping(false);$('lockScreen').classList.remove('hidden');$('unlockPassword').value='';$('unlockError').textContent='';setTimeout(()=>$('unlockPassword').focus(),50);}
function hideEmergencyLock(){$('lockScreen').classList.add('hidden');}
$('unlockForm').addEventListener('submit',async e=>{e.preventDefault();const password=$('unlockPassword').value;const r=await fetch('/api/emergency/unlock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});const data=await r.json().catch(()=>({}));if(!r.ok){$('unlockError').textContent=data.error||'Could not unlock.';$('unlockPassword').select();return;}hideEmergencyLock();location.reload();});
const emergencySearches=['cats','dogs','cute capybaras','space facts','easy pasta recipes','funny animals','sunsets','house plants','cloud pictures','football scores','ocean waves','pandas','weather today','best pancakes'];
async function emergencyExit(){
  const q=emergencySearches[Math.floor(Math.random()*emergencySearches.length)];
  try{await Promise.race([broadcastActivityStatus('emergency'),new Promise(r=>setTimeout(r,220))]);}catch{}
  location.replace(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
}
$('emergencyBtn').onclick=emergencyExit;$('globalEmergencyBtn').onclick=emergencyExit;

window.addEventListener('popstate',async()=>{
  if($('setupDialog')?.open)$('setupDialog').close();
  if($('profileDialog')?.open)$('profileDialog').close();
  if(location.pathname==='/'||!location.pathname.startsWith('/chat/')){await goHome(false);return;}
  const m=location.pathname.match(/^\/chat\/([^/]+)$/);if(m)await resumeRoom(decodeURIComponent(m[1]),false);
});

async function boot(){
  try{const status=await fetch('/api/app-status').then(r=>r.json());if(status.locked){showEmergencyLock();return;}}catch{}
  applyAppearance();
  const legacy=localStorage.getItem(lastRoomKey);if(legacy&&localStorage.getItem(storageKey(legacy)))rememberRoom(legacy);
  const pathMatch=location.pathname.match(/^\/chat\/([^/]+)$/);
  if(pathMatch){currentRoom=decodeURIComponent(pathMatch[1]);authToken=localStorage.getItem(storageKey(currentRoom));myRole=localStorage.getItem(roleKey(currentRoom));if(authToken)await openChat(false);else await goHome(true);}else{history.replaceState({view:'home'},'',location.href);await goHome(false);}
  maybeShowOnboarding();
  if(localStorage.getItem(onboardingVersion)==='done')maybeShowIdentity();
  if(returningAtBoot) setTimeout(engagePrivacyShield,80);
}
boot();

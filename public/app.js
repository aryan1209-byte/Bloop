const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const views = ['landing','share','chat','error'];
const show = id => { views.forEach(v => $(v).classList.toggle('hidden', v !== id)); $('appChrome')?.classList.toggle('hidden', id === 'chat'); document.body.classList.toggle('chatOpen',id==='chat'); };

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
let homeUnreadByRoom=new Map();
let currentContactState={removed:false,removedBy:null,removedAt:null,removedByMe:false};
let replyTarget=null;
const storageKey=id=>`justtwo:${id}:auth`;
const roleKey=id=>`justtwo:${id}:role`;
const lastRoomKey='justtwo:lastRoom';
const roomsKey='justtwo:rooms:v1';
const identityKey='justtwo:identity:v1';
const peopleTokenKey='bloop:peopleToken:v1';
const profileDevicePinKey='bloop:profileDevicePin:v1';
const identitySkippedKey='bloop:identitySkipped:v1';
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

async function removeContactForBoth(id, token, name='this chat'){
  if(!confirm(`Remove ${name}? The other person will see that the chat was removed, but they can still send you a reach-out message. You can restore it later or permanently delete it.`))return;
  try{
    const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/contact/remove`,{method:'POST',headers:{'x-chat-token':token}});
    const data=await r.json();
    if(!r.ok)return alert(data.error||'Could not remove this chat.');
    showHomeNotice('Chat removed. You can restore it if they message you.');
    setupContacts({notify:false});
  }catch{alert('Could not remove this chat.');}
}

async function restoreContact(id, token){
  try{
    const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/contact/restore`,{method:'POST',headers:{'x-chat-token':token}});
    const data=await r.json();
    if(!r.ok)return alert(data.error||'Could not restore this chat.');
    currentContactState={removed:false,removedBy:null,removedAt:null,removedByMe:false};
    applyContactRemovalState(currentContactState);
    showHomeNotice('Chat restored ✓');
    setupContacts({notify:false});
  }catch{alert('Could not restore this chat.');}
}

async function deleteContactAnyway(id, token, name='this chat'){
  if(!confirm(`Permanently delete ${name}? This removes the chat for both people and cannot be undone.`))return;
  try{
    const r=await fetch(`/api/rooms/${encodeURIComponent(id)}/contact`,{method:'DELETE',headers:{'x-chat-token':token}});
    const data=await r.json();
    if(!r.ok)return alert(data.error||'Could not permanently delete this chat.');
    forgetRoom(id);
    if(currentRoom===id){socket?.disconnect();currentRoom=null;authToken=null;myRole=null;await goHome(false);}
    showHomeNotice('Chat permanently deleted.');
  }catch{alert('Could not permanently delete this chat.');}
}

function ensureContactStateBanner(){
  let banner=$('contactStateBanner');
  if(banner)return banner;
  banner=document.createElement('div');
  banner.id='contactStateBanner';
  banner.className='contactStateBanner hidden';
  const chat=$('chat');
  const messages=$('messages');
  chat?.insertBefore(banner,messages);
  return banner;
}

function setComposerLocked(locked){
  const form=$('form');
  if(!form)return;
  form.classList.toggle('contactRemovedLocked',locked);
  [...form.querySelectorAll('textarea,button,input')].forEach(el=>{el.disabled=locked;});
  if(locked){setTyping(false);setEmojiTray(false);$('linkTray')?.classList.add('hidden');}
}

function applyContactRemovalState(state={}){
  currentContactState={removed:false,removedBy:null,removedAt:null,removedByMe:false,...state};
  const banner=ensureContactStateBanner();
  if(!currentContactState.removed){
    banner.classList.add('hidden');banner.replaceChildren();setComposerLocked(false);return;
  }
  const removedByMe=currentContactState.removedBy===myRole || currentContactState.removedByMe;
  banner.classList.remove('hidden');
  banner.classList.toggle('removedByMe',removedByMe);
  banner.replaceChildren();

  const copy=document.createElement('div');
  copy.className='contactStateCopy';
  const title=document.createElement('strong');
  const text=document.createElement('span');
  if(removedByMe){
    title.textContent='You removed this chat';
    text.textContent='You can still read new messages from them. Restore the chat to reply, or permanently delete it.';
    setComposerLocked(true);
  }else{
    title.textContent='They removed this chat';
    text.textContent='You can still send them a message if you want to reach out. They can read it and choose whether to restore the chat.';
    setComposerLocked(false);
  }
  copy.append(title,text);banner.append(copy);

  if(removedByMe){
    const actions=document.createElement('div');actions.className='contactStateActions';
    const restore=document.createElement('button');restore.type='button';restore.className='primary';restore.textContent='Restore chat';restore.onclick=()=>restoreContact(currentRoom,authToken);
    const del=document.createElement('button');del.type='button';del.className='secondary dangerOutline';del.textContent='Delete anyway';del.onclick=()=>deleteContactAnyway(currentRoom,authToken,profiles[myRole==='creator'?'guest':'creator']?.displayName||'this chat');
    actions.append(restore,del);banner.append(actions);
  }
}
async function appHeartbeat(roomId,token){
  if(document.hidden||document.body.classList.contains('privacyLocked'))return;
  try{await fetch(`/api/rooms/${encodeURIComponent(roomId)}/heartbeat`,{method:'POST',headers:{'x-chat-token':token},cache:'no-store'});}catch{}
}
function getIdentity(){try{return JSON.parse(localStorage.getItem(identityKey)||'null');}catch{return null;}}
function maybeShowIdentity(){if(getIdentity()||localStorage.getItem(identitySkippedKey)==='1')return;setTimeout(()=>{if(!$('identityDialog').open)$('identityDialog').showModal();},120);}

const THEMES = [
  {id:'midnight',name:'Midnight',note:'clean dark default'},
  {id:'cursed',name:'JJK · Infinity',note:'deep cursed violet'},
  {id:'wisteria',name:'KNY · Water Night',note:'deep water teal'},
  {id:'tokyo',name:'Tokyo Neon',note:'rain + neon signs'},
  {id:'sakura',name:'Sakura After Dark',note:'muted pink night'},
  {id:'cyber',name:'Cyber Alley',note:'electric blue shadows'},
  {id:'aurora',name:'Aurora',note:'green-blue night'},
  {id:'storm',name:'Storm',note:'charcoal + lightning'},
  {id:'mono',name:'Monochrome',note:'ink black + silver'},
  {id:'pearl',name:'Pearl',note:'soft white glass'},
  {id:'cloud',name:'Cloud',note:'cool white + pale blue'}
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
let appearance={theme:'midnight',bubble:'red',privacy:false,idleMinutes:5,notifications:false,sounds:true};
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
  mono:'◐',
  pearl:'☾',
  cloud:'☁️'
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
  ['notificationToggle','dialogNotificationToggle','setupNotificationToggle'].forEach(id=>{if($(id))$(id).checked=Boolean(appearance.notifications);});
  ['soundToggle','dialogSoundToggle','setupSoundToggle'].forEach(id=>{if($(id))$(id).checked=appearance.sounds!==false;});
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
  ['themeGrid'].forEach(id=>{const el=$(id); if(!el)return; el.innerHTML=''; THEMES.forEach(t=>el.append(themeCard(t)));});
  ['colorChoices','dialogColorChoices','setupColorChoices'].forEach(id=>{const el=$(id); if(!el)return; el.innerHTML=''; BUBBLE_COLORS.forEach(c=>el.append(colorDot(c)));});
  applyAppearance();
}
fillAppearanceControls();
$('shuffleVibe').onclick=()=>{appearance.theme=THEMES[Math.floor(Math.random()*THEMES.length)].id;appearance.bubble=BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)].id;applyAppearance();};
['privacyToggle','dialogPrivacyToggle','setupPrivacyToggle'].forEach(id=>$(id)?.addEventListener('change',e=>{appearance.privacy=e.target.checked;applyAppearance();if(e.target.checked)engagePrivacyShield();}));
['idleBlurSelect','dialogIdleBlurSelect','setupIdleBlurSelect'].forEach(id=>$(id)?.addEventListener('change',e=>{appearance.idleMinutes=Math.max(0,Number(e.target.value)||0);applyAppearance();}));

let swRegistration=null;
async function ensureServiceWorker(){
  if(!('serviceWorker' in navigator))return null;
  try{
    swRegistration=swRegistration||await navigator.serviceWorker.register('/sw.js',{scope:'/'});
    return swRegistration;
  }catch{return null;}
}
ensureServiceWorker();

function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);}
function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function updateNotificationStatus(text){const el=$('notificationStatus');if(el)el.textContent=text||'';}

async function setNotificationsEnabled(enabled){
  if(!enabled){appearance.notifications=false;applyAppearance();updateNotificationStatus('Notifications off.');return;}
  if(!('Notification' in window)){appearance.notifications=false;applyAppearance();updateNotificationStatus('System notifications are not supported in this browser.');alert('This browser does not support system notifications.');return;}
  if(isIos()&&!isStandalone()){
    appearance.notifications=false;applyAppearance();
    updateNotificationStatus('On iPhone/iPad, add bloop to the Home Screen first, then enable notifications from the installed app.');
    alert('On iPhone/iPad: tap Bookmark / Add to Home Screen, open bloop from the Home Screen, then turn notifications on.');
    return;
  }
  await ensureServiceWorker();
  let permission=Notification.permission;
  if(permission!=='granted') permission=await Notification.requestPermission();
  appearance.notifications=permission==='granted';applyAppearance();
  updateNotificationStatus(appearance.notifications?'Notifications are enabled.':'Notifications are blocked. Allow bloop notifications in your browser/device settings.');
}
['notificationToggle','dialogNotificationToggle','setupNotificationToggle'].forEach(id=>$(id)?.addEventListener('change',e=>setNotificationsEnabled(e.target.checked)));
['soundToggle','dialogSoundToggle','setupSoundToggle'].forEach(id=>$(id)?.addEventListener('change',async e=>{appearance.sounds=e.target.checked;applyAppearance();if(e.target.checked){await unlockAlertAudio();playTinyTing(true);}}));

let alertAudioContext=null;
async function unlockAlertAudio(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return false;
    alertAudioContext=alertAudioContext||new Ctx();
    if(alertAudioContext.state==='suspended')await alertAudioContext.resume();
    const gain=alertAudioContext.createGain();gain.gain.value=0;gain.connect(alertAudioContext.destination);
    const osc=alertAudioContext.createOscillator();osc.connect(gain);osc.start();osc.stop(alertAudioContext.currentTime+.01);
    return alertAudioContext.state==='running';
  }catch{return false;}
}
document.addEventListener('pointerdown',()=>unlockAlertAudio(),{once:true,capture:true});
document.addEventListener('touchstart',()=>unlockAlertAudio(),{once:true,capture:true,passive:true});

function playTinyTing(force=false){
  if(!force&&appearance.sounds===false)return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    alertAudioContext=alertAudioContext||new Ctx();
    if(alertAudioContext.state==='suspended'){alertAudioContext.resume().then(()=>playTinyTing(force)).catch(()=>{});return;}
    const now=alertAudioContext.currentTime,osc=alertAudioContext.createOscillator(),gain=alertAudioContext.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(980,now);osc.frequency.exponentialRampToValueAtTime(760,now+.12);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.055,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);
    osc.connect(gain);gain.connect(alertAudioContext.destination);osc.start(now);osc.stop(now+.17);
  }catch{}
}
function showGlobalMessageToast(title,body){
  const el=$('globalMessageToast');if(!el)return;
  el.innerHTML=`<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
  el.classList.remove('hidden');clearTimeout(showGlobalMessageToast.timer);showGlobalMessageToast.timer=setTimeout(()=>el.classList.add('hidden'),3800);
}
async function showSystemNotification(title,body,roomId=currentRoom){
  if(!appearance.notifications||!('Notification' in window)||Notification.permission!=='granted')return false;
  try{
    const reg=await ensureServiceWorker();
    if(reg?.showNotification){await reg.showNotification(title,{body,tag:`bloop-${roomId||'home'}`,icon:'/assets/bloop-icon.jpg',badge:'/assets/bloop-icon.jpg',data:{url:roomId?`/chat/${encodeURIComponent(roomId)}`:'/'}});return true;}
    const n=new Notification(title,{body,tag:`bloop-${roomId||'home'}`});n.onclick=()=>{window.focus();n.close();};return true;
  }catch{return false;}
}
function funNotificationTitle(name){
  const options=[`💬 ${name} blooped you`,`✨ New bloop from ${name}`,`👀 ${name} has something to say`,`🫧 ${name} sent a bloop`,`⚡ ${name} just messaged`];
  return options[Math.floor(Math.random()*options.length)];
}
async function notifyIncomingMessage(msg){
  if(msg?.sender===myRole)return;
  playTinyTing();
  const other=myRole==='creator'?'guest':'creator';const name=profiles[other]?.displayName||'Friend';
  const body=msg.type==='text'?(msg.body||'New message').slice(0,100):msg.type==='image'?'Sent a photo':msg.type==='audio'?'Sent a voice note':'Sent a message';
  const title=funNotificationTitle(name);
  if(document.hidden) await showSystemNotification(title,body);
  else if(appearance.notifications) showGlobalMessageToast(title,body);
}
$('testAlertsBtn')?.addEventListener('click',async()=>{
  await unlockAlertAudio();playTinyTing(true);
  if(!appearance.notifications){await setNotificationsEnabled(true);}
  if(appearance.notifications){showGlobalMessageToast('bloop','Notifications are working.');await showSystemNotification('bloop','Test notification — alerts are working.');}
  else showGlobalMessageToast('bloop','Sound test played. System notifications still need permission.');
});

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

function showQuietWarning(text,kind='info'){
  const el=$('quietWarning');if(!el)return;
  el.textContent=text;el.dataset.kind=kind;el.classList.remove('hidden');
  clearTimeout(showQuietWarning.timer);
  showQuietWarning.timer=setTimeout(()=>el.classList.add('hidden'),7000);
}
function updateClock(){
  const now=new Date();
  const time=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const day=now.toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'});
  if($('clock'))$('clock').textContent=time;
  if($('chatClock'))$('chatClock').textContent=time;
  if($('dateClock'))$('dateClock').textContent=`${day} · ${time}`;
  const hour=now.getHours();
  const dayKey=now.toISOString().slice(0,10);
  if(hour<5&&sessionStorage.getItem('bloop:midnightWarn')!==dayKey){
    sessionStorage.setItem('bloop:midnightWarn',dayKey);
    showQuietWarning('🌙 It’s after midnight — bloop will stay quiet, but maybe get some sleep soon.','night');
  }
}
updateClock(); setInterval(updateClock,15000);

async function setupBatteryStatus(){
  if(!navigator.getBattery)return;
  try{
    const battery=await navigator.getBattery(),pill=$('batteryPill'),text=$('batteryText'),fill=$('batteryFill');
    if(!pill||!text||!fill)return;
    pill.classList.remove('hidden');
    const update=()=>{
      const pct=Math.round(battery.level*100);
      text.textContent=`${pct}%${battery.charging?' ⚡':''}`;
      fill.style.width=`${Math.max(5,pct)}%`;
      pill.classList.toggle('batteryLow',pct<=20&&!battery.charging);
      const key=`${new Date().toISOString().slice(0,10)}:${pct<=10?'10':'20'}`;
      if(pct<=20&&!battery.charging&&sessionStorage.getItem('bloop:batteryWarn')!==key){
        sessionStorage.setItem('bloop:batteryWarn',key);
        showQuietWarning(`🔋 Battery is at ${pct}%. No sound — just a heads-up.`,'battery');
      }
    };
    update();battery.addEventListener('levelchange',update);battery.addEventListener('chargingchange',update);
  }catch{}
}
setupBatteryStatus();

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
function isTabletLandscape(){return matchMedia('(min-width:700px) and (max-width:1200px) and (orientation:landscape)').matches;}
function setEmojiTray(open){$('emojiTray').classList.toggle('hidden',!open);document.body.classList.toggle('emojiDockOpen',open&&isTabletLandscape());if(open&&!isTabletLandscape())$('emojiSearch').focus();else if(!open)$('emojiSearch').blur();setTimeout(scrollBottom,30);}
$('emojiBtn').onclick=()=>setEmojiTray($('emojiTray').classList.contains('hidden'));
$('closeEmoji').onclick=()=>setEmojiTray(false);

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
function setChatCode(code=''){
  const wrap=$('chatCodeWrap'),el=$('chatCodeValue');
  if(!wrap||!el)return;
  el.textContent=code||'—';
  wrap.classList.toggle('hidden',!code);
}

function contactPresence(data, role){
  const presence=data.presence||{};
  const activity=presence.activity?.[role] || data.profiles?.[role]?.activityStatus || null;
  if(activity==='emergency')return{label:'emergency button pressed',cls:'emergency'};
  if(activity==='blurred')return{label:'screen blurred',cls:'blurred'};
  if(activity==='typing')return{label:'typing…',cls:'online'};
  if(activity==='recording-audio')return{label:'recording audio…',cls:'busy'};
  if(activity==='taking-photo')return{label:'taking a photo…',cls:'busy'};
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
      return{id,token,p,unread,state,sub,last,contactState:data.contactState||{removed:false,removedBy:null,removedAt:null,removedByMe:false},role};
    }catch{return null;}
  }));
  const valid=results.filter(Boolean);const validIds=valid.map(x=>x.id);let totalUnread=valid.reduce((n,x)=>n+x.unread,0);let newestName=valid.find(x=>x.unread)?.p?.displayName||'Friend';
  if(validIds.length!==ids.length)localStorage.setItem(roomsKey,JSON.stringify(validIds));
  const signature=JSON.stringify(valid.map(x=>[x.id,x.p.displayName,x.p.avatarUrl,x.p.username,x.unread,x.state.label,x.state.cls,x.sub,x.contactState?.removed,x.contactState?.removedBy]));
  if(signature!==lastContactsSignature){
    const frag=document.createDocumentFragment();
    valid.forEach(({id,p,unread,state,sub,last,contactState,role})=>{
      const card=document.createElement('div');card.className='contactCard';card.tabIndex=0;card.setAttribute('role','button');
      const imgWrap=document.createElement('span');imgWrap.className='contactAvatarWrap';
      const img=document.createElement('img');img.className='avatar continueAvatar';img.alt='';
      if(p.avatarUrl)img.src=p.avatarUrl;else{const initial=(p.displayName||'Friend').trim().charAt(0).toUpperCase()||'?';img.src=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#23262b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="40" font-weight="700">${initial}</text></svg>`)}`;}
      const statusDot=document.createElement('span');statusDot.className=`presenceDot contactPresenceDot ${state.cls}`;imgWrap.append(img,statusDot);
      const removed=Boolean(contactState?.removed);const removedByMe=removed&&contactState.removedBy===role;
      const copy=document.createElement('span');copy.className='contactText';
      const removalLine=removed?(removedByMe?(unread?'They messaged you — restore or delete':'You removed this chat'):'They removed this chat · you can still message them'):sub;
      copy.innerHTML=`<span class="contactNameRow"><strong>${escapeHtml(p.displayName||'Friend')}</strong><span class="contactStatus ${removed?'removed':state.cls}">${escapeHtml(removed?(removedByMe?'removed by you':'chat removed'):state.label)}</span></span><small>${p.username?'@'+escapeHtml(p.username)+' · ':''}${escapeHtml(removalLine)}</small>`;
      card.classList.toggle('contactRemoved',removed);card.classList.toggle('contactRemovedByMe',removedByMe);
      const side=document.createElement('span');side.className='contactSide';if(unread){const badge=document.createElement('span');badge.className='unreadBadge';badge.textContent=unread===1?'1 new':`${unread} new`;side.append(badge);}
      if(removedByMe){
        const restore=document.createElement('button');restore.type='button';restore.className='contactMiniAction restore';restore.textContent='Restore';restore.onclick=e=>{e.stopPropagation();restoreContact(id,localStorage.getItem(storageKey(id)));};side.append(restore);
        const del=document.createElement('button');del.type='button';del.className='contactMiniAction delete';del.textContent='Delete';del.onclick=e=>{e.stopPropagation();deleteContactAnyway(id,localStorage.getItem(storageKey(id)),p.displayName||'this chat');};side.append(del);
      }else{
        const remove=document.createElement('button');remove.type='button';remove.className='contactDelete';remove.title='Remove chat';remove.setAttribute('aria-label','Remove chat');remove.textContent='×';remove.onclick=e=>{e.stopPropagation();removeContactForBoth(id,localStorage.getItem(storageKey(id)),p.displayName||'this chat');};side.append(remove);
        const arrow=document.createElement('span');arrow.className='contactArrow';arrow.textContent='→';side.append(arrow);
      }
      card.append(imgWrap,copy,side);card.onclick=()=>resumeRoom(id,true);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();resumeRoom(id,true);}};frag.append(card);
    });
    $('contactsList').replaceChildren(frag);lastContactsSignature=signature;
  }
  $('contactsCount').textContent=valid.length?`${valid.length} saved`:'';$('contactsWidget').classList.toggle('hidden',valid.length===0);
  document.title=totalUnread?`(${totalUnread}) bloop`:'bloop';
  if(homeUnreadReady&&notify){
    for(const item of valid){
      const previous=homeUnreadByRoom.get(item.id)??0;
      if(item.unread>previous){
        const gained=item.unread-previous;
        const body=item.last?(item.last.type==='text'?(item.last.body||'New message').slice(0,100):item.last.type==='image'?'Sent a photo':item.last.type==='audio'?'Sent a voice note':'Sent a message'):`${gained} new message${gained===1?'':'s'}`;
        playTinyTing();
        showGlobalMessageToast(item.p?.displayName||'Friend',body);
        showHomeNotice(`${gained} new message${gained===1?'':'s'} from ${item.p?.displayName||'Friend'}`);
        if(document.hidden) showSystemNotification(item.p?.displayName||'Friend',body,item.id);
      }
    }
  }
  homeUnreadByRoom=new Map(valid.map(x=>[x.id,x.unread]));
  lastHomeUnreadTotal=totalUnread;homeUnreadReady=true;homeRefreshBusy=false;
}
function startHomeRefresh(){clearInterval(homeRefreshTimer);homeRefreshTimer=setInterval(()=>{if(!$('landing').classList.contains('hidden'))setupContacts({notify:true});},2000);}
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
  $('shareLink').value=`${location.origin}/?room=${encodeURIComponent(currentRoom)}&invite=${encodeURIComponent(data.shareToken)}`; if($('shareCode'))$('shareCode').value=data.quickCode||data.joinCode||''; show('share'); history.pushState({view:'share'},'','/');
};
$('copyBtn').onclick=async()=>{await navigator.clipboard.writeText($('shareLink').value);$('copyBtn').textContent='Copied ✓';setTimeout(()=>$('copyBtn').textContent='Copy',1200);};
$('chatCodeCopy')?.addEventListener('click',async()=>{const code=$('chatCodeValue')?.textContent?.trim();if(!code||code==='—')return;try{await navigator.clipboard.writeText(code);$('chatCodeCopy').textContent='Copied ✓';setTimeout(()=>$('chatCodeCopy').textContent='Copy',1100);}catch{}});
$('copyCodeBtn')?.addEventListener('click',async()=>{const code=$('shareCode')?.value||'';if(!code)return;await navigator.clipboard.writeText(code);$('copyCodeBtn').textContent='Copied ✓';setTimeout(()=>$('copyCodeBtn').textContent='Copy code',1200);});
$('customQuickCode')?.addEventListener('input',e=>{e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,4);});$('setQuickCodeBtn')?.addEventListener('click',async()=>{const code=String($('customQuickCode')?.value||'').replace(/\D/g,'').slice(0,4),status=$('quickCodeStatus');if(code.length!==4){status.textContent='Choose exactly 4 digits.';return;}const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/quick-code`,{method:'POST',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({code})});const d=await r.json().catch(()=>({}));if(!r.ok){status.textContent=d.error||'Could not set that code.';return;}$('shareCode').value=d.quickCode;$('customQuickCode').value='';status.textContent='Your code is now '+d.quickCode+' ✓';});
function formatJoinCode(value){return String(value||'').replace(/\D/g,'').slice(0,4);}
$('joinCodeInput')?.addEventListener('input',e=>{e.target.value=formatJoinCode(e.target.value);$('joinCodeStatus').textContent='';});
async function joinByCode(){
  const input=$('joinCodeInput');const status=$('joinCodeStatus');const code=formatJoinCode(input?.value);
  if(!/^\d{4}$/.test(code)){if(status)status.textContent='Enter the 4-digit bloop code.';return;}
  if(status)status.textContent='Joining…';
  try{
    const r=await fetch('/api/join-code',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});const data=await r.json();
    if(!r.ok){if(status)status.textContent=data.error||'Could not join that chat.';return;}
    currentRoom=data.roomId;authToken=data.authToken;myRole=data.role;
    localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);rememberRoom(currentRoom);
    if(status)status.textContent='Joined ✓';openChat(true);
  }catch{if(status)status.textContent='Could not sign in. Check your details and try again.';}
}
$('joinCodeBtn')?.addEventListener('click',joinByCode);$('joinCodeInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();joinByCode();}});

$('continueChatCode')?.addEventListener('input',e=>{e.target.value=formatJoinCode(e.target.value);if($('continueChatStatus'))$('continueChatStatus').textContent='';});
$('continueChatPin')?.addEventListener('input',e=>{e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,4);if($('continueChatStatus'))$('continueChatStatus').textContent='';});
async function continueExistingChat(){
  const code=formatJoinCode($('continueChatCode')?.value||'');
  const pin=String($('continueChatPin')?.value||'').replace(/\D/g,'').slice(0,4);
  const status=$('continueChatStatus');
  if(!/^\d{4}$/.test(code)){if(status)status.textContent='Enter the 4-digit chat code.';return;}
  if(pin.length!==4){if(status)status.textContent='Enter your 4-digit account PIN.';return;}
  if(status)status.textContent='Opening chat…';
  try{
    const r=await fetch('/api/continue-chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,pin})});
    const data=await r.json();
    if(!r.ok){if(status)status.textContent=data.error||'Could not continue that chat.';return;}
    currentRoom=data.roomId;authToken=data.authToken;myRole=data.role;
    localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);rememberRoom(currentRoom);
    if(status)status.textContent='Connected ✓';
    await openChat(true);
  }catch{if(status)status.textContent='Could not sign in. Check your details and try again.';}
}
$('continueChatBtn')?.addEventListener('click',continueExistingChat);
$('continueChatPin')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();continueExistingChat();}});

function formatDeviceTransferCode(value){const raw=String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,10);return raw.length>5?`${raw.slice(0,5)}-${raw.slice(5)}`:raw;}
$('deviceTransferInput')?.addEventListener('input',e=>{e.target.value=formatDeviceTransferCode(e.target.value);if($('deviceTransferStatus'))$('deviceTransferStatus').textContent='';});
async function redeemDeviceTransferCode(){
  const input=$('deviceTransferInput'),status=$('deviceTransferStatus'),code=formatDeviceTransferCode(input?.value);
  if(code.replace('-','').length!==10){if(status)status.textContent='Enter the full device-link code.';return;}
  if(status)status.textContent='Linking this device…';
  const r=await fetch('/api/device-transfer/redeem',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(status)status.textContent=d.error||'Could not link this device.';return;}
  currentRoom=d.roomId;authToken=d.authToken;myRole=d.role;
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);rememberRoom(currentRoom);
  if(status)status.textContent='Linked ✓';await openChat(true);
}
$('deviceTransferBtn')?.addEventListener('click',redeemDeviceTransferCode);
$('deviceTransferInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();redeemDeviceTransferCode();}});

let deviceTransferExpiryTimer=null;
function renderDeviceTransferExpiry(expiresAt){
  clearInterval(deviceTransferExpiryTimer);const el=$('deviceTransferExpiry');
  const tick=()=>{const ms=Number(expiresAt)-Date.now();if(!el)return;if(ms<=0){el.textContent='Expired — tap New code.';clearInterval(deviceTransferExpiryTimer);return;}const m=Math.floor(ms/60000),sec=Math.floor((ms%60000)/1000);el.textContent=`Expires in ${m}:${String(sec).padStart(2,'0')}`;};
  tick();deviceTransferExpiryTimer=setInterval(tick,1000);
}
async function createDeviceTransferCode(){
  if(!currentRoom||!authToken)return;
  const codeEl=$('deviceTransferCode'),expiry=$('deviceTransferExpiry');if(codeEl)codeEl.textContent='Creating…';if(expiry)expiry.textContent='';
  const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/device-transfer-code`,{method:'POST',headers:{'x-chat-token':authToken}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(codeEl)codeEl.textContent='Could not create code';return;}
  if(codeEl)codeEl.textContent=d.code;renderDeviceTransferExpiry(d.expiresAt);
}
$('linkDeviceBtn')?.addEventListener('click',async()=>{const dlg=$('deviceTransferDialog');if(!dlg)return;dlg.showModal();await createDeviceTransferCode();});
$('newDeviceTransferCode')?.addEventListener('click',createDeviceTransferCode);
$('copyDeviceTransferCode')?.addEventListener('click',async()=>{const code=$('deviceTransferCode')?.textContent?.trim();if(!code||code==='—'||code.includes('Creating')||code.includes('Could not'))return;try{await navigator.clipboard.writeText(code);const b=$('copyDeviceTransferCode');b.textContent='Copied ✓';setTimeout(()=>b.textContent='Copy code',1000);}catch{}});



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
  myRole=data.role;profiles=data.profiles||profiles;currentContactState=data.contactState||{removed:false,removedBy:null,removedAt:null,removedByMe:false};rememberRoom(currentRoom);await syncIdentityToRoom();await applySavedProfilePinToCurrentChat();refreshHeader();setChatCode(data.joinCode||'');
  applyContactRemovalState(currentContactState);
  const box=$('messages');box.innerHTML='';data.messages.forEach(addMessage);if(!data.messages.length)box.innerHTML='<div class="empty"><b>It’s quiet in here.</b><span>One of you has to start 😭</span></div>';
  show('chat');connectSocket();scrollBottom();
  if(pushHistory)history.pushState({view:'chat',roomId:currentRoom},'',`/chat/${encodeURIComponent(currentRoom)}`);else history.replaceState({view:'chat',roomId:currentRoom},'',`/chat/${encodeURIComponent(currentRoom)}`);
  maybeShowSetup();
}
function maybeShowSetup(){
  // v32: customization is manual from the profile button; never interrupt chat entry.
  if(currentRoom&&myRole)localStorage.setItem(setupKey(currentRoom,myRole),'done');
}

function connectSocket(){
  socket?.disconnect();socket=io({auth:{roomId:currentRoom,authToken}});
  socket.on('message',msg=>{clearEmpty();addMessage(msg);scrollBottom();if(msg.sender!==myRole){notifyIncomingMessage(msg);socket.emit('seen');}});
  socket.on('presence',data=>{lastPresence=data||{};updatePresence(lastPresence);});
  socket.on('typing',data=>{const other=myRole==='creator'?'guest':'creator';if(data?.role!==other)return;otherTyping=Boolean(data.typing);updatePresence(lastPresence);updateTypingBubble();});
  socket.on('reaction',({messageId,reactions,emoji,role})=>{updateReactions(messageId,reactions);if(role&&role!==myRole&&emoji)reactionBurst(emoji);});
  socket.on('seen',({messageIds,seenAt})=>{(messageIds||[]).forEach(id=>markSeen(id,seenAt));});
  socket.on('connect',()=>{socket.emit('seen');});
  socket.on('message-deleted',({messageId})=>markDeleted(messageId));
  socket.on('contact-state',state=>{currentContactState={...state,removedByMe:state?.removedBy===myRole};applyContactRemovalState(currentContactState);if(!$('landing').classList.contains('hidden'))setupContacts({notify:false});});
  socket.on('contact-deleted',()=>{const id=currentRoom;socket?.disconnect();if(id)forgetRoom(id);currentRoom=null;authToken=null;myRole=null;goHome(false).then(()=>showHomeNotice('That chat was permanently deleted.'));});
  socket.on('send-blocked',()=>{applyContactRemovalState({...currentContactState,removed:true,removedBy:myRole,removedByMe:true});});

  socket.on('profile',data=>{profiles[data.role]={...(profiles[data.role]||{}),displayName:data.displayName,avatarUrl:data.avatarUrl,username:data.username||''};refreshHeader();document.querySelectorAll(`[data-sender="${data.role}"] .messageAvatar`).forEach(img=>setAvatar(img,data.role));});
  socket.on('invite-declined',()=>{if(myRole==='creator'&&currentRoom){const id=currentRoom;socket?.disconnect();forgetRoom(id);currentRoom=null;authToken=null;myRole=null;goHome(false).then(()=>showHomeNotice('They didn’t accept your invite, so the chat was removed.'));}});
  socket.on('emergency-lock',()=>showEmergencyLock());
  socket.on('connect_error',err=>{if(err?.message==='app_locked')showEmergencyLock();else $('presence').textContent='connection lost';});
}
function formatLastSeen(ts){if(!ts)return'offline';const d=new Date(ts),now=new Date(),same=d.toDateString()===now.toDateString(),y=new Date(now);y.setDate(now.getDate()-1);const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(same)return`last seen today at ${time}`;if(d.toDateString()===y.toDateString())return`last seen yesterday at ${time}`;return`last seen ${d.toLocaleDateString([],{month:'short',day:'numeric'})} at ${time}`;}
function updatePresence(data={}){const other=myRole==='creator'?'guest':'creator';const online=new Set(data.online||[]);const p=$('presence'),dot=$('presenceDot');const activity=data.activity?.[other]||profiles[other]?.activityStatus;let next,cls;if(activity==='emergency'){next='emergency button pressed';cls='emergency';}else if(activity==='blurred'){next='screen blurred';cls='blurred';}else if(activity==='recording-audio'){next='recording audio…';cls='busy';}else if(activity==='taking-photo'){next='taking a photo…';cls='busy';}else if(otherTyping&&online.has(other)){next='typing…';cls='online';}else if(online.has(other)){next='online';cls='online';}else if(data.lastSeen?.[other]||profiles[other]?.lastSeen){next=formatLastSeen(data.lastSeen?.[other]||profiles[other]?.lastSeen);cls='lastseen';}else{next='offline';cls='offline';}dot.className=`presenceDot ${cls}`;if(p.textContent!==next){p.textContent=next;p.classList.remove('statusPulse');void p.offsetWidth;p.classList.add('statusPulse');}}
function updateTypingBubble(){
  $('typingBubble')?.classList.add('hidden');
  const box=$('messages');if(!box)return;
  let row=box.querySelector('.typingMessageRow');
  if(!otherTyping){row?.remove();return;}
  if(!row){
    const other=myRole==='creator'?'guest':'creator';
    row=document.createElement('div');row.className='typingMessageRow';
    const img=document.createElement('img');img.className='avatar messageAvatar';img.alt='';setAvatar(img,other);
    const bubble=document.createElement('div');bubble.className='typingDots';bubble.innerHTML='<span></span><span></span><span></span>';
    row.append(img,bubble);box.append(row);
  }
  setTimeout(scrollBottom,20);
}
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
$('refreshStatusBtn')?.addEventListener('click',async()=>{
  if(!currentRoom||!authToken)return;
  const btn=$('refreshStatusBtn');btn?.classList.add('spinning');
  try{
    await sendHeartbeat?.('active');
    const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/messages`,{headers:{'x-chat-token':authToken},cache:'no-store'});
    const data=await r.json();
    if(r.ok){profiles=data.profiles||profiles;lastPresence=data.presence||lastPresence;refreshHeader();updatePresence(lastPresence);}
  }catch{}
  setTimeout(()=>btn?.classList.remove('spinning'),350);
});


function replyPreviewText(msg){
  if(!msg)return '';
  if(msg.deleted||msg.type==='deleted')return 'Deleted message';
  if(msg.type==='image')return '📷 Photo';
  if(msg.type==='audio')return '🎙 Voice note';
  return String(msg.body||'Message').replace(/\s+/g,' ').slice(0,100);
}
function replySenderName(msg){
  if(!msg)return 'Message';
  if(msg.sender===myRole)return 'You';
  return profiles[msg.sender]?.displayName||'Friend';
}
function cancelReply(){replyTarget=null;$('replyComposer')?.classList.add('hidden');$('replyComposerText').textContent='';$('replyComposerName').textContent='';}
function startReply(msg){
  if(!msg||msg.deletedAt)return;
  replyTarget={id:Number(msg.id),sender:msg.sender,type:msg.type,body:msg.body||'',mediaUrl:msg.mediaUrl||null,deleted:false};
  $('replyComposerName').textContent=`Replying to ${replySenderName(replyTarget)}`;
  $('replyComposerText').textContent=replyPreviewText(replyTarget);
  $('replyComposer').classList.remove('hidden');
  $('input').focus();
}
function renderReplyReference(bubble,msg){
  if(!msg.replyTo)return;
  const ref=document.createElement('button');ref.type='button';ref.className='replyReference';
  const name=document.createElement('strong');name.textContent=replySenderName(msg.replyTo);
  const preview=document.createElement('span');preview.textContent=replyPreviewText(msg.replyTo);
  ref.append(name,preview);
  ref.onclick=()=>{const row=document.querySelector(`.messageRow[data-id="${msg.replyTo.id}"]`);if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('replyFlash');setTimeout(()=>row.classList.remove('replyFlash'),900);}};
  bubble.append(ref);
}
function renderMessageContent(bubble,msg){
  if(msg.type==='image'){const img=document.createElement('img');img.className='messageImage';img.src=msg.mediaUrl;img.alt='Shared image';img.loading='lazy';bubble.append(img);}
  else if(msg.type==='audio'){const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=msg.mediaUrl;bubble.append(audio);}
  else {const text=document.createElement('span');text.textContent=msg.body;bubble.append(text);appendLinkPreview(bubble,msg.body);}
}
function addMessage(msg){
  const row=document.createElement('div');row.className=`messageRow ${msg.sender===myRole?'mine':'theirs'}`;row.dataset.id=msg.id;row.dataset.sender=msg.sender;row.dataset.type=msg.type||'text';row.dataset.body=msg.body||'';row.dataset.mediaUrl=msg.mediaUrl||'';row.dataset.deleted=msg.deletedAt?'1':'0';
  if(msg.deletedAt)return;
  const avatar=document.createElement('img');avatar.className='avatar messageAvatar';avatar.alt='';setAvatar(avatar,msg.sender);
  const wrap=document.createElement('div');wrap.className='messageWrap';const bubble=document.createElement('div');bubble.className='msg';
  renderReplyReference(bubble,msg);
  renderMessageContent(bubble,msg);
  const meta=document.createElement('div');meta.className='meta';
  const timeSpan=document.createElement('span');timeSpan.textContent=new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});meta.append(timeSpan);
  if(msg.sender===myRole&&!msg.deletedAt){const receipt=document.createElement('span');receipt.className='receipt';receipt.dataset.receiptFor=msg.id;receipt.textContent=msg.seenAt?'✓✓ seen':'✓ sent';meta.append(receipt);}
  const actions=document.createElement('div');actions.className='msgActions';
  if(!msg.deletedAt){const reply=document.createElement('button');reply.type='button';reply.className='messageReplyBtn';reply.title='Reply';reply.setAttribute('aria-label','Reply to message');reply.textContent='↩';reply.onclick=()=>startReply(msg);actions.append(reply);const react=document.createElement('button');react.type='button';react.title='React';react.textContent='♡';react.onclick=e=>openReactionMenu(e.currentTarget,msg.id);actions.append(react);if(msg.sender===myRole){const del=document.createElement('button');del.type='button';del.title='Delete';del.textContent='⌫';del.onclick=()=>{if(confirm('Delete this message? It will disappear from the chat.'))socket?.emit('delete-message',msg.id);};actions.append(del);}}
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
function markDeleted(id){document.querySelector(`.messageRow[data-id="${id}"]`)?.remove();}
function updateReactions(id,reactions){const bar=document.querySelector(`.messageRow[data-id="${id}"] .reactions`);if(!bar)return;bar.innerHTML='';const groups=new Map();reactions.forEach(r=>groups.set(r.emoji,(groups.get(r.emoji)||0)+1));groups.forEach((count,emoji)=>{const b=document.createElement('button');b.type='button';b.textContent=`${emoji}${count>1?' '+count:''}`;b.onclick=()=>socket?.emit('react',{messageId:id,emoji});bar.append(b);});}
function openReactionMenu(target,messageId,longPress=false){
  document.querySelector('.reactionMenu')?.remove();const menu=document.createElement('div');menu.className=`reactionMenu${longPress?' reactionMenuLong':''}`;
  const head=document.createElement('div');head.className='reactionHead';head.innerHTML='<strong>Message</strong><span><button type="button" class="replyMenuBtn">Reply</button><button type="button" class="closeReactionBtn">×</button></span>';head.querySelector('.replyMenuBtn').onclick=()=>{const row=document.querySelector(`.messageRow[data-id="${messageId}"]`);const cached=row?{id:Number(messageId),sender:row.dataset.sender,type:row.dataset.type||'text',body:row.dataset.body||'',mediaUrl:row.dataset.mediaUrl||null}:null;if(cached)startReply(cached);menu.remove();};head.querySelector('.closeReactionBtn').onclick=()=>menu.remove();const ownRow=document.querySelector(`.messageRow[data-id="${messageId}"]`);if(ownRow?.dataset.sender===myRole){const del=document.createElement('button');del.type='button';del.className='reactionDeleteBtn';del.textContent='Delete';del.onclick=()=>{if(confirm('Delete this message? It will disappear from the chat.'))socket?.emit('delete-message',Number(messageId));menu.remove();};head.querySelector('span').prepend(del);}menu.append(head);
  const grid=document.createElement('div');grid.className='reactionGrid';reactionChoices.forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=e=>{e.stopPropagation();socket?.emit('react',{messageId,emoji});reactionBurst(emoji);menu.remove();};grid.append(b);});menu.append(grid);
  document.body.append(menu);const rect=target.getBoundingClientRect();const width=Math.min(390,window.innerWidth-20);menu.style.width=`${width}px`;menu.style.left=`${Math.max(10,Math.min(window.innerWidth-width-10,rect.left+rect.width/2-width/2))}px`;menu.style.top=`${Math.max(10,Math.min(window.innerHeight-330,rect.top-90))}px`;
  setTimeout(()=>document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.remove();},{once:true}),0);
}
function reactionBurst(emoji){const layer=document.createElement('div');layer.className='reactionBurst';for(let i=0;i<18;i++){const s=document.createElement('span');s.textContent=emoji;s.style.setProperty('--x',`${(Math.random()*120-60).toFixed(1)}vw`);s.style.setProperty('--r',`${Math.random()*360-180}deg`);s.style.setProperty('--d',`${Math.random()*.35}s`);s.style.left=`${30+Math.random()*40}%`;layer.append(s);}document.body.append(layer);setTimeout(()=>layer.remove(),1500);}

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
function syncVisualViewport(){
  const vv=window.visualViewport;const h=vv?.height||window.innerHeight;document.documentElement.style.setProperty('--visual-height',`${h}px`);
  const keyboardLikely=Boolean(vv&&isTabletLandscape()&&document.activeElement===$('input')&&h<window.innerHeight*.82);
  document.body.classList.toggle('ipadKeyboardOpen',keyboardLikely);
  if(keyboardLikely)setTimeout(scrollBottom,20);
}
window.visualViewport?.addEventListener('resize',syncVisualViewport);window.visualViewport?.addEventListener('scroll',syncVisualViewport);window.addEventListener('resize',syncVisualViewport);syncVisualViewport();
$('linkBtn').onclick=()=>{$('linkTray').classList.toggle('hidden');if(!$('linkTray').classList.contains('hidden'))$('linkInput').focus();};
$('closeLinkTray').onclick=()=>{$('linkTray').classList.add('hidden');$('linkInput').value='';};
$('sendLinkBtn').onclick=()=>{const value=$('linkInput').value.trim();if(!value||!socket?.connected)return;try{const u=new URL(value);const h=u.hostname.replace(/^www\./,'');if(!(h==='youtu.be'||h.endsWith('youtube.com')||h==='pin.it'||h.endsWith('pinterest.com')))return alert('Paste a YouTube or Pinterest link.');}catch{return alert('That link does not look valid.');}socket.emit('message',{body:value,replyToId:replyTarget?.id||null});cancelReply();$('linkInput').value='';$('linkTray').classList.add('hidden');};

$('cancelReply')?.addEventListener('click',cancelReply);
$('form').addEventListener('submit',e=>{e.preventDefault();const value=$('input').value.trim();if(!value||!socket?.connected)return;setTyping(false);socket.emit('message',{body:value,replyToId:replyTarget?.id||null});cancelReply();$('input').value='';$('input').style.height='auto';setEmojiTray(false);});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit();}});
$('input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,96)+'px';setTyping(Boolean(e.target.value.trim()));});$('input').addEventListener('focus',()=>{document.body.classList.toggle('ipadComposerSide',isTabletLandscape());setTimeout(syncVisualViewport,80);});$('input').addEventListener('blur',()=>{setTyping(false);document.body.classList.remove('ipadKeyboardOpen','ipadComposerSide');});
$('imageBtn').onclick=()=>$('imageInput').click();$('imageInput').onchange=async()=>{const file=$('imageInput').files[0];if(file)await uploadMedia('image',file);$('imageInput').value='';};
let cameraActivityOpen=false;
$('cameraBtn').onclick=async()=>{cameraActivityOpen=true;await setCurrentChatActivity('taking-photo');$('cameraInput').click();};
$('cameraInput').onchange=async()=>{try{const file=$('cameraInput').files[0];if(file)await uploadMedia('image',file);}finally{$('cameraInput').value='';cameraActivityOpen=false;await setCurrentChatActivity('active');}};
window.addEventListener('focus',()=>{if(!cameraActivityOpen)return;setTimeout(()=>{if(cameraActivityOpen){cameraActivityOpen=false;setCurrentChatActivity('active');}},600);});
async function uploadMedia(kind,blob){const headers={'x-chat-token':authToken,'content-type':blob.type||'application/octet-stream'};if(replyTarget?.id)headers['x-reply-to']=String(replyTarget.id);const r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/${kind}`,{method:'POST',headers,body:blob});const data=await r.json().catch(()=>({}));if(!r.ok)alert(data.error||'Upload failed.');else cancelReply();return data;}
$('voiceBtn').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return alert('Voice recording is not supported in this browser.');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedChunks=[];const preferred=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};recorder.onstop=()=>stream.getTracks().forEach(t=>t.stop());recorder.start();await setCurrentChatActivity('recording-audio');recordStarted=Date.now();$('recordTime').textContent='Recording 0:00';$('recordingBar').classList.remove('hidden');$('form').classList.add('recording');recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStarted)/1000);$('recordTime').textContent=`Recording ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},250);}catch{setCurrentChatActivity('active');alert('Microphone permission is needed for voice notes.');}};
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(recordTimer);$('recordingBar').classList.add('hidden');$('form').classList.remove('recording');setCurrentChatActivity('active');}
$('cancelRecord').onclick=()=>{stopRecording();recordedChunks=[];};$('sendRecord').onclick=async()=>{if(!recorder)return;const type=recorder.mimeType||'audio/webm';stopRecording();await new Promise(r=>setTimeout(r,80));const blob=new Blob(recordedChunks,{type});recordedChunks=[];if(blob.size)await uploadMedia('audio',blob);};

async function uploadAvatarFrom(inputId){
  const input=$(inputId),file=input?.files?.[0];if(!file)return null;
  try{
    let r,data;
    if(currentRoom&&authToken&&myRole){
      r=await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/upload/avatar`,{method:'POST',headers:{'x-chat-token':authToken,'content-type':file.type},body:file});data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Could not upload photo.');
      profiles[myRole]=data;refreshHeader();
    }else{
      if(!(await ensurePeopleAccount()))throw new Error('Save your bloop account before adding a photo.');
      r=await fetch('/api/people/avatar',{method:'POST',headers:{...peopleHeaders(),'content-type':file.type},body:file});data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Could not upload photo.');
      localStorage.setItem('bloop:accountAvatar:v1',data.avatarUrl||'');
      if($('profileAvatar')&&data.avatarUrl)$('profileAvatar').src=data.avatarUrl;
    }
    return data;
  }catch(err){if($('profileIdentityStatus'))$('profileIdentityStatus').textContent=err?.message||'Could not upload photo.';return null;}
  finally{if(input)input.value='';}
}
function openProfileDialog(){
  if(currentRoom&&myRole)refreshHeader();
  applyAppearance();
  const identity=getIdentity()||{},mine=(currentRoom&&myRole?profiles[myRole]:{})||{};
  if($('profileDisplayName'))$('profileDisplayName').value=identity.name||mine.displayName||'';
  if($('profileUsername'))$('profileUsername').value=identity.username||mine.username||'';
  if($('profileDevicePin'))$('profileDevicePin').value=localStorage.getItem(profileDevicePinKey)||'';
  const accountAvatar=localStorage.getItem('bloop:accountAvatar:v1');if(!currentRoom&&accountAvatar&&$('profileAvatar'))$('profileAvatar').src=accountAvatar;
  if($('profileIdentityStatus'))$('profileIdentityStatus').textContent='';
  if($('deletePeopleStatus'))$('deletePeopleStatus').textContent='';
  $('profileDialog').showModal();
}
$('profileBtn').onclick=openProfileDialog;
$('homeEditProfileBtn')?.addEventListener('click',openProfileDialog);
$('avatarPick').onclick=()=>$('avatarInput').click();$('avatarInput').onchange=()=>uploadAvatarFrom('avatarInput');
async function saveDevicePinAcrossChats(pin){
  if(!/^\d{4}$/.test(pin))throw new Error('Account PIN must be 4 digits.');
  localStorage.setItem(profileDevicePinKey,pin);
  const rooms=getRooms();let saved=0,failed=0;
  await Promise.allSettled(rooms.map(async roomId=>{
    const token=localStorage.getItem(storageKey(roomId));if(!token)return;
    try{const r=await fetch(`/api/rooms/${encodeURIComponent(roomId)}/device-pin`,{method:'POST',headers:{'content-type':'application/json','x-chat-token':token},body:JSON.stringify({pin})});if(r.ok)saved++;else failed++;}catch{failed++;}
  }));
  return {saved,failed};
}

async function saveIdentityAcrossChats(name,username){
  localStorage.setItem(identityKey,JSON.stringify({name,username}));
  if(localStorage.getItem(peopleTokenKey)){try{await fetch('/api/people/register',{method:'POST',headers:{'content-type':'application/json',...peopleHeaders()},body:JSON.stringify({displayName:name,username,pin:localStorage.getItem(profileDevicePinKey)||''})});}catch{}}
  const rooms=getRooms();
  await Promise.allSettled(rooms.map(async id=>{
    const token=localStorage.getItem(storageKey(id));if(!token)return;
    await fetch(`/api/rooms/${encodeURIComponent(id)}/profile`,{method:'PATCH',headers:{'content-type':'application/json','x-chat-token':token},body:JSON.stringify({displayName:name,username})});
  }));
  if(currentRoom&&myRole){profiles[myRole]={...(profiles[myRole]||{}),displayName:name,username};refreshHeader();}
}
$('saveProfile').onclick=async()=>{
  const name=$('profileDisplayName')?.value.trim().slice(0,24)||'';
  const username=$('profileUsername')?.value.trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,20)||'';
  const rawPin=String($('profileDevicePin')?.value||'').replace(/\D/g,'').slice(0,4);
  if(!name||!username){if($('profileIdentityStatus'))$('profileIdentityStatus').textContent='Add both a name and username.';return;}
  if(rawPin.length!==4){if($('profileIdentityStatus'))$('profileIdentityStatus').textContent='Account PIN must be exactly 4 digits.';return;}
  const btn=$('saveProfile');btn.disabled=true;btn.textContent='Saving…';
  try{
    localStorage.setItem(profileDevicePinKey,rawPin);
    localStorage.setItem(identityKey,JSON.stringify({name,username}));
    const accountRes=await fetch('/api/people/register',{method:'POST',headers:{'content-type':'application/json',...peopleHeaders()},body:JSON.stringify({displayName:name,username,pin:rawPin})});
    const accountData=await accountRes.json().catch(()=>({}));
    if(!accountRes.ok)throw new Error(accountData.error||'Could not save your bloop account.');
    if(accountData.peopleToken)localStorage.setItem(peopleTokenKey,accountData.peopleToken);
    await saveIdentityAcrossChats(name,username);
    const pinResult=await saveDevicePinAcrossChats(rawPin);
    if(currentRoom&&authToken)await linkCurrentRoomToAccount();
    if($('profileIdentityStatus'))$('profileIdentityStatus').textContent='bloop account saved ✓';
    await loadPeopleDashboard().catch(()=>{});
    setTimeout(()=>$('profileDialog').close(),500);
  }catch(err){if($('profileIdentityStatus'))$('profileIdentityStatus').textContent=err?.message||'Could not save your bloop account.';}finally{btn.disabled=false;btn.textContent='Save';}
};
async function applySavedProfilePinToCurrentChat(){
  const pin=localStorage.getItem(profileDevicePinKey);if(!pin||!/^\d{4}$/.test(pin)||!currentRoom||!authToken)return;
  try{await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}/device-pin`,{method:'POST',headers:{'content-type':'application/json','x-chat-token':authToken},body:JSON.stringify({pin})});}catch{}
}
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

async function deletePeopleAccount(){
  const status=$('deletePeopleStatus'),token=localStorage.getItem(peopleTokenKey);
  if(!token){if(status)status.textContent='No bloop account is connected on this device.';return;}
  if(!confirm('Delete your bloop account? Your chats and messages will stay, but friend requests and friendships will be removed.'))return;
  if(status)status.textContent='Deleting bloop account…';
  try{const r=await fetch('/api/people/me',{method:'DELETE',headers:{'x-people-token':token}}),d=await r.json().catch(()=>({}));if(!r.ok){if(status)status.textContent=d.error||'Could not delete bloop account.';return;}localStorage.removeItem(peopleTokenKey);if(status)status.textContent='bloop account deleted ✓';}catch{if(status)status.textContent='Could not delete bloop account.';}
}
$('deletePeopleAccountBtn')?.addEventListener('click',deletePeopleAccount);

function peopleHeaders(){const t=localStorage.getItem(peopleTokenKey);return t?{'x-people-token':t}:{};}
async function ensurePeopleAccount(){
  const identity=getIdentity(),status=$('peopleStatus'),pin=localStorage.getItem(profileDevicePinKey)||'';
  if(!identity?.name||!identity?.username||!/^\d{4}$/.test(pin)){if(status)status.textContent='Set your name, username and 4-digit account PIN in Edit profile first.';return false;}
  const r=await fetch('/api/people/register',{method:'POST',headers:{'content-type':'application/json',...peopleHeaders()},body:JSON.stringify({displayName:identity.name,username:identity.username,pin})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(status)status.textContent=d.error||'Could not set up your bloop account.';return false;}
  if(d.peopleToken)localStorage.setItem(peopleTokenKey,d.peopleToken);
  if(status)status.textContent='';
  return true;
}
function personRow(p,actions=''){
  const initial=escapeHtml((p.displayName||p.username||'?').trim().charAt(0).toUpperCase()||'?');
  const avatar=p.avatarUrl?`<img src="${escapeHtml(p.avatarUrl)}" alt="">`:initial;
  return `<div class="personRow"><div class="personAvatar">${avatar}</div><div class="personInfo"><strong>${escapeHtml(p.displayName||p.username)}</strong><span>@${escapeHtml(p.username)}</span></div><div class="personActions">${actions}</div></div>`;
}
function directoryActions(p){
  const message=`<button class="primary smallPeopleBtn" data-message-person="${p.id}">Message</button>`;
  if(p.state==='friends')return message+`<span class="requestState">Friends</span>`;
  if(p.state==='outgoing')return message+`<span class="requestState">Requested</span>`;
  if(p.state==='incoming')return message+`<span class="requestState">Request waiting</span>`;
  return message+`<button class="secondary" data-add-person="${p.id}">Add friend</button>`;
}
async function loadPeopleDirectory(q=''){
  if(!(await ensurePeopleAccount()))return;
  const target=$('peopleDirectoryList');if(target)target.innerHTML='<div class="peopleEmpty">Loading people…</div>';
  const r=await fetch(`/api/people/discover${q?`?q=${encodeURIComponent(q)}`:''}`,{headers:peopleHeaders(),cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(target)target.innerHTML=`<div class="peopleEmpty">${escapeHtml(d.error||'Could not load bloop accounts.')}</div>`;return;}
  const rows=d.people||[];
  if(target)target.innerHTML=rows.length?rows.map(p=>personRow(p,directoryActions(p))).join(''):'<div class="peopleEmpty">Nobody else is in the bloop directory yet.</div>';
}
async function loadPeopleDashboard(){
  if(!(await ensurePeopleAccount()))return;
  const r=await fetch('/api/people/me',{headers:peopleHeaders(),cache:'no-store'}),d=await r.json().catch(()=>({}));
  if(r.ok){
    $('friendRequestCount').textContent=d.incoming?.length?`${d.incoming.length} waiting`:'';
    $('friendsCount').textContent=d.friends?.length?String(d.friends.length):'';
    $('friendRequestsList').innerHTML=d.incoming?.length?d.incoming.map(p=>personRow(p,`<button class="secondary" data-accept-request="${p.id}">Accept</button><button class="tinyBtn" data-decline-request="${p.id}">Decline</button>`)).join(''):'<div class="peopleEmpty">No friend requests.</div>';
    $('friendsList').innerHTML=d.friends?.length?d.friends.map(p=>personRow(p,`<button class="primary smallPeopleBtn" data-message-person="${p.id}">Message</button>`)).join(''):'<div class="peopleEmpty">No friends yet.</div>';
  }
  await loadPeopleDirectory();
}
async function searchPeople(){
  if(!(await ensurePeopleAccount()))return;
  const q=String($('peopleSearchInput')?.value||'').trim().replace(/^@/,'');
  const status=$('peopleStatus');
  if(q.length<2){status.textContent='Type at least 2 characters.';return;}
  status.textContent='Searching…';
  const r=await fetch(`/api/people/discover?q=${encodeURIComponent(q)}`,{headers:peopleHeaders(),cache:'no-store'}),d=await r.json().catch(()=>({}));
  if(!r.ok){status.textContent=d.error||'Search failed.';return;}
  status.textContent='';
  const rows=d.people||[];
  $('peopleSearchResults').innerHTML=rows.length?rows.map(p=>personRow(p,directoryActions(p))).join(''):'<div class="peopleEmpty">No usernames found.</div>';
}
async function sendFriendRequest(id){
  const r=await fetch(`/api/people/${encodeURIComponent(id)}/request`,{method:'POST',headers:peopleHeaders()}),d=await r.json().catch(()=>({}));
  if(!r.ok)return alert(d.error||'Could not send request.');
  await loadPeopleDashboard();if($('peopleSearchInput')?.value.trim())await searchPeople();
}
async function respondFriendRequest(id,action){
  const r=await fetch(`/api/people/requests/${id}/respond`,{method:'POST',headers:{'content-type':'application/json',...peopleHeaders()},body:JSON.stringify({action})}),d=await r.json().catch(()=>({}));
  if(!r.ok)return alert(d.error||'Could not update request.');
  await loadPeopleDashboard();
}
async function messagePerson(id){
  const r=await fetch(`/api/people/${encodeURIComponent(id)}/message`,{method:'POST',headers:peopleHeaders()}),d=await r.json().catch(()=>({}));
  if(!r.ok)return alert(d.error||'Could not open chat.');
  currentRoom=d.roomId;authToken=d.authToken;myRole=d.role;
  localStorage.setItem(storageKey(currentRoom),authToken);localStorage.setItem(roleKey(currentRoom),myRole);rememberRoom(currentRoom);
  await openChat(true);
}
function setHomeTab(tab){
  const people=tab==='people';
  $('landing').classList.toggle('peopleMode',people);$('peoplePanel').classList.toggle('hidden',!people);
  $('homeChatsTab').classList.toggle('active',!people);$('homePeopleTab').classList.toggle('active',people);
  if(people)loadPeopleDashboard();
}
$('homeChatsTab')?.addEventListener('click',()=>setHomeTab('chats'));
$('homePeopleTab')?.addEventListener('click',()=>setHomeTab('people'));
$('peopleSearchBtn')?.addEventListener('click',searchPeople);
$('refreshPeopleBtn')?.addEventListener('click',()=>loadPeopleDashboard());
$('peopleSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPeople();}});
$('peoplePanel')?.addEventListener('click',e=>{
  const add=e.target.closest('[data-add-person]'),accept=e.target.closest('[data-accept-request]'),decline=e.target.closest('[data-decline-request]'),msg=e.target.closest('[data-message-person]');
  if(add)sendFriendRequest(add.dataset.addPerson);else if(accept)respondFriendRequest(accept.dataset.acceptRequest,'accept');else if(decline)respondFriendRequest(decline.dataset.declineRequest,'decline');else if(msg)messagePerson(msg.dataset.messagePerson);
});
setTimeout(()=>{if(getIdentity()?.username)ensurePeopleAccount().catch(()=>{});},500);

function showEmergencyLock(){socket?.disconnect();setTyping(false);$('lockScreen').classList.remove('hidden');$('unlockPassword').value='';$('unlockError').textContent='';setTimeout(()=>$('unlockPassword').focus(),50);}
function hideEmergencyLock(){$('lockScreen').classList.add('hidden');}
$('unlockForm').addEventListener('submit',async e=>{e.preventDefault();const password=$('unlockPassword').value;const r=await fetch('/api/emergency/unlock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});const data=await r.json().catch(()=>({}));if(!r.ok){$('unlockError').textContent=data.error||'Could not unlock.';$('unlockPassword').select();return;}hideEmergencyLock();location.reload();});
async function bookmarkbloop(){
  const target=currentRoom&&authToken?`${location.origin}/chat/${encodeURIComponent(currentRoom)}`:`${location.origin}/`;
  const hint=$('bookmarkHint');
  try{
    if(navigator.share){
      await navigator.share({title:'bloop',text:'bloop',url:target});
      if(hint)hint.textContent='Use your browser share menu to Add to Home Screen or save the page.';
      return;
    }
  }catch(err){if(err?.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(target);}catch{}
  const isMac=/Mac|iPhone|iPad|iPod/.test(navigator.platform)||/Mac OS|iPhone|iPad/.test(navigator.userAgent);
  const msg=isMac?'Link copied. In Safari press ⌘D, or Share → Add to Home Screen.':'Link copied. Use your browser bookmark button to save bloop.';
  if(hint)hint.textContent=msg;else alert(msg);
}
['bookmarkBtn','dialogBookmarkBtn','setupBookmarkBtn'].forEach(id=>$(id)?.addEventListener('click',bookmarkbloop));

const emergencySearches=['cats','dogs','cute capybaras','space facts','easy pasta recipes','funny animals','sunsets','house plants','cloud pictures','football scores','ocean waves','pandas','weather today','best pancakes'];
async function emergencyExit(){
  const q=emergencySearches[Math.floor(Math.random()*emergencySearches.length)];
  try{await Promise.race([broadcastActivityStatus('emergency'),new Promise(r=>setTimeout(r,220))]);}catch{}
  location.assign(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
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





function installSwipeToReply(){
  const box=$('messages');
  if(!box||box.dataset.swipeReplyReady==='1')return;
  box.dataset.swipeReplyReady='1';
  let row=null,startX=0,startY=0,axis=null;
  const threshold=52,maxDrag=76;
  const messageFromRow=r=>({
    id:Number(r.dataset.id),sender:r.dataset.sender,type:r.dataset.type||'text',
    body:r.dataset.body||'',mediaUrl:r.dataset.mediaUrl||null,
    deletedAt:r.dataset.deleted==='1'?Date.now():null
  });
  function finish(doReply=false){
    if(!row)return;
    const target=row;
    target.classList.remove('swipingReply','swipeReplyReady');
    target.classList.add('replySnapBack');
    target.style.transform='';
    setTimeout(()=>target.classList.remove('replySnapBack'),190);
    if(doReply){
      const msg=messageFromRow(target);
      if(msg.id&&!msg.deletedAt){navigator.vibrate?.(12);startReply(msg);}
    }
    row=null;axis=null;
  }
  box.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest('button,a,input,textarea,audio,video'))return;
    row=e.target.closest('.messageRow');
    if(!row)return;
    startX=e.clientX;startY=e.clientY;axis=null;
    if(!row.querySelector('.swipeReplyCue')){
      const cue=document.createElement('span');cue.className='swipeReplyCue';cue.textContent='↩';row.append(cue);
    }
  },{passive:true});
  box.addEventListener('pointermove',e=>{
    if(!row)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!axis&&Math.max(Math.abs(dx),Math.abs(dy))>7)axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(axis==='y'){finish(false);return;}
    if(axis!=='x')return;
    const distance=Math.max(0,dx);
    if(distance<=0){row.style.transform='';row.classList.remove('swipeReplyReady');return;}
    const drag=Math.min(maxDrag,distance*.72);
    row.classList.add('swipingReply');
    row.style.transform=`translateX(${drag}px)`;
    row.classList.toggle('swipeReplyReady',distance>=threshold);
  },{passive:true});
  box.addEventListener('pointerup',e=>{
    if(!row)return;
    finish(axis==='x'&&(e.clientX-startX)>=threshold);
  },{passive:true});
  box.addEventListener('pointercancel',()=>finish(false),{passive:true});
}
installSwipeToReply();



document.addEventListener('visibilitychange',()=>{
  if(!socket?.connected)return;
  socket.emit(document.hidden?'presence-away':'presence-back');
});
window.addEventListener('pagehide',()=>{if(socket?.connected)socket.emit('presence-away');});
window.addEventListener('pageshow',()=>{if(socket?.connected)socket.emit('presence-back');});


// v38 stability + account UI
function v38OpenProfile(){
  const identity=getIdentity()||{};
  if($('profileDisplayName'))$('profileDisplayName').value=identity.name||'';
  if($('profileUsername'))$('profileUsername').value=identity.username||'';
  if($('profileDevicePin'))$('profileDevicePin').value=localStorage.getItem(profileDevicePinKey)||'';
  if(currentRoom&&myRole)setAvatar($('profileAvatar'),myRole); else {const av=localStorage.getItem('bloop:accountAvatar:v1');if(av&&$('profileAvatar'))$('profileAvatar').src=av;}
  $('profileDialog')?.showModal();
}
$('homeEditProfileBtn')?.addEventListener('click',v38OpenProfile);
// Original chat profile handler remains; this makes it explicit and reliable too.
$('profileBtn')?.addEventListener('click',v38OpenProfile);
function v38SkipIdentity(){localStorage.setItem(identitySkippedKey,'1');$('identityDialog')?.close();}
$('identityCloseBtn')?.addEventListener('click',v38SkipIdentity);$('identityLaterBtn')?.addEventListener('click',v38SkipIdentity);

async function v38AccountSignIn(){
 const name=$('accountSignInName')?.value.trim()||'',username=$('accountSignInUsername')?.value.trim().replace(/^@+/,'')||'',pin=String($('accountSignInPin')?.value||'').replace(/\D/g,'').slice(0,4),status=$('accountSignInStatus');
 if(!name||username.length<3||pin.length!==4){if(status)status.textContent='Enter your name, username and 4-digit PIN.';return;}
 try{const res=await fetch('/api/people/sign-in',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({displayName:name,username,pin})});const data=await res.json().catch(()=>({}));if(!res.ok){if(status)status.textContent=data.error||'Could not sign in.';return;}localStorage.setItem(peopleTokenKey,data.peopleToken);localStorage.setItem(identityKey,JSON.stringify({name:data.profile.displayName,username:data.profile.username}));localStorage.setItem(profileDevicePinKey,pin);const rooms=getRooms();for(const chat of data.chats||[]){localStorage.setItem(storageKey(chat.roomId),chat.authToken);localStorage.setItem(roleKey(chat.roomId),chat.role);if(!rooms.includes(chat.roomId))rooms.unshift(chat.roomId);}localStorage.setItem(roomsKey,JSON.stringify(rooms.slice(0,30)));if(status)status.textContent=`Signed in ✓${data.migratedPin?' Account PIN upgraded.':''} ${data.chats?.length||0} saved chat${data.chats?.length===1?'':'s'} loaded.`;await setupContacts({notify:false});}catch{if(status)status.textContent='Could not sign in. Check your details and try again.';}
}
$('accountSignInPin')?.addEventListener('input',e=>e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,4));$('accountSignInBtn')?.addEventListener('click',v38AccountSignIn);

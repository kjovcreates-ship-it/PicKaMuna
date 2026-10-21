import {firebaseConfig,iceServers,hasTurn} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore,doc,setDoc,updateDoc,onSnapshot,collection,addDoc,runTransaction,serverTimestamp,arrayRemove} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=id=>document.getElementById(id),say=s=>$('groupStatus').textContent=s,delay=ms=>new Promise(r=>setTimeout(r,ms));
const db=getFirestore(getApps().length?getApp():initializeApp(firebaseConfig));
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeGen=()=>Array.from(crypto.getRandomValues(new Uint32Array(6)),n=>alphabet[n%alphabet.length]).join('');
const idGen=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join('');
let room=null,code='',me='',host='',members=[],camera=null,peers=new Map(),unsubs=[],busy=false,version=0,round='',shots={},buffers=new Map(),outgoing=new Map(),retryTimers=new Map(),entering=false,layout='collage',filter='vintage',paper='cream',frame='classic',sticker=[],stickerDensity='medium',grain=18;
const GROUP_VIDEO={width:{ideal:640,max:640},height:{ideal:480,max:480},frameRate:{ideal:15,max:15}};
const slots=[...document.querySelectorAll('.group-slot')],papers={cream:'#eee4cd',red:'#e4a49a',green:'#b8c3a6',blue:'#a9c0c7',dark:'#252722'},filters={vintage:'sepia(.28) contrast(1.09) saturate(.82) brightness(1.04)',original:'none',mono:'grayscale(1) contrast(1.13)',sepia:'sepia(.85) contrast(1.05)',soft:'saturate(.65) brightness(1.1) contrast(.9)'};
function refresh(){const active=!!room,ready=members.filter(id=>id!==me).every(id=>peers.get(id)?.channel?.readyState==='open'&&peers.get(id)?.pc.connectionState==='connected');$('groupCreate').disabled=$('groupJoin').disabled=active;$('groupLeave').hidden=$('groupRoomDetails').hidden=!active;$('groupStart').disabled=!active||me!==host||busy||members.length<2||!ready;$('groupLocalState').textContent=camera?'LIVE':'OFF AIR';const count=layout==='collage'?1:4;$('groupDownload').disabled=$('groupDownloadJpg').disabled=!(members.length>=2&&members.every(id=>Array.from({length:count},(_,i)=>shots[id]?.[i]).every(Boolean)));slots.forEach((slot,i)=>{const id=members.filter(x=>x!==me)[i],peer=peers.get(id);slot.querySelector('.remote-label').firstChild.textContent=`FRIEND ${i+2} `;slot.querySelector('.remote-label span').textContent=!id?'WAITING':peer?.pc.connectionState==='connected'?'LIVE':'CONNECTING';const v=slot.querySelector('video');if(v.srcObject!==(peer?.media||null)){v.srcObject=peer?.media||null;if(v.srcObject)v.play().catch(()=>{})}})}
async function leave(){for(const t of retryTimers.values())clearTimeout(t);retryTimers.clear();outgoing.clear();const old=room,id=me;version++;unsubs.splice(0).forEach(fn=>fn());for(const p of peers.values()){clearTimeout(p.restartTimer);p.pc.close()}peers.clear();camera?.getTracks().forEach(t=>t.stop());camera=null;$('groupLocal').srcObject=null;room=null;code=me=host='';members=[];shots={};buffers.clear();busy=false;$('groupPhotos').replaceChildren();$('groupCountdown').hidden=true;refresh();if(old&&id)try{await updateDoc(old,{members:arrayRemove(id)})}catch(e){console.warn(e)}}
$('groupLeave').onclick=async()=>{await leave();history.replaceState(null,'',location.pathname);say('You left the group.')};
window.addEventListener('pagehide',()=>{camera?.getTracks().forEach(t=>t.stop());for(const p of peers.values())p.pc.close()});
const watch=(ref,cb)=>unsubs.push(onSnapshot(ref,cb,e=>say('Firebase: '+e.message)));
async function signal(to,type,value){if(room)await addDoc(collection(room,'signals'),{from:me,to,type,value,createdAt:serverTimestamp()})}
function send(to,obj){const c=peers.get(to)?.channel;if(c?.readyState==='open')c.send(JSON.stringify(obj))}
function sendAll(obj){for(const id of members)if(id!==me)send(id,obj)}
async function configureVideoSender(sender){
  if(!sender.getParameters||!sender.setParameters)return;
  const params=sender.getParameters();
  if(!params.encodings?.length)return;
  params.encodings=params.encodings.map(encoding=>({...encoding,maxBitrate:300000,maxFramerate:15,scaleResolutionDownBy:1}));
  await sender.setParameters(params);
}
function peer(id){if(peers.has(id))return peers.get(id);const pc=new RTCPeerConnection({iceServers}),p={pc,media:new MediaStream(),channel:null,pending:[],offered:false,restarts:0,restartTimer:null};peers.set(id,p);camera.getTracks().forEach(t=>{const sender=pc.addTrack(t,camera);if(t.kind==='video')configureVideoSender(sender).catch(err=>console.warn('Video sender quality:',err))});pc.ontrack=e=>{const tracks=e.streams[0]?.getTracks()||[e.track];for(const t of tracks)if(!p.media.getTracks().some(a=>a.id===t.id))p.media.addTrack(t);refresh()};pc.onicecandidate=e=>{if(e.candidate)signal(id,'ice',e.candidate.toJSON()).catch(console.error)};pc.onconnectionstatechange=()=>{refresh();if(pc.connectionState==='connected'){clearTimeout(p.restartTimer);p.restarts=0}else if(pc.connectionState==='disconnected'||pc.connectionState==='failed'){say('A camera connection dropped. Trying to reconnect…'+(hasTurn?'':' TURN may be required.'));schedulePeerRestart(id)}};pc.ondatachannel=e=>channel(id,e.channel);refresh();return p}
function schedulePeerRestart(id){
  const p=peers.get(id);
  if(!p||me>=id||p.restarts>=4||!room)return; // deterministic offerer avoids negotiation collisions
  clearTimeout(p.restartTimer);
  p.restartTimer=setTimeout(async()=>{
    if(!room||peers.get(id)!==p||p.pc.connectionState==='connected'||p.pc.signalingState!=='stable')return;
    p.restarts++;
    try{
      p.pc.restartIce();
      const d=await p.pc.createOffer({iceRestart:true});
      await p.pc.setLocalDescription(d);
      await signal(id,'offer',{type:d.type,sdp:d.sdp});
      say(`Reconnecting to a friend (${p.restarts}/4)…`);
      if(p.restarts<4)schedulePeerRestart(id);
    }catch(e){console.warn('Group ICE restart:',e);if(p.restarts<4)schedulePeerRestart(id)}
  },4000+p.restarts*3000);
}
function channel(id,c){const p=peers.get(id);if(!p)return;p.channel=c;c.onopen=()=>{refresh();say('Friend connected. Waiting for everyone to be ready.')};c.onclose=refresh;c.onmessage=e=>{try{receive(id,JSON.parse(e.data))}catch(err){console.warn(err)}}}
async function offer(id){const p=peer(id);if(p.offered)return;p.offered=true;channel(id,p.pc.createDataChannel('photos'));const d=await p.pc.createOffer();await p.pc.setLocalDescription(d);await signal(id,'offer',{type:d.type,sdp:d.sdp})}
async function onSignal(d){if(d.to!==me)return;if(!members.includes(d.from)){return}const p=peer(d.from);try{if(d.type==='offer'){if(p.pc.signalingState!=='stable')return;await p.pc.setRemoteDescription(d.value);const a=await p.pc.createAnswer();await p.pc.setLocalDescription(a);await signal(d.from,'answer',{type:a.type,sdp:a.sdp})}else if(d.type==='answer'){if(p.pc.signalingState==='have-local-offer')await p.pc.setRemoteDescription(d.value)}else if(d.type==='ice'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(d.value);else p.pending.push(d.value)}if(p.pc.remoteDescription)for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c)}catch(e){console.warn('WebRTC signaling',e)}}
function observe(token){watch(room,s=>{if(token!==version||!s.exists())return;members=s.data().members||[];host=s.data().host;if(!members.includes(me)){say('Room membership changed.');leave();return}for(const id of members)if(id!==me){peer(id);if(me<id)offer(id).catch(e=>say(e.message))}for(const [id,p] of peers)if(!members.includes(id)){clearTimeout(p.restartTimer);p.pc.close();peers.delete(id)}refresh()});watch(collection(room,'signals'),s=>{if(token!==version)return;for(const c of s.docChanges())if(c.type==='added')onSignal(c.doc.data())})}
async function enter(c,create){if(entering)return;entering=true;await leave();try{code=c;me=idGen();room=doc(db,'groupRooms',c);if(create)await setDoc(room,{host:me,members:[me],createdAt:serverTimestamp(),expiresAt:Date.now()+86400000,deleteAfter:new Date(Date.now()+86400000)});else await runTransaction(db,async tx=>{const s=await tx.get(room);if(!s.exists())throw Error('Room not found. Ask for a new link.');const d=s.data();if(d.expiresAt<Date.now())throw Error('Room expired.');if(d.members.length>=4)throw Error('Room is full (4 maximum).');tx.update(room,{members:[...d.members,me]})});camera=await navigator.mediaDevices.getUserMedia({video:GROUP_VIDEO,audio:false}).catch(async error=>{if(error.name==='OverconstrainedError')return navigator.mediaDevices.getUserMedia({video:true,audio:false});throw error});$('groupLocal').srcObject=camera;await $('groupLocal').play();$('groupRoomDisplay').textContent=$('groupCode').value=code;history.replaceState(null,'',location.pathname+'?group='+code);observe(version);refresh();say(create?'Room created! Share the invite with up to three friends.':'Joined room. Connecting cameras…')}catch(e){await leave();say(e.message);console.error(e)}finally{entering=false}}
$('groupCreate').onclick=()=>enter(codeGen(),true);$('groupJoin').onclick=()=>{const c=$('groupCode').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say('Enter a valid 6-character code.');enter(c,false)};
$('groupCopy').onclick=async()=>{const link=location.origin+location.pathname+'?group='+code;try{await navigator.clipboard.writeText(link);say('Invite copied!')}catch{say('Invite: '+link)}};
async function sendPhoto(id,i,data,isRetry=false){
 const key=id+':'+round+':'+i;
 if(!isRetry)outgoing.set(key,data);
 const ch=peers.get(id)?.channel;
 if(ch?.readyState!=='open')return;
 send(id,{type:'photo-start',round,index:i,length:data.length});
 for(let p=0;p<data.length;p+=10000){
  while(ch.readyState==='open'&&ch.bufferedAmount>150000)await delay(40);
  if(ch.readyState!=='open')return;
  send(id,{type:'photo-chunk',round,index:i,value:data.slice(p,p+10000)});
 }
 send(id,{type:'photo-end',round,index:i});
 clearTimeout(retryTimers.get(key));
 retryTimers.set(key,setTimeout(()=>{
  if(outgoing.has(key)&&peers.get(id)?.channel?.readyState==='open')sendPhoto(id,i,data,true).catch(console.warn);
 },5000));
}
function receive(id,d){
 if(d.type==='begin'&&id===host){captureRound(d).catch(e=>say(e.message));return}
 if(d.round!==round)return;
 const key=id+':'+d.index;
 if(d.type==='photo-ack'){
  const outgoingKey=id+':'+d.round+':'+d.index;
  clearTimeout(retryTimers.get(outgoingKey));retryTimers.delete(outgoingKey);outgoing.delete(outgoingKey);return;
 }
 if(d.type==='photo-request'){
  const data=outgoing.get(id+':'+d.round+':'+d.index);
  if(data)sendPhoto(id,d.index,data,true).catch(console.warn);
  return;
 }
 if(d.type==='photo-start')buffers.set(key,{value:'',length:d.length});
 else if(d.type==='photo-chunk'&&buffers.has(key)){
  const b=buffers.get(key);if(b.value.length<1500000)b.value+=d.value;
 }else if(d.type==='photo-end'){
  const b=buffers.get(key);buffers.delete(key);
  if(b&&b.value.length===b.length&&b.value.startsWith('data:image/jpeg;base64,')){
   shots[id]??=[];shots[id][d.index]=b.value;
   send(id,{type:'photo-ack',round,index:d.index});render();refresh();
  }else send(id,{type:'photo-request',round,index:d.index});
 }
}
function snap(){const v=$('groupLocal');if(v.readyState<2||!v.videoWidth)throw Error('Camera is not ready.');const c=document.createElement('canvas');c.width=480;c.height=360;const x=c.getContext('2d');x.translate(480,0);x.scale(-1,1);x.drawImage(v,0,0,480,360);return c.toDataURL('image/jpeg',.68)}
async function captureRound(d){if(busy)return;busy=true;round=d.round;for(const t of retryTimers.values())clearTimeout(t);retryTimers.clear();outgoing.clear();shots={};buffers.clear();layout=d.layout;render();refresh();try{for(let i=0;i<(layout==='collage'?1:4);i++){const due=d.startAt+i*4600;while(Date.now()<due){$('groupCountdown').hidden=false;$('groupCountdown').textContent=Math.max(1,Math.ceil((due-Date.now())/1000));await delay(80)}$('groupCountdown').hidden=true;const data=snap();shots[me]??=[];shots[me][i]=data;render();await Promise.all(d.members.filter(id=>id!==me).map(id=>sendPhoto(id,i,data)));say(`Captured shot ${i+1}. Waiting for friends…`)}}finally{busy=false;$('groupCountdown').hidden=true;refresh()}}
$('groupStart').onclick=()=>{if($('groupStart').disabled)return;const d={type:'begin',round:idGen(),layout,members:[...members],startAt:Date.now()+5000};sendAll(d);captureRound(d).catch(e=>say(e.message))};
for(const [id,key,cb] of [['groupLayouts','glayout',v=>layout=v],['groupFilters','gfilter',v=>filter=v],['groupPapers','gpaper',v=>paper=v],['groupFrames','gframe',v=>frame=v]])$(id).onclick=e=>{const b=e.target.closest('button');if(!b?.dataset[key])return;cb(b.dataset[key]);$(id).querySelectorAll('button').forEach(a=>a.classList.toggle('selected',a===b));render();refresh()};
$('groupStickers').onclick=e=>{const b=e.target.closest('button[data-gsticker]');if(!b)return;sticker=window.PKMStickerChoice.toggle(sticker,b.dataset.gsticker);window.PKMStickerChoice.update('groupStickers','gsticker',sticker);render();refresh()};
$('groupStickersDensity').onchange=e=>{stickerDensity=e.target.value;render()};$('groupCaption').oninput=()=>render();$('groupGrain').oninput=e=>{grain=+e.target.value;$('groupGrainValue').textContent=grain+'%';render()};
const noise=document.createElement('canvas');noise.width=noise.height=96;{const x=noise.getContext('2d'),d=x.createImageData(96,96);for(let i=0;i<d.data.length;i+=4){const n=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=Math.random()*100}x.putImageData(d,0,0)}
function crop(x,img,a,b,w,h){if(!img){x.fillStyle='#35372f';x.fillRect(a,b,w,h);return}const r=Math.max(w/img.width,h/img.height),sw=w/r,sh=h/r;x.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,a,b,w,h)}
async function compose(preview){const seq=layout==='sequence',W=seq?740:860,pad=42,top=90,gap=12,cols=seq?1:2,rows=seq?4:2,w=(W-pad*2-gap*(cols-1))/cols,h=seq?215:270,H=top+rows*h+(rows-1)*gap+100,c=document.createElement('canvas'),scale=preview?1:2;c.width=W*scale;c.height=H*scale;const x=c.getContext('2d');x.scale(scale,scale);x.fillStyle=papers[paper];x.fillRect(0,0,W,H);const ink=paper==='dark'?'#eee4cd':'#252722';x.fillStyle=ink;x.font='bold 38px Arial';x.fillText('PIC KA MUNA',pad,59);const images={};await Promise.all(members.flatMap(id=>(shots[id]||[]).map(async(src,i)=>{if(!src)return;const im=new Image();im.src=src;await im.decode();images[id+':'+i]=im})));
for(let i=0;i<4;i++){const a=pad+(i%cols)*(w+gap),b=top+Math.floor(i/cols)*(h+gap);x.save();if(frame!=='classic'){x.beginPath();x.roundRect(a,b,w,h,frame==='rounded'?18:3);x.clip()}if(frame==='polaroid'){x.fillStyle='#faf4e8';x.fillRect(a,b,w,h)}const inset=frame==='polaroid'?9:0,extra=frame==='polaroid'?25:0,A=a+inset,B=b+inset,P=w-2*inset,Q=h-inset-extra;x.save();x.beginPath();x.rect(A,B,P,Q);x.clip();x.filter=filters[filter];if(seq){const sw=P/2,sh=Q/2;members.forEach((id,j)=>crop(x,images[id+':'+i],A+(j%2)*sw,B+Math.floor(j/2)*sh,sw,sh))}else crop(x,images[members[i]+':0'],A,B,P,Q);x.restore();x.restore()}
if(grain){x.globalAlpha=grain/160;x.fillStyle=x.createPattern(noise,'repeat');x.fillRect(pad,top,W-pad*2,rows*h+(rows-1)*gap);x.globalAlpha=1}window.PKMStickers.draw(x,sticker,stickerDensity,{x:pad,y:top,w:W-pad*2,h:rows*h+(rows-1)*gap},ink);x.fillStyle=ink;x.font='22px Georgia';x.fillText($('groupCaption').value.slice(0,36),pad,H-43);x.textAlign='right';x.font='15px monospace';x.fillText(new Date().toLocaleDateString(),W-pad,H-43);return c}
let renderId=0;async function render(){const id=++renderId;if(!Object.values(shots).some(s=>s.some(Boolean))){$('groupPhotos').replaceChildren();return}try{const c=await compose(true);if(id!==renderId)return;const img=new Image();img.src=c.toDataURL();img.alt='Group photo preview';$('groupPhotos').replaceChildren(img)}catch(e){console.warn(e)}}
async function download(type){if($('groupDownload').disabled)return;try{const c=await compose(false),blob=await new Promise(r=>c.toBlob(r,type,type==='image/jpeg'?.93:undefined));if(!blob)throw Error('Export failed.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PicKaMuna-Group.'+(type==='image/png'?'png':'jpg');a.click();setTimeout(()=>URL.revokeObjectURL(url),12000)}catch(e){say(e.message)}}
$('groupDownload').onclick=()=>download('image/png');$('groupDownloadJpg').onclick=()=>download('image/jpeg');
const group=$('group'),solo=document.querySelector('.studio'),duo=$('together');function showGroup(){solo.hidden=duo.hidden=true;group.hidden=false;for(const id of ['soloMode','togetherMode','groupMode']){$(id).classList.toggle('active',id==='groupMode');$(id).setAttribute('aria-pressed',String(id==='groupMode'))}document.querySelector('.mode-switch').scrollIntoView({block:'start',behavior:'smooth'})}
$('groupMode').onclick=showGroup;for(const id of ['soloMode','togetherMode'])$(id).addEventListener('click',()=>{group.hidden=true;$('groupMode').classList.remove('active');$('groupMode').setAttribute('aria-pressed','false')});const invite=new URLSearchParams(location.search).get('group');if(invite&&/^[A-HJ-NP-Z2-9]{6}$/i.test(invite)){$('groupCode').value=invite.toUpperCase();queueMicrotask(()=>{showGroup();say('Invite detected. Click JOIN ROOM.')})}refresh();

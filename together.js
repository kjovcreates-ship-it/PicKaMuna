import {firebaseConfig, iceServers, hasTurn} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore,doc,setDoc,getDoc,updateDoc,onSnapshot,collection,addDoc,serverTimestamp,deleteDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const el=id=>document.getElementById(id);
const message=t=>{el('togetherStatus').textContent=t};
const configured=firebaseConfig.apiKey!=='REPLACE_ME' && firebaseConfig.projectId!=='REPLACE_ME';
let db=null,roomRef=null,pc=null,channel=null,localStream=null,remoteStream=null,unsubs=[],isHost=false,connected=false,busy=false,round=0,localShots=[],remoteShots=[],incoming={},remoteReady=false;
let activeRoom='';
let pendingCandidates=[],connectionTimer=null, restartTimer=null, restartAttempts=0, lastOfferSdp="", lastAnswerSdp="";
if(configured){try{db=getFirestore(initializeApp(firebaseConfig))}catch(e){message('Firebase setup error: '+e.message)}}else message('Together mode needs Firebase setup. See README.md. Solo booth still works.');
const error=e=>{console.error('[PicKaMuna Together]',e);message(e?.message||String(e))};
function code(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint32Array(6);crypto.getRandomValues(a);return [...a].map(n=>alphabet[n%alphabet.length]).join('')}
function setUI(){el('createRoom').disabled=!db||!!roomRef;el('joinRoom').disabled=!db||!!roomRef;el('leaveRoom').hidden=!roomRef;el('roomDetails').hidden=!roomRef;el('togetherStart').disabled=!isHost||!connected||!remoteReady||busy||el('togetherRemote').readyState<2;el('togetherDownload').disabled=!(localShots.filter(Boolean).length===4&&remoteShots.filter(Boolean).length===4);el('togetherDownloadJpg').disabled=el('togetherDownload').disabled;el('localState').textContent=localStream?'LIVE':'OFF AIR';el('peerState').textContent=connected?'CONNECTED':roomRef?'CONNECTING':'WAITING'}
function stopMedia(){localStream?.getTracks().forEach(t=>t.stop());localStream=null;el('togetherLocal').srcObject=null;el('togetherRemote').srcObject=null}
async function teardown(){clearTimeout(connectionTimer);clearTimeout(restartTimer);restartAttempts=0;lastOfferSdp="";lastAnswerSdp="";pendingCandidates=[];unsubs.forEach(f=>f());unsubs=[];channel?.close();channel=null;pc?.close();pc=null;stopMedia();roomRef=null;activeRoom='';isHost=false;connected=false;remoteReady=false;busy=false;localShots=[];remoteShots=[];el('togetherPhotos').replaceChildren();el('togetherCountdown').hidden=true;setUI()}
async function leave(){const ref=roomRef,host=isHost;await teardown();if(ref&&host){try{await updateDoc(ref,{status:'closed'})}catch(e){console.warn(e)}}message('Left the room. You can start a new one.');history.replaceState(null,'',location.pathname)}
el('leaveRoom').addEventListener('click',leave);
window.addEventListener('pagehide',()=>{pc?.close();stopMedia()});
function watch(ref,callback){unsubs.push(onSnapshot(ref,callback,error))}
async function applyRemote(description){await pc.setRemoteDescription(new RTCSessionDescription(description));const candidates=pendingCandidates.splice(0);for(const c of candidates){try{await pc.addIceCandidate(c)}catch(e){console.warn('Queued ICE:',e)}}}
async function receiveCandidate(data){const candidate=new RTCIceCandidate(data);if(!pc?.remoteDescription){pendingCandidates.push(candidate);return}try{await pc.addIceCandidate(candidate)}catch(e){console.warn('ICE:',e)}}
function send(obj){if(channel?.readyState==='open')channel.send(JSON.stringify(obj))}
async function camera(){localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});el('togetherLocal').srcObject=localStream;await el('togetherLocal').play();setUI()}
async function restartDuo(){
  if(!isHost||!pc||!roomRef||pc.signalingState!=='stable'||restartAttempts>=4)return;
  restartAttempts++;
  try{
    message(`Reconnecting camera (${restartAttempts}/4)…`);
    pc.restartIce();
    const offer=await pc.createOffer({iceRestart:true});
    await pc.setLocalDescription(offer);
    await updateDoc(roomRef,{offer:{type:offer.type,sdp:offer.sdp},answer:null});
  }catch(e){console.warn('Duo ICE restart:',e);scheduleDuoRestart()}
}
function scheduleDuoRestart(){
  if(!isHost||!roomRef||!pc||pc.connectionState==='closed'||restartAttempts>=4)return;
  clearTimeout(restartTimer);
  restartTimer=setTimeout(()=>{if(pc&&pc.connectionState!=='connected')restartDuo()},3500+restartAttempts*2500);
}
async function connect(){pc=new RTCPeerConnection({iceServers});remoteStream=new MediaStream();el('togetherRemote').srcObject=remoteStream;
  localStream.getTracks().forEach(track=>pc.addTrack(track,localStream));
  pc.ontrack=e=>{for(const track of e.streams[0].getTracks()){if(!remoteStream.getTracks().some(t=>t.id===track.id))remoteStream.addTrack(track)}el('togetherRemote').play().catch(()=>message('Tap the remote video to enable playback.'))};
  el('togetherRemote').addEventListener('click',()=>el('togetherRemote').play().catch(error),{once:true});
  pc.onconnectionstatechange=()=>{connected=pc.connectionState==='connected';setUI();if(connected){clearTimeout(restartTimer);restartAttempts=0;message('Connected! Both cameras are ready.')}else if(pc.connectionState==='failed'||pc.connectionState==='disconnected'){message('Connection interrupted. Attempting recovery…'+(hasTurn?'':' A TURN relay may be required.'));scheduleDuoRestart()}};
  pc.onicecandidate=e=>{if(e.candidate)addDoc(collection(roomRef,isHost?'hostCandidates':'guestCandidates'),e.candidate.toJSON()).catch(error)};
  watch(collection(roomRef,isHost?'guestCandidates':'hostCandidates'),snapshot=>snapshot.docChanges().forEach(change=>{if(change.type==='added')receiveCandidate(change.doc.data())}));
  if(isHost){channel=pc.createDataChannel('photo-strips',{ordered:true});setupChannel(channel)}else pc.ondatachannel=e=>{channel=e.channel;setupChannel(channel)};
}
function setupChannel(ch){ch.onopen=()=>{send({type:'ready'});remoteReady=true;setUI()};ch.onclose=()=>{remoteReady=false;setUI()};ch.onmessage=event=>{let data;try{data=JSON.parse(event.data)}catch{return}receive(data)}}
function receive(d){if(d.type==='ready'){remoteReady=true;setUI()}if(d.type==='begin'){startRound(d.round,d.startAt)}if(d.type==='shot-start'){incoming[d.index]=''}if(d.type==='shot-chunk'){incoming[d.index]=(incoming[d.index]||'')+d.value}if(d.type==='shot-end'){if((incoming[d.index]||'').startsWith('data:image/jpeg;base64,')){remoteShots[d.index]=incoming[d.index];renderPhotos()}delete incoming[d.index];setUI()}if(d.type==='done'){message('Both photo sets are being prepared. Download when all eight photos arrive.')}}
async function createRoom(){if(!db)return;try{await teardown();isHost=true;activeRoom=code();roomRef=doc(db,'photoboothRooms',activeRoom);await setDoc(roomRef,{status:'waiting',createdAt:serverTimestamp()});await camera();await connect();const offer=await pc.createOffer();await pc.setLocalDescription(offer);await updateDoc(roomRef,{offer:{type:offer.type,sdp:offer.sdp}});watch(roomRef,s=>{const d=s.data();if(!d||!pc)return;if(d.status==='closed'){message('Room closed.');return}if(d.answer?.sdp&&d.answer.sdp!==lastAnswerSdp&&pc.signalingState==='have-local-offer'){lastAnswerSdp=d.answer.sdp;applyRemote(d.answer).catch(error)}});showRoom();message('Room created. Send the invite link to your person.');}catch(e){await teardown();error(e)}}
async function joinRoom(value){if(!db)return;try{await teardown();activeRoom=value.toUpperCase().trim();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(activeRoom))throw Error('Enter a valid six-character room code.');roomRef=doc(db,'photoboothRooms',activeRoom);const snapshot=await getDoc(roomRef);if(!snapshot.exists()||snapshot.data().status==='closed'||!snapshot.data().offer)throw Error('Room not found or no longer available.');if(snapshot.data().answer)throw Error('This room was already joined. Ask the host to create a fresh room.');await camera();await connect();await applyRemote(snapshot.data().offer);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await updateDoc(roomRef,{answer:{type:answer.type,sdp:answer.sdp},status:'joined'});lastOfferSdp=snapshot.data().offer.sdp;watch(roomRef,s=>{const d=s.data();if(!d||!pc)return;if(d.status==='closed'){message('Host closed the room.');channel?.close();pc?.close();connected=false;setUI();return}if(d.offer?.sdp&&d.offer.sdp!==lastOfferSdp&&pc.signalingState==='stable'){lastOfferSdp=d.offer.sdp;(async()=>{await applyRemote(d.offer);const a=await pc.createAnswer();await pc.setLocalDescription(a);await updateDoc(roomRef,{answer:{type:a.type,sdp:a.sdp}})})().catch(error)}});showRoom();message('Joining room. Waiting for peer connection…')}catch(e){await teardown();error(e)}}
function showRoom(){el('roomDisplay').textContent=activeRoom;el('roomCode').value=activeRoom;history.replaceState(null,'',`${location.pathname}?room=${activeRoom}`);setUI()}
el('createRoom').addEventListener('click',createRoom);
el('joinRoom').addEventListener('click',()=>joinRoom(el('roomCode').value));
el('copyRoom').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${activeRoom}`);message('Invite link copied!')}catch(e){error(e)}});
const param=new URLSearchParams(location.search).get('room');if(param&&/^[A-HJ-NP-Z2-9]{6}$/i.test(param)){el('roomCode').value=param.toUpperCase();queueMicrotask(()=>document.getElementById('togetherMode').click());message('Invite detected. Click JOIN ROOM to connect your camera.');}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function capture(v){if(v.readyState<2||!v.videoWidth)throw Error('Camera has not produced a frame yet.');const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');ctx.translate(640,0);ctx.scale(-1,1);ctx.drawImage(v,0,0,640,480);return c.toDataURL('image/jpeg',.72)}
async function transmit(i,data){send({type:'shot-start',index:i});for(let p=0;p<data.length;p+=12000){while(channel?.readyState==='open' && channel.bufferedAmount>128000)await wait(40);send({type:'shot-chunk',index:i,value:data.slice(p,p+12000)})}send({type:'shot-end',index:i})}
async function startRound(id,startAt){if(busy)return;busy=true;round=id;localShots=[];remoteShots=[];incoming={};renderPhotos();setUI();try{for(let i=0;i<4;i++){const due=startAt+i*4500;while(Date.now()<due){const remaining=Math.max(0,Math.ceil((due-Date.now())/1000));el('togetherCountdown').hidden=false;el('togetherCountdown').textContent=remaining||'●';await wait(90)}el('togetherCountdown').hidden=true;const shot=capture(el('togetherLocal'));localShots[i]=shot;await transmit(i,shot);renderPhotos();message(`Shot ${i+1} of 4 captured.`)}send({type:'done'});message('Four shots captured! Waiting for your partner’s photos…')}catch(e){error(e)}finally{busy=false;el('togetherCountdown').hidden=true;setUI()}}
el('togetherStart').addEventListener('click',()=>{if(!isHost||!connected||busy)return;const startAt=Date.now()+4000;const id=Date.now();send({type:'begin',round:id,startAt});startRound(id,startAt)});
const togetherPapers={cream:'#eee4cd',red:'#e4a49a',green:'#b8c3a6',blue:'#a9c0c7',dark:'#252722'};
const togetherFilters={vintage:'sepia(.28) contrast(1.09) saturate(.82) brightness(1.04)',original:'none',mono:'grayscale(1) contrast(1.13)',sepia:'sepia(.85) contrast(1.05)',soft:'saturate(.65) brightness(1.1) contrast(.9)'};
let togetherLayout='strip',togetherPaper='cream',togetherFilter='vintage',togetherFrame='classic',togetherSticker='none',togetherGrain=18;
const grainTile=document.createElement('canvas');grainTile.width=128;grainTile.height=128;{const gc=grainTile.getContext('2d'),d=gc.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){let v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()*100}gc.putImageData(d,0,0)}
for(const [group,attribute,update] of [['togetherLayouts','tlayout',v=>togetherLayout=v],['togetherPapers','tpaper',v=>togetherPaper=v],['togetherFilters','tfilter',v=>togetherFilter=v],['togetherFrames','tframe',v=>togetherFrame=v],['togetherStickers','tsticker',v=>togetherSticker=v]]){
  el(group).addEventListener('click',event=>{const button=event.target.closest('button');if(!button||!button.dataset[attribute])return;update(button.dataset[attribute]);el(group).querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));renderPhotos()});
}
el('togetherCaption').addEventListener('input',renderPhotos);el('togetherGrain').addEventListener('input',e=>{togetherGrain=Number(e.target.value);el('togetherGrainValue').textContent=togetherGrain+'%';renderPhotos()});
function drawPair(ctx,left,right,x,y,w,h){
  const half=w/2;
  for(let side=0;side<2;side++){
    const img=side===0?left:right,dx=x+side*half;
    ctx.save();ctx.beginPath();ctx.rect(dx,y,half,h);ctx.clip();
    if(img){const scale=Math.max(half/img.width,h/img.height),sw=half/scale,sh=h/scale;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,dx,y,half,h)}
    else{ctx.fillStyle='#363831';ctx.fillRect(dx,y,half,h);ctx.fillStyle='#eee4cd';ctx.font='20px monospace';ctx.textAlign='center';ctx.fillText(side===0?'YOU':'YOUR PERSON',dx+half/2,y+h/2)}
    ctx.restore();
  }
}
async function buildTogetherCanvas(preview=false){
  const grid=togetherLayout==='grid',W=grid?900:700,pad=grid?40:48,top=90,gap=grid?16:17,cols=grid?2:1,photoW=(W-pad*2-gap*(cols-1))/cols,photoH=photoW*.74,rows=grid?2:4,H=Math.ceil(top+rows*photoH+(rows-1)*gap+105);
  const canvas=document.createElement('canvas');const scale=preview?1:2;canvas.width=W*scale;canvas.height=H*scale;
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle=togetherPapers[togetherPaper];ctx.fillRect(0,0,W,H);
  const ink=togetherPaper==='dark'?'#eee4cd':'#252722';ctx.fillStyle=ink;ctx.textAlign='left';ctx.font='800 39px Arial,sans-serif';ctx.fillText('PIC KA MUNA',pad,62);
  const load=async src=>{if(!src)return null;const img=new Image();img.src=src;await img.decode();return img};
  for(let i=0;i<4;i++){
    const [left,right]=await Promise.all([load(localShots[i]),load(remoteShots[i])]);const x=pad+(i%cols)*(photoW+gap),y=top+Math.floor(i/cols)*(photoH+gap);
    ctx.save();if(togetherFrame!=='classic'){const radius=togetherFrame==='rounded'?18:3;ctx.beginPath();ctx.roundRect(x,y,photoW,photoH,radius);ctx.clip()}if(togetherFrame==='polaroid'){ctx.fillStyle='#faf4e8';ctx.fillRect(x,y,photoW,photoH);ctx.filter=togetherFilters[togetherFilter];drawPair(ctx,left,right,x+9,y+9,photoW-18,photoH-31)}else{ctx.filter=togetherFilters[togetherFilter];drawPair(ctx,left,right,x,y,photoW,photoH)}ctx.restore();
    ctx.fillStyle=togetherPaper==='dark'?'#eee4cd':'#252722';ctx.globalAlpha=.45;ctx.font='13px monospace';ctx.fillText(String(i+1).padStart(2,'0'),x+5,y+photoH-7);ctx.globalAlpha=1;
  }
  if(togetherGrain>0){ctx.save();ctx.globalAlpha=togetherGrain/160;const pattern=ctx.createPattern(grainTile,'repeat');ctx.fillStyle=pattern;ctx.fillRect(pad,top,W-pad*2,rows*photoH+(rows-1)*gap);ctx.restore()}
  if(togetherSticker!=='none'){ctx.save();ctx.font='34px Georgia,serif';ctx.fillStyle=ink;ctx.globalAlpha=.8;const symbols={stars:['✦','✧','★'],hearts:['♥','♡','♥'],spark:['✳','✦','✳']}[togetherSticker];for(let i=0;i<4;i++){ctx.fillText(symbols[i%3],pad-20+(i%2)*(W-pad*2+3),top+35+i*(((rows*photoH+(rows-1)*gap)-70)/3))}ctx.restore()}
  ctx.fillStyle=ink;ctx.font='21px Georgia,serif';ctx.textAlign='left';ctx.fillText((el('togetherCaption').value||' ').slice(0,36),pad,H-42,W-pad*2-130);
  ctx.textAlign='right';ctx.font='15px monospace';ctx.fillText(new Date().toLocaleDateString(),W-pad,H-42);
  return canvas;
}
let previewSerial=0;
async function renderPhotos(){
  const serial=++previewSerial,container=el('togetherPhotos');
  if(!localShots.some(Boolean)&&!remoteShots.some(Boolean)){container.replaceChildren();setUI();return}
  try{const canvas=await buildTogetherCanvas(true);if(serial!==previewSerial)return;const img=new Image();img.alt='Together photo strip with both people side by side in each frame';img.src=canvas.toDataURL('image/png');container.replaceChildren(img)}catch(e){console.warn('Preview error:',e)}setUI();
}
async function downloadStrip(type='image/png'){if(localShots.filter(Boolean).length!==4||remoteShots.filter(Boolean).length!==4)return;try{
  const c=await buildTogetherCanvas(false);const blob=await new Promise(resolve=>c.toBlob(resolve,type,type==='image/jpeg'?.94:undefined));if(!blob)throw Error('Export failed');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PicKaMuna-Together.'+(type==='image/jpeg'?'jpg':'png');a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)
}catch(e){error(e)}}
el('togetherDownload').addEventListener('click',()=>downloadStrip('image/png'));el('togetherDownloadJpg').addEventListener('click',()=>downloadStrip('image/jpeg'));
setUI();

const soloSection=document.querySelector('.studio'),togetherSection=el('together');
function switchMode(which){const isTogether=which==='together';soloSection.hidden=isTogether;togetherSection.hidden=!isTogether;el('soloMode').classList.toggle('active',!isTogether);el('togetherMode').classList.toggle('active',isTogether);el('soloMode').setAttribute('aria-pressed',String(!isTogether));el('togetherMode').setAttribute('aria-pressed',String(isTogether));document.querySelector('.mode-switch').scrollIntoView({block:'start',behavior:'smooth'});}
el('soloMode').addEventListener('click',()=>switchMode('solo'));el('togetherMode').addEventListener('click',()=>switchMode('together'));

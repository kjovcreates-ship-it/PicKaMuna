const PK_ARROW_UP_RIGHT = '<svg class="pk-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7 M7 7h10v10"></path></svg>';
'use strict';
const $=id=>document.getElementById(id);
const video=$('video'),startCamera=$('startCamera'),startSession=$('startSession'),retakeAll=$('retakeAll'),retakeOne=$('retakeOne'),download=$('download'),downloadJpg=$('downloadJpg');
const papers={cream:'#eee4cd',red:'#e4a49a',green:'#b8c3a6',blue:'#a9c0c7',dark:'#252722'};
const filters={vintage:'sepia(.28) contrast(1.09) saturate(.82) brightness(1.04)',original:'none',mono:'grayscale(1) contrast(1.13)',sepia:'sepia(.85) contrast(1.05)',soft:'saturate(.65) brightness(1.1) contrast(.9)'};
let stream=null,photos=[],filter='vintage',paper='cream',frame='classic',layout='strip',sticker=[],stickerDensity='medium',grain=18,selectedPhoto=-1,running=false,runToken=0,opening=false;
const shotCount=()=>layout==='six'?6:layout==='duo'?2:4;
$('year').textContent=new Date().getFullYear();$('stripDate').textContent=new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'2-digit'});
function status(msg){$('helper').textContent=msg}
function buttons(){startCamera.disabled=opening||running;startSession.disabled=!stream||running||opening;retakeAll.disabled=running||photos.length===0;retakeOne.disabled=running||!stream||selectedPhoto<0||!photos[selectedPhoto];download.disabled=photos.length!==shotCount()||running;downloadJpg.disabled=download.disabled;$('timer').disabled=running;$('cameraSelect').disabled=running||opening}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.pause();video.srcObject=null;video.classList.remove('ready');video.style.opacity=''}
function showError(msg){$('cameraError').hidden=false;$('cameraError').textContent=msg;status(msg)}
function cameraOff(){video.classList.remove('ready');$('cameraEmpty').hidden=false;$('cameraStatus').textContent='● OFF AIR'}
async function cameraList(){if(!navigator.mediaDevices?.enumerateDevices)return;try{const cams=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');const select=$('cameraSelect'),selected=select.value;select.replaceChildren(new Option('DEFAULT CAMERA',''));cams.forEach((d,i)=>select.add(new Option(d.label||`CAMERA ${i+1}`,d.deviceId)));if([...select.options].some(o=>o.value===selected))select.value=selected}catch(e){console.warn('Camera list:',e)}}
async function cameraOn(){
  if(opening||running)return;
  if(!window.isSecureContext){showError('Camera access requires HTTPS or localhost.');return}
  if(!navigator.mediaDevices?.getUserMedia){showError('Camera API unavailable in this browser.');return}
  opening=true;buttons();$('cameraError').hidden=true;
  stopCamera();cameraOff();status('Connecting to your camera…');
  let media=null;
  try{
    const selected=$('cameraSelect').value;
    try{media=await navigator.mediaDevices.getUserMedia({video:selected?{deviceId:{exact:selected}}:true,audio:false})}
    catch(err){if(selected&&['OverconstrainedError','NotFoundError'].includes(err.name))media=await navigator.mediaDevices.getUserMedia({video:true,audio:false});else throw err}
    stream=media;
    // Use the same simple, proven playback sequence as a standalone camera test.
    // Keep the video fully visible and attached to the document during playback.
    video.muted=true;video.defaultMuted=true;video.autoplay=true;video.playsInline=true;
    video.style.opacity='1';video.style.visibility='visible';
    video.srcObject=media;
    video.classList.add('ready');
    $('cameraEmpty').hidden=true;
    await video.play();
    if(stream!==media)throw Error('Camera session was interrupted.');
    // play() success means playback started; dimensions may arrive shortly after.
    $('cameraStatus').textContent='● CAMERA LIVE';
    startCamera.innerHTML='RESTART CAMERA <span>'+PK_ARROW_UP_RIGHT+'</span>';
    status('Camera ready. Pick a countdown, then take your four photos.');
    const track=media.getVideoTracks()[0];
    track.addEventListener('ended',()=>{if(stream===media){stopCamera();cameraOff();status('Camera disconnected. Turn it on again.');buttons()}});
    cameraList().catch(console.warn);
  }catch(e){
    console.error('PicKaMuna camera startup failed:',e);
    stopCamera();cameraOff();
    let msg='Could not start the camera. ';
    if(['NotAllowedError','PermissionDeniedError','SecurityError'].includes(e.name))msg+='Allow camera access in the browser site settings, then retry.';
    else if(['NotFoundError','DevicesNotFoundError'].includes(e.name))msg+='No camera was found.';
    else if(['NotReadableError','TrackStartError'].includes(e.name))msg+='Camera may be in use by another app.';
    else msg+=(e.message||'Try refreshing the page.');
    showError(msg);
  }finally{opening=false;buttons()}
}
startCamera.addEventListener('click',cameraOn);$('cameraSelect').addEventListener('change',cameraOn);

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const grainCanvas=document.createElement('canvas');grainCanvas.width=160;grainCanvas.height=160;
function makeGrain(){const ctx=grainCanvas.getContext('2d');const d=ctx.createImageData(160,160);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()*110}ctx.putImageData(d,0,0)}
makeGrain();
function soundClick(){if(!$('sound').checked)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=new AC(),osc=ac.createOscillator(),gain=ac.createGain();osc.type='square';osc.frequency.setValueAtTime(520,ac.currentTime);osc.frequency.exponentialRampToValueAtTime(130,ac.currentTime+.055);gain.gain.setValueAtTime(.025,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.07);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.075);osc.onended=()=>ac.close()}catch(e){console.warn('Sound unavailable',e)}}
function flashShot(){$('flash').classList.remove('flash-on');void $('flash').offsetWidth;$('flash').classList.add('flash-on');soundClick()}
function snap(){if(video.readyState<2||!video.videoWidth)throw Error('Camera has not produced a frame yet');const canvas=$('captureCanvas'),w=960,h=720;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');const vw=video.videoWidth,vh=video.videoHeight,s=Math.max(w/vw,h/vh),sw=w/s,sh=h/s;ctx.save();if($('mirror').checked){ctx.translate(w,0);ctx.scale(-1,1)}ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,w,h);ctx.restore();return canvas.toDataURL('image/jpeg',.94)}
function render(){const count=shotCount(),container=$('stripPhotos');container.replaceChildren();for(let i=0;i<count;i++){const cell=document.createElement('button');cell.type='button';cell.className='photo-cell'+(i===selectedPhoto?' selected-photo':'');cell.setAttribute('aria-label',`Select photo ${i+1} to retake`);cell.dataset.index=i;if(photos[i]){const img=new Image();img.src=photos[i];img.alt=`Photo ${i+1}`;img.style.filter=filters[filter];cell.append(img)}else{const placeholder=document.createElement('div');placeholder.className='empty-photo';placeholder.textContent=String(i+1).padStart(2,'0');cell.append(placeholder)}container.append(cell)}$('stripPreview').dataset.color=paper;$('stripPreview').dataset.frame=frame;$('stripPreview').dataset.layout=layout;$('stripPreview').style.setProperty('--grain-opacity',String(grain/250));$('stripPreview').dataset.sticker=sticker;window.PKMStickers.preview($('stripStickers'),sticker,stickerDensity);$('stripCaption').textContent=$('captionInput').value||' ';[...$('progress').children].forEach((e,i)=>{e.hidden=i>=count;e.classList.toggle('active',i<photos.length)});buttons();renderExactPreview()}
$('stripPhotos').addEventListener('click',e=>{const cell=e.target.closest('.photo-cell');if(!cell)return;selectedPhoto=Number(cell.dataset.index);render();status(photos[selectedPhoto]?`Photo ${selectedPhoto+1} selected. Click RETAKE SELECTED to replace it.`:'This slot is empty. Take your photos first.')});
async function countdown(token){for(let t=Number($('timer').value);t>0;t--){if(token!==runToken)return false;$('countdown').hidden=false;$('countdown').textContent=t;await wait(1000)}$('countdown').hidden=true;return token===runToken}
async function takeSession(){if(!stream||running||opening)return;const token=++runToken;running=true;photos=[];selectedPhoto=-1;render();const count=shotCount();status(`Your ${count}-photo session is starting. Strike a pose!`);try{for(let i=0;i<count;i++){if(!await countdown(token))return;photos.push(snap());flashShot();render();status(i===count-1?'Photos ready! Tap any photo to select it for a retake.':`Photo ${i+1} of ${count} captured.`);if(i<count-1)await wait(650)}}catch(e){status(`Photo capture failed: ${e.message}`)}finally{$('countdown').hidden=true;running=false;render()}}
startSession.addEventListener('click',takeSession);
retakeOne.addEventListener('click',async()=>{if(running||!stream||selectedPhoto<0||!photos[selectedPhoto])return;const index=selectedPhoto,token=++runToken;running=true;render();status(`Retaking photo ${index+1}…`);try{if(!await countdown(token))return;photos[index]=snap();flashShot();status(`Photo ${index+1} replaced!`)}catch(e){status(`Retake failed: ${e.message}`)}finally{$('countdown').hidden=true;running=false;render()}});
retakeAll.addEventListener('click',()=>{runToken++;photos=[];selectedPhoto=-1;running=false;$('countdown').hidden=true;render();status('All clear. Take another set whenever you’re ready.')});
function group(id,key,setter){$(id).addEventListener('click',e=>{const b=e.target.closest(`button[data-${key}]`);if(!b)return;$(id).querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));setter(b.dataset[key]);render();savePrefs()})}
group('filters','filter',v=>filter=v);group('colors','color',v=>paper=v);group('frames','frame',v=>frame=v);$('stickers').addEventListener('click',e=>{const b=e.target.closest('button[data-sticker]');if(!b)return;sticker=window.PKMStickerChoice.toggle(sticker,b.dataset.sticker);window.PKMStickerChoice.update('stickers','sticker',sticker);render();savePrefs()});$('stickerDensity').addEventListener('change',e=>{stickerDensity=e.target.value;render();savePrefs()});
group('layouts','layout',v=>{if(photos.length&&v!==layout){photos=[];selectedPhoto=-1;status('Layout changed. Start a new photo session.')}layout=v});
$('captionInput').addEventListener('input',render);$('grain').addEventListener('input',e=>{grain=Number(e.target.value);$('grainValue').textContent=grain+'%';render();savePrefs()});
for(const id of ['timer','mirror','sound'])$(id).addEventListener('change',savePrefs);
function savePrefs(){try{localStorage.setItem('pkmPrefs',JSON.stringify({filter,paper,frame,layout,sticker,stickers:sticker,stickerDensity,grain,timer:$('timer').value,mirror:$('mirror').checked,sound:$('sound').checked}))}catch(e){}}
function restorePrefs(){try{const p=JSON.parse(localStorage.getItem('pkmPrefs')||'{}');for(const [key,id,attr] of [['filter','filters','filter'],['paper','colors','color'],['frame','frames','frame'],['layout','layouts','layout'],['NOT_STICKER','stickers','sticker']]){if(typeof p[key]==='string'&&$(id).querySelector(`button[data-${attr}="${p[key]}"]`)){evalNever(key,p[key]);$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset[attr]===p[key]))}}if(['light','medium','heavy'].includes(p.stickerDensity)){stickerDensity=p.stickerDensity;$('stickerDensity').value=stickerDensity}if(Number.isFinite(p.grain))grain=Math.min(100,Math.max(0,p.grain));$('grain').value=grain;$('grainValue').textContent=grain+'%';if(['3','5','10'].includes(p.timer))$('timer').value=p.timer;sticker=window.PKMStickerChoice.normalize(p.stickers??p.sticker);window.PKMStickerChoice.update('stickers','sticker',sticker);if(typeof p.mirror==='boolean')$('mirror').checked=p.mirror;if(typeof p.sound==='boolean')$('sound').checked=p.sound}catch(e){console.warn('Could not restore preferences',e)}}
function evalNever(key,value){switch(key){case 'filter':filter=value;break;case 'paper':paper=value;break;case 'frame':frame=value;break;case 'layout':layout=value;break;case 'sticker':sticker=value;break}}
async function loadImage(src){const img=new Image();img.src=src;await img.decode();return img}
function drawCover(ctx,img,x,y,w,h){const iw=img.naturalWidth,ih=img.naturalHeight,s=Math.max(w/iw,h/ih),sw=w/s,sh=h/s;ctx.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h)}
function stickerDecor(ctx,W,H,pad){window.PKMStickers.draw(ctx,sticker,stickerDensity,{x:pad,y:90,w:W-2*pad,h:H-198},paper==='dark'?'#eee4cd':'#252722')}
async function buildSoloCanvas(preview=false){
const count=shotCount(),W=layout==='grid'?920:720,pad=layout==='grid'?44:47,top=90,gap=layout==='grid'?16:18,cols=layout==='grid'?2:1,photoW=(W-2*pad-gap*(cols-1))/cols,photoH=layout==='grid'?photoW*.75:layout==='duo'?photoW*.85:photoW*.75,extra=frame==='polaroid'?24:0,rows=Math.ceil(count/cols),H=Math.ceil(top+rows*(photoH+extra)+gap*(rows-1)+108),scale=preview?1:2;const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle=papers[paper];ctx.fillRect(0,0,W,H);const ink=paper==='dark'?'#eee4cd':'#252722';ctx.fillStyle=ink;ctx.font='800 42px Arial,sans-serif';ctx.fillText('PIC KA MUNA',pad,63);const imgs=await Promise.all(photos.map(loadImage));for(let i=0;i<count;i++){const col=i%cols,row=Math.floor(i/cols),x=pad+col*(photoW+gap),y=top+row*(photoH+extra+gap);ctx.save();if(frame==='polaroid'){ctx.fillStyle='#faf5e9';ctx.fillRect(x-6,y-6,photoW+12,photoH+extra+6)}if(frame==='rounded'){ctx.beginPath();ctx.roundRect(x,y,photoW,photoH,Math.min(24,photoW/10));ctx.clip()}ctx.filter=filters[filter];drawCover(ctx,imgs[i],x,y,photoW,photoH);ctx.restore();if(grain>0){ctx.save();ctx.globalAlpha=grain/220;ctx.drawImage(grainCanvas,x,y,photoW,photoH);ctx.restore()}}stickerDecor(ctx,W,H,pad);ctx.fillStyle=ink;ctx.font='22px Georgia,serif';ctx.textAlign='left';ctx.fillText(($('captionInput').value||' ').slice(0,36),pad,H-43,W-pad*2-120);ctx.textAlign='right';ctx.font='16px monospace';ctx.fillText($('stripDate').textContent,W-pad,H-43);return {canvas,W,H,pad,top,gap,cols,photoW,photoH,extra,count};
}
async function exportPhoto(type='image/png'){
 if(photos.length!==shotCount())return;
 const btn=type==='image/png'?download:downloadJpg,original=btn.innerHTML;
 download.disabled=downloadJpg.disabled=true;btn.textContent='DEVELOPING…';
 try{
  const {canvas}=await buildSoloCanvas(false);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/jpeg'?.94:undefined));
  if(!blob)throw Error('Image export unavailable');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download=`PicKaMuna-${new Date().toISOString().slice(0,10)}.${type==='image/png'?'png':'jpg'}`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  status('Photo strip downloaded. Thanks for stopping by!');
 }catch(e){status(`Download failed: ${e.message}`)}finally{btn.innerHTML=original;buttons()}
}

let exactPreviewVersion=0,exactPreviewLayout=null;
async function renderExactPreview(){
 const serial=++exactPreviewVersion,strip=$('stripPreview');
 const prior=$('exactStripImage');
 if(photos.length!==shotCount()||photos.some(p=>!p)){
  strip.classList.remove('exact-preview-active');prior?.remove();$('exactSelection')?.remove();exactPreviewLayout=null;return;
 }
 try{
  const result=await buildSoloCanvas(true);
  if(serial!==exactPreviewVersion)return;
  exactPreviewLayout=result;
  let img=$('exactStripImage');
  if(!img){img=document.createElement('img');img.id='exactStripImage';img.alt='Your finished photostrip — matches the downloaded file';strip.append(img)}
  img.src=result.canvas.toDataURL('image/png');
  strip.classList.add('exact-preview-active');
  let highlight=$('exactSelection');
  if(!highlight){highlight=document.createElement('div');highlight.id='exactSelection';highlight.setAttribute('aria-hidden','true');strip.append(highlight)}
  if(selectedPhoto<0){highlight.hidden=true}else{
   const {W,H,pad,top,gap,cols,photoW,photoH,extra}=result;
   const col=selectedPhoto%cols,row=Math.floor(selectedPhoto/cols);
   highlight.style.left=((pad+col*(photoW+gap))/W*100)+'%';
   highlight.style.top=((top+row*(photoH+extra+gap))/H*100)+'%';
   highlight.style.width=(photoW/W*100)+'%';
   highlight.style.height=(photoH/H*100)+'%';highlight.hidden=false;
  }
 }catch(e){console.warn('Photostrip preview error:',e)}
}
$('stripPreview').addEventListener('click',e=>{
 if(!e.target.closest('#exactStripImage')||!exactPreviewLayout)return;
 const r=e.target.getBoundingClientRect(),{W,H,pad,top,gap,cols,photoW,photoH,extra,count}=exactPreviewLayout;
 const x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
 for(let i=0;i<count;i++){
  const col=i%cols,row=Math.floor(i/cols),a=pad+col*(photoW+gap),b=top+row*(photoH+extra+gap);
  if(x>=a&&x<=a+photoW&&y>=b&&y<=b+photoH){selectedPhoto=i;render();status(`Photo ${i+1} selected. Click RETAKE SELECTED to replace it.`);break}
 }
});

download.addEventListener('click',()=>exportPhoto('image/png'));downloadJpg.addEventListener('click',()=>exportPhoto('image/jpeg'));
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;if(e.code==='Space'&&!e.repeat){e.preventDefault();if(!running&&!opening&&stream)takeSession()}if(e.key.toLowerCase()==='r'&&!e.repeat&&!running&&selectedPhoto>=0&&stream)retakeOne.click()});
window.addEventListener('pagehide',stopCamera);restorePrefs();render();

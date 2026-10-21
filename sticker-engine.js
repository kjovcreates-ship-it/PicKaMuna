/* Device-independent vector stickers. SVG paths are shared by DOM preview and canvas exports. */
(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const counts={light:3,medium:6,heavy:11};
  const spots=[[.06,.15,-.23,.9],[.94,.29,.17,1.05],[.08,.44,.13,.8],[.93,.60,-.18,1.0],[.10,.79,.22,.95],[.89,.89,-.14,.9],[.08,.29,.15,.8],[.92,.44,-.25,.8],[.07,.67,-.13,.85],[.92,.75,.2,.9],[.51,.97,-.09,.75]];
  const star=(n,outer=42,inner=18)=>{let s='';for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,r=i%2?inner:outer;s+=(i?'L':'M')+(50+Math.cos(a)*r).toFixed(3)+' '+(50+Math.sin(a)*r).toFixed(3)+' ';}return s+'Z';};
  const artwork={
    stars:[star(5),star(5,42,24),star(4,43,13)],
    hearts:['M50 88 C38 77 9 57 9 35 C9 11 38 5 50 27 C62 5 91 11 91 35 C91 57 62 77 50 88 Z'],
    spark:[star(4,43,8),star(8,42,14),star(4,42,17)],
    flowers:[...Array(8)].map((_,i)=>{const a=i*Math.PI/4,cx=50+25*Math.cos(a),cy=50+25*Math.sin(a);return `M ${cx.toFixed(2)} ${cy.toFixed(2)} m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0`;}).join(' ')+' M50 40 A10 10 0 1 0 50 60 A10 10 0 1 0 50 40 Z',
    moons:['M69 9 C46 13 31 33 33 54 C35 73 49 86 72 88 C51 100 18 83 13 57 C7 29 31 5 69 9 Z'],
    bolts:['M55 5 L21 53 L45 53 L37 95 L82 39 L55 39 Z'],
    clovers:['M50 44 C33 8 2 25 23 49 C2 70 30 93 50 64 C70 93 98 70 77 49 C98 25 67 8 50 44 Z M50 62 L50 95'],
    xo:['M12 22 L44 78 M44 22 L12 78 M78 20 C52 20 52 80 78 80 C104 80 104 20 78 20 Z']
  };
  const valid=Object.keys(artwork);
  function normalize(value){return [...new Set((Array.isArray(value)?value:[value]).filter(v=>valid.includes(v)))];}
  function placements(kind,density){const chosen=normalize(kind);if(!chosen.length)return [];return spots.slice(0,counts[density]||counts.medium).map(([x,y,rotation,size],i)=>{const design=chosen[i%chosen.length];const paths=artwork[design];return {x,y,rotation,size,design,path:paths[(Math.floor(i/chosen.length))%paths.length]};});}
  // Double contrast outline ensures legibility on bright photos, dark photos and paper.
  function draw(ctx,kind,density,rect,ink){
    const items=placements(kind,density);if(!items.length)return;
    const fill=(ink==='#eee4cd'||ink==='#fffaf0')?'#fffaf0':'#20211f';
    const opposite=fill==='#fffaf0'?'#20211f':'#fffaf0';
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    for(const item of items){
      ctx.save();ctx.translate(rect.x+item.x*rect.w,rect.y+item.y*rect.h);ctx.rotate(item.rotation);
      const size=Math.max(15,Math.min(36,rect.w*.052))*item.size;
      ctx.scale(size/100,size/100);ctx.translate(-50,-50);
      const path=new Path2D(item.path);
      ctx.strokeStyle=fill;ctx.lineWidth=14;ctx.stroke(path);
      ctx.strokeStyle=opposite;ctx.lineWidth=6;ctx.stroke(path);
      if(item.design==='xo'||item.design==='clovers'){ctx.strokeStyle=fill;ctx.lineWidth=7;ctx.stroke(path);}else{ctx.fillStyle=fill;ctx.fill(path,'evenodd');}
      ctx.restore();
    }
    ctx.restore();
  }
  function preview(container,kind,density){
    container.replaceChildren();
    for(const item of placements(kind,density)){
      const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');svg.classList.add('pk-sticker','pk-vector-sticker');
      svg.style.left=(item.x*100)+'%';svg.style.top=(item.y*100)+'%';
      const size=Math.round(20*item.size);svg.style.width=size+'px';svg.style.height=size+'px';svg.style.transform=`translate(-50%,-50%) rotate(${item.rotation}rad)`;
      const p=document.createElementNS(NS,'path');p.setAttribute('d',item.path);p.setAttribute('fill',item.design==='xo'||item.design==='clovers'?'none':'currentColor');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','5');p.setAttribute('stroke-linejoin','round');p.setAttribute('stroke-linecap','round');svg.append(p);container.append(svg);
    }
  }
  window.PKMStickers={draw,preview,placements};
  function toggle(value,choice){const current=normalize(value);if(choice==='none')return [];return current.includes(choice)?current.filter(x=>x!==choice):[...current,choice];}
  function update(id,attribute,value){const chosen=normalize(value);const group=document.getElementById(id);if(!group)return;for(const b of group.querySelectorAll('button')){const v=b.dataset[attribute];const active=v==='none'?!chosen.length:chosen.includes(v);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}const summary=group.closest('details')?.querySelector('summary');if(summary?.firstChild)summary.firstChild.textContent=chosen.length?chosen.length===1?chosen[0].toUpperCase():(chosen.length+' DESIGNS SELECTED'):'NONE ';}
  window.PKMStickerChoice={normalize,toggle,update};
  document.addEventListener('pointerdown',event=>{for(const menu of document.querySelectorAll('.sticker-chooser[open]'))if(!menu.contains(event.target))menu.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const menu of document.querySelectorAll('.sticker-chooser[open]')){menu.open=false;menu.querySelector('summary')?.focus();}});
})();

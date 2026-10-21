/* Shared deterministic sticker placement: same layout for preview and PNG/JPG exports. */
(function(){
  'use strict';
  const glyphs={stars:['★','☆','✦'],hearts:['♥','♡','♥'],spark:['✳','✦','✳'],flowers:['❀','✿','❀'],moons:['☾','☽','☾'],bolts:['ϟ','ϟ','ϟ'],clovers:['♣','♧','♣'],xo:['XO','X♡O','XO']};
  const counts={light:3,medium:6,heavy:11};
  // Fixed normalized positions keep the preview and exported files consistent.
  const spots=[[.06,.15,-.23,.9],[.94,.29,.17,1.05],[.08,.44,.13,.8],[.93,.60,-.18,1.0],[.10,.79,.22,.95],[.89,.89,-.14,.9],[.08,.29,.15,.8],[.92,.44,-.25,.8],[.07,.67,-.13,.85],[.92,.75,.2,.9],[.51,.97,-.09,.75]];
  function placements(kind,density){const chosen=[...new Set((Array.isArray(kind)?kind:[kind]).filter(k=>glyphs[k]))];if(!chosen.length)return [];return spots.slice(0,counts[density]||counts.medium).map(([x,y,rotation,size],i)=>{const design=chosen[i%chosen.length];return {x,y,rotation,size,glyph:glyphs[design][Math.floor(i/chosen.length)%glyphs[design].length]}})}
  // Two contrasting outlines keep every glyph legible on light/dark paper AND photos.
  // All three booth modes share this canvas renderer for preview and export.
  function draw(ctx,kind,density,rect,ink){
    const items=placements(kind,density);if(!items.length)return;
    const dark='#20211f',light='#fffaf0';
    const fill=ink=== '#eee4cd'||ink=== '#fffaf0'?light:dark;
    const inner=fill===light?dark:light;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    for(const item of items){
      ctx.save();ctx.translate(rect.x+item.x*rect.w,rect.y+item.y*rect.h);ctx.rotate(item.rotation);
      const fontSize=Math.max(15,Math.min(36,rect.w*.052))*item.size;
      ctx.font=`bold ${fontSize}px Georgia,serif`;
      ctx.lineJoin='round';ctx.miterLimit=2;
      // A slim inner keyline and opposite outer halo remain visible over mixed imagery.
      ctx.strokeStyle=fill;ctx.lineWidth=Math.max(3,fontSize*.21);ctx.strokeText(item.glyph,0,0);
      ctx.strokeStyle=inner;ctx.lineWidth=Math.max(1.4,fontSize*.095);ctx.strokeText(item.glyph,0,0);
      ctx.fillStyle=fill;ctx.fillText(item.glyph,0,0);
      ctx.restore();
    }
    ctx.restore();
  }
  function preview(container,kind,density){container.replaceChildren();for(const item of placements(kind,density)){const span=document.createElement('span');span.className='pk-sticker';span.textContent=item.glyph;span.style.left=(item.x*100)+'%';span.style.top=(item.y*100)+'%';span.style.fontSize=`${Math.round(20*item.size)}px`;span.style.transform=`translate(-50%,-50%) rotate(${item.rotation}rad)`;container.append(span)}}
  window.PKMStickers={draw,preview,placements};
  const valid=Object.keys(glyphs);
  function normalize(value){return [...new Set((Array.isArray(value)?value:[value]).filter(x=>valid.includes(x)))];}
  function toggle(value,choice){const current=normalize(value);if(choice==='none')return [];return current.includes(choice)?current.filter(x=>x!==choice):[...current,choice];}
  function update(id,attribute,value){const chosen=normalize(value);const group=document.getElementById(id);if(!group)return;for(const b of group.querySelectorAll('button')){const v=b.dataset[attribute];const active=v==='none'?!chosen.length:chosen.includes(v);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}const summary=group.closest('details')?.querySelector('summary');if(summary?.firstChild)summary.firstChild.textContent=chosen.length?chosen.length===1?chosen[0].toUpperCase():(chosen.length+' DESIGNS SELECTED'):'NONE ';}
  window.PKMStickerChoice={normalize,toggle,update};
  // Close floating menus when the user clicks outside or presses Escape.
  document.addEventListener('pointerdown',event=>{
    for(const menu of document.querySelectorAll('.sticker-chooser[open]')){
      if(!menu.contains(event.target))menu.open=false;
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')for(const menu of document.querySelectorAll('.sticker-chooser[open]')){
      menu.open=false;menu.querySelector('summary')?.focus();
    }
  });
})();

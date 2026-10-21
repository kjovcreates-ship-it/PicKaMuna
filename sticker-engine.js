/* Shared deterministic sticker placement: same layout for preview and PNG/JPG exports. */
(function(){
  'use strict';
  const glyphs={stars:['★','☆','✦'],hearts:['♥','♡','♥'],spark:['✳','✦','✳'],flowers:['❀','✿','❀'],moons:['☾','☽','☾'],bolts:['ϟ','ϟ','ϟ'],dots:['●','○','●'],xoxo:['XO','OX','XO'],clovers:['♣','♧','♣']};
  const counts={light:3,medium:6,heavy:11};
  // Fixed normalized positions keep the preview and exported files consistent.
  const spots=[[.06,.15,-.23,.9],[.94,.29,.17,1.05],[.08,.44,.13,.8],[.93,.60,-.18,1.0],[.10,.79,.22,.95],[.89,.89,-.14,.9],[.08,.29,.15,.8],[.92,.44,-.25,.8],[.07,.67,-.13,.85],[.92,.75,.2,.9],[.51,.97,-.09,.75]];
  function placements(kind,density){if(!glyphs[kind])return [];return spots.slice(0,counts[density]||counts.medium).map(([x,y,rotation,size],i)=>({x,y,rotation,size,glyph:glyphs[kind][i%glyphs[kind].length]}))}
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
})();

/* Decode-time sprite conditioning. Never modifies source art or game rules.
 * Existing cross-cell pixels are reassigned to their figure before a uniform
 * fit; this is not padding an already clipped frame or synthesizing pixels. */
(function(root){'use strict';
const appearances=new Set(['cat-mist','cat-lotus','cat-blood','cat-ember','cat-moon','feiye-moonveil','hehuan-dusk_silk','hehuan-crimson_oath','tinglan-workshop']);
const regenerated=new Set(['cat-blood','cat-ember','cat-moon']);
// Audited disconnected effect islands in the padded 4x4 originals. Bounds
// select whole connected components, never rectangular pieces of a figure.
const fragments={
 m03:[{row:1,from:1,to:2,bounds:[208,81,240,160]},{row:2,from:1,to:2,bounds:[233,81,240,129]}],
 feiye:[{row:1,from:1,to:2,bounds:[231,80,240,127]},{row:2,from:1,to:2,bounds:[231,93,240,123]}],
 m21:[{row:1,from:1,to:2,bounds:[229,54,240,115]}]
};
function plans(group,key){
 if(group==='enemyActors'&&fragments[key])return {version:1,inset:16,ownership:true,fragments:fragments[key],seamOwners:[{row:1,after:1,owner:2},...(key==='m21'?[]:[{row:2,after:1,owner:2}])]};
 // Moonveil's 48 empty upper-left 12x12 corner samples reach alpha 8.
 if(group==='actorAppearances'&&appearances.has(key))return {version:1,inset:0,ownership:true,...(key==='feiye-moonveil'?{matteFloor:8}:{}),...(regenerated.has(key)?{fitContent:true,gridSize:181,targetIdleHeight:134}:{})};
 // These two encoded mattes reach alpha 61 and 43 on the interior cell
 // perimeter. The small headroom handles filtering; all other art is exempt.
 if(group==='enemyActors'&&key==='m15')return {version:1,matteFloor:64};
 if(group==='machineActors'&&key==='shiying')return {version:1,matteFloor:48};
 return null;
}
function matteAlpha(alpha,floor){return alpha<=floor?0:Math.round((alpha-floor)*255/(255-floor));}
function repair(input,width,height,columns,rows,options={}){
 if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||width%columns||height%rows)throw new Error('Sprite dimensions must divide into cells');
 if(input.length!==width*height*4)throw new Error('Invalid RGBA input');
 const data=new Uint8ClampedArray(input),cw=width/columns,ch=height/rows;
 const diagnostics={transferredPixels:0,removedMattePixels:0,ambiguousComponents:[],scale:1};
 if(options.matteFloor){for(let i=3;i<data.length;i+=4){const a=data[i];data[i]=matteAlpha(a,options.matteFloor);if(a&&data[i]===0)diagnostics.removedMattePixels++;} }
 if(!options.ownership)return {data,width,height,diagnostics};
 const inset=options.inset||0,w=cw-2*inset,h=ch-2*inset,rw=w*columns,rh=h*rows;
 if(w<=0||h<=0)throw new Error('Invalid sprite inset');
 const pixels=new Uint8ClampedArray(rw*rh*4),labels=new Int32Array(rw*rh),queue=new Int32Array(rw*rh),distance=new Uint8Array(rw*rh),forced=new Int16Array(rw*rh).fill(-1);let id=0;
 const anchorX=Array(columns).fill(w/2),anchorY=Array(rows).fill(h);let contentScaleCap=1.6;
 for(let row=0;row<rows;row++)for(let y=0;y<h;y++)for(let c=0;c<columns;c++){
   const src=((row*ch+inset+y)*width+c*cw+inset)*4;
   pixels.set(data.subarray(src,src+w*4),((row*h+y)*rw+c*w)*4);
  }
  if(options.fitContent){
   // The three regenerated sheets use slightly uneven grid spacing. One
   // standing pose establishes each column's horizontal foot anchor and each
   // row's baseline. Reuse these fixed anchors for all actions in that column
   // or row; never independently center or scale an action frame.
   function verticalBounds(row,column){let first=h,last=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[((row*h+y)*rw+column*w+x)*4+3]>64){first=Math.min(first,y);last=y+1;}return last?[first,last]:[0,h];}
   let idleHeight=0;
   for(let c=0;c<columns;c++){const [first,last]=verticalBounds(0,c);idleHeight=Math.max(idleHeight,last-first);let mass=0,moment=0;for(let y=Math.max(0,last-Math.ceil(h/6));y<last;y++)for(let x=0;x<w;x++){const a=pixels[(y*rw+c*w+x)*4+3];if(a>64){mass+=a;moment+=(x+.5)*a;}}if(mass)anchorX[c]=moment/mass;}
   for(let r=0;r<rows;r++)anchorY[r]=verticalBounds(r,0)[1];
   // Mist's repaired idle silhouette is 130–131px high in a 181px cell.
   // Cap the whole regenerated atlas near that size, never individual poses.
   if(options.targetIdleHeight)contentScaleCap=Math.min(contentScaleCap,options.targetIdleHeight/idleHeight);
   diagnostics.idleHeight=idleHeight;
   diagnostics.anchorColumns=anchorX;diagnostics.anchorRows=anchorY;
  }
  let minX=options.fitContent?Infinity:-w/2,maxX=options.fitContent?-Infinity:w/2,minY=options.fitContent?Infinity:-h,maxY=options.fitContent?-Infinity:0;
  for(const fragment of options.fragments||[]){
   const seen=new Uint8Array(w*h),[bx0,by0,bx1,by1]=fragment.bounds.map(n=>n-inset),ox=fragment.from*w,oy=fragment.row*h;
   for(let y=Math.max(0,by0);y<Math.min(h,by1);y++)for(let x=Math.max(0,bx0);x<Math.min(w,bx1);x++){
    const start=y*w+x;if(seen[start]||pixels[((oy+y)*rw+ox+x)*4+3]<=16)continue;
    let front=0,back=0,left=w,right=0,top=h,bottom=0;queue[back++]=start;seen[start]=1;
    while(front<back){const p=queue[front++],xx=p%w,yy=Math.floor(p/w);left=Math.min(left,xx);right=Math.max(right,xx+1);top=Math.min(top,yy);bottom=Math.max(bottom,yy+1);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=xx+dx,ny=yy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const q=ny*w+nx;if(!seen[q]&&pixels[((oy+ny)*rw+ox+nx)*4+3]>16){seen[q]=1;queue[back++]=q;}}
    }
    if(left<bx0||right>bx1||top<by0||bottom>by1)continue;
    for(let n=0;n<back;n++){const p=queue[n];forced[(oy+Math.floor(p/w))*rw+ox+p%w]=fragment.row*columns+fragment.to;}
   }
  }
  const components=[null];
  for(let start=0;start<labels.length;start++){
   if(labels[start]||pixels[start*4+3]<=64)continue;
   const next=++id;let front=0,back=0;queue[back++]=start;labels[start]=next;
   const mass=new Float64Array(columns*rows),core=new Float64Array(columns*rows);let left=rw,right=0,top=rh,bottom=0;
   while(front<back){const p=queue[front++],x=p%rw,y=Math.floor(p/rw),c=Math.floor(y/h)*columns+Math.floor(x/w),a=pixels[p*4+3];mass[c]+=a;if(x%w>=w*.15&&x%w<w*.85&&y%h>=h*.15&&y%h<h*.9)core[c]+=a;left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=rw||yy>=rh)continue;const q=yy*rw+xx;if(!labels[q]&&pixels[q*4+3]>64){labels[q]=next;queue[back++]=q;}}
   }
   const significant=[...core].map((n,c)=>n>w*h*255*.02?c:-1).filter(c=>c>=0);
   let owner=0;const scores=core.some(n=>n>0)?core:mass;for(let c=1;c<columns*rows;c++)if(scores[c]>scores[owner])owner=c;
   const ambiguous=significant.length>1;
   if(ambiguous)diagnostics.ambiguousComponents.push({row:Math.floor(top/h),columns:significant.map(c=>c%columns),cells:significant.map(c=>({row:Math.floor(c/columns),column:c%columns})),bounds:[left,top,right,bottom]});
   // Small detached spell fragments can straddle a seam without a body core.
   if(!significant.length)for(const seam of options.seamOwners||[]){const boundary=(seam.after+1)*w;if(seam.row===Math.floor(top/h)&&left<boundary&&right>boundary)owner=seam.row*columns+seam.owner;}
   components.push({owner,ambiguous});
  }
  // Keep original antialiasing immediately around the solid figure. Limit
  // growth to six source pixels: an almost-transparent atlas-wide haze must
  // not pull unrelated decorations or distant soft effects into this frame.
  let front=0,back=0;for(let p=0;p<labels.length;p++)if(labels[p])queue[back++]=p;
  while(front<back){const p=queue[front++],x=p%rw,y=Math.floor(p/rw);if(distance[p]>=6)continue;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=rw||yy>=rh)continue;const q=yy*rw+xx;if(!labels[q]&&pixels[q*4+3]){labels[q]=labels[p];distance[q]=distance[p]+1;queue[back++]=q;}}}
  const own=new Int16Array(rw*rh);
  for(let p=0;p<own.length;p++){
   const x=p%rw,y=Math.floor(p/rw),original=Math.floor(y/h)*columns+Math.floor(x/w),component=components[labels[p]];
   const owner=forced[p]>=0?forced[p]:component&&!component.ambiguous?component.owner:original;own[p]=owner;
   if(!pixels[p*4+3])continue;
   if(owner!==original)diagnostics.transferredPixels++;
   if(options.fitContent&&pixels[p*4+3]<=4)continue;
   const local=x-(owner%columns)*w-anchorX[owner%columns],localY=y-Math.floor(owner/columns)*h-anchorY[Math.floor(owner/columns)];minX=Math.min(minX,local);maxX=Math.max(maxX,local+1);minY=Math.min(minY,localY);maxY=Math.max(maxY,localY+1);
  }
 // Same scale and bottom-center anchor for ALL cells: no frame size pumping.
 // The inset was encoding padding. Remove it before reconstructing seams, then
 // fit the full recovered extent into a fresh transparent gutter.
 const margin=Math.max(4,Math.ceil(Math.min(cw,ch)*.025));
 if(!Number.isFinite(minX)){minX=-w/2;maxX=w/2;minY=-h;maxY=0;}
 const extent=Math.max(-minX,maxX);
 const scale=Math.min(options.fitContent?contentScaleCap:1,(cw/2-margin)/extent,(ch-2*margin)/(maxY-minY));
 diagnostics.scale=scale;
 const output=new Uint8ClampedArray(data.length);
 // Inverse bilinear sampling uses premultiplied alpha, so transparent RGB
 // garbage cannot introduce colored fringes around the recovered figure.
 for(let row=0;row<rows;row++)for(let c=0;c<columns;c++)for(let y=margin;y<ch-margin;y++)for(let x=margin;x<cw-margin;x++){
  const sx=(x+.5-cw/2)/scale+anchorX[c]-.5,sy=(y+.5-(ch-margin))/scale+anchorY[row]+maxY-.5;
  const ix=Math.floor(sx),iy=Math.floor(sy),tx=sx-ix,ty=sy-iy;let alpha=0,red=0,green=0,blue=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
   const gx=c*w+ix+dx,gy=row*h+iy+dy;if(gx<0||gx>=rw||gy<0||gy>=rh)continue;
   const p=gy*rw+gx;if(own[p]!==row*columns+c)continue;
   const weight=(dx?tx:1-tx)*(dy?ty:1-ty),a=pixels[p*4+3]*weight;alpha+=a;red+=pixels[p*4]*a;green+=pixels[p*4+1]*a;blue+=pixels[p*4+2]*a;
  }
  const dst=((row*ch+y)*width+c*cw+x)*4;output[dst+3]=Math.round(alpha);if(alpha){output[dst]=Math.round(red/alpha);output[dst+1]=Math.round(green/alpha);output[dst+2]=Math.round(blue/alpha);}
 }
 return {data:output,width,height,diagnostics};
}
function prepare(image,d){
 if(!d?.repair||typeof document==='undefined')return image;
 const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
 const width=d.repair.gridSize?d.columns*d.repair.gridSize:sourceWidth,height=d.repair.gridSize?d.rows*d.repair.gridSize:sourceHeight;
 if(d.repair.gridSize&&(Math.abs(sourceWidth-width)>1||Math.abs(sourceHeight-height)>1))throw new Error('Audited sprite grid differs by more than one source pixel');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Sprite repair requires Canvas2D');
 ctx.drawImage(image,0,0,width,height);const source=ctx.getImageData(0,0,width,height),result=repair(source.data,width,height,d.columns,d.rows,d.repair);source.data.set(result.data);ctx.putImageData(source,0,0);canvas.spriteRepair={...result.diagnostics,sourceWidth,sourceHeight,preparedWidth:width,preparedHeight:height};return canvas;
}
const api={plans,matteAlpha,repair,prepare};if(typeof module!=='undefined')module.exports=api;root.NightSpriteFrames=api;
})(typeof globalThis!=='undefined'?globalThis:this);

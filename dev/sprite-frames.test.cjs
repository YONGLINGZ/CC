'use strict';
const test=require('node:test'),A=require('node:assert/strict'),F=require('./sprite-frames.js');
function image(columns=2,rows=1,size=32){return {width:columns*size,height:rows*size,columns,rows,data:new Uint8ClampedArray(columns*rows*size*size*4)};}
function rect(im,x,y,w,h,rgba){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)im.data.set(rgba,(yy*im.width+xx)*4);}
function run(im,options){return F.repair(im.data,im.width,im.height,im.columns,im.rows,options);}
function count(im,c,color){let n=0;const w=im.width/2;for(let y=0;y<im.height;y++)for(let x=c*w;x<(c+1)*w;x++){const i=(y*im.width+x)*4;if(im.data[i+3]>64&&im.data[i+color]>200)n++;}return n;}
test('only audited matte and seam assets receive repair plans',()=>{
 A.equal(F.plans('actors','sword'),null);A.equal(F.plans('bossActors','feiye'),null);A.equal(F.plans('enemyActors','m03').inset,16);A.equal(F.plans('actorAppearances','cat-mist').inset,0);A.equal(F.plans('actorAppearances','cat-mist').matteFloor,undefined);A.equal(F.plans('actorAppearances','feiye-moonveil').matteFloor,8);A.equal(F.plans('enemyActors','m15').matteFloor,64);A.equal(F.plans('machineActors','shiying').matteFloor,48);
});
test('matte correction removes measured low-alpha residue and preserves opaque art without mutating input',()=>{
 const im=image();rect(im,1,1,25,25,[200,198,199,32]);rect(im,8,4,10,22,[30,70,110,255]);const original=im.data.slice();const r=run(im,{matteFloor:64});
 A.equal(r.data[(2*im.width+2)*4+3],0);A.deepEqual([...r.data.subarray((8*im.width+10)*4,(8*im.width+10)*4+4)],[30,70,110,255]);A.deepEqual(im.data,original);A.ok(r.diagnostics.removedMattePixels>0);A.equal(F.matteAlpha(255,64),255);
});
test('cross-frame weapon pixels return to their owner, preserving both figures and transparent margins',()=>{
 const im=image();rect(im,6,5,13,24,[255,0,0,255]);rect(im,40,5,14,24,[0,0,255,255]);rect(im,29,8,16,3,[0,0,255,255]);rect(im,28,9,1,1,[0,0,255,30]);
 const r=run(im,{ownership:true});A.equal(r.diagnostics.ambiguousComponents.length,0);A.ok(r.diagnostics.transferredPixels>0);A.equal(count(r,0,2),0,'no foreign blue fragment remains');A.ok(count(r,1,2)>50);A.ok(count(r,0,0)>50);
 for(let y=0;y<im.height;y++)for(const x of [0,31,32,63])A.equal(r.data[(y*im.width+x)*4+3],0);
});
test('depadding reconnects an overflow severed by encoded gutters',()=>{
 const im=image();rect(im,7,6,10,22,[255,0,0,255]);rect(im,41,6,10,22,[0,0,255,255]);
 // 2px inset at each side: last interior x29 neighbors next interior x34.
 rect(im,28,10,2,3,[0,0,255,255]);rect(im,34,10,12,3,[0,0,255,255]);
 const r=run(im,{ownership:true,inset:2});A.ok(r.diagnostics.transferredPixels>0);A.equal(count(r,0,2),0);A.ok(count(r,1,2)>50);A.ok(count(r,0,0)>50);
});
test('entangled opaque bodies are flagged instead of assigning both bodies to one frame',()=>{
 const im=image();rect(im,6,5,14,24,[255,0,0,255]);rect(im,40,5,14,24,[0,0,255,255]);rect(im,17,12,26,4,[0,255,0,255]);
 const r=run(im,{ownership:true});A.ok(r.diagnostics.ambiguousComponents.length>0);A.deepEqual(r.diagnostics.ambiguousComponents[0].columns,[0,1]);A.ok(count(r,0,0)>50);A.ok(count(r,1,2)>50);
});
test('cross-row fan pixels return to the lower frame instead of remaining below an unrelated attack',()=>{
 const im=image(1,2);rect(im,7,5,14,22,[255,0,0,255]);rect(im,7,40,14,20,[0,0,255,255]);rect(im,9,29,3,13,[0,0,255,255]);
 const r=run(im,{ownership:true});let topBlue=0,bottomBlue=0;
 for(let y=0;y<64;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;if(r.data[i+3]>64&&r.data[i+2]>200){if(y<32)topBlue++;else bottomBlue++;}}
 A.equal(topBlue,0);A.ok(bottomBlue>50);A.ok(r.diagnostics.transferredPixels>0);A.equal(r.diagnostics.ambiguousComponents.length,0);
});
test('audited disconnected effect islands transfer as components without cutting a figure inside the selection bounds',()=>{
 const im=image();rect(im,6,5,13,24,[255,0,0,255]);rect(im,40,5,14,24,[0,0,255,255]);rect(im,27,8,3,3,[0,255,0,255]);
 const r=run(im,{ownership:true,fragments:[{row:0,from:0,to:1,bounds:[17,7,31,17]}]});
 A.equal(count(r,0,1),0);A.ok(count(r,1,1)>0);A.ok(count(r,0,0)>50,'overlapping rectangle must not cut the red figure');A.ok(count(r,1,2)>50);
});
test('decoder rejects non-cell dimensions and malformed RGBA',()=>{
 A.throws(()=>F.repair(new Uint8ClampedArray(4),1,1,2,1,{}),/divide/);A.throws(()=>F.repair(new Uint8ClampedArray(1),1,1,1,1,{}),/RGBA/);
});
test('regenerated grids reuse fixed column and row anchors and one fit scale across all frames',()=>{
 const im=image(2,2);for(let row=0;row<2;row++){rect(im,7,row*32+8+row*3,8,18,[255,0,0,255]);rect(im,50,row*32+8+row*3,8,18,[0,0,255,255]);}
 const r=run(im,{ownership:true,fitContent:true});A.deepEqual(r.diagnostics.anchorColumns,[11,22]);A.deepEqual(r.diagnostics.anchorRows,[26,29]);A.ok(r.diagnostics.scale>1);
 const centers=[],bottoms=[];for(let row=0;row<2;row++)for(let c=0;c<2;c++){let min=32,max=0,bottom=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(r.data[((row*32+y)*64+c*32+x)*4+3]>64){min=Math.min(min,x);max=Math.max(max,x);bottom=Math.max(bottom,y);}centers.push((min+max)/2);bottoms.push(bottom);}
 A.ok(centers.every(n=>n===centers[0]));A.ok(bottoms.every(n=>n===bottoms[0]));A.equal(F.plans('actorAppearances','cat-mist').fitContent,undefined);
 const capped=run(im,{ownership:true,fitContent:true,targetIdleHeight:20});A.equal(capped.diagnostics.idleHeight,18);A.ok(capped.diagnostics.scale*18<=20);A.ok(capped.diagnostics.scale<r.diagnostics.scale);A.equal(F.plans('actorAppearances','cat-moon').targetIdleHeight,134);
});
test('only audited regenerated grids normalize a one-pixel source-size deviation in the decode canvas',()=>{
 const previous=global.document;let draw;
 global.document={createElement(){return {getContext(){return {drawImage(...args){draw=args;},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};}};
 try{const image={naturalWidth:1447,naturalHeight:1087},d={columns:8,rows:6,repair:F.plans('actorAppearances','cat-ember')};const canvas=F.prepare(image,d);A.equal(canvas.width,1448);A.equal(canvas.height,1086);A.deepEqual(draw,[image,0,0,1448,1086]);A.equal(canvas.spriteRepair.sourceWidth,1447);A.equal(F.prepare(image,{columns:8,rows:6}),image);A.throws(()=>F.prepare({naturalWidth:1446,naturalHeight:1087},d),/more than one/);}finally{if(previous===undefined)delete global.document;else global.document=previous;}
});

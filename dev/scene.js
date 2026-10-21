/* Offline procedural WebGL scene. Real triangle meshes; no downloaded models,
   image billboards, 3D libraries or network requests. These are low-poly scene
   prototypes, not production character models or Cubism/Live2D assets. */
(function (global) {
  'use strict';
  const hasDOM=typeof document!=='undefined',instances=new Map();
  let serial=0,raf=0,lastTick=0,globalFrames=0,cleanupObserver=null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function mul(a,b){const r=new Array(16).fill(0);for(let c=0;c<4;c++)for(let y=0;y<4;y++)for(let k=0;k<4;k++)r[c*4+y]+=a[k*4+y]*b[c*4+k];return r;}
  const T=(x=0,y=0,z=0)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
  const S=(x=1,y=x,z=x)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
  const RX=a=>{const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];};
  const RY=a=>{const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];};
  const RZ=a=>{const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];};
  const unit=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
  function lookAt(eye,target){const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
  const ortho=(l,r,b,t,n,f)=>[2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1];
  function point(m,p,w=1){return[0,1,2,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]*w);}
  const C={stone:[.10,.18,.21],rock:[.055,.105,.13],edge:[.19,.33,.36],ice:[.34,.76,.85],white:[.80,.90,.91],gold:[.69,.54,.29],red:[.58,.13,.16],ink:[.055,.07,.10],skin:[.85,.74,.67],hair:[.045,.075,.11],violet:[.37,.20,.44],bone:[.58,.60,.53]};
  const REGIONAL_SCENES=[
    {id:'gate',name:'雾锁山门',fog:[.035,.09,.115],deep:'#0b1924',light:'#29434b',accent:[.39,.68,.73]},
    {id:'camp',name:'断桥诸营',fog:[.10,.085,.065],deep:'#211e19',light:'#4b4332',accent:[.72,.54,.32]},
    {id:'core',name:'逆仪腹地',fog:[.09,.04,.11],deep:'#180e22',light:'#442239',accent:[.62,.24,.39]}
  ];
  function regional(options){const index=Number.isInteger(options.regionIndex)?clamp(options.regionIndex,0,2):Number.isInteger(options.region?.index)?clamp(options.region.index,0,2):0;return{...REGIONAL_SCENES[index],...options.region,index};}
  function localMap(options){
    let rows=Array.isArray(options.map)?options.map:[];
    // The scene never draws later-region geometry or labels, even if a caller
    // supplies the whole run graph. Old unscoped callers retain their map API.
    const scoped=Number.isInteger(options.regionIndex)||options.region;
    const area=regional(options),start=Number(area.start||area.stages?.[0])||area.index*4+1,end=Number(area.end||area.stages?.[1])||area.index*4+4;
    rows=rows.map(row=>row.filter(n=>n.revealed!==false&&(!scoped||(n.floor>=start&&n.floor<=end)))).filter(row=>row.length);
    return rows;
  }
  function color(c,scale=1){return c.map(v=>clamp(v*scale,0,1));}
  function tri(g,a,b,c,shade){const n=unit(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])g.push(...v,...n,...shade);}
  function quad(g,a,b,c,d,shade){tri(g,a,b,c,shade);tri(g,a,c,d,shade);}
  function box(g,at,size,shade,angle=0){
    const [x,y,z]=at,[sx,sy,sz]=size.map(v=>v/2),m=mul(T(x,y,z),RY(angle));
    const p=[[-sx,-sy,-sz],[sx,-sy,-sz],[sx,sy,-sz],[-sx,sy,-sz],[-sx,-sy,sz],[sx,-sy,sz],[sx,sy,sz],[-sx,sy,sz]].map(v=>point(m,v).slice(0,3));
    for(const [a,b,c,d]of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(g,p[a],p[b],p[c],p[d],shade);
  }
  function rings(g,at,rings,shade,sides=8,phase=0){
    const [x,y,z]=at,pts=rings.map(([yy,rx,rz])=>Array.from({length:sides},(_,j)=>{const a=phase+j/sides*Math.PI*2;return[x+Math.sin(a)*rx,y+yy,z+Math.cos(a)*rz];}));
    for(let k=0;k<pts.length-1;k++)for(let j=0;j<sides;j++){const next=(j+1)%sides;quad(g,pts[k][j],pts[k][next],pts[k+1][next],pts[k+1][j],shade);}
    for(let j=0;j<sides;j++){const next=(j+1)%sides;tri(g,[x,y+rings[0][0],z],pts[0][next],pts[0][j],shade);tri(g,[x,y+rings.at(-1)[0],z],pts.at(-1)[j],pts.at(-1)[next],shade);}
  }
  function ellipsoid(g,at,r,shade,sides=8,bands=5){const rows=[];for(let j=0;j<=bands;j++){const a=-Math.PI/2+j/bands*Math.PI;rows.push([Math.sin(a)*r[1],Math.cos(a)*r[0],Math.cos(a)*r[2]]);}rings(g,at,rows,shade,sides);}
  function beam(g,a,b,width,shade){
    const dir=unit(sub(b,a)),right=unit(cross(dir,Math.abs(dir[1])>.94?[1,0,0]:[0,1,0])),up=unit(cross(right,dir));
    const corners=p=>[[1,1],[1,-1],[-1,-1],[-1,1]].map(([x,y])=>p.map((v,i)=>v+(right[i]*x+up[i]*y)*width/2));
    const u=corners(a),v=corners(b);for(let j=0;j<4;j++)quad(g,u[j],v[j],v[(j+1)%4],u[(j+1)%4],shade);quad(g,...u.slice().reverse(),shade);quad(g,...v,shade);
  }
  function tube(g,points,radius,shade,sides=6){
    for(let k=0;k<points.length-1;k++){
      const p=points[k],q=points[k+1],dir=unit(sub(q,p)),right=unit(cross(dir,Math.abs(dir[1])>.92?[1,0,0]:[0,1,0])),up=unit(cross(right,dir));
      const ring=(a,r)=>Array.from({length:sides},(_,j)=>a.map((v,i)=>v+(right[i]*Math.cos(j/sides*Math.PI*2)+up[i]*Math.sin(j/sides*Math.PI*2))*r));
      const rr=radius*(1-k/(points.length*1.5)),a=ring(p,rr),b=ring(q,rr*.94);for(let j=0;j<sides;j++)quad(g,a[j],a[(j+1)%sides],b[(j+1)%sides],b[j],shade);
    }
  }
  function transformed(g,m){const out=[];for(let i=0;i<g.length;i+=9){const p=point(m,g.slice(i,i+3)),n=unit(point(m,g.slice(i+3,i+6),0).slice(0,3));out.push(...p.slice(0,3),...n,...g.slice(i+6,i+9));}return out;}
  function crystal(g,at,r,h,shade){rings(g,at,[[-h*.22,0,0],[0,r,r*.75],[h*.66,r*.66,r*.52],[h,0,0]],shade,5,.24);}
  function part(name,pivot,geometry){return{name,pivot,geometry};}
  function makeActor(kind){
    const cat=kind==='assassin',parts=[],body=[],head=[],hair=[],left=[],right=[],tail=[],weapon=[];
    const cloth=cat?[.11,.08,.11]:[.61,.76,.80],trim=cat?C.gold:C.ice,under=cat?C.red:[.11,.24,.34],hairColor=cat?C.hair:[.53,.65,.71],skin=cat?C.skin:[.78,.84,.84];
    // Adult proportions: long legs and robes, seven-and-a-half head heights.
    rings(body,[0,0,0],[[.13,.34,.23],[.60,.33,.20],[1.16,.21,.15],[1.45,.28,.18],[1.83,.31,.16],[1.94,.22,.14]],cloth,10);
    rings(body,[0,.16,.016],[[0,.34,.24],[.70,.27,.20],[1.20,.17,.17]],under,8,.15);
    box(body,[0,1.40,.015],[.45,.10,.35],trim);
    beam(body,[0,1.39,.19],[-.15,.32,.255],.045,trim);beam(body,[.06,1.39,.19],[.19,.41,.25],.025,trim);
    rings(body,[0,1.91,.01],[[0,.11,.09],[.21,.105,.085]],skin,8);
    ellipsoid(body,[-.17,.13,.08],[.12,.10,.24],C.ink);ellipsoid(body,[.17,.13,.08],[.12,.10,.24],C.ink);
    // Layered over-robe panels and a high collar give the sword cultivator a
    // different silhouette; the assassin uses short sleeves and a red sash.
    if(!cat){
      rings(body,[0,1.90,0],[[-.23,.27,.19],[.03,.13,.13],[.08,.12,.11]],color(cloth,1.14),8);
      for(const s of [-1,1])beam(body,[s*.24,1.87,-.06],[s*.48,.34,-.13],.13,color(cloth,.83));
      box(body,[0,1.42,.202],[.10,.13,.04],C.ice);
    }else{
      beam(body,[-.23,1.79,.12],[.21,1.43,.20],.055,C.gold);
      for(const x of [-.09,.09])ellipsoid(body,[x,1.40,.23],[.045,.045,.04],C.gold,6,3);
    }
    ellipsoid(head,[0,2.29,.025],cat?[.19,.245,.17]:[.181,.25,.16],skin,10,6);
    ellipsoid(head,[0,2.40,-.035],[.218,.20,.19],hairColor,10,5);
    // Face is actual small geometry, not a character image billboard.
    for(const s of [-1,1]){
      beam(head,[s*.045,2.30,.181],[s*.123,cat?2.315:2.30,.168],cat?.018:.015,C.ink);
      ellipsoid(head,[s*.082,2.292,.187],[.015,cat?.014:.010,.012],cat?[.95,.65,.18]:[.27,.62,.76],6,3);
      beam(head,[s*.048,cat?2.348:2.343,.17],[s*.13,cat?2.346:2.352,.15],.014,cat?C.hair:[.22,.32,.39]);
    }
    beam(head,[-.035,2.205,.184],[.035,2.205,.184],.013,cat?[.48,.17,.18]:[.44,.27,.28]);
    crystal(head,[0,2.54,-.06],.045,.11,trim);
    // Long separate hair ribbons receive their own local rotation.
    for(const [x,z,lean]of [[-.18,-.04,-.09],[.18,-.04,.10],[-.11,-.16,-.07],[.04,-.19,.05],[.15,-.15,.13]]){
      const p=[[x,2.43,z],[x*1.12,2.16,z-.02],[x+lean*.5,1.76,z-.06],[x+lean,1.28,z-.10],[x+lean*1.4,1.06,z-.04]];tube(hair,p,.075,hairColor,5);
    }
    // Swept fringe instead of a spherical helmet.
    for(const s of [-1,1])tube(hair,[[s*.02,2.53,.015],[s*.12,2.46,.13],[s*.16,2.29,.12],[s*.17,2.09,.085]],.045,hairColor,5);
    for(const s of [-1,1]){
      const arm=s<0?left:right;
      const shoulder=[s*.30,1.86,0],elbow=[s*(cat?.45:.40),1.54,.03],wrist=[s*(cat?.45:.43),1.26,.16];
      beam(arm,shoulder,elbow,cat?.17:.23,cloth);
      beam(arm,elbow,wrist,cat?.11:.20,cat?skin:color(cloth,1.14));
      ellipsoid(arm,wrist,[.065,.09,.06],skin,6,4);
      if(cat){beam(arm,[s*.46,1.34,.15],[s*.46,1.24,.16],.12,C.ink);beam(arm,[s*.45,1.23,.19],[s*.61,.89,.28],.055,[.67,.75,.76]);beam(arm,[s*.38,1.23,.19],[s*.53,1.23,.24],.035,C.gold);}
    }
    if(cat){
      for(const s of [-1,1]){
        const a=[s*.10,2.48,-.01],b=[s*.25,2.49,-.035],c=[s*.22,2.78,-.035],d=[s*.18,2.49,-.12];
        tri(head,a,b,c,C.ink);tri(head,a,c,d,color(C.ink,1.6));tri(head,b,d,c,C.hair);tri(head,[s*.13,2.50,.0],[s*.23,2.50,-.01],[s*.215,2.70,-.01],[.53,.26,.29]);
      }
      tube(tail,[[.18,1.02,-.18],[.48,.88,-.32],[.79,.99,-.34],[.96,1.28,-.30],[.94,1.66,-.26],[.76,1.84,-.22],[.59,1.77,-.19]],.09,C.ink,7);
      ellipsoid(tail,[.60,1.77,-.19],[.09,.10,.09],C.ink,7,4);
    }else{
      // An ice-edged jian hangs from the right hand. Diamond cross section,
      // separate gold guard, dark grip and a tassel distinguish it from claws.
      rings(weapon,[.43,.95,.18],[[-.94,0,0],[-.82,.07,.026],[.18,.052,.024],[.24,.04,.02]],[.64,.85,.91],4,Math.PI/4);
      beam(weapon,[.29,1.20,.18],[.58,1.20,.18],.045,C.gold);
      beam(weapon,[.43,1.20,.18],[.43,1.43,.18],.055,C.ink);
      ellipsoid(weapon,[.43,1.46,.18],[.055,.05,.045],C.ice,6,4);
      tube(weapon,[[.44,1.44,.17],[.61,1.29,.12],[.63,1.04,.12]],.018,C.ice,5);
      // Silver hairpin, bun and an icy shoulder ornament.
      ellipsoid(head,[0,2.56,-.07],[.11,.105,.11],hairColor,8,4);
      beam(head,[-.22,2.54,-.07],[.23,2.54,-.07],.018,C.ice);
      crystal(body,[-.29,1.87,.07],.05,.12,C.ice);
    }
    parts.push(part('body',[0,1.3,0],body),part('head',[0,2.12,0],head),part('hair',[0,2.37,-.04],hair),part('leftArm',[-.30,1.86,0],left),part('rightArm',[.30,1.86,0],right));
    if(tail.length)parts.push(part('tail',[.18,1.02,-.18],tail));
    if(weapon.length)parts.push(part('weapon',[.30,1.86,0],weapon));
    return parts;
  }
  function makeEnemy(kind){
    const g=[];
    if(kind==='snake'){
      tube(g,[[-.6,.20,.18],[0,.15,.48],[.63,.25,.24],[.58,.39,-.30],[.06,.49,-.43],[-.39,.63,-.08],[-.18,.79,.15],[.04,1.10,.0]],.24,[.18,.34,.32],9);
      rings(g,[0,1.02,0],[[0,.22,.17],[.47,.29,.15],[.73,.15,.12]],[.14,.19,.22],9);
      ellipsoid(g,[0,2.01,.02],[.19,.24,.16],[.59,.71,.67],9,5);
      rings(g,[0,2.10,-.07],[[-.48,.25,.14],[.27,.22,.17],[.39,0,0]],C.ink,9);
      for(const s of [-1,1]){beam(g,[s*.04,2.02,.178],[s*.13,2.02,.15],.025,[.76,.34,.31]);crystal(g,[s*.17,2.21,-.02],.045,.26,C.gold);}
      beam(g,[-.29,1.65,0],[-.53,1.30,.18],.14,[.21,.37,.36]);beam(g,[.29,1.65,0],[.56,1.52,.19],.14,[.21,.37,.36]);
    }else if(kind==='raider'){
      // A living cultivator has boots, a hooded travel coat and a single jian,
      // rather than borrowing the horned guardian silhouette.
      const robe=[.19,.19,.24],leather=[.24,.15,.12],face=[.66,.51,.43];
      for(const s of [-1,1]){box(g,[s*.15,.21,.02],[.19,.34,.28],C.ink);beam(g,[s*.16,.38,.02],[s*.14,1.13,0],.22,robe);}
      rings(g,[0,.62,0],[[0,.37,.23],[.60,.23,.17],[1.13,.35,.21]],robe,8,.12);
      box(g,[0,1.22,.02],[.48,.10,.38],leather);box(g,[.08,1.23,.23],[.14,.13,.04],C.gold);
      ellipsoid(g,[0,1.98,.045],[.19,.25,.17],face,9,5);
      rings(g,[0,1.94,-.045],[[-.25,.26,.20],[.25,.22,.20],[.41,.05,.04]],C.ink,8);
      box(g,[0,1.90,.185],[.30,.13,.055],robe);
      for(const s of [-1,1]){beam(g,[s*.045,2.015,.205],[s*.12,2.03,.193],.02,[.18,.13,.11]);beam(g,[s*.31,1.66,0],[s*.43,1.25,.09],.18,robe);ellipsoid(g,[s*.43,1.20,.10],[.07,.10,.075],face,6,4);}
      beam(g,[.45,1.23,.12],[.53,.94,.15],.055,leather);beam(g,[.39,1.00,.15],[.67,.97,.15],.04,C.gold);beam(g,[.54,.96,.15],[.85,.21,.19],.065,[.52,.59,.65]);
      beam(g,[-.25,1.70,.17],[.22,1.22,.22],.055,leather);
    }else{
      rings(g,[0,0,0],[[.12,.46,.25],[.66,.29,.20],[1.37,.24,.19],[1.75,.40,.24]],C.rock,7);
      box(g,[0,1.48,.05],[.53,.46,.31],C.bone);box(g,[0,1.93,.04],[.31,.36,.26],C.bone);
      for(const s of [-1,1]){beam(g,[s*.11,1.98,.181],[s*.04,1.96,.181],.035,C.red);beam(g,[s*.37,1.66,0],[s*.49,1.05,.08],.16,C.edge);crystal(g,[s*.17,2.08,-.03],.07,.38,C.rock);}
      beam(g,[.48,1.14,.09],[.76,.35,.08],.13,C.bone);
    }
    return[part('body',[0,1.20,0],g)];
  }
  function nodePositions(map){
    const result=new Map(),rows=Array.isArray(map)?map:[],count=rows.length||1;
    for(let floor=0;floor<rows.length;floor++){
      const row=rows[floor];for(let lane=0;lane<row.length;lane++){
        const n=row[lane],f=Number(n.floor)||floor+1,l=Number.isFinite(n.lane)?n.lane:lane;
        result.set(n.id,{node:n,position:[(floor-(count-1)/2)*2.85,floor*.075,(l-(row.length-1)/2)*2.60+Math.sin(f*.75)*.12]});
      }
    }return result;
  }
  function regionalLandmarks(g,index,{map=false,extent=6,battle=false}={}){
    const scale=map?1:.72,z=map?-4.9:-2.0,local=[];
    if(index===0){
      // A broken ceremonial gate flanked by steep slate mountain spires.
      for(const s of [-1,1]){
        box(local,[s*1.10,1.04,z],[.36,2.4,.42],C.edge);
        box(local,[s*1.10,-.13,z],[.64,.22,.64],C.stone);
        crystal(local,[s*(map?extent-1:2.8),-.6,z+.4],.75,3.5,C.rock);
        crystal(local,[s*(map?extent:3.3),-.6,z-.4],.58,2.8,color(C.edge,.6));
        crystal(local,[s*1.10,2.30,z],.13,.52,C.ice);
      }
      box(local,[0,2.24,z],[2.85,.25,.62],C.stone);
      beam(local,[-1.58,2.35,z],[0,2.65,z],.19,C.edge);beam(local,[0,2.65,z],[1.58,2.35,z],.19,C.edge);
      box(local,[0,1.90,z+.27],[.59,.38,.08],C.rock);
      for(let k=0;k<4;k++)box(local,[(k-1.5)*.58,-.23,z+1.2+(k%2)*.1],[.48,.10,.86],C.stone);
    }else if(index===1){
      // An interrupted timber bridge and independent triangular camp tents.
      for(const s of [-1,1]){
        const x=s*2.0;
        for(let k=0;k<4;k++)box(local,[x+s*k*.31,.04,z+1.0],[.25,.12,.72],color(C.gold,.55));
        for(const dz of [-.4,.4]){box(local,[x+s*.72,.45,z+1+dz],[.09,.95,.09],color(C.gold,.7));beam(local,[x,.65,z+1+dz],[x+s*1.5,.78,z+1+dz],.045,C.gold);}
        const cx=s*(map?extent-1.2:2.4),cz=z-.05;
        tri(local,[cx-.72,0,cz+.55],[cx+.72,0,cz+.55],[cx,.95,cz+.55],[.36,.25,.19]);
        quad(local,[cx-.72,0,cz-.55],[cx-.72,0,cz+.55],[cx,.95,cz+.55],[cx,.95,cz-.55],[.46,.34,.22]);
        quad(local,[cx+.72,0,cz+.55],[cx+.72,0,cz-.55],[cx,.95,cz-.55],[cx,.95,cz+.55],[.30,.27,.23]);
        beam(local,[cx,.95,cz-.70],[cx,.95,cz+.72],.06,C.gold);
        rings(local,[cx-s*.9,.08,cz+.9],[[0,.19,.18],[.13,.17,.16]],C.stone,7);
        crystal(local,[cx-s*.9,.19,cz+.9],.12,.38,[.96,.50,.16]);
      }
      for(let k=0;k<4;k++)box(local,[(k-1.5)*.37,-.45-Math.abs(k-1.5)*.08,z+1.10],[.25,.07,.56],color(C.gold,.35),k*.29);
      for(const x of [-.8,.8]){box(local,[x,1.05,z-.25],[.06,2.1,.06],C.edge);box(local,[x+.19,1.72,z-.25],[.39,.55,.03],x<0?C.red:C.gold);}
    }else{
      // Concentric experimental well, oblique pylons and red suspended shards.
      rings(local,[0,.05,z],[[0,1.62,1.05],[.25,1.60,1.04]],C.rock,14);
      rings(local,[0,.31,z],[[0,1.31,.85],[.11,1.30,.84]],C.violet,14);
      rings(local,[0,.43,z],[[0,1.05,.67],[.02,1.05,.67]],[.14,.04,.16],14);
      for(let j=0;j<8;j++){
        const a=j/8*Math.PI*2,x=Math.sin(a)*1.45,zz=z+Math.cos(a)*.94;
        beam(local,[x,.14,zz],[x*1.15,1.14+(j%2)*.55,z+(zz-z)*1.15],.15,C.edge);
        crystal(local,[x*1.15,1.14+(j%2)*.55,z+(zz-z)*1.15],.12,.55,C.red);
        if(j%2===0)beam(local,[0,.46,z],[x,.46,zz],.025,[.73,.24,.40]);
      }
      crystal(local,[0,1.22,z],.28,1.18,[.56,.18,.37]);
      for(const s of [-1,1])crystal(local,[s*(map?extent-.6:2.8),-.5,z+.5],.63,2.4,C.violet);
    }
    g.push(...transformed(local,S(scale)));
  }
  function makeMap(instance){
    const g=[],details=[],o=instance.options,available=new Set(o.availableNodes||[]),visited=new Set((o.history||[]).map(n=>typeof n==='string'?n:n.id));
    const rows=localMap(o),region=regional(o),positions=nodePositions(rows),chosen=positions.has(o.currentNode)?o.currentNode:[...positions.keys()].find(id=>available.has(id))||[...positions.keys()][0];
    // Bridges are actual rectangular beams joining only engine-defined edges.
    for(const {node,position:p}of positions.values())for(const target of node.next||[]){
      const next=positions.get(target);if(!next)continue;
      const traversed=visited.has(node.id)&&visited.has(target),open=(node.id===o.currentNode||!o.currentNode&&visited.size===0)&&available.has(target);
      const shade=traversed?C.gold:open?C.ice:[.13,.23,.27],q=next.position;
      beam(g,[p[0],p[1]-.04,p[2]],[q[0],q[1]-.04,q[2]],traversed||open?.075:.040,shade);
      if(open){for(let k=1;k<5;k++){const t=k/5;crystal(g,[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t+.035,p[2]+(q[2]-p[2])*t],.025,.09,C.ice);}}
    }
    for(const [id,{node,position:p}]of positions){
      const local=[],open=available.has(id),done=visited.has(id),accent=done?C.gold:open?C.ice:[.22,.35,.40];
      rings(local,[0,-.17,0],[[-1.05,.09,.11],[-.49,.60,.50],[0,.73,.60],[.15,.72,.59]],C.rock,7,.2);
      rings(local,[0,0,0],[[.01,.72,.59],[.12,.71,.58]],open?color(C.stone,1.9):done?color(C.stone,1.45):C.stone,7,.2);
      rings(local,[0,.13,0],[[0,.73,.60],[.045,.73,.60]],accent,7,.2);
      // A distinct modeled landmark for every node type, in addition to labels.
      const type=node.type;
      if(type==='fight'||type==='elite'){
        for(const s of [-1,1])box(local,[s*.27,.46,0],[.13,.67,.15],type==='elite'?C.bone:C.edge);
        box(local,[0,.82,0],[.74,.12,.20],accent);if(type==='elite')for(const s of [-1,1])crystal(local,[s*.29,.92,0],.06,.35,[.57,.30,.32]);
      }else if(type==='rest'){
        rings(local,[0,.19,0],[[0,.44,.37],[.08,.44,.37]],C.edge,9);rings(local,[0,.28,0],[[0,.34,.28],[.01,.34,.28]],C.ice,10);
        crystal(local,[.36,.28,-.20],.09,.33,[.41,.67,.65]);
      }else if(type==='shop'){
        for(const s of [-1,1])box(local,[s*.31,.42,0],[.06,.55,.06],C.gold);
        rings(local,[0,.70,0],[[0,.50,.40],[.16,.11,.08]],C.red,4,Math.PI/4);box(local,[0,.28,.20],[.56,.18,.18],C.edge);
      }else if(type==='boss'){
        rings(local,[0,.22,0],[[0,.56,.43],[.15,.52,.40]],C.violet,8);
        for(const s of [-1,1]){box(local,[s*.37,.70,-.08],[.13,1.06,.15],C.rock);crystal(local,[s*.37,1.25,-.08],.11,.46,C.red);}
        rings(local,[0,.52,0],[[0,.33,.25],[.62,.18,.13],[.84,0,0]],C.violet,6);
      }else if(type==='fox'){
        box(local,[0,.24,0],[.53,.21,.40],C.red);crystal(local,[0,.44,0],.19,.54,C.gold);
        for(const s of [-1,1])beam(local,[s*.16,.68,0],[s*.30,.98,0],.08,C.red);
      }else{
        box(local,[0,.35,-.05],[.43,.43,.19],C.rock);box(local,[0,.62,-.05],[.58,.11,.30],C.edge);crystal(local,[0,.53,.14],.09,.42,C.violet);
      }
      for(const [dx,dz,h]of [[-.49,.18,.38],[.42,-.31,.29]])crystal(local,[dx,.16,dz],.07,h,open?C.ice:color(C.ice,.4));
      g.push(...transformed(local,T(...p)));
      details.push({nodeId:id,node,position:[p[0],p[1]+1.12,p[2]],available:open,visited:done});
    }
    // Broken perimeter pillars hint at the failed experiment beyond the route.
    const extent=Math.max(6,(rows.length||4)*1.45);
    for(let k=0;k<12;k++){
      const x=-extent+k/11*extent*2,z=(k%2?-1:1)*(5.2+(k%3)*.25),h=.8+(k%4)*.45;
      rings(g,[x,-.6,z],[[0,.37,.31],[h,.19,.18]],C.rock,5,k);crystal(g,[x,h-.55,z],.13,.56,color(region.accent,.55));
    }
    regionalLandmarks(g,region.index,{map:true,extent});
    const anchor=positions.get(chosen)?.position||[0,0,0];
    return{parts:[part('world',[0,0,0],g)],details,actors:[{kind:o.character==='sword'?'sword':'assassin',position:[anchor[0],anchor[1]+.16,anchor[2]+.26],scale:.43,rotation:.10}]};
  }
  function makeCharacterScene(instance){
    const mode=instance.options.mode,world=[],battle=mode==='battle';
    rings(world,[0,-.08,0],[[0,battle?3.4:1.25,battle?2.2:1.05],[.12,battle?3.4:1.25,battle?2.2:1.05]],C.rock,14);
    rings(world,[0,.045,0],[[0,battle?3.40:1.26,battle?2.20:1.06],[.018,battle?3.40:1.26,battle?2.20:1.06]],C.edge,14);
    const sword=instance.options.character==='sword',accent=sword?C.ice:C.gold;
    for(let j=0;j<(battle?9:6);j++){
      const a=j/(battle?9:6)*Math.PI*2,r=battle?3.0:1.08;
      crystal(world,[Math.sin(a)*r,.08,Math.cos(a)*r*(battle?.65:1)],.075,.19+(j%3)*.12,accent);
    }
    if(battle){for(const s of [-1,1])for(let j=0;j<3;j++)rings(world,[s*(2.8+j*.4),-.08,-1.5-j*.4],[[0,.16,.14],[1.1+j*.45,.11,.10]],C.rock,5);}
    if(mode==='arrival'||battle)regionalLandmarks(world,regional(instance.options).index,{map:false,battle});
    // A dark geometric footprint and calibrated sole height keep the figure
    // grounded on the platform instead of hovering above the scene.
    rings(world,battle?[-1.15,.067,.15]:[0,.067,0],[[0,.38,.25],[.001,.38,.25]],color(C.rock,.42),12);
    const actors=[{kind:sword?'sword':'assassin',position:battle?[-1.15,.033,.15]:[0,.03,0],scale:battle?.95:1,rotation:battle?.50:-.15}];
    if(battle)actors.push({kind:'enemy',enemyId:instance.options.enemyId,position:[1.50,.10,-.16],scale:.95,rotation:-.45});
    return{parts:[part('world',[0,0,0],world)],details:[],actors};
  }
  function checksum(geometry){let n=2166136261;for(const v of geometry){n^=Math.round(v*10000);n=Math.imul(n,16777619);}return(n>>>0).toString(16).padStart(8,'0');}
  const vertexSource='attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uProjection,uView,uModel;varying vec3 vColor;varying float vDepth;void main(){vec4 p=uView*uModel*vec4(aPosition,1.0);vec3 n=normalize(mat3(uModel)*aNormal);float light=.37+max(dot(n,normalize(vec3(-.50,.90,.65))),0.0)*.63;vColor=aColor*light;vDepth=-p.z;gl_Position=uProjection*p;}';
  const fragmentSource='precision mediump float;varying vec3 vColor;varying float vDepth;uniform float uFogNear,uFogFar;uniform vec3 uFogColor;void main(){float fog=clamp((vDepth-uFogNear)/(uFogFar-uFogNear),0.0,.58);gl_FragColor=vec4(mix(vColor,uFogColor,fog),1.0);}';
  function shader(gl,type,source){const s=gl.createShader(type);if(!s)throw Error('Shader unavailable');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(reason||'Shader compilation failed');}return s;}
  function programFor(gl){const vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource),p=gl.createProgram();if(!p)throw Error('Program unavailable');gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const reason=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(reason||'Program linking failed');}return p;}
  function upload(instance,p){const gl=instance.gl,buffer=gl.createBuffer();if(!buffer)throw Error('Buffer unavailable');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p.geometry),gl.STATIC_DRAW);return{...p,buffer,count:p.geometry.length/9,signature:checksum(p.geometry)};}
  function deleteMeshes(instance){for(const p of instance.meshes||[])instance.gl.deleteBuffer(p.buffer);instance.meshes=[];}
  function buildKey(o){return JSON.stringify([o.mode,o.character,o.enemyId,o.regionIndex,o.region,o.map,o.availableNodes,o.history,o.currentNode]);}
  function build(instance){
    deleteMeshes(instance);const built=instance.options.mode==='map'?makeMap(instance):makeCharacterScene(instance);
    instance.details=built.details;instance.actors=[];instance.meshes=built.parts.map(p=>upload(instance,{...p,actor:null}));
    for(const [index,actor]of built.actors.entries()){
      const parts=actor.kind==='enemy'?makeEnemy(actor.enemyId):makeActor(actor.kind),record={...actor,index,parts:parts.length};instance.actors.push(record);
      for(const p of parts)instance.meshes.push(upload(instance,{...p,actor:record}));
    }
    instance.vertices=instance.meshes.reduce((n,p)=>n+p.count,0);instance.triangles=instance.vertices/3;
    instance.modelSignature=instance.meshes.filter(p=>p.actor?.index===0).map(p=>p.signature).join('-');
    instance.worldSignature=instance.meshes.filter(p=>!p.actor).map(p=>p.signature).join('-');
    instance.enemySignature=instance.meshes.filter(p=>p.actor?.kind==='enemy').map(p=>p.signature).join('-');
    const area=regional(instance.options);instance.root.dataset.sceneRegion=area.id;
    instance.root.style.setProperty('--scene-deep',area.deep);instance.root.style.setProperty('--scene-light',area.light);
    instance.caption.textContent=instance.options.mode==='map'?`${area.name} · 只显示本境相连的道路`:instance.options.mode==='arrival'?`${area.name} · 进入眼前这一境`:instance.options.mode==='battle'?`${area.name} · 交锋之地`:'行旅身影';
    makeButtons(instance);instance.rebuilds++;instance.builtKey=buildKey(instance.options);instance.dirty=true;
  }
  const nodeSymbols={fight:'战',elite:'险',rest:'憩',shop:'商',fox:'契',event:'异',boss:'魇'};
  const nodeNames={fight:'交战',elite:'强敌',rest:'休憩',shop:'商铺',fox:'狐契',event:'奇遇',boss:'灾源'};
  function makeButtons(instance){
    instance.overlay.replaceChildren();instance.buttons=new Map();
    if(instance.options.mode!=='map')return;
    for(const d of instance.details){
      const b=document.createElement('button');b.type='button';b.className='scene-node'+(d.available?' scene-node-current':'')+(d.visited?' scene-node-visited':'');
      b.dataset.sceneNode=d.nodeId;b.dataset.action='node';b.dataset.node=d.nodeId;b.disabled=!d.available;
      const name=nodeNames[d.node.type]||'奇遇',scoped=Number.isInteger(instance.options.regionIndex)||instance.options.region,step=scoped?d.node.floor-(regional(instance.options).stages?.[0]||regional(instance.options).index*4+1)+1:d.node.floor;
      b.title=`第 ${step} 段 · ${d.node.name||name} · ${d.node.description||''}`;
      b.setAttribute('aria-label',`第${step}段 ${d.node.name||name} ${d.visited?'已完成':d.available?'可前往':'尚不可达'}`);
      const sigil=document.createElement('b');sigil.textContent=nodeSymbols[d.node.type]||'异';const label=document.createElement('span');label.textContent=`${step} · ${name}`;b.append(sigil,label);
      b.addEventListener('click',event=>{
        if(!instance.alive||instance.locked||!(instance.options.availableNodes||[]).includes(d.nodeId)){event.preventDefault();event.stopImmediatePropagation();return;}
        if(typeof instance.options.onNode==='function'){
          event.preventDefault();event.stopPropagation();instance.locked=true;for(const el of instance.buttons.values())el.disabled=true;
          instance.unlockTimer=setTimeout(()=>{instance.locked=false;if(instance.alive)for(const [id,el]of instance.buttons)el.disabled=!(instance.options.availableNodes||[]).includes(id);},350);
          instance.options.onNode(d.nodeId);
        }
      });instance.overlay.append(b);instance.buttons.set(d.nodeId,b);
    }
  }
  function resize(instance){
    const rect=instance.root.getBoundingClientRect(),width=Math.max(1,Math.round(rect.width||640)),height=Math.max(1,Math.round(rect.height||360)),ratio=Math.min(1.6,global.devicePixelRatio||1);
    if(width!==instance.width||height!==instance.height||ratio!==instance.ratio){instance.width=width;instance.height=height;instance.ratio=ratio;instance.canvas.width=Math.round(width*ratio);instance.canvas.height=Math.round(height*ratio);instance.gl.viewport(0,0,instance.canvas.width,instance.canvas.height);instance.dirty=true;}
  }
  function camera(instance){
    const aspect=instance.width/instance.height,map=instance.options.mode==='map',battle=instance.options.mode==='battle';
    let extent,eye,target;
    if(map){const length=localMap(instance.options).length||4;extent=Math.max(9.7,(length*2.85+3)/aspect);eye=[1.8,29,20];target=[0,.7,0];}
    else{extent=battle?4.25:3.25;eye=battle?[6.8,4.5,8.2]:[3.7,2.6,7.5];target=battle?[.05,1.20,0]:[0,1.43,0];}
    instance.view=lookAt(eye,target);instance.projection=ortho(-extent*aspect/2,extent*aspect/2,-extent/2,extent/2,.1,100);instance.viewProjection=mul(instance.projection,instance.view);instance.cameraEye=eye;
  }
  function poseFor(instance,time){
    const dynamic=instance.options.motion!=='reduced',t=(time-instance.birth)/1000,look=dynamic?instance.look:{x:0,y:0},action=instance.action;
    let p=0,pulse=0,kind=null;if(action){p=clamp((time-action.start)/action.duration,0,1);if(p>=1)instance.action=null;else{kind=action.type;pulse=Math.sin(p*Math.PI);}}
    const pose={breath:dynamic?Math.sin(t*1.8)*.016:0,headYaw:dynamic?look.x*.14+Math.sin(t*.7)*.012:0,hair:dynamic?Math.sin(t*1.3)*.035:0,tail:dynamic?Math.sin(t*1.1)*.19:0,leftArm:0,rightArm:0,lean:0,shift:0,kind,p};
    if(dynamic&&kind==='attack'){pose.rightArm=-pulse*.90;pose.leftArm=pulse*.25;pose.lean=-pulse*.13;pose.shift=pulse*.30;}
    else if(dynamic&&kind==='hurt'){pose.lean=pulse*.16;pose.shift=-pulse*.16;pose.headYaw+=Math.sin(p*Math.PI*3)*.10;}
    else if(dynamic&&kind==='guard'){pose.leftArm=-pulse*.65;pose.rightArm=-pulse*.25;}
    else if(dynamic&&(kind==='heal'||kind==='revive')){pose.leftArm=-pulse*.18;pose.rightArm=-pulse*.18;pose.breath+=pulse*.025;}
    instance.pose=pose;return pose;
  }
  function localFor(part,pose,actor){
    const p=part.pivot;let m=I();
    if(part.name==='head')m=RY(pose.headYaw);
    else if(part.name==='hair')m=mul(RY(pose.headYaw*.6),RZ(pose.hair));
    else if(part.name==='tail')m=RY(pose.tail);
    else if(part.name==='leftArm')m=RX(pose.leftArm);
    else if(part.name==='rightArm'||part.name==='weapon')m=RX(pose.rightArm);
    m=mul(mul(T(...p),m),T(-p[0],-p[1],-p[2]));
    const movement=actor.index===0?pose:{...pose,shift:0,lean:0};
    return mul(mul(mul(T(actor.position[0]+movement.shift,actor.position[1]+movement.breath,actor.position[2]),RY(actor.rotation)),mul(RZ(movement.lean),S(actor.scale))),m);
  }
  function project(instance,p){const v=point(instance.viewProjection,p);return{x:(v[0]/v[3]*.5+.5)*instance.width,y:(-.5*v[1]/v[3]+.5)*instance.height};}
  function render(instance,time=now()){
    if(!instance.alive||!instance.supported)return;resize(instance);camera(instance);
    const gl=instance.gl,pose=poseFor(instance,time);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(instance.program);
    gl.uniformMatrix4fv(instance.uniforms.uProjection,false,new Float32Array(instance.projection));gl.uniformMatrix4fv(instance.uniforms.uView,false,new Float32Array(instance.view));
    gl.uniform1f(instance.uniforms.uFogNear,instance.options.mode==='map'?24:8);gl.uniform1f(instance.uniforms.uFogFar,instance.options.mode==='map'?60:24);
    gl.uniform3fv(instance.uniforms.uFogColor,new Float32Array(regional(instance.options).fog));
    for(const mesh of instance.meshes){
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);for(const [name,size,offset]of [['aPosition',3,0],['aNormal',3,12],['aColor',3,24]]){const loc=instance.attributes[name];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset);}
      gl.uniformMatrix4fv(instance.uniforms.uModel,false,new Float32Array(mesh.actor?localFor(mesh,pose,mesh.actor):I()));gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    instance.projections=[];for(const detail of instance.details){const p=project(instance,detail.position),button=instance.buttons.get(detail.nodeId);if(button){button.style.left=p.x+'px';button.style.top=p.y+'px';}instance.projections.push({nodeId:detail.nodeId,x:p.x,y:p.y,available:detail.available,visited:detail.visited});}
    instance.frames++;globalFrames++;instance.dirty=false;instance.ready=true;instance.root.dataset.sceneReady='true';
  }
  function visible(instance){return instance.alive&&instance.supported&&instance.active&&instance.intersects&&instance.root.isConnected&&!document.hidden;}
  function pruneDetached(){for(const i of [...instances.values()])if(!i.root.isConnected)dispose(i.root);}
  function observeRoots(){if(!cleanupObserver&&typeof MutationObserver==='function'){cleanupObserver=new MutationObserver(pruneDetached);cleanupObserver.observe(document.documentElement,{childList:true,subtree:true});}}
  function schedule(){if(!hasDOM)return;pruneDetached();if(raf||document.hidden)return;if([...instances.values()].some(i=>visible(i)&&i.options.motion!=='reduced'))raf=requestAnimationFrame(tick);}
  function tick(time){raf=0;pruneDetached();if(time-lastTick>=1000/30){lastTick=time;for(const i of instances.values())if(visible(i)&&i.options.motion!=='reduced')render(i,time);}schedule();}
  function installStyle(){
    if(document.querySelector('style[data-night-scene]'))return;const style=document.createElement('style');style.dataset.nightScene='';
    style.textContent='.night-scene{isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 50% 35%,var(--scene-light,#1d3b43),transparent 72%),linear-gradient(145deg,var(--scene-deep,#0c1d25),#102028);border:1px solid #7ea7ad38}.night-scene canvas{position:absolute;inset:0;display:block;width:100%;height:100%}.scene-node-layer{position:absolute;inset:0;pointer-events:none}.scene-node{position:absolute;width:72px;min-height:39px;transform:translate(-50%,-92%);padding:3px 5px;display:flex;align-items:center;justify-content:center;gap:5px;pointer-events:auto;border:1px solid #63818b55;color:#a0b3b6;background:#10242bd9;border-radius:3px;font:10px/1.2 system-ui,sans-serif;text-align:left;box-shadow:0 3px 15px #06131e77}.scene-node b{font-size:17px;font-weight:500;color:#b0c7c9}.scene-node span{max-width:40px}.scene-node:disabled{opacity:.80;cursor:default}.scene-node-visited:disabled{opacity:.65}.scene-node-current{color:#eff8f3;border-color:#9ce6e1;background:#1b444be8;box-shadow:0 0 18px #7ce3e32b}.scene-node-current b{color:#b0f3ef}.scene-node-current:hover,.scene-node-current:focus-visible{outline:2px solid #dfdfad;outline-offset:2px;background:#2a5259}.scene-node-visited{border-color:#c5a87177;color:#d4c099}.scene-node-visited b{color:#dcc490}.scene-fallback{position:absolute;inset:0;display:grid;place-items:center;padding:20px;color:#a7c5c5;font:12px/1.7 system-ui,sans-serif;text-align:center}.scene-model-caption{position:absolute;left:12px;bottom:8px;color:#8eafb6;font:10px/1.4 system-ui,sans-serif;pointer-events:none;letter-spacing:.05em}';document.head.append(style);
  }
  function failed(root,reason,mode){if(getComputedStyle(root).position==='static')root.style.position='relative';root.dataset.sceneSupported='false';root.dataset.sceneReady='false';root.classList.add('night-scene');root._nightSceneFailure={supported:false,ready:false,alive:false,mode,reason};const message=document.createElement('div');message.className='scene-fallback';message.textContent=mode==='map'?'立体沙盘暂未启用，可使用下方路线。':'行旅模型暂未启用，人物立绘仍可查看。';root.append(message);return root._nightSceneFailure;}
  function mount(root,options={}){
    if(!hasDOM||!root)return{supported:false,ready:false,alive:false};if(instances.has(root))return sync(root,options);installStyle();delete root._nightSceneFailure;root.querySelectorAll(':scope > .scene-fallback').forEach(e=>e.remove());
    const canvas=document.createElement('canvas');canvas.dataset.sceneCanvas='';canvas.setAttribute('aria-hidden','true');let gl;
    try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});}catch(error){return failed(root,'WebGL unavailable',options.mode);}
    if(!gl)return failed(root,'WebGL unavailable',options.mode);
    const instance={id:++serial,root,canvas,gl,options:{mode:'character',character:'assassin',motion:'full',...options},alive:true,supported:true,ready:false,active:options.active!==false,intersects:true,meshes:[],frames:0,rebuilds:0,birth:now(),look:{x:0,y:0},pose:null,action:null,locked:false,projections:[]};
    try{
      instance.program=programFor(gl);instance.attributes=Object.fromEntries(['aPosition','aNormal','aColor'].map(n=>[n,gl.getAttribLocation(instance.program,n)]));instance.uniforms=Object.fromEntries(['uProjection','uView','uModel','uFogNear','uFogFar','uFogColor'].map(n=>[n,gl.getUniformLocation(instance.program,n)]));
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.03,.07,.09,0);gl.disable(gl.CULL_FACE);
      instance.originalPosition=root.style.position;instance.positionChanged=getComputedStyle(root).position==='static';if(instance.positionChanged)root.style.position='relative';
      root.classList.add('night-scene');root.dataset.sceneSupported='true';root.dataset.sceneReady='false';root.dataset.sceneMode=instance.options.mode;root.dataset.sceneCharacter=instance.options.character;
      instance.overlay=document.createElement('div');instance.overlay.className='scene-node-layer';root.append(canvas,instance.overlay);
      instance.caption=document.createElement('div');instance.caption.className='scene-model-caption';instance.caption.textContent=instance.options.mode==='map'?'寒渊封域 · 连桥指向可行之路':instance.options.mode==='battle'?'封域残台':'行旅身影';root.append(instance.caption);
      instances.set(root,instance);observeRoots();build(instance);render(instance);
      instance.pointer=event=>{const rect=root.getBoundingClientRect();instance.look={x:clamp((event.clientX-rect.left)/Math.max(1,rect.width)*2-1,-1,1),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height)*2-1,-1,1)};};instance.leave=()=>{instance.look={x:0,y:0};};root.addEventListener('pointermove',instance.pointer);root.addEventListener('pointerleave',instance.leave);
      instance.contextLost=event=>{event.preventDefault();instance.supported=false;instance.ready=false;root.dataset.sceneSupported='false';root.dataset.sceneReady='false';instance.caption.textContent='行旅模型已暂停，下方路线仍可使用。';if(raf){cancelAnimationFrame(raf);raf=0;}schedule();};canvas.addEventListener('webglcontextlost',instance.contextLost);
      if(typeof ResizeObserver==='function'){instance.resizer=new ResizeObserver(()=>{if(!instance.root.isConnected){dispose(root);return;}if(instance.alive&&instance.supported){render(instance);schedule();}});instance.resizer.observe(root);}
      if(typeof IntersectionObserver==='function'){instance.intersection=new IntersectionObserver(entries=>{if(!instance.alive)return;if(!instance.root.isConnected){dispose(root);return;}instance.intersects=entries[0]?.isIntersecting!==false;if(instance.intersects){if(instance.supported)render(instance);schedule();}},{rootMargin:'80px'});instance.intersection.observe(root);}
      schedule();return inspect(root);
    }catch(error){deleteMeshes(instance);if(instance.program)gl.deleteProgram(instance.program);instances.delete(root);canvas.remove();instance.overlay?.remove();instance.caption?.remove();return failed(root,error.message,instance.options.mode);}
  }
  function sync(root,options={}){
    const i=instances.get(root);if(!i)return mount(root,options);const previous=i.options;
    i.options={...previous,...options};const needsBuild=buildKey(i.options)!==i.builtKey;i.active=i.options.active!==false;root.dataset.sceneCharacter=i.options.character;root.dataset.sceneMode=i.options.mode;
    if(i.options.motion==='reduced'){i.action=null;i.look={x:0,y:0};}
    if(needsBuild&&i.supported)build(i);if(i.supported)render(i);schedule();return inspect(root);
  }
  function act(root,type,options={}){
    const i=instances.get(root);if(!i||!i.alive||!i.supported||i.options.motion==='reduced'||!['attack','hurt','guard','heal','revive'].includes(type))return false;
    i.action={type,start:now(),duration:clamp(Number(options.duration)||(i.options.motion==='fast'?160:type==='revive'?700:450),80,1400)};schedule();return true;
  }
  function dispose(root){
    const i=instances.get(root);if(!i){if(root){root.querySelectorAll(':scope > .scene-fallback').forEach(e=>e.remove());delete root._nightSceneFailure;}return false;}
    i.alive=false;clearTimeout(i.unlockTimer);i.resizer?.disconnect();i.intersection?.disconnect();root.removeEventListener('pointermove',i.pointer);root.removeEventListener('pointerleave',i.leave);i.canvas.removeEventListener('webglcontextlost',i.contextLost);deleteMeshes(i);i.gl.deleteProgram(i.program);i.gl.getExtension('WEBGL_lose_context')?.loseContext();i.canvas.remove();i.overlay.remove();i.caption.remove();instances.delete(root);root.dataset.sceneReady='false';if(i.positionChanged&&root.style.position==='relative')root.style.position=i.originalPosition;
    if(!instances.size&&cleanupObserver){cleanupObserver.disconnect();cleanupObserver=null;}if(![...instances.values()].some(visible)&&raf){cancelAnimationFrame(raf);raf=0;}return true;
  }
  function inspect(root){
    if(!root)return{instances:instances.size,rafCount:raf?1:0,frames:globalFrames,webglInstances:[...instances.values()].filter(i=>i.supported).length};
    const i=instances.get(root);if(!i)return root._nightSceneFailure||{alive:false,supported:false,ready:false};
    return{id:i.id,alive:i.alive,supported:i.supported,ready:i.ready,mode:i.options.mode,type:i.options.mode,character:i.options.character,frames:i.frames,rebuilds:i.rebuilds,vertices:i.vertices,meshVertices:i.vertices,triangles:i.triangles,triangleCount:i.triangles,parts:i.meshes.length,modelSignature:i.modelSignature,worldSignature:i.worldSignature,enemySignature:i.enemySignature,regionIndex:regional(i.options).index,regionId:regional(i.options).id,fogColor:[...regional(i.options).fog],visibleNodeIds:i.details.map(d=>d.nodeId),pose:i.pose?{...i.pose}:null,animation:i.action?.type||null,availableNodes:[...(i.options.availableNodes||[])],projections:i.projections.map(p=>({...p})),canvasCount:i.root.querySelectorAll('[data-scene-canvas]').length,width:i.width,height:i.height,look:{...i.look},visible:i.intersects,renderer:'WebGL triangle meshes; procedural low-poly prototype'};
  }
  if(hasDOM)document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf){cancelAnimationFrame(raf);raf=0;}}else{for(const i of instances.values())if(visible(i))render(i);schedule();}});
  const api={mount,sync,act,dispose,inspect};global.NightScene=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

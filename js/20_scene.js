
/* v49：投影的当日一句话（words.json——谁的名字谁写；走近身体的访客能看到） */
let wordData=null;
ghGet('words.json').then(({data})=>{
  wordData=(data&&data.words)||{};
}).catch(()=>{wordData={};});
/* 名字存档：回到上次站的地方 */
if(NPC_TOKEN&&ME){
  ghGet('saves/'+encodeURIComponent(ME.name)+'.json').then(({data})=>{
    if(data&&data.pos&&isFinite(data.pos[0])){p.x=data.pos[0];p.z=data.pos[1];}
  }).catch(()=>{});
}
npcLoop();                    // 无令牌也跑（读留言板+公开读NPC）
if(NPC_TOKEN){
  setTimeout(()=>{if(!sessionStorage.getItem('hetan_greeted')){sessionStorage.setItem('hetan_greeted','1');showStele('你叫'+ME.name+'。\n河滩记下你了——走了，人也还在。');}},2600);
}

/* ================= 渲染 ================= */
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();
const npcGroup=new THREE.Group();scene.add(npcGroup);   // 来客NPC容器（npcs在NPC模块定义）
scene.background=new THREE.Color(0x9fc5e0);
scene.fog=new THREE.Fog(0x9fc5e0,45,110);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.08,200);
const amb=new THREE.AmbientLight(0xdfeaf2,0.85);scene.add(amb);
const sun=new THREE.DirectionalLight(0xfff2dd,0.75);
sun.position.set(40,60,20);scene.add(sun);

/* ================= 动物（v44）：鸭浮河面、鸡啄东滩、狗看碑 =================
   贴图canvas画——羽毛有斑纹、头脸有眼睛喙冠耳，不是NPC那种两个单色块。
   位置全是(时间,seed)的纯函数，和NPC离线漫游同一套确定性：谁打开看到同一群。 */
const animalGroup=new THREE.Group();scene.add(animalGroup);
function aTex(painter){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');painter(g,64);const t=new THREE.CanvasTexture(cv);return t;}
function aMottle(g,base,mot,n){g.fillStyle=base;g.fillRect(0,0,64,64);for(let i=0;i<n;i++){g.fillStyle=mot[i%mot.length];g.globalAlpha=0.10+((i*37)%20)/100;g.beginPath();g.ellipse((i*53+17)%60+2,(i*97+31)%60+2,2+(i*13)%4,1+(i*7)%3,(i%7)*0.45,0,7);g.fill();}g.globalAlpha=1;}
function aM(tex){return new THREE.MeshLambertMaterial({map:tex});}
function a6(side,top,front){const s=aM(side),t2=aM(top||side),f=aM(front||side);return[s,s,t2,s,f,s];}   // [+x,-x,+y,-y,+z,-z]：脸画在+z
function aBox(w,h,d,mats){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats);}
/* 鸭：白身灰羽，橙喙 */
const duckBodyT=aTex(g=>{aMottle(g,'#f2f0e8',['#d8d5ca','#e4e1d6'],26);});
const duckBodyS=aTex(g=>{aMottle(g,'#eceade',['#d0cdc2','#e0ddd0'],30);g.fillStyle='rgba(160,158,148,.35)';g.fillRect(0,44,64,20);});
const duckFace=aTex(g=>{g.fillStyle='#f4f2ea';g.fillRect(0,0,64,64);g.fillStyle='#1a1a1a';g.beginPath();g.arc(22,26,4.5,0,7);g.arc(42,26,4.5,0,7);g.fill();g.fillStyle='#ffffff';g.beginPath();g.arc(23.5,24.5,1.4,0,7);g.arc(43.5,24.5,1.4,0,7);g.fill();});
const duckBill=aTex(g=>{g.fillStyle='#e8862a';g.fillRect(0,0,64,64);g.fillStyle='#c96f1c';g.fillRect(0,40,64,4);});
/* 鸡：栗褐芦花，红冠黄喙 */
const henBodyS=aTex(g=>{aMottle(g,'#a05a30',['#7a3f1e','#c07a40','#8a4a24'],40);});
const henBodyT=aTex(g=>{aMottle(g,'#8a4a24',['#6a3818'],30);});
const henFace=aTex(g=>{aMottle(g,'#9a5228',['#7a3f1e'],16);g.fillStyle='#1a1a1a';g.beginPath();g.arc(22,28,4,0,7);g.arc(42,28,4,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(23.4,26.6,1.2,0,7);g.arc(43.4,26.6,1.2,0,7);g.fill();});
const henComb=aTex(g=>{g.fillStyle='#c8322a';g.fillRect(0,0,64,64);g.fillStyle='#e0483e';for(let i=0;i<5;i++)g.fillRect(8+i*12,0,6,18);});
const henLeg=aTex(g=>{g.fillStyle='#d8912a';g.fillRect(0,0,64,64);g.fillStyle='#b8771c';for(let i=0;i<6;i++)g.fillRect(0,i*11,64,2);});
/* 狗：黄狗黑背，垂耳黑鼻 */
const dogBodyS=aTex(g=>{aMottle(g,'#c89858',['#a87838','#d8a868'],28);});
const dogBodyT=aTex(g=>{aMottle(g,'#8a6a38',['#6a5028','#9a7848'],34);});
const dogFace=aTex(g=>{aMottle(g,'#c89858',['#a87838'],14);g.fillStyle='#1a1a1a';g.beginPath();g.arc(22,24,4.2,0,7);g.arc(42,24,4.2,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(23.4,22.6,1.3,0,7);g.arc(43.4,22.6,1.3,0,7);g.fill();g.fillStyle='#2a2a2a';g.fillRect(26,44,12,9);});
const dogEar=aTex(g=>{g.fillStyle='#5a3f22';g.fillRect(0,0,64,64);g.fillStyle='#4a331a';g.fillRect(0,0,64,10);});
function makeDuck(){const g=new THREE.Group();
  const body=aBox(0.46,0.3,0.6,a6(duckBodyS,duckBodyT));body.position.y=0.15;g.add(body);
  const head=aBox(0.26,0.28,0.26,a6(duckBodyS,null,duckFace));head.position.set(0,0.42,0.16);g.add(head);
  const bill=aBox(0.13,0.06,0.16,aM(duckBill));bill.position.set(0,0.4,0.34);g.add(bill);
  const tail=aBox(0.18,0.05,0.2,a6(duckBodyS));tail.position.set(0,0.24,-0.36);tail.rotation.x=0.45;g.add(tail);
  g.userData={head};return g;}
function makeHen(){const g=new THREE.Group();
  for(const sx of[-1,1]){const leg=aBox(0.05,0.18,0.05,aM(henLeg));leg.position.set(sx*0.09,0.09,0);g.add(leg);}
  const body=aBox(0.4,0.34,0.5,a6(henBodyS,henBodyT));body.position.y=0.35;g.add(body);
  const head=aBox(0.24,0.24,0.24,a6(henBodyS,null,henFace));head.position.set(0,0.62,0.12);g.add(head);
  const comb=aBox(0.06,0.08,0.14,aM(henComb));comb.position.set(0,0.77,0.12);g.add(comb);
  const beak=aBox(0.08,0.05,0.1,aM(duckBill));beak.position.set(0,0.6,0.27);g.add(beak);
  const tail=aBox(0.2,0.24,0.08,a6(henBodyT));tail.position.set(0,0.5,-0.3);tail.rotation.x=-0.55;g.add(tail);
  g.userData={head};return g;}
function makeDog(){const g=new THREE.Group();
  for(const sx of[-1,1])for(const sz of[-1,1]){const leg=aBox(0.07,0.28,0.07,a6(dogBodyS));leg.position.set(sx*0.15,0.14,sz*0.19);g.add(leg);}
  const body=aBox(0.32,0.3,0.62,a6(dogBodyS,dogBodyT));body.position.y=0.42;g.add(body);
  const head=aBox(0.3,0.3,0.28,a6(dogBodyS,dogBodyT,dogFace));head.position.set(0,0.64,0.36);g.add(head);
  const snout=aBox(0.14,0.1,0.12,a6(dogBodyT));snout.position.set(0,0.57,0.55);g.add(snout);
  for(const sx of[-1,1]){const ear=aBox(0.08,0.15,0.05,aM(dogEar));ear.position.set(sx*0.11,0.84,0.32);g.add(ear);}
  const tp=new THREE.Group();tp.position.set(0,0.52,-0.32);
  const tail=aBox(0.06,0.06,0.24,a6(dogBodyS));tail.position.set(0,0.07,-0.11);tail.rotation.x=0.6;tp.add(tail);g.add(tp);
  g.userData={head,tail:tp};return g;}
function makeGoose(){const g=new THREE.Group();   // 鹅：比鸭大一号，长脖子额瘤
  const body=aBox(0.55,0.38,0.72,a6(duckBodyS,duckBodyT));body.position.y=0.19;g.add(body);
  const neck=aBox(0.13,0.4,0.13,a6(duckBodyS));neck.position.set(0,0.52,0.22);g.add(neck);
  const head=aBox(0.16,0.16,0.2,a6(duckBodyS,null,duckFace));head.position.set(0,0.78,0.24);g.add(head);
  const knob=aBox(0.07,0.07,0.07,aM(duckBill));knob.position.set(0,0.86,0.31);g.add(knob);   // 额瘤
  const bill=aBox(0.09,0.06,0.14,aM(duckBill));bill.position.set(0,0.76,0.36);g.add(bill);
  const tail=aBox(0.2,0.06,0.22,a6(duckBodyS));tail.position.set(0,0.3,-0.42);tail.rotation.x=0.5;g.add(tail);
  g.userData={head};return g;}
/* 摆位：鸭一小群沿河漂；鹅混群但更淡定；鸡东滩啄食；狗看碑（亲人，会迎上来） */
const ANIMAL_DEFS=[
  {type:'duck',seed:11,cx:26},{type:'duck',seed:29,cx:32},{type:'duck',seed:47,cx:38},{type:'duck',seed:71,cx:44},{type:'duck',seed:97,cx:50},{type:'duck',seed:113,cx:35},{type:'duck',seed:131,cx:42},
  {type:'goose',seed:83,cx:36},
  {type:'hen',seed:41,x:48,z:14,r:1.7},{type:'hen',seed:59,x:50,z:16.5,r:1.6},{type:'hen',seed:73,x:46.5,z:12.5,r:1.5},{type:'hen',seed:89,x:51,z:18,r:1.6},
  {type:'dog',seed:67,x:35.5,z:18,r:3.2}
];
for(const a of ANIMAL_DEFS){a.obj=a.type==='duck'?makeDuck():(a.type==='goose'?makeGoose():(a.type==='hen'?makeHen():makeDog()));a.esc={x:0,z:0};a.wasScared=false;animalGroup.add(a.obj);}
function riverZAt(x){let z=34;for(let i=0;i<4;i++)z=34+Math.sin(x*0.09)*6+Math.cos(z*0.07)*4;return z;}
function animalPos(a,t){
  if(a.type==='duck'||a.type==='goose'){const x=a.cx+Math.sin(t*0.026+a.seed)*4.5+Math.sin(t*0.011+a.seed*1.7)*2;return[x,(a.cz!=null?a.cz:riverZAt(x))+Math.sin(t*0.043+a.seed*1.3)*1.1];}   /* v85.1：漂在村边水 */
  const sp=a.type==='dog'?0.05:0.034;
  return[a.x+Math.sin(t*sp+a.seed)*a.r+Math.sin(t*sp*2.3+a.seed*1.7)*a.r*0.35,
         a.z+Math.cos(t*sp*0.83+a.seed*1.3)*a.r*0.8+Math.cos(t*sp*1.9+a.seed*0.6)*a.r*0.3];
}
/* v45生机：受惊四散（鸡咯鸭拍水）、狗亲人迎上来、鱼影跃起、蜻蜓点水 */
const FISH=[];for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.24),new THREE.MeshBasicMaterial({color:0x14283a,transparent:true,opacity:0.42,depthWrite:false}));m.rotation.x=-Math.PI/2;m.rotation.z=hash(i,7)*6.28;scene.add(m);FISH.push({m,seed:17+i*29,cx:28+i*8});}
const DRGN=[];for(let i=0;i<3;i++){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.2),new THREE.MeshBasicMaterial({color:0x3a7a9a}));g.add(body);
  for(const sx of[-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.004,0.05),new THREE.MeshBasicMaterial({color:0xdfeaf2,transparent:true,opacity:0.55}));w.position.set(sx*0.1,0.012,0);w.userData.sx=sx;g.add(w);}
  scene.add(g);DRGN.push({g,seed:31+i*41,ax:31+i*9});
}
function renderAnimals(t,dt){
  const dtn=dt||0.016, k=Math.min(0.5,dtn*3.5);
  for(const a of ANIMAL_DEFS){
    const g=a.obj;if(!g)continue;
    const p0=animalPos(a,t-0.12),p1=animalPos(a,t);
    /* 受惊：玩家靠近就四散（本地反应，各端各算——动物是环境，不必跨端一致）；狗反着来，亲人，迎上来 */
    const dxw=p1[0]-p.x,dzw=p1[1]-p.z,dw=Math.hypot(dxw,dzw)||0.001;
    const R=a.type==='duck'?4.2:(a.type==='goose'?2.6:(a.type==='hen'?3.4:2.6));
    let tx=0,tz=0,scared=false;
    if(a.type==='dog'){
      if(dw>1.6&&dw<7){const kk=(dw-1.6)*0.22;tx=-dxw/dw*kk;tz=-dzw/dw*kk;}
    }else if(dw<R){
      scared=true;
      const kk=Math.pow(1-dw/R,1.5)*(a.type==='hen'?2.6:2.2);
      tx=dxw/dw*kk;tz=dzw/dw*kk;
    }
    a.esc.x+=(tx-a.esc.x)*k;a.esc.z+=(tz-a.esc.z)*k;
    if(scared&&!a.wasScared){
      if(a.type==='hen')AU.henCluck(Math.max(0.02,1-dw/10)*0.1);
      else if(a.type==='duck')AU.duckFlap(Math.max(0.02,1-dw/9)*0.11);
      else if(a.type==='goose')AU.duckFlap(Math.max(0.02,1-dw/8)*0.07);
    }
    a.wasScared=scared;
    const fx=p1[0]+a.esc.x,fz=p1[1]+a.esc.z;
    const mvx=fx-(a.lx===undefined?fx:a.lx),mvz=fz-(a.lz===undefined?fz:a.lz);
    if(Math.hypot(mvx,mvz)>0.002)g.rotation.y=Math.atan2(mvx,mvz);
    a.lx=fx;a.lz=fz;
    if(a.type==='duck'||a.type==='goose'){
      g.position.set(fx,(a.type==='goose'?5.86:5.9)+Math.sin(t*2.1+a.seed)*0.045,fz);
      g.userData.head.rotation.y=Math.sin(t*0.5+a.seed)*0.18;
    }else{
      g.position.set(fx,topY(Math.floor(fx),Math.floor(fz)),fz);
      if(a.type==='hen'){
        g.userData.head.rotation.x=Math.max(0,Math.sin(t*0.9+a.seed*2.3)-0.72)*2.4;   // 啄食
        g.position.y+=Math.abs(Math.sin(t*5+a.seed))*0.02;
      }else{
        g.userData.tail.rotation.y=Math.sin(t*7.5+a.seed)*0.5;   // 摇尾
        g.userData.head.rotation.x=Math.max(0,Math.sin(t*0.23+a.seed)-0.85)*0.5;
      }
    }
  }
  for(const f of FISH){
    const x=f.cx+Math.sin(t*0.05+f.seed)*5,z=riverZAt(x)+Math.sin(t*0.09+f.seed*2)*0.8;
    const T=17+(f.seed%13),jc=t%T;
    let y=5.62,tilt=0;
    if(jc<0.9){const ph=jc/0.9;y=5.62+Math.sin(ph*Math.PI)*1.25;tilt=Math.sin(ph*Math.PI)*0.9;}   // 跃起：抛物线+立身
    f.m.position.set(x,y,z);f.m.rotation.x=-Math.PI/2+tilt;
    f.m.rotation.z+=0.002;
  }
  for(const d of DRGN){
    const x=d.ax+Math.sin(t*1.1+d.seed)*2.5+Math.sin(t*4.3+d.seed*2)*0.7;
    const z=riverZAt(x)-3.2+Math.sin(t*0.7+d.seed)*1.2;
    const y=6.35+Math.sin(t*2.7+d.seed)*0.35;
    const px=d.g.position, vx=x-px.x,vz=z-px.z;
    if(Math.hypot(vx,vz)>0.0005)d.g.rotation.y=Math.atan2(vx,vz);
    d.g.position.set(x,y,z);
    for(const w of d.g.children)if(w.userData.sx)w.rotation.z=w.userData.sx*(0.3+Math.sin(t*42+d.seed)*0.25);   // 振翅
  }
}
function dayIsUp(){const dayT=((performance.now()/1000)%DAY_LEN)/DAY_LEN;return dayT>0.28&&dayT<0.78;}   // 拂晓到黄昏——夜里鸟不叫
let nextChirp=0;

/* ================= 昼夜（v27）：太阳月亮星星云——十分钟过一天 =================
   时钟用performance.now（页面加载起算，全端同源：天空/顶栏/投影/鸟鸣一套时钟）。
   注意：不是真实时钟——不同时刻打开看到不同时辰，投影每10分钟过完一生。
   「按真实时辰活」是另一个设计选项（体检时记下，等同志定）：改 dayT=(Date.now()/1000%86400)/86400，
   天色会慢得看不见走，但「拂晓碑旁」变成真·拂晓。 */
const DAY_LEN=600;   // 十分钟一天
/* v92：世界钟——TA报「退出是白天进去一直黑天」的根：dayT从页面加载起算，刷新清零=每次重进都从游戏凌晨开始。
   改为跨会话续接的累计秒：退出存锚，重进精确接相位（退在白天重进还是白天）。TA不在线时演出暂停，
   村民的「日子」不受影响（判定者每天0点在云上想，晴天hash按安家天数走——两层分离） */
let wT=0,wWall=Date.now();
try{const s=JSON.parse(localStorage.getItem('hetan_worldT')||'null');if(s&&typeof s.t==='number'&&isFinite(s.t)){wT=s.t;wWall=s.wall;}}catch(e){}
const worldSec=()=>wT+(Date.now()-wWall)/1000;
const saveClock=()=>{try{localStorage.setItem('hetan_worldT',JSON.stringify({t:worldSec(),wall:Date.now()}));}catch(e){}};
const SKY_KEYS=[     // [t, 天色, 雾色, 环境光, 日光, 日色]
  [0.00,0x0a1524,0x0a1524,0.30,0.06,0x8fa8cc],
  [0.22,0x0e1c30,0x0e1c30,0.32,0.08,0x8fa8cc],
  [0.27,0xd88a5a,0xd8a06a,0.55,0.55,0xffb27a],
  [0.35,0x9fc5e0,0xa8c8dc,0.85,0.75,0xfff2dd],
  [0.50,0x9fc5e0,0xa8c8dc,0.85,0.75,0xfff2dd],
  [0.65,0x9fc5e0,0xa8c8dc,0.85,0.75,0xfff2dd],
  [0.73,0xe8946a,0xe0a070,0.55,0.55,0xffa070],
  [0.78,0x14203a,0x14203a,0.32,0.08,0x8fa8cc],
  [1.00,0x0a1524,0x0a1524,0.30,0.06,0x8fa8cc]];
const SEG_NAME=[[0.26,'夜'],[0.30,'拂晓'],[0.36,'清晨'],[0.45,'上午'],[0.55,'正午'],[0.66,'午后'],[0.72,'傍晚'],[0.80,'黄昏'],[0.86,'夜']];
function lerpHex(a,b,t){const ar=a>>16&255,ag=a>>8&255,ab=a&255,br=b>>16&255,bg=b>>8&255,bb=b&255;
  return Math.round(ar+(br-ar)*t)<<16|Math.round(ag+(bg-ag)*t)<<8|Math.round(ab+(bb-ab)*t);}
function skyAt(t){
  for(let i=0;i<SKY_KEYS.length-1;i++){
    const A=SKY_KEYS[i],B=SKY_KEYS[i+1];
    if(t>=A[0]&&t<=B[0]){const k=(t-A[0])/((B[0]-A[0])||1);
      return {sky:lerpHex(A[1],B[1],k),fog:lerpHex(A[2],B[2],k),amb:A[3]+(B[3]-A[3])*k,sunI:A[4]+(B[4]-A[4])*k,sunC:lerpHex(A[5],B[5],k)};}
  }
  const E=SKY_KEYS[0];return {sky:E[1],fog:E[2],amb:E[3],sunI:E[4],sunC:E[5]};
}
function discTex(inner,outer){
  const cv=document.createElement('canvas');cv.width=cv.height=64;
  const g=cv.getContext('2d');
  const gr=g.createRadialGradient(32,32,3,32,32,30);
  gr.addColorStop(0,inner);gr.addColorStop(0.55,inner);gr.addColorStop(1,outer);
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
const sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:discTex('rgba(255,216,110,1)','rgba(255,216,110,0)'),transparent:true,depthWrite:false}));
sunSpr.scale.set(14,14,1);sunSpr.material.fog=false;scene.add(sunSpr);
const moonSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:discTex('rgba(228,236,246,1)','rgba(228,236,246,0)'),transparent:true,depthWrite:false}));
moonSpr.scale.set(9,9,1);moonSpr.material.fog=false;scene.add(moonSpr);
const starGeo=new THREE.BufferGeometry();
{const sp=[];
 for(let i=0;i<420;i++){const a=Math.random()*Math.PI*2,e=Math.random()*1.35+0.12,r=130;
   sp.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r);}
 starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));}
const starMat=new THREE.PointsMaterial({color:0xdfe8ff,size:1.1,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true,fog:false});
const starMesh=new THREE.Points(starGeo,starMat);
starMesh.frustumCulled=false;scene.add(starMesh);
const cloudMat=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.88});
const cloudGroup=new THREE.Group();
const CLOUD_N=12, CLOUD_R=110;
for(let i=0;i<CLOUD_N;i++){
  const g=new THREE.Group();
  const n=2+Math.floor(hash(i*7,i*3)*3);
  for(let j=0;j<n;j++){
    const b=new THREE.Mesh(new THREE.BoxGeometry(4+hash(i,j)*5,1.1,3+hash(j,i)*4),cloudMat);
    b.position.set((hash(j*3,i)-0.5)*6,(hash(i,j*5)-0.5)*1.1,(hash(i*2,j)-0.5)*4);
    g.add(b);
  }
  const cx=(hash(i,3.7)-0.5)*2*CLOUD_R, cz=(hash(3.7,i)-0.5)*2*CLOUD_R;
  g.position.set(cx,76+hash(i,i)*6,cz);g.userData={x0:cx,spd:2.2+hash(i,i*9)*1.6};
  cloudGroup.add(g);
}
scene.add(cloudGroup);

/* ---- v60 远景天穹：地图边缘不再是虚无——远山三层+海+海平线，跟随玩家，颜色随昼夜 ---- */
function makeDomeTex(){
  const W=2048,H=1024,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const g=cv.getContext('2d');
  g.fillStyle='#ffffff';g.fillRect(0,0,W,H);   /* 天：白，被k.sky逐帧染色 */
  const HOR=H*0.50;                            /* 山海线：赤道略上（玩家眼高于球心） */
  const seaG=g.createLinearGradient(0,HOR,0,H);
  seaG.addColorStop(0,'#a8c2d4');seaG.addColorStop(0.4,'#7a9ab2');seaG.addColorStop(1,'#5a7a94');
  g.fillStyle=seaG;g.fillRect(0,HOR,W,H-HOR);
  g.fillStyle='rgba(255,255,255,0.4)';g.fillRect(0,HOR-2,W,3);   /* 海平线亮带 */
  const ridge=(amp,ph,col)=>{   /* 周期山脊：sin组合天然首尾无缝 */
    g.fillStyle=col;g.beginPath();g.moveTo(0,HOR+2);
    for(let x=0;x<=W;x+=8){
      const t=x/W*Math.PI*2;
      let hgt=Math.sin(t*3+ph)*0.5+Math.sin(t*7+ph*2.7)*0.3+Math.sin(t*13+ph*1.3)*0.2;
      g.lineTo(x,HOR+2-hgt*amp);
    }
    g.lineTo(W,HOR+2);g.closePath();g.fill();
  };
  ridge(H*0.085,1.7,'#dfe8f0');   /* 远山：接近雾色，大气透视 */
  ridge(H*0.062,4.2,'#b8c8d6');
  ridge(H*0.045,2.9,'#8aa0b4');   /* 近山：最深的剪影层 */
  return new THREE.CanvasTexture(cv);
}
const domeMat=new THREE.MeshBasicMaterial({map:makeDomeTex(),side:THREE.BackSide,depthWrite:false,fog:false});
const dome=new THREE.Mesh(new THREE.SphereGeometry(150,48,24),domeMat);
dome.renderOrder=-10;scene.add(dome);
let lastSeg='';
function tickSky(now){
  const dayT=((now/1000)%DAY_LEN)/DAY_LEN;
  const k=skyAt(dayT);
  const dim=weather==='clear'?1:0.66;
  scene.background.setHex(k.sky).multiplyScalar(dim);
  scene.fog.color.setHex(k.fog).multiplyScalar(dim);
  scene.fog.near=38-(0.85-k.amb)*18;
  amb.intensity=k.amb*dim;
  sun.intensity=k.sunI*dim;sun.color.setHex(k.sunC);
  const bx=p.x, by=p.y, bz=p.z;
  dome.position.set(bx,0,bz);
  domeMat.color.setHex(k.sky).multiplyScalar(dim);
  const sa=(dayT-0.25)/0.5*Math.PI;
  sunSpr.position.set(bx-Math.cos(sa)*200,by+Math.sin(sa)*110+8,bz-72);
  sun.position.copy(sunSpr.position).multiplyScalar(0.5);
  const ma=sa+Math.PI;
  moonSpr.position.set(bx-Math.cos(ma)*200,by+Math.sin(ma)*110+8,bz+76);
  starMesh.position.set(bx,by,bz);
  starMat.opacity=Math.max(0,Math.min(0.95,(0.35-k.sunI)*3));
  sunSpr.material.opacity=Math.max(0,Math.min(1,(dayT>0.2&&dayT<0.8)?1:0.001));
  moonSpr.material.opacity=starMat.opacity>0.05?0.95:0.35;
  cloudGroup.position.set(bx,0,bz);
  cloudGroup.children.forEach(c=>{
    c.position.x=(((c.userData.x0+now*0.001*c.userData.spd)%220)+220)%220-110;
  });
  tickWeather(now);applyVillagers(now);tickMarket(now);tickFarm();
  let seg=SEG_NAME[0][1];
  for(const [tt,name] of SEG_NAME){if(dayT>=tt)seg=name;}
  const cal=VH.homes?calNow():null;const calStr=cal?cal.SEAS+'·'+cal.jie:'';if(seg!==lastSeg||calStr!==lastSeg){lastSeg=calStr+'|'+seg;
    const el=document.querySelector('#top small');if(el)el.textContent=VER+' · '+calStr+' · '+seg+' · 开村第'+(cal?cal.day:0)+'日'+(cal?(isMarketDay(cal)?' · 今日逢集':' · 距逢集'+nextMarketIn(cal)+'日'):'');   // v50.4版本号；v97村历常驻
  }
}
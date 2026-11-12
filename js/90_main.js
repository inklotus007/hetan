
// 解锁：手机上AudioContext要在用户手势里激活
['pointerdown','touchstart','keydown'].forEach(ev=>addEventListener(ev,()=>AU.ensure(),{passive:true}));

/* ================= 输入 ================= */
const keys={w:false,s:false,a:false,d:false,jump:false};
const stick={x:0,y:0};
const isTouch=('ontouchstart'in window)||navigator.maxTouchPoints>0;
const tpos=t=>({x:t.clientX,y:t.clientY});
document.getElementById('help').textContent=isTouch
  ?'左下摇杆走 · 右侧滑转视角 · 右下按钮挖放跳 · 白框是准星指的方块'
  :'WASD走 · 鼠标转视角（点击画面锁定）· 左键挖 · 右键放 · 空格跳';

// 桌面
const canvas=renderer.domElement;
let dragging=false;
canvas.addEventListener('click',()=>{if(!isTouch&&!dragging){canvas.requestPointerLock&&canvas.requestPointerLock();}});
document.addEventListener('pointerlockchange',()=>{dragging=document.pointerLockElement===canvas;});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  p.yaw-=e.movementX*0.0026;
  p.pitch=Math.max(-1.45,Math.min(1.45,p.pitch-e.movementY*0.0026));
});
document.addEventListener('mousedown',e=>{
  if(document.pointerLockElement!==canvas)return;
  if(e.button===0)dig(); else if(e.button===2)put();
});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if(e.code==='KeyW')keys.w=true;if(e.code==='KeyS')keys.s=true;
  if(e.code==='KeyA')keys.a=true;if(e.code==='KeyD')keys.d=true;
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')shiftHeld=true;   /* v51 */
  if(e.code==='Space'){keys.jump=true;e.preventDefault();}
});
document.addEventListener('keyup',e=>{
  if(e.code==='KeyW')keys.w=false;if(e.code==='KeyS')keys.s=false;
  if(e.code==='KeyA')keys.a=false;if(e.code==='KeyD')keys.d=false;
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')shiftHeld=false;
  if(e.code==='Space')keys.jump=false;
});

// 移动端：左半屏摇杆，右半屏滑视角。挖/放/跳全部走右下按钮——没有手势，不会误触
let lookId=null,lx=0,ly=0;
let stickId=null,sx0=0,sy0=0;
const stickBase=document.getElementById('stickBase'),stickKnob=document.getElementById('stickKnob');
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const pos=tpos(t);
    if(pos.x<innerWidth*0.45&&stickId===null){
      stickId=t.identifier;sx0=pos.x;sy0=pos.y;
      stickBase.style.display=stickKnob.style.display='block';
      stickBase.style.left=(sx0-55)+'px';stickBase.style.top=(sy0-55)+'px';
      stickKnob.style.left=(sx0-24)+'px';stickKnob.style.top=(sy0-24)+'px';
    }else if(lookId===null){
      lookId=t.identifier;lx=pos.x;ly=pos.y;
    }
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const pos=tpos(t);
    if(t.identifier===stickId){
      let dx=pos.x-sx0,dy=pos.y-sy0;
      const L=Math.hypot(dx,dy),max=48;
      if(L>max){dx=dx/L*max;dy=dy/L*max;}
      stick.x=dx/max;stick.y=dy/max;
      stickKnob.style.left=(sx0+dx-24)+'px';stickKnob.style.top=(sy0+dy-24)+'px';
    }else if(t.identifier===lookId){
      p.yaw-=(pos.x-lx)*0.005;
      p.pitch=Math.max(-1.45,Math.min(1.45,p.pitch-(pos.y-ly)*0.005));
      lx=pos.x;ly=pos.y;
    }
  }
},{passive:false});
function tend(e){
  for(const t of e.changedTouches){
    if(t.identifier===stickId){stickId=null;stick.x=stick.y=0;stickBase.style.display=stickKnob.style.display='none';}
    if(t.identifier===lookId)lookId=null;
  }
}
canvas.addEventListener('touchend',tend);canvas.addEventListener('touchcancel',tend);
if(isTouch){['btnDig','btnPut','btnJmp'].forEach(id=>document.getElementById(id).style.display='flex');document.getElementById('btnMap').style.display='block';document.getElementById('btnPortal').style.display='block';}
document.getElementById('spadeOk').addEventListener('click',spadeExec);
document.getElementById('fillOk').addEventListener('click',fillExec);
document.getElementById('fillNo').addEventListener('click',()=>{document.getElementById('fillModal').style.display='none';spClear();});
document.getElementById('spadeNo').addEventListener('click',()=>{document.getElementById('spadeModal').style.display='none';spClear();});
document.getElementById('cpOk').addEventListener('click',()=>{cpExec();});
document.getElementById('chronBack').addEventListener('click',()=>{document.getElementById('chronBody').style.display='none';document.getElementById('chronList').style.display='block';});
document.getElementById('chronModal').addEventListener('click',(e)=>{if(e.target.id==='chronModal')document.getElementById('chronModal').style.display='none';});
document.getElementById('talkGo').addEventListener('click',sendTalk);
document.getElementById('talkIn').addEventListener('keydown',(e)=>{if(e.key==='Enter')sendTalk();});
document.getElementById('talkX').addEventListener('click',closeTalk);
document.getElementById('talkUI').addEventListener('click',(e)=>{if(e.target.id==='talkUI')closeTalk();});
document.getElementById('btnTalk').addEventListener('click',()=>{const vn=document.getElementById('btnTalk').dataset.vn;if(vn)openTalk(vn);});
document.getElementById('cpNo').addEventListener('click',()=>{document.getElementById('cpModal').style.display='none';cpBox=null;spClear();});
document.getElementById('undoYes').addEventListener('click',()=>{undoPaste();});
document.getElementById('btnDig').addEventListener('touchstart',e=>{e.preventDefault();AU.click();dig();},{passive:false});
document.getElementById('btnPut').addEventListener('touchstart',e=>{e.preventDefault();AU.click();put();},{passive:false});
document.getElementById('btnJmp').addEventListener('touchstart',e=>{e.preventDefault();keys.jump=true;},{passive:false});
document.getElementById('btnJmp').addEventListener('touchend',e=>{e.preventDefault();keys.jump=false;},{passive:false});
if(isTouch)document.getElementById('btnSneak').style.display='flex';   /* v51 */
document.getElementById('btnSneak').addEventListener('touchstart',e=>{e.preventDefault();AU.click();sneakLock=!sneakLock;document.getElementById('btnSneak').classList.toggle('on',sneakLock);toast(sneakLock?'潜行：贴边不掉 · 点床牌直接拆':'不潜了');},{passive:false});
document.getElementById('btnSneak').addEventListener('touchend',e=>{e.preventDefault();},{passive:false});

/* ================= 碑文 ================= */
const stele=document.getElementById('stele');
let steleShown=false;
function checkStele(){
  const d=Math.hypot(p.x-STX-0.5,p.z-STZ-0.5);
  if(d<5.5&&!steleShown){steleShown=true;showStele('河滩是大家的。\n\n——搭吧。搭什么都不迟。\n\n宋');}
  if(d>=6.5&&steleShown){steleShown=false;stele.style.opacity=0;}
}
function showStele(txt){
  stele.innerText=txt;stele.style.opacity=1;
  clearTimeout(stele._t);stele._t=setTimeout(()=>{stele.style.opacity=0;steleShown=false;},5200);
}

/* ================= 主循环 ================= */
let last=performance.now();
/* ================= 目标高亮框 ================= */
const hlGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002,1.002,1.002));
const hlBox=new THREE.LineSegments(hlGeo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.85}));
hlBox.visible=false;scene.add(hlBox);
function tickHighlight(){
  if(document.getElementById('boardUI').classList.contains('on')){hlBox.visible=false;return;}
  const h=raycast();
  if(h){hlBox.position.set(h.x+0.5,h.y+0.5,h.z+0.5);hlBox.visible=true;}
  else hlBox.visible=false;
}

function loop(now){
  window.__booted=true;   /* v57.2 boot自救：跑到这里=启动成功，watch停 */
requestAnimationFrame(loop);
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  physics(dt);
  camera.position.set(p.x,p.y+EYE,p.z);
  camera.rotation.set(0,0,0);
  camera.rotateY(p.yaw);camera.rotateX(p.pitch);
  perceptTick++;if(perceptTick%120===0)try{tickPerception();}catch(e){}   /* v123：约4秒一查近村（节流8分钟在函数里） */
  tickFloss(now);
  tickSky(worldSec()*1000);   /* v92：世界钟 */
  tickTorch(now);
  if(waterTex){waterTex.offset.x=(now*0.00003)%1;waterTex.offset.y=(now*0.000016)%1;}   // 水在流
  checkStele();
  tickHighlight();
  if((now|0)%7===0)diag();
   if((now/1000|0)%10===0)saveAll();   /* v92：十秒一拍存世界钟+位置 */
  renderNPCs(npcList,worldSec());   /* v92：世界钟 */ bubbleTick(performance.now()/1000);pairChatTick(worldSec());smokeTick(worldSec(),0.05);;audioTick(worldSec());sndWire();   // 来客NPC（离线的按seed漫游）
  renderVillKids(now);   /* v78kin78：村民的孩子 */
  renderAnimals(now/1000,dt);   // v45：鸭漂鸡啄狗迎客，受惊四散有叫声；鱼影蜻蜓
  if(now>nextChirp){if(dayIsUp())AU.birdChirp();nextChirp=now+3500+Math.random()*9000;}   // 白天鸟鸣，夜里停
  ensureBoard();boardWind(now/1000);
  tickBoardMove();
  if((now|0)%3===0)pushWorld();   // 三秒一查，搭了就上云
  const nearBoard=boardDist()<4.5;
  document.getElementById('btnBoard').style.display=nearBoard?'block':'none';
  document.getElementById('btnPortal').style.display='block';   /* v52.2：常驻——第一个门之前也得够得到传送（门只在我台上，鸡生蛋） */
  document.getElementById('btnMap').style.display='block';
  /* v80：靠近村民宅地出「说」——talkUI开着时藏 */
  {const vn80=nearVillName();const bt80=document.getElementById('btnTalk');
   bt80.style.display=(vn80&&document.getElementById('talkUI').style.display!=='flex')?'block':'none';
   bt80.dataset.vn=vn80||'';}
  if(mapOn)drawMapMarks();   /* 开图状态下玩家标记实时 */
  tickTeleport();
  // 水声：距河越近越响
  if((now|0)%6===0){
    const rz=34+Math.sin(p.x*0.09)*6+Math.cos(p.z*0.07)*4;
    const dz=Math.abs(p.z-rz);
    AU.riverSet(Math.max(0,1-dz/16)*0.4);
  }
  renderer.render(scene,camera);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
/* v125：启动序列（原40_player顶层——提升边界修复后挪到全部声明之后） */
rebuild();
pullWorld().then(()=>{/* 云端的花台、别人搭的一切，叠上来 */});
pullSigns().then(()=>{rebuild();});pullVillagers().then(()=>{villInitDay=-999;applyVillagers(Date.now());bootMindCheck();});   /* v81：村民数据就位后查今天的心思养没养 */   /* v77：村民宅地回来就开工 */
pullChronicle();   /* v79：村志 */   // v50：招牌的字从云端回来，重立一遍

/* 声音开关进了抽屉（mMute）——top上不再有♪ */
requestAnimationFrame(loop);
const bt=document.getElementById('boot');
bt.style.opacity=0;setTimeout(()=>bt.style.display='none',700);


function rebuild(){
  const counts={};for(const t in meshes)counts[t]=0;
  torchSet.clear();
  for(const k in signMeshes){scene.remove(signMeshes[k]);}signMeshes={};signKeys=[];   // v50：牌全量重建
  if(!railMesh){
    const rm=new THREE.MeshLambertMaterial({map:texOf('wood_side')});
    railMesh=new THREE.InstancedMesh(railGeo,rm,48000);railMesh.count=0;railMesh.frustumCulled=false;scene.add(railMesh);
  }
  let railN=0;
  for(let x=0;x<W;x++)for(let z=0;z<D;z++)for(let y=0;y<H;y++){
    const t=world[idx(x,y,z)];if(t===AIR)continue;
    const tBare=t>=1000?t%1000:t;
    if(tBare===14||tBare===22||tBare===33||tBare===34||tBare===35)torchSet.add(idx(x,y,z));   // v32：火炬进灯池；v40：灯笼也进；v61：炉/壁炉/火塘的火光也进
    else if(t===27||t===28)signKeys.push(idx(x,y,z));   // v50：牌和匾进独立队列，末尾逐块refreshSign
    else if(t===19&&railN<47000){   // v42：篱笆横杆——查+x和+z邻居，是篱笆就在两格间放两根杆（独杆无杆，连排自动成栅栏）
      if(get(x+1,y,z)===19)for(const ry of [y+0.78,y+1.12]){_m.makeRotationY(0);_m.setPosition(x+1.0,ry,z+0.5);railMesh.setMatrixAt(railN++,_m);}
      if(get(x,y,z+1)===19)for(const ry of [y+0.78,y+1.12]){_m.makeRotationY(Math.PI/2);_m.setPosition(x+0.5,ry,z+1.0);railMesh.setMatrixAt(railN++,_m);}
    }
    if(!exposed(x,y,z))continue;
    let tt=t,rot=0;
    if(t>=1000){rot=Math.floor(t/1000);tt=t%1000;}   // v67定向家具解包（朝向存值里全端同步）
    const mesh=meshes[tt];if(!mesh)continue;   // v38：数据里有、这版代码不认识的类型直接跳过——伊卡洛斯的花先于老页面存在时，rebuild炸掉整个渲染的防御
    if(counts[tt]>=mesh.instanceMatrix.count){if(!mesh._warned){console.warn('实例池满：类型'+tt);mesh._warned=true;}continue;}   // v39：超预分配截断+只警告一次
    const i=counts[tt]++;
    _m.makeRotationY(rot*Math.PI/2);_m.setPosition(x+0.5, y+0.5, z+0.5);mesh.setMatrixAt(i,_m);
  }
  for(const t in meshes){meshes[t].count=counts[t];meshes[t].instanceMatrix.needsUpdate=true;}
  railMesh.count=railN;railMesh.instanceMatrix.needsUpdate=true;   // v42：横杆实例数在主循环里累加
  for(const i of signKeys){const y=i%H,tt=(i-y)/H,z=tt%D,x=(tt-z)/D;refreshSign(x,y,z);}   // v50：牌逐块立起来
}
/* v125修：启动序列挪到90_main末尾——函数声明提升是script级的，跨文件不提升。
   单文件时代pullChronicle(50_talk)靠整段提升在这里可用；拆文件后这里调用=not defined，
   本文件同步执行中止→isSneak(行233)永不声明→loop每帧TDZ「Cannot access 'isSneak'」（TA截图实锤） */

/* ---- 杨棉 ---- */
const FLOC=260;
const fGeo=new THREE.BufferGeometry();
const fPos=new Float32Array(FLOC*3), fSeed=new Float32Array(FLOC);
for(let i=0;i<FLOC;i++){fPos[i*3]=Math.random()*W;fPos[i*3+1]=Math.random()*14+2;fPos[i*3+2]=Math.random()*D;fSeed[i]=Math.random()*100;}
fGeo.setAttribute('position',new THREE.BufferAttribute(fPos,3));
const floss=new THREE.Points(fGeo,new THREE.PointsMaterial({color:0xffffff,size:0.13,transparent:true,opacity:0.85}));
scene.add(floss);
function tickFloss(t){
  for(let i=0;i<FLOC;i++){
    let x=fPos[i*3],y=fPos[i*3+1],z=fPos[i*3+2];
    x+=Math.sin(t*0.0004+fSeed[i])*0.012+0.008;
    z+=Math.cos(t*0.0003+fSeed[i])*0.010;
    y+=Math.sin(t*0.0006+fSeed[i]*2)*0.006;
    if(x>W+2)x=-2; if(z>D+2)z=-2; if(z<-2)z=D+2; if(y<0.5)y=13; if(y>14)y=1;
    fPos[i*3]=x;fPos[i*3+1]=y;fPos[i*3+2]=z;
  }
  fGeo.attributes.position.needsUpdate=true;
}

/* ================= 玩家与物理 ================= */
const PW=0.30, PH=1.75, EYE=1.62;
const p={x:STX+0.5,y:10,z:STZ-1.5,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:-0.06,ground:false};
/* v92：位置恢复——TA报「退出回默认位置」的根：p只在内存，从不落盘。恢复ME.pos（首次玩没有就用碑脚下出生点） */
try{
  const mp=(ME&&ME.pos&&Array.isArray(ME.pos))?ME.pos:null;
  if(mp&&inW(Math.floor(mp[0]),1,Math.floor(mp[1]))){p.x=mp[0];p.z=mp[1];p.y=12;}
}catch(e){}
const savePosLocal=()=>{if(!ME)return;ME.pos=[+p.x.toFixed(1),+p.z.toFixed(1)];try{localStorage.setItem('hetan_me',JSON.stringify(ME));}catch(e){}};
const saveAll=()=>{saveClock();savePosLocal();};   /* v92：本地兜底（云端saves/名字.json要令牌，令牌断了整条链静默失效——本地层无令牌也活） */
window.addEventListener('beforeunload',saveAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveAll();});   // v30：出生在广场碑脚下（y给10，落地物理接管）；v50：北移一格上平砖
/* v50 出生点：默认在碑正北两格的平砖上（原(38.5,21.5)在碑台北侧洼地，同志说「不平整没法改」——
   实底：碑台12高、北邻7，落差5格）。床=MC式重生锚：点床设出生点存localStorage（床拆了自动回落） */
const spawn=()=>{
  let sp=null;
  try{sp=JSON.parse(localStorage.getItem('hetan_spawn')||'null');}catch(e){}
  if(sp&&get(sp.x,sp.y,sp.z)===23){p.x=sp.x+0.5;p.z=sp.z+0.5;p.y=sp.y+1.4;p.vy=0;return;}   // 床还在才认
  p.x=STX+0.5;p.z=STZ-1.5;p.y=10;p.vy=0;   // z-1.5：碑正北两格的平砖（z20整行地面高8）
};
const boxBlocks=(minx,miny,minz,maxx,maxy,maxz,fn)=>{
  for(let x=Math.floor(minx);x<=Math.floor(maxx);x++)
  for(let y=Math.floor(miny);y<=Math.floor(maxy);y++)
  for(let z=Math.floor(minz);z<=Math.floor(maxz);z++)if(fn(x,y,z))return true;
  return false;
};
const hitAny=(minx,miny,minz,maxx,maxy,maxz)=>boxBlocks(minx,miny,minz,maxx,maxy,maxz,solid);
const HALF_H={13:0.47,18:0.42,20:0.045,21:0.37};   // v50.6：半格家具的支撑面高度（阶/凳/路/桌）
function moveAxis(dx,dy,dz){
  p.x+=dx;p.z+=dz;
  const y0=p.y, y1=p.y+PH;
  if(hitAny(p.x-PW,y0+0.02,p.z-PW,p.x+PW,y1-0.02,p.z+PW)){
    /* v50.6 半格自动上阶：被挡且挡的是半格家具、上方净空——抬到半格顶继续走，不再「一跳一跳」 */
    let stepped=false;
    const fh=HALF_H[get(Math.floor(p.x),Math.floor(y0+0.05),Math.floor(p.z))];
    if(fh){const ny=Math.floor(y0)+fh+0.002;
      if(ny>y0-0.01&&ny-y0<0.62&&!hitAny(p.x-PW,ny+0.02,p.z-PW,p.x+PW,ny+PH-0.02,p.z+PW)){p.y=ny;stepped=true;}}
    if(!stepped){p.x-=dx;p.z-=dz;}
  }
  /* v51 潜行贴边不掉：水平移动后脚下没支撑（3~16cm内无实体）就退回来 */
  if(isSneak()&&p.ground&&!hitAny(p.x-PW+0.02,p.y-0.16,p.z-PW+0.02,p.x+PW-0.02,p.y-0.03,p.z+PW-0.02)){
    p.x-=dx;p.z-=dz;
  }
  p.y+=dy;
  if(hitAny(p.x-PW+0.02,p.y,p.z-PW+0.02,p.x+PW-0.02,p.y+PH,p.z+PW-0.02)){
    if(dy<0){
      /* v50.6：支撑面落到半格实高——站阶上脚在0.47不再浮空0.53 */
      const bg=get(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));
      const hh=HALF_H[bg];
      p.y=hh!==undefined?Math.floor(p.y)+hh+0.001:Math.floor(p.y)+1.0001;
      p.ground=true;
    }
    else{p.y=Math.ceil(p.y+PH)-PH-0.0001;}
    p.vy=0;
  }else if(dy<-0.001)p.ground=false;
}
function physics(dt){
  // 输入方向（相机系）
  let ix=0,iz=0;
  if(keys.w)iz-=1; if(keys.s)iz+=1; if(keys.a)ix-=1; if(keys.d)ix+=1;
  ix+=stick.x; iz+=stick.y;
  const len=Math.hypot(ix,iz);
  if(len>1){ix/=len;iz/=len;}
  const sp=isSneak()?2.0:4.4, sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);   /* v51：潜行慢走 */
  p.vx=(ix*cos + iz*sin)*sp;
  p.vz=(-ix*sin + iz*cos)*sp;
  const inWater=get(Math.floor(p.x),Math.floor(p.y+0.3),Math.floor(p.z))===8||get(Math.floor(p.x),Math.floor(p.y+1.1),Math.floor(p.z))===8;
  if(inWater){
    p.vy-=3.2*dt;                              // 浮力：水里沉得慢
    if(keys.jump)p.vy+=30*dt;                  // 划水上升
    p.vy=Math.max(-1.1,Math.min(2.4,p.vy));
    const headOut=get(Math.floor(p.x),Math.floor(p.y+1.75),Math.floor(p.z))!==8;
    if(keys.jump&&headOut&&get(Math.floor(p.x),Math.floor(p.y+0.3),Math.floor(p.z))===8){p.vy=7.5;keys.jump=false;}  // 出水一跃（v26：5.2跳0.6格上不了1格的岸——7.5跳1.28格）
  }else{
    p.vy-=22*dt;
    if(p.vy<-40)p.vy=-40;
  }
  if(keys.jump&&p.ground&&!inWater){p.vy=8.2;p.ground=false;AU.jump();}
  // 音效钩子：落地+脚步
  const preVy=p.vy, wasGround=p.ground;
  moveAxis(p.vx*dt,0,0);
  moveAxis(0,0,p.vz*dt);
  moveAxis(0,p.vy*dt,0);
  if(!wasGround&&p.ground)AU.land(-preVy);
  if(p.ground&&Math.hypot(p.vx,p.vz)>1.2){
    _stepT+=dt;
    if(_stepT>0.34){_stepT=0;AU.step((typeof weather!=='undefined'&&weather==='snow')?'snow':stepSurface());}
  }else _stepT=0.2;
  if(p.y<-20)spawn();
}
let _stepT=0.2;
function stepSurface(){   /* v133：脚下方块材质——粗分类给脚步声 */
  const bx=Math.floor(p.x),bz=Math.floor(p.z);
  const t=get(bx,Math.floor(p.y-0.15),bz);
  if(t===11||t===12||t===13)return 'path';
  if(t===2||t===3||t===8||t===26)return 'stone';
  if(t===5||t===9)return 'wood';
  return 'grass';
}

/* ================= 视线（体素DDA） ================= */
function lookDir(){
  return new THREE.Vector3(
    -Math.sin(p.yaw)*Math.cos(p.pitch),
    Math.sin(p.pitch),
    -Math.cos(p.yaw)*Math.cos(p.pitch)
  );
}
function raycast(maxDist=5.2){
  const o={x:p.x,y:p.y+EYE,z:p.z}, d=lookDir();
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z);
  const stepX=d.x>0?1:-1,stepY=d.y>0?1:-1,stepZ=d.z>0?1:-1;
  const tdx=Math.abs(1/(d.x||1e-9)),tdy=Math.abs(1/(d.y||1e-9)),tdz=Math.abs(1/(d.z||1e-9));
  let tmx=((d.x>0?x+1-o.x:o.x-x))*tdx, tmy=((d.y>0?y+1-o.y:o.y-y))*tdy, tmz=((d.z>0?z+1-o.z:o.z-z))*tdz;
  let nx=0,ny=0,nz=0,t=0;
  while(t<=maxDist){
    {const b=get(x,y,z);if(b!==AIR&&b!==8)return{x,y,z,nx,ny,nz};}   // v31：火把可点中可删除（solid不算火把是走路碰撞的事；raycast共用solid导致火把永远选不中删不掉）
    if(tmx<tmy&&tmx<tmz){x+=stepX;t=tmx;tmx+=tdx;nx=-stepX;ny=0;nz=0;}
    else if(tmy<tmz){y+=stepY;t=tmy;tmy+=tdy;nx=0;ny=-stepY;nz=0;}
    else{z+=stepZ;t=tmz;tmz+=tdz;nx=0;ny=0;nz=-stepZ;}
  }
  return null;
}

/* ================= 交互：挖 / 放 ================= */
let curType=1,lastMaterial=1;const DRT={34:1,23:1,39:1,40:1,42:1};   // v67定向家具（朝向玩家）   // v64：lastMaterial=填充工具用的材质（最后选中的非工具方块）
/* v64 UI：拇指热键栏+分类抽屉——TA批评界面太乱，按手游规范重做 */
const HOT_DEFAULT=[1,2,3,10,11,9,22,37,42];   // v67：梯进热栏（TA没找到——藏在工具页）
const hot=document.getElementById('hot');
const catPanel=document.getElementById('catPanel');
const catGrid=document.getElementById('catGrid');
const CATS=[['地形',[1,2,3,4,8,17]],['建材',[10,11,7,9,12,13,19,20]],['家具',[18,21,23,24,26,31,32,33,34,35,37,39,40]],['装饰',[14,15,16,22,25,27,28,5,6,29]],['工具',[36,41,44]]];
function slotEl(t,fromPanel){
  const e=document.createElement('div');e.className='slot';e.dataset.t=t;
  e.style.background='#'+(TYPES[t].c||0x9a8f7a).toString(16).padStart(6,'0');
  e.innerHTML='<span>'+TYPES[t].n+'</span>';
  const fp=!!fromPanel;   // v68.1：闭包传来源——v68实底：e.currentTarget写成了元素属性（undefined.parentElement），e/ev两变量搞混
  e.onclick=(ev)=>{ev.stopPropagation();pickType(+t,fp);};
  return e;
}
let hotItems=HOT_DEFAULT.slice(),curHotIdx=0;   // v68.2补声明（v68实底：引用了没声明的hotItems）
function pickType(t,fromPanel){
  curType=t;if(!TYPES[t].tool)lastMaterial=t;
  if(curType!==36&&curType!==41&&curType!==42)spClear();
  if(curType!==44){cpPrevClear();CPA=null;}
  if(fromPanel){   /* v68 MC式：抽屉点物品→放进当前快捷槽→收面板回游戏 */
    hotItems[curHotIdx]=t;renderHot();
    catPanel.style.display='none';
  }else{
    curHotIdx=hotItems.indexOf(t)>=0?hotItems.indexOf(t):curHotIdx;
    [...hot.children].forEach(c=>c.classList.toggle('on',+c.dataset.t===t));
  }
  if(TYPES[t].tool)toast(TYPES[t].n+'：'+(t===36?'点「挖」圈地':t===41?'点「搭」圈地填地':t===44?'点「挖」圈选 · 点「搭」粘贴':'点「搭」——一楼点一下、二楼点一下'));
  else toast('已选：'+TYPES[t].n);
}
let curCat=0;
function renderCat(){
  const tabs=document.getElementById('catTabs');tabs.innerHTML='';
  CATS.forEach((c,i)=>{
    const tb=document.createElement('div');tb.className='tab'+(i===curCat?' on':'');tb.textContent=c[0];
    tb.onclick=(ev)=>{ev.stopPropagation();curCat=i;renderCat();};tabs.appendChild(tb);
  });
  catGrid.innerHTML='';
  CATS[curCat][1].forEach(t=>{
    if(!TYPES[t]||TYPES[t].hidden)return;
    catGrid.appendChild(slotEl(t,true));
  });
}
function renderHot(){
  hot.innerHTML='';
  HOT_DEFAULT.forEach((t,idx)=>{if(TYPES[t]){const e=slotEl(t);e.onclick=(ev)=>{ev.stopPropagation();curHotIdx=idx;pickType(t,false);};hot.appendChild(e);}});
  const more=document.createElement('div');more.className='slot';more.dataset.t=-1;
  more.style.background='rgba(200,180,120,.3)';more.innerHTML='<span>全</span>';
  more.onclick=(ev)=>{ev.stopPropagation();catPanel.style.display=catPanel.style.display==='block'?'none':'block';};
  hot.appendChild(more);
}
renderHot();renderCat();
(()=>{const el=[...hot.children].find(c=>+c.dataset.t===1);if(el)el.classList.add('on');})();
/* 热栏点击=切槽（v68）：more按钮除外 */
const _hotObs=new MutationObserver(()=>{[...hot.children].forEach(c=>{if(+c.dataset.t>0&&!c._wired){c._wired=true;const old=c.onclick;c.onclick=(ev)=>{ev.stopPropagation();curHotIdx=hotItems.indexOf(+c.dataset.t);pickType(+c.dataset.t,false);};}});});
_hotObs.observe(hot,{childList:true});
document.addEventListener('click',(e)=>{if(!catPanel.contains(e.target)&&![...hot.children].some(c=>c.contains(e.target)))catPanel.style.display='none';});
/* v51 潜行：按钮锁定(toggle)+Shift按住——潜行时贴边不掉、点床/牌/匾直接拆 */
let sneakLock=false,shiftHeld=false;
const isSneak=()=>sneakLock||shiftHeld;
function digBlock(h,msg){
  const vk=villCells[h.x+','+h.y+','+h.z];
  if(vk&&vk!=='skip'){toast('这是'+(VH.homes[vk]?VH.homes[vk].name:'村民')+'家的——动不得');return;}   /* v77 */
  AU.dig(world[idx(h.x,h.y,h.z)]);
  world[idx(h.x,h.y,h.z)]=AIR;saveDiff(h.x,h.y,h.z,AIR);rebuild();
  refreshSign(h.x,h.y,h.z);   /* 牌匾mesh随格清掉，普通方块无mesh无害 */
  toast(msg);
}
/* v61 大锹：两点圈地只挖自然地形 */
let spA=null,spMarks=[],spBox=null;
/* v76cpv76：CB=剪贴板 CPA=粘贴预览锚 UNDO=粘贴前原值 cpBox=圈选范围 */
let CB=null,CPA=null,UNDO=null,cpBox=null,undoT=null,cpPrev=null;
function spMark(color,h){
  const m=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03,1.03,1.03)),new THREE.LineBasicMaterial({color}));
  m.position.set(h.x+0.5,h.y+0.5,h.z+0.5);scene.add(m);spMarks.push(m);
}
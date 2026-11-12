

/* v78kin78孩子：出生2天后出门（小体型绕火塘玩），夜里回家不渲染；成年（一天当一岁）体型长成、绕自家宅地——施工中的家 */
function renderVillKids(now){
  if(!VH.children||!VH.camps)return;
  if(!villKidsBuilt){
    villKidsBuilt=true;
    for(const c of VH.children){
      try{
        const g=makeNPCBody({name:c.name,seed:c.seed,coat:c.coat,skin:c.skin});
        g.userData.villKid=c;g.userData.villKidFlag=1;
        scene.add(g);villKids.push(g);
      }catch(e){}
    }
  }
  const dayT=(now%DAY_LEN)/DAY_LEN;
  const night=dayT<0.22||dayT>0.82;
  /* v85.1：同村孩子串成追圈——后面的追前面的（相位差0.55），半径喘动（追近了散开） */
  const campKidIdx={};
  for(const g of villKids){
    const c=g.userData.villKid;
    const ci=c.camp!=null?c.camp:0;
    campKidIdx[ci]=(campKidIdx[ci]||0);
    g.userData.kidx=campKidIdx[ci];
    campKidIdx[ci]++;
  }
  for(const g of villKids){
    const c=g.userData.villKid;
    const bornAt=VH.up+c.bornDay*DAY_MS, adultAt=VH.up+c.adultDay*DAY_MS;
    if(now<bornAt+2*DAY_MS||night||weather==='rain'||weather==='snow'){g.visible=false;continue;}   /* 婴幼儿在家；天黑/雨天回家 */
    g.visible=true;
    const grown=now>=adultAt;
    const s=grown?1:0.55+Math.min(0.15,(now-bornAt)/DAY_MS*0.02);
    g.scale.set(s,s,s);
    const cp=VH.camps[c.camp]||[c.plot[0],c.plot[1],c.plot[2]];
    const hx=grown?c.plot[0]+2:cp[0], hz=grown?c.plot[2]+1.5:cp[2];
    const a=now*0.0011+c.seed*0.35+(g.userData.kidx||0)*0.55;   /* 追圈速度x2.75+串相位 */
    const r=(grown?3.2:2.2)+Math.sin(now*0.0007+(g.userData.kidx||0))*0.8;
    const px=hx+Math.sin(a)*r, pz=hz+Math.cos(a*0.92)*r;
    g.position.set(px,surfaceY(Math.floor(px),Math.floor(pz)),pz);
    g.rotation.y=a+Math.PI/2;   /* 面朝跑动方向 */
  }
}
/* ===== v76复制粘贴 cpv76 ===== */
function countSel(x0,y0,z0,x1,y1,z1){
  let n=0,sigs=0;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){if(world[idx(x,y,z)])n++;}
  for(const k in SIGNS.signs){const p=k.split(',').map(Number);
    if(p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1&&p[2]>=z0&&p[2]<=z1)sigs++;}
  return{n,sigs};
}
function cpPrevMark(){
  cpPrevClear();
  cpPrev=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CB.w,CB.h,CB.d)),new THREE.LineBasicMaterial({color:0x66dd88}));
  cpPrev.position.set(CPA.x+CB.w/2,CPA.y+CB.h/2,CPA.z+CB.d/2);
  scene.add(cpPrev);
}
function cpPrevClear(){if(cpPrev){scene.remove(cpPrev);cpPrev=null;}}
function cpExec(){
  const[x0,y0,z0,x1,y1,z1]=cpBox;cpBox=null;
  document.getElementById('cpModal').style.display='none';
  const cells=[];
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    const t=world[idx(x,y,z)];if(t)cells.push([x-x0,y-y0,z-z0,t]);
  }
  const sigs=[];
  for(const k in SIGNS.signs){
    const p=k.split(',').map(Number);
    if(p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1&&p[2]>=z0&&p[2]<=z1){
      sigs.push([p[0]-x0,p[1]-y0,p[2]-z0,JSON.parse(JSON.stringify(SIGNS.signs[k]))]);
    }
  }
  CB={cells,sigs,w:x1-x0+1,h:y1-y0+1,d:z1-z0+1};
  spClear();
  toast('复制了'+cells.length+'块'+(sigs.length?'、'+sigs.length+'块牌':'')+'——去目标点「搭」放预览，再点确认');
}
function pasteExec(){
  const a=CPA;CPA=null;cpPrevClear();
  for(const[dx,dy,dz] of CB.cells){if(villPlotAt(a.x+dx,a.y+dy,a.z+dz)){toast('范围里有村民宅地——换个地方粘');return;}}   /* v77 */
  const undo=[];let n=0;
  for(const[dx,dy,dz,t] of CB.cells){
    const x=a.x+dx,y=a.y+dy,z=a.z+dz;
    if(!inW(x,y,z))continue;
    undo.push([x,y,z,world[idx(x,y,z)]]);
    world[idx(x,y,z)]=t;
    diffs.a[x+','+y+','+z]=t;
    diffs.r=diffs.r.filter(p=>!(p[0]===x&&p[1]===y&&p[2]===z));
    n++;
  }
  const ns=[];
  for(const[dx,dy,dz,s] of CB.sigs){
    const x=a.x+dx,y=a.y+dy,z=a.z+dz;
    if(!inW(x,y,z))continue;
    const k2=x+','+y+','+z;
    SIGNS.signs[k2]=JSON.parse(JSON.stringify(s));ns.push(k2);
  }
  try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}
  UNDO={cells:undo,sigs:ns};
  worldDirty=true;rebuild();AU.put();
  if(ns.length)pushSigns('河滩：复制粘贴立牌'+ns.length+'块');
  showUndo();toast('粘贴了'+n+'块'+(ns.length?'、牌'+ns.length:'')+'——粘错十秒内可撤');
}
function undoPaste(){
  document.getElementById('undoBar').style.display='none';
  const u=UNDO;UNDO=null;if(!u)return;
  for(const[x,y,z,t] of u.cells){
    world[idx(x,y,z)]=t;saveDiff(x,y,z,t);
  }
  for(const k of u.sigs){
    const p=k.split(',');
    delete SIGNS.signs[k];refreshSign(+p[0],+p[1],+p[2]);
  }
  if(u.sigs.length)pushSigns('河滩：撤销粘贴·牌撤回');
  worldDirty=true;rebuild();
  toast('撤了——粘的全部回原样');
}
function showUndo(){
  const el=document.getElementById('undoBar');
  el.style.display='flex';
  clearTimeout(undoT);undoT=setTimeout(()=>{el.style.display='none';},10000);
}
function spadeTap(h){
  if(!spA){
    spA={x:h.x,y:h.y,z:h.z};spMark(0x00ffcc,h);
    toast('起点('+h.x+','+h.y+','+h.z+')——再点对角');return;
  }
  const A=spA;spA=null;spMark(0xffaa00,h);
  const x0=Math.min(A.x,h.x),x1=Math.max(A.x,h.x);
  const y0=Math.min(A.y,h.y),y1=Math.max(A.y,h.y);
  const z0=Math.min(A.z,h.z),z1=Math.max(A.z,h.z);
  const cnt=(x1-x0+1)*(y1-y0+1)*(z1-z0+1);
  if(cnt>20000){spClear();toast('圈太大了（'+cnt+'格>20000）——分几次挖');return;}
  openSpade(x0,y0,z0,x1,y1,z1,cnt);
}
function openSpade(x0,y0,z0,x1,y1,z1,cnt){
  spBox=[x0,y0,z0,x1,y1,z1];
  document.getElementById('spadeInfo').textContent=x1-x0+1+'×'+(y1-y0+1)+'×'+(z1-z0+1)+' ＝ '+cnt+'格';
  document.getElementById('spadeModal').style.display='flex';
}
function spadeExec(){
  const[x0,y0,z0,x1,y1,z1]=spBox;spBox=null;
  document.getElementById('spadeModal').style.display='none';spClear();
  let n=0,skip=0;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    const key=x+','+y+','+z;
    if(diffs.a[key]!==undefined){skip++;continue;}   // 你搭的/你改的——全留
    if(villCells[key]&&villCells[key]!=='skip'){skip++;continue;}   /* v77：村民盖的——留 */
    if(villPlotAt(x,y,z)){skip++;continue;}   /* v77：宅地空域也不锹——地基材料堆在置 */
    if(world[idx(x,y,z)]===AIR)continue;
    if(x===STX&&z===STZ&&y>=8){skip++;continue;}     // 碑
    if(Math.abs(x-BOARD_POS[0]-0.5)<2&&Math.abs(z-BOARD_POS[2])<2){skip++;continue;}   // 留言板
    for(const pk in PORTALS.portals){const q=PORTALS.portals[pk];if(q.x===x&&q.y===y&&q.z===z){delete PORTALS.portals[pk];pushPortals('河滩：传送门「'+pk+'」被挖走了');break;}}   // v73：批量拆到门块=门从列表清走
    world[idx(x,y,z)]=AIR;
    diffs.r.push([x,y,z]);refreshSign(x,y,z);n++;
  }
  try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}
  worldDirty=true;rebuild();
  showStele('挖掉'+n+'格。'+(skip?('留了'+skip+'格搭的。'):''));
}
function openFill(x0,y0,z0,x1,y1,z1,cnt){
  spBox=[x0,y0,z0,x1,y1,z1];
  const mn=TYPES[lastMaterial]?TYPES[lastMaterial].n:'?';
  document.getElementById('fillInfo').textContent=x1-x0+1+'×'+(y1-y0+1)+'×'+(z1-z0+1)+' ＝ '+cnt+'格\n填入材质：'+mn+'（最后选中的方块）';
  document.getElementById('fillModal').style.display='flex';
}
function fillExec(){
  const[x0,y0,z0,x1,y1,z1]=spBox;spBox=null;
  document.getElementById('fillModal').style.display='none';spClear();
  const mat=lastMaterial;let n=0,skip=0;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    if(x===STX&&z===STZ&&y>=8){skip++;continue;}
    if(Math.abs(x-BOARD_POS[0]-0.5)<2&&Math.abs(z-BOARD_POS[2])<2){skip++;continue;}
    const vkey=x+','+y+','+z;
    if(villCells[vkey]&&villCells[vkey]!=='skip'){skip++;continue;}   /* v77：村民格子填不动 */
    if(villPlotAt(x,y,z)){skip++;continue;}
    for(const pk in PORTALS.portals){const q=PORTALS.portals[pk];if(q.x===x&&q.y===y&&q.z===z){delete PORTALS.portals[pk];pushPortals('河滩：传送门「'+pk+'」被挖走了');break;}}   // v73：批量拆到门块=门从列表清走
    const key=x+','+y+','+z;
    if(world[idx(x,y,z)]===mat){continue;}
    world[idx(x,y,z)]=mat;
    if(mat===AIR){if(!diffs.r.some(p=>p[0]===x&&p[1]===y&&p[2]===z))diffs.r.push([x,y,z]);delete diffs.a[key];}
    else{diffs.a[key]=mat;diffs.r=diffs.r.filter(p=>!(p[0]===x&&p[1]===y&&p[2]===z));}
    refreshSign(x,y,z);n++;
  }
  try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}
  worldDirty=true;rebuild();
  showStele('填了'+n+'格。'+(skip?('碑区留了'+skip+'格。'):''));
}

function dig(){
  const vn83=rayVillSign();   /* v83：看着名牌按「挖」=跟这家说话 */
  if(vn83){openTalk(vn83);return;}
  const h=raycast();if(!h)return;
  if(curType===36){spadeTap(h);return;}   // v61：锹选中——点挖=圈地
  if(curType===42){if(spA){spA=null;spClear();toast('基点清了');}return;}
  if(curType===41){if(spA||spMarks.length){spClear();toast('圈地清了');}return;}   // v64：填——点挖=取消圈地
  if(curType===44){   // v76cpv76：复制——点挖=圈选两点
    if(!spA){spA={x:h.x,y:h.y,z:h.z};spMark(0x66ccff,h);toast('复制起点——再点对角');return;}
    const A=spA;spA=null;
    const x0=Math.min(A.x,h.x),x1=Math.max(A.x,h.x);
    const y0=Math.min(A.y,h.y),y1=Math.max(A.y,h.y);
    const z0=Math.min(A.z,h.z),z1=Math.max(A.z,h.z);
    const cnt=(x1-x0+1)*(y1-y0+1)*(z1-z0+1);
    if(cnt>20000){spClear();toast('圈太大了（'+cnt+'格>20000）——分几次复制');return;}
    spMark(0xffaa00,{x:x0,y:y0,z:z0});spMark(0xffaa00,{x:x1,y:y1,z:z1});
    cpBox=[x0,y0,z0,x1,y1,z1];
    const s=countSel(x0,y0,z0,x1,y1,z1);
    document.getElementById('cpInfo').textContent='范围'+(x1-x0+1)+'×'+(y1-y0+1)+'×'+(z1-z0+1)+'＝'+cnt+'格，实块'+s.n+(s.sigs?'，牌'+s.sigs:'');
    document.getElementById('cpModal').style.display='flex';
    return;
  }
  const tt=world[idx(h.x,h.y,h.z)];
  const hk=h.x+','+h.y+','+h.z;
  /* v51：床/牌/匾=交互方块——普通点=功能，潜行点=直接拆（MC语义）。
     双点拆除退役：手机上两下要命中同一格，手抖一下就永远拆不掉（「拆半天拆不掉」的根） */
  if((tt===37||tt===39||tt===40)&&!isSneak()){   // v63：点门=开关（状态+100全端同步）；潜行着点=拆
    world[idx(h.x,h.y,h.z)]=tt+100;saveDiff(h.x,h.y,h.z,tt+100);rebuild();AU.click();toast(tt===40?'门开了':'门开了——再点关上');return;
  }
  if(tt>=137&&tt<=140&&!isSneak()){
    world[idx(h.x,h.y,h.z)]=tt-100;saveDiff(h.x,h.y,h.z,tt-100);rebuild();AU.click();toast('门关了');return;
  }
  if(tt===35&&!isSneak()){openChronicle();return;}   /* v79：点部落火塘=翻村志 */
  if((tt===137||tt===139||tt===140)&&isSneak()){   // 开着的门潜行拆=先关门再拆（关态）
    world[idx(h.x,h.y,h.z)]=tt-100;saveDiff(h.x,h.y,h.z,tt-100);
    digBlock(h,'门拆了');return;
  }
  if(tt===42){toast('楼梯是逐格搭的——锹圈地可整片拆');return;}
  if(tt===23){
    if(isSneak()){digBlock(h,'床拆了');return;}
    setBedSpawn(h.x,h.y,h.z);toast('出生点设在这张床了（潜行着点=拆床）');return;
  }
  if(tt===27||tt===28){
    if(isSneak()){
      if(SIGNS.signs[hk]){delete SIGNS.signs[hk];pushSigns('河滩：一块招牌收走了');}
      digBlock(h,'拆了');return;
    }
    editSign(h.x,h.y,h.z);return;
  }
  if(tt===29){
    if(isSneak()){
      for(const k in PORTALS.portals){const q=PORTALS.portals[k];if(q.x===h.x&&q.y===h.y&&q.z===h.z){delete PORTALS.portals[k];pushPortals('河滩：传送门「'+k+'」收走了');break;}}
      digBlock(h,'门拆了');return;
    }
    toast('这扇门连着别处——潜行着点才拆');return;
  }
  if(h.x===STX&&h.z===STZ&&h.y>=8){showStele('碑上的字，是拿手凿的。\n凿不动，也别凿。');return;}   // 广场面y=7顶=8
  if(Math.abs(h.x-BOARD_POS[0]-0.5)<2&&Math.abs(h.z-BOARD_POS[2])<2){showStele('留言板的腿立在这儿。\n地别挖，板要站。');return;}
  AU.dig(tt);
  world[idx(h.x,h.y,h.z)]=AIR;saveDiff(h.x,h.y,h.z,AIR);rebuild();
}
/* v70两点式折返楼梯：阶13踏步可走+篱19两侧栏杆+板10平台 */
function genStair2(A,B){
  const dy=B.y-A.y;
  if(dy<1)return null;
  const dx=B.x-A.x, dz=B.z-A.z;
  const alongX=Math.abs(dx)>=Math.abs(dz);
  const dir=alongX?(dx>0?1:-1):(dz>0?1:-1);
  const L1=Math.ceil(dy/2), L2=dy-L1;
  const out=[];const STEP=13, PLAT=10, RAIL=19;
  const P=(u,v,y,t)=>{ if(alongX)out.push([A.x+u,A.y+y,A.z+v,t]); else out.push([A.x+v,A.y+y,A.z+u,t]); };
  for(let i=0;i<L1;i++){P(dir*i,0,i,STEP);P(dir*i,-1,i,STEP);P(dir*i,1,i,RAIL);P(dir*i,-2,i,RAIL);}
  for(let j=0;j<2;j++){P(dir*(L1+j),0,L1,PLAT);P(dir*(L1+j),-1,L1,PLAT);}
  for(let i=0;i<L2;i++){P(dir*(L1+1-i),-2,L1+1+i,STEP);P(dir*(L1+1-i),-3,L1+1+i,STEP);P(dir*(L1+1-i),-4,L1+1+i,RAIL);}
  for(let j=0;j<2;j++){P(dir*(L1-L2+1),-2,dy,PLAT);P(dir*(L1-L2+1),-3,dy,PLAT);}
  const seen=new Set(),r=[];
  for(const c of out){const k=c[0]+','+c[1]+','+c[2];if(!seen.has(k)){seen.add(k);r.push(c);}}
  return r;
}
function put(){
  if(curType===36){if(spA||spMarks.length){spClear();toast('圈地清了');}return;}   // v61：锹——点搭=取消圈地
  if(curType===44){   // v76cpv76：粘贴——点搭=放预览，原位再点=确认
    const h2=raycast();if(!h2)return;
    if(!CB){toast('剪贴板空的——点「挖」圈选一块先复制');return;}
    if(CPA&&h2.x===CPA.x&&h2.y===CPA.y&&h2.z===CPA.z){pasteExec();return;}
    CPA={x:h2.x,y:h2.y,z:h2.z};cpPrevMark();
    toast('预览'+CB.w+'×'+CB.h+'×'+CB.d+'——原位再点确认，换个位置=挪预览');
    return;
  }
  if(curType===42){   // v70两点式：点搭=一楼基点，再点=二楼落点——折返阶梯+两侧篱笆栏杆（体素可走可拆）
    const h=raycast();if(!h)return;
    if(!spA){
      spA={x:h.x,y:h.y,z:h.z};spMark(0x00ffcc,h);
      toast('一楼基点——走上去点二楼落点');return;
    }
    const A=spA;spA=null;spClear();
    const cells=genStair2(A,{x:h.x,y:h.y,z:h.z});
    if(!cells){toast('二楼要比一楼高——换个落点');return;}
    let n=0;
    for(const[cx,cy,cz,ct] of cells){
      if(!inW(cx,cy,cz))continue;
      if(cx===STX&&cz===STZ&&cy>=8)continue;
      world[idx(cx,cy,cz)]=ct;
      diffs.a[cx+','+cy+','+cz]=ct;
      diffs.r=diffs.r.filter(pp=>!(pp[0]===cx&&pp[1]===cy&&pp[2]===cz));
      refreshSign(cx,cy,cz);n++;
    }
    try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}
    worldDirty=true;rebuild();AU.put();
    toast('折返楼梯——'+n+'格，两侧篱笆是栏杆；拆用锹圈地或逐格');return;
  }
  if(curType===41){   // v64：填充工具——点搭=圈地，点挖=取消
    const h=raycast();if(!h)return;
    if(!spA){
      spA={x:h.x,y:h.y,z:h.z};spMark(0xffd24a,h);
      toast('填充起点('+h.x+','+h.y+','+h.z+')——再点对角');return;
    }
    const A=spA;spA=null;spMark(0xffa040,h);
    const x0=Math.min(A.x,h.x),x1=Math.max(A.x,h.x);
    const y0=Math.min(A.y,h.y),y1=Math.max(A.y,h.y);
    const z0=Math.min(A.z,h.z),z1=Math.max(A.z,h.z);
    const cnt=(x1-x0+1)*(y1-y0+1)*(z1-z0+1);
    if(cnt>20000){spClear();toast('圈太大了（'+cnt+'格>20000）——分几次填');return;}
    openFill(x0,y0,z0,x1,y1,z1,cnt);return;
  }
  const h=raycast();if(!h)return;
  const x=h.x+h.nx,y=h.y+h.ny,z=h.z+h.nz;
  if(!inW(x,y,z))return;
  if(world[idx(x,y,z)]!==AIR&&world[idx(x,y,z)]!==8)return;
  const vk=villCells[x+','+y+','+z];
  if(vk&&vk!=='skip'){toast('这是'+(VH.homes[vk]?VH.homes[vk].name:'村民')+'家盖到的地方——换个别处');return;}   /* v77 */
  if(villPlotAt(x,y,z)){toast('这是'+(VH.homes[villPlotAt(x,y,z)]||{}).name+'的宅地——换个别处');return;}   /* v77 */
  // 别放进自己身体
  if(curType!==8&&x+1>p.x-PW&&x<p.x+PW&&z+1>p.z-PW&&z<p.z+PW&&y+1>p.y&&y<p.y+PH)return;
  if(curType===37||curType===40){const u=world[idx(x,y+1,z)];if(u!==AIR&&u!==8){toast('门上头要留一格空——门是两格高');return;}}   // v62
  if(curType===39||curType===40){for(const dy of [1,2,3]){const u=world[idx(x,y+dy,z)];if(u!==AIR&&u!==8){toast('大门上头要留三格空——大门是四格高');return;}}}   // v63：四格大门
  let putT=curType;
  if(DRT[curType]){   // v67定向家具：火口/床头/门面朝向玩家
    const dir=((Math.round((p.yaw||0)/(Math.PI/2))%4)+4)%4;
    if(dir)putT=curType+dir*1000;
  }
  AU.put();
  world[idx(x,y,z)]=putT;saveDiff(x,y,z,putT);rebuild();
  if(curType===27||curType===28)editSign(x,y,z);   // v50：牌和匾一放下就请你题字
  if(curType===29)openPortalNaming(x,y,z);   // v52：门一放下就请你起名
}
/* v50 招牌照面朝向：文字面转向玩家（放置/题字那一刻），按水平方位取整到90° */
function signDirToPlayer(x,z){
  const th=Math.atan2(p.x-(x+0.5),p.z-(z+0.5));
  return ((Math.round(th/(Math.PI/2))%4)+4)%4;
}
let signEditPos=null;
/* v52 传送门交互：命名 / 列表 / 吟唱传送 */
let portalEditPos=null,teleporting=null;
function openPortalNaming(x,y,z){
  portalEditPos=[x,y,z];
  document.getElementById('portalInput').value='';
  document.getElementById('portalModal').style.display='flex';
  setTimeout(()=>{try{document.getElementById('portalInput').focus();}catch(e){}},80);
}
function portalCommit(){
  if(!portalEditPos)return;
  const [x,y,z]=portalEditPos;
  /* v52.3：没确认过云端就先pull——开页时404（文件还没建）后来有人建了，空壳推送会冲掉别人的门（清言滩蒸发实录） */
  if(!portalPulled){pullPortals().then(()=>portalCommit());return;}
  const name=document.getElementById('portalInput').value.trim().slice(0,6);
  if(!name){toast('起个名才立得住');return;}
  if(PORTALS.portals[name]){toast('这个名字有门了，换一个');return;}
  PORTALS.portals[name]={x,y,z,owner:(ME&&ME.name)||'客'};
  pushPortals('河滩：传送门「'+name+'」立在'+x+','+z);
  portalEditPos=null;
  document.getElementById('portalModal').style.display='none';
  toast('「'+name+'」立住了——走近它点「传送」就能来去');
}
function portalDist(){   /* 最近的传送门距离 */
  let m=1e9;
  for(const k in PORTALS.portals){const q=PORTALS.portals[k];if(!portalAlive(q))continue;m=Math.min(m,Math.hypot(p.x-q.x-0.5,p.z-q.z-0.5));}
  return m;
}
function portalAlive(q){   /* v73：门绑定方块存在性（TA定的）——门格没有29号方块=失效门 */
  return inW(q.x,q.y,q.z)&&get(q.x,q.y,q.z)===29;
}
function sweepDeadPortals(destructive){   /* v74：默认只滤列表不删数据（pull时序没对齐会误杀）；「清失效门」按钮才真删 */
  const dead=[];
  for(const k in PORTALS.portals){if(!portalAlive(PORTALS.portals[k]))dead.push(k);}
  if(!dead.length)return;
  if(!destructive)return;
  if(!worldPulled){toast('世界还没同步完——稍后再清');return;}
  for(const k of dead)delete PORTALS.portals[k];
  pushPortals('河滩：失效传送门清走——'+dead.join('、'));
  toast('清走了失效的门：'+dead.join('、'));
}
function renderPortalList(){
  const box=document.getElementById('portalItems');box.innerHTML='';
  sweepDeadPortals();   /* v74：失效门滤出列表（数据保留，手动清） */
  const keys=Object.keys(PORTALS.portals).filter(k=>portalAlive(PORTALS.portals[k]));
  if(!keys.length){box.innerHTML='<div style="color:#7a6a9a;font-size:13px;letter-spacing:1px;padding:12px 0;text-align:center">还没有立起来的门——放一块「门」，起个名，它就一直在那儿</div>';return;}
  keys.sort((a,b)=>{
    const qa=PORTALS.portals[a],qb=PORTALS.portals[b];
    return (Math.hypot(p.x-qa.x-0.5,p.z-qa.z-0.5))-(Math.hypot(p.x-qb.x-0.5,p.z-qb.z-0.5));
  });
  for(const k of keys){
    const q=PORTALS.portals[k];
    const d=Math.round(Math.hypot(p.x-q.x-0.5,p.z-q.z-0.5));
    const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #cfc2ec;border-radius:8px;margin-bottom:8px;cursor:pointer;background:#fdfbff';
    row.innerHTML='<span style="color:#3a2a5a;font-size:15px;letter-spacing:2px;font-weight:bold">'+k+'</span><span style="color:#8a7aaa;font-size:12px">'+(q.owner||'?')+' · '+(d<1?'就在脚下':d+'步')+'</span>';
    row.onclick=()=>{startTeleport(k,q);};
    box.appendChild(row);
  }
}
function startTeleport(name,q){
  if(teleporting)return;
  teleporting={name,x:q.x,y:q.y,z:q.z,px:p.x,pz:p.z,until:Date.now()+2000};
  document.getElementById('portalList').classList.remove('on');
  toast('去「'+name+'」……站着别动');
}
function tickTeleport(){   /* 主循环里调：吟唱2秒，动了就断 */
  if(!teleporting)return;
  const t=teleporting;
  if(Math.hypot(p.x-t.px,p.z-t.pz)>0.8){teleporting=null;toast('走了就不传了');return;}
  if(Date.now()<t.until)return;
  teleporting=null;
  /* 落点：门四周找实际地面（topY含搭建——地形层+diffs层都算数，不再犯旅馆的错） */
  const tries=[[t.x+1,t.z],[t.x-1,t.z],[t.x,t.z+1],[t.x,t.z-1],[t.x,t.z]];
  for(const [tx,tz] of tries){
    if(tx<0||tz<0||tx>=W||tz>=D)continue;
    const gy=topY(tx,tz);
    const here=get(tx,gy,tz);
    if(here===0||here===8||here===undefined||HALF_H[here]!==undefined){
      AU.jump();
      p.x=tx+0.5;p.z=tz+0.5;p.y=gy+0.02;p.vy=0;
      savePos();
      toast('「'+t.name+'」');
      return;
    }
  }
  toast('那边的门被堵住了，下不去脚');
}
document.getElementById('portalOk').onclick=portalCommit;
document.getElementById('portalInput').addEventListener('keydown',e=>{if(e.key==='Enter')portalCommit();});
document.getElementById('portalNo').onclick=()=>{document.getElementById('portalModal').style.display='none';portalEditPos=null;};
document.getElementById('portalListClose').onclick=()=>document.getElementById('portalList').classList.remove('on');
document.getElementById('portalSweep').onclick=()=>{sweepDeadPortals(true);renderPortalList();};   /* v74：手动清失效门（真删） */
document.getElementById('portalList').addEventListener('click',e=>{if(e.target.id==='portalList')document.getElementById('portalList').classList.remove('on');});
document.getElementById('btnPortal').onclick=()=>{document.getElementById('portalList').classList.add('on');renderPortalList();};
/* v54 地图：全境俯视——地形色块+门+碑+板+玩家实时位置。512²列色缓存一次，标记层每帧轻画 */
let mapBase=null,mapBaseBusy=false;
const MAP_COLORS={1:'#7aa25c',2:'#8a6f52',3:'#9a9a94',4:'#d8c890',5:'#7a5b3a',6:'#5a7a42',7:'#b0aca0',8:'#4d8fae',10:'#c8b080',11:'#b0aca0',12:'#8a4a3a',13:'#8a8a84',14:'#e8c060',18:'#a08658',19:'#a08658',20:'#c8b080',21:'#9a9a94',22:'#e8c060',23:'#c8b080',27:'#c8b080',28:'#c8b080',29:'#8a5fbf'};
function topType(x,z){   /* 地表最高非空类型 */
  for(let y=H-1;y>=0;y--){const b=get(x,y,z);if(b!==0&&b!==0)return b;}
  return 0;
}
function generateMap(){
  if(mapBase||mapBaseBusy)return;
  mapBaseBusy=true;
  toast('绘制全境地图……');
  setTimeout(()=>{
    const cv=document.createElement('canvas');cv.width=W;cv.height=D;
    const g=cv.getContext('2d');
    const img=g.createImageData(W,D);
    for(let x=0;x<W;x++)for(let z=0;z<D;z++){
      const t=topType(x,z);
      let hex=MAP_COLORS[t]||'#111318';
      const elev=topY(x,z);   /* v57：等高亮度——海拔越高越亮，34+雪白 */
      if(t&&t!==8&&elev>=34)hex='#f4f8fc';
      else if(t&&t!==8){
        const lum=0.6+Math.min(0.5,(elev-4)*0.024);
        const r=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),bb=parseInt(hex.slice(5,7),16);
        hex='#'+[r,gg,bb].map(v=>Math.min(255,Math.round(v*lum)).toString(16).padStart(2,'0')).join('');
      }
      const i=(z*W+x)*4;
      img.data[i]=parseInt(hex.slice(1,3),16);
      img.data[i+1]=parseInt(hex.slice(3,5),16);
      img.data[i+2]=parseInt(hex.slice(5,7),16);
      img.data[i+3]=t?255:255;
    }
    g.putImageData(img,0,0);
    mapBase=cv;mapBaseBusy=false;
    toast('地图画好了');
  },50);
}
function drawMapMarks(){
  const cv=document.getElementById('mapCv');
  const g=cv.getContext('2d');
  if(mapBase)g.drawImage(mapBase,0,0);
  else{g.fillStyle='#14161e';g.fillRect(0,0,W,D);}
  const sc=cv.width/W;
  /* 门：紫点+名 */
  g.font='bold 11px sans-serif';
  for(const k in PORTALS.portals){
    const q=PORTALS.portals[k];
    g.fillStyle='#b9a8f0';g.beginPath();g.arc(q.x*sc,q.z*sc,3.5,0,7);g.fill();
    g.fillStyle='#e8e0ff';g.fillText(k,q.x*sc+5,q.z*sc-4);
  }
  /* 碑：金点 留言板：黄点 */
  g.fillStyle='#ffd97a';g.beginPath();g.arc(STX*sc,STZ*sc,3,0,7);g.fill();
  g.fillStyle='#d8caa4';g.beginPath();g.arc(BOARD_POS[0]*sc,BOARD_POS[2]*sc,3,0,7);g.fill();
  /* 玩家：白箭头（朝向实时） */
  const px=p.x*sc,pz=p.z*sc;
  const ang=Math.atan2(-Math.cos(p.yaw),-Math.sin(p.yaw));
  g.save();g.translate(px,pz);g.rotate(ang);
  g.fillStyle='#ffffff';g.beginPath();g.moveTo(6,0);g.lineTo(-4,-4);g.lineTo(-4,4);g.closePath();g.fill();
  g.restore();
  /* 视野圈 */
  g.strokeStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(px,pz,30,0,7);g.stroke();
}
let mapOn=false;
function toggleMap(){
  mapOn=!mapOn;
  document.getElementById('mapUI').classList.toggle('on',mapOn);
  if(mapOn){if(!mapBase)generateMap();drawMapMarks();}
}
document.getElementById('btnMap').onclick=toggleMap;
document.getElementById('mapUI').addEventListener('click',e=>{
  if(e.target.id==='mapCv'){
    const rect=e.target.getBoundingClientRect();
    const mx=Math.floor((e.clientX-rect.left)/rect.width*W);
    const mz=Math.floor((e.clientY-rect.top)/rect.height*D);
    document.getElementById('mapTip').textContent='坐标 '+mx+','+mz+' · 距你 '+Math.round(Math.hypot(p.x-mx,p.z-mz))+'步';
  }else toggleMap();
});
document.addEventListener('keydown',e=>{if(e.code==='KeyM'&&e.target.tagName!=='INPUT')toggleMap();});
/* v52 传送门数据层——portals.json，谁放谁命名；结构 {"portals":{"名字":{x,y,z,owner,t}}} */
let PORTALS={portals:{}},portalSha=null,portalPulled=false;
function pullPortals(){
  return ghGet('portals.json').then(({sha,data})=>{
    portalSha=sha;PORTALS=(data&&data.portals)?data:{portals:{}};portalPulled=true;   /* 404也算确认过——真空板 */
    try{localStorage.setItem('hetan_portals_cache',JSON.stringify(PORTALS));}catch(e){}
  }).catch(()=>{PORTALS=(function(){try{return JSON.parse(localStorage.getItem('hetan_portals_cache'))||{portals:{}};}catch(e){return {portals:{}};}})();portalPulled=false;});   /* 网络失败=没确认 */
}
function pushPortals(msg){
  const localSnap=JSON.parse(JSON.stringify(PORTALS.portals));   /* v74：重试前留本地底——pull回来把没传上去的门补回，不销毁 */
  return ghPut('portals.json',PORTALS,portalSha,msg).then(({sha})=>{portalSha=sha;portalPulled=true;}).catch(()=>{
    return pullPortals().then(()=>{
      for(const k in localSnap){if(!PORTALS.portals[k])PORTALS.portals[k]=localSnap[k];}   /* v74：本地新立的门pull后还在 */
      return ghPut('portals.json',PORTALS,portalSha,msg);
    }).then(({sha})=>{portalSha=sha;portalPulled=true;}).catch(()=>{try{toast('门没传上云——网络回来点一下列表会重试');}catch(e){}});
  });   /* 同signs：422拉最新重推一次；v74重试改合并不销毁——pull把刚立没传上的门抹掉再推空态=「门走两步就不见了」实底 */
}
pullPortals();
function editSign(x,y,z){
  signEditPos=[x,y,z];
  const k=x+','+y+','+z;
  document.getElementById('signInput').value=(SIGNS.signs[k]||{}).text||'';
  document.getElementById('signModal').style.display='flex';
  setTimeout(()=>{try{document.getElementById('signInput').focus();}catch(e){}},80);
}
function signCommit(){
  if(!signEditPos)return;
  const [x,y,z]=signEditPos,k=x+','+y+','+z;
  /* 体检修：pull未完成时SIGNS是空壳——此刻提交会把云端旧牌全冲掉（v43蒸发同族）——先等pull落地 */
  if(signsSha===null){pullSigns().then(()=>signCommit());return;}
  const text=document.getElementById('signInput').value.trim().slice(0,6);
  SIGNS.signs=SIGNS.signs||{};
  if(text){SIGNS.signs[k]={text:text,dir:signDirToPlayer(x,z),t:Date.now()};
    pushSigns('河滩：招牌「'+text+'」立在'+x+','+z);}
  else{delete SIGNS.signs[k];}   // 空字=擦掉（新放的空白牌不用上云）
  document.getElementById('signModal').style.display='none';
  signEditPos=null;refreshSign(x,y,z);
}
document.getElementById('signOk').addEventListener('click',signCommit);
document.getElementById('signNo').addEventListener('click',()=>{document.getElementById('signModal').style.display='none';signEditPos=null;});
document.getElementById('signInput').addEventListener('keydown',e=>{if(e.key==='Enter')signCommit();});

/* ================= 音效（Web Audio合成，零文件） ================= */
const AU=(function(){
  let ctx=null,master=null,muted=false;
  function ensure(){
    if(muted)return false;
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
      ctx=new AC();master=ctx.createGain();master.gain.value=0.55;master.connect(ctx.destination);
      riverStart();
    }
    if(ctx.state==='suspended')ctx.resume();
    return true;
  }
  let rainSrc=null,rainGain=null;
  function rain(on){
    if(on){
      if(!ensure())return;
      if(rainSrc)return;
      rainSrc=ctx.createBufferSource();rainSrc.buffer=noiseBuf(2);rainSrc.loop=true;
      const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
      rainGain=ctx.createGain();rainGain.gain.value=0;
      rainGain.gain.linearRampToValueAtTime(0.055,ctx.currentTime+2);
      rainSrc.connect(f);f.connect(rainGain);rainGain.connect(master);rainSrc.start();
    }else if(rainSrc){
      const src=rainSrc,g=rainGain;rainSrc=null;rainGain=null;
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+1.5);
      setTimeout(function(){try{src.stop();}catch(e){}},1600);
    }
  }
  function noiseBuf(dur){
    const b=ctx.createBuffer(1,Math.max(1,ctx.sampleRate*dur|0),ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;
  }
  // 挖：噪声burst，材质定频率（草软石硬）
  function dig(t){
    if(!ensure())return;const now=ctx.currentTime;
    const src=ctx.createBufferSource();src.buffer=noiseBuf(0.13);
    const f=ctx.createBiquadFilter();f.type='bandpass';
    f.frequency.value=(t===2||t===3)?1500:(t===4||t===5)?950:650;f.Q.value=1.1;
    const g=ctx.createGain();g.gain.setValueAtTime(0.5,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.13);
    src.connect(f);f.connect(g);g.connect(master);src.start(now);
  }
  // 放：低频叩
  function put(){
    if(!ensure())return;const now=ctx.currentTime;
    const o=ctx.createOscillator();o.type='triangle';
    o.frequency.setValueAtTime(190,now);o.frequency.exponentialRampToValueAtTime(85,now+0.08);
    const g=ctx.createGain();g.gain.setValueAtTime(0.42,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.09);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+0.1);
  }
  function jump(){
    if(!ensure())return;const now=ctx.currentTime;
    const o=ctx.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(150,now);o.frequency.exponentialRampToValueAtTime(320,now+0.1);
    const g=ctx.createGain();g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.12);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+0.13);
  }
  function land(v){
    if(!ensure())return;const now=ctx.currentTime;
    const src=ctx.createBufferSource();src.buffer=noiseBuf(0.09);
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
    const g=ctx.createGain();g.gain.setValueAtTime(Math.min(0.4,0.1+v*0.012),now);g.gain.exponentialRampToValueAtTime(0.01,now+0.09);
    src.connect(f);f.connect(g);g.connect(master);src.start(now);
  }
  function step(t){   /* v133脚步分层（TA：所有声音都一样，下雪踩地该有积雪声）——按脚下材质+天气：雪=闷噗、石=脆、木=空、土路=闷、草=原声 */
    if(!ensure())return;const now=ctx.currentTime;
    const snow=(t==='snow');
    const src=ctx.createBufferSource();src.buffer=noiseBuf(snow?0.09:0.05);
    const f=ctx.createBiquadFilter();
    if(snow){f.type='lowpass';f.frequency.value=300;}
    else if(t==='stone'){f.type='bandpass';f.frequency.value=950;f.Q.value=1.2;}
    else if(t==='wood'){f.type='bandpass';f.frequency.value=640;f.Q.value=1;}
    else if(t==='path'){f.type='lowpass';f.frequency.value=380;}
    else{f.type='bandpass';f.frequency.value=500;f.Q.value=0.8;}
    const g=ctx.createGain();
    g.gain.setValueAtTime(snow?0.1:0.07,now);
    g.gain.exponentialRampToValueAtTime(0.005,now+(snow?0.08:0.05));
    src.connect(f);f.connect(g);g.connect(master);src.start(now);
  }
  function click(){
    if(!ensure())return;const now=ctx.currentTime;
    const o=ctx.createOscillator();o.type='square';
    o.frequency.setValueAtTime(880,now);
    const g=ctx.createGain();g.gain.setValueAtTime(0.06,now);g.gain.exponentialRampToValueAtTime(0.005,now+0.035);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+0.04);
  }
  // 环境水声：噪声循环+带通，音量按距河远近调
  let rg=null;
  function riverStart(){
    const src=ctx.createBufferSource();src.buffer=noiseBuf(2.2);src.loop=true;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=620;f.Q.value=0.55;
    rg=ctx.createGain();rg.gain.value=0;
    src.connect(f);f.connect(rg);rg.connect(master);src.start();
  }
  function riverSet(v){ if(rg)rg.gain.setTargetAtTime(muted?0:v,ctx.currentTime,0.4); }
  /* v45生机三音：鸟鸣（白天啁啾）、鸡咯（受惊炸群）、鸭拍水（受惊扑棱）——都合成，音量小 */
  function birdChirp(){
    if(!ensure())return;const now=ctx.currentTime;
    const n=2+(Math.random()*3|0);
    for(let i=0;i<n;i++){
      const t0=now+i*(0.09+Math.random()*0.07);
      const o=ctx.createOscillator();o.type='sine';
      const f=2900+Math.random()*1300;
      o.frequency.setValueAtTime(f,t0);o.frequency.exponentialRampToValueAtTime(f*1.35,t0+0.03);o.frequency.exponentialRampToValueAtTime(f*0.8,t0+0.07);
      const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(0.05,t0+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.08);
      o.connect(g);g.connect(master);o.start(t0);o.stop(t0+0.1);
    }
  }
  function henCluck(vol){
    if(!ensure())return;const now=ctx.currentTime;const v=Math.min(0.12,vol||0.08);
    for(let i=0;i<2;i++){
      const t0=now+i*0.11;
      const o=ctx.createOscillator();o.type='square';
      o.frequency.setValueAtTime(880-i*140,t0);o.frequency.exponentialRampToValueAtTime(480-i*100,t0+0.06);
      const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(v,t0+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.07);
      const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1800;
      o.connect(f);f.connect(g);g.connect(master);o.start(t0);o.stop(t0+0.08);
    }
  }
  function duckFlap(vol){
    if(!ensure())return;const now=ctx.currentTime;
    const src=ctx.createBufferSource();src.buffer=noiseBuf(0.22);
    const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1900;
    const g=ctx.createGain();g.gain.setValueAtTime(Math.min(0.14,vol||0.09),now);g.gain.exponentialRampToValueAtTime(0.005,now+0.22);
    src.connect(f);f.connect(g);g.connect(master);src.start(now);
  }
  function toggleMute(){ muted=!muted; if(master)master.gain.value=muted?0:0.55; return muted; }
  return {ensure,rain,dig,put,jump,land,step,click,riverSet,birdChirp,henCluck,duckFlap,toggleMute};
})();

function relocateAnimals(){   /* v85.1：动物迁村——鸡啄村口、狗看打谷场、鸭漂村边水（老地图的东滩/河离村310格） */
  if(!VH.camps)return;
  let henN=0;
  for(const a of ANIMAL_DEFS){
    if(a.type==='duck'||a.type==='goose'){
      const camp=VH.camps[a.seed%VH.camps.length];
      const spot=findWater(camp[0]+3,camp[2])||[camp[0],camp[2]];
      a.cx=spot[0]-2.5; a.cz=spot[1];
    }else if(a.type==='hen'){
      const camp=VH.camps[((henN/3)|0)%VH.camps.length];
      a.x=camp[0]+(henN%3)*2-1.5; a.z=camp[2]+5.5+(a.seed%13)*0.18; a.r=1.3;
      henN++;
    }else if(a.type==='dog'){
      const camp=VH.camps[0];
      a.x=camp[0]+1.5; a.z=camp[2]-3.5; a.r=2.8;
    }
  }
}
function carveRiver(){   /* v86：TA「连个河都没有就水滩滩」——给河滩一条河：两村连线北侧32格的弓形河道，正弦摆动，宽3格深2格。只动自然格（草/土/石/草丛），TA搭的任何方块不碰——河道遇建筑断流，两岸留TA自己改 */
  if(!VH.camps||VH.camps.length<2)return;
  const a=VH.camps[0], b=VH.camps[1];
  const dx=b[0]-a[0], dz=b[2]-a[2], len=Math.hypot(dx,dz)||1;
  let nx=-dz/len, nz=dx/len;
  if(nz>0){nx=-nx;nz=-nz;}   /* 朝北（z小） */
  const N=110;
  for(let s=0;s<=N;s++){
    const t=s/N;
    const sway=Math.sin(t*7.3)*8;
    const cx=Math.round(a[0]+dx*t+nx*(32+sway*0.35));
    const cz=Math.round(a[2]+dz*t+nz*(32+sway*0.35)+Math.cos(t*5.1)*4);
    for(let z2=cz-1;z2<=cz+1;z2++){
      if(!inW(cx,1,z2))continue;
      const y=surfaceY(cx,z2);
      for(const yy of [y,y-1,y-2]){
        if(!inW(cx,yy,z2))continue;
        const t0=world[idx(cx,yy,z2)];
        if(t0===1||t0===2||t0===3||t0===17||t0===AIR){
          world[idx(cx,yy,z2)]=(yy===y-2)?8:AIR;
        }
      }
    }
  }
}
const DAY_MS=21600000;
/* ===== v97村历：一年360游戏日，四季各90，24节气各15，月30日。历元=开村日 ===== */
const JIE24=['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
const MON12=['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const CNUM=['','一','二','三','四','五','六','七','八','九','十'];
/* v127节气挂现实（TA：节气显示有但世界不变——根因是两套历法打架：顶栏显示游戏日季节「春」，而游戏日360天=一年，现实里永远等不到那个秋天）。
   修：SEAS/jie改挂现实二十四节气（固定日近似），day照旧（开村日数/集日/宜忌是村子自己的历法，不动——村子有自己的日子，天地有自己的日子）。
   现实11月=冬·立冬——TA今天打开就是雪盖枯叶，当天可见。WXW/applySeasonLook自动跟随 */
const JIE_REAL=[[2,4,'立春'],[2,19,'雨水'],[3,6,'惊蛰'],[3,21,'春分'],[4,5,'清明'],[4,20,'谷雨'],[5,6,'立夏'],[5,21,'小满'],[6,6,'芒种'],[6,21,'夏至'],[7,7,'小暑'],[7,23,'大暑'],[8,8,'立秋'],[8,23,'处暑'],[9,8,'白露'],[9,23,'秋分'],[10,8,'寒露'],[10,23,'霜降'],[11,7,'立冬'],[11,22,'小雪'],[12,7,'大雪'],[12,22,'冬至'],[1,6,'小寒'],[1,20,'大寒']];
const SEAS_OF_JIE={'立春':'春','雨水':'春','惊蛰':'春','春分':'春','清明':'春','谷雨':'春','立夏':'夏','小满':'夏','芒种':'夏','夏至':'夏','小暑':'夏','大暑':'夏','立秋':'秋','处暑':'秋','白露':'秋','秋分':'秋','寒露':'秋','霜降':'秋','立冬':'冬','小雪':'冬','大雪':'冬','冬至':'冬','小寒':'冬','大寒':'冬'};
function realJieNow(){
  const now=new Date(), key=now.getMonth()+1, dnum=now.getDate();
  /* 找当前所处节气：取「最近一个已过的节气起始日」。节气按公历固定日近似（每年浮动1-2天，视觉用途足够） */
  let cur=JIE_REAL[19];   /* 默认小雪（11/22-12/7段），防止边缘空档 */
  let best=-1;
  for(const[m,d2,name]of JIE_REAL){
    const start=(m-1)*60+d2;   /* 粗序数（月*60+日）——只用于比大小 */
    const nownum=(key-1)*60+dnum;
    if(start<=nownum&&start>best){best=start;cur=[m,d2,name];}
  }
  /* 跨年段：1月的节气属于去年年末延续（冬至12/22→大寒1/20→立春2/4）——若now在1/1-2/4之间且没匹配到（best=-1），落在冬至段 */
  if(best<0)cur=[12,22,'冬至'];
  return cur[2];
}
function calNow(){const day=Math.max(0,Math.floor((Date.now()-VH.up)/DAY_MS));const jie=realJieNow();const SEAS=SEAS_OF_JIE[jie]||'春';const d=day%360;const mon=Math.floor(d/30),md=d%30+1;const mdC=md<=10?'初'+CNUM[md]:(md<20?'十'+CNUM[md-10]:(md===20?'二十':(md<30?'廿'+CNUM[md-20]:'三十')));return{day,SEAS,jie,mdC,monC:MON12[mon]+'月'};}
const YI10=['动土','上梁','嫁娶','赶集','修屋','走亲','纳畜','酿酒','开市','栽种'],JI8=['远行','动土','口舌','下水','伐木','搬迁','争讼','夜行'];
function yiJi(day){if(((day%30)+1)%5===0)return{yi:'赶集',ji:JI8[Math.floor(Math.abs(Math.sin(day*78.233+7)*24634.6345)%1*JI8.length)%JI8.length]};const h1=Math.abs(Math.sin(day*12.9898)*43758.5453)%1,h2=Math.abs(Math.sin(day*78.233+7)*24634.6345)%1;return{yi:YI10[Math.floor(h1*YI10.length)%YI10.length],ji:JI8[Math.floor(h2*JI8.length)%JI8.length]};}
/* v97：天气挂季节——冬天真的下雪，春天真的多雨 */
const WXW={春:[.5,.45,.05],夏:[.68,.28,.04],秋:[.66,.24,.10],冬:[.40,.05,.55]};   /* v126：冬雪概率.40→.55（TA：冬天会落雪——之前冬40%掷骰+90-240秒一换，雪太少碰不上） */
/* ===== v98集市：逢五逢十开集（村历咬合）——北岸街心六摊，摊主守摊，村民赶集 ===== */
function isMarketDay(c){c=c||(VH.homes?calNow():null);return c?((c.day%30)%5===0):false;}
function nextMarketIn(c){c=c||(VH.homes?calNow():null);if(!c)return 0;const md=(c.day%30)+1;let n=0;for(let i=md;i<=30;i++){n++;if(i%5===0)break;}return n;}
const MKT_STALLS=[
 {x:314,z:338,owner:'秀兰',hang:'布'},
 {x:314,z:345,owner:'杏花',hang:'线'},
 {x:324,z:338,owner:'铁蛋',hang:'鱼'},
 {x:324,z:345,owner:'麦穗',hang:'蛋'},
 {x:319,z:336,owner:'二愣',hang:'铁'},
 {x:319,z:347,owner:'栓柱',hang:'米'}];
const MKT_FLAG=[319,341];
let mktState=-999,mktCells={},mktSignMesh={};
const MK_GREET=['赶集呢？','刚出的，新鲜。','称二斤？','瞧瞧再买。','回头见。'];
function putMkt(x,y,z,t){const k=x+','+y+','+z;if(mktCells[k])return;if(!inW(x,y,z))return;const cur=world[idx(x,y,z)];if(cur!==AIR&&cur!==1&&cur!==17&&cur!==20)return;mktCells[k]=[cur,t];world[idx(x,y,z)]=t;}
function buildMarket(){
  const P=10,R=12;
  /* v104：开集前清场地——摊区+幌杆的树整列伐掉 */
  for(let cx=312;cx<=327;cx++)for(let cz=334;cz<=350;cz++){
    const gy2=groundY(cx,cz);if(gy2<1)continue;
    for(let cy=gy2+1;cy<H-1;cy++){const tb=get(cx,cy,cz);if(tb===5||tb===6||tb===15||tb===16)world[idx(cx,cy,cz)]=AIR;else break;}
  }
  MKT_STALLS.forEach(st=>{
    const y0=surfaceY(st.x,st.z);
    for(let dy=1;dy<=2;dy++){putMkt(st.x-1,y0+dy,st.z,P);putMkt(st.x+1,y0+dy,st.z,P);}
    for(let dx=-1;dx<=1;dx++)for(let dz=0;dz<=1;dz++){putMkt(st.x+dx,y0+1,st.z+dz,P);putMkt(st.x+dx,y0+3,st.z+dz,P);}
    putMkt(st.x-1,y0+2,st.z+1,R);putMkt(st.x+1,y0+2,st.z+1,P);
  });
  const fy=groundY(MKT_FLAG[0],MKT_FLAG[1])+1;
  for(let dy=1;dy<=6;dy++)putMkt(MKT_FLAG[0],fy+dy,MKT_FLAG[1],P);
  putMkt(MKT_FLAG[0],fy+7,MKT_FLAG[1],R);
  rebuild();
}
function tickMarket(now){
  if(!VH.homes||!VH.up)return;
  const open=isMarketDay();
  const st=open?1:0;
  if(st===mktState)return;
  mktState=st;
  for(const k in mktCells){const p=k.split(',').map(Number);if(p.length===3&&inW(p[0],p[1],p[2])){const rec=mktCells[k];if(world[idx(p[0],p[1],p[2])]===rec[1])world[idx(p[0],p[1],p[2])]=rec[0];}}
  mktCells={};
  for(const k in mktSignMesh){scene.remove(mktSignMesh[k]);}
  mktSignMesh={};
  if(open){buildMarket();
    MKT_STALLS.forEach((st2,i)=>{const y=groundY(st2.x,st2.z)+1;const key='mkt_'+i;
      const mesh=new THREE.Mesh(signGeo,[new THREE.MeshLambertMaterial({map:texOf('wood_side')}),new THREE.MeshLambertMaterial({map:texOf('wood_side')}),new THREE.MeshLambertMaterial({map:texOf('wood_top')}),new THREE.MeshLambertMaterial({map:texOf('wood_top')}),signTexFor(key,st2.hang+'·'+st2.owner,'v'),new THREE.MeshLambertMaterial({map:texOf('wood_side')})]);
      mesh.position.set(st2.x+0.5,y+3.3,st2.z+1.9);scene.add(mesh);mktSignMesh[key]=mesh;});
    const fy=groundY(MKT_FLAG[0],MKT_FLAG[1])+1;const kf='mkt_flag';
    const fm=new THREE.Mesh(signGeo,[new THREE.MeshLambertMaterial({map:texOf('wood_side')}),new THREE.MeshLambertMaterial({map:texOf('wood_side')}),new THREE.MeshLambertMaterial({map:texOf('wood_top')}),new THREE.MeshLambertMaterial({map:texOf('wood_top')}),signTexFor(kf,'集','v'),new THREE.MeshLambertMaterial({map:texOf('wood_side')})]);
    fm.scale.set(1.4,1.4,1.4);fm.position.set(MKT_FLAG[0]+0.5,fy+8.2,MKT_FLAG[1]+0.5);scene.add(fm);mktSignMesh[kf]=fm;
    console.log('v98：开集——六摊支起');
  }else console.log('v98：集散——摊收了');
}   /* v96：1游戏日=6现实小时——发展4倍速（工期/孩子成年/心事全按游戏日走；日夜天气照旧现实节奏） */
function groundY(x,z){   /* v102：真地形层——surfaceY从上往下找「第一个非空」会被树冠骗（TA：路都修树上去了）；扫到草/土/沙/石/草丛才认 */
  for(let yy=surfaceY(x,z)-1;yy>=1;yy--){
    const b=get(x,yy,z);
    if(b===8)return -1;
    if(b===1||b===2||b===3||b===4||b===17||b===11||b===20)return yy;   /* v105：路/桥面可站 */
  }
  return -1;
}
let taA=null,taR=null;
function taSets(){   /* v100：TA建筑的坐标集（diffs.a=搭的/diffs.r=挖的）——路和地基避让，一块不拆 */
  if(taA)return[taA,taR];
  taA=new Set();taR=new Set();
  try{
    if(diffs&&diffs.a)for(const k in diffs.a)taA.add(k);
    if(diffs&&diffs.r)for(const p of diffs.r)taR.add(p.join(','));
  }catch(e){}
  return[taA,taR];
}
function roadLineOf(vh){
  const NB=[298,312,326,340],SB=[442,456];
  const tx=vh.plot[0]+2,tz=vh.plot[2]-1;
  const arr=vh.plot[2]>320?NB:SB;
  let nx=arr[0];for(const n2 of arr){if(Math.abs(n2-tx)<Math.abs(nx-tx))nx=n2;}
  const line=[];const sx=nx<tx?1:(nx>tx?-1:0);
  let x=nx;let guard=0;
  while(guard++<40){line.push([x,tz]);if(x===tx)break;x+=sx;}
  return line;
}
function roadPeriodOf(vh,gday){
  if(!vh.startDay)return null;
  const len=roadLineOf(vh).length;
  const p0=vh.startDay-8;
  const done=Math.max(0,Math.min(len,Math.floor((gday-p0+1)*len/8)));
  return{on:gday>=p0&&gday<vh.startDay,done,len};
}
function pushVillagersPut(msg){
  try{ghGet('villagers.json').then(({sha})=>ghPut('villagers.json',VH,sha,msg)).catch(()=>{});}catch(e){}
}
let stepsDone={};
const homeDone={};   /* v118：户竣工表（id→bool）——微动作锤只给未竣工工地 */
function seatHouse(vh){   /* v100：地基柱——footprint每格从基座往下铺石砖到地表（TA建筑同款材质），坡地房子不再吊脚 */
  const [tA,tR]=taSets();
  const P=11;
  for(let dx=0;dx<9;dx++)for(let dz=0;dz<7;dz++){
    const x=vh.plot[0]+dx,z=vh.plot[2]+dz;
    const gy=groundY(x,z);
    if(gy<1||!inW(x,gy,z))continue;   /* v102：地基贴真地面，树冠不再当地面 */
    const k0=x+','+gy+','+z;
    if(tA.has(k0)||tR.has(k0))continue;
    for(let yy=vh.plot[1];yy<=gy;yy++){
      const k=x+','+yy+','+z;
      if(tA.has(k))break;
      if(!villCells[k]&&world[idx(x,yy,z)]===AIR){world[idx(x,yy,z)]=P;villCells[k]=vh.name||'seat';}
    }
  }
  rebuild();
}
function buildSteps(vh){
  const tx=vh.plot[0]+2,tz=vh.plot[2]-1,y0=vh.plot[1]+1;
  let yy=y0-1;
  for(let d=1;d<=4;d++){
    const z=tz-d;if(!inW(tx,1,z))break;
    const sy=groundY(tx,z)+1;   /* v102：贴真地面 */
    if(sy>=y0)break;
    for(let y=yy;y>=sy;y--){const k=tx+','+y+','+z;if(!villCells[k]&&world[idx(tx,y,z)]===AIR){world[idx(tx,y,z)]=13;villCells[k]='step';}   /* v100：13=真楼梯tile */}
    yy=sy-1;
    if(yy<sy)break;
  }
  rebuild();
}
/* ===== v113竣工三件套：清屋/家具/门口——TA：屋里空荡荡还存着土块树叶，有的门埋在土里 ===== */
function clearInterior(vh,bp){
  const[taA,taR]=taSets();
  const X=bp===3?5:(bp===2?6:(bp===4?9:7)), Z=bp===3?5:(bp===5?7:6), wallH=bp===5?4:(bp===2?4:3);
  for(let dx=0;dx<X;dx++)for(let dz=0;dz<Z;dz++)for(let dy=1;dy<=wallH+3;dy++){
    const x=vh.plot[0]+dx,y=vh.plot[1]+1+dy,z=vh.plot[2]+dz;
    const k=x+','+y+','+z;
    if(taA.has(k)||taR.has(k))continue;   /* TA搭的不碰 */
    const b=world[idx(x,y,z)];
    if(b!==AIR&&!(b>=37&&b<=40)&&b!==27)world[idx(x,y,z)]=AIR;   /* 门(37-40)/牌27是蓝图格保留；土草叶花全清 */
  }
}
function furnishHouse(vh,bp){
  const[taA,taR]=taSets();
  const X=bp===3?5:(bp===2?6:(bp===4?9:7)), Z=bp===3?5:(bp===5?7:6);
  const y0=vh.plot[1]+2, put=(dx,dz,t)=>{
    const x=vh.plot[0]+dx,z=vh.plot[2]+dz,y=y0;
    const k=x+','+y+','+z;
    if(!inW(x,y,z)||taA.has(k)||taR.has(k))return;
    if(world[idx(x,y,z)]!==AIR)return;
    world[idx(x,y,z)]=t;villCells[k]='furn';
  };
  /* v133家具让门路（TA：门开口朝向不一样，有间屋子被灶挡住了进出不得）——
     门都在z=0墙、x=doorX（bp3=1其余X/2），门口通路=[doorX,1]和[doorX,2]两格——
     bp3小屋门在x=1，灶固定(1,1)正好压门内第一步+凳(1,2)堵第二格，门口一列堵死。家具避开。 */
  const doorX2=bp===3?1:Math.floor(X/2);
  const onPath=(dx,dz)=>dx===doorX2&&(dz===1||dz===2);
  let stoveX=1,stoveZ=1;
  if(onPath(stoveX,stoveZ)){stoveX=X-2;stoveZ=1;}   /* 灶挪对面角 */
  put(stoveX,stoveZ,33);            /* 灶——锅里总得有东西 */
  /* v115烟囱：灶正上方穿屋顶两格砖，烟从烟囱口排到屋外（烟囱跟灶走——灶挪了烟囱不跟就排屋里） */
  const wallH2=bp===5?4:(bp===2?4:3);
  const chimX=vh.plot[0]+stoveX,chimZ=vh.plot[2]+stoveZ,chimTop=vh.plot[1]+1+wallH2+3;
  for(let dy=wallH2+2;dy<=wallH2+3;dy++){
    const cy=vh.plot[1]+1+dy,ck=chimX+','+cy+','+chimZ;
    if(!inW(chimX,cy,chimZ)||taA.has(ck)||taR.has(ck))continue;
    const cb=world[idx(chimX,cy,chimZ)];
    if(cb===AIR||cb===12){world[idx(chimX,cy,chimZ)]=7;villCells[ck]=villCells[ck]||'furn';}
  }
  smokeSrc=smokeSrc.filter(q=>!(q[0]===chimX&&q[2]===chimZ));
  smokeSrc.push([chimX,chimTop,chimZ]);
  put(X-2,Z-2,23);        /* 床：东南角贴墙（z=Z-2不靠门墙——永远不挡门） */
  put(1,Z-2,24);          /* 柜：东北角 */
  put(Math.floor(X/2),Z-3,21);   /* 桌：中部 */
  let bX=Math.floor(X/2)-1,bZ=Z-3;
  if(onPath(bX,bZ))bX=bX===doorX2?bX-1:bX+1;   /* 凳让门路：挪离门口列 */
  put(bX,bZ,18); /* 凳 */
  if(bp===4||bp===5){put(Math.floor(X/2)+1,Z-3,18);put(X-3,1,21);}   /* 大户：双凳+边桌 */
  console.log('v133：'+(vh.name||'')+'家屋内陈设齐了——床灶柜桌凳（门路x='+doorX2+'让开）');
}
function fixDoorway(vh,bp){
  const[taA,taR]=taSets();
  const X=bp===3?5:(bp===2?6:(bp===4?9:7));
  const doorX=bp===3?1:Math.floor(X/2);
  const tx=vh.plot[0]+doorX,y0=vh.plot[1]+2;   /* 屋内地面站立层 */
  for(let dz=-1;dz>=-3;dz--){
    const z=vh.plot[2]+dz;if(!inW(tx,1,z))break;
    const sy=groundY(tx,z)+1;
    if(sy>y0){   /* 门外地形比屋内地板高——挖土开门（TA：门埋土里的根治） */
      for(let yy=y0;yy<sy;yy++){
        const k=tx+','+yy+','+z;
        if(taA.has(k)||taR.has(k))continue;
        if(villCells[k]==='step')continue;
        world[idx(tx,yy,z)]=AIR;
      }
      world[idx(tx,y0,z)]=13;villCells[tx+','+y0+','+z]='step';   /* 门口铺阶 */
    }
  }
}
function villagerProgress(vh,now,startDay){   /* 晴日制·纯确定（v79.1修：雨天进度归零的bug——TA凌晨实测「房屋不见了就只有火塘了」）：
  开工日必晴（开工当天已经在干的活不算雨），后续按hash节奏；今天的实时天气只影响村民出不出工（渲染层），不影响进度。
  原v78的「今天clear+n+=spd」在day0+rain时n=0——工地清空，已修 */
  const sd=startDay||0;   /* v78kin78：孩子户从成年日起算，不把童年算进工期 */
  const days=Math.max(0,Math.floor((now-VH.up)/DAY_MS)-sd);
  let smDay=NaN;
  try{smDay=parseFloat(localStorage.getItem('hetan_smithyDay'));}catch(e){}   /* v119：铁匠铺落成日（judge_build过账写memory，executeJudgePlans落本地）——历史不改写，只加速之后的晴天 */
  const boost=(d)=>(!isNaN(smDay)&&d>=smDay)?1.3:1;
  let n=0;
  for(let i=0;i<=days;i++){const d=i+sd;if(d===sd||hash(d*7.7,i*3.3)<0.72)n+=vh.spd*boost(d);}   /* d===sd=开工日必晴；v119第一根因果链：铁匠铺→盖房快三成 */
  return n;
}
function villPlotAt(x,y,z){   /* 宅地空域：6×6 footprint，地上8格——放置/粘贴查这个 */
  for(const id in VH.homes){
    const vh=VH.homes[id];
    if(x>=vh.plot[0]&&x<vh.plot[0]+10&&z>=vh.plot[2]&&z<vh.plot[2]+10&&y>=vh.plot[1]&&y<=vh.plot[1]+10)return id;
  }
  return null;
}
function villSignMake(id,vh,x,y,z){   /* 封顶名牌：门前立牌，写名字。不进signs.json（村民牌不可编辑、无竞态） */
  const key='vill_'+id;
  if(villSignMesh[key])return;
  const wood=new THREE.MeshLambertMaterial({map:texOf('wood_side')});
  const woodTop=new THREE.MeshLambertMaterial({map:texOf('wood_top')});
  const mesh=new THREE.Mesh(signGeo,[wood,wood,woodTop,woodTop,signTexFor(key,vh.name,'v'),wood]);
  mesh.rotation.y=(vh.plot[2]>riverZAt(vh.plot[0])?0:2)*Math.PI/2;   /* 牌面朝河 */
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  mesh.userData.vn=vh.name;   /* v83：点牌开对话的名字 */
  scene.add(mesh);villSignMesh[key]=mesh;
}
function applyVillagers(now){
  if(!VH.homes)return;
  const day=Math.floor((now-VH.up)/DAY_MS);
  /* v96：房放大换代——清旧格重铺（云端villagers.json v6已重排21户，这里只清格+y校正） */
  /* v99：宅基坐地——plot[1]重采样为footprint五点surfaceY的最小值（治「半空房」：v96只采一角，坡上就悬空）；清格重铺+修入口台阶 */
  /* v104：清树冠残留——v99-v101的路/地基/台阶铺在树冠顶（surfaceY被树冠骗），v102修了代码没清存量；全清重铺+plot九点groundY重坐 */
  /* v106：桥身重铸——v105的实心桥（填到坑底的墙）不在villCells里，按主街走廊清扫全部非TA石砖，重铺时用新桥结构 */
  if(!localStorage.getItem('hetan_mig_v107')&&(VH.v||0)>=6){
    const [tA6,tR6]=taSets();
    const corridor=(x1,z1,x2,z2)=>{
      const dx=x2>x1?1:(x2<x1?-1:0),dz=z2>z1?1:(z2<z1?-1:0);
      let x=x1,z=z1,guard=0;
      while(guard++<420){
        for(let y=H-2;y>=1;y--){
          const k=x+','+y+','+z;
          if(tA6.has(k)||tR6.has(k))continue;
          const b=get(x,y,z);
          if(b===11){world[idx(x,y,z)]=AIR;}
          else if(b!==0&&b!==6&&b!==5&&b!==15&&b!==16&&b!==17)break;   /* 碰到实体地形停（树/草丛放过） */
        }
        if(x===x2&&z===z2)break;
        if(x!==x2)x+=dx;else if(z!==z2)z+=dz;else break;
      }
    };
    for(const nx of [298,312,326,340])corridor(nx,390,nx,308);
    for(const hz of [333,350,364,378])corridor(280,hz,352,hz);
    for(const nx of [442,456])corridor(nx,186,nx,258);
    for(const hz of [208,222,236])corridor(426,hz,472,hz);
    let w6=0;
    for(const k in villCells){const p=k.split(',').map(Number);if(p.length===3&&inW(p[0],p[1],p[2])&&world[idx(p[0],p[1],p[2])]!==AIR){world[idx(p[0],p[1],p[2])]=AIR;w6++;}}
    villCells={};villBuilt={};villTotals={};stepsDone={};
    for(const id in villSignMesh){scene.remove(villSignMesh[id]);}
    villSignMesh={};
    try{localStorage.setItem('hetan_mig_v107','1');}catch(e){}
    console.log('v107迁移：走廊重铺'+w6+'格，随坡缓降');
  }
  if(!localStorage.getItem('hetan_mig_v105x')&&(VH.v||0)>=6){
    let wiped=0;
    for(const k in villCells){const parts=k.split(',').map(Number);if(parts.length===3&&inW(parts[0],parts[1],parts[2])&&world[idx(parts[0],parts[1],parts[2])]!==AIR){world[idx(parts[0],parts[1],parts[2])]=AIR;wiped++;}}
    villCells={};villBuilt={};villTotals={};stepsDone={};
    for(const k in mktCells){const p=k.split(',').map(Number);if(p.length===3&&inW(p[0],p[1],p[2])){const rec=mktCells[k];if(world[idx(p[0],p[1],p[2])]===rec[1])world[idx(p[0],p[1],p[2])]=rec[0];}}
    mktCells={};mktState=-999;
    for(const id in villSignMesh){scene.remove(villSignMesh[id]);}
    villSignMesh={};
    for(const id in mktSignMesh){scene.remove(mktSignMesh[id]);}
    mktSignMesh={};
    const reseat=(plot)=>{const ys=[];for(const [dx,dz] of [[0,0],[4,0],[8,0],[0,3],[4,3],[8,3],[0,6],[4,6],[8,6]]){const y=groundY(plot[0]+dx,plot[2]+dz);if(y>=1)ys.push(y);}if(!ys.length)return plot[1];ys.sort((a,b)=>a-b);return ys[Math.floor(ys.length/2)]-1;};   /* v105：九点中位数——单点深坑不再拽沉整宅 */
    for(const id in VH.homes){const vh=VH.homes[id];if(vh&&vh.plot)vh.plot[1]=reseat(vh.plot);}
    if(VH.children)for(const c of VH.children){if(c.p)c.p[1]=reseat(c.p);}
    try{localStorage.setItem('hetan_mig_v105x','1');}catch(e){}
    console.log('v105迁移：清旧路'+wiped+'格重铺（坑上架桥）');
    pushVillagersPut('v105路重铺架桥');
  }
  if(!localStorage.getItem('hetan_mig_v100')&&(VH.v||0)>=6){
    let wiped=0;
    for(const k in villCells){const parts=k.split(',').map(Number);if(parts.length===3&&inW(parts[0],parts[1],parts[2])&&world[idx(parts[0],parts[1],parts[2])]!==AIR){world[idx(parts[0],parts[1],parts[2])]=AIR;wiped++;}}
    villCells={};villBuilt={};villTotals={};stepsDone={};
    for(const id in villSignMesh){scene.remove(villSignMesh[id]);}
    villSignMesh={};
    const reseat=(plot)=>{let m=1e9;for(const [dx,dz] of [[0,0],[4,0],[8,0],[0,3],[4,3],[8,3],[0,6],[4,6],[8,6]]){const y=surfaceY(plot[0]+dx,plot[2]+dz);if(y<m)m=y;}return m-1;};   /* v100：九点采样——bp4长屋9宽，v99五点漏了远角 */
    for(const id in VH.homes){const vh=VH.homes[id];if(vh&&vh.plot)vh.plot[1]=reseat(vh.plot);}
    if(VH.children)for(const c of VH.children){if(c.p)c.p[1]=reseat(c.p);}
    try{localStorage.setItem('hetan_mig_v100','1');}catch(e){}
    console.log('v100迁移：宅基九点坐地，清了'+wiped+'格');
    pushVillagersPut('v100宅基九点坐地');
  }
  if((VH.v||0)>=6&&!localStorage.getItem('hetan_mig_v96')){
    let wiped=0;
    for(const k in villCells){const parts=k.split(',').map(Number);if(parts.length===3&&inW(parts[0],parts[1],parts[2])&&world[idx(parts[0],parts[1],parts[2])]!==AIR){world[idx(parts[0],parts[1],parts[2])]=AIR;wiped++;}}
    villCells={};villBuilt={};villTotals={};
    for(const id in villSignMesh){scene.remove(villSignMesh[id]);}
    villSignMesh={};
    for(const id in VH.homes){const vh=VH.homes[id];if(vh&&vh.plot)vh.plot[1]=Math.round(height(vh.plot[0],vh.plot[2]));}
    try{localStorage.setItem('hetan_mig_v96','1');}catch(e){}
    console.log('v96迁移：清了'+wiped+'格旧村，房放大量级重铺+y校正');
  }
  /* v85：蓝图换代迁移——v4：清旧格重铺新蓝图（每端幂等，进度按天保留） */
  if((VH.v||0)>=4&&!localStorage.getItem('hetan_mig_v87')){
    let wiped=0;
    for(const k in villCells){
      const parts=k.split(',').map(Number);
      if(parts.length===3&&inW(parts[0],parts[1],parts[2])&&world[idx(parts[0],parts[1],parts[2])]!==AIR){world[idx(parts[0],parts[1],parts[2])]=AIR;wiped++;}
    }
    villCells={};villBuilt={};villTotals={};
    for(const id in villSignMesh){scene.remove(villSignMesh[id]);}
    villSignMesh={};
    try{localStorage.setItem('hetan_mig_v87','1');}catch(e){}
    console.log('v85迁移：清了'+wiped+'格旧村，换新蓝图');
  }
  if(day===villInitDay)return;   /* 一天一算；今天内部进度另由weather翻倍触发（rain/clear切换时强制重算一次） */
  const firstTime=villInitDay===-999;
  villInitDay=day;
  let changed=false;
  /* v78kin78：孩子成年→升级为施工户（宅地地面用JS height现场算，贴地形不靠预计算） */
  const active={};
  for(const id in VH.homes)active[id]=VH.homes[id];
  if(VH.children)for(const c of VH.children){
    if(now<VH.up+c.adultDay*DAY_MS||active[c.id])continue;
    active[c.id]={plot:[c.plot[0],Math.round(height(c.plot[0],c.plot[2])),c.plot[2]],bp:c.bp||1,spd:c.spd||8,name:c.name,startDay:c.adultDay};
  }
  for(const id in active){
    const vh=active[id];
    /* v82：名牌不等封顶——宅地激活即立，房没盖好牌先站岗 */
    if(!villSignMesh['vill_'+id]){
      const sc0=bpCells(vh.bp).find(c=>c[3]===27);
      if(sc0)villSignMake(id,vh,vh.plot[0]+sc0[0],vh.plot[1]+1+sc0[1],vh.plot[2]+sc0[2]);
    }
    taSets();   /* v113：蓝图强制落位引用taA——首boot在此初始化（构建循环先于路网跑） */
    const cells=bpCells(vh.bp);
    const sdEff=vh.startDay?vh.startDay+1:vh.startDay;   /* v101：迁入日只圈地立牌，次日动工 */
    const n=Math.min(cells.length,Math.max(0,Math.round(villagerProgress(vh,now,sdEff))));
    const prev=villBuilt[id]||0;
    villBuilt[id]=n;villTotals[id]=cells.length;
    homeDone[id]=(n>=cells.length);   /* v118 */
    if(n>=cells.length&&!stepsDone[id]){stepsDone[id]=1;seatHouse(vh);buildSteps(vh);clearInterior(vh,vh.bp);furnishHouse(vh,vh.bp);fixDoorway(vh,vh.bp);console.log('v113：'+(vh.name||id)+'家竣工——清屋+家具+门口');}
    if(n<=prev&&!firstTime)continue;
    for(let i=(firstTime?0:prev);i<n;i++){
      const[dx,dy,dz,t]=cells[i];
      const x=vh.plot[0]+dx,y=vh.plot[1]+1+dy,z=vh.plot[2]+dz;
      const k=x+','+y+','+z;
      if(villCells[k])continue;
      if(!inW(x,y,z))continue;
      if(world[idx(x,y,z)]!==AIR&&!taA.has(k)&&!taR.has(k)){world[idx(x,y,z)]=t;}   /* v113：蓝图格强制落位——TA优先，其余（土/草/叶）清，「不拆已有」是路的规矩不是房子的（TA：门埋土里/屋内存土块的根治） */
      else if(world[idx(x,y,z)]!==AIR){villCells[k]='skip';continue;}   /* TA搭的：不拆 */
      if(t===27)continue;   /* v82：牌走vill_系统（激活即立），world不放27格——避免与世界牌重叠 */
      world[idx(x,y,z)]=t;villCells[k]=id;changed=true;
    }
  }
  carveRiver();   /* v86：河滩要有河（world写，rebuild由后面的路网统一触发） */
  buildVillageRoads();   /* v85：村区街道+打谷场+水井（确定性，每端同算，只铺草上不碰玩家建筑）+rebuild兜底 */
  relocateAnimals();   /* v85.1：动物从老地图迁村 */
  buildCunKuWan();   /* v120/v121：两村公仓+名字牌+村长守北岸仓 */
  sweepRoadTrees();   /* v121：树挡路日切清 */
  buildStreetLamps();   /* v117：掌灯——路口灯柱+户灯，施工户挂火炬（TA：一到夜晚黑漆漆的） */
  buildFarm();   /* v111：麦田——芒种开镰寒露播种，村历驱动（TA：账上的粮要长在地里） */
  buildHouseholdProps();   /* v111：营生家什——渔网鸡窝缝纫机柴垛长在宅边 */
  updateGrainBins();   /* v111：粮囤按账本的粮码高 */
  /* v78kin78婚礼：两宅门口红花+喜牌（一次性事件，办过永记） */
  if(VH.weddings)for(const wd of VH.weddings){
    if(now<wd.at)continue;
    const wk='wed_'+wd.a+'_'+wd.b;
    if(villWedDone[wk])continue;
    villWedDone[wk]=1;
    if(wd.arch){
      const[ax,ay,az]=wd.arch;
      if(inW(ax,ay,az)&&world[idx(ax,ay,az)]===AIR){world[idx(ax,ay,az)]=27;villCells[ax+','+ay+','+az]='wed';}
      const na=(VH.homes[wd.a]?VH.homes[wd.a].name:'')+(VH.homes[wd.b]?VH.homes[wd.b].name:'');
      villSignMake('wed'+wd.a+wd.b,{name:(na+'成亲').slice(0,6),plot:[ax,ay,az]},ax,ay,az);   /* plot供牌面朝河判断 */
      let fl=0;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(fl>=2)break;const fx=ax+dx,fz=az+dz;
        if(inW(fx,ay,fz)&&world[idx(fx,ay,fz)]===AIR){world[idx(fx,ay,fz)]=15;villCells[fx+','+ay+','+fz]='wed';fl++;}}
    }
    changed=true;toast((VH.homes[wd.a]?VH.homes[wd.a].name:'')+'和'+(VH.homes[wd.b]?VH.homes[wd.b].name:'')+'成亲了');
  }
  /* v77.1部落火塘：村心一格35号——部落的火，进保护（TA：部落与部落的规模） */
  if(VH.camps)for(const c of VH.camps){
    const cx=c[0],cy=c[1]+1,cz=c[2],k=cx+','+cy+','+cz;
    if(!villCells[k]&&inW(cx,cy,cz)&&world[idx(cx,cy,cz)]===AIR){world[idx(cx,cy,cz)]=35;villCells[k]='camp';changed=true;}
    smokeSrc.push([cx,cy-1,cz]);   /* v114：火塘进烟源 */
  }
  if(changed)rebuild();
}
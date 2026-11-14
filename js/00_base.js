
/* v57.2 boot自救：①任何运行时错显示在页面上（今天三回「进不去」全是运行时错且看不见原因）②boot屏40秒没起来自动重试（Pages重建窗口1-10分钟，重试能自愈） */
window.addEventListener('error',function(e){
  try{
    var el=document.getElementById('bootErr');
    if(!el){el=document.createElement('div');el.id='bootErr';
      el.style.cssText='position:fixed;left:8px;right:8px;bottom:64px;background:#4a1518;color:#ffd6d6;padding:10px 12px;border:1px solid #8a3a3a;border-radius:6px;font-size:12px;z-index:9999;white-space:pre-wrap;font-family:monospace;line-height:1.5';
      (document.body||document.documentElement).appendChild(el);}
    var fn='';try{fn=(e.filename||'').split('/').pop();}catch(e2){}
    el.textContent='⚠ 出错 '+((e.message||'')+'\n@'+(fn||'?')+' 行'+(e.lineno||'?')+' 列'+(e.colno||'?')+'\n截图给清言就能修');
  }catch(_){}
});
(function bootWatch(){
  var n=0;
  var iv=setInterval(function(){
    n++;
    if(window.__booted){clearInterval(iv);return;}
    if(n%8===0){
      var el=document.getElementById('bootErr');
      if(!el){el=document.createElement('div');el.id='bootErr';
        el.style.cssText='position:fixed;left:8px;right:8px;bottom:64px;background:#3a2a10;color:#ffe9c0;padding:10px 12px;border:1px solid #8a6a2a;border-radius:6px;font-size:12px;z-index:9999';
        (document.body||document.documentElement).appendChild(el);}
      el.textContent='⏳ 加载中('+Math.round(n*5/60*10)/10+'分钟)…刚更新过的话服务器可能在重建，自动重试中';
      if(n===8){setTimeout(function(){location.reload();},100);}
    }
  },5000);
})();
/* ================= 基础 ================= */
const W=512, D=512, H=40;             // 世界尺寸（v53：240×200→512×512——同志要的城间尺度：广场到清言滩601格，旧世界整个对角线才312格；传送门是城间唯一合理交通）
const AIR=0;
// 方块类型: 1草 2土 3石 4沙 5木 6叶 7砖 8水 9玻璃 10木板 11石砖 12瓦
const TYPES={
  1:{n:'草', c:0x7aa25c, mats:['grass_side','grass_side','grass_top','dirt','grass_side','grass_side']},
  2:{n:'土', tex:'dirt'},
  3:{n:'石', tex:'stone'},
  4:{n:'沙', tex:'sand'},
  5:{n:'木', c:0x7a5b3a, mats:['wood_side','wood_side','wood_top','wood_top','wood_side','wood_side']},
  6:{n:'叶', tex:'leaves'},
  7:{n:'砖', tex:'brick'},
  8:{n:'水', c:0x4d8fae, water:true},
  9:{n:'玻', c:0xcfe0e6, tex:'glass', glass:true},
  10:{n:'板', c:0xb08a54, tex:'plank'},
  11:{n:'石砖', c:0x9a9a96, tex:'stonebrick'},
  12:{n:'瓦', c:0x7a4a42, tex:'roof'},
  13:{n:'阶', c:0x9a9a96, tex:'stonebrick', stair:true},
  14:{n:'炬', c:0xffb040, torch:true},
  15:{n:'红花', plant:'flower_red'},
  16:{n:'黄花', plant:'flower_yellow'},
  17:{n:'草', plant:'grass'},
  18:{n:'凳', c:0x8a6a48, tex:'plank', bench:true},
  19:{n:'篱', c:0x7a5b3a, tex:'wood_side', fence:true},
  20:{n:'路', c:0x9a9a96, tex:'stonebrick', path:true},
  21:{n:'桌', c:0x8a6a48, tex:'plank', table:true},
  22:{n:'灯', c:0xffe0a0, lantern:true},
  /* v50：桥和旅馆的配套——同志要点名加的 */
  23:{n:'床', c:0x8a6a48, bed:true, mats:['wood_side','wood_side','bed_top2','plank','wood_side','bed_head2']},   // v66：大床2×3格单box，床头板在-z面纹理。点床=设出生点，潜行点=拆
  24:{n:'柜', c:0x8a6a48, cab:true, mats:['wood_side','wood_side','wood_top','wood_top','cab_front','wood_side']},
  25:{n:'幌', c:0x31538a, plant:'banner'},
  26:{n:'石凳', c:0x9a9a96, tex:'stone', bench:true},
  27:{n:'牌', c:0x8a6a48, sign:true},   // 点牌=题字（写什么汉字牌上显示什么），2秒内再点=拆；文字存signs.json全端共享
  28:{n:'匾', c:0x8a6a48, sign:true, plaque:true},   // v50.1：横匾——横排题字（旅馆门楣那块），交互同牌
  29:{n:'门', c:0x8a5fbf, portal:true},   // v52：传送门——放置命名入portals.json，走近点「传」弹列表传送；潜行+点拆
  30:{n:'雪', mats:['snow_side','snow_side','snow','stone','snow_side','snow_side']},   // v57：峰顶雪——fBm海拔34+；v59：侧面雪覆石（不再是白盒子）
  /* v61 家具六件+大锹（同志旅馆建设急需） */
  31:{n:'椅', tex:'plank', chair:true},          // 有靠背的椅子（plank Lambert）
  32:{n:'盆栽', plant:'potted'},                  // 盆栽——十字面片像素画（陶盆+花）
  33:{n:'炉', mats:['stove_side','stove_side','stove_top','stove_top','stove_side','stove_side'], stove:true},   // 炉子——火口发光，进灯池；v62单box材质真贴上
  34:{n:'壁炉', mats:['fp_side','fp_side','fp_top','fp_top','fp_front','fp_side'], fp:true},   // 壁炉——正面火膛真贴上（v62修：单box），进灯池
  35:{n:'火塘', mats:['fpit_side','fpit_side','firepit','firepit','fpit_side','fpit_side'], fp:true},   // 火塘——顶石圈炭火+侧面火苗（v62修：不再是一圈横纹），进灯池
  36:{n:'锹', c:0x7a5b3a, tool:true},             // 大锹——工具：选中后点「挖」圈地，两点定范围只挖自然地形
  41:{n:'填', c:0x9a8f7a, tool:true},             // v64快速填充——选中后点「搭」圈地，两点定范围整体填入最后选中的方块材质
  42:{n:'梯', c:0x8a6a48, tool:true},             // v70：两点式体素折返楼梯——基点+落点，阶块可走+两侧篱笆栏杆   // v69楼梯=整体geo大件（踏步+栏杆+扶手），踏步位置另写隐形阶块保证可走，潜行拆=geo+阶块全消
  44:{n:'复制', c:0x3a6a8a, tool:true},
  /* v111农业：耕地+庄稼——村历驱动四季循环（TA：纸面上的账要在地里看得见） */
  45:{n:'耕地', tex:'farm'},
  46:{n:'麦苗', plant:'wheat_y'},
  47:{n:'麦青', plant:'wheat_g'},
  48:{n:'麦黄', plant:'wheat_r'},
  49:{n:'玉米青', plant:'corn_g'},
  50:{n:'玉米黄', plant:'corn_r'},
  51:{n:'麦茬', plant:'stubble'},
  /* v122物品实体化（TA：是真的有那些物品，不是拿木头摆个形状）——粮袋/种子袋/工具架 */
  52:{n:'粮袋', tex:'sack_grain'},
  53:{n:'种子袋', tex:'sack_seed'},
  54:{n:'工具架', tex:'tool_rack'},
  55:{n:'木板堆', tex:'board_pile'},   /* v132：村库木板实体（锯木坊产出） */
  56:{n:'布卷', tex:'cloth_roll'},   /* v132：村库布实体（织坊产出） */   /* v76cpv76：点挖圈选复制（牌子连字），点搭放预览再点确认粘贴，粘错十秒内可撤 */
  43:{n:'梯阶', tex:'stone', hidden:true},   // v69楼梯踏面（隐藏可走块——渲染无mesh自动跳过）
  37:{n:'门', mats:['wood_side','wood_side','wood_side','wood_side','door','door'], door:true, c:0x8a6a48},   // v62：两格高
  39:{n:'宅门', mats:['gate_side','gate_side','gate_top','gate_top','gate_front','gate_side'], gate:true, c:0x8d8d8a},   // v63：四格高石门楼（gate:true接gateGeo——v62实底：door:true让它误走了doorGeo）
  40:{n:'对开门', tex:'door', dgate:true, door:true, c:0x8a6a48},   // v63：四格高两扇八字微开+横楣
  /* v63 开态（点门切换）：100+类型——hidden不进物品栏，渲染走OPEN_GEO，solid放行（开着能走进去） */
  137:{n:'门开', tex:'door', openKey:37, door:true, hidden:true},
  139:{n:'宅门开', tex:'gate_side', openKey:39, gate:true, hidden:true},
  140:{n:'对开开', tex:'door', openKey:40, dgate:true, hidden:true}
};
const world=new Uint8Array(W*H*D);
const idx=(x,y,z)=>(x*D+z)*H+y;
const inW=(x,y,z)=>x>=0&&x<W&&y>=0&&y<H&&z>=0&&z<D;
const get=(x,y,z)=>inW(x,y,z)?world[idx(x,y,z)]:AIR;

/* ---- 地形：河滩 + 老柳树 ---- */
function hash(x,z){let h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h);}
function vnoise(fx,fz){   /* v57 value noise：格点hash+smoothstep插值——redblobgames地形法 */
  const xi=Math.floor(fx), zi=Math.floor(fz), xf=fx-xi, zf=fz-zi;
  const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  const a=hash(xi,zi), b=hash(xi+1,zi), c=hash(xi,zi+1), d2=hash(xi+1,zi+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d2)*u*v;
}
function fbm01(x,z){   /* v57 fBm：6 octave，redblobgames偏移采样 */
  let e=0, amp=1, norm=0;
  const OC=[[1,0,0],[2,5.3,9.1],[4,17.8,23.5],[8,3.7,11.1],[16,31.7,7.3]];   /* v57.2：砍octave32（贡献0.2%） */
  for(const [f,ox,oz] of OC){ e+=amp*vnoise(x*0.013*f+ox, z*0.013*f+oz); norm+=amp; amp*=0.5; }
  return e/1.9375;
}
function moist01(x,z){   /* v58 湿度场：4 octave低频噪声=大气候带 */
  let e=0, amp=1;
  const OC=[[1,101.7,7.3],[2,33.1,51.9],[4,7.7,13.1],[8,51.7,3.3]];
  for(const [f,ox,oz] of OC){ e+=amp*vnoise(x*0.009*f+ox, z*0.009*f+oz); amp*=0.5; }
  return e/1.875;
}
function plantTree(x,z,h,cone){   /* v58：cone=雪原针叶（窄高冠），默认阔叶 */
  const th=cone?4+Math.floor(hash(x,z)*2):3+Math.floor(hash(x,z)*2);
  for(let y=h+1;y<=h+th;y++)world[idx(x,y,z)]=5;
  const R=cone?1:2;
  for(let dx=-R;dx<=R;dx++)for(let dz2=-R;dz2<=R;dz2++)for(let dy=0;dy<=2;dy++){
    const r=Math.abs(dx)+Math.abs(dz2)+dy*(cone?1.0:1.4);
    if(r<=(cone?2.2:3.4)&&!(dx===0&&dz2===0&&dy<1)){const X=x+dx,Z=z+dz2,Y=h+th+dy-1;if(inW(X,Y,Z)&&!world[idx(X,Y,Z)])world[idx(X,Y,Z)]=6;}
  }
}
function height(x,z,e){
  // 河从东北向西南弯过去，滩地沿河
  const river=Math.sin(x*0.09)*6+Math.cos(z*0.07)*4; // 河道中心线的z偏移
  const dz=Math.abs(z-(34+river));                    // 距河中心
  let h;
  if(dz<5)      h=2+Math.round(dz*0.3);               // 河床
  else if(dz<11) h=4+Math.round((dz-5)*0.5);          // 滩
  else if(dz<=90) h=6+Math.round((dz-11)*0.35+hash(x,z)*1.6); // 岸上缓坡——v53：dz≤90严格旧式（现有搭建零错位）
  else{
    /* v57 fBm真大陆（redblobgames法）：6 octave分形噪声+pow重分布（平原多山峰陡）+噪声等值线河带（蛇形干流+支流） */
    if(e===undefined)e=fbm01(x,z);
    const er=Math.pow(Math.min(1,e*1.12),1.7);
    h=Math.round(4+er*36);
    if(Math.abs(e-0.28)<0.011)h=4;        // 干流带
    else if(Math.abs(e-0.44)<0.009)h=5;   // 支流带
  }
  if(x>=455&&x<=459&&z>=448&&z<=459)h=30;   /* 清言滩+忘言亭保形——凝固在建城那天（最后覆盖，河带不犯城） */
  return Math.max(1,Math.min(H-3,h));
}
for(let x=0;x<W;x++)for(let z=0;z<D;z++){
  const eC=(z>124)?fbm01(x,z):undefined;   /* v57.2：同列height与水灌共用一次fbm计算 */
  const h=height(x,z,eC), river=Math.sin(x*0.09)*6+Math.cos(z*0.07)*4, dz=Math.abs(z-(34+river));
  for(let y=0;y<=h;y++){
    let t;
    if(dz<5)       t=(y===h)?4:3;                       // 河底：沙面石身
    else if(dz<9)  t=(y===h)?4:2;                       // 滩：沙面土身
    else           t=(y===h)?1:(y>h-3?2:3);             // 岸：草面土石
    if(dz<7&&y===h) t=4;                                // 水边全沙
    if(y===h&&h>=34&&dz>90) t=30;                       // v57：fBm海拔34+峰顶雪
    world[idx(x,y,z)]=t;
  }
  if(h<5)for(let y=h+1;y<=5;y++)world[idx(x,y,z)]=8;    // 水位线5：低于水位的全部灌满——河心不再露底（v25修「水没填满」）
  /* v57 远域河带：河床已挖到4/5，灌到水位5——干流支流与近河同一水位 */
  if(dz>90&&h<=4){const e2=eC||fbm01(x,z);if(Math.abs(e2-0.28)<0.011||Math.abs(e2-0.44)<0.009)for(let y=h+1;y<=5;y++)world[idx(x,y,z)]=8;}
}
/* v58 生物群系：湿度场分群系，远域播植被——森林27%/草原41%/荒地/雪原/水泽；近景（dz≤90）是同志领地不动；清言滩城台亭周边一圈不长 */
for(let x=0;x<W;x++)for(let z=0;z<D;z++){
  const riv2=Math.sin(x*0.09)*6+Math.cos(z*0.07)*4, dz2=Math.abs(z-(34+riv2));
  if(dz2<=90)continue;
  if(x>=453&&x<=461&&z>=446&&z<=461)continue;   /* 城台+忘言亭+一圈：不长树 */
  const farD=Math.min(1,(dz2-90)/40);           /* 90-130格渐入 */
  let top=0;for(let y=H-2;y>=0;y--){const b=world[idx(x,y,z)];if(b&&b!==8){top=y;break;}}
  if(!top)continue;
  const h=top, ground=world[idx(x,h,z)];
  if(ground===8)continue;
  const mo=moist01(x,z), hv=hash(x,z);
  if(h>=30){                                    /* 雪原：针叶+雪斑 */
    if(hv<0.010*farD)plantTree(x,z,h,true);
    else if(hv<0.30*farD&&ground===1)world[idx(x,h,z)]=30;
    continue;
  }
  if(h<10&&world[idx(x,h-1,z)]===8){            /* 水泽：顶格下方是水=真水岸 */
    if(hv<0.12*farD){world[idx(x,h+1,z)]=17;world[idx(x,h+2,z)]=17;}
    continue;
  }
  if(ground!==1)continue;                       /* 只长在草皮上（河床沙/雪顶跳过） */
  if(mo>0.55){                                  /* 森林：密树+林下花 */
    if(hv<0.055*farD)plantTree(x,z,h,false);
    else if(hv<0.062*farD)world[idx(x,h+1,z)]=(hv*10000%1<0.5)?15:16;
  }else if(mo>0.36){                            /* 草原：草+花点缀 */
    if(hv<0.040*farD)world[idx(x,h+1,z)]=17;
    else if(hv<0.052*farD)world[idx(x,h+1,z)]=(hv*10000%1<0.5)?15:16;
  }else{                                        /* 荒地：沙斑+孤树 */
    if(hv<0.16*farD)world[idx(x,h,z)]=4;
    else if(hv<0.164*farD)plantTree(x,z,h,false);
  }
}
// 老柳树：岸上几棵
const trees=[[12,12],[20,50],[44,10],[50,44],[30,58],[8,40],[52,26],[68,38],[96,56]];   // v39：新区东西滩各添一棵
trees.forEach(([tx,tz])=>{
  const h=height(tx,tz); if(h<5)return;
  const th=3+Math.floor(hash(tx,tz)*2);
  for(let y=h+1;y<=h+th;y++)world[idx(tx,y,tz)]=5;      // 干
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<=2;dy++){
    const r=Math.abs(dx)+Math.abs(dz)+dy*1.4;
    if(r<=3.4&&!(dx===0&&dz===0&&dy<1)){const X=tx+dx,Z=tz+dz,Y=h+th+dy-1;if(inW(X,Y,Z)&&!world[idx(X,Y,Z)])world[idx(X,Y,Z)]=6;}
  }
});
// 碑：出生点旁
try{document.getElementById('verTag').textContent=VER+' · 想搭什么搭什么';}catch(e){}
const STX=42,STZ=18;   // v50.6：碑从(38,22)挪到(42,18)广场东北——原位在桥轴线正中挡视线（同志提的）；spawn=(42.5,16.5)平砖上
{const h=height(STX,STZ);
 world[idx(STX,h+1,STZ)]=3;world[idx(STX,h+2,STZ)]=3;world[idx(STX-1,h+1,STZ)]=3;world[idx(STX+1,h+1,STZ)]=3;}

/* ---- 存档（diff） ---- */
const SKEY='hetan_save_v1';
let dayActs={put:0,dig:0,talk:0,d:0};   /* v88.1：今日动作账（全局——saveDiff计，心跳报云端，判定者读。v88.1雷：原插在saveDiff函数体内=TDZ炸「Cannot access before initialization」，村民系统全断——TA截图实锤） */
let diffs={r:[],a:{}};
try{const s=localStorage.getItem(SKEY);if(s)diffs=JSON.parse(s);}catch(e){}
let worldDirty=false;   // 存量的搭也上云（声明必须在最前——v14的TDZ死法）
if(diffs.r.length||Object.keys(diffs.a).length)worldDirty=true;
diffs.r.forEach(([x,y,z])=>{if(inW(x,y,z))world[idx(x,y,z)]=AIR;});
for(const k in diffs.a){const[x,y,z]=k.split(',').map(Number);if(inW(x,y,z))world[idx(x,y,z)]=diffs.a[k];}
function saveDiff(x,y,z,t){
  const key=x+','+y+','+z;
  if(t===AIR)dayActs.dig++;else dayActs.put++;
  if(t===AIR){if(!diffs.r.some(p=>p[0]===x&&p[1]===y&&p[2]===z))diffs.r.push([x,y,z]);delete diffs.a[key];}
  else{diffs.a[key]=t;diffs.r=diffs.r.filter(p=>!(p[0]===x&&p[1]===y&&p[2]===z));}
  try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}
  worldDirty=true;   // 搭的东西要上云——别人也看得到
}

/* ---- 世界共享：diffs上云（伊卡洛斯的花台只在它自己的浏览器里——共享机制补上，搭一次全看得见） ---- */
let worldSha=null,worldBusy=false,pushFail=0,lastPushT=0;   // v50.2：最近一次成功推送的时刻——拉取的刹车
function remoteDiffs(data){
  // 兼容两种格式：{diffs:{r,a}}（伊卡洛斯的花台用的）和{cells:{k:{t,v}}}（初版）
  const r=[],a={};
  if(data&&data.diffs){
    (data.diffs.r||[]).forEach(p=>{if(Array.isArray(p))r.push(p);});
    Object.assign(a,data.diffs.a||{});
  }
  if(data&&data.cells){
    for(const k in data.cells){
      const v=data.cells[k].v;
      if(v===0){const[x,y,z]=k.split(',').map(Number);if(!r.some(p=>p[0]===x&&p[1]===y&&p[2]===z))r.push([x,y,z]);}
      else a[k]=v;
    }
  }
  return {r:r,a:a};
}
function pushWorld(){
  if(!NPC_TOKEN||worldBusy||!worldDirty)return;
  worldBusy=true;
  const local={};   // v22：直接从diffs构造（localCells是昨天埋的雷——调用了一个不存在的函数，推送必炸）
  diffs.r.forEach(([x,y,z])=>{local[x+','+y+','+z]={v:0};});
  for(const k in diffs.a)local[k]={v:diffs.a[k]};
  const snapR=diffs.r.map(p=>p.slice());          // v43：本次推送的快照——成功后只清这些
  const snapA=Object.assign({},diffs.a);          // GET/PUT窗口内（1-2秒）TA还在搭的新操作不在快照里，不能跟着清
  ghGet('world.json').then(({sha,data})=>{
    if(!sha){worldBusy=false;syncErr=apiStat;refreshMenu();return;}   // v34：够不着云端的原因写抽屉——以前静默return，同志334格卡着什么都看不到
    const rd=remoteDiffs(data);
    const a=Object.assign({},rd.a), r=rd.r.slice();
    for(const k in local){
      const v=local[k].v;
      const[x,y,z]=k.split(',').map(Number);
      if(v===0){if(!r.some(p=>p[0]===x&&p[1]===y&&p[2]===z))r.push([x,y,z]);delete a[k];}
      else{a[k]=v;const ri=r.findIndex(p=>p[0]===x&&p[1]===y&&p[2]===z);if(ri>=0)r.splice(ri,1);}
    }
    return ghPut('world.json',{diffs:{r:r,a:a}},sha,'河滩：'+ME.name+'动了'+Object.keys(local).length+'格')   // v35：用ghGet刚拿到的sha——worldSha从v22起就是没赋过值的死变量，PUT永远不带sha，对已有world.json一律422
      .then(()=>{
        worldBusy=false;worldCells=Object.keys(a).length;
        lastPushT=Date.now();   // v50.2：推完记时刻——GitHub对刚写完的文件读缓存约2分钟，这段时间拉到的是旧的，不能让它刷画面
        try{localStorage.setItem('hetan_cells',String(worldCells));}catch(e){}   // v50.3：记住云端应有的格数——重进拉到旧缓存时对账用
        /* v50.5 真根修复：v43构造了快照（snapR/snapA）却清了整个diffs——GET/PUT窗口（1-3秒）内同志新放的格被整批蒸发，连localStorage都清了，永不上云。
           现在只清「快照里且没有被新改动」的部分，窗口内的新搭保留等下轮推送 */
        Object.keys(snapA).forEach(k=>{if(diffs.a[k]===snapA[k])delete diffs.a[k];});   // 值没变的=已推走，清；被新改过的=留着
        const snapRK={};
        snapR.forEach(p=>{snapRK[p[0]+','+p[1]+','+p[2]]=1;});
        diffs.r=diffs.r.filter(p=>{const k=p[0]+','+p[1]+','+p[2];return !(snapRK[k]&&!diffs.a[k]&&!diffs.r.some(q=>q!==p&&q[0]===p[0]&&q[1]===p[1]&&q[2]===p[2]));});   // 快照里的删除记录且格仍空=已推走，清；有新变化=留
        worldDirty=!!(Object.keys(diffs.a).length||diffs.r.length);   // 有残留（窗口内新搭）→保持dirty下轮接着推
        if(worldDirty){try{localStorage.setItem(SKEY,JSON.stringify(diffs));}catch(e){}toast('还有新搭的在队列，马上再传');}
        else{try{localStorage.removeItem(SKEY);}catch(e){}}
        pushFail=0;syncErr='';refreshMenu();toast('搭建已上云 · 谁打开都能看到');
      });
  }).catch(err=>{
    worldBusy=false;   // v35：PUT失败不再静默——422是版本冲突（下轮ghGet拿新sha自动重试），403是令牌只有读权限
    syncErr='推不动('+(err&&err.message?err.message:'网络')+')';
    refreshMenu();
  });
}
let worldPulled=false,worldCells=0;
function pullWorld(attempt){
  attempt=attempt||0;
  if(Date.now()-lastPushT<60000)return Promise.resolve(0);   // v50.2推后刹车（v50.4加cb后缓存已绕开，留60秒防抖）；v50.2原2分钟
  return ghGet('world.json').then(({data})=>{
    worldPulled=true;taA=null;   /* v100：TA建筑集重算（首次进页diffs可能还空） */
    const rd=remoteDiffs(data);
    worldCells=Math.max(worldCells,rd.r.length+Object.keys(rd.a).length);   // v50.2：取max——缓存旧版格数偏少，别让计数倒退
    /* v50.2：本地还没推上去的改动是权威——diffs里的格一律不被云端数据覆盖（推前防刷，和推后刹车配对） */
    const pending={};
    diffs.r.forEach(pp=>{pending[pp[0]+','+pp[1]+','+pp[2]]=1;});
    for(const kk in diffs.a)pending[kk]=1;
    let n=0;
    rd.r.forEach(p=>{const[x,y,z]=p;if(inW(x,y,z)&&!pending[x+','+y+','+z]&&world[idx(x,y,z)]!==AIR){world[idx(x,y,z)]=AIR;n++;}});
    for(const k in rd.a){if(pending[k])continue;const[x,y,z]=k.split(',').map(Number);if(inW(x,y,z)&&world[idx(x,y,z)]!==rd.a[k]){world[idx(x,y,z)]=rd.a[k];n++;}}
    if(n)rebuild();
    /* v50.3：重进对账——上次推送成功的格数记在localStorage，拉回来的明显偏少=撞上读缓存旧版，15秒后再拉（重进「只剩残的」的根） */
    try{
      var rc=parseInt(localStorage.getItem('hetan_cells')||'0',10);
      var cur=rd.r.length+Object.keys(rd.a).length;
      if(rc>10&&cur<rc-5&&attempt<20){
        toast('云端还在补齐刚才的搭建……');
        return new Promise(function(res){setTimeout(function(){res(pullWorld(attempt+1));},15000);});
      }
    }catch(e){}
    return n;
  }).catch(()=>{
    if(attempt<5){setTimeout(()=>pullWorld(attempt+1),(attempt+1)*5000);return 0;}   // 够不着就等会儿再够——花台最终必达
    return 0;
  });
}

/* ================= 来客NPC =================
   配了令牌的来客（和《家里都好》同一个令牌）在河滩上留一个NPC：
   在线时是本人（别人能看到你走动），走了之后NPC留在滩上，
   按自己的性子（seed）继续走动——确定性漫游，所有在线的人算出同一个位置。
   没配令牌就是路过，不留下。 */
const NPCS_URL='npcs.json';
const NAMES=['建军','卫国','秀兰','长贵','水生','爱香','拴柱','玉梅','根生','大妮','来福','秋生','凤兰','满仓','银锁','石头'];
const SKIN=['#e8c39e','#d9a97c','#c69066'];
const COATS=['#5a7a8c','#7a5a4a','#4a6a52','#8c6a4a','#6a5a7a','#8c4a4a','#5a6a6a','#7a7a4a'];
let ME=null,NPC_TOKEN=null;
try{NPC_TOKEN=localStorage.getItem('jldh_token');}catch(e){}
let meClaimed=true;   /* v46：身份稳定标志。改名认领期间置false——心跳等认领落定再上云，免得临时名又造一具身体 */
function meInit(){
  try{
    const s=localStorage.getItem('hetan_me');
    if(s){ME=JSON.parse(s);return;}
  }catch(e){}
  const id='p_'+Math.random().toString(36).slice(2,8);
  const seed=Math.floor(Math.random()*99991);
  ME={id, name:NAMES[seed%NAMES.length], seed,
      coat:COATS[seed%COATS.length], skin:SKIN[(seed>>3)%SKIN.length],
      home:[Math.max(4,Math.min(W-5,STX+((seed%11)-5))), Math.max(4,Math.min(D-5,STZ+4+((seed>>2)%7)))]};
  try{localStorage.setItem('hetan_me',JSON.stringify(ME));}catch(e){}
}
/* v46认领：改名=「我是叫这个名字的人」。云端有同名身体（上次的自己），就接着那具走——
   认领最近还在走的那具（名字不变——名字即存档；换的是身体）。刚造的临时身体吸收撤下。一名字一身体。 */
function claimBody(){
  if(!NPC_TOKEN)return Promise.resolve();
  const oldId=ME.id;
  return ghGet(NPCS_URL).then(({sha,data})=>{
    npcs=(data&&data.npcs)||{};   /* v140：填全局村民账 */
    const same=Object.values(npcs).filter(n=>n.name===ME.name&&n.id!==ME.id)
      .sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0));
    if(!same.length)return;
    const c=same[0];
    ME.id=c.id;ME.seed=c.seed;ME.coat=c.coat;ME.skin=c.skin;ME.home=c.home;
    try{localStorage.setItem('hetan_me',JSON.stringify(ME));}catch(e){}
    delete npcs[oldId];                  // 认领了正式身体，临时这具撤下
    Object.values(npcs).forEach(n=>{if(n.name===ME.name&&n.id!==ME.id)delete npcs[n.id];});   // 剩下的同名幽灵吸收——一名字一身体
    if(npcs[ME.id])npcs[ME.id].lastSeen=Date.now();   /* 体检修：认领即刷存活——心跳窗口内关页不被40具清理误删 */
    npcList=Object.values(npcs);
    return ghPut(NPCS_URL,{npcs:npcs},sha).then(()=>{npcLastPut=Date.now();npcLastPutPos=[p.x,p.z];});
  }).catch(()=>{});
}
function ghHeaders(){return{'Authorization':'bearer '+NPC_TOKEN,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'hetan-guest'};}
/* 读：有令牌走API（实时）；没令牌走同源（github.io Pages，和页面同一条网络路，访客必达）
   同源副本有部署延迟（几分钟），写后自动触发重建 */
const VER='v143';   /* v122物品实体化（TA：经营三角搞起来/是真的有那些物品不是拿木头摆个形状/种地得有种子得有锄头/田也太小了）：①田扩大12×8→18×14（252格/村×2村=504，搜索半径16-56；铺设尺寸漏改12×8修——搜索找到了大地只铺小田）②三个物品方块：52粮袋（公仓码放=村库粮/100，tickCunKuBags动态同步替换v120假粮堆49）、53种子袋（播种窗口田角出现，种子0则荒田）、54工具架（两村田角常驻——农具实体）③农事账（judge_build）：播玉米day123扣种子2/播冬麦240扣2/麦收122+760粮+2种/秋收239+800粮+2种——种子守恒循环验过，首日只记锚不跑事件（否则开村白得1560粮）；年净粮+1200④minds营生段：农时FARM_TIP+种子份数进判定者prompt——宁可少建也要留种  */   /* v121三修（TA：公仓没找到两个村都有吗/地图标名字/NPC看不见坑往下走/树挡路不清）：①两村各一公仓——campCenter旁探位（向西找5×3可落地）各落一仓+门口「公仓」名字牌（画布牌本地mesh），村长守北岸仓报全村账②NPC避坑——safetySpot外环16格判据：≥6块地面比目标高2+=坑里/坑沿→螺旋挪平地（一跳邻查不出大坑——坑底的邻格也在坑里；缓坡/崖顶不误伤）③路网扫树日切——本列有树干5号且本列/4邻列有路面11号=挡路树→整列伐+半径2树冠全清（纵向找树干——surfaceY是树冠顶靠它判定会漏；从y1清会被土层break）  */   /* v119经营层——村库+第一根因果链（TA：像玩经营建造游戏一样发展，根儿没有）：①村库=memory.cunKu（钱30粮120木60石50起步），judge_build过账扣库（客户端executeJudgePlans校验是主防线同批本地扣，服务器兜底防透支归零）；价目：凉亭木12石6/水井石15木4/灯柱石4/石凳石3/铁匠铺木30石20钱15；进项每天木+2石+1粮+3（lastDay防重）②第一根因果链：铁匠铺（蓝图石基3×3+四柱+顶板+炉砧）落成日smithyDay写memory+localStorage，villagerProgress只加速落成日之后的晴天spd×1.3——历史不改写（沙箱210==210）③稀缺验出：两座铁匠铺掏空村库第三座三项全缺——「想建建不起」从第一笔账开始；判定者prompt经营段（你是管村库的人——每笔工都扣库，库见底村子停摆，先建有用的不够就攒）  */   /* 真桥：桥面悬空+每3格桥墩+桥身中空——TA：桥不是实心墙 */   /* 路遇深坑架桥+桥下填实（TA：路在坑底掉下去了）；groundY可站路桥；宅基中位数坐地 */   /* 清树冠残留：渲染层贴真地面+全量重铺+集场清树 */   /* 路面20(path卡人)全线换11石砖；旧20格每日自动升级 */   /* groundY真地形层：路/地基/台阶贴地不再被树冠骗，树整列伐 */   /* 村民自己修路：迁入前8日户主修门前线，路通→立工地→成建筑 */   /* 路修对层+双宽连续+避让TA建筑+伐树；宅基九点坐地；地基柱+真楼梯 */   /* 街网入户+宅基坐地+封顶修台阶 */   /* 集市：逢五逢十开集，北岸街心六摊 */   /* 村历系统：360日历/节气/宜忌/村志木牌/天气挂季节 */   /* 房放大量级+10格宅地+4倍速+21户扩村 */   /* v93安全网保留+v94气泡选项+v95围裙/hold */   /* v90：生活痕迹——①夜里真进屋（act=inside，渲染层隐身，天亮从门口出来——不再站房顶：home点从房正中改门前，门口=plot+2.5,plot-0.8，门在z=0面）②fire1/fire2根治（VH.camps从未赋值——永远兜到v50老坐标=中午消失的真根；改camp聚集点=同camp各家plot均值，惰性算永不落空）③坐姿（lunch/dusk蹲坐）④脚步铺路（TA原话期望：环境感知之后村民自己觉得没路不方便——判定者据路况快照排road段，村民走到路上脚下实时铺路砖id20，走一段铺一段，diffs通道上云，villCells登记防拆） */   /* v89：村民开腔——预排的话变头顶气泡（走近chat段村民，4秒轮换说「村里的话」）；直接对话跟活人走（nearVillName从宅地改村民mesh位置）；判定者可排对同志的话 */   /* v88：判定者开眼（环境快照：天气/施工进度/同志动向进prompt）+关系图谱（婚配/两村/见外）+生理节奏行程+村志无事不书+对话走远自动收 */   /* v87：宅地重选散开（互距≥30贴水避TA建筑）+spd22（day7全村成型）——TA：建筑太近+发展太慢 */   /* v86：TA点死穴「对建筑尺寸不了解」——按MC尺寸学重写全部蓝图：基座满铺（不悬空）、墙高3（层高够人）、双坡顶（脊+两坡，不是平秃包）、门洞2格高。程序河另加 */   /* v85.1：v84埋的雷全拔——home是v50老坐标（村民夜里回荒野）、river指向310格外老河（改找真水，缓存）、井进行程点（well）、动物从老地图迁村（鸡村口鸭村边水狗打谷场）、小孩串成追圈 */   /* v85：资料驱动——MC村庄结构学（8种小屋变体+街道拼图+水井）+村民AI（注视玩家+聚集交谈）。蓝图扩5种/村区街道+打谷场+水井/v4迁移重铺 */   /* v84：判定者排行程——AI从写心事进到排村民一天的身体。村民按villagers_memory.sched在村里走动（home/plot/fire/river），说话的两户真的站在一起，夜里回家 */   /* v83：看名牌按「挖」=开对话——名牌不是世界方块，DDA raycast够不着它，单独对mesh求交。同志两天报「看不到对话选项」的产品缝：入口要长在TA最熟的交互上 */   /* v82：村民名牌不等封顶——宅地激活即立（蓝图牌格在门口地面）；牌走vill_系统，铺格跳过27避免双牌重叠。同志「没有门牌」的修法 */   /* v81意识层：九户每天有心事（villager_minds.py生成，boot自动dispatch）+对话modal显示「今天他在想」+「今天村里」；答话带记忆跨天持久（villagers_memory.json mem） */   /* v80对话talk80：靠近村民宅地「说」→talk_queue.json→talk-reply workflow（GLM按九户人设答话）→replies.json→前端轮询。村里人想好了才答（异步1-2分钟）。答话归判定者，婚育骨架它改不了 */   /* hotfix：雨天进度归零bug（TA凌晨实测抓到）——进度纯确定化，雨天停工改为人不出工 */   /* v79村志chron：点村心火塘翻阅《河滩村志》，判定者（GLM）每日执笔一章（Actions写chronicle.json） */   /* v78人口繁育kin78：婚配表+出生表全预计算（villagers.json v3），婚礼红花喜牌，孩子出生（小体型绕火塘）+一天当一岁成年分家；婚期/孕期/名字全hash命定 */   /* v77居民安家vil77：九户村民晴日进度盖房（确定性f(种子,时间)），宅地保护，名牌，施工日程 */   /* fBm真大陆+boot自救 */   /* v50.6竖排NaN修+半格上阶；v51潜行（贴边不掉+潜行点拆床牌，双点退役） */   // v50：床（=出生点）柜幌石凳牌+招牌题字（signs.json）+物品栏wrap两行+出生点北移上平砖
try{document.getElementById('bootVer').textContent=VER;}catch(e){}
try{document.getElementById('menuVer').textContent=VER;}catch(e){}

/* 抽屉：点☰展开，点外收起。顶栏从此只有三样：河滩、时辰、☰ */
function refreshMenu(){
  try{
    document.getElementById('mWorld').textContent=worldCells+'格';
    document.getElementById('mName').textContent=ME?ME.name:'客';
    const local=diffs.r.length+Object.keys(diffs.a).length;
    document.getElementById('mSync').textContent=worldDirty?(local+'格待传'+(syncErr?' · 卡':'')):(syncErr?'异常 · '+syncErr.slice(0,10):'已同步');
    document.getElementById('mBoard').textContent=boardOffline?'够不着':'已连';
    document.getElementById('mTok').textContent=NPC_TOKEN?'已配 · 点换':'没配';
    document.getElementById('mMute').textContent=AU.muted?'♪̶ 关':'♪ 开';
  }catch(e){}
}
document.getElementById('menuBtn').onclick=e=>{
  e.stopPropagation();
  const p=document.getElementById('menuPanel');
  p.classList.toggle('on');
  if(p.classList.contains('on'))refreshMenu();
};
document.getElementById('menuClose').onclick=()=>document.getElementById('menuPanel').classList.remove('on');
document.getElementById('mName').onclick=()=>{document.getElementById('menuPanel').classList.remove('on');document.getElementById('nameBtn').click();};
document.getElementById('mTok').onclick=()=>{document.getElementById('menuPanel').classList.remove('on');document.getElementById('tokBtn2').click();};
document.getElementById('mExp').onclick=()=>{document.getElementById('menuPanel').classList.remove('on');const b=document.getElementById('expBtn');if(b)b.click();};
document.getElementById('mMute').onclick=()=>{const m=AU.toggleMute();refreshMenu();};
document.getElementById('mSync').onclick=syncDiag;   // v34：同步行点了出诊断——卡在哪一步直接说
/* v36 搬牌子：点「搬」进入搬运模式，牌子跟着你走；再点「放下」落定并上云——位置存board.json，谁打开都在你放的地方 */
document.getElementById('mMove').onclick=function(){
  if(boardBusySave){toast('上一块还没钉稳，等等');return;}
  if(moveMode){moveMode=false;this.textContent='搬 · 点了跟着你';saveBoardPos();return;}
  moveMode=true;this.textContent='放下 · 到这儿就行';
  toast('牌子跟着你了——走到想放的地方，再点这里放下');
};
function topY(x,z){for(let y=H-1;y>=0;y--){const b=get(x,y,z);if(b!==AIR&&b!==8)return y+1;}return 6;}   // v37：含搭建物的实际顶面——height()只看地形，牌子在同志的砖上会沉地
function tickBoardMove(){
  if(!moveMode||!boardGroup)return;
  const bx=Math.floor(p.x+Math.sin(p.yaw)*2.5),bz=Math.floor(p.z+Math.cos(p.yaw)*2.5);
  boardGroup.position.set(bx+0.5,topY(bx,bz)+0.02,bz+0.5);
  boardGroup.rotation.y=p.yaw+Math.PI;
}
function saveBoardPos(){
  if(boardBusySave)return;boardBusySave=true;
  const bx=Math.floor(p.x+Math.sin(p.yaw)*2.5),bz=Math.floor(p.z+Math.cos(p.yaw)*2.5);
  ghGet('board.json').then(({sha,data})=>{
    const m=(data&&data.msgs)||[];
    return ghPut('board.json',{msgs:m,boardPos:[bx,bz]},sha,'河滩：牌子挪到'+bx+','+bz).then(()=>{
      boardBusySave=false;
      BOARD_POS[0]=bx+0.5;BOARD_POS[2]=bz+0.5;
      boardGroup.position.set(bx+0.5,topY(bx,bz)+0.02,bz+0.5);
      toast('牌子钉好了——谁打开都在这儿');
      refreshMenu();
    });
  }).catch(()=>{boardBusySave=false;toast('没钉上——网络抖了，再点一次放下');});
}
document.addEventListener('click',e=>{
  const p=document.getElementById('menuPanel');
  if(p.classList.contains('on')&&!p.contains(e.target)&&e.target.id!=='menuBtn')p.classList.remove('on');
});

let rawMode=false,syncErr='';
function ghSame(path){
  return ghFetch(path+'?cb='+Date.now())
    .then(r=>{
      if(r.status===404)return {sha:null,data:{npcs:{},msgs:[]}};   // 真空板
      if(!r.ok)throw new Error('same get '+r.status);
      return r.text();
    })
    .then(t=>typeof t==='string'?{sha:null,data:JSON.parse(t)}:t);
}
/* 读世界数据：实时通道优先，断了自动换同源兜底（Pages副本——能打开页面就够得着）
   v34：apiStat记录通道状态——pushWorld的失败以前全是静默的，同志334格待传卡着什么都看不见 */
let apiStat='';
function ghGet(path){
  if(!NPC_TOKEN||rawMode){
    rawMode=true;apiStat='同源模式（无令牌或令牌失效）';
    return ghSame(path);
  }
  return ghFetch('https://api.github.com/repos/inklotus007/hetan/contents/'+path+'?cb='+Date.now(),{headers:ghHeaders()})   // v50.4：cb时间戳绕读缓存——之前推完2分钟内GET拿的是旧文件（缓存按URL命中），pullWorld拿旧世界刷掉刚搭的
    .then(r=>{
      if(r.status===404){apiStat='404——GitHub把hetan装作不存在，多半是令牌没勾hetan仓库';return {sha:null, data:{npcs:{},msgs:[]}};}
      if(!r.ok){apiStat='HTTP '+r.status;throw new Error('get '+r.status);}
      apiStat='通';
      return r.json();
    })
    .then(m=>{
      if(m.sha===undefined&&m.data)return m;        // 已是容错结构
      const data=m.content?JSON.parse(decodeURIComponent(escape(atob(m.content.replace(/\n/g,''))))):{npcs:{},msgs:[]};
      return {sha:m.sha||null, data:(data&&typeof data==='object')?data:{npcs:{},msgs:[]}};   /* v52.4：白名单npcs/msgs/diffs漏了portals/schedules——新数据层JSON对象一律放行（API通道解析吞数据，游客同源通道没这bug，同志报「门都不显示」的根） */
    })
    .catch(()=>{if(!apiStat||apiStat==='通')apiStat='不通·超时或被拒';return ghSame(path);});
}
function syncDiag(){
  const why={
    '404——GitHub把hetan装作不存在，多半是令牌没勾hetan仓库':'fine-grained令牌建的时候只勾了别的仓库，GitHub对没授权的仓库一律装作不存在（404）。重建：GitHub→Settings→Developer settings→Fine-grained tokens，Repository access选上jialiandouhao和hetan两个，Permissions→Contents→Read and write',
    '同源模式（无令牌或令牌失效）':'令牌没贴上或贴的时候空了。点抽屉「令牌」重新贴',
    'HTTP 401':'令牌被GitHub拒了——多半是复制不全、过期、或已被撤销。去GitHub重新生成一把，重新贴',
    'HTTP 403':'令牌权限不够——Contents权限要选Read and write',
    '推不动(put 422)':'版本冲突——云端刚好被另一边改过，下个周期自动重试，不用管',
    '推不动(put 403)':'令牌只有读权限——重建令牌时Contents要选Read and write',
    '推不动(put 401)':'令牌被拒——重新生成一把',
    '不通·超时或被拒':'API通道到不了GitHub——网络问题或令牌被拒。留言板「已连」只证明公开通道通，不代表API通'
  }[apiStat]||'API状态：'+(apiStat||'还没测——搭一格东西再等几秒回来看');
  showStele('同步诊断\n'+(apiStat||'还没测')+'\n\n'+why);
}
function ghPut(path,obj,sha,msg){
  const body={message:msg||('NPC：'+ME.name), content:btoa(unescape(encodeURIComponent(JSON.stringify(obj))))};
  if(sha)body.sha=sha;
  return fetch('https://api.github.com/repos/inklotus007/hetan/contents/'+path,{
    method:'PUT',headers:ghHeaders(),body:JSON.stringify(body)
  }).then(r=>{if(!r.ok)throw new Error('put '+r.status);return r.json();})
  .then(j=>{
    // 触发Pages重建，让没令牌的访客几分钟内在同源副本上看到
    fetch('https://api.github.com/repos/inklotus007/hetan/pages/builds',{method:'POST',headers:ghHeaders()}).catch(()=>{});
    return j;
  });
}
/* ================= 留言板（3D实体+纸片+云端） ================= */
let boardGroup=null,boardPapers=[];
let boardMsgs=[];   // {id,name,text,t}
const BOARD_POS=[STX+0.5,0,STZ+1];   // 默认位置——v36起可搬：位置存在board.json的boardPos，所有端共享
let moveMode=false,boardBusySave=false;
function paperTexture(msg){
  const cv=document.createElement('canvas');cv.width=128;cv.height=160;
  const g=cv.getContext('2d');
  g.fillStyle='#f0e6cc';g.fillRect(0,0,128,160);
  g.strokeStyle='#c9b98f';g.lineWidth=2;g.strokeRect(3,3,122,154);
  g.fillStyle='#8a5a3a';g.font='bold 15px Songti SC,serif';g.fillText(msg.name,10,24);
  g.fillStyle='#a09478';g.font='10px Georgia,serif';
  const dt=new Date(msg.t||Date.now());
  g.fillText((dt.getMonth()+1)+'/'+dt.getDate(),92,24);
  g.fillStyle='#3a2f1e';g.font='13px Songti SC,serif';
  const text=msg.text||'';
  for(let i=0;i*6<text.length&&i<5;i++)g.fillText(text.slice(i*6,i*6+6),10,48+i*22);
  if(text.length>30)g.fillText('……',10,48+5*22);
  return new THREE.CanvasTexture(cv);
}
function ensureBoard(){
  if(boardGroup)return;
  boardGroup=new THREE.Group();
  const woodM=new THREE.MeshLambertMaterial({color:0x6a4f35});
  const postM=new THREE.MeshLambertMaterial({color:0x54402a});
  // 两根柱
  [-1.05,1.05].forEach(dx=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,2.3,0.14),postM);
    post.position.set(dx,1.15,0);boardGroup.add(post);
  });
  // 背板
  const back=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.4,0.08),woodM);
  back.position.set(0,1.62,0.03);boardGroup.add(back);
  // 檐
  const roof=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.09,0.4),postM);
  roof.position.set(0,2.4,0.05);roof.rotation.x=-0.12;boardGroup.add(roof);
  // 顶牌
  const sign=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.3,0.06),woodM);
  sign.position.set(0,2.62,0.08);boardGroup.add(sign);
  // 9张纸（3x3）
  for(let i=0;i<9;i++){
    const p=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.78),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(paperTexture({name:'',text:''})),transparent:true}));
    p.position.set(-0.72+(i%3)*0.72,1.92-Math.floor(i/3)*0.55,0.1);
    p.rotation.z=(Math.random()-0.5)*0.06;
    p.userData.baseZ=p.rotation.z;p.userData.i=i;
    boardGroup.add(p);boardPapers.push(p);
  }
  boardGroup.position.set(BOARD_POS[0],topY(Math.floor(BOARD_POS[0]),Math.floor(BOARD_POS[2]))+0.02,BOARD_POS[2]);   // 钉在生成地形的地表——diffs挖不动它站的地方
  boardGroup.rotation.y=Math.PI+0.18;   // 纸面朝北——朝人来的方向；微侧，像随手立的
  scene.add(boardGroup);
}
function renderBoard(){
  const shown=boardMsgs.length?boardMsgs:[{name:'',text:boardOffline?'（这会儿够不着板子。等一下再开。）':'（这片纸上还没有字。）',t:Date.now()}];
  boardPapers.forEach((p,i)=>{
    const msg=shown[shown.length-1-i];   // 最新在右上
    if(msg){
      const old=p.material.map;p.material.map=paperTexture(msg);p.material.needsUpdate=true;
      if(old)old.dispose();
      p.visible=true;
    }else p.visible=false;
  });
  const ul=document.getElementById('boardList');
  ul.innerHTML=boardMsgs.slice().reverse().map(m=>{
    const dt=new Date(m.t||Date.now());
    return '<div class="bMsg"><span class="bn">'+m.name+'</span>'+m.text.replace(/</g,'&lt;')+'<span class="bt">'+(dt.getMonth()+1)+'/'+dt.getDate()+'</span></div>';
  }).join('')||'<div class="bMsg" style="color:#a09478">板上还没有字。头一张纸给你留着的。</div>';
}
function boardWind(t){
  if(!boardGroup)return;
  boardPapers.forEach((p,i)=>{p.rotation.z=p.userData.baseZ+Math.sin(t*1.7+i*2.1)*0.035;});
}
let boardSha=null;
let boardOffline=false;
function diag(){
  const p=document.getElementById('menuPanel');
  if(p&&p.classList.contains('on'))refreshMenu();   // 顶栏诊断条删了——数据收进抽屉，开着才刷新
}
function syncBoard(){
  ghGet('board.json').then(({sha,data})=>{
    boardOffline=false;boardSha=sha;
    if(data&&data.msgs&&Array.isArray(data.msgs)){
      if(data.msgs.length>=boardMsgs.length||!boardMsgs.length)boardMsgs=data.msgs;  // 防竞态回退
      try{localStorage.setItem('hetan_board_cache',JSON.stringify(boardMsgs));}catch(e){}
      renderBoard();
    }
    if(data&&data.boardPos&&Array.isArray(data.boardPos)&&!moveMode&&boardGroup){   // v36：牌子的位置跟云端走
      const[bx,bz]=data.boardPos;
      if(Math.abs(boardGroup.position.x-(bx+0.5))>0.1||Math.abs(boardGroup.position.z-(bz+0.5))>0.1){
        BOARD_POS[0]=bx+0.5;BOARD_POS[2]=bz+0.5;
        boardGroup.position.set(bx+0.5,height(bx,bz)+1,bz+0.5);
      }
    }
  }).catch(()=>{
    boardOffline=true;   // 够不着板子：缓存里上次看到的还在，别把空当没有
    if(document.getElementById('boardUI').classList.contains('on'))renderBoard();
  });
}
/* 上次看到的板：读失败时先显示缓存，别让板空着 */
try{const bc=localStorage.getItem('hetan_board_cache');if(bc){const j=JSON.parse(bc);if(Array.isArray(j)&&j.length)boardMsgs=j;}}catch(e){}
/* 草稿：输入框里的字永不丢 */
try{const dr=localStorage.getItem('hetan_draft');if(dr)document.getElementById('boardIn').value=dr;}catch(e){}
document.getElementById('boardIn').addEventListener('input',e=>{
  try{localStorage.setItem('hetan_draft',e.target.value);}catch(err){}
});
/* 改名字：留言署名+河滩NPC一起变。v46：改名先认领——云端有同名身体就接着它走（换了设备回来，身体还是那具） */
document.getElementById('nameBtn').onclick=()=>{
  miniPrompt('在河滩上叫什么（六个字以内）','',ME.name,v=>{
    ME.name=v.slice(0,6);localStorage.setItem('hetan_me',JSON.stringify(ME));
    document.getElementById('boardTip').textContent='名字改好了——滩上的你也是这个名字。';
    if(!NPC_TOKEN)return;
    meClaimed=false;
    claimBody().then(()=>{meClaimed=true;syncNPCs();});   // 认领落定再让心跳上云
  });
};
/* 小输入弹层：贴令牌/改名字共用（不依赖prompt，微信里也不拦） */
function miniPrompt(title, ph, val, cb){
  const old=document.getElementById('miniUI');if(old)old.remove();
  const d=document.createElement('div');d.id='miniUI';
  d.style.cssText='position:fixed;inset:0;background:rgba(20,16,8,.55);z-index:30;display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML='<div style="background:#f3ecd8;color:#3a2f1e;max-width:340px;width:100%;border:1px solid #d8caa4;box-shadow:0 8px 40px rgba(0,0,0,.4)">'+
    '<div style="padding:10px 14px;border-bottom:1px solid #d8caa4;font-size:13px;letter-spacing:2px;color:#8a7448">'+title+'</div>'+
    '<div style="padding:12px 14px"><input id="miniIn" placeholder="'+ph+'" value="'+(val||'')+'" style="width:100%;padding:8px;background:#faf6ea;border:1px solid #d0c29c;color:#3a2f1e;font-family:inherit;font-size:13px">'+
    '<div style="margin-top:10px;display:flex;gap:8px"><button id="miniOk" style="flex:1;padding:7px;background:#8a7448;color:#f3ecd8;border:0;letter-spacing:4px;font-size:13px;font-family:inherit">好</button>'+
    '<button id="miniNo" style="padding:7px 14px;background:none;border:1px solid #d0c29c;color:#8a7448;font-size:13px;font-family:inherit">算了</button></div></div></div>';
  document.body.appendChild(d);   // v33：宿主改body——原来塞进boardUI，它display:none时弹层跟着隐身，抽屉点令牌/改名毫无反应
  const inp=d.querySelector('#miniIn');
  inp.focus();
  const close=()=>d.remove();
  d.querySelector('#miniNo').onclick=close;
  d.onclick=e=>{if(e.target===d)close();};
  const ok=()=>{
    const v=inp.value.trim();
    if(!v)return;
    cb(v);close();
  };
  d.querySelector('#miniOk').onclick=ok;
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ok();}};
}
function writeBoard(){
  const inp=document.getElementById('boardIn');
  const text=(inp.value||'').trim().slice(0,40);
  const tip=document.getElementById('boardTip');
  if(!text){tip.textContent='纸上空着。';return;}
  if(!NPC_TOKEN){
    tip.textContent='还没有钥匙。贴一把，你写的就钉上去了——';
    miniPrompt('贴令牌（GitHub PAT，只存这台设备）','粘贴令牌……','',tok=>{
      NPC_TOKEN=tok;localStorage.setItem('jldh_token',tok);rawMode=false;
      tip.textContent='钥匙收好了，这就钉——';
      setTimeout(()=>{if(worldDirty)pushWorld();},2500);
      writeBoard();
    });
    return;
  }
  tip.textContent='写上了，钉牢……';
  const mine={id:'m'+Date.now(),name:ME?ME.name:'客',text,t:Date.now()};
  boardMsgs.push(mine);renderBoard();          // 本地先上墙
  mergeWriteBoard(mine,inp,tip,0);
}
/* 写纸的规矩：先够到板子（拉远端最新）→把两张纸都钉上（按id去重合并）→带版本锁PUT。
   够不到板子就不钉——不拿自己手里这一张盖掉别人钉上去的。（10/11的账：读失败的会话PUT了残缺数据，
   建军的第一句、长贵的三条被一张一张盖掉了。git历史里找回的。） */
function ghFetch(url,opts,ms){
  const ctl=new AbortController();const tid=setTimeout(()=>ctl.abort(),ms||8000);
  return fetch(url,Object.assign({},opts,{signal:ctl.signal})).finally(()=>clearTimeout(tid));
}
function mergeWriteBoard(mine,inp,tip,retry){
  ghFetch('https://api.github.com/repos/inklotus007/hetan/contents/board.json',{headers:ghHeaders()})
    .then(r=>{
      if(r.status===404)return {sha:null,_msgs:[]};       // 板子还空着——也是够到了
      if(!r.ok)throw new Error('get '+r.status);
      return r.json().then(m=>{
        let msgs=[];
        if(m.content){try{const d=JSON.parse(decodeURIComponent(escape(atob(m.content.replace(/\n/g,'')))));if(d&&Array.isArray(d.msgs))msgs=d.msgs;}catch(e){}}
        return {sha:m.sha,_msgs:msgs};
      });
    })
    .then(b=>{
      const ids=new Set(b._msgs.map(x=>x.id));
      const merged=b._msgs.concat(boardMsgs.filter(x=>!ids.has(x.id)));
      merged.sort((a,b)=>a.t-b.t);
      return ghPut('board.json',{msgs:merged.slice(-60)},b.sha,'留言板：'+ME.name)
        .then(()=>{boardMsgs=merged;renderBoard();inp.value='';localStorage.removeItem('hetan_draft');tip.textContent='钉上了。';})
        .catch(err=>{
          const s=+((err.message||'').match(/put (\d+)/)||[0,0])[1];
          if((s===409||s===422)&&retry<3){boardMsgs=merged;return mergeWriteBoard(mine,inp,tip,retry+1);}  // 别人刚也钉了一张，重拉再钉
          throw err;
        });
    })
    .catch(()=>{
      if(retry<3){setTimeout(()=>mergeWriteBoard(mine,inp,tip,retry+1),1200);return;}
      boardMsgs=boardMsgs.filter(m=>m!==mine);renderBoard();
      tip.textContent='没钉上——够不着板子，稍后再试一次。';
    });
}
function boardDist(){return Math.hypot(p.x-BOARD_POS[0]-0.5,p.z-BOARD_POS[2]);}
document.getElementById('boardClose').onclick=()=>document.getElementById('boardUI').classList.remove('on');
document.getElementById('boardUI').addEventListener('click',e=>{if(e.target.id==='boardUI')document.getElementById('boardUI').classList.remove('on');});
document.getElementById('boardGo').onclick=writeBoard;
function bindTok(){
  miniPrompt('贴令牌（GitHub PAT，只存这台设备）','',NPC_TOKEN||'',tok=>{
    NPC_TOKEN=tok;localStorage.setItem('jldh_token',tok);rawMode=false;
    toast('钥匙收好了，试一试……');
    ghGet('world.json').then(()=>{
      if(apiStat==='通'){toast('钥匙好用——搭的东西马上上云');if(worldDirty)setTimeout(pushWorld,1200);}
      else setTimeout(syncDiag,600);   // 钥匙不对——当场告诉你哪里不对、怎么修
      refreshMenu();
    });
  });
}
document.getElementById('tokBtn2').onclick=bindTok;
document.getElementById('mTok').onclick=bindTok;   // v31：抽屉里的令牌从v28起就没绑过事件——注释写了「入口：抽屉mTok+板上tokBtn2」，实际只绑了板上那个，同志点抽屉没反应的实底
/* 导出搭建：diffs变一段码，发给清言，它写上云——零令牌的桥 */
document.getElementById('expBtn').onclick=()=>{
  const all={r:diffs.r,a:diffs.a};
  const more={};
  try{const sv=JSON.parse(localStorage.getItem('hetan_save_v1'));if(sv&&(sv.r||sv.a)){more.r=(sv.r||[]);Object.assign(more.a,sv.a||{});}}catch(e){}
  if(more.r&&more.r.length>all.r.length)all.r=more.r;
  if(more.a&&Object.keys(more.a).length>Object.keys(all.a).length)all.a=more.a;
  const n=all.r.length+Object.keys(all.a).length;
  if(!n){toast('这台设备上没有没上云的搭建');return;}
  const code=btoa(unescape(encodeURIComponent(JSON.stringify(all))));
  const done=()=>toast(n+' 格已复制——微信发给清言，它替你上云');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(done).catch(()=>fallbackCopy(code,done));
  }else fallbackCopy(code,done);
};
function fallbackCopy(text,done){
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');done();}catch(e){toast('复制失败——长按下面蓝字全选复制');
    const p=document.createElement('div');p.style.cssText='position:fixed;left:5%;right:5%;bottom:10%;background:#fff;color:#036;padding:10px;font-size:10px;word-break:break-all;max-height:40%;overflow:auto;z-index:99';
    p.textContent=text;p.onclick=()=>p.remove();document.body.appendChild(p);}
  ta.remove();
}
document.getElementById('btnBoard').onclick=()=>{document.getElementById('boardUI').classList.add('on');renderBoard();syncBoard();};
/* 令牌入口：抽屉mTok + 板上tokBtn2（tokBtn元素v28删了，它的死绑定曾把整页炸白——删UI必须grep全部引用） */
/* NPC小人渲染 */
const NPC_ONLINE_TTL=180000, NPC_MAX=32;   /* v46：20秒→3分钟——心跳从7秒一跳降到分钟级，在线依然连续 */
function nameSprite(txt,color,shadowMode){
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;
  const g=cv.getContext('2d');
  g.font='28px Songti SC,serif';g.textAlign='center';g.textBaseline='middle';
  const label=shadowMode?txt+' ·影':txt;
  g.globalAlpha=shadowMode?0.75:1;
  g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=5;g.strokeText(label,128,32);
  g.fillStyle=color;g.globalAlpha=shadowMode?0.62:1;g.fillText(label,128,32);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  sp.scale.set(1.7,0.42,1);return sp;
}
/* v49话牌：投影身上挂的当日一句话——走近才展开。深底圆角，最多两行 */
function portalTex(){   /* v52：石框+紫漩涡——远看是竖石门，芯里旋着一圈圈紫 */
  const cv=document.createElement('canvas');cv.width=cv.height=128;
  const g=cv.getContext('2d');
  g.fillStyle='#6b6578';g.fillRect(0,0,128,128);
  g.fillStyle='#7d7690';g.fillRect(6,6,116,116);
  g.fillStyle='#2a1f3d';g.fillRect(20,14,88,100);
  for(let i=0;i<4;i++){
    g.strokeStyle='rgba(170,120,230,'+(0.55-i*0.1)+')';
    g.lineWidth=5-i;
    g.beginPath();g.arc(64,64+8,44-i*11,0,Math.PI*2);g.stroke();
  }
  g.fillStyle='rgba(230,215,255,0.9)';g.beginPath();g.arc(64,72+8,3,0,Math.PI*2);g.fill();
  const t=new THREE.CanvasTexture(cv);return t;
}
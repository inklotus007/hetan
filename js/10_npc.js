
function roundRectPath(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
function wordsSprite(text){
  /* v51.2：话牌记下自己的文本——渲染循环据此判过期，日期翻天自动摘 */

  const cv=document.createElement('canvas');cv.width=512;cv.height=112;
  const g=cv.getContext('2d');
  g.fillStyle='rgba(24,20,12,0.84)';roundRectPath(g,4,4,504,104,10);g.fill();
  g.strokeStyle='rgba(208,194,156,0.5)';g.lineWidth=2;roundRectPath(g,4,4,504,104,10);g.stroke();
  g.fillStyle='#f4efe2';g.font='27px Songti SC,serif';g.textAlign='center';g.textBaseline='middle';
  const chars=text.slice(0,36);
  const lines=[];
  for(let i=0;i<chars.length;i+=18)lines.push(chars.slice(i,i+18));
  lines.slice(0,2).forEach((l,i)=>g.fillText(l,256,36+i*44));
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  sp.scale.set(3.4,0.75,1);sp.visible=false;return sp;
}
/* v47投影贴图：不再是两个色块——衣领门襟口袋线、脸上眉眼嘴、头顶头发。颜色参数化，一人一张 */
function npcClothSide(base){
  return aTex(g=>{aMottle(g,base,['rgba(0,0,0,0.14)','rgba(255,255,255,0.10)'],18);
    g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(0,0,64,8);           // 肩线
    g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(0,54,64,10);});       // 下摆
}
function npcClothFront(base,apron){
  return aTex(g=>{aMottle(g,base,['rgba(0,0,0,0.14)','rgba(255,255,255,0.10)'],18);
    g.fillStyle='rgba(0,0,0,0.30)';
    g.beginPath();g.moveTo(20,0);g.lineTo(32,14);g.lineTo(44,0);g.lineTo(44,10);g.lineTo(36,16);g.lineTo(28,16);g.lineTo(20,10);g.closePath();g.fill();   // 衣领
    g.fillRect(31,16,2,40);                                          // 门襟
    for(const y of[24,36,48]){g.beginPath();g.arc(32,y,1.8,0,7);g.fill();}   // 扣子
    g.fillStyle='rgba(0,0,0,0.20)';g.fillRect(10,34,12,12);g.fillRect(42,34,12,12);   // 双口袋
    if(apron){g.fillStyle=apron;g.fillRect(18,30,28,34);g.fillStyle='rgba(0,0,0,0.16)';g.fillRect(18,30,28,3);}   /* v95围裙 */
    g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(0,54,64,10);});
}
function npcFace(skin){
  return aTex(g=>{g.fillStyle=skin;g.fillRect(0,0,64,64);
    g.fillStyle='#23180f';g.fillRect(0,0,64,16);                     // 头发
    g.fillRect(0,0,7,26);g.fillRect(57,0,7,26);                      // 鬓角
    g.fillStyle='#1a1a1a';g.beginPath();g.arc(22,32,3.6,0,7);g.arc(42,32,3.6,0,7);g.fill();   // 眼
    g.fillStyle='#fff';g.beginPath();g.arc(23.2,30.8,1.1,0,7);g.arc(44.2,30.8,1.1,0,7);g.fill();
    g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(26,42,12,2);});        // 嘴
}
function npcHeadTop(hair){return aTex(g=>{g.fillStyle=hair;g.fillRect(0,0,64,64);});}
const APRON={   /* v95：九户围裙/腰带特征色 */
 '满仓':'#4a5a6a','凤兰':'#8c3a3a','秀兰':'#2a3a4a','建军':'#3a4a3a','秋生':'#3a3a3a',
 '爱香':'#a86a2a','长贵':'#4a3a2a','来福':'#2a2a3a','银锁':'#b8a888',
 '栓柱':'#3a4a3a','麦穗':'#7a5a2a','二愣':'#4a4a4a','杏花':'#8c5a6a','铁蛋':'#3a5a6a','老蔫':'#5a5a3a',
 '翠娥':'#8c3a5a','石头':'#3a4a4a','巧云':'#6a4a6a','柱子':'#5a4a3a','桂枝':'#6a3a3a','半仙':'#2a3a3a'
};
function makeNPCBody(npc){
  const g=new THREE.Group();
  const hairC=['#23180f','#171310','#3a2416'][npc.seed%3];
  const clothS=npcClothSide(npc.coat),clothF=npcClothFront(npc.coat,APRON[npc.name]);
  const face=npcFace(npc.skin),top=npcHeadTop(hairC);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.85,0.32),
    [aM(clothS),aM(clothS),aM(clothS),aM(clothS),aM(clothF),aM(clothS)]);
  body.position.y=0.62;
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.48,0.48),
    [aM(npcFace(npc.skin)),aM(npcFace(npc.skin)),aM(top),aM(npcFace(npc.skin)),aM(face),aM(npcFace(npc.skin))]);
  head.position.y=1.28;
  /* v49：两版名字牌——亮版（真人在场）/影版（投影：名字+·影，半透明）。renderNPCs按在线态切换 */
  const tag=nameSprite(npc.name,'#f4efe2',false);tag.position.y=1.95;
  const tagS=nameSprite(npc.name,'#cfc8b8',true);tagS.position.y=1.95;tagS.visible=false;
  g.add(body);g.add(head);g.add(tag);g.add(tagS);
  g.userData={tag,tagS,head,body};
  return g;
}
let npcObjs={};   // id -> THREE.Group
function surfaceY(x,z){
  for(let y=H-2;y>=0;y--){const b=get(x,y,z);if(b!==AIR&&b!==8)return y+1;}
  return 7;
}
/* v48投影接口：日程不在代码里——云端schedules.json，按名字索引，谁写谁自己的。
   兜底顺序：云端有日程→按日程活；投影身体（project:true）无日程→站home等指令；
   路人（无project）→随机漫游。接口格式见仓库README。 */
const STELE=[38.5,22.5], FLOWER=[38.5,23.5];
let schedData=null;   // 云端日程（ghGet('schedules.json')加载）
function schedPos(name,dayT){
  if(!schedData)return null;
  const sch=schedData[name];if(!sch)return null;
  for(const seg of sch){
    const[t0,t1,x,z,act]=seg;
    const inSeg=t0<=t1?(dayT>=t0&&dayT<t1):(dayT>=t0||dayT<t1);
    if(inSeg){
      let px=x,pz=z;
      if(act==='walk'){
        px+=Math.sin(dayT*540+x)*1.3;pz+=Math.cos(dayT*390+z)*1.1;
        /* v133漫游偏好（Townsmen 2.5）：六成村民walk时漂向兴趣点——水井/火塘/集市/灯柱花圃旁打转，装饰有了被看的价值 */
        if(((npc.seed||3)%10)<6){
          const poi=walkPOI(npc.seed||3);
          if(poi){const dxp=poi[0]-px,dzp=poi[1]-pz,dp=Math.hypot(dxp,dzp);
            if(dp>2){px+=dxp*0.18;pz+=dzp*0.18;}else{px+=Math.sin(tSec*0.7+(npc.seed||3))*0.4;pz+=Math.cos(tSec*0.5+(npc.seed||3))*0.4;}}
        }
      }
      return{x:px,z:pz,act};
    }
  }
  return null;
}
const riverSpotCache={};let WELLS=[];   /* v85.1：真实水点缓存（按宅地）+井位表 */
function findWater(nx,nz){   /* v85.1：向四周找最近水面（老riverZAt是v44老河，村离它310格——找大陆真水） */
  let best=null,bd=1e9;
  for(let dx=-72;dx<=72;dx+=4)for(let dz=-72;dz<=72;dz+=4){
    const x=nx+dx,z=nz+dz;
    if(!inW(x,1,z))continue;
    const y=surfaceY(x,z);
    if(get(x,y,z)===8||get(x,y-1,z)===8){const d=dx*dx+dz*dz;if(d<bd){bd=d;best=[x+0.5,z+0.5];}}
  }
  return best;
}
function safetySpot(x,z){   /* v93：落点安全网——同志三报「早上站房顶/中午消失」的根：villAt各语义点没过地面校验。plot点=房内地板（surfaceY=房顶→build全程房顶）；fire均值点可能落水（surfaceY跳过水返回河床顶→NPC站水底=消失）。出口统一校验，无效就近螺旋找可站格 */
  const bx=Math.floor(x),bz=Math.floor(z);
  const ok=(gx,gz)=>{if(!inW(gx,1,gz))return false;const y=surfaceY(gx,gz);if(y<=3)return false;if(get(gx,y,gz)===8)return false;
    /* v121坑检查（TA：看不见建筑结构，周围有坑还在往下走）：外环16格里≥8块地面比它高2+=它在坑里/坑沿→不算可站（一跳邻格查不出大坑——坑底的邻格也在坑里，得看外环） */
    const gy=groundY(gx,gz);if(gy<1)return false;
    let rim=0;for(let dx2=-2;dx2<=2;dx2++)for(let dz2=-2;dz2<=2;dz2++){
      if(!dx2&&!dz2)continue;if(Math.abs(dx2)===2&&Math.abs(dz2)===2)continue;   /* 内环8+外环8 */
      const gyN=groundY(gx+dx2,gz+dz2);if(gyN>=1&&gyN>gy+1)rim++;
    }
    return rim<6;};   /* v121：4×4取土坑的外环高沿=6——阈值6（大坑更多更稳） */
  if(ok(bx,bz))return[x,z];
  for(let r=1;r<10;r++){
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
      if(ok(bx+dx,bz+dz))return[bx+dx+0.5,bz+dz+0.5];
    }
  }
  return[x,z];
}
const campCenterCache={};
function campCenter(ci){   /* v90：camp聚集点=该camp各家plot均值（真数据） */
  if(campCenterCache[ci])return campCenterCache[ci];
  if(!VH.homes)return null;
  let sx=0,sz=0,n=0;
  for(const id in VH.homes){
    const vh=VH.homes[id];
    if((vh.camp||0)!==ci)continue;
    sx+=vh.plot[0];sz+=vh.plot[2];n++;
  }
  if(!n)return null;
  const c=[sx/n+2.5,sz/n+2];
  campCenterCache[ci]=c;
  return c;
}
function villAtRaw(npc,at){   /* v84地点→坐标。v85.1：home=宅地屋里（npc.home是v50老坐标不是家）；river=真水；加well */
  const vh=(VH.homes||{})[npc.id];
  const ox=Math.sin((npc.seed||7)*1.7)*1.8, oz=Math.cos((npc.seed||7)*2.3)*1.8;
  if(Array.isArray(at)){   /* v91：判定者给的坐标过防幻觉校验（TA符号感知方案的对应物：本地知道每个格是什么，LLM报的坐标先查再走） */
    const ax=Math.round(at[0]), az=Math.round(at[1]);
    if(inW(ax,1,az)){
      const ay=surfaceY(ax,az);
      const tb=get(ax,ay,az);
      if(tb!==8&&ay<H-2&&ay>3)return[ax+0.5,az+0.5];
    }
    const vh9=(VH.homes||{})[npc.id];   /* 校验不过：兜底自家门前，不站水里不站界外 */
    if(vh9)return[vh9.plot[0]+2.5,vh9.plot[2]-0.8];
    return[npc.home[0]+0.5,npc.home[1]+0.5];
  }
  if(at==='market')return[MKT_FLAG[0]+0.5+ox*1.4,MKT_FLAG[1]+2.5+oz*1.4];   /* v98：集市街心 */
   if(at==='home'&&vh)return[vh.plot[0]+2.5,vh.plot[2]-0.8];   /* v90：门前（旧点2.2是房正中=站房顶） */
  if(at==='plot'&&vh)return[vh.plot[0]+2.5+ox*0.6,vh.plot[2]-1.5+oz*0.35];   /* v93：房前院（旧点1.5在房内地板=build全程房顶——同志三报「早上站房顶」的根） */
  if(at==='fire1'||at==='fire2'){   /* v90：火塘=同camp各家宅地均值（VH.camps从未存在过——旧代码永远兜到v50老坐标=「中午消失」的真根） */
    const ci=at==='fire1'?0:1, cc=campCenter(ci);
    if(cc)return[cc[0]+ox,cc[1]+oz];
  }
  if(at==='help'){   /* v88.1：帮工点=本村进度最慢那家的plot——判定者说谁帮，本地算帮谁 */
    const myCamp=((VH.homes||{})[npc.id]||{}).camp||0;
    let worst=null,wv=1e9;
    for(const id2 in (VH.homes||{})){
      const vh2=VH.homes[id2];
      if((vh2.camp||0)!==myCamp)continue;
      const w=(villBuilt[id2]||0)/((villTotals[id2]||100)||100);
      if(w<wv){wv=w;worst=vh2;}
    }
    if(worst)return[worst.plot[0]+2.5+ox*0.5,worst.plot[2]+1.5+oz*0.5];
    return[npc.home[0]+0.5,npc.home[1]+0.5];
  }
  if(at==='well'&&WELLS&&WELLS.length){
    const bx=vh?vh.plot[0]:npc.home[0], bz=vh?vh.plot[2]:npc.home[1];
    let w=WELLS[0];
    for(const x of WELLS){if(Math.abs(x[0]-bx)+Math.abs(x[1]-bz)<Math.abs(w[0]-bx)+Math.abs(w[1]-bz))w=x;}
    return[w[0]+ox*0.9,w[1]+oz*0.9];
  }
  if(at==='river'){
    const bx=vh?vh.plot[0]:npc.home[0], bz=vh?vh.plot[2]:npc.home[1];
    const key='r'+bx+'_'+bz;
    if(!riverSpotCache[key]){
      const spot=findWater(bx,bz);
      riverSpotCache[key]=spot||[bx+2.5,bz+1.5];   /* 找不到水就退回工地 */
    }
    const spot=riverSpotCache[key];
    return[spot[0]+ox*0.7,spot[1]+oz*0.7];
  }
  if(vh)return[vh.plot[0]+2.5,vh.plot[2]-0.8];   /* v90：兜底也站自家门前，不落v50老坐标 */
  return[npc.home[0]+0.5,npc.home[1]+0.5];
}
function villAt(npc,at){   /* v93：出口统一过安全网 */
  const r=villAtRaw(npc,at);
  return safetySpot(r[0],r[1]);
}
function villPeer(npc,cur){   /* v84：同段同地点的另一户——chat时朝他站（含各自错开位） */
  const sch=(MINDS&&MINDS.sched)||{};
  for(const n in sch){
    if(n===npc.name)continue;
    for(const l of sch[n]){
      if(l.at===cur.at&&Math.abs(l.t-cur.t)<0.15){
        const other=Object.values((VH.homes||{})).find(h=>h.name===n);
        if(other){
          const otherNpc={id:other.id,seed:0,name:n,home:[other.plot[0],other.plot[2]]};
          const otherSeed=(npcObjsSeedCache[n]!=null)?npcObjsSeedCache[n]:(other.plot[0]*31+other.plot[2]);
          otherNpc.seed=otherSeed;
          return villAt(otherNpc,l.at);
        }
      }
    }
  }
  return null;
}
/* v133漫游兴趣点表：seed→固定目的地（水井/火塘/集市/装饰）——deco位置从build_done读（灯柱花圃树） */
function walkPOI(seed){
  const pts=[];
  if(typeof WELLS!=='undefined'&&WELLS&&WELLS.length)for(const w of WELLS.slice(0,2))pts.push([w[0]+0.5,w[1]+2]);
  try{for(const ci of [0,1]){const cc=campCenter(ci);pts.push([cc[0],cc[1]]);}}catch(e){}
  pts.push([MKT_STALLS[0].x+1,MKT_STALLS[0].z+2],[319,342]);
  const bd=(typeof MINDS!=='undefined'&&MINDS&&MINDS.build_done)||[];
  for(const d of bd){if(d.ok!==false&&['灯柱','牌坊','戏台','假山','秋千','影壁','竹丛'].includes(d.type)&&d.near){   /* v136装饰全进漫游兴趣点——建了村民会去看 */const nn=d.near.replace(/[()]/g,'').split(',');const px2=parseFloat(nn[0]),pz2=parseFloat(nn[1]);if(isFinite(px2)&&isFinite(pz2))pts.push([px2+1.5,pz2+1.5]);}}
  return pts.length?pts[seed%pts.length]:null;
}
/* v133访问统计（Townsmen：满意度=实际访问满足率，不是静态覆盖）：sched就是访问计划——扫今天全村被排到的地点 */
function visitStats(){
  const cnt={fire1:0,fire2:0,well:0,mkt:0,river:0,plot:0,home:0};
  const sch=(typeof MINDS!=='undefined'&&MINDS&&MINDS.sched)||{};
  for(const nm in sch){for(const l of sch[nm]){if(cnt[l.at]!=null)cnt[l.at]++;}}
  return cnt;
}
/* 访问加成（前端显示层）：有人用=加分——火塘有人聚+4/井有人打水+3/集日有人赶集+3；服务器satisfy不动（判定者已有自己的账） */
function accessPts(){
  const c=visitStats();
  let p=0;
  if(c.fire1+c.fire2>0)p+=4;
  if(c.well>0)p+=3;
  if(typeof isMarketDay==='function'&&isMarketDay()&&(c.mkt>0||(c.fire1+c.fire2===0&&c.plot===0)))p+=3;
  /* v136装饰体面分：村里装饰建到三件以上，人心气+2——村子像样了 */
  const bd=(typeof MINDS!=='undefined'&&MINDS&&MINDS.build_done)||[];
  let deco=0;
  for(const d of bd){if(['灯柱','牌坊','戏台','假山','秋千','影壁','竹丛'].includes(d.type))deco++;}
  if(deco>=3)p+=2;
  return p;
}
const npcObjsSeedCache={};   /* v84：村民seed缓存（npcs.json拉到后填——chat朝向用同seed才算得出同偏移） */
function npcPos(npc,tSec){
  const dayT=(tSec%DAY_LEN)/DAY_LEN;
  const s=schedPos(npc.name,dayT);
  if(s){   /* 投影：按日程活 */
    const act=s.act;
    let yaw=0;
    if(act==='lookStele')yaw=Math.atan2(STELE[0]-s.x,STELE[1]-s.z);
    else if(act==='lookWater')yaw=Math.atan2(0,riverZAt(s.x)-s.z);
    else yaw=Math.sin(dayT*220+npc.seed)*0.8;   // 站着的偶尔转身
    return[s.x,s.z,yaw,act];
  }
  /* v84：判定者行程——AI排的今天。村民按段走，说话的两户站在一起，夜里回家 */
  /* v98：逢集层——白天摊主守摊、北岸部分村民赶集（集是日子，优先于心事） */
   if(isMarketDay()&&VH.homes&&dayT>0.24&&dayT<0.66){
     const myHome=(VH.homes||{})[npc.id];
     const north=myHome&&myHome.plot[2]>320;
     const stall=MKT_STALLS.find(s=>s.owner===npc.name);
     if(stall&&north)return[stall.x+0.5,stall.z+1.6,Math.PI,'stand'];
     if(north&&((npc.seed*13+7)%100)<45){
       const st2=MKT_STALLS[((npc.seed||3)+((dayT*97)|0))%MKT_STALLS.length];
       const ox2=Math.sin((npc.seed||7)*1.7)*1.6,oz2=Math.cos((npc.seed||7)*2.3)*1.6;
       return[st2.x+1.5+ox2,st2.z+2.4+oz2,Math.atan2(st2.x+0.5-(st2.x+1.5+ox2),st2.z+1.2-(st2.z+2.4+oz2)),'chat'];
     }
   }
   /* v101：修路期——户主站在自家支线路头，路一段段往前伸 */
   if(VH.homes&&VH.up&&dayT>0.22&&dayT<0.7){
     const vhR=(VH.homes||{})[npc.id];
     if(vhR&&vhR.startDay){
       const gR=Math.floor((Date.now()-VH.up)/DAY_MS);
       const rpR=roadPeriodOf(vhR,gR);
       if(rpR&&rpR.on){
         const lineR=roadLineOf(vhR);
         const head=lineR[Math.min(rpR.done,lineR.length-1)];
         return[head[0]+0.5,head[1]+1.6,Math.PI,'stand'];
       }
     }
   }
   if(MINDS&&MINDS.sched&&MINDS.sched[npc.name]&&(VH.homes||{})[npc.id]){
    const legs=MINDS.sched[npc.name];
    if(dayT<0.08||dayT>0.82){   /* v90：夜里真进屋（门前格+act=inside→渲染层隐身=在屋里）；天亮从门口出来 */
      const vh9=VH.homes[npc.id];
      return[vh9?vh9.plot[0]+2.5:npc.home[0]+0.5,vh9?vh9.plot[2]-0.8:npc.home[1]+0.5,0,'inside'];
    }
    let cur=null;
    for(const l of legs){if(dayT>=l.t)cur=l;else break;}
    if(!cur){   /* v90：天没亮=在屋里 */
      const vh9=VH.homes[npc.id];
      return[vh9?vh9.plot[0]+2.5:npc.home[0]+0.5,vh9?vh9.plot[2]-0.8:npc.home[1]+0.5,0,'inside'];
    }
    const at=villAt(npc,cur.at);
    let yaw=0;
    if(cur.act==='chat'){
      const peer=villPeer(npc,cur);
      if(peer)yaw=Math.atan2(peer[0]-at[0],peer[1]-at[1]);
      else yaw=Math.sin(dayT*180+npc.seed)*0.5;
    }else if(cur.act==='lookWater')yaw=Math.atan2(0,riverZAt(at[0])-at[1]);
    else if(cur.act==='build')yaw=Math.atan2(villAt(npc,'plot')[0]-at[0],villAt(npc,'plot')[1]-at[1]);
    else yaw=Math.sin(dayT*160+npc.seed)*0.5;
    /* build的：在工地附近小步挪——站在一格上像桩子 */
    if(cur.act==='build'||cur.act==='collab'){
      const a2b=tSec*0.31+npc.seed;
      return[at[0]+Math.sin(a2b)*1.6,at[1]+Math.cos(a2b*0.9)*1.2,yaw,cur.act];
    }
    return[at[0],at[1],yaw,cur.act];
  }
  if(npc.project){   /* 等指令的投影：站在home，指令到了才动 */
    return[npc.home[0]+0.5,npc.home[1]+0.5,Math.sin(dayT*160+npc.seed)*0.6,'stand'];
  }
  /* v77村民：施工中白天绕宅地干活（build），夜里归宅地站定；盖好了恢复全村漫游 */
  if(VH.homes[npc.id]&&!npc.project){
    const vh=VH.homes[npc.id];
    const tot=villTotals[npc.id]||1,blt=villBuilt[npc.id]||0;
    if(blt<tot){
      const cx2=vh.plot[0]+2.5,cz2=vh.plot[2]+1.5;
      if(dayT<0.22||dayT>0.82)return[cx2,cz2,0,'stand'];   /* 夜里在家 */
      if(weather==='rain'||weather==='snow')return[cx2,cz2,0,'stand'];   /* v79.1：雨天停工=人不出工（进度不归零，格子照在） */
      const a=tSec*0.13+npc.seed;
      return[cx2+Math.sin(a)*4.5,cz2+Math.cos(a*0.8)*3.5,Math.sin(a*2)*0.8,'build'];
    }
  }
  /* 路人：随机漫游 */
  const s2=npc.seed;
  const dx=Math.sin(tSec*0.071+s2)*8+Math.sin(tSec*0.021+s2*2.7)*5;
  const dz=Math.cos(tSec*0.052+s2*1.3)*9+Math.cos(tSec*0.033+s2*0.7)*4;
  let x=npc.home[0]+0.5+dx, z=npc.home[1]+0.5+dz;
  x=Math.max(2,Math.min(W-3,x));z=Math.max(2,Math.min(D-3,z));
  return[x,z,Math.atan2(Math.cos(tSec*0.052+s2*1.3),-Math.sin(tSec*0.071+s2*2)),null];
}
function renderNPCs(list,tSec){
  const seen={};
  list.slice(0,NPC_MAX).forEach(npc=>{
    if(npc.id===ME.id)return;               // 自己第一人称，不渲染
    seen[npc.id]=true;
    let g=npcObjs[npc.id];
    if(!g){g=makeNPCBody(npc);npcGroup.add(g);npcObjs[npc.id]=g;}
    if(npc.name)npcObjsSeedCache[npc.name]=npc.seed;   /* v84：chat朝向用 */
    let x,z,yaw;
    const isOnline=npc.online&&(Date.now()-npc.lastSeen<NPC_ONLINE_TTL);
    g.userData.vname=npc.name||'';g.userData.isOnline=!!isOnline;   /* v114：照面对话要名字和在线态 */
    if(isOnline){
      /* v46：云端位置约二十秒才刷一次——本地朝它缓动，人看着是在走，不在跳。
         刚从漫游转在线的身体也从原地走过去，不从天上掉下来。 */
      const tx=npc.pos[0],tz=npc.pos[1];yaw=npc.yaw||0;
      if(g.userData.sm){x=g.position.x+(tx-g.position.x)*0.05;z=g.position.z+(tz-g.position.z)*0.05;}
      else{x=tx;z=tz;g.userData.sm=1;}
    }
    else{
      /* v47投影：按日程生活（或路人漫游）——离线也lerp，时段切换时人是从容走过去的，不是闪现 */
      const P=npcPos(npc,tSec);
      const tx=P[0],tz=P[1];yaw=P[2];
      const dayT2=(tSec%DAY_LEN)/DAY_LEN;   /* v88.2修：dayT是npcPos的局部变量，这里自己算 */
      const nightSp=(dayT2>0.8||dayT2<0.1)?0.13:0.045;   /* 夜路提速三倍 */
      if(g.userData.sm){x=g.position.x+(tx-g.position.x)*nightSp;z=g.position.z+(tz-g.position.z)*nightSp;}
      else{x=tx;z=tz;g.userData.sm=1;}
      if(Math.hypot(tx-x,tz-z)>1.2&&P[3]!=='chat')yaw=Math.atan2(tx-x,tz-z);   /* v84：走动时面朝路 */
      if(P[3]!=='chat'){   /* v85：玩家走近（5格）村民看他——MC：玩家足够接近时村民一直注视 */
        const dxp=p.x-x,dzp=p.z-z;
        if(dxp*dxp+dzp*dzp<25)yaw=Math.atan2(dxp,dzp);
      }
      const cpk=chatPairs[npc.id];   /* v114：照面对话——停下转身面对面 */
      if(cpk&&pairRuns[cpk]){
        const R2=pairRuns[cpk],oid=(R2.a===npc.id)?R2.b:R2.a,og=npcObjs[oid];
        x=g.position.x;z=g.position.z;
        if(og)yaw=Math.atan2(og.position.x-x,og.position.z-z);
      }
      let act=cpk?'chat':P[3];   /* v90.1：声明提到head tilt前（v90炸在TDZ——声明在用之后）；v114：对话复用chat点头 */
      if(g.userData.head)g.userData.head.rotation.x=act==='lookStele'?0.5:(act==='lookWater'?0.32:(act==='chat'?0.06+Math.sin(tSec*5.5+npc.seed)*0.16:(act==='build'?0.35:(act==='collab'?0.4+Math.sin(tSec*4.7+npc.seed)*0.12:(moodTilt(tSec,npc)||Math.max(0,Math.sin(tSec*0.4+npc.seed))*0.15)))));   /* v88.1：build低头/collab埋头/mood表情 */
      g.userData.act=act;   /* v116：声音/微动作读act */
      /* v116微动作：挥锤（挂锤+抡弧）/打水蹲起/走路摇摆 */
      const ud=g.userData;
      if(ud.body&&act!=='inside'){
        if(act==='build'&&VH.homes&&VH.homes[npc.id]&&!homeDone[npc.id]&&Math.hypot(g.position.x-(VH.homes[npc.id].plot[0]+2),g.position.z-(VH.homes[npc.id].plot[2]+1))<9){   /* v118修：只有自己未竣工工地附近的村民挂锤——施工日程19户都是build，全员抡锤荒诞（TA实报） */
          if(!ud.hammer){
            const hg=new THREE.Group();
            const st=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.52,0.05),new THREE.MeshLambertMaterial({color:0x8a6a48}));st.position.y=-0.26;
            const hh=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.11,0.11),new THREE.MeshLambertMaterial({color:0x4a4a48}));hh.position.y=-0.52;
            hg.add(st);hg.add(hh);hg.position.set(0.36,1.0,0.12);g.add(hg);ud.hammer=hg;
          }
          const ph=(tSec*1.45+npc.seed*0.37)%1;
          ud.hammer.rotation.z=-0.55+Math.abs(Math.sin(ph*Math.PI))*1.55;   /* 抡弧：举起→砸下 */
          ud.body.rotation.x=0.1+Math.sin(ph*Math.PI)*0.12;
        }else{
          if(ud.hammer){g.remove(ud.hammer);ud.hammer=null;}
          ud.body.rotation.x+= (0-ud.body.rotation.x)*0.12;
          if(act==='drawWater'){
            const sq=Math.pow(Math.abs(Math.sin(tSec*0.5+npc.seed)),0.6);   /* 蹲：慢起慢坐 */
            ud.body.position.y=0.62-0.16*sq;ud.head.position.y=1.28-0.24*sq;
          }else if(act!=='walk'){
            ud.body.position.y+=(0.62-ud.body.position.y)*0.08;ud.head.position.y+=(1.28-ud.head.position.y)*0.08;
          }
          if(act==='walk')ud.body.rotation.z=Math.sin(tSec*6.5+npc.seed)*0.045;   /* 迈步微摆 */
          else ud.body.rotation.z+=(0-ud.body.rotation.z)*0.12;
        }
      }
      if(act==='inside'){   /* v90.2：在屋里——隐身（早上从门口出来）。块挪进else（v90.1修TDZ时删了顶层声明，顶层没act——TA截图报act is not defined@1221） */
        if(g.visible)g.visible=false;
        return;
      }
      if(!g.visible)g.visible=true;
      g.scale.y=(act==='lunch'||act==='dusk')?0.85:1;   /* 蹲坐（吃饭歇晌坐门槛） */
      if(act==='road'){   /* 脚步铺路——修路的村民走到哪铺到哪（TA：环境感知之后他自己觉得没路不方便） */
        const bx=Math.floor(x),bz=Math.floor(z),by=surfaceY(bx,bz);
        const k2=bx+','+by+','+bz, tb=get(bx,by,bz);
        if(tb!==11&&tb!==20&&tb!==8&&by<H-2&&!villCells[k2]&&tb!==0&&by>3){
          world[idx(bx,by,bz)]=11;diffs.a[k2]=11;villCells[k2]='road';worldDirty=true;
        }
      }
    }
    const y=(groundY(Math.floor(x),Math.floor(z))+1)||surfaceY(Math.floor(x),Math.floor(z));   /* v104：贴真地面 */
    const bob=(!isOnline&&Math.sin(tSec*2.3+npc.seed)>0.92)?Math.abs(Math.sin(tSec*7))*0.12:0;
    const breath=Math.sin(tSec*2.1+npc.seed)*0.012;   // v49呼吸：三秒周期，静止里也有活气
    g.position.set(x,y+bob+breath,z);g.rotation.y=yaw;
    /* v49：名字牌亮/影随在线态切换；话牌走近两格半展开——投影身上挂的当日一句话 */
    if(g.userData.tagOn!==isOnline){
      g.userData.tagOn=isOnline;
      g.userData.tag.visible=isOnline;
      g.userData.tagS.visible=!isOnline;
    }
    if(!g.userData.words&&wordData&&wordData[npc.name]&&wordData[npc.name].text){
      const wtxt=wordData[npc.name].text;
      /* 体检修：话牌带日期戳（MM/DD）且不是今天——摘。话是「今日」的，过了今天就不挂在身上 */
      const dm=wtxt.match(/(\d{1,2})\/(\d{1,2})/);
      const today=new Date();
      /* v51.3：过期摘只针对「今日」字样——「今日」过了今天就说谎；落款日期不是时效，「在。——伊卡洛斯 10/16」是常驻话，不摘 */
      const expired=dm&&wtxt.includes('今日')&&( +dm[1]!==today.getMonth()+1 || +dm[2]!==today.getDate() );
      if(!expired){
        const ws=wordsSprite(wtxt);ws.userData.wtxt=wtxt;ws.position.y=2.52;g.add(ws);g.userData.words=ws;
      }
    }
    if(g.userData.words){
      /* v51.2：挂着的也判过期——group复用「只挂不摘」会让昨天的「今日」说谎 */
      const cur=g.userData.words.userData.wtxt||'';
      const cdm=cur.match(/(\d{1,2})\/(\d{1,2})/);
      const cnow=new Date();
      const cExp=cdm&&cur.includes('今日')&&( +cdm[1]!==cnow.getMonth()+1 || +cdm[2]!==cnow.getDate() );
      if(cExp){g.remove(g.userData.words);g.userData.words=null;}
      else g.userData.words.visible=Math.hypot(p.x-g.position.x,p.z-g.position.z)<2.5;
    }
    g.visible=true;
  });
  for(const id in npcObjs)if(!seen[id]){npcGroup.remove(npcObjs[id]);delete npcObjs[id];}
}
/* 云端同步：只在配了令牌时。
   v46心跳节流：commit流不再被7秒一笔刷屏（一天五百多笔，翻提交的人要趟过心跳找一朵花）。
   两分钟一跳，或走出6格才跳——赶路的人别人也追得上。 */
let npcSha=null,npcList=[],npcBusy=false,npcLastPut=0,npcLastPutPos=[1e9,1e9];
var npcs={};   /* v140根修：全局村民账——v134村长守恒/感知包在线村民/地图村长点三处死代码（typeof npcs永远undefined）全活 */
function syncNPCs(){
  if(!NPC_TOKEN||!ME||npcBusy||!meClaimed)return;npcBusy=true;
  ghGet(NPCS_URL).then(({sha,data})=>{
    npcSha=sha;
    npcs=(data&&data.npcs)||{};   /* v140：填全局（原局部const让60_judge/80_tools永远typeof undefined） */
    const now=Date.now();
    const moved=Math.hypot(p.x-npcLastPutPos[0],p.z-npcLastPutPos[1])>=6;
    if(now-npcLastPut>=120000||moved){
      // 自己写进去（心跳）
      const today=new Date().getDate();
      if(dayActs.d!==today)dayActs={put:0,dig:0,talk:0,d:today};
      npcs[ME.id]={id:ME.id,name:ME.name,seed:ME.seed,coat:ME.coat,skin:ME.skin,
        home:ME.home,pos:[p.x,p.z],yaw:p.yaw,online:true,lastSeen:now,
        act:{put:dayActs.put,dig:dayActs.dig,talk:dayActs.talk}};
      // 限数：砍最老的
      const keys=Object.keys(npcs);
      if(keys.length>40){
        keys.sort((a,b)=>(npcs[a].lastSeen||0)-(npcs[b].lastSeen||0));
        keys.slice(0,keys.length-40).forEach(k=>delete npcs[k]);
      }
      npcList=Object.values(npcs);
      return ghPut(NPCS_URL,{npcs:npcs},sha).then(()=>{npcLastPut=now;npcLastPutPos=[p.x,p.z];});
    }
    npcList=Object.values(npcs);   // 没到心跳点：只当读了一回（读别人+别人的lastSeen）
    return Promise.resolve();
  }).then(()=>{
    npcBusy=false;
  }).catch(()=>{npcBusy=false;});
}
let worldLoopCount=0;
function npcLoop(){
  syncBoard();                            // 留言板：有没有令牌都读（raw公开读）
  worldLoopCount++;
  if(worldLoopCount%4===0)pullWorld();    // 约每28秒，世界长一次别人的搭建
  if(!NPC_TOKEN){
    /* v47：没令牌的访客也看得见投影——npcs.json是公开的（同源副本），投影是给所有来的人看的 */
    ghSame(NPCS_URL).then(({data})=>{
      npcs=(data&&data.npcs)||{};   /* v140：游客通道也填全局 */
      renderNPCs(Object.values(npcs),worldSec());/*v92*/ bubbleTick(performance.now()/1000);pairChatTick(worldSec());smokeTick(worldSec(),0.05);;audioTick(worldSec());
    }).catch(()=>{renderNPCs([],worldSec());/*v92*/ bubbleTick(performance.now()/1000);});
    setTimeout(npcLoop,9000);return;
  }
  if(worldLoopCount%3===0)syncNPCs();     // v46：约每21秒读一次云端（顺带按需心跳），API和commit都从刷屏回到呼吸
  setTimeout(npcLoop,7000);
}
/* 轻提示：搭建上云成功/失败，必须看得见——不再静默 */
let toastT=0;
function toast(s){
  const el=document.getElementById('toast')||(()=>{const t=document.createElement('div');t.id='toast';
    t.style.cssText='position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:9px 18px;background:rgba(24,28,32,.78);color:#efe8d8;font-size:13px;letter-spacing:2px;border-radius:4px;border:1px solid rgba(255,240,200,.25);z-index:29;transition:opacity .4s;opacity:0;pointer-events:none';
    document.body.appendChild(t);return t;})();
  el.textContent=s;el.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>el.style.opacity=0,2600);
}
/* 名字即存档：位置跟名字走——换设备、换浏览器，进同一个名字回到原地 */
let posSaveT=0;
function savePos(){
  if(!NPC_TOKEN||!ME)return;
  ghPut('saves/'+encodeURIComponent(ME.name)+'.json',{pos:[+p.x.toFixed(1),+p.z.toFixed(1)],ts:Date.now()},null,'河滩：'+ME.name+'站了站').catch(()=>{});
}
function schedulePosSave(){clearTimeout(posSaveT);posSaveT=setTimeout(savePos,10000);}
/* 进场自检：本地有没上云的砖，明说+自动推 */
setTimeout(()=>{
  if(worldDirty&&(diffs.r.length||Object.keys(diffs.a).length)){
    const n=diffs.r.length+Object.keys(diffs.a).length;
    if(NPC_TOKEN){
      showStele('你这里有 '+n+' 格没上过云的搭建。\n十秒后自动推——别关页面。');
      setTimeout(()=>{pushWorld();},10000);
    }else{
      showStele('你这里有 '+n+' 格没上过云的搭建，但这台设备还没有令牌。\n点右上角☰→令牌贴一把，或者点「导出搭建」把码发给清言。');
    }
  }
},3500);
/* 首次进入 */
meInit();
/* v48：投影日程从云端读（schedules.json——接口数据，不在代码里；无令牌走同源副本） */
ghGet('schedules.json').then(({data})=>{
  schedData=(data&&data.schedules)||{};
}).catch(()=>{schedData={};});
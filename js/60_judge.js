
function bpCells(bp){
  const c=[],S=11,P=10,R=12,G=9,F=19,T=14,Q=27;
  /* v86尺寸学：基座满铺(dy=0整层)——墙高3(y1-3)——门洞2格高——双坡顶(檐层+脊层)。比例对齐MC小屋(墙4顶2/7×7) */
  const X=bp===3?5:(bp===2?6:(bp===4?9:7));      /* v96：宽放大——单间级起步 */
  const Z=bp===3?5:(bp===5?7:6);                             /* v96：深放大 */
  const wallH=bp===5?4:(bp===2?4:3);              /* 墙高：大堂屋和两层楼4格，其余3格 */
  const doorX=bp===3?1:Math.floor(X/2);
  /* 基座：满铺整层（悬空的根治——内圈外圈都铺） */
  for(let x=0;x<X;x++)for(let z=0;z<Z;z++)c.push([x,0,z,S]);
  /* 墙：外圈，y1到wallH。门洞y1-2两格高；窗在y2/y3前后对开 */
  for(let y=1;y<=wallH;y++)for(let x=0;x<X;x++)for(let z=0;z<Z;z++){
    if(!(x===0||x===X-1||z===0||z===Z-1))continue;
    if(z===0&&x===doorX&&y<=2)continue;                                   /* 门洞两格高 */
    const winY=(y===2&&bp!==2)||(y===3&&bp===2);
    if(winY&&(z===0||z===Z-1)&&(x===1||x===X-2)&&X>=4)c.push([x,y,z,G]);  /* 前后窗 */
    else c.push([x,y,z,P]);
  }
  c.push([doorX,1,0,37]);   /* 门：一格放置，doorGeo自带两格高视觉 */
  /* 双坡顶：坡向z（前后两坡）。檐层y=wallH+1全铺；脊层只铺z中部（Z=4→z1-2；Z=5→z2） */
  const yE=wallH+1;
  for(let x=0;x<X;x++)for(let z=0;z<Z;z++)c.push([x,yE,z,R]);
  const ridgeZ=Z<=5?[1,2]:(Z<=6?[2,3]:[2,3,4]);
  for(let x=0;x<X;x++)for(const z of ridgeZ)c.push([x,yE+1,z,R]);
  /* 楼（bp2）：二层再加一圈矮墙+压顶 */
  if(bp===2){
    for(let x=0;x<X;x++)for(let z=0;z<Z;z++)c.push([x,5,z,R]);   /* 五层檐（两层楼更高） */
    c.push([doorX,3,0,G]);
  }
  /* 门旁炬（大堂屋双炬） */
  if(bp===5){c.push([1,1,0,T],[X-2,1,0,T]);}
  /* 门口牌 */
  c.push([doorX,0,-1,Q]);
  /* 长屋的院（bp4）：屋后篱笆 */
  if(bp===4){
    c.push([0,1,Z+1,F],[X-1,1,Z+1,F],[Math.floor(X/2),1,Z+1,F]);   /* v86.1：篱和基座同z（错位悬空修掉） */
    c.push([0,0,Z+1,S],[X-1,0,Z+1,S],[Math.floor(X/2),0,Z+1,S]);
  }
  return c;
}
function buildVillageRoads(){   /* v85：MC村庄结构学——街道是村庄的骨架。打谷场（火塘周5×5）+辐射路到各户门口+每村一口井 */
  if(!VH.homes||!VH.camps)return;
  WELLS=[];
  let changed=false;
  for(const camp of VH.camps){
    const cx=camp[0],cz=camp[2];
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      if(dx===0&&dz===0)continue;   /* 火塘本身不动 */
      const x=cx+dx,z=cz+dz,y=surfaceY(x,z);
      if(inW(x,y,z)&&(world[idx(x,y,z)]===1||world[idx(x,y,z)]===17)){world[idx(x,y,z)]=11;changed=true;}
    }
    const wx=cx+4,wz=cz,wy=surfaceY(wx,wz);   /* 井：打谷场东侧 */
    if(inW(wx,wy,wz)&&world[idx(wx,wy,wz)]===1){
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        world[idx(wx+dx,wy,wz+dz)]=(dx===0&&dz===0)?8:3;
      }
      WELLS.push([wx+0.5,wz+0.5]);
      changed=true;
    }
    /* v117：camp接驳纵街——南岸camp(447,189)在纵街x=442/456之间，camp到街网断着（TA：新工地没路的另一半） */
    {
      const NBx=[298,312,326,340],SBx=[442,456];
      const arr=cx>400?SBx:NBx;
      let nx2=arr[0];for(const n2 of arr){if(Math.abs(n2-cx)<Math.abs(nx2-cx))nx2=n2;}
      if(nx2!==cx){
        const sx=nx2>cx?1:-1,stepN=Math.abs(nx2-cx);
        for(let st=0;st<=stepN;st++){
          const x=cx+sx*st,z=cz,y=surfaceY(x,z);
          if(inW(x,y,z)){const t=world[idx(x,y,z)];if((t===1||t===17)&&!villCells[x+','+y+','+z]){world[idx(x,y,z)]=11;changed=true;}}
        }
      }
    }
    for(const id in VH.homes){   /* 路：火塘到本村各户门口 */
      const vh=VH.homes[id];
      if(Math.abs(vh.plot[0]-cx)>70||Math.abs(vh.plot[2]-cz)>70)continue;
      const tx=vh.plot[0]+2,tz=vh.plot[2]-1;
      const steps=Math.max(2,Math.max(Math.abs(tx-cx),Math.abs(tz-cz)));
      for(let s=0;s<=steps;s++){
        const x=cx+Math.round((tx-cx)*s/steps),z=cz+Math.round((tz-cz)*s/steps);
        const y=surfaceY(x,z);
        if(inW(x,y,z)){const t=world[idx(x,y,z)];
          if(t===1||t===17){world[idx(x,y,z)]=11;changed=true;}
        }
      }
    }
  }
  /* v99：正交街网——户与户连通。北岸纵街x=298/312/326/340，横街z=333/350/364/378；南岸纵x=442/456，横z=208/222/236。路到河岸为止（等桥）。 */
  const [tA,tR]=taSets();
  const lay=(x,z,rh)=>{   /* v107：随坡缓降——每格高程限±1，永远向地形回归（TA：路比房子都高，要随坡缓降） */
    const gy=groundY(x,z);
    if(gy<1||!inW(x,gy,z))return false;
    const base=(rh===null||rh===undefined)?gy:rh;
    let py;
    if(gy>base+1)py=base+1;         /* 陡上坡：每格最多升1（嵌进崖壁成台阶） */
    else if(gy<base-1)py=base-1;    /* 下坡：每格最多降1（缓降，不卡高处） */
    else py=gy;                      /* 平缓：贴地 */
    for(let yy=Math.min(py,gy);yy<=Math.max(py,gy);yy++){
      const k=x+','+yy+','+z;
      if(tA.has(k)||tR.has(k))continue;
      const b=get(x,yy,z);
      if(b===8)continue;
      if(b===11)continue;
      if(b===AIR){world[idx(x,yy,z)]=11;changed=true;}   /* 悬空段填实=阶梯路基（缓降每格≤1，是坡不是墙） */
    }
    {   /* 地表层本身（贴地段） */
      const k=x+','+gy+','+z;
      if(!tA.has(k)&&!tR.has(k)){const b=get(x,gy,z);if(b!==11&&b!==8&&b!==AIR){world[idx(x,gy,z)]=11;changed=true;}}
    }
    for(let cy=Math.max(py,gy)+1;cy<H-1;cy++){const tb=get(x,cy,z);if(tb===5||tb===6||tb===15||tb===16)world[idx(x,cy,z)]=AIR;else break;}
    return py;
  };
  const roadSeg=(x1,z1,x2,z2)=>{
    const x1i=Math.round(x1),z1i=Math.round(z1),x2i=Math.round(x2),z2i=Math.round(z2);
    const dx=x2i>x1i?1:(x2i<x1i?-1:0),dz=z2i>z1i?1:(z2i<z1i?-1:0);
    const ox=dz!==0?1:0, oz=dx!==0?1:0;   /* v100：双宽——横路沿z加宽、纵路沿x加宽 */
    let refH=null;   /* v108：每条街独立起坡——跨街继承会让下一条街从几百格外的高度悬空起步（TA：不和对面接上） */
    let x=x1i,z=z1i,guard=0;
    while(guard++<400){
      const p1=lay(x,z,refH);
      if(p1===false)break;   /* 主线碰水/界外=路断 */
      refH=p1;               /* 高程只跟主线 */
      lay(x+ox,z+oz,refH);   /* 第二宽：借主线高程，不回写 */
      if(x===x2i&&z===z2i)break;
      if(x!==x2i)x+=dx;else if(z!==z2i)z+=dz;else break;
    }
  };
  for(const nx of [298,312,326,340])roadSeg(nx,390,nx,308);
  for(const hz of [333,350,364,378])roadSeg(280,hz,352,hz);
  for(const nx of [442,456])roadSeg(nx,186,nx,258);
  for(const hz of [208,222,236])roadSeg(426,hz,472,hz);
  /* v101：门前支线不再系统直铺——由迁入户自己修（先有路后有工地）；startDay前的老户视为已修成 */
  const gday0=Math.floor((Date.now()-VH.up)/21600000);   /* v117修：startDay是游戏日制（v96数据54-59），原来拿现实日比——单位错配，支线done永远=0，南岸6户一条支路都没修过（TA：新工地没路过去的真根） */
  for(const id in VH.homes){const vh=VH.homes[id];
    const rp=roadPeriodOf(vh,gday0);
    if(!rp)continue;
    const line=roadLineOf(vh);
    let refR=null;   /* v108：每条支线独立起坡 */
    for(let i=0;i<rp.done;i++){
      const [rx,rz]=line[i];const gy=groundY(rx,rz);
      if(gy<1)break;
      if(refR===null)refR=gy;
      let py;
      if(gy>refR+1)py=refR+1;
      else if(gy<refR-1)py=refR-1;
      else py=gy;
      refR=py;   /* v107：限速高程，随坡缓降 */
      for(let yy=Math.min(py,gy);yy<=Math.max(py,gy);yy++){
        const k=rx+','+yy+','+rz;
        if(!inW(rx,yy,rz)||villCells[k])continue;
        const b=get(rx,yy,rz);
        if(b===8)continue;
        if(b===11){villCells[k]='road';continue;}
        if(yy===gy&&(b===5||b===6||b===15||b===16)){for(let cy=gy+1;cy<H-1;cy++){const tb=get(rx,cy,rz);if(tb===5||tb===6||tb===15||tb===16)world[idx(rx,cy,rz)]=AIR;else break;}}
        if(b===AIR||yy===gy){world[idx(rx,yy,rz)]=11;villCells[k]='road';changed=true;}
      }
    }
  }
  if(changed)rebuild();
}
/* ===== v123邻近感知（TA：以我为半径，到我到村的时候AI唤醒更频一点，侦测周边环境做处置） =====
   近村→节流生成感知包（坑/挡路树/施工/在线NPC）→PUT perception.json→push触发workflow→
   judge_build确定性转处置计划→客户端拉回执行。坑和树的修复不需要GLM判断（确定性修复），
   GLM层留给经营决策（TA 11/1架构：事件库本地建，GLM做选择）。 */
let lastPerceptT=0;
function scanPitsAround(cx,cz,R){   /* 坑：外环16格判据（v121同源）——连通坑记cells+rimY（填到最低沿） */
  const pits=[],seen={};
  for(let x=cx-R;x<=cx+R;x++)for(let z=cz-R;z<=cz+R;z++){
    if(seen[x+','+z])continue;
    const gy=groundY(x,z);if(gy<2)continue;
    let rim=0,rims=[];
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      if(!dx&&!dz)continue;if(Math.abs(dx)===2&&Math.abs(dz)===2)continue;
      const gyN=groundY(x+dx,z+dz);if(gyN>=1&&gyN>gy+1){rim++;rims.push(gyN);}
    }
    if(rim<6)continue;
    /* 坑心：洪水填充连通坑格（比rim低2+的格），限200格 */
    const cells=[],q=[[x,z]],pseen={};
    let rimY=999;
    while(q.length&&cells.length<200){
      const[px2,pz2]=q.shift();
      const k2=px2+','+pz2;if(pseen[k2])continue;pseen[k2]=1;
      const g2=groundY(px2,pz2);if(g2<1)continue;
      let deep=false;
      for(let dx=-2;dx<=2&&!deep;dx++)for(let dz=-2;dz<=2;dz++){
        if(!dx&&!dz)continue;if(Math.abs(dx)===2&&Math.abs(dz)===2)continue;
        const gyN=groundY(px2+dx,pz2+dz);if(gyN>=1&&gyN>g2+1){deep=true;if(gyN<rimY)rimY=gyN;break;}
      }
      if(!deep)continue;
      cells.push([px2,pz2]);seen[k2]=1;
      q.push([px2+1,pz2],[px2-1,pz2],[px2,pz2+1],[px2,pz2-1]);
    }
    if(cells.length>=3)pits.push({x:x,z:z,rimY:rimY<999?rimY:gy+2,cells:cells});
    if(pits.length>=3)return pits;
  }
  return pits;
}
function scanTreeBlocks(cx,cz,R){   /* 挡路树：本列有树干且本列/4邻列有路面（v121扫树同源） */
  const out=[];
  for(let x=cx-R;x<=cx+R;x++)for(let z=cz-R;z<=cz+R;z++){
    let trunk=false,road=false;
    for(let cy=1;cy<H-1;cy++){
      if(get(x,cy,z)===5)trunk=true;
      if(road)continue;
      for(const[dx2,dz2]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]])if(get(x+dx2,cy,z+dz2)===11){road=true;break;}
      if(trunk&&road)break;
    }
    if(trunk&&road)out.push([x,z]);
    if(out.length>=5)return out;
  }
  return out;
}
function tickPerception(){
  if(!ME||!VH.camps||!VH.up)return;
  const now=Date.now();
  if(now-lastPerceptT<480000)return;   /* 节流8分钟 */
  let nc=-1;
  VH.camps.forEach((c,ci)=>{
    const cc=campCenter(ci);
    if(cc&&Math.hypot(p.x-cc[0],p.z-cc[1])<30)nc=ci;
  });
  if(nc<0)return;   /* 不近村，不感知 */
  lastPerceptT=now;
  const R=20;
  const pits=scanPitsAround(Math.round(p.x),Math.round(p.z),R);
  const trees=scanTreeBlocks(Math.round(p.x),Math.round(p.z),R);
  const construction=[];
  for(const id in VH.homes){const vh=VH.homes[id];
    if(vh.startDay&&!villBuilt[id])construction.push({id:id,name:vh.name,day:Math.floor((now-VH.up)/DAY_MS)});
  }
  const online=[];
  for(const id in npcs){const n=npcs[id];
    if(n.lastSeen&&now-n.lastSeen<120000&&n.name)online.push(n.name);
  }
  const pkg={t:now,who:ME.name,pos:[Math.round(p.x),Math.round(p.z)],nearCamp:nc,
    pits:pits,treeBlocks:trees,construction:construction.slice(0,6),npcsOnline:online.slice(0,8),
    cunKu:(MINDS&&MINDS.cunKu)?{粮:MINDS.cunKu['粮']||0,种子:MINDS.cunKu['种子']||0}:null};
  /* 有异常或哪怕没异常也上报（心跳——判定者知道TA在村） */
  ghPut('perception.json',pkg,'感知包：'+ME.name+'近村'+(pits.length?('·'+pits.length+'坑'):'')+(trees.length?('·'+trees.length+'挡路树'):'')).then(()=>{
    /* v123：感知包上云即唤醒判定者（TA：到我到村AI唤醒更频）——dispatch一轮（答话+建设账+处置计划） */
    if(NPC_TOKEN)ghFetch('https://api.github.com/repos/inklotus007/hetan/actions/workflows/talk_reply.yml/dispatches',{method:'POST',headers:{'Authorization':'bearer '+NPC_TOKEN,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({ref:'main'})},10000).catch(()=>{});
  }).catch(()=>{});
  /* 近村快拉：60秒后拉一轮villagers_memory——处置计划和建设落地更快到手上 */
  setTimeout(function(){if(NPC_TOKEN)pullVillagers().catch(function(){});},60000);
}
let perceptTick=0;
/* ===== v120公仓：村库的脸——建筑+粮堆+账台（账在memory.cunKu，仓是它的身体） ===== */
const CUNKU_POS=[304,330];   /* 北岸打谷场西侧：避开纵街x312/井316/满仓宅300-309,338-347 */
function buildCunKuWan(){
  if(!VH.homes||cunkuBuilt)return;
  cunkuBuilt=true;
  const[taA,taR]=taSets();
  /* v121：两村各一仓（TA：只建了一个村的吗）——campCenter旁探位：从中心向西找5×3可落地 */
  for(const ci of [0,1]){
    const c0=campCenter(ci);
    if(!c0)continue;
    let wx=Math.round(c0[0])-4, wz=Math.round(c0[1])-2, ok0=false;
    for(let t=0;t<6;t++){
      const tx=wx-t*2, tz=wz-((t%2)?2:0);
      let spot=true;
      for(let dx=0;dx<5&&spot;dx++)for(let dz=0;dz<3&&spot;dz++){
        const g=groundY(tx+dx,tz+dz);
        if(g<1||villCells[(tx+dx)+','+g+','+(tz+dz)]||taA.has((tx+dx)+','+(g+1)+','+(tz+dz)))spot=false;
      }
      if(spot){wx=tx;wz=tz;ok0=true;break;}
    }
    if(!ok0)continue;
    buildOneCunKu(wx,wz,taA,taR,ci);
  }
}
function buildOneCunKu(wx,wz,taA,taR,ci){
  let placed=0;
  const baseY={};   /* v120修：基座统一预取（v111/v113同坑三踩——顶板落下后surfaceY变，groundY漂移，dy1粮堆算到石台自己的格子上被villCells拒） */
  for(let dx=0;dx<5;dx++)for(let dz=0;dz<3;dz++){const g=groundY(wx+dx,wz+dz);baseY[dx+','+dz]=(g<1)?11:g;}
  const put=(dx,dy,dz,t)=>{   /* dy相对预取地面 */
    const x=wx+dx,z=wz+dz;
    const g=baseY[dx+','+dz];if(!g||g<1)return;
    const y=g+dy;if(!inW(x,y,z))return;
    const k=x+','+y+','+z;
    if(taA.has(k)||taR.has(k)||villCells[k])return;
    const cur=world[idx(x,y,z)];
    if(cur!==AIR&&cur!==17&&cur!==1&&cur!==2)return;   /* v120修：草/草丛/土可清（boot系统建筑，TA/villCells已挡）——粮堆灯台不被地表草挡 */
    world[idx(x,y,z)]=t;villCells[k]='cunku';placed++;
  };
  /* 石基5×3 + 木墙四角柱2高 + 顶板10 + 仓内粮堆（石台上麦黄）+ 门口账台（石+灯） */
  for(let dx=0;dx<5;dx++)for(let dz=0;dz<3;dz++)put(dx,0,dz,3);
  for(const[px,pz]of[[0,0],[4,0],[0,2],[4,2]]){put(px,1,pz,5);put(px,2,pz,5);}
  for(let dx=0;dx<5;dx++)for(let dz=0;dz<3;dz++)put(dx,3,dz,10);
  put(2,0,2,8);put(2,1,2,22);   /* 账台：石台+灯（村长的案头） */
  /* v122：粮袋位记录——袋数=村库粮/100，tickCunKuBags动态码（替换v120的假粮堆49——TA：是真的有那个方块） */
  cunkuSlots[ci]=[[2,1],[3,1],[0,1],[1,1],[2,2],[3,2]].map(function(p2){return [wx+p2[0],wz+p2[1]];});
  put(4,1,1,13);   /* 门口台阶13（南侧开口进出） */
  if(placed){
    console.log('v121：公仓落成camp'+ci+'——'+placed+'格');
    /* 名字牌（TA：在地图上标一下名字）——复用村民牌画布，本地mesh */
    try{
      const gy=groundY(wx+2,wz+3);
      if(gy>=1&&!villSignMesh['vill_cunku'+ci]){
        const g2=new THREE.Group();
        const pm=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.1,0.08),new THREE.MeshLambertMaterial({map:texOf('wood_side')}));
        pm.position.y=0.55;g2.add(pm);
        const cv=document.createElement('canvas');cv.width=64;cv.height=64;const cx2=cv.getContext('2d');
        cx2.fillStyle='#e8dcc0';cx2.fillRect(0,0,64,64);cx2.fillStyle='#3a2a1a';
        cx2.font='bold 26px serif';cx2.textAlign='center';cx2.textBaseline='middle';
        cx2.fillText('公',32,20);cx2.fillText('仓',32,48);
        const tx2=new THREE.CanvasTexture(cv);
        const board=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.06),[new THREE.MeshLambertMaterial({map:tx2}),new THREE.MeshLambertMaterial({map:tx2}),new THREE.MeshLambertMaterial({color:0x8a6a48}),new THREE.MeshLambertMaterial({color:0x8a6a48}),new THREE.MeshLambertMaterial({map:tx2}),new THREE.MeshLambertMaterial({map:tx2})]);
        board.position.y=1.15;g2.add(board);
        g2.position.set(wx+2.5,gy+1,wz+3.5);
        scene.add(g2);villSignMesh['vill_cunku'+ci]=g2;
      }
    }catch(e){}
  }
  /* 村长守恒（守北岸仓）：npcs.json没他就本地补渲染条目（不写云） */
  if(ci===0&&typeof npcs==='object'&&npcs&&!npcs['p_cunzhang']){
    npcs['p_cunzhang']={id:'p_cunzhang',name:'村长',seed:30001,coat:'#3a3a44',skin:'#e8c39e',home:[wx+2,wz+3],pos:[wx+2.5,wz+3.5],yaw:0,online:true,lastSeen:Date.now()};
    npcList=Object.values(npcs);
    console.log('v121：村长守北岸仓（本地补）');
  }
}
let cunkuBuilt=false;
const cunkuSlots={};   /* v122：每村公仓的粮袋位（世界坐标），按袋数从前往后码 */
function tickCunKuBags(){   /* v122：村库粮→粮袋实体同步（MINDS到了+日切时跑） */
  if(!cunkuBuilt||!MINDS||!MINDS.cunKu)return;
  const want=Math.max(0,Math.min(6,Math.floor((MINDS.cunKu['粮']||0)/100)));
  const[taA,taR]=taSets();
  for(const ci in cunkuSlots){
    const slots=cunkuSlots[ci];
    for(let i2=0;i2<slots.length;i2++){
      const[gx,gz]=slots[i2];
      const g=groundY(gx,gz);if(g<1)continue;
      const y2=g+1,k=gx+','+y2+','+gz;
      if(taA.has(k)||taR.has(k))continue;
      const cur=world[idx(gx,y2,gz)];
      if(i2<want){if(cur===AIR||cur===1||cur===2||cur===49)world[idx(gx,y2,gz)]=52;}
      else if(cur===52)world[idx(gx,y2,gz)]=AIR;
    }
  }
}
let lastTreeSweep=-1;
function sweepRoadTrees(){   /* v121：树挡路（TA：有树把路挡着了也不会清理掉）——两村路网矩形日切一扫：树干脚下或4邻是路面→整列伐（树干+半径2树冠全清；v104同族） */
  const gday=Math.floor((Date.now()-(VH.up||Date.now()))/DAY_MS);
  if(gday===lastTreeSweep)return;
  lastTreeSweep=gday;
  if(!VH.homes)return;
  const rects=[[296,458,198,402],[414,486,180,268]];
  let cut=0;
  for(const[x0,x1,z0,z1]of rects){
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      /* v121修：纵向找树干（surfaceY是树冠顶，靠它判定树干格会漏）——本列有5号且本列/4邻列有11号路面=挡路树 */
      let trunk=false,road=false;
      for(let cy=1;cy<H-1;cy++){
        if(get(x,cy,z)===5)trunk=true;
        if(road)continue;
        for(const[dx2,dz2]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]])if(get(x+dx2,cy,z+dz2)===11){road=true;break;}
        if(trunk&&road)break;
      }
      if(!(trunk&&road))continue;
      for(let cy=1;cy<H-1;cy++)if(get(x,cy,z)===5)world[idx(x,cy,z)]=AIR;   /* v121修：本列5号全清（从y1起会被土层break挡住） */
      for(let dx2=-2;dx2<=2;dx2++)for(let dz2=-2;dz2<=2;dz2++)for(let cy=1;cy<H-1;cy++){
        if(get(x+dx2,cy,z+dz2)===6)world[idx(x+dx2,cy,z+dz2)]=AIR;   /* 树冠半径2全清 */
      }
      cut++;
    }
  }
  if(cut)console.log('v121：路网扫树——伐了'+cut+'棵挡路的');
}
/* ===== v117掌灯：路口灯柱+户门口灯+施工火炬（TA：一到夜晚黑漆漆的） ===== */
function lampSpotFree(x,z){
  for(let dy=0;dy<3;dy++){
    const g=groundY(x,z);if(g<1)return false;   /* v118修：surfaceY被树冠骗（v102老坑又踩）——groundY扫真地形 */
    const y=g+1+dy;if(!inW(x,y,z))return false;
    const k=x+','+y+','+z;
    if(world[idx(x,y,z)]!==AIR&&world[idx(x,y,z)]!==17)return false;
    if(villCells[k])return false;
  }
  const g=groundY(x,z);const b=get(x,g,z);
  return b===1||b===2;
}
function putLamp(x,z){
  const[taA,taR]=taSets();
  const g=groundY(x,z);if(g<1)return false;   /* v118：同上树冠坑 */
  for(let dy=1;dy<=2;dy++){
    const k=x+','+(g+dy)+','+z;
    if(taA.has(k)||taR.has(k))return false;
  }
  const kb=x+','+g+','+z;
  if(villCells[kb]||taA.has(kb)||taR.has(kb))return false;
  const base=get(x,g,z);
  if(base!==1&&base!==2&&base!==17)return false;
  world[idx(x,g+1,z)]=3;world[idx(x,g+2,z)]=22;
  villCells[kb]='lamp';villCells[x+','+(g+1)+','+z]='lamp';villCells[x+','+(g+2)+','+z]='lamp';
  return true;
}
function buildStreetLamps(){
  if(!VH.homes||lampsBuilt)return;
  lampsBuilt=true;
  let n=0;
  /* 路口灯：街网每个交点的(+1,+1)路缘角 */
  const NB=[298,312,326,340],SBx=[442,456];
  const NBz=[333,350,364,378],SBz=[208,222,236];
  const tryLamp=(x,z)=>{for(const[ox,oz]of[[1,1],[-1,-1],[1,-1],[-1,1]]){if(lampSpotFree(x+ox,z+oz)&&putLamp(x+ox,z+oz)){n++;return true;}}return false;};   /* v118：路口四角轮流——一角被占换别角 */
  for(const nx of NB)for(const hz of NBz)tryLamp(nx,hz);
  for(const nx of SBx)for(const hz of SBz)tryLamp(nx,hz);
  /* 户灯：每户门口侧找干净草地；施工中的户加一支火炬 */
  const gday0=Math.floor((Date.now()-VH.up)/21600000);
  for(const id in VH.homes){
    const vh=VH.homes[id];
    const tx=vh.plot[0]+2,tz=vh.plot[2]-1;
    let done=false;
    for(const[dx,dz]of[[1,0],[-1,0],[2,0],[-2,0],[1,-1],[-1,-1]]){
      if(lampSpotFree(tx+dx,tz+dz)&&putLamp(tx+dx,tz+dz)){done=true;n++;break;}
    }
    /* 施工火炬：进度未满的户门口一支（v101先有路再有工地的灯） */
    const cells=bpCells(vh.bp);
    const sdEff=vh.startDay?vh.startDay+1:0;
    const prog=villagerProgress(vh,Date.now(),sdEff);
    if(prog<cells.length){
      for(const[dx,dz]of[[2,0],[-2,0],[2,1],[-2,1]]){
        const x=tx+dx,z=tz+dz;
        if(!lampSpotFree(x,z))continue;
        const g=groundY(x,z);   /* v118：树冠坑同修 */
        const k=x+','+(g+1)+','+z;
        const[taA,taR]=taSets();
        if(taA.has(k)||taR.has(k))continue;
        world[idx(x,g+1,z)]=14;villCells[k]='torch_site';n++;break;
      }
    }
  }
  if(n)console.log('v117：掌灯——'+n+'盏（路口+户灯+工地火炬）');
}
let lampsBuilt=false;
/* ===== v111农业与营生家什（TA：账上的粮要长在地里，打鱼的家里该有渔网） ===== */
let farmCells=null,farmStageCur=null,farmBuilt=false,binCells={},binLevels={};
const FARM_STAGE=[[242,25,'wheat_y'],[26,104,'wheat_g'],[105,119,'wheat_r'],[120,122,'stubble'],[123,125,null],[126,222,'corn_g'],[223,237,'corn_r'],[238,239,'stubble'],[240,241,null]];
function farmStageCal(d){
  for(let i=0;i<FARM_STAGE.length;i++){const seg=FARM_STAGE[i];
    if(seg[0]<=seg[1]){if(d>=seg[0]&&d<=seg[1])return seg[2];}
    else{if(d>=seg[0]||d<=seg[1])return seg[2];}
  }
  return null;
}
function findFarmPatch(cx,cz){
  const[taA,taR]=taSets();
  for(let r=16;r<=56;r+=2){
    for(let a=0;a<16;a++){
      const ang=a*Math.PI/8+((r%8)*0.19);
      const px=Math.round(cx+Math.cos(ang)*r),pz=Math.round(cz+Math.sin(ang)*r);
      let ok=true;
      for(let dx=0;dx<18&&ok;dx++)for(let dz=0;dz<14;dz++){   /* v122：田扩大12×8→18×14（TA：真种田的话那田也太小了） */
        const x=px+dx,z=pz+dz;
        if(!inW(x,1,z)){ok=false;break;}
        const g=groundY(x,z);if(g<2){ok=false;break;}
        const b=get(x,g,z);
        if(b!==1||villCells[x+','+g+','+z]){ok=false;break;}
        if(taA.has(x+','+g+','+z)||taR.has(x+','+g+','+z)){ok=false;break;}
        for(const pid in VH.homes){const ph=VH.homes[pid].plot;if(Math.abs(x-ph[0])<=8&&Math.abs(z-ph[2])<=7){ok=false;break;}}
        if(!ok)break;
      }
      if(!ok)continue;
      let edgeOk=true;
      for(let dx=-1;dx<19&&edgeOk;dx++){for(let dz=-1;dz<15;dz+=15){
        const x=px+dx,z=pz+dz;if(!inW(x,1,z)){edgeOk=false;break;}
        const g=groundY(x,z);if(g<1||get(x,g,z)===8){edgeOk=false;break;}
      }}
      if(edgeOk)return[px,pz];
    }
  }
  return null;
}
let farmByCamp={};
function buildFarm(){
  if(!VH.camps||farmBuilt)return;
  farmBuilt=true;farmCells=[];
  farmByCamp={};
  const[taA,taR]=taSets();
  VH.camps.forEach((c,ci)=>{
    const patch=findFarmPatch(c[0],c[2]);
    if(!patch)return;   /* v122 forEach：continue改return */
    for(let dx=0;dx<18;dx++)for(let dz=0;dz<14;dz++){   /* v122修：铺设跟搜索同尺寸18×14（原来只铺12×8——搜索找到了大地只铺小田） */
      const x=patch[0]+dx,z=patch[1]+dz;
      const g=groundY(x,z);if(g<2)continue;
      const k=x+','+g+','+z;
      if(taA.has(k)||taR.has(k))continue;
      if(world[idx(x,g,z)]!==1)continue;
      world[idx(x,g,z)]=45;
      farmCells.push([x,g+1,z]);
      (farmByCamp[ci]=farmByCamp[ci]||[]).push([x,g+1,z]);   /* v122：田按村分组——播种/收成按村走（种子不够可以只荒一村） */
    }
    /* v122：田角工具架——农具实体（TA：种地得有锄头） */
    if(farmByCamp[ci]&&farmByCamp[ci].length){
      const fc0=farmByCamp[ci][0];
      const gx=fc0[0]-1, gz=fc0[2]-1, gy=groundY(gx,gz);
      if(gy>=1&&inW(gx,gy+1,gz)&&get(gx,gy+1,gz)===AIR&&world[idx(gx,gy,gz)]!==8){
        world[idx(gx,gy+1,gz)]=54;
        villCells[gx+','+(gy+1)+','+gz]='farmtool'+ci;
        console.log('v122：工具架立在田角——camp'+ci);
      }
    }
  });
  if(farmCells.length){
    farmStageCur=farmStageCal(calNow().day%360);
    applyFarmStage(farmStageCur);
    farmEconInit();   /* v122：农事经济——种子/收成真流转 */
    console.log('v111：麦田落成——'+farmCells.length+'格，当前'+(farmStageCur||'整地'));
  }else console.log('v111：没找到整块麦田地——营地周边都占了，明版再挪');
}
function applyFarmStage(st){
  if(!farmCells)return;
  const[taA,taR]=taSets();
  const MAP={'wheat_y':46,'wheat_g':47,'wheat_r':48,'corn_g':49,'corn_r':50,'stubble':51};
  for(let i=0;i<farmCells.length;i++){
    const x=farmCells[i][0],y=farmCells[i][1],z=farmCells[i][2];
    const k=x+','+y+','+z;
    if(taA.has(k)||taR.has(k))continue;
    const cur=world[idx(x,y,z)];
    if(cur!==AIR&&!(cur>=46&&cur<=51))continue;
    world[idx(x,y,z)]=st?MAP[st]:AIR;
  }
}
/* ===== v122农事经济：种子→田→粮真流转（TA：种地得有种子，不是摆块地生成苗苗） ===== */
let farmEconDay=null;
function farmEconInit(){
  try{
    const d=calNow().day%360;
    farmEconApply(d);   /* 开村时补当天的农事状态（中途上线的也要对） */
  }catch(e){}
}
function farmEconApply(d){
  if(!farmByCamp)return;
  const ck=(MINDS&&MINDS.cunKu)||null;
  const seeds=ck?Math.max(0,ck['种子']||0):2;   /* 没账时按有种子算（视觉不卡） */
  /* 播种窗口：玉米123-125，冬麦240-241+242——种子扣账在服务器（judge_build），这里管田活/荒+种子袋实体 */
  const sowCorn=(d>=123&&d<=125), sowWheat=(d>=240||d<=25);
  const harvestCorn=(d===238||d===239), harvestWheat=(d===120||d===121||d===122);
  /* 田的活/荒：播种窗口过后看种子账——种子0的村荒（applyFarmStage(null)只荒该村） */
  for(const ci in farmByCamp){
    const alive=seeds>0;
    if(!alive&&(sowCorn||sowWheat)){
      /* 荒：该村格子清苗 */
      for(const c of farmByCamp[ci]){
        const cur=world[idx(c[0],c[1],c[2])];
        if(cur>=46&&cur<=51)world[idx(c[0],c[1],c[2])]=AIR;
      }
    }
  }
  /* 种子袋实体：播种窗口田角出现 */
  const wantSeed=(sowCorn||sowWheat)&&seeds>0;
  for(const ci in farmByCamp){
    if(!farmByCamp[ci].length)continue;
    const fc0=farmByCamp[ci][0];
    const gx=fc0[0]-2, gz=fc0[2]-1;
    const gy=groundY(gx,gz);
    const k=gx+','+(gy+1)+','+gz;
    if(wantSeed&&gy>=1&&get(gx,gy+1,gz)===AIR&&world[idx(gx,gy,gz)]!==8){
      world[idx(gx,gy+1,gz)]=53;
      villCells[k]='seedbag'+ci;
    }else if(!wantSeed&&villCells[k]&&String(villCells[k]).indexOf('seedbag')===0){
      world[idx(gx,gy+1,gz)]=AIR;delete villCells[k];
    }
  }
}
function tickFarm(){
  if(!farmCells||!VH||!VH.up)return;
  const st=farmStageCal(calNow().day%360);
  if(st===farmStageCur)return;
  farmStageCur=st;
  applyFarmStage(st);
  farmEconApply(calNow().day%360);   /* v122：农事视觉（种子袋/荒田）随季走 */
  tickCunKuBags();   /* v122：粮袋随账走 */
  rebuild();
  if(st==='stubble')console.log('v111：开镰了——地里换茬');
}
/* 营生家什：每户的营生在地上要有物件（TA：纸面系统要看得见） */
function propCellsFor(nm){
  const cells=[];
  const add=(dx,dz,dy,t)=>cells.push([dx,dz,dy,t]);
  if(nm==='满仓'){add(-2,-1,0,5);add(-2,-1,1,5);add(-1,-1,0,5);add(-1,-1,1,5);add(-2,-2,0,5);}
  else if(nm==='凤兰'||nm==='爱香'){add(5,-1,0,19);add(6,-1,0,19);add(5,0,0,19);add(6,0,0,19);add(5,-1,1,10);add(6,-1,1,10);add(5,0,1,10);add(6,0,1,10);}
  else if(nm==='建军'){add(-2,-1,0,3);add(-2,-1,1,3);add(-1,-1,0,3);}
  else if(nm==='秋生'){add(-2,-1,0,5);add(-2,-1,1,5);add(-1,-1,0,5);add(-1,-1,1,5);add(-1,0,0,5);add(-2,0,0,5);add(5,-1,0,21);}
  else if(nm==='秀兰'){add(5,-1,0,21);add(5,-1,1,3);add(6,-1,0,31);}
  else if(nm==='银锁'){add(5,-1,0,4);add(6,-1,0,4);add(5,-1,1,4);}
  else return null;
  return cells;
}
function placePropGroup(nm,cells){
  const[taA,taR]=taSets();
  const placed=[];
  const baseY={};   /* v111：同组基座统一取高——dy=1的格在dy=0放上后再算groundY会爬到桌上（机头上天的实底） */
  for(const c of cells){if(c[2]===0){const x=cells._bx+c[0],z=cells._bz+c[1];const g=groundY(x,z);if(g>=1)baseY[c[0]+','+c[1]]=g;}}
  for(const c of cells){
    const x=cells._bx+c[0],z=cells._bz+c[1],dy=c[2],t=c[3];
    let g;
    if(dy===0){g=groundY(x,z);}else{g=baseY[c[0]+','+c[1]];if(g===undefined)continue;}
    if(g<1)continue;
    const base=get(x,g,z),kk=x+','+g+','+z;
    if(dy===0){if(base!==1&&base!==17&&base!==2)continue;if(villCells[kk]||taA.has(kk)||taR.has(kk))continue;}
    const up=x+','+(g+1+dy)+','+z;
    if(world[idx(x,g+1+dy,z)]!==AIR&&!(dy===0&&(base===17||base===2)))continue;
    if(dy>0&&(taA.has(up)||taR.has(up)))continue;
    world[idx(x,g+1+dy,z)]=t;villCells[kk]=villCells[kk]||('prop_'+nm);
    placed.push([x,g+1+dy,z]);
  }
  return placed;
}
function buildHouseholdProps(){
  if(!VH.homes||propsBuilt)return;
  propsBuilt=true;
  for(const id in VH.homes){
    const vh=VH.homes[id],nm=vh.name;
    if(nm==='来福'){buildFishRack(vh);continue;}
    const cells=propCellsFor(nm);
    if(!cells)continue;
    cells._bx=vh.plot[0];cells._bz=vh.plot[2];
    placePropGroup(nm,cells);
  }
}
function buildFishRack(vh){
  const[taA,taR]=taSets();
  const spot=findWater(vh.plot[0],vh.plot[2]);
  if(!spot)return;
  const wx=Math.round(spot[0]),wz=Math.round(spot[1]);
  let land=null,land2=null;
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
    const x=wx+dx,z=wz+dz;
    if(!inW(x,1,z))continue;
    const g=groundY(x,z);if(g<1)continue;
    const b=get(x,g,z);
    if((b===1||b===2)&&!villCells[x+','+g+','+z]&&!taA.has(x+','+g+','+z)&&!taR.has(x+','+g+','+z)){
      if(!land){land=[x,g,z];}
      else if(!land2&&Math.abs(x-land[0])+Math.abs(z-land[2])===1){land2=[x,g,z];break;}
    }
  }
  if(!land)return;
  const k0=land[0]+','+land[1]+','+land[2];
  if(villCells[k0])return;
  world[idx(land[0],land[1]+1,land[2])]=19;villCells[k0]='prop_来福';
  if(land2){world[idx(land2[0],land2[1]+1,land2[2])]=19;villCells[land2[0]+','+land2[1]+','+land2[2]]='prop_来福';}
}
let propsBuilt=false;
/* ===== v112判定者建设（TA 11/6四层架构·批处理版）：GLM只出意图（无坐标无Y），物理全在本地；
   蓝图程序化锚定地表；选址失败/蓝图被占→ack回账，判定者明天见回音换地方——异步试错闭环 ===== */
function judgeAnchor(near){
  if(near==='fire1'||near==='fire2'){const c=campCenter(near==='fire1'?0:1);return[c[0],c[1]];}
  if(near==='market')return[MKT_FLAG[0],MKT_FLAG[1]];
  if(near==='center'&&VH.camps){const a=campCenter(0),b=campCenter(1);return[Math.round((a[0]+b[0])/2),Math.round((a[1]+b[1])/2)];}
  if(near&&near.indexOf('villager:')===0){const nm=near.slice(9);const vh=Object.values(VH.homes||{}).find(h=>h.name===nm);if(vh)return[vh.plot[0],vh.plot[2]];}
  const c=campCenter(0);return[c[0],c[1]];
}
function judgeSpotNear(ax,az,w,d){
  const[taA,taR]=taSets();
  for(let r=3;r<=14;r++)for(let a=0;a<12;a++){
    const ang=a*Math.PI/6+r*0.31;
    const bx=Math.round(ax+Math.cos(ang)*r),bz=Math.round(az+Math.sin(ang)*r);
    let ok=true;
    for(let dx=0;dx<w&&ok;dx++)for(let dz=0;dz<d;dz++){
      const x=bx+dx,z=bz+dz;
      if(!inW(x,1,z)){ok=false;break;}
      const g=groundY(x,z);if(g<2){ok=false;break;}
      const b=get(x,g,z);
      if(b!==1&&b!==2&&b!==17){ok=false;break;}   /* 只落草/土——田路集市宅子都不压 */
      const k=x+','+g+','+z;
      if(villCells[k]||taA.has(k)||taR.has(k)){ok=false;break;}
      const up=get(x,g+1,z);
      if(up!==AIR&&up!==17){ok=false;break;}
    }
    if(ok)return[bx,bz];
  }
  return null;
}
function judgeCellsFor(type){
  const c=[];
  if(type==='凉亭'){for(const[px,pz]of[[0,0],[2,0],[0,2],[2,2]]){c.push([px,1,pz,5]);c.push([px,2,pz,5]);}for(let dx=0;dx<3;dx++)for(let dz=0;dz<3;dz++)c.push([dx,3,dz,10]);}
  else if(type==='花圃'){c.push([0,1,0,15]);c.push([1,1,0,16]);c.push([2,1,0,15]);}
  else if(type==='灯柱'){c.push([0,1,0,3]);c.push([0,2,0,22]);}
  else if(type==='石凳'){c.push([0,1,0,26]);c.push([1,1,0,26]);}
  else if(type==='水井'){for(let dx=0;dx<3;dx++)for(let dz=0;dz<3;dz++)c.push([dx,1,dz,(dx===1&&dz===1)?8:3]);}
  else if(type==='铁匠铺'){   /* v119：石基3×3+四柱+顶板+炉+砧——大件（木30石20钱15），全村盖房快三成 */
    for(let dx=0;dx<3;dx++)for(let dz=0;dz<3;dz++)c.push([dx,1,dz,3]);
    for(const[px,pz]of[[0,0],[2,0],[0,2],[2,2]]){c.push([px,2,pz,5]);c.push([px,3,pz,5]);}
    for(let dx=0;dx<3;dx++)for(let dz=0;dz<3;dz++)c.push([dx,4,dz,10]);
    c.push([1,2,1,33]);c.push([1,2,2,26]);   /* 炉+砧 */
  }
  return c;
}
let judgeAckT=null;
function judgePushAck(items){
  if(!NPC_TOKEN||!items.length)return;
  const go=()=>{
    ghGet('build_ack.json').then(({sha,data})=>{
      const q=Array.isArray(data)?data:[];
      const have=new Set(q.map(x=>x.id));
      items.forEach(it=>{if(!have.has(it.id))q.push(it);});
      return ghPut('build_ack.json',q.slice(-40),sha,'建设回执'+items.length+'条');
    }).catch(()=>{});
  };
  clearTimeout(judgeAckT);judgeAckT=setTimeout(go,1500);
}
function executeRepairs(){   /* v123处置执行：感知包→判定者的repair_plans→填坑/伐树（确定性，不占GLM） */
  if(!MINDS||!MINDS.repair_plans||!MINDS.repair_plans.length||!VH.up)return;
  let done;
  try{done=JSON.parse(localStorage.getItem('hetan_repair_done')||'{}');}catch(e){done={};}
  let any=false;
  for(const rp of MINDS.repair_plans){
    if(!rp||!rp.id||done[rp.id])continue;
    done[rp.id]=1;any=true;
    if(rp.type==='fill'&&Array.isArray(rp.cells)){
      let n=0;
      for(const[px2,pz2]of rp.cells){
        if(!inW(px2,1,pz2))continue;
        const gB=groundY(px2,pz2);if(gB<1)continue;
        /* 洞底到坑沿之间填土——groundY已返回洞底，往上填到rimY */
        for(let y2=gB+1;y2<(rp.rimY||gB+2)&&y2<H-1;y2++){
          const k2=px2+','+y2+','+pz2;
          if(taSets()[0].has(k2)||villCells[k2])break;   /* TA的东西不埋 */
          if(world[idx(px2,y2,pz2)]===AIR)world[idx(px2,y2,pz2)]=2,n++;
        }
      }
      console.log('v123：填坑——'+n+'格（'+rp.id+'）');
    }else if(rp.type==='fell'&&Array.isArray(rp.cells)){
      let n=0;
      for(const[px2,pz2]of rp.cells){
        for(let cy=1;cy<H-1;cy++)if(get(px2,cy,pz2)===5){world[idx(px2,cy,pz2)]=AIR;n++;}
        for(let dx2=-2;dx2<=2;dx2++)for(let dz2=-2;dz2<=2;dz2++)for(let cy=1;cy<H-1;cy++){
          if(get(px2+dx2,cy,pz2+dz2)===6)world[idx(px2+dx2,cy,pz2+dz2)]=AIR;
        }
      }
      console.log('v123：伐树——'+rp.cells.length+'棵（'+rp.id+'）');
      if(n||rp.cells.length)rebuild();
    }
  }
  if(any){try{localStorage.setItem('hetan_repair_done',JSON.stringify(done));}catch(e){}
    /* 清掉已执行的（本地视图）——服务器下轮重建 */
    MINDS.repair_plans=MINDS.repair_plans.filter(function(rp){return rp&&!done[rp.id];});
  }
}
function executeJudgePlans(){
  if(!MINDS||!MINDS.build_plans||!MINDS.build_plans.length||!VH.up)return;
  let acks;
  try{acks=JSON.parse(localStorage.getItem('hetan_judge_done')||'{}');}catch(e){acks={};}
  const acksOut=[];
  let anyPlaced=false;
  const[taA,taR]=taSets();
  for(const p of MINDS.build_plans){
    if(!p||!p.id||acks[p.id])continue;
    const day=Math.floor((Date.now()-VH.up)/DAY_MS);
    if(p.type==='树'){
      const a=judgeAnchor(p.near||'center');
      let n=0;
      for(const[dx,dz]of[[0,0],[3,1],[1,3],[-2,2],[2,-2]]){
        const x=a[0]+dx,z=a[1]+dz;
        if(!inW(x,1,z))continue;
        const g=groundY(x,z);if(g<2)continue;
        const b=get(x,g,z);
        if(b!==1&&b!==2)continue;
        const k=x+','+g+','+z;
        if(villCells[k]||taA.has(k)||taR.has(k))continue;
        if(get(x,g+1,z)!==AIR)continue;
        plantTree(x,z,g,false);n++;
      }
      acks[p.id]=1;
      acksOut.push({id:p.id,ok:n>0,why:n>0?('种下'+n+'棵树'):'周边没有能落树的空地',day:day});
      if(n>0)anyPlaced=true;
      continue;
    }
    /* v119扣库：客户端校验是主防线（服务器judge_build过账兜底）——同批内本地扣，第二件按扣过的库验 */
    const PRICE={'凉亭':{'木':12,'石':6},'水井':{'石':15,'木':4},'灯柱':{'石':4},'石凳':{'石':3},'铁匠铺':{'木':30,'石':20,'钱':15},'花圃':{},'树':{}};
    if(MINDS.cunKu){
      const cost=PRICE[p.type]||{};
      const short=Object.keys(cost).filter(k=>(MINDS.cunKu[k]||0)<cost[k]);
      if(short.length){
        acks[p.id]=1;
        acksOut.push({id:p.id,ok:false,why:'村库不够：'+short.map(k=>k+'需'+cost[k]+'只有'+(MINDS.cunKu[k]||0)).join('、'),day:day});
        continue;
      }
      for(const k in cost)MINDS.cunKu[k]-=cost[k];
    }
    const cells=judgeCellsFor(p.type);
    if(!cells.length){acks[p.id]=1;continue;}
    const big=(p.type==='凉亭'||p.type==='水井');
    const a=judgeAnchor(p.near||'center');
    const spot=judgeSpotNear(a[0],a[1],big?3:3,big?3:1);
    if(!spot){
      acks[p.id]=1;
      acksOut.push({id:p.id,ok:false,why:'周边14格内没有平整空地——都让路宅田占了',day:day});
      continue;
    }
    const g=groundY(spot[0],spot[1]);
    let blocked=false;const placed=[];
    for(const[dx,dy,dz,t]of cells){
      const x=spot[0]+dx,y=g+dy,z=spot[1]+dz;
      const k=x+','+y+','+z;
      if(taA.has(k)||taR.has(k)){blocked=true;break;}
      const cur=world[idx(x,y,z)];
      if(cur!==AIR&&cur!==17&&cur!==15&&cur!==16){blocked=true;break;}
      placed.push([x,y,z,t]);
    }
    if(blocked){
      acks[p.id]=1;
      acksOut.push({id:p.id,ok:false,why:'蓝图格被占——选址要再挪',day:day});
      continue;
    }
    for(const[x,y,z,t]of placed){
      world[idx(x,y,z)]=t;
      villCells[x+','+y+','+z]='judge';
    }
    anyPlaced=true;acks[p.id]=1;
    acksOut.push({id:p.id,ok:true,why:'建成',day:day});
    console.log('v112：判定者的'+p.type+'立起来了——'+p.note);
  }
  try{if(MINDS.cunKu&&MINDS.cunKu.smithyDay!=null)localStorage.setItem('hetan_smithyDay',String(MINDS.cunKu.smithyDay));}catch(e){}   /* v119：因果链参数落本地——villagerProgress读 */
  try{tickCunKuBags();}catch(e){}   /* v122：MINDS到手粮袋同步 */
  if(Object.keys(acks).length){
    try{localStorage.setItem('hetan_judge_done',JSON.stringify(acks));}catch(e){}
  }
  if(anyPlaced)rebuild();
  if(acksOut.length)judgePushAck(acksOut);
}
function grainLevel(g){if(g===undefined||g===null||g<=0)return 1;return Math.max(1,Math.min(4,1+Math.floor(Math.sqrt(g/12))));}
function updateGrainBins(){
  if(!VH.homes||!MINDS||!MINDS.store)return;
  const[taA,taR]=taSets();
  let changed=false;
  for(const id in VH.homes){
    const vh=VH.homes[id],nm=vh.name;
    if(!MINDS.store[nm])continue;
    const lv=grainLevel(MINDS.store[nm].粮);
    if(binLevels[nm]===lv)continue;
    /* 清旧囤 */
    if(binCells[nm])for(const[x,y,z]of binCells[nm]){
      const k=x+','+y+','+z;
      if(taA.has(k)||taR.has(k))continue;   /* v111：TA搭过的格不碰 */
      const b=world[idx(x,y,z)];
      if(b===5||b===10)world[idx(x,y,z)]=AIR;
    }
    binCells[nm]=[];
    /* 找位：宅侧（6,-2）起 2×2 */
    const px=vh.plot[0],pz=vh.plot[2];
    let ok=true;const spot=[];
    for(let dx=0;dx<2&&ok;dx++)for(let dz=0;dz<2;dz++){
      const x=px+6+dx,z=pz-2+dz;
      if(!inW(x,1,z)){ok=false;break;}
      const g=groundY(x,z);if(g<1){ok=false;break;}
      const k=x+','+g+','+z;
      if(villCells[k]||taA.has(k)||taR.has(k)){ok=false;break;}
      const b=get(x,g,z);
      if(b!==1&&b!==17&&b!==2){ok=false;break;}
      spot.push([x,g,z,k]);
    }
    if(!ok)continue;
    for(const[x,g,z]of spot){
      if(world[idx(x,g+1,z)]!==AIR)world[idx(x,g+1,z)]=AIR;
      for(let dy=1;dy<=lv;dy++){world[idx(x,g+dy,z)]=5;binCells[nm].push([x,g+dy,z]);}
      world[idx(x,g+lv+1,z)]=10;binCells[nm].push([x,g+lv+1,z]);
    }
    binLevels[nm]=lv;changed=true;
  }
  if(changed){rebuild();console.log('v111：粮囤按账本码好了');}
}
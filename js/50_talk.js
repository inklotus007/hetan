
function spClear(){spMarks.forEach(m=>scene.remove(m));spMarks=[];spA=null;}
/* v77蓝图：三户型施工序列（地基→墙→门窗→炬→顶→牌最后=封顶立名牌）。bp1小屋69格/bp2两层楼85格/bp3长屋61格 */
let CHRON={v:0,book:'河滩村志',chapters:[]},chronSha=null;
function pullChronicle(){
  return ghGet('chronicle.json').then(({sha,data})=>{
    chronSha=sha;CHRON=(data&&data.chapters)?data:{v:0,book:'河滩村志',chapters:[]};
  }).catch(()=>{});
}
function openChronicle(){
  const list=document.getElementById('chronList');
  list.innerHTML='';
  if(!CHRON.chapters.length){list.innerHTML='<div style="padding:10px;color:#6a5c8a;font-size:13px">村志还没写——判定者今晚执笔</div>';}
  CHRON.chapters.forEach((ch,i)=>{
    const d=document.createElement('div');
    d.style.cssText='padding:8px 10px;border-bottom:1px solid #d8d0e8;cursor:pointer';
    d.innerHTML='<b style="color:#4a3a6a">'+ch.title+'</b> <span style="color:#9a8ab8;font-size:11px">'+(ch.date||'')+'</span>';
    d.onclick=()=>{
      document.getElementById('chronBody').innerHTML='<div style="white-space:pre-wrap;line-height:1.9;color:#3a2a5a;font-size:14px">'+ch.text+'</div>';
      document.getElementById('chronBody').style.display='block';
      document.getElementById('chronList').style.display='none';
    };
    list.appendChild(d);
  });
  document.getElementById('chronBody').innerHTML='';document.getElementById('chronBody').style.display='none';
  document.getElementById('chronList').style.display='block';
  document.getElementById('chronModal').style.display='flex';
}
/* v80对话talk80 */
let talkNpc=null,talkTid=null,talkPending=null;
function rayVillSign(){   /* v83：眼前有没有村民名牌（mesh求交，DDA够不着mesh）——返回可对话的户名 */
  const names=Object.values(villSignMesh||{});
  if(!names.length)return null;
  const dir=lookDir();
  const o=new THREE.Vector3(p.x,p.y+EYE,p.z);
  const d=new THREE.Vector3(dir.x,dir.y,dir.z).normalize();
  const rc=new THREE.Raycaster(o,d,0,6.5);
  const hits=rc.intersectObjects(names,false);
  if(!hits.length)return null;
  const vn=hits[0].object.userData&&hits[0].object.userData.vn;
  if(!vn)return null;
  for(const id in (VH.homes||{})){if(VH.homes[id].name===vn)return vn;}   /* 喜牌的合并名不在homes——不开 */
  return null;
}
function nearVillName(){   /* v89：跟活人走——优先村民mesh实际位置（村民在河边你走到河边就能说），宅地兜底 */
  if(!VH.homes)return null;
  let best=null,bd=81;
  for(const id in (VH.homes||{})){
    const g=npcObjs[id];
    let gx,gz;
    if(g){gx=g.position.x;gz=g.position.z;}
    else{const vh=VH.homes[id];gx=vh.plot[0]+0.5;gz=vh.plot[2]+0.5;}
    const dx=p.x-gx,dz=p.z-gz;
    const d2=dx*dx+dz*dz;
    if(d2<bd){bd=d2;best=VH.homes[id].name;}
  }
  return bd<81?best:null;
}
function talkBubble(who,text,mine,pending){
  const d=document.createElement('div');
  d.style.cssText='margin:6px 0;text-align:'+(mine?'right':'left');
  const b=document.createElement('span');
  b.style.cssText='display:inline-block;max-width:82%;padding:6px 10px;border-radius:9px;'+(mine
    ?'background:#d9e4d0;color:#2f3a26;'
    :'background:#f7f0dd;color:#3a2f1e;border:1px solid #ddcda5;');
  b.textContent=(mine?'':'（'+talkNpc+'）')+(text||'')+(pending?'……':'');
  d.appendChild(b);return d;
}
function renderTalk(data){
  const flow=document.getElementById('talkFlow');
  flow.innerHTML='';
  const list=((data&&data.replies)||[]).filter(r=>r.npc===talkNpc&&r.reply).sort((a,b)=>(a.rt||0)-(b.rt||0));   /* 空答（4.7-flash历史空回）不渲染 */
  for(const r of list){
    flow.appendChild(talkBubble(r.name||'客',r.text,true,false));
    flow.appendChild(talkBubble(talkNpc,r.reply,false,false));
    if(talkPending&&talkPending.text===r.text)talkPending=null;
  }
  if(talkPending&&talkNpc){
    flow.appendChild(talkBubble((ME&&ME.name)||'客',talkPending.text,true,false));
    flow.appendChild(talkBubble(talkNpc,'（想话中',false,true));
  }
  flow.scrollTop=flow.scrollHeight;
}
function pollTalk(){
  if(talkTid)clearInterval(talkTid);
  talkTid=setInterval(()=>{
    if(!talkNpc)return;
    ghGet('replies.json').then(({data})=>{if(talkNpc)renderTalk(data);}).catch(()=>{});
  },8000);
}
function openTalk(name){
  talkNpc=name;
  document.getElementById('talkWho').textContent=name;
  document.getElementById('talkUI').style.display='flex';
  renderTalk({});
  document.getElementById('talkMind').textContent='（他今天在想什么——正在想……）';
  document.getElementById('talkVillage').innerHTML='';
  ghGet('replies.json').then(({data})=>{if(talkNpc===name)renderTalk(data);}).catch(()=>{});
  /* v88：走远了对话自动收——玩家离说话的宅地超12格，modal合上（话悬空的修） */
  const distTick = setInterval(()=>{
    if(talkNpc!==name){clearInterval(distTick);return;}
    const vh=Object.values(VH.homes||{}).find(h=>h.name===name);
    if(vh){
      const d=Math.hypot(p.x-(vh.plot[0]+2.5),p.z-(vh.plot[2]+1.5));
      if(d>12){clearInterval(distTick);closeTalk();toast('走远了，话就散了');}
    }
  },2000);
  ghGet('villagers_memory.json').then(({data})=>{if(talkNpc===name)renderMind(data);}).catch(()=>{});
  pollTalk();
}
/* v81意识层：心事渲染+boot自动dispatch */
function renderMind(M){
  if(M){MINDS=M;updateGrainBins();setTimeout(executeJudgePlans,500);for(const n in (M.minds||{}))moodMap[n]=(M.minds[n]||{}).mood||'';}   /* v88.1：mood进表情 */
  if(!talkNpc)return;
  const mind=document.getElementById('talkMind'),vil=document.getElementById('talkVillage');
  const m=(M&&M.minds&&M.minds[talkNpc])||null;
  mind.textContent=m?('今天他在想：'+m.thought):'（他今天的心事还没想好——等一会儿，或者明天再来）';
  const talks=(M&&M.today&&M.today.talks)||[];
  vil.innerHTML=talks.length?('【今天村里】'+talks.map(t=>'· '+t.a+(t.b&&t.b!==t.a?'对'+t.b:'')+'：'+t.text).join('<br>')):'';
}
let MINDS=null;   /* v84：判定者今天的心思+行程（游客也拉，同源副本） */
const moodMap={};
/* v89：头顶气泡——预排的话在场景里说出来（「村里的话」从村志文字变成可看的场面） */
let bubbleSprites={};
function bubbleCanvas(text){
  const cv=document.createElement('canvas');cv.width=256;cv.height=72;
  const g=cv.getContext('2d');
  g.fillStyle='rgba(255,252,244,0.94)';
  g.strokeStyle='#8a6a48';g.lineWidth=3;
  const r=10;
  g.beginPath();g.moveTo(r,4);g.lineTo(252-r,4);g.arcTo(252,4,252,4+r,r);g.lineTo(252,44-r);g.arcTo(252,44,252-r,44,r);g.lineTo(140,44);g.lineTo(128,60);g.lineTo(116,44);g.lineTo(4+r,44);g.arcTo(4,44,4,44-r,r);g.lineTo(4,4+r);g.arcTo(4,4,4+r,4,r);g.closePath();g.fill();g.stroke();
  g.fillStyle='#3a2c1e';g.font='17px "Noto Serif SC",serif';
  const lines=text.length>13?[text.slice(0,13),text.slice(13,26)]:[text];
  lines.forEach((l,k)=>g.fillText(l,14,24+k*19));
  return cv;
}
function showBubble(id,text,tSec){
  let b=bubbleSprites[id];
  if(!b||b.txt!==text){
    if(b){b.spr.parent&&b.spr.parent.remove(b.spr);}
    const tex=new THREE.CanvasTexture(bubbleCanvas(text));
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    const spr=new THREE.Sprite(mat);
    spr.scale.set(4.2,1.2,1);
    spr.renderOrder=99;
    const g=npcObjs[id];
    if(!g)return;
    spr.position.set(0,2.6,0);
    g.add(spr);
    b={spr,txt:text,t0:tSec};
    bubbleSprites[id]=b;
  }
  b.t0=tSec;
}
function hideBubble(id){
  const b=bubbleSprites[id];
  if(b){b.spr.parent&&b.spr.parent.remove(b.spr);delete bubbleSprites[id];}
}
/* ===== v116声音：合成音效零资产（TA：声音和微动作加上）=====
   解锁：浏览器手势策略——首次点按任意处resume；开关在菜单（默认关，开了记localStorage）。
   锤声=施工中的村民在场（act=build且TA在32格内）随机间隔tok；梆子=游戏日正午/黄昏各一响（起工/收工的钟点）；
   风=低通噪声常开；水=带通噪声按TA离水面距离渐入。 */
let AC=null,masterGain=null,windGain=null,waterGain=null,soundOn=true,sndBtnInit=false;   /* v118：默认开（TA：打铁声音也没有）——首次任意点击解锁AudioContext，菜单可关 */
let waterDist=99,waterCacheT=-9,hammerNextT=0,dayPhasePrev=-1;
function audioInit(){
  if(AC)return;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain();masterGain.gain.value=soundOn?1:0;masterGain.connect(AC.destination);
    const len=AC.sampleRate*2,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const wind=AC.createBufferSource();wind.buffer=buf;wind.loop=true;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=360;
    windGain=AC.createGain();windGain.gain.value=0.014;
    wind.connect(lp);lp.connect(windGain);windGain.connect(masterGain);wind.start();
    const wat=AC.createBufferSource();wat.buffer=buf;wat.loop=true;wat.playbackRate.value=1.31;
    const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=0.7;
    waterGain=AC.createGain();waterGain.gain.value=0;
    wat.connect(bp);bp.connect(waterGain);waterGain.connect(masterGain);wat.start();
  }catch(e){AC=null;}
}
function sndTok(vol){
  if(!AC||!soundOn)return;
  const t=AC.currentTime;
  const o=AC.createOscillator(),gn=AC.createGain();
  o.type='triangle';o.frequency.setValueAtTime(175,t);o.frequency.exponentialRampToValueAtTime(65,t+0.07);
  gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.1);
  o.connect(gn);gn.connect(masterGain);o.start(t);o.stop(t+0.11);
  const nb=AC.createBufferSource(),n=AC.createBuffer(1,1100,AC.sampleRate),nd=n.getChannelData(0);
  for(let i=0;i<1100;i++)nd[i]=(Math.random()*2-1)*(1-i/1100);
  nb.buffer=n;const ng=AC.createGain();ng.gain.value=vol*0.6;nb.connect(ng);ng.connect(masterGain);nb.start(t);
}
function sndBang(){
  if(!AC||!soundOn)return;
  const t=AC.currentTime;
  [[520,0.13],[784,0.05]].forEach(pr=>{
    const o=AC.createOscillator(),gn=AC.createGain();
    o.type='sine';o.frequency.value=pr[0];
    gn.gain.setValueAtTime(pr[1],t);gn.gain.exponentialRampToValueAtTime(0.001,t+0.4);
    o.connect(gn);gn.connect(masterGain);o.start(t);o.stop(t+0.42);
  });
}
function sndToggle(){
  soundOn=!soundOn;
  try{localStorage.setItem('hetan_snd',soundOn?'1':'0');}catch(e){}
  if(soundOn){audioInit();if(AC&&AC.state==='suspended')AC.resume();}
  if(masterGain)masterGain.gain.value=soundOn?1:0;
  const b=document.getElementById('mSnd');
  if(b)b.textContent=soundOn?'声音 开':'声音 关';
}
function sndWire(){
  if(sndBtnInit)return;sndBtnInit=true;
  soundOn=(function(){try{return localStorage.getItem('hetan_snd')!=='0';}catch(e){return true;}})();   /* v118：默认开，'0'才是关 */
  const b=document.getElementById('mSnd');
  if(b){b.textContent=soundOn?'声音 开':'声音 关';b.addEventListener('click',sndToggle);}
  const kick=()=>{if(soundOn){audioInit();if(AC&&AC.state==='suspended')AC.resume();}};
  document.addEventListener('pointerdown',kick,{passive:true});
  if(soundOn){audioInit();}
}
function audioTick(tSec){
  if(!AC||!soundOn)return;
  if(AC.state==='suspended'){AC.resume();return;}
  if(tSec-waterCacheT>3){
    waterCacheT=tSec;
    const w=findWater(Math.floor(p.x),Math.floor(p.z));
    waterDist=w?Math.hypot(w[0]-p.x,w[1]-p.z):99;
  }
  if(waterGain)waterGain.gain.value+=((waterDist<22?(1-waterDist/22)*0.045:0)-waterGain.gain.value)*0.04;
  if(tSec>=hammerNextT){
    let hd=99;
    for(const id in npcObjs){
      const g=npcObjs[id];
      if(!g||!g.visible||g.userData.act!=='build')continue;
      const d=Math.hypot(g.position.x-p.x,g.position.z-p.z);
      if(d<hd)hd=d;
    }
    if(hd<32){sndTok(Math.max(0.04,0.32*(1-hd/32)));hammerNextT=tSec+0.7+Math.random()*0.9;}
    else hammerNextT=tSec+0.6;
  }
  const dayT2=(tSec%600)/600;
  const phase=Math.floor(dayT2*10);
  if(phase!==dayPhasePrev){
    if(dayPhasePrev>=0){
      if(phase===1)sndBang();
      else if(phase===5)sndBang();
      else if(phase===8)sndBang();
    }
    dayPhasePrev=phase;
  }
}
/* ===== v114直播化：村子从录播变直播（TA：徒有其形没有灵魂）=====
   照面——村民相遇停下面对面说话（今天talks优先，礼节性招呼兜底——1995年村口的招呼本来就是套话，这不是编的是礼）；
   炊烟——火塘/灶冒烟，村子远远看着就是活的 */
let chatPairs={},pairRuns={},pairCool={},smokeSrc=[],smokePool=null,smokeTexCache=null,smokeAcc=0;
const RITUAL=[
 ['吃了吗？','吃过了，锅上温着。','那中午来，添双筷子。'],
 ['忙着呢？','哎，忙着呢。','那你先忙，回头见。'],
 ['这天要变。','可不是，云都压下来了。','早些收吧。'],
 ['东头集去不？','去，等我一块儿。','那你麻利点。'],
 ['家里都好？','都好，都好。','那就中。']
];
function pairChatTick(tSec){
  /* 清场：散了的/下线的 */
  for(const key in pairRuns){
    const R=pairRuns[key];
    if(tSec>R.until||!npcObjs[R.a]||!npcObjs[R.b]||!npcObjs[R.a].visible||!npcObjs[R.b].visible){
      delete chatPairs[R.a];delete chatPairs[R.b];pairCool[key]=tSec+90;delete pairRuns[key];
    }
  }
  /* 说话：交替冒泡 */
  for(const key in pairRuns){
    const R=pairRuns[key];
    if(tSec>=R.nextAt&&R.idx<R.lines.length){
      const L=R.lines[R.idx];
      showBubble(L.w,L.x,tSec);
      bubbleHold=tSec+3.2;   /* 压ambient——对话不被路过问候顶掉 */
      R.idx++;R.nextAt=tSec+2.6;
    }
  }
  /* 组对：一次最多一对，全场最多三对 */
  if(Object.keys(pairRuns).length>=3)return;
  const free=[];
  for(const id in npcObjs){
    const g=npcObjs[id];
    if(!g||!g.visible||g.userData.isOnline||chatPairs[id])continue;
    if(g.userData.vname==='同志')continue;
    free.push(id);
  }
  for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){
    const a=free[i],b=free[j],ga=npcObjs[a],gb=npcObjs[b];
    const dx=ga.position.x-gb.position.x,dz=ga.position.z-gb.position.z;
    if(dx*dx+dz*dz>4.4)continue;
    const key=a<b?a+'|'+b:b+'|'+a;
    if(pairCool[key]&&tSec<pairCool[key])continue;
    const na=ga.userData.vname,nb=gb.userData.vname;
    if(!na||!nb)continue;
    let lines=[];
    const tl=(MINDS&&MINDS.today&&MINDS.today.talks)||[];
    for(const t of tl){
      if((t.a===na&&t.b===nb)||(t.a===nb&&t.b===na)){lines.push({w:(t.a===na)?a:b,x:String(t.text||'').slice(0,44)});if(lines.length>=4)break;}
    }
    if(lines.length<2){
      const R2=RITUAL[(Math.floor(tSec/7)+na.length*3+nb.length)%RITUAL.length];
      lines=[{w:a,x:R2[0]},{w:b,x:R2[1]},{w:a,x:R2[2]||'哎。'}];
    }
    pairRuns[key]={a:a,b:b,lines:lines,idx:0,nextAt:tSec+0.5,until:tSec+2.6*lines.length+4};
    chatPairs[a]=key;chatPairs[b]=key;
    break;
  }
}
function smokeTick(tSec,dt){
  if(!smokeSrc.length)return;
  if(!smokeTexCache){
    const cv=document.createElement('canvas');cv.width=32;cv.height=32;
    const g=cv.getContext('2d');
    const gr=g.createRadialGradient(16,16,2,16,16,15);
    gr.addColorStop(0,'rgba(225,222,215,0.55)');gr.addColorStop(1,'rgba(225,222,215,0)');
    g.fillStyle=gr;g.fillRect(0,0,32,32);
    smokeTexCache=new THREE.CanvasTexture(cv);
  }
  if(!smokePool){
    smokePool=[];
    for(let i=0;i<44;i++){
      const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexCache,transparent:true,opacity:0,depthWrite:false}));
      spr.visible=false;smokePool.push({spr,life:0,max:1,vx:0,vy:0,vz:0});
      scene.add(spr);
    }
  }
  /* 生成：TA周边50格内的火源，每0.3秒一处一粒 */
  smokeAcc+=dt;
  const near=smokeSrc.filter(s=>{const dx=s[0]-p.x,dz=s[2]-p.z;return dx*dx+dz*dz<2500;}).slice(0,6);
  if(smokeAcc>0.3){
    smokeAcc=0;
    for(const src of near){
      const slot=smokePool.find(o=>o.life<=0);
      if(!slot)break;
      slot.life=slot.max=3.5+Math.random()*1.5;
      slot.spr.position.set(src[0]+0.5+(Math.random()-0.5)*0.2,src[1]+1.1,src[2]+0.5+(Math.random()-0.5)*0.2);
      slot.vx=(Math.random()-0.5)*0.08;slot.vy=0.32+Math.random()*0.14;slot.vz=(Math.random()-0.5)*0.08;
      slot.spr.visible=true;
    }
  }
  for(const o of smokePool){
    if(o.life<=0)continue;
    o.life-=dt;
    if(o.life<=0){o.spr.visible=false;continue;}
    o.spr.position.x+=o.vx*dt;o.spr.position.y+=o.vy*dt;o.spr.position.z+=o.vz*dt;
    const k=1-o.life/o.max;
    const sc=0.3+k*0.75;
    o.spr.scale.set(sc,sc,1);
    o.spr.material.opacity=0.42*(1-k)*(k<0.12?k/0.12:1);
  }
}
const GREET={   /* v94/v95：九户人设问候池——走近即冒，不必chat段 */
 '满仓':['哎，来了。','婚期越来越近喽，就等着那天。'],
 '凤兰':['哟！来啦？','屋里坐——哦，房还没盖利索，先站着说话。'],
 '秀兰':['嗯。看着呢。','眼睛离不开工地。'],
 '建军':['来干啥。……站会儿也行。','别碰我那堆料。'],
 '秋生':['嗯。（点头，梆子没停）','（哼着梆子，看了你一眼）'],
 '爱香':['大老远来的吧？喝水不？','哟——今儿风大！'],
 '长贵':['来了。慢走，地滑。','不急，一步步来，日子长着。'],
 '来福':['早啊——哦，这会儿不算早了。','天不亮我就起了。'],
 '银锁':['来了。账都记着呢。','今儿进出的，我都看着呢。'],
 '栓柱':['来了。','泥瓦活我熟，缺人手喊我。'],
 '麦穗':['哎。','鸡都喂过了。'],
 '二愣':['嗯！','力气有，往哪儿使？'],
 '杏花':['哟，来啦。','针线活别找我，我笨。'],
 '铁蛋':['嘿嘿，来了。','河里鱼多着呢。'],
 '老蔫':['……嗯。','（半天）……坐呗。'],
 '翠娥':['来了？炕上坐。','布晒好了，就等裁。'],
 '石头':['嗯。','石头有的是，就缺盖房的灰。'],
 '巧云':['来了呀。','账我记着呢，别急。'],
 '柱子':['来了。','架子搭一半，风大停了工。'],
 '桂枝':['嗯，来了。','药晒好了，苦着呢。'],
 '半仙':['来了。','我看今儿宜动土。'],
 '村长':['账都在公仓里，走近了看。','村库的事问我。']
};
const GREET_ANY=['哎，来了。','忙着呢。','吃了没？','今儿天气不赖。','回头村里见。'];
const ROAD_GREET=['先把路修通。','路通了才好进料。','看好了这块地。','先修路，再起房。'];
function homeByName(nm){for(const id in VH.homes){if((VH.homes[id]||{}).name===nm)return VH.homes[id];}return null;}   /* v96兜底 */
function askLine(nm){   /* v94：问村里的事——天气+该户今天的心事（真数据每天变） */
  const w=weather==='rain'?'下雨呢，出不了工':(weather==='snow'?'落雪了，都猫着':(weather==='clear'?'晴天，正干活的天':'阴天'));
  const m2=MINDS&&MINDS.minds&&MINDS.minds[nm];
  const th=(m2&&m2.thought)?(' '+m2.thought):' 都在忙。';
  return w+'。'+th;
}
function bubbleContent(nm,tSec){   /* v94：内容降级链——当天talks→状态话(v128)→今天心事→人设问候池 */
  if(nm==='村长'){   /* v120：村长=经营层的脸——走近就报账（TA：找他就能知道那机制有没有上线） */
    const ck=(MINDS&&MINDS.cunKu)||{};
    const plans=(MINDS&&MINDS.build_plans)||[];
    const fb=(MINDS&&MINDS.build_feedback||[])[0];
    const acc='村库：木'+(ck['木']??'?')+' 石'+(ck['石']??'?')+' 粮'+(ck['粮']??'?')+' 钱'+(ck['钱']??'?');
    const plan=plans.length?('在张罗：'+plans.map(p=>p.type).join('、')+'.'):'没动工。';
    const fbT=fb?('上次'+(fb.ok?'成了':'没成')+'——'+(fb.why||'')):'';
    const rot=[acc+'。'+plan, plan+fbT, acc+'。'+(fbT||'都记着账呢。'), '账都在。'+plan+(ck['smithyDay']!=null?'铁匠铺开张了，盖房快三成。':'')];
    return rot[Math.floor(tSec/9)%rot.length];
  }
  const mine=(MINDS&&MINDS.today&&MINDS.today.talks||[]).filter(t=>t.a===nm);
  if(mine.length)return mine[Math.floor(tSec/4)%mine.length].text;
  /* v128状态话：话题长在世界状态上（TA：翻来覆去一两句/没有逻辑性——根是话跟节气天气农时村库全脱钩，死池里捞） */
  const st=sayFor(nm,tSec);
  if(st)return st;
  const m2=MINDS&&MINDS.minds&&MINDS.minds[nm];
  if(m2&&m2.thought)return '（自言自语）'+m2.thought;
  const pool=GREET[nm];
  return pool?pool[Math.floor(tSec/9)%pool.length]:(isMarketDay()?MK_GREET:GREET_ANY)[Math.floor(tSec/9)%MK_GREET.length];
}
/* ===== v128：话素表——村民的话长在世界状态上（TA：真实性浮于表面没落到根上） =====
   状态决定话题（全村共享同一个「今天」：同雪天都说雪，各按生计口吻说——话题一致，说法各异），
   户覆盖池(per)让九户+扩展户的话带自己的生计和腔调； 户记忆(lastSay)防连续重复。
   两套历各管各的视觉：季节话跟现实节气(v127叶雪)走，农时话跟游戏日farmStage(田里的苗)走——
   村民说的话永远跟TA眼睛看到的一致。 */
const VTOPIC={
  wx:{
    snow:['这天儿雪说下就下。','雪把道盖了，走道看脚底下。','雪一厚，麻雀都懒得动。','这雪是好雪，冻死虫子，来年收成好。'],
    rain:['这雨下得人心烦。','下雨天，料全潮了。','雨里头干不成活，歇了吧。','这场雨过后，苗能蹿一截。']
  },
  seas:{
    春:['地返青了，能下脚了。','开春了，该备种备料了。','春寒长着呢，别急着脱袄。'],
    夏:['这天热得邪乎。','日头毒，晌午干不成活。','夏锄不能歇，草比苗长得快。'],
    秋:['秋收一忙，觉都不够睡。','叶子黄了，一年快到头了。','秋高气爽，正是干活的时候。'],
    冬:['这天，手脚都冻僵了。','冬天日子短，天黑得早。','冻土上了，动不了土喽。']
  },
  farm:{
    生长:['苗齐了，就等雨水匀。','地里没大活，就等着长。','草得锄，不锄跟苗抢食。'],
    收获:['收割就在这几日，全家都得上。','今年成色不赖。','收完了得赶紧翻地。'],
    茬:['刚收完，地里还散着味儿。','茬子地，得赶紧翻。'],
    闲:['地里没活，猫冬。','闲了，把农具修修。','闲了嘴也不能闲，粮得算计。']
  },
  lack:['粮快见底了，愁人。','缸里的粮得算计着吃。','这粮可撑不到开春。','得多想个进粮的法子。'],
  built:{'铁匠铺':'铁匠铺开张了，往后农具有处修了。','凉亭':'凉亭立起来了，去瞧过没？','水井':'新井打好了，水甜。','灯柱':'路口亮堂了，夜里敢走了。','粮囤':'粮囤码起来了，看着踏实。','公仓':'公仓满着，心里不慌。','树':'又栽了树，村里越来越像样了。'},
  per:{
    '满仓':{收获:['收成好，仓才能满——我叫满仓，得对得起这名。'],lack:['我名字叫满仓，可仓里不满呐，丢人。','缸见底了，粮食的事压心口。'],冬:['仓里有粮，冬就好过。'],snow:['雪好，冻死虫，来年仓满。']},
    '秀兰':{snow:['嗯。雪，停工。'],rain:['雨大，布收屋里了。'],秋:['布该上浆了。'],冬:['天冷，织机上的手都僵。'],收获:['线纺完这批就歇。']},
    '建军':{snow:['雪。料别让雪压了。'],rain:['下吧，反正干不成。'],冬:['冻手。木工停了。'],春:['料备齐了没？开工就得用。']},
    '铁蛋':{snow:['雪天鱼咬钩，明儿凿冰窟窿去。'],冬:['河快封了，趁没封多下几网。'],收获:['秋鱼正贴膘，肥着呢。'],rain:['涨水了，鱼往边上跑——雨停就去。']},
    '银锁':{lack:['账上粮的进出我有数——数，不小呐。'],秋:['秋账要清，年账要平。'],收获:['收成入了账才算收成。']},
    '麦穗':{snow:['鸡都不出窝了。'],rain:['鸡淋不得雨，全赶回棚了。'],收获:['糠多了，鸡吃得肥实。']},
    '桂枝':{秋:['药晒透了，收进屋。'],snow:['药不能见雪，全收了。'],夏:['药就得趁大日头晒。']},
    '半仙':null,   /* 半仙走宜忌动态生成（yiJi），不进静态池 */
    '栓柱':{rain:['雨大，灰都和不成。'],冬:['冻土上砌不了墙。'],生长:['墙垒到半截，等天。']},
    '石头':{snow:['雪盖着，石头更沉。'],冬:['冻手，凿不动。'],春:['开春石料活多。']},
    '老蔫':{snow:['……雪。','……下吧。','（看雪，不说话）'],rain:['……雨。','……烦。'],冬:['……冷。','（缩着袖子）……嗯。'],收获:['……忙。','……累。'],lack:['……唉。']},
    '秋生':null,   /* 秋生打梆子——走动态梆子版 */
    '长贵':{snow:['慢走，雪地滑。'],rain:['地滑，不急，一步步来。'],冬:['炉子烧热了就好。']},
    '来福':{春:['天不亮我就起了，地等人。'],收获:['起早贪黑，就这半个月。']},
    '翠娥':{秋:['换季了，该裁冬衣了。'],snow:['雪天正好做针线。'],收获:['新棉花下来了，弹一床新被。']},
    '杏花':{冬:['线纳鞋底，冬天用得上。'],收获:['麻收了才有线。']},
    '巧云':{lack:['粮账我记着，一天一天紧。'],秋:['秋后的账最好算。']},
    '二愣':{snow:['雪里干活，使的是死力气。'],lack:['有力气，就饿不死。'],收获:['扛麻袋我一人顶俩。']},
    '柱子':{rain:['架子让雨泡不得。'],snow:['雪压架子，得紧一紧绳。'],冬:['架子空着过冬，开春再说。']},
    '凤兰':{snow:['雪天路滑，端着点儿。'],冬:['这天真冷，进屋喝口热的？'],收获:['今年收成好，家家都乐。']},
    '爱香':{snow:['哟，雪这么大！炉子上坐着一锅水呢。'],rain:['雨里来的？头发都湿了。'],夏:['大热天的，喝口水再走。']}
  }
};
let lastSay={};   /* 户记忆：同一户连续冒泡不重复 */
function sayFor(nm,tSec){
  /* 主状态判定：天气>建成(2日内)>粮荒>农时>季节——全村共享同一个「今天」 */
  let cat=null,key=null;
  if(weather==='snow'){cat='wx';key='snow';}
  else if(weather==='rain'){cat='wx';key='rain';}
  if(!cat){
    const fb=MINDS&&MINDS.build_feedback&&MINDS.build_feedback[0];
    if(fb&&fb.ok&&fb.note&&VTOPIC.built[fb.note]){
      const fd=typeof fb.day==='number'?fb.day:0;
      const nowDay=VH.up?Math.floor((Date.now()-VH.up)/DAY_MS):0;
      if(nowDay-fd<2){cat='built';key=fb.note;}
    }
  }
  if(!cat){
    const ck=MINDS&&MINDS.cunKu;
    if(ck&&typeof ck['粮']==='number'&&ck['粮']<40){cat='lack';key='';}
  }
  if(!cat){
    const cal=VH.up?calNow():null;
    if(cal){
      const st=VH.homes?farmStageCal(cal.day%360):null;
      const fk=st==='wheat_g'||st==='corn_g'?'生长':(st==='wheat_r'||st==='corn_r'?'收获':(st==='stubble'?'茬':'闲'));
      if(VTOPIC.farm[fk]){cat='farm';key=fk;}
      else{cat='seas';key=cal.SEAS;}
    }
  }
  if(!cat)return null;
  /* 户覆盖优先，通用兜底——两池合并（户腔调在前，通用内容在后），浅池也有轮换空间 */
  let pool=null;
  const per=VTOPIC.per[nm];
  const perPool=per?((cat==='built')?(per[key]||null):(per[key]||null)):null;
  const genPool=(cat==='built')?[VTOPIC.built[key]]:((cat==='lack')?VTOPIC.lack:(VTOPIC[cat]&&VTOPIC[cat][key])||null);
  pool=(perPool&&perPool.length)?perPool.concat(perPool,genPool||[]):(genPool&&genPool.length?genPool:null);   /* 户句×2：腔调占2/3概率，通用补轮换——满仓粮荒时多半说「我叫满仓可仓里不满」而不是通用愁 */
  if(!pool||!pool.length)return null;
  /* 半仙特例：话=村历宜忌；秋生特例：梆子打底 */
  const h=(nm.charCodeAt(0)*31+nm.charCodeAt(nm.length-1)*7+key.length*13+Math.floor(tSec/12));
  let out=pool[h%pool.length];
  if(nm==='半仙'&&VH.up){const y=yiJi(Math.floor((Date.now()-VH.up)/DAY_MS));out='我看今儿宜'+y.yi+(weather==='snow'?'——雪天另说。':'。');}
  if(nm==='秋生'&&!out.startsWith('（梆子'))out='（梆子没停）'+out;
  /* 去重：跟上一句不同才用，同则取池内下一句 */
  if(lastSay[nm]===out&&pool.length>1){const i=pool.indexOf(out);out=pool[(i+1)%pool.length];}
  lastSay[nm]=out;
  return out;
}
let bubbleHold=0;   /* v95：回应气泡9秒内不被自动内容覆盖（TA报「打招呼按没反应」的根：bubbleTick每帧自动showBubble顶掉npcOpt的回应） */
window.__npcNearId=null;
window.npcOpt=function(k){
  const id=window.__npcNearId;
  const nm=id&&VH.homes[id]?VH.homes[id].name:null;
  if(!nm)return;
  if(k===0){const vhB=homeByName(nm);const gB=VH.up?Math.floor((Date.now()-VH.up)/DAY_MS):0;const rpB=vhB&&vhB.startDay?roadPeriodOf(vhB,gB):null;const pool=rpB&&rpB.on?ROAD_GREET:(GREET[nm]||(isMarketDay()?MK_GREET:GREET_ANY));showBubble(id,pool[Math.floor(Math.random()*pool.length)],worldSec());bubbleHold=worldSec()+9;}
  else if(k===1){showBubble(id,askLine(nm),worldSec());bubbleHold=worldSec()+9;}
  else if(k===2){openTalk(nm);}
  else{hideBubble(id);const o=document.getElementById('npcOpts');if(o)o.style.display='none';}
};
function bubbleTick(tSec){   /* v94/v95：走近任何村民5格内→冒气泡+底部选项条；hold期内不覆盖回应 */
  for(const n in bubbleSprites){if(tSec-bubbleSprites[n].t0>9)hideBubble(n);}
  let best=null,bd=25;
  for(const id in (VH.homes||{})){
    const vh=VH.homes[id],nm=vh.name;
    const g=npcObjs[id];
    if(!g)continue;
    const dx=p.x-g.position.x,dz=p.z-g.position.z;
    const d2=dx*dx+dz*dz;
    if(d2>=25){hideBubble(id);continue;}
    if(d2<bd){bd=d2;best=id;}
  }
  window.__npcNearId=best;
  const opts=document.getElementById('npcOpts');
  if(best){
    if(worldSec()>=bubbleHold)showBubble(best,bubbleContent(VH.homes[best].name,tSec),tSec);
    if(opts&&opts.style.display!=='flex')opts.style.display='flex';
  }else{
    if(opts&&opts.style.display!=='none')opts.style.display='none';
  }
}
function moodTilt(tSec,npc){   /* v88.1：心情进脖颈——乐的抬头频率高，愁的沉头 */
  const m=moodMap[npc.name];
  if(!m)return 0;
  if(/喜|乐|盼|期|兴|热|暖/.test(m))return -0.18+Math.sin(tSec*0.9+npc.seed)*0.12;
  if(/愁|忧|烦|苦|闷|酸/.test(m))return 0.3+Math.sin(tSec*0.3+npc.seed)*0.03;
  if(/稳|实|细|勤/.test(m))return 0.08;
  return 0;
}
let mindDispatched=false;
function bootMindCheck(){
  if(mindDispatched)return;mindDispatched=true;
  if(!VH||!VH.up)return;
  if(!NPC_TOKEN||rawMode){   /* v84：游客也拉行程数据（同源副本只读）——不dispatch */
    ghSame('villagers_memory.json').then(({data})=>{if(data&&data.minds)MINDS=data;}).catch(()=>{});
    return;
  }
  ghGet('villagers_memory.json').then(({data})=>{
    if(data&&data.minds){MINDS=data;setTimeout(updateGrainBins,400);setTimeout(executeJudgePlans,900);setTimeout(executeRepairs,1200);}   /* v84：拉到就存；v111码粮囤；v112建设落地；v123环境处置 */
    const day=Math.floor((Date.now()-VH.up)/DAY_MS);
    if(data&&data.moodDay===day&&data&&data.schedDay===day)return;   // 今天都养过了
    return ghFetch('https://api.github.com/repos/inklotus007/hetan/actions/workflows/talk_reply.yml/dispatches',{method:'POST',headers:{'Authorization':'bearer '+NPC_TOKEN,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({ref:'main'})},10000).then(()=>{apiStat='村里人开始想今天的心思——一分钟';});
  }).catch(()=>{});
}
function closeTalk(){
  document.getElementById('talkUI').style.display='none';
  talkNpc=null;
  if(talkTid){clearInterval(talkTid);talkTid=null;}
}
/* v110：送礼——外来人带的礼不走物品栏（河滩的行囊是搭方块的），走口信通道：gift_queue.json→判定者入账→心愿了结/情分+回赠 */
const GIFT_ITEMS=['粮','柴','蛋','布','线','鱼','铁','木','盐','油','钱'];
let giftPick=null,giftQty=1;
function openGift(){
  if(!talkNpc)return;
  const p=document.getElementById('giftPanel');
  p.style.display=p.style.display==='none'?'block':'none';
  if(p.style.display==='block'){
    giftPick=null;giftQty=1;
    document.getElementById('giftSel').textContent='（还没挑）';
    const box=document.getElementById('giftItems');
    box.innerHTML=GIFT_ITEMS.map(it=>'<button onclick="pickGift(\''+it+'\')" style="border:1px solid #c9a86a;border-radius:5px;background:#fbf6e8;color:#3a2f1e;padding:4px 10px;font-size:13px;cursor:pointer">'+it+'</button>').join('');
  }
}
function closeGift(){document.getElementById('giftPanel').style.display='none';}
function pickGift(it){
  giftPick=it;giftQty=1;
  document.getElementById('giftSel').textContent=it+' ×'+giftQty;
  document.getElementById('giftItems').querySelectorAll('button').forEach(b=>{
    b.style.background=b.textContent===it?'#d8c9a3':'#fbf6e8';
  });
}
function sendGift(){
  if(!talkNpc||!giftPick){toast('先挑一样');return;}
  const item={id:'g'+Date.now()+Math.random().toString(36).slice(2,6),npc:talkNpc,item:giftPick,qty:giftQty,by:(ME&&ME.name)||'客',t:Date.now()};
  const nm=talkNpc;
  ghGet('gift_queue.json').then(({sha,data})=>{
    const q=Array.isArray(data)?data:[];
    q.push(item);
    return ghPut('gift_queue.json',q,sha,'送礼：'+nm+'收下'+item.item);
  }).catch(()=>{
    return ghGet('gift_queue.json').then(({sha,data})=>{
      const q2=Array.isArray(data)?data:[];
      if(!q2.some(x=>x.id===item.id))q2.push(item);
      return ghPut('gift_queue.json',q2,sha,'送礼补推：'+nm);
    });
  }).then(()=>{
    showBubble(window.__npcNearId,'哎，这怎么好意思。',worldSec());
    bubbleHold=worldSec()+9;
    toast(nm+'收下了'+item.item+'——村里人想好了才回话');
    closeGift();
  }).catch(()=>toast('没递出去——再试一次'));
}
function sendTalk(){
  const inp=document.getElementById('talkIn');
  const text=(inp.value||'').trim();
  if(!text||!talkNpc)return;
  const item={id:'t'+Date.now()+Math.random().toString(36).slice(2,6),npc:talkNpc,name:(ME&&ME.name)||'客',text,t:Date.now()};
  ghGet('talk_queue.json').then(({sha,data})=>{
    const q=Array.isArray(data)?data:[];
    q.push(item);
    return ghPut('talk_queue.json',q,sha,'捎话：'+talkNpc);
  }).catch(()=>{
    /* 409/422：别人先写——拉最新合并重推一次 */
    return ghGet('talk_queue.json').then(({sha,data})=>{
      const q2=Array.isArray(data)?data:[];
      if(!q2.some(x=>x.id===item.id))q2.push(item);
      return ghPut('talk_queue.json',q2,sha,'捎话重试');
    });
  }).then(()=>{
    talkPending={text};
    dayActs.talk++;   /* v88.1：今日说话数上账 */
    renderTalk({});
    inp.value='';
    toast('话捎到了——'+talkNpc+'想好了才答，一分钟上下');
  }).catch(()=>toast('话没捎到——再试一次'));
}
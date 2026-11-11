

let weather='clear',weatherUntil=0,rainPts=null,snowPts=null;
function tickWeather(now){
  if(!rainPts)initWeatherPts();   /* v57.4：惰性创建——rAF内p已就绪 */
  if(!weatherUntil){weatherUntil=now+90000+Math.random()*150000;return;}
  if(now>weatherUntil){
    const r=Math.random();
    const wx=WXW[(VH.homes&&calNow().SEAS)||'春'];
    weather=r<wx[0]?'clear':r<wx[0]+wx[1]?'rain':'snow';villInitDay=-999;
    weatherUntil=now+90000+Math.random()*150000;
    if(weather==='rain')toast('下雨了');
    else if(weather==='snow')toast('落雪了');
    else toast('天晴了');
    AU.rain(weather==='rain');
  }
  const yTop=p.y+26,yBot=p.y-6;
  function fall(pts,spd,sway,now){
    const pos=pts.geometry.attributes.position, arr=pos.array;
    for(let i=0;i<arr.length;i+=3){
      arr[i+1]-=spd;
      if(sway)arr[i]+=Math.sin(now*0.001+i)*0.03;
      if(arr[i+1]<yBot){arr[i+1]=yTop;arr[i]=p.x+(Math.random()-0.5)*80;arr[i+2]=p.z+(Math.random()-0.5)*80;}
    }
    pos.needsUpdate=true;
  }
  if(weather==='rain'&&rainPts){
    rainPts.visible=true;
    fall(rainPts,1.6,false,now);
  }else if(rainPts)rainPts.visible=false;
  if(weather==='snow'&&snowPts){
    snowPts.visible=true;
    fall(snowPts,0.22,true,now);
  }else if(snowPts)snowPts.visible=false;
}
function initWeatherPts(){   /* v57.4：IIFE在p声明前立即执行=TDZ（v56.1修过但replay基线丢失复燃——hotfix必须进基线） */
  const mk=(n,color,size)=>{
    const g=new THREE.BufferGeometry();
    const arr=new Float32Array(n*3);
    for(let i=0;i<n;i++){arr[i*3]=p.x+(Math.random()-0.5)*80;arr[i*3+1]=p.y+Math.random()*32-6;arr[i*3+2]=p.z+(Math.random()-0.5)*80;}
    g.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const m=new THREE.PointsMaterial({color,size,transparent:true,opacity:0.55,depthWrite:false,sizeAttenuation:true});
    const pts=new THREE.Points(g,m);pts.visible=false;pts.frustumCulled=false;scene.add(pts);return pts;
  };
  rainPts=mk(900,0x9fc4e8,0.16);
  snowPts=mk(600,0xffffff,0.22);
}
// 几何：程序化canvas纹理（零外部文件）
function makeTex(kind){
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;
  const g=cv.getContext('2d');
  if(kind==='sack_grain'){   /* v122粮袋：麻袋+扎口+麦粒溢出 */
    g.fillStyle='#c9b489';g.fillRect(6,14,52,48);
    g.fillStyle='#b8a276';g.fillRect(6,14,52,6);
    g.strokeStyle='#8a744e';g.lineWidth=2;
    for(let y=24;y<60;y+=8){g.beginPath();g.moveTo(8,y);g.quadraticCurveTo(32,y+3,56,y);g.stroke();}
    g.fillStyle='#a08858';g.fillRect(24,6,16,10);   /* 扎口颈 */
    g.strokeStyle='#6a5a3a';g.beginPath();g.moveTo(22,12);g.lineTo(42,12);g.stroke();
    g.fillStyle='#d8b84a';for(let i=0;i<14;i++)g.fillRect(10+Math.random()*44,52+Math.random()*8,3,2);
  }else if(kind==='sack_seed'){   /* v122种子袋：小种袋+散种 */
    g.fillStyle='#a8885a';g.fillRect(12,20,40,42);
    g.fillStyle='#94744a';g.fillRect(12,20,40,5);
    g.strokeStyle='#6a5236';g.lineWidth=2;
    for(let y=30;y<58;y+=7){g.beginPath();g.moveTo(14,y);g.quadraticCurveTo(32,y+2,50,y);g.stroke();}
    g.fillStyle='#8a6a3e';g.fillRect(26,12,12,10);
    g.fillStyle='#c8a44a';for(let i=0;i<10;i++)g.fillRect(16+Math.random()*32,54+Math.random()*6,2,2);
  }else if(kind==='tool_rack'){   /* v122工具架：木架+锄镰 */
    g.fillStyle='#8a6a48';g.fillRect(4,4,8,56);g.fillRect(52,4,8,56);g.fillRect(4,8,56,6);
    g.fillStyle='#6a5236';g.fillRect(10,20,3,26);   /* 锄柄 */
    g.fillStyle='#9a9a9a';g.fillRect(9,16,10,6);    /* 锄头 */
    g.fillStyle='#7a5b3a';g.fillRect(38,24,3,30);   /* 镰柄 */
    g.fillStyle='#b0b0b0';g.fillRect(38,18,14,4);   /* 镰刃 */
    g.fillStyle='#5a4a30';g.fillRect(4,50,56,4);
  }
  const dot=(n,style,s)=>{g.fillStyle=style;for(let i=0;i<n;i++)g.fillRect(Math.random()*63|0,Math.random()*63|0,s||2,s||2);};
  if(kind==='grass_top'){
    g.fillStyle='#7aa25c';g.fillRect(0,0,64,64);
    dot(150,'#688f4c',1);dot(110,'#8bb26a',1);dot(60,'#557a3e',1);dot(40,'#95bd74',1);
    g.strokeStyle='#5d8a4a';for(let i=0;i<34;i++){const x=Math.random()*64,y=Math.random()*64;g.beginPath();g.moveTo(x,y);g.lineTo(x+1,y-3);g.stroke();}
  }else if(kind==='grass_side'){
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    dot(50,'#75583c');dot(30,'#9a7a54');
    g.fillStyle='#7aa25c';g.fillRect(0,0,64,14);
    g.strokeStyle='#688f4c';for(let x=0;x<64;x+=3){g.beginPath();g.moveTo(x,14);g.lineTo(x+1,14+(x*7%9));g.stroke();}
  }else if(kind==='water'){
    g.fillStyle='#4d8fae';g.fillRect(0,0,64,64);
    // 三条浅色波纹：x方向取整周期（2πk/64），相邻格子的纹理首尾对齐，不再一格一格
    g.strokeStyle='rgba(215,238,248,.45)';g.lineWidth=2;
    for(let i=0;i<3;i++){
      g.beginPath();
      for(let x=0;x<=64;x+=4){
        const y=11+i*20+Math.sin(x/64*Math.PI*4+i*2.1)*3.2;
        x===0?g.moveTo(x,y):g.lineTo(x,y);
      }
      g.stroke();
    }
    dot(24,'rgba(230,246,252,.22)',3);
  }else if(kind==='snow'){
    /* v59：雪面不再是白盒子——底色暗一档+密集细噪+明暗起伏大斑+碎冰纹 */
    g.fillStyle='#e0e8f0';g.fillRect(0,0,64,64);
    g.fillStyle='rgba(200,214,228,.5)';for(let i=0;i<9;i++){g.beginPath();g.ellipse(Math.random()*64,Math.random()*64,6+Math.random()*10,4+Math.random()*7,Math.random()*3,0,7);g.fill();}
    g.fillStyle='rgba(246,250,254,.55)';for(let i=0;i<7;i++){g.beginPath();g.ellipse(Math.random()*64,Math.random()*64,5+Math.random()*9,3+Math.random()*6,Math.random()*3,0,7);g.fill();}
    dot(240,'#d2dfea',1);dot(160,'#eef4fa',1);dot(90,'#c4d3e0',1);dot(60,'#f8fbff',1);
    g.strokeStyle='rgba(178,196,214,.6)';g.lineWidth=1;
    for(let i=0;i<6;i++){g.beginPath();let x=Math.random()*60,y=Math.random()*60;g.moveTo(x,y);for(let k=0;k<3;k++){x+=Math.random()*8-4;y+=Math.random()*8-4;g.lineTo(x,y);}g.stroke();}
  }else if(kind==='snow_side'){
    /* v59：雪覆石侧面——上1/3积雪带碎棱，下面岩纹 */
    g.fillStyle='#8d8d8a';g.fillRect(0,0,64,64);
    dot(120,'#7c7c79',1);dot(80,'#9c9c99',1);dot(40,'#6f6f6c',1);
    g.fillStyle='#e0e8f0';g.fillRect(0,0,64,20);
    g.fillStyle='#cfdbe6';for(let x=0;x<64;x+=4)g.fillRect(x,18,3,2+((x*7)%5));
    dot(60,'#d8e2ec',1);dot(30,'#eef4fa',1);dot(20,'#c4d3e0',1);
  }else if(kind==='dirt'){
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    dot(150,'#75583c',1);dot(90,'#9a7a54',1);dot(30,'#6a6a66',1);
  }else if(kind==='farm'){
    g.fillStyle='#5a4328';g.fillRect(0,0,64,64);
    for(let y=6;y<64;y+=10){g.fillStyle='#46331d';g.fillRect(0,y,64,3);}
    dot(50,'#6a5030',1);dot(26,'#3e2d18',1);dot(18,'#7c5e3a',1);
  }else if(kind==='wheat_y'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#8fb35c';g.lineWidth=2;
    for(let i=0;i<22;i++){const x=4+Math.random()*56,y=42+Math.random()*20;g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.random()*3-1.5),y-8-Math.random()*6);g.stroke();}
  }else if(kind==='wheat_g'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#6f9c42';g.lineWidth=2;
    for(let i=0;i<30;i++){const x=3+Math.random()*58;g.beginPath();g.moveTo(x,52);g.lineTo(x+(Math.random()*4-2),52-20-Math.random()*12);g.stroke();g.fillStyle='#8fb35c';g.fillRect(x-1,52-30,3,4);}
  }else if(kind==='wheat_r'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#c8a842';g.lineWidth=2;
    for(let i=0;i<30;i++){const x=3+Math.random()*58;g.beginPath();g.moveTo(x,52);g.lineTo(x+(Math.random()*4-2),52-22-Math.random()*12);g.stroke();g.fillStyle='#e2c35c';g.fillRect(x-1,52-32,3,8);}
  }else if(kind==='corn_g'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#4f8a3a';g.lineWidth=3;
    for(let i=0;i<13;i++){const x=5+i*4.5;g.beginPath();g.moveTo(x,54);g.lineTo(x+(Math.random()*7-3.5),16+Math.random()*10);g.stroke();}
  }else if(kind==='corn_r'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#b09040';g.lineWidth=3;
    for(let i=0;i<13;i++){const x=5+i*4.5;g.beginPath();g.moveTo(x,54);g.lineTo(x+(Math.random()*7-3.5),16+Math.random()*10);g.stroke();g.fillStyle='#d8b458';g.fillRect(x-2,22+Math.random()*10,4,9);}
  }else if(kind==='stubble'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#b8a060';g.lineWidth=2;
    for(let i=0;i<26;i++){const x=3+Math.random()*58;g.beginPath();g.moveTo(x,54);g.lineTo(x+(Math.random()*2-1),46+Math.random()*4);g.stroke();}
  }else if(kind==='stone'){
    g.fillStyle='#8d8d8a';g.fillRect(0,0,64,64);
    dot(150,'#7c7c79',1);dot(100,'#9c9c99',1);dot(50,'#84847e',1);
    g.strokeStyle='#6f6f6c';g.lineWidth=1.5;
    for(let i=0;i<3;i++){g.beginPath();let x=Math.random()*50+5,y=Math.random()*50+5;g.moveTo(x,y);g.lineTo(x+Math.random()*14-7,y+Math.random()*14-7);g.stroke();}
  }else if(kind==='sand'){
    g.fillStyle='#d6c58c';g.fillRect(0,0,64,64);
    dot(200,'#c4b27a',1);dot(90,'#e2d4a0',1);dot(50,'#ccb982',1);
  }else if(kind==='wood_side'){
    g.fillStyle='#7a5b3a';g.fillRect(0,0,64,64);
    for(let x=2;x<64;x+=7){g.fillStyle='#5f4629';g.fillRect(x,0,2,64);}
    dot(14,'#8f6c46',1);
    g.fillStyle='#5f4629';g.beginPath();g.ellipse(30,40,4,6,0,0,7);g.fill();
  }else if(kind==='wood_top'){
    g.fillStyle='#8f6c46';g.fillRect(0,0,64,64);
    for(let r=4;r<34;r+=6){g.strokeStyle=r%12===4?'#5f4629':'#7a5b3a';g.lineWidth=2;g.beginPath();g.arc(32,32,r,0,7);g.stroke();}
  }else if(kind==='leaves'){
    /* v59：叶簇感——深底+成团叶簇+透光亮点，森林不是绿馒头 */
    g.fillStyle='#41652f';g.fillRect(0,0,64,64);
    for(let i=0;i<46;i++){const x=Math.random()*62,y=Math.random()*62,s=2+Math.random()*4;g.fillStyle=Math.random()<0.5?'#4d7a39':'#35521f';g.fillRect(x,y,s,s);}
    for(let i=0;i<34;i++){const x=Math.random()*62,y=Math.random()*62,s=2+Math.random()*3;g.fillStyle=Math.random()<0.5?'#5d8a4a':'#6f9e5c';g.fillRect(x,y,s,s);}
    dot(50,'#8fb877',1);dot(26,'#a8cc88',1);
  }else if(kind==='brick'){
    g.fillStyle='#a8563e';g.fillRect(0,0,64,64);
    g.fillStyle='#cfc4b0';
    for(let y=0;y<64;y+=12)g.fillRect(0,y,64,2);
    for(let y=0,row=0;y<64;y+=12,row++)for(let x=(row%2?0:8);x<64;x+=16)g.fillRect(x,y,2,12);
    dot(24,'#94462f',1);
  }else if(kind==='plank'){
    g.fillStyle='#b08a54';g.fillRect(0,0,64,64);
    for(let y=4;y<64;y+=12){g.fillStyle='#8a6a3c';g.fillRect(0,y,64,2);}
    g.fillStyle='#6a4f2a';for(let y=10;y<64;y+=12){g.fillRect(6,y,2,2);g.fillRect(54,y,2,2);}
    dot(20,'#c49a62',1);
  }else if(kind==='glass'){
    g.clearRect(0,0,64,64);
    g.strokeStyle='#d8e8ec';g.lineWidth=3;g.strokeRect(2,2,60,60);
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;
    g.beginPath();g.moveTo(10,44);g.lineTo(44,10);g.stroke();
    g.beginPath();g.moveTo(20,52);g.lineTo(52,20);g.stroke();
    g.fillStyle='rgba(200,225,235,.18)';g.fillRect(4,4,56,56);
  }else if(kind==='stonebrick'){
    /* v59：错缝砖块分明——每砖独立明暗+边线高光阴影+点蚀，学院质感 */
    g.fillStyle='#84847e';g.fillRect(0,0,64,64);
    const rows=[0,16,32,48];
    for(let r=0;r<4;r++){
      const off=(r%2)*16;
      for(let cx=-1;cx<5;cx++){
        const bx=cx*32+off, by=rows[r], bw=30, bh=14;
        const x0=Math.max(0,bx), wpx=Math.min(64,bx+bw)-x0;
        if(wpx<=0)continue;
        const shade=0.92+Math.random()*0.16, base=Math.round(154*shade);
        g.fillStyle=`rgb(${base},${base},${Math.round(base*0.97)})`;
        g.fillRect(x0,by,wpx,bh);
        g.fillStyle='rgba(60,60,56,.55)';g.fillRect(x0,by+bh-2,wpx,2);   /* 砖底阴影 */
        g.fillStyle='rgba(215,215,208,.4)';g.fillRect(x0,by,wpx,1);       /* 砖顶高光 */
        g.strokeStyle='rgba(52,52,48,.5)';g.lineWidth=1.5;g.strokeRect(x0+0.5,by+0.5,wpx-1,bh-1);
      }
    }
    dot(110,'#7a7a74',1);dot(70,'#a2a29c',1);dot(26,'#6a6a64',1);
  }else if(kind==='lantern'){
    g.fillStyle='#e8b860';g.fillRect(8,6,48,52);                 // 纸罩
    g.fillStyle='#c89840';for(let x=8;x<56;x+=8)g.fillRect(x,6,2,52);  // 竖骨
    g.fillStyle='#5a3320';g.fillRect(4,0,56,6);g.fillRect(4,58,56,6);  // 上下盖
    g.fillStyle='#fff0c0';g.fillRect(26,16,12,32);               // 亮芯
    dot(10,'#ffdf80',3);
  }else if(kind==='flower_red'||kind==='flower_yellow'||kind==='grass'){
    const petal=kind==='flower_red'?'#d84434':(kind==='flower_yellow'?'#e8c832':null);
    g.fillStyle='#4e7a3a';                                  // 茎和叶底色
    g.fillRect(30,28,4,36);g.fillRect(22,44,8,3);g.fillRect(34,52,8,3);   // 茎+两片叶
    if(petal){
      g.fillStyle=petal;
      [[20,8],[40,8],[12,16],[48,16],[20,24],[40,24],[30,4],[12,8],[48,8],[30,28]].forEach(([x,y])=>g.fillRect(x,y,10,10));
      g.fillStyle=kind==='flower_red'?'#f0d060':'#a05a20';g.fillRect(28,14,10,10);   // 花心
    }else{
      g.fillStyle='#5d8a4a';
      [[8,20],[18,10],[28,2],[38,14],[48,6],[56,22],[14,34],[46,36],[6,44],[54,46]].forEach(([x,y])=>{g.fillRect(x,y,5,26);g.fillRect(x+2,y-6,3,8);});
      g.fillStyle='#688f4c';[[23,18],[43,26],[3,28]].forEach(([x,y])=>g.fillRect(x,y,4,20));
    }
  }else if(kind==='torch'){
    g.fillStyle='#8a5a30';g.fillRect(0,0,64,64);   // 木杆
    g.fillStyle='#6e4522';for(let y=18;y<64;y+=11)g.fillRect(0,y,64,2);
    g.fillStyle='#fff2a8';g.fillRect(0,0,64,16);   // 火焰亮芯
    g.fillStyle='#ffb040';g.fillRect(0,16,64,7);   // 火焰橙
    g.fillStyle='#ff5a20';g.fillRect(0,23,64,3);
    dot(26,'#ffd060',3);dot(8,'#ff7a30',2);
  }else if(kind==='potted'){
    /* v61 盆栽：下1/3陶盆，上2/3花团——十字面片整体贴图 */
    g.fillStyle='#a0522d';g.fillRect(0,26,64,38);
    g.fillStyle='#8b4513';g.fillRect(6,26,52,4);
    g.fillStyle='#c06a3a';g.fillRect(10,32,44,26);
    g.fillStyle='#8b4513';g.fillRect(14,58,36,6);
    /* 绿叶+花团 */
    g.fillStyle='#4d7a39';for(let i=0;i<14;i++)g.fillRect(14+Math.random()*36|0,14+Math.random()*14|0,4,4);
    g.fillStyle='#5d8a4a';for(let i=0;i<9;i++)g.fillRect(16+Math.random()*32|0,10+Math.random()*14|0,3,3);
    g.fillStyle='#d94f4f';[[26,12],[36,10],[22,18],[40,18],[31,16]].forEach(([x,y])=>g.fillRect(x,y,7,7));
    g.fillStyle='#f0d060';g.fillRect(30,13,8,7);
  }else if(kind==='stove_side'){
    /* v61 炉侧：石身+正面炉口（黑洞+火） */
    g.fillStyle='#8d8d8a';g.fillRect(0,0,64,64);
    dot(110,'#7c7c79',1);dot(70,'#9c9c99',1);
    g.fillStyle='#6e6e6a';g.fillRect(0,52,64,12);
    g.fillStyle='#1a1a18';g.fillRect(16,28,32,26);
    g.fillStyle='#ff8c1a';g.fillRect(20,40,24,13);
    g.fillStyle='#ffd24a';g.fillRect(26,46,12,7);
    g.fillStyle='#666';g.fillRect(4,6,56,4);
  }else if(kind==='stove_top'){
    /* v61 炉顶：灶台面+两口灶眼 */
    g.fillStyle='#7a7a76';g.fillRect(0,0,64,64);
    dot(60,'#6a6a66',1);dot(40,'#8a8a86',1);
    g.fillStyle='#2a2a28';g.beginPath();g.arc(20,32,9,0,7);g.fill();
    g.beginPath();g.arc(45,32,9,0,7);g.fill();
    g.fillStyle='#ff8c1a';g.beginPath();g.arc(20,32,5,0,7);g.fill();
    g.beginPath();g.arc(45,32,5,0,7);g.fill();
  }else if(kind==='fp_front'){
    /* v61 壁炉正面：石框+火膛大火 */
    g.fillStyle='#84847e';g.fillRect(0,0,64,64);
    dot(80,'#74746f',1);dot(50,'#94948f',1);
    g.fillStyle='#5a5a55';g.fillRect(0,0,64,10);g.fillRect(0,54,64,10);
    g.fillStyle='#5a5a55';g.fillRect(0,0,12,64);g.fillRect(52,0,12,64);
    g.fillStyle='#141412';g.fillRect(14,18,36,36);
    g.fillStyle='#ff7a1a';g.fillRect(18,34,28,20);
    g.fillStyle='#ffb840';g.fillRect(23,42,18,12);
    g.fillStyle='#ffe880';g.fillRect(28,48,8,6);
    dot(16,'#ff9a3a',2);
  }else if(kind==='fp_top'){
    g.fillStyle='#84847e';g.fillRect(0,0,64,64);dot(70,'#74746f',1);dot(50,'#94948f',1);
  }else if(kind==='fp_side'){
    g.fillStyle='#84847e';g.fillRect(0,0,64,64);
    dot(90,'#74746f',1);dot(60,'#94948f',1);dot(24,'#6a6a64',1);
    g.fillStyle='#5a5a55';g.fillRect(0,0,64,4);g.fillRect(0,60,64,4);
  }else if(kind==='firepit'){
    /* v62 火塘顶面：石圈外框+中心炭火（俯视） */
    g.fillStyle='#6f6f6c';g.fillRect(0,0,64,64);
    dot(80,'#5f5f5c',1);dot(60,'#7f7f7c',1);
    g.fillStyle='#4a4a46';g.fillRect(6,6,52,52);
    g.fillStyle='#3a3a36';g.fillRect(12,12,40,40);
    g.fillStyle='#ff7a1a';g.fillRect(16,16,32,32);
    g.fillStyle='#ffb840';g.fillRect(22,22,20,20);
    g.fillStyle='#ffe880';g.fillRect(27,27,10,10);
    dot(30,'#ff9a3a',2);
  }else if(kind==='fpit_side'){
    /* v62 火塘侧面：石台横视+中央火苗探出 */
    g.fillStyle='#6f6f6c';g.fillRect(0,0,64,64);
    dot(70,'#5f5f5c',1);dot(50,'#7f7f7c',1);
    g.fillStyle='#4a4a46';g.fillRect(0,40,64,24);
    g.fillStyle='#3a3a36';g.fillRect(8,44,48,20);
    /* 火苗从台面探出（上半透明感用亮色） */
    g.fillStyle='#ff7a1a';g.fillRect(22,14,20,32);
    g.fillStyle='#ffb840';g.fillRect(26,22,12,24);
    g.fillStyle='#ffe880';g.fillRect(29,30,6,16);
    dot(26,'#ff9a3a',2);
  }else if(kind==='stairside'){
    /* v69楼梯侧面：木色+栏杆柱痕 */
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    g.fillStyle='#75583c';for(let y=8;y<64;y+=18)g.fillRect(0,y,64,4);
    g.fillStyle='#5f4630';g.fillRect(0,0,64,5);
    dot(60,'#6f5335',1);
  }else if(kind==='stairtop'){
    /* v69楼梯踏面：木纹+防滑槽 */
    g.fillStyle='#9a7a54';g.fillRect(0,0,64,64);
    g.fillStyle='#75583c';for(let y=6;y<64;y+=12)g.fillRect(0,y,64,3);
    g.fillStyle='#a88a64';g.fillRect(0,0,64,3);
    dot(40,'#8a6a48',1);
  }else if(kind==='dgate_front'){
    /* v64 对开大门正面（3格宽4格高比例192×256）：木框+两扇各带把手+中缝+顶楣 */
    g.fillStyle='#6a4d30';g.fillRect(0,0,192,256);
    g.fillStyle='#8a6a48';g.fillRect(8,20,176,236);
    g.fillStyle='#5f4630';g.fillRect(8,20,176,6);g.fillRect(8,244,176,12);
    g.fillStyle='#5f4630';g.fillRect(92,20,8,236);   /* 中缝 */
    /* 左右扇竖木纹 */
    for(const x0 of [8,100]){for(let x=x0+8;x<x0+84;x+=14){g.fillStyle='#75583c';g.fillRect(x,26,3,218);g.fillStyle='#9a7a54';g.fillRect(x+7,26,2,218);}}
    /* 门钉两排 */
    g.fillStyle='#e8d8a0';for(const y of [60,180]){for(let x=26;x<180;x+=34)g.fillRect(x,y,6,6);}
    /* 双把手（各扇内侧） */
    g.fillStyle='#e8d8a0';g.fillRect(74,130,10,10);g.fillRect(108,130,10,10);
  }else if(kind==='bed_top2'){
    /* v64 大床顶面（2×3格比例128×192）：枕头+被褶 */
    g.fillStyle='#b03a3a';g.fillRect(0,0,128,192);
    g.fillStyle='#8a2a2a';g.fillRect(0,0,128,26);
    g.fillStyle='#e8e0d0';g.fillRect(10,8,108,44);   /* 枕头 */
    g.fillStyle='#d8d0c0';for(let y=70;y<192;y+=18)g.fillRect(0,y,128,5);   /* 被褶 */
    g.fillStyle='#983030';g.fillRect(0,186,128,6);
  }else if(kind==='bed_head2'){
    /* v64 床头板（2格宽比例128×64）：木横条 */
    g.fillStyle='#8a6a48';g.fillRect(0,0,128,64);
    g.fillStyle='#75583c';for(let y=10;y<64;y+=16)g.fillRect(0,y,128,6);
    g.fillStyle='#9a7a54';g.fillRect(0,0,128,4);
  }else if(kind==='gate_front'){
    /* v62 宅门正面（三格高门楼）：石框+双扇门板+门钉+中缝 */
    g.fillStyle='#8d8d8a';g.fillRect(0,0,64,64);
    dot(60,'#7c7c79',1);dot(40,'#9c9c99',1);
    /* 石门框：两侧宽柱+顶梁 */
    g.fillStyle='#7a7a76';g.fillRect(0,0,10,64);g.fillRect(54,0,10,64);
    g.fillStyle='#6a6a66';g.fillRect(0,0,64,8);
    g.fillStyle='#9c9c99';g.fillRect(10,8,44,2);   /* 框内沿高光 */
    /* 门板：两扇+中缝 */
    g.fillStyle='#7a5b3a';g.fillRect(10,8,26,56);g.fillRect(28,8,26,56);
    g.fillStyle='#6a4d30';g.fillRect(26,8,2,56);   /* 中缝 */
    g.fillStyle='#5f4630';for(let x=12;x<26;x+=6)g.fillRect(x,10,3,3);   /* 左扇门钉 */
    for(let x=32;x<52;x+=6)g.fillRect(x,10,3,3);          /* 右扇门钉 */
    g.fillStyle='#8a6a48';g.fillRect(12,36,22,3);g.fillRect(30,36,22,3);  /* 横闩 */
    g.fillStyle='#e8d8a0';g.fillRect(22,38,3,3);g.fillRect(40,38,3,3);    /* 双把手 */
  }else if(kind==='gate_side'){
    /* v62 宅门侧/顶：厚石框面 */
    g.fillStyle='#8d8d8a';g.fillRect(0,0,64,64);
    dot(80,'#7c7c79',1);dot(50,'#9c9c99',1);
    g.fillStyle='#6a6a66';g.fillRect(0,0,64,10);g.fillRect(0,54,64,10);
  }else if(kind==='gate_top'){
    g.fillStyle='#7a7a76';g.fillRect(0,0,64,64);dot(60,'#6a6a66',1);dot(40,'#8a8a86',1);
  }else if(kind==='door'){
    /* v61 木门：竖木纹+门框+把手 */
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    g.fillStyle='#75583c';for(let x=6;x<64;x+=14)g.fillRect(x,0,3,64);
    g.fillStyle='#9a7a54';for(let x=13;x<64;x+=14)g.fillRect(x,0,2,64);
    g.fillStyle='#5f4630';g.fillRect(0,0,64,5);g.fillRect(0,59,64,5);g.fillRect(0,0,5,64);g.fillRect(59,0,5,64);
    g.fillStyle='#5f4630';g.fillRect(0,30,64,4);
    g.fillStyle='#e8d8a0';g.beginPath();g.arc(50,38,3.4,0,7);g.fill();
    dot(50,'#6f5335',1);
  }else if(kind==='roof'){
    g.fillStyle='#7a4a42';g.fillRect(0,0,64,64);
    for(let y=0;y<64;y+=8){g.fillStyle='#653a33';g.fillRect(0,y,64,3);
      g.fillStyle='#8a564c';g.fillRect(0,y+3,64,2);}
    dot(14,'#5a332d',1);
  }else if(kind==='bed_top'){   // v50床褥：米色褥面+枕头在床头端（贴图下方对应世界+z=床头）
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    g.fillStyle='#c9b892';g.fillRect(4,4,56,56);
    g.fillStyle='#ece6d4';g.fillRect(8,42,48,15);   // 枕头
    g.strokeStyle='#d8d0ba';g.strokeRect(8,42,48,15);
    g.fillStyle='#a4584a';g.fillRect(4,10,56,28);   // 被子
    g.strokeStyle='#8f4a3c';for(let x=9;x<58;x+=10){g.beginPath();g.moveTo(x,12);g.lineTo(x,36);g.stroke();}
  }else if(kind==='bed_head'){   // 床头板竖纹
    g.fillStyle='#7a5b3a';g.fillRect(0,0,64,64);
    for(let x=2;x<64;x+=7){g.fillStyle='#5f4629';g.fillRect(x,0,2,64);}
    g.fillStyle='#8f6c46';g.fillRect(0,0,64,8);
  }else if(kind==='cab_front'){   // 柜门：两扇+铜拉手
    g.fillStyle='#8a6a48';g.fillRect(0,0,64,64);
    g.strokeStyle='#5f4629';g.lineWidth=3;g.strokeRect(4,4,26,56);g.strokeRect(34,4,26,56);
    g.fillStyle='#d8c078';g.beginPath();g.arc(26,34,3,0,7);g.fill();g.beginPath();g.arc(38,34,3,0,7);g.fill();
    dot(10,'#75583c',1);
  }else if(kind==='banner'){   // 幌：蓝布白边，一个「宿」字
    g.fillStyle='#31538a';g.fillRect(0,0,64,64);
    g.fillStyle='#c9b892';g.fillRect(0,0,64,5);g.fillRect(0,59,64,5);g.fillRect(0,0,5,64);g.fillRect(59,0,5,64);
    g.fillStyle='#f2e6c8';g.font='bold 36px "KaiTi","STKaiti","楷体",serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText('宿',32,34);
  }
  const t=new THREE.CanvasTexture(cv);
  t.magFilter=THREE.NearestFilter;   // 像素感，MC的骨架
  return t;
}
const TEXC={};
function texOf(n){if(!TEXC[n])TEXC[n]=makeTex(n);return TEXC[n];}
// 几何：普通方块 + 水稍矮半透明
const geo=new THREE.BoxGeometry(1,1,1);
const meshes={};
const stairGeo=new THREE.BoxGeometry(1,0.47,1);stairGeo.translate(0,-0.235,0);   // 台阶：半块躺在格子下半；v40：底面抬离格底0.03——原共面z-fighting远看闪烁
const torchGeo=new THREE.BoxGeometry(0.18,0.9,0.18);torchGeo.translate(0,0.03,0);   // 火把：细杆立着；v40：底面离格底0.08——原0.005远距离z-fighting
/* v37 装饰植物：两片十字交叉面片，像素纹理（透明底），不吃光照（Basic）——花该是亮的 */
const benchGeo=new THREE.BoxGeometry(1,0.42,1);benchGeo.translate(0,-0.5+0.21,0);   // 凳：满格半砖台——v41同志拿凳拼平台，0.55深的缝太大
/* v50：桥和旅馆的配套几何 */
const bedGeo=(()=>{   // v66大床：2格宽×3格长单box（v64实底：mergeGeo多件+材质数组=无groups=零绘制=「床空白」）——床头板改-z面纹理画
  const b=new THREE.BoxGeometry(1.85,0.42,2.85);b.translate(0.425,-0.5+0.21,0.925);return b;
})();
const cabGeo=new THREE.BoxGeometry(0.85,1.15,0.5);cabGeo.translate(0,-0.5+0.575,0.2);    // 柜：高身贴地靠格南
/* v61 家具几何：椅子/炉/壁炉/火塘/门 */
const chairGeo=(()=>{   // v64椅：座高0.5格（0.45m人体工学）、靠背到1格——plank满格
  const seat=new THREE.BoxGeometry(0.94,0.08,0.94);seat.translate(0,-0.5+0.5,0);
  const back=new THREE.BoxGeometry(0.94,0.56,0.09);back.translate(0,-0.5+0.5+0.28,0.94/2-0.045);
  const mkLeg=(dx,dz)=>{const l=new THREE.BoxGeometry(0.1,0.46,0.1);l.translate(dx,-0.5+0.23,dz);return l;};
  return [back,seat,mkLeg(-0.38,-0.38),mkLeg(0.38,-0.38),mkLeg(-0.38,0.38),mkLeg(0.38,0.38)].reduce((a,b)=>mergeGeo(a,b));
})();
/* v62：炉/壁炉/火塘全部单box+mats六面——v61实底：mergeGeo多件+mats只认材质[0]（BufferGeometry没有groups），火膛纹理根本没贴上（「壁炉没火」不是js限制是我的bug）。双柱/顶梁造型改纹理画 */
const stoveGeo=(()=>{const b=new THREE.BoxGeometry(1.0,0.86,1.0);b.translate(0,-0.5+0.43,0);return b;})();   // 炉：满格0.86高——顶灶眼侧炉口
const fpGeo=(()=>{const b=new THREE.BoxGeometry(1.0,1.34,0.8);b.translate(0,-0.5+0.67,0.06);return b;})();   // 壁炉：1.34高单box——正面fp_front画双柱+火膛大火
const firepitGeo=(()=>{const b=new THREE.BoxGeometry(0.9,0.34,0.9);b.translate(0,-0.5+0.17,0);return b;})();  // 火塘：0.34矮台——顶石圈炭火+侧面火苗探出
const doorGeo=(()=>{const b=new THREE.BoxGeometry(0.94,1.98,0.14);b.translate(0,-0.5+0.99,0);return b;})();   // v62门：两格高（门洞两格是人的尺寸，一格是狗洞——同志定的）
const gateGeo=(()=>{const b=new THREE.BoxGeometry(1.0,3.98,0.2);b.translate(0,-0.5+1.99,0);return b;})();     // v63宅门：四格高石门楼（TA定的：大门三格四格，弄到四格；v62实底：geo写了没接链，39走了doorGeo所以和门一样高）
const dgateGeo=(()=>{   // v64对开大门：3格宽×4格高（现实双开1.5-1.8m÷0.9m/格——TA定的三格），单类型跨格geo，主格在左端
  const L=new THREE.BoxGeometry(1.42,3.98,0.14);L.translate(0.21,-0.5+1.99,0);
  const M=new THREE.BoxGeometry(1.42,3.98,0.14);M.translate(1.65,-0.5+1.99,0);
  const top=new THREE.BoxGeometry(3.0,0.18,0.2);top.translate(1.5,-0.5+3.9,0);
  return [L,M,top].reduce((a,b)=>mergeGeo(a,b));
})();
/* v63/v64 开态geo：门板转90°贴侧——点门开关（状态存diffs值100+类型，全端同步）；v64对开=两扇各向外开 */
const OPEN_GEO={};
OPEN_GEO[37]=(()=>{const b=new THREE.BoxGeometry(0.14,1.98,0.94);b.translate(0.40,-0.5+0.99,0);return b;})();
OPEN_GEO[40]=(()=>{   // v66开态修正：左扇绕左轴贴-x外侧、右扇绕右轴贴+x外侧——「向两侧开」（v64实底：两扇都转去了同一边）
  const L=new THREE.BoxGeometry(0.14,3.98,1.42);L.translate(-0.07,-0.5+1.99,0);
  const M=new THREE.BoxGeometry(0.14,3.98,1.42);M.translate(3.07,-0.5+1.99,0);
  const top=new THREE.BoxGeometry(3.0,0.18,0.2);top.translate(1.5,-0.5+3.9,0);
  return [L,M,top].reduce((a,b)=>mergeGeo(a,b));
})();
OPEN_GEO[39]=(()=>{const b=new THREE.BoxGeometry(0.2,3.98,1.0);b.translate(0.40,-0.5+1.99,0);return b;})();
OPEN_GEO[40]=(()=>{   // 对开开态：两扇并排贴+x侧+楣原位
  const l=new THREE.BoxGeometry(0.12,3.98,0.46);l.translate(0.40,-0.5+1.99,-0.24);
  const r=new THREE.BoxGeometry(0.12,3.98,0.46);r.translate(0.40,-0.5+1.99,0.24);
  const top=new THREE.BoxGeometry(0.96,0.14,0.16);top.translate(0,-0.5+3.9,0);
  return [l,r,top].reduce((a,b)=>mergeGeo(a,b));
})();
const signGeo=new THREE.BoxGeometry(0.72,0.92,0.09);signGeo.translate(0,-0.04,0);        // 牌：立式木牌，+z面是字
const plaqueGeo=new THREE.BoxGeometry(1.0,0.42,0.1);   // v50.1匾：满格横匾悬格中（门楣高度），+z面横排字
/* v40 四件：篱（围院）路（铺径）桌（配凳）灯（灯池夜光） */
const fenceGeo=(()=>{const post=new THREE.BoxGeometry(0.14,1,0.14);post.translate(0,0.01,0);return post;})();   // v42：独杆（MC式），底面抬0.01防z-fighting；横杆是独立实例，按邻居自动生成
const railGeo=new THREE.BoxGeometry(1.06,0.09,0.05);   // 横杆：两格间距1.0+两端各搭0.03进柱子
const pathGeo=new THREE.BoxGeometry(1,0.09,1);pathGeo.translate(0,-0.5+0.045,0);
const tableGeo=(()=>{   // v67桌修：v64腿悬空半格（坐标系错）——格底基准重写，桌面0.72格=0.65m
  const top=new THREE.BoxGeometry(1.0,0.09,1.0);top.translate(0,-0.5+0.72,0);
  const mkLeg=(dx,dz)=>{const l=new THREE.BoxGeometry(0.12,0.68,0.12);l.translate(dx,-0.5+0.34,dz);return l;};
  return [top,mkLeg(-0.4,-0.4),mkLeg(0.4,-0.4),mkLeg(-0.4,0.4),mkLeg(0.4,0.4)].reduce((a,b)=>mergeGeo(a,b));
})();
const lanternGeo=(()=>{const body=new THREE.BoxGeometry(0.34,0.56,0.34);body.translate(0,0.02,0);
  const pole=new THREE.BoxGeometry(0.08,0.42,0.08);pole.translate(0,-0.27,0);   // v42：杆收进格内（-0.48~-0.06），原-0.71戳穿地底
  return mergeGeo(body,pole);})();
function mergeGeo(a,b){   // v40：通用几何合并（带normal——Lambert的Box要用）
  const g=new THREE.BufferGeometry();
  const cat=(name,itemSize)=>{
    const aa=a.attributes[name].array,bb=b.attributes[name].array;
    const arr=new Float32Array(aa.length+bb.length);arr.set(aa,0);arr.set(bb,aa.length);
    g.setAttribute(name,new THREE.BufferAttribute(arr,itemSize));
  };
  cat('position',3);cat('normal',3);cat('uv',2);
  const ia=a.index.array,ib=b.index.array;
  const ix=new Uint16Array(ia.length+ib.length);ix.set(ia,0);
  for(let i=0;i<ib.length;i++)ix[ia.length+i]=ib[i]+a.attributes.position.count;
  g.setIndex(new THREE.BufferAttribute(ix,1));
  return g;
}
let plantGeoCache=null;
function plantGeo(){
  if(plantGeoCache)return plantGeoCache;
  const p1=new THREE.PlaneGeometry(0.85,0.85);p1.translate(0,-0.5+0.425,0);   // 底对格底
  const p2=new THREE.PlaneGeometry(0.85,0.85);p2.rotateY(Math.PI/2);p2.translate(0,-0.5+0.425,0);
  plantGeoCache=mergeGeo(p1,p2);
  return plantGeoCache;
}
for(const t in TYPES){
  const T=TYPES[t];let m;
  if(T.sign)continue;   // v50：牌不走InstancedMesh（每块牌文字不同=独立材质），单独refreshSign管理
  const blockGeo=OPEN_GEO[T.openKey]||(T.gate?gateGeo:(T.torch?torchGeo:(T.plant?plantGeo():(T.bench?benchGeo:(T.fence?fenceGeo:(T.path?pathGeo:(T.table?tableGeo:(T.lantern?lanternGeo:(T.bed?bedGeo:(T.cab?cabGeo:(T.chair?chairGeo:(T.stove?stoveGeo:(T.fp?fpGeo:(T.firepit?firepitGeo:(T.gate?gateGeo:(T.dgate?dgateGeo:(T.door?doorGeo:geo)))))))))))))))));;   // v29.1：原来的名字撞了循环外的geo（TDZ自引用炸——boot永远不消失，同志白蓝屏的实底）；v50：+床+柜；v61：+椅炉壁炉火塘门
  if(T.water){try{waterTex=makeTex('water');waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;
    m=new THREE.MeshLambertMaterial({map:waterTex,transparent:true,opacity:0.82,depthWrite:false});}
    catch(e){waterTex=null;m=new THREE.MeshLambertMaterial({color:T.c,transparent:true,opacity:0.72,depthWrite:false});}}   // 纹理在任何手机GPU上炸了就退回纯色——世界不能因一块水面白屏   // v25：透明实例无排序，关深度写入才不会互相剔面
  else if(T.torch){m=new THREE.MeshBasicMaterial({map:texOf('torch')});}
  else if(T.plant){m=new THREE.MeshBasicMaterial({map:texOf(T.plant),alphaTest:0.45,side:THREE.DoubleSide});}   // v40：cutout——transparent:true的实例互相剔面（花瓣缺块），去掉transparent只留alphaTest：不进透明队列、深度正常写、零剔面
  else if(T.bench||T.table||T.chair){m=new THREE.MeshLambertMaterial({map:texOf(T.tex)});}
  else if(T.door){m=new THREE.MeshLambertMaterial({map:texOf('door')});}
  else if(T.lantern){m=new THREE.MeshBasicMaterial({map:texOf('lantern')});}   // 自发光——夜里灯笼是亮的   // v31：自发光——MeshBasic不吃场景光照，火把永远亮；原来tex undefined→空白透明纹理，「放在地上是透明的」的实底
  else if(T.stove||T.fp||T.firepit){m=T.mats.map(k=>new THREE.MeshBasicMaterial({map:texOf(k)}));}   // v62：炉/壁炉/火塘=发光系六面数组（v61实底：单材质只贴[0]，火膛纹理根本没上——「壁炉没火」不是js限制是我的bug）；灯笼先例
  else if(T.glass){m=new THREE.MeshLambertMaterial({map:texOf(T.tex),transparent:true,opacity:0.5,depthWrite:false});}   // v40：玻璃对玻璃不剔面（同水面方）
  else if(T.portal){try{m=new THREE.MeshBasicMaterial({map:portalTex(),transparent:true,opacity:0.94});}catch(e){m=new THREE.MeshLambertMaterial({color:0x8a5fbf});}}   // v52：自发光传送门——夜里也亮
  else if(T.mats){   // v50：六面各自取材（原来只有side/top/bot三档——床要床头板、柜要柜门，全六面了）
    m=T.mats.map(k=>new THREE.MeshLambertMaterial({map:texOf(k)}));
  }else{m=new THREE.MeshLambertMaterial({map:texOf(T.tex)});}
  const cap=(t==='1')?320000:(t==='3')?400000:(t==='2')?35000:(t==='6')?80000:(t==='5')?30000:(+t<=4||+t===11||+t===12)?30000:25000;   /* v58：node实测叶71198——cap80000 */   /* v54：cap给足——JS实际count等同志端实测再收 */   // v41：分层池——石头地形暴露面27734撞死统一上限27734（南岸高坡随机缺石块=同志看到的透明洞）；草土石砖瓦给大池，装饰类小池
  meshes[t]=new THREE.InstancedMesh(blockGeo,m,cap);
  meshes[t].count=0;meshes[t].frustumCulled=false;
  scene.add(meshes[t]);
}
/* v32 火光：6盏PointLight的池子，动态分给离玩家最近的火炬——真光照，
   每盏带火苗抖动（两路sin不同频率，火焰呼吸感）；远处火炬靠自发光材质自己亮 */
const torchLights=[];
for(let i=0;i<6;i++){const L=new THREE.PointLight(0xffa54f,0,8,2);scene.add(L);torchLights.push(L);}
const _i2x=i=>{const y=i%H,t=(i-y)/H,z=t%D;return[t/D+0.5,y+0.78,z%D+0.5];};
let _lastTorch=0;
function tickTorch(now){
  if(now-_lastTorch<200)return;_lastTorch=now;
  const arr=[];
  for(const i of torchSet){const c=_i2x(i);const d=Math.hypot(c[0]-p.x,c[1]-p.y-EYE,c[2]-p.z);
    if(d<15)arr.push([d,i,c]);}
  arr.sort((a,b)=>a[0]-b[0]);
  for(let k=0;k<6;k++){
    const L=torchLights[k];
    if(k<arr.length){const c=arr[k][2];
      L.position.set(c[0],c[1],c[2]);
      L.intensity=1.35+0.35*Math.sin(now/95+c[0]*13)+0.18*Math.sin(now/41+c[0]*7);
    }else L.intensity=0;
  }
}
const solid=(x,y,z)=>{let b=get(x,y,z);if(b>=1000)b=b%1000;if(b===43)return false;   // v69已放的43不再生成   // v69楼梯踏面块不挡（人物走geo踏步的物理由13阶提供）
  if(b>=137&&b<=140)return false;return b!==AIR&&b!==8&&b!==14&&b!==15&&b!==16&&b!==17&&b!==18&&b!==20&&b!==22&&b!==25&&b!==27&&b!==28&&b!==31&&b!==32&&b!==33&&b!==34&&b!==35&&b!==36;};   // v63：开着的门放行（能走进去）   // 火把/花/草/凳/路/灯/幌/牌/匾不算墙；床柜篱桌挡人；v61：椅盆炉壁炉塘锹不算墙（家具能穿+锹是工具），门37挡人
/* v42：只有满格方块遮挡邻面——篱笆柱0.14宽/桌腿0.16宽盖不住那格的地面，但solid遮挡让地面顶面不渲染，从矮处看=空洞（「篱笆桌子下面透明」根）。玻璃透明也要透邻面 */
const FULLT=new Set([1,2,3,4,5,6,7,8,10,11,12,13,30]);
const covers=(x,y,z)=>{const b=get(x,y,z);return FULLT.has(b);};
const exposed=(x,y,z)=>{
  return !covers(x,y+1,z)||(y>0&&!covers(x,y-1,z))||!covers(x+1,y,z)||!covers(x-1,y,z)||!covers(x,y,z+1)||!covers(x,y,z-1);   /* v54：y=0免查下邻——底层下表面没人看，省26万实例 */
};
const _m=new THREE.Matrix4();
const torchSet=new Set();   // 火炬位置集（idx）——rebuild顺手收集，灯池读
let railMesh=null;   // v42：篱笆横杆——独立实例，按邻居生成（MC式连接）
/* v50 招牌系统：文字存云端signs.json全端共享——写什么汉字牌上就是什么字（canvas竖排动态贴图）。
   牌不走InstancedMesh：每块牌的字不同=独立材质，signMeshes逐块管理 */
let SIGNS={signs:{}},signsSha=null,signMeshes={},signCache={},signKeys=[];
function pullSigns(){
  return ghGet('signs.json').then(({sha,data})=>{
    signsSha=sha;SIGNS=(data&&data.signs)?data:{signs:{}};
  }).catch(()=>{});
}
/* v77居民安家 vil77：村民=确定性晴日进度盖房。宅地已在开发时按世界逻辑跑定（villagers.json）：
   离水12-40格、6×6平地、避开全部已有建筑5格、九户互距≥12格。房子只盖在自然地形上=「不拆已有」；
   玩家的锹/填/放/粘贴也动不了村民的格子=同一规则的另一面。进度=f(晴日数)：历史晴雨按hash节奏
   （约72%晴），今天实时联动weather——下雨天看得见停工。 */
let VH={v:0,up:0,homes:{}},villSha=null,villCells={},villBuilt={},villTotals={},villInitDay=-999,villSignMesh={};
let villKids=[],villKidsBuilt=false,villWedDone={};   /* v78kin78 */
let villPullNearT=0;
function pullVillagers(){
  return ghGet('villagers.json').then(({sha,data})=>{
    villSha=sha;VH=(data&&data.homes)?data:{v:0,up:0,homes:{}};
  }).catch(()=>{});
}
function pushSigns(msg){
  return ghPut('signs.json',SIGNS,signsSha,msg).then(({sha})=>{signsSha=sha;}).catch(()=>{
    return pullSigns().then(()=>ghPut('signs.json',SIGNS,signsSha,msg)).then(({sha})=>{signsSha=sha;}).catch(()=>{});
  });   /* 体检修：422（别人先写）不再是静默丢——拉最新合并重推一次 */
}
function signTexFor(k,text,mode){
  const ck=k+'|'+(text||'')+'|'+(mode||'v');
  if(signCache[ck])return signCache[ck];
  const horiz=(mode==='h');   // v50.1：匾=横排，牌=竖排
  const cv=document.createElement('canvas');
  cv.width=horiz?160:96;cv.height=horiz?64:128;
  const g=cv.getContext('2d');
  g.fillStyle='#6a4e30';g.fillRect(0,0,cv.width,cv.height);
  if(horiz){for(let y=4;y<64;y+=9){g.fillStyle='rgba(56,40,22,.45)';g.fillRect(0,y,cv.width,2);}}   // 横匾横木纹
  else{for(let x=4;x<96;x+=11){g.fillStyle='rgba(56,40,22,.45)';g.fillRect(x,0,2,128);}}   // 竖牌竖木纹
  g.strokeStyle='#4a3620';g.lineWidth=4;g.strokeRect(2,2,cv.width-4,cv.height-4);
  g.fillStyle='#f2e6c8';
  g.font='bold 20px "KaiTi","STKaiti","楷体","Noto Serif SC",serif';
  g.textAlign='center';g.textBaseline='middle';
  const chars=(text||'').split('');
  if(chars.length){
    const n=chars.length;
    const size=horiz?Math.min(40,Math.floor((cv.width-40)/n)):(n<=2?36:(n<=4?27:20));
    g.font='bold '+size+'px "KaiTi","STKaiti","楷体","Noto Serif SC",serif';
    if(horiz){
      g.fillText(text,cv.width/2,cv.height/2+1);   // 横排一行居中
    }else{
      const step=size*1.22,total=n*step;   // v50.6：不用parseInt(g.font)——"bold 36px…"解析成NaN，竖排字画飞（「牌不显示字」的根）
      chars.forEach((c,i)=>{g.fillText(c,48,64-total/2+step/2+i*step);});   // 竖排，居中
    }
  }else{
    g.fillStyle='rgba(242,230,200,.4)';
    g.fillText('（点我题字）',cv.width/2,cv.height/2);
  }
  const tx=new THREE.CanvasTexture(cv);tx.magFilter=THREE.LinearFilter;   // 字要平滑，不用像素风
  signCache[ck]=new THREE.MeshLambertMaterial({map:tx});
  return signCache[ck];
}
function refreshSign(x,y,z){
  const k=x+','+y+','+z;
  if(signMeshes[k]){scene.remove(signMeshes[k]);delete signMeshes[k];}
  const tt=get(x,y,z);
  if(tt!==27&&tt!==28)return;
  const isPlq=(tt===28);
  const data=(SIGNS.signs||{})[k]||{};
  const wood=new THREE.MeshLambertMaterial({map:texOf('wood_side')});
  const woodTop=new THREE.MeshLambertMaterial({map:texOf('wood_top')});
  const mesh=new THREE.Mesh(isPlq?plaqueGeo:signGeo,[wood,wood,woodTop,woodTop,signTexFor(k,data.text,isPlq?'h':'v'),wood]);   // +z面=字
  mesh.rotation.y=(data.dir||0)*Math.PI/2;
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);signMeshes[k]=mesh;
}
function setBedSpawn(x,y,z){
  try{localStorage.setItem('hetan_spawn',JSON.stringify({x:x,y:y,z:z}));}catch(e){}
  toast('出生点设在这张床了（连点两下拆床）');
}
/* Rare bilingual Wandering Monk, shared by the offline engine and server-owned rooms.
 * The 20 paired readings are excerpts from the user's THE SONGS OF YESHUA.txt:
 * biblical Psalms and separately labeled creative breath-prayers (not Bible verses).
 * Only cosmetic effects / bounded combat healing: no token, credit or save mutations.
 */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={tick:P.tick,snapshot:P.snapshot};
 const PRAISE='Praise Yahweh! Praise Yeshua!';
 const VERSES=Object.freeze([
 {
  "ref": "Psalm 147:3",
  "he": "הָרֹפֵא לִשְׁבוּרֵי לֵב וּמְחַבֵּשׁ לְעַצְּבוֹתָם׃",
  "en": "He heals the brokenhearted and binds up their wounds.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 147:5",
  "he": "גָּדוֹל אֲדוֹנֵינוּ וְרַב־כֹּחַ",
  "en": "Great is our Lord, and abundant in power.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 147:6",
  "he": "מְעוֹדֵד עֲנָוִים יְהוָה",
  "en": "YHWH lifts up the humble.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 147:7",
  "he": "עֱנוּ לַיהוָה בְּתוֹדָה",
  "en": "Sing to YHWH with thanksgiving.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 147:11",
  "he": "רוֹצֶה יְהוָה אֶת־יְרֵאָיו",
  "en": "YHWH takes pleasure in those who fear him.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 147:14",
  "he": "הַשָּׂם גְּבוּלֵךְ שָׁלוֹם",
  "en": "He makes peace in your borders.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 1:2",
  "he": "כִּי אִם בְּתוֹרַת יְהוָה חֶפְצוֹ",
  "en": "In the instruction of YHWH is his delight.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 2:11",
  "he": "עִבְדוּ אֶת־יְהוָה בְּיִרְאָה",
  "en": "Serve YHWH with fear.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 3:3",
  "he": "וְאַתָּה יְהוָה מָגֵן בַּעֲדִי",
  "en": "But you, YHWH, are a shield around me.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 3:5",
  "he": "הֱקִיצוֹתִי כִּי יְהוָה יִסְמְכֵנִי׃",
  "en": "I awoke, for YHWH sustains me.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 3:8",
  "he": "לַיהוָה הַיְשׁוּעָה",
  "en": "To YHWH belongs salvation.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 4:8",
  "he": "בְּשָׁלוֹם יַחְדָּו אֶשְׁכְּבָה וְאִישָׁן",
  "en": "In peace, together, I will lie down and sleep.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 6:2",
  "he": "רְפָאֵנִי יְהוָה כִּי נִבְהֲלוּ עֲצָמָי׃",
  "en": "Heal me, YHWH, for my bones are troubled.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 7:1",
  "he": "יְהוָה אֱלֹהַי בְּךָ חָסִיתִי",
  "en": "YHWH my God, in you I have taken refuge.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 8:1",
  "he": "יְהוָה אֲדֹנֵינוּ מָה־אַדִּיר שִׁמְךָ בְּכָל־הָאָרֶץ",
  "en": "YHWH our Lord, how majestic is your name in all the earth.",
  "kind": "Scripture"
 },
 {
  "ref": "Psalm 9:1",
  "he": "אוֹדֶה יְהוָה בְּכָל־לִבִּי",
  "en": "I will give thanks to YHWH with all my heart.",
  "kind": "Scripture"
 },
 {
  "ref": "Song of Life",
  "he": "שִׁיר חַיִּים",
  "en": "The song of life sustains the world.",
  "kind": "Song / breath prayer"
 },
 {
  "ref": "Waters of Balance",
  "he": "מַיִם וְאוֹר",
  "en": "The waters reflect the light.",
  "kind": "Song / breath prayer"
 },
 {
  "ref": "Light Within the Heart",
  "he": "אוֹר לֵב אֱמֶת",
  "en": "Light of the heart is truth.",
  "kind": "Song / breath prayer"
 },
 {
  "ref": "Path of Return",
  "he": "דֶּרֶךְ תְּשׁוּבָה",
  "en": "The way of return is renewal.",
  "kind": "Song / breath prayer"
 }
]);
 const PRAYERS=Object.freeze(VERSES.map(v=>v.en));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const outside=p=>!p.room&&!['creator','social'].includes(C.areaAt(p.x,p.y));
 const random=e=>Math.max(0,Math.min(.999999,(e.monkRandom||Math.random)()));
 function clear(a,b,p){const d=distance(a,b),steps=Math.ceil(d/12);for(let i=1;i<=steps;i++)if(C.blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,p))return false;return true;}
 function hostile(b,p){return b.hp>0&&!b.owner&&C.npcHostile(b,p);}
 // Unaffiliated players are not automatically allies; signed holders and token
 // skins do not affect allegiance. Friendly crews use their owner's clan.
 function allied(owner,q){return !!owner&&!!q&&(owner.id===q.id||!!owner.clan&&(owner.clan===q.clan||C.FACTIONS[owner.clan]?.allies.includes(q.clan)));}
 function pick(e,last=-1){const next=Math.floor(random(e)*VERSES.length);return next===last?(next+1)%VERSES.length:next;}
 function init(e){e.monkEvent??={wait:90,active:null};return e.monkEvent;}
 function place(p){
  for(let i=0;i<16;i++){const angle=(i*.61803398875%1)*Math.PI*2,r=90+(i%4)*23,q={x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r};
   if(!C.blocked(q.x,q.y,p)&&clear(p,q,p))return q;
  }return null;
 }
 function bless(e,m,dt){
  const owner=e.players.get(m.owner);
  if(!owner)return;
  for(const q of e.players.values())if(q.hp>0&&outside(q)&&allied(owner,q)&&distance(q,m)<175&&clear(m,q,q))
   q.hp=Math.min(100,q.hp+9*dt);
  for(const g of e.arcade.guards)if(g.hp>0&&allied(owner,e.players.get(g.owner))&&distance(g,m)<175&&clear(m,g,owner))
   g.hp=Math.min(g.maxHp,g.hp+12*dt);
  for(const b of e.arcade.bots)if(b.hp>0&&b.owner&&allied(owner,e.players.get(b.owner))&&distance(b,m)<175&&clear(m,b,owner))
   b.hp=Math.min(b.maxHp||100,b.hp+9*dt);
 }
 function ignite(e,m,dt){
  const owner=e.players.get(m.owner);if(!owner)return;
  if(m.elapsed>=7&&m.tornadoes.length===1)m.tornadoes.push({x:m.x+22,y:m.y-20,target:null});
  for(const t of m.tornadoes){
   // Prefer different targets across simultaneous tornadoes; avoid friendly NPCs.
   const enemies=e.arcade.bots.filter(b=>hostile(b,owner)&&distance(b,m)<540&&clear(t,b,owner)).sort((a,b)=>distance(t,a)-distance(t,b));
   const reserved=new Set(m.tornadoes.filter(q=>q!==t).map(q=>q.target).filter(Boolean));
   const target=enemies.find(b=>!reserved.has(b.id))||enemies[0];
   t.target=target?.id||null;
   if(target){const d=distance(t,target),step=Math.min(d,200*dt);
    if(d>1){const q={x:t.x+(target.x-t.x)/d*step,y:t.y+(target.y-t.y)/d*step};
     if(clear(t,q,owner))Object.assign(t,q);
    }
   }
  }
  m.pulse+=dt;
  if(m.pulse>=.35){m.pulse-=.35;const hit=new Set();
   for(const t of m.tornadoes)for(const b of e.arcade.bots)
    if(!hit.has(b.id)&&hostile(b,owner)&&distance(b,t)<72&&clear(t,b,owner)){
     hit.add(b.id);b.hp=Math.max(0,b.hp-7);b.hitFlash=.15;
     if(!b.hp){b.respawn=18;b.windup=0;b.targetId=null;}
    }
  }
 }
 P.tick=function(dt){
  base.tick.call(this,dt);dt=Math.max(0,Math.min(.1,dt));
  const event=init(this);if(!this.players.size)return;
  if(!event.active){
   event.wait-=dt;if(event.wait>0)return;
   event.wait=55+random(this)*55;
   const eligible=[...this.players.values()].filter(p=>outside(p)&&p.hp>0&&(
    p.hp<90||this.arcade.bots.some(b=>hostile(b,p)&&distance(b,p)<570)));
   if(!eligible.length||random(this)>=.35)return;
   const p=eligible[Math.floor(random(this)*eligible.length)],spot=place(p);if(!spot)return;
   const index=pick(this);
   event.active={...spot,owner:p.id,hp:80,left:29,elapsed:0,verseIndex:index,nextVerse:6,
    tornadoes:[{x:spot.x+15,y:spot.y+22,target:null}],pulse:0};
   for(const q of this.players.values())if(outside(q)&&allied(p,q)&&distance(q,p)<800){
    q.notice='RARE ENCOUNTER / The Wandering Monk · Healing and fire protection. Praise Yahweh and Yeshua!';
    q.noticeSeq=(q.noticeSeq||0)+1;
   }
  }
  const m=event.active,p=this.players.get(m.owner);
  if(!p||m.hp<=0||!outside(p)||p.hp<=0||distance(p,m)>870){event.active=null;event.wait=140;return;}
  m.left-=dt;m.elapsed+=dt;
  if(m.left<=0){event.active=null;event.wait=140+random(this)*90;return;}
  if(m.elapsed>=m.nextVerse){m.verseIndex=pick(this,m.verseIndex);m.nextVerse+=6;}
  bless(this,m,dt);ignite(this,m,dt);
 };
 P.snapshot=function(id){
  const s=base.snapshot.call(this,id),m=init(this).active;
  if(!m){s.monk=null;return s;}
  const verse=VERSES[m.verseIndex];
  s.monk={x:m.x,y:m.y,owner:m.owner,left:m.left,elapsed:m.elapsed,praise:PRAISE,
   prayer:verse.en,quote:{...verse},tornado:{...m.tornadoes[0]},
   tornadoes:m.tornadoes.map(t=>({...t}))};
  return s;
 };
 function draw(c,m,reduced=false){
  const phase=reduced?0:m.elapsed;c.save();c.translate(m.x,m.y);
  const glow=c.createRadialGradient(0,0,10,0,0,175);glow.addColorStop(0,'#ffe8a439');glow.addColorStop(1,'#ffdf7900');
  c.fillStyle=glow;c.beginPath();c.arc(0,0,175,0,Math.PI*2);c.fill();
  c.strokeStyle='#ffe7a77a';c.lineWidth=2;c.beginPath();c.arc(0,0,175,0,Math.PI*2);c.stroke();
  if(!reduced){c.strokeStyle='#b6ffd85c';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,30+(phase*70+i*40)%145,9+(phase*25+i*15)%47,0,0,Math.PI*2);c.stroke();}}
  // Golden healer: hood, sleeves, rope belt, clasped hands and halo.
  c.fillStyle='#352a3980';c.beginPath();c.ellipse(0,4,30,10,0,0,7);c.fill();
  const robe=c.createLinearGradient(-25,-85,27,0);robe.addColorStop(0,'#534044');robe.addColorStop(.5,'#ac8060');robe.addColorStop(1,'#493843');
  c.fillStyle=robe;c.beginPath();c.moveTo(-15,-83);c.quadraticCurveTo(-27,-55,-28,0);c.quadraticCurveTo(0,8,28,0);c.lineTo(17,-82);c.closePath();c.fill();
  c.strokeStyle='#decba4';c.lineWidth=3;c.beginPath();c.moveTo(-22,-38);c.quadraticCurveTo(0,-32,22,-38);c.moveTo(4,-36);c.lineTo(10,-9);c.stroke();
  c.fillStyle='#ceb08c';c.beginPath();c.ellipse(0,-89,12,17,0,0,7);c.fill();
  c.strokeStyle='#72524b';c.lineWidth=7;c.beginPath();c.arc(0,-89,17,Math.PI*.85,Math.PI*2.15);c.stroke();
  c.strokeStyle='#c5a184';c.lineWidth=7;c.lineCap='round';
  for(const side of [-1,1]){c.beginPath();c.moveTo(side*19,-67);c.lineTo(side*12,-52);c.lineTo(side*3,-65);c.stroke();}
  c.fillStyle='#efcdab';c.beginPath();c.ellipse(0,-65,5,9,0,0,7);c.fill();
  c.strokeStyle='#ffedab';c.lineWidth=2;c.beginPath();c.ellipse(0,-119,21,6,0,0,7);c.stroke();
  c.textAlign='center';c.fillStyle='#fff1b8';c.font='700 11px Arial';
  c.fillText('WANDERING MONK · HEALING',0,-140);
  c.font='700 12px Georgia';c.fillStyle='#ffe8a0';c.fillText(m.praise||PRAISE,0,-185,420);
  const quote=m.quote;if(quote){
   c.font='12px Arial';c.direction='rtl';c.fillStyle='#ffedae';
   c.fillText(quote.he,0,-171,480);
   c.direction='ltr';c.font='11px Georgia';c.fillStyle='#fff4d7';
   c.fillText(quote.en,0,-155,520);
  }else{c.font='12px Georgia';c.fillStyle='#fff4d7';c.fillText(m.prayer||'',0,-159,430);}
  c.restore();
  for(const [n,t] of (m.tornadoes||[m.tornado]).entries()){
   if(!t)continue;c.save();c.translate(t.x,t.y);c.globalAlpha=t.target?.9:.5;
   const fire=c.createLinearGradient(0,-165,0,0);fire.addColorStop(0,'#fff6cd00');fire.addColorStop(.3,'#ffdd78a0');fire.addColorStop(1,'#ff8a3db0');
   c.fillStyle=fire;c.beginPath();c.moveTo(-9,0);c.quadraticCurveTo(-25,-90,-62,-155);c.quadraticCurveTo(0,-177,62,-155);c.quadraticCurveTo(25,-90,9,0);c.closePath();c.fill();
   for(let i=0;i<11;i++){const y=-i*14,w=10+i*4;c.strokeStyle=i%2?'#fff2bc':'#ffb851';c.lineWidth=2.4;c.beginPath();
    c.ellipse(Math.sin(phase*6+i*.6+n)*7,y,w,5+i*.4,Math.sin(phase*3+i)*.13,phase*4+i,phase*4+i+Math.PI*1.65);c.stroke();}
   if(!reduced)for(let i=0;i<18;i++){const h=(phase*65+i*13+n*23)%165,a=phase*5+i*2.4+n;
    c.fillStyle=i%2?'#fff3be':'#ffb044';c.fillRect(Math.cos(a)*(12+h*.3),-h,2.5,5);}
   c.restore();
  }
 }
 root.CityMonk=Object.freeze({PRAISE,PRAYERS,VERSES,draw,hostile,allied});
})(typeof window==='undefined'?globalThis:window);

(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SAVE='huayu-save-v2', LEGACY_SAVE='huayu-save-v1', META='huayu-meta-v1';
const defaultState={
  chapter:0, scene:'prologue', step:0, checkpoint:'prologue', flags:{}, inventory:[], inspected:[], puzzles:{}, dialogueFlags:{}, audioFlags:{}, memoryFlags:{}, endingFlags:{},
  settings:{music:.52,ambience:.58,sfx:.78,textSpeed:1,reduceMotion:false}, started:false, completed:false
};
let state=load();
document.documentElement.classList.toggle('reduce-motion',!!state.settings.reduceMotion);
let dialogueQueue=[], dialogueResolve=null, typingTimer=null;
let audioCtx=null, masterGain=null, ambientNodes=[], ambienceAudio=null, scoreAudio=null, scoreKey=null, objectCleanup=null, lastFocus=null, cameraAnim=null, hotspotCameraAnim=null, toneAnim=null, focusPushAnim=null, focusDismiss=null, lastFlowerKey=null, shotBusy=false;
const el={
  title:$('#titleScreen'),game:$('#game'),sceneArt:$('#sceneArt'),hotspots:$('#hotspotLayer'),chapter:$('#chapterLabel'),scene:$('#sceneLabel'),
  dialogue:$('#dialogue'),speaker:$('#speaker'),line:$('#line'),next:$('#dialogueNext'),action:$('#contextAction'),toast:$('#toast'),
  object:$('#objectOverlay'),objectContent:$('#objectContent'),side:$('#sidePanel'),sideContent:$('#sideContent'),settings:$('#settingsPanel'),memory:$('#memoryVignette'),montage:$('#montageScene'),montageImage:$('#montageImage'),montageCaption:$('#montageCaption'),focus:$('#focusScene'),focusFrame:$('#focusFrame'),focusVisual:$('#focusVisual'),focusTitle:$('#focusTitle'),focusCaption:$('#focusCaption'),focusKicker:$('#focusKicker'),tone:$('#sceneTone'),shade:$('#cameraShade'),sceneFx:$('#sceneFx'),actors:$('#sceneActors'),flower:$('#flowerLabel'),cinematic:$('#cinematicShot'),cinematicImage:$('#cinematicShotImage'),cinematicCaption:$('#cinematicShotCaption')
};
const chapterNames=['序章','第一章','第二章','第三章','第四章','第五章','终章'];
const scenes={
 prologue:{title:'九年后的高三七班',art:'assets/art/classroom_old.webp',alt:'九年后的高三七班旧教室'},
 photo:{title:'四人照片',art:'assets/art/group_photo.webp',alt:'四名高中生的旧照片'},
 ch1class:{title:'高二教室',art:'assets/art/classroom_warm.webp',alt:'六月阳光下的高二教室'},
 cafeteria:{title:'学校食堂',art:'assets/art/cafeteria.webp',alt:'学校食堂与鸡米花餐盘'},
 sunset:{title:'操场夕阳',art:'assets/art/sunset.webp',alt:'傍晚校园活动场地'},
 night:{title:'晚自习',art:'assets/art/night_classroom.webp',alt:'灯光下的晚自习教室'},
 library:{title:'图书馆',art:'assets/art/library.webp',alt:'学校图书馆植物分类书架'},
 festival:{title:'校园艺术节',art:'assets/art/festival.webp',alt:'校园艺术节场景'},
 radio:{title:'广播站',art:'assets/art/radio.webp',alt:'校内广播站磁带设备'},
 high3:{title:'高三教室',art:'assets/art/high3.webp',alt:'距离毕业48天的高三教室'},
 notebook:{title:'植物观察册',art:'assets/art/notebook.webp',alt:'植物观察册与桔梗页'},
 blackboard:{title:'毕业日重构',art:'assets/art/blackboard.webp',alt:'贴满证据的黑板'},
 plant:{title:'毕业日 · 植物角',art:'assets/art/plant_corner.webp',alt:'毕业日植物角与桔梗'},
 gate:{title:'校门',art:'assets/art/school_gate.webp',alt:'傍晚学校大门'},
 road:{title:'九年后 · 校门外',art:'assets/art/ending_road.webp',alt:'九年后的校门外道路'},
 windowcg:{title:'靠窗第三排',art:'assets/art/cg_window.webp',alt:'傍晚教室里，沈知夏抬头时与林屿隔着课桌安静对望'},
 peacecg:{title:'和平谈判物资',art:'assets/art/cg_peace.webp',alt:'四盒鸡米花放在课桌上的和解场面'},
 gradcg:{title:'毕业日 · 没说出口的话',art:'assets/art/cg_graduation.webp',alt:'毕业日的植物角前，沈知夏把桔梗藏在身后，林屿手里攥着作文纸'},
 presscg:{title:'最后一页',art:'assets/art/cg_pressflower.webp',alt:'沈知夏独自把桔梗压进植物观察册的最后一页'}
};

const FLOWERS={
  0:{key:'daisy',name:'雏菊',meaning:'还没说出口的喜欢',color:['#f4eedb','#fff8e8'],density:24,speed:.26,wind:.23,size:[3.5,7.5]},
  1:{key:'sunflower',name:'向日葵',meaning:'朝着光，也朝着某个人',color:['#e9b84d','#f2cf72'],density:32,speed:.34,wind:.34,size:[4,8.5]},
  2:{key:'gardenia',name:'栀子花',meaning:'以为不会结束的日常',color:['#f2ead5','#ddd2b7'],density:30,speed:.24,wind:.25,size:[3.5,8]},
  3:{key:'gardenia',name:'栀子花',meaning:'有些话只敢绕着说',color:['#f1e8d0','#d8cdb1'],density:34,speed:.28,wind:.3,size:[3.5,8]},
  4:{key:'jacaranda',name:'蓝花楹',meaning:'时间开始往下落',color:['#9b8bb8','#786b98'],density:38,speed:.5,wind:.2,size:[3.5,8]},
  5:{key:'forget',name:'勿忘我',meaning:'明天原来也会用完',color:['#9fb6c5','#738fa6'],density:18,speed:.17,wind:.16,size:[3,6.5]},
  6:{key:'mixed',name:'花语',meaning:'那些花都开过',color:['#f0ead8','#d6af63','#9183aa','#87a4b7'],density:30,speed:.2,wind:.18,size:[3,7.5]}
};
const CAMERA_TRACKS={
 prologue:{duration:15000,frames:[{transform:'scale(1.07) translate3d(-1.1%,.2%,0)'},{transform:'scale(1.095) translate3d(.8%,-.45%,0)'}]},
 photo:{duration:10500,frames:[{transform:'scale(1.10) translate3d(.7%,.4%,0)'},{transform:'scale(1.045) translate3d(-.4%,-.2%,0)'}]},
 ch1class:{duration:15500,frames:[{transform:'scale(1.065) translate3d(-1.15%,.25%,0)'},{transform:'scale(1.105) translate3d(.9%,-.55%,0)'}]},
 cafeteria:{duration:13500,frames:[{transform:'scale(1.075) translate3d(.9%,.15%,0)'},{transform:'scale(1.105) translate3d(-.9%,-.35%,0)'}]},
 sunset:{duration:16500,frames:[{transform:'scale(1.055) translate3d(-1%,.1%,0)'},{transform:'scale(1.095) translate3d(1.2%,-.4%,0)'}]},
 night:{duration:17000,frames:[{transform:'scale(1.08) translate3d(.7%,.2%,0)'},{transform:'scale(1.115) translate3d(-.8%,-.55%,0)'}]},
 library:{duration:14500,frames:[{transform:'scale(1.06) translate3d(-.6%,.1%,0)'},{transform:'scale(1.09) translate3d(.8%,-.25%,0)'}]},
 festival:{duration:13000,frames:[{transform:'scale(1.06) translate3d(-1.2%,.35%,0)'},{transform:'scale(1.105) translate3d(1%,-.45%,0)'}]},
 radio:{duration:15000,frames:[{transform:'scale(1.075) translate3d(.4%,.1%,0)'},{transform:'scale(1.1) translate3d(-.6%,-.25%,0)'}]},
 high3:{duration:18000,frames:[{transform:'scale(1.07) translate3d(-.5%,.25%,0)'},{transform:'scale(1.105) translate3d(.7%,-.35%,0)'}]},
 notebook:{duration:14000,frames:[{transform:'scale(1.09) translate3d(.25%,.2%,0)'},{transform:'scale(1.12) translate3d(-.35%,-.4%,0)'}]},
 blackboard:{duration:16000,frames:[{transform:'scale(1.06) translate3d(-.7%,.2%,0)'},{transform:'scale(1.1) translate3d(.7%,-.3%,0)'}]},
 plant:{duration:16000,frames:[{transform:'scale(1.055) translate3d(-.8%,.15%,0)'},{transform:'scale(1.095) translate3d(.9%,-.35%,0)'}]},
 gate:{duration:12000,frames:[{transform:'scale(1.06) translate3d(-1%,.1%,0)'},{transform:'scale(1.11) translate3d(1.3%,-.45%,0)'}]},
 road:{duration:19000,frames:[{transform:'scale(1.055) translate3d(.5%,.1%,0)'},{transform:'scale(1.095) translate3d(-.8%,-.3%,0)'}]},
 windowcg:{duration:11000,frames:[{transform:'scale(1.09) translate3d(.6%,.25%,0)'},{transform:'scale(1.12) translate3d(-.5%,-.25%,0)'}]},
 peacecg:{duration:12000,frames:[{transform:'scale(1.08) translate3d(-.45%,.15%,0)'},{transform:'scale(1.105) translate3d(.55%,-.2%,0)'}]},
 gradcg:{duration:14000,frames:[{transform:'scale(1.06) translate3d(-.8%,.1%,0)'},{transform:'scale(1.115) translate3d(.7%,-.4%,0)'}]},
 presscg:{duration:13500,frames:[{transform:'scale(1.10) translate3d(.35%,.25%,0)'},{transform:'scale(1.135) translate3d(-.25%,-.35%,0)'}]}
};
function flowerNow(){return FLOWERS[Math.min(state.chapter,6)]||FLOWERS[0]}
function isReducedMotion(){return !!state.settings.reduceMotion||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
function runSceneDirector(key){
 if(cameraAnim){try{cameraAnim.cancel()}catch{}cameraAnim=null}if(hotspotCameraAnim){try{hotspotCameraAnim.cancel()}catch{}hotspotCameraAnim=null}if(toneAnim){try{toneAnim.cancel()}catch{}toneAnim=null}
 const cfg=CAMERA_TRACKS[key]||CAMERA_TRACKS.prologue;
 if(!isReducedMotion()&&el.sceneArt.animate){const timing={duration:cfg.duration,easing:'cubic-bezier(.36,.02,.2,1)',fill:'forwards',direction:'alternate',iterations:Infinity};cameraAnim=el.sceneArt.animate(cfg.frames,timing);hotspotCameraAnim=el.hotspots.animate(cfg.frames,timing);toneAnim=el.tone.animate([{opacity:.72},{opacity:.96},{opacity:.78}],{duration:cfg.duration*.72,easing:'ease-in-out',direction:'alternate',iterations:Infinity})}
 if(el.sceneFx)el.sceneFx.dataset.fx=/night|radio/.test(key)?'night':/sunset|festival|gate|gradcg/.test(key)?'sunset':/road|prologue/.test(key)?'quiet':/library/.test(key)?'library':'day';
}
function updateFlowerLanguage(){const f=flowerNow();document.body.dataset.flower=f.key;if(el.flower)el.flower.textContent=`${f.name} · ${f.meaning}`;if(lastFlowerKey!==f.key){lastFlowerKey=f.key;if(el.flower){el.flower.classList.remove('bloom');void el.flower.offsetWidth;el.flower.classList.add('bloom')}seedPetals()}}
const SCENE_ACTOR_PROFILES={
 ch1class:['light','paper'],cafeteria:['light','shadow'],sunset:['light','shadow'],night:['paper','shadow'],library:['light','shadow'],festival:['light','paper'],radio:['paper','shadow'],high3:['paper','shadow'],plant:['light'],gradcg:['light'],gate:['light','shadow'],road:['shadow']
};
function configureSceneActors(key){if(!el.actors)return;const a=SCENE_ACTOR_PROFILES[key]||[];el.actors.innerHTML=a.map(k=>k==='walk'?'<i class="actor-sprite actor-walk"></i>':k==='walk-alt'?'<i class="actor-sprite actor-walk alt"></i>':k==='turn'?'<i class="actor-sprite actor-turn"></i>':k==='flower'?'<i class="actor-sprite actor-flower-lower"></i>':k==='paper'?'<i class="actor-paper"></i>':k==='light'?'<i class="actor-lightband"></i>':'<i class="actor-far-shadow"></i>').join('')}
const CINEMATIC_SHOTS={
 corridor:['assets/art/shots/corridor_spring.webp','走廊很长。那时候谁都不急着走完。'],cafeteria:['assets/art/shots/cafeteria_shared.webp','四个人抢一盒鸡米花的时候，谁都觉得毕业还远。'],window:['assets/art/shots/window_evening.webp','她抬头的时候，我刚好也在看窗户。'],festival:['assets/art/shots/festival_backstage.webp','唐梨说“别动”的时候，快门总比人反应得快。'],countdown:['assets/art/shots/countdown_48.webp','48天。那时候听起来还挺久。'],bellflower:['assets/art/shots/bellflower_hands.webp','“那我……”  然后他只说了，一路顺风。'],empty:['assets/art/shots/empty_classroom.webp','课桌还在。只是那一排再也不会有人抬头了。'],walk:['assets/art/shots/walk_home.webp','放学路其实没什么特别的。只是那三年，我们总从这里走。'],zhixiaIntro:['assets/art/focus/zhixia-desk.webp',''],zhouyeIntro:['assets/art/focus/zhouye.webp','']
};
async function playCinematicShot(key,ms=2600){if(shotBusy||!el.cinematic)return;const cfg=CINEMATIC_SHOTS[key];if(!cfg)return;shotBusy=true;const [src,caption]=cfg;el.cinematicImage.src=src;el.cinematicImage.alt=caption;el.cinematicCaption.textContent=caption;el.cinematic.hidden=false;playSfx('transition');await new Promise(r=>{if(el.cinematicImage.complete)r();else{const done=()=>r();el.cinematicImage.addEventListener('load',done,{once:true});el.cinematicImage.addEventListener('error',done,{once:true});setTimeout(done,700)}});requestAnimationFrame(()=>requestAnimationFrame(()=>el.cinematic.classList.add('show')));await sleep(isReducedMotion()?240:ms);el.cinematic.classList.remove('show');await sleep(isReducedMotion()?60:460);el.cinematic.hidden=true;el.cinematicImage.removeAttribute('src');shotBusy=false}

function clone(o){return JSON.parse(JSON.stringify(o));}
function load(){
 try{
  const modern=localStorage.getItem(SAVE), legacy=!modern&&localStorage.getItem(LEGACY_SAVE);
  const raw=modern||legacy, x=raw?JSON.parse(raw):null;
  if(!x)return clone(defaultState);
  const merged={...clone(defaultState),...x,settings:{...defaultState.settings,...(x.settings||{})}};
  if(!x.checkpoint)merged.checkpoint=null;
  return merged;
 }catch{return clone(defaultState)}
}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state))}catch{} updateContinue();}
function updateContinue(){const b=$('#continueBtn');b.disabled=!state.started;b.style.opacity=state.started?1:.45;}
function reset(){try{localStorage.removeItem(SAVE);localStorage.removeItem(LEGACY_SAVE);localStorage.removeItem(META)}catch{}state=clone(defaultState);location.reload();}
function setFlag(k,v=true){state.flags[k]=v;save();}
function hasFlag(k){return !!state.flags[k]}
function setCheckpoint(cp){state.checkpoint=cp;save();}
function addItem(name){if(!state.inventory.includes(name)){state.inventory.push(name);toast('获得物品：'+name);save();}}
function markInspected(id){if(!state.inspected.includes(id)){state.inspected.push(id);save();}}
function inspected(id){return state.inspected.includes(id)}
function toast(t){el.toast.textContent=t;el.toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.toast.classList.remove('show'),1600)}
function legacyCheckpoint(){
 const p=state.puzzles||{};
 if(state.completed)return 'complete';
 if(p.pz9){if(!state.endingFlags?.chaseDone)return 'graduationReplay';if(!state.endingFlags?.sent)return 'adult';if(!state.endingFlags?.notificationSeen)return 'finalRoad';return 'ending'}
 if(state.chapter===6)return 'blackboard';
 if(state.chapter===5)return p.pz8?'returnPresent':'chapter5';
 if(state.chapter===4)return p.pz7?'conflict':'chapter4';
 if(state.chapter===3)return p.pz6?'postTape':'radio';
 if(state.chapter===2){if(!p.pz4)return 'chapter2';if(!p.pz5)return 'seat';return 'library'}
 if(state.chapter===1){if(!p.pz2)return 'ch1class';if(!p.pz3)return 'cafeteria';return 'cafeteriaAfter'}
 if(p.pz1)return 'transitionPast';return 'prologue';
}
function renderScene(key,opts={}){
 state.scene=key;save();const sc=scenes[key];if(!sc)return;document.body.dataset.scene=key;el.sceneArt.src=sc.art;el.sceneArt.alt=sc.alt;el.scene.textContent=sc.title;el.chapter.textContent=chapterNames[Math.min(state.chapter,6)]||'尾声';el.hotspots.innerHTML='';el.action.hidden=true;el.memory.classList.toggle('on',!!opts.memory);el.sceneArt.classList.toggle('cinematic',!!opts.cinematic);updateFlowerLanguage();configureSceneActors(key);runSceneDirector(key);playScoreForScene(key);
}
function setAction(label,fn){el.action.textContent=label;el.action.hidden=false;el.action.disabled=false;el.action.onclick=async()=>{if(el.action.dataset.busy==='1')return;el.action.dataset.busy='1';el.action.disabled=true;try{await fn()}finally{el.action.dataset.busy='0';if(!el.action.hidden)el.action.disabled=false}}}
function sleep(ms){return new Promise(r=>setTimeout(r,isReducedMotion()?Math.min(ms,140):ms))}
async function say(lines){dialogueQueue=[...lines];el.dialogue.hidden=false;return new Promise(resolve=>{dialogueResolve=resolve;showNextLine()})}
function showNextLine(){
 if(typingTimer){clearTimeout(typingTimer);typingTimer=null;el.line.textContent=el.line.dataset.full||el.line.textContent;el.line.classList.remove('typing');return}
 const d=dialogueQueue.shift();
 if(!d){el.dialogue.hidden=true;el.dialogue.dataset.thought='0';el.line.classList.remove('typing');duckMix(false);const r=dialogueResolve;dialogueResolve=null;r&&r();return}
 duckMix(true);el.dialogue.dataset.thought=d.s?'0':'1';el.speaker.textContent=d.s||'';el.line.textContent='';el.line.dataset.full=d.t;el.line.classList.add('typing');
 const chars=[...d.t];let i=0;const base=Math.max(11,31/state.settings.textSpeed);
 const tick=()=>{const ch=chars[i++]||'';el.line.textContent+=ch;if(i>=chars.length){typingTimer=null;el.line.classList.remove('typing');return}const pause=/[。！？]/.test(ch)?base*7:/[，、；：]/.test(ch)?base*3.1:/[…—]/.test(ch)?base*4.6:/\n/.test(ch)?base*5.2:base;typingTimer=setTimeout(tick,pause)};
 typingTimer=setTimeout(tick,base)
}
el.next.onclick=showNextLine;el.dialogue.onclick=e=>{if(e.target===el.dialogue||e.target===el.line)showNextLine()};
function openObject(html,onReady,closable=true){if(objectCleanup){try{objectCleanup()}catch{}objectCleanup=null}lastFocus=document.activeElement;el.objectContent.innerHTML=html;el.object.dataset.closable=closable?'1':'0';$('#objectClose').hidden=!closable;el.object.hidden=false;const cleanup=onReady&&onReady();if(typeof cleanup==='function')objectCleanup=cleanup;requestAnimationFrame(()=>{const f=el.objectContent.querySelector('button:not([hidden]),input:not([hidden])');f?.focus({preventScroll:true})})}
function closeObject(force=false){if(!force&&el.object.dataset.closable==='0')return;if(objectCleanup){try{objectCleanup()}catch{}objectCleanup=null}el.object.hidden=true;el.objectContent.innerHTML='';el.object.dataset.closable='1';$('#objectClose').hidden=false;lastFocus?.focus?.({preventScroll:true});lastFocus=null}
$('#objectClose').onclick=()=>closeObject();$('#sideClose').onclick=()=>el.side.hidden=true;$('#settingsClose').onclick=()=>el.settings.hidden=true;
function showSide(html){el.sideContent.innerHTML=html;el.side.hidden=false}
function hint(){const p=state.puzzles;let t='先看一遍场景里有名字的物件。';
 if(state.scene==='prologue'&&!p.pz1)t=(!inspected('blackboard')||!inspected('duty')||!inspected('gradphoto'))?'储物柜不是靠常识开的。黑板、值日表和毕业照片都给了同一件事的时间关系。':'把日期写成四位数字，密码轮需要从上到下对应。';
 else if(state.scene==='ch1class'&&!p.pz2)t='植物观察不是答百科题：先把五个观察点都亲手看完，再填写观察册。';
 else if(state.scene==='cafeteria'&&!p.pz3)t='先把当前盒里的鸡米花数完并称重，再比较小票。周野的手也值得看。';
 else if(state.scene==='night'&&!p.pz4)t='作文不是靠文字选答案，要把五张有撕裂边缘的纸片拼回原位。';
 else if(!p.pz5&&state.chapter===2)t='“靠窗第三排”只描述位置。先认清窗户在哪一侧，再按排数定位。';
 else if(state.scene==='radio'&&!p.pz6)t='节目单说17:40开始点歌。后台那句话在开始后约3分15秒，而且不是音乐所在声道。';
 else if(state.scene==='high3'&&!p.pz7)t='留言的判断依据早就在对话里：感叹号、字小规整、句末少标点、涂改。';
 else if(state.chapter===5&&!p.pz8)t='第33页要排除三种错误纸张，再去找“最不显眼但最可能夹纸”的旧课本。';
 else if(state.scene==='blackboard'&&!p.pz9)t='最终推理不需要猜新信息：先证明“她准备说”，再证明“他也准备说”，最后解释为什么两个人都没说。';
 showSide(`<h2>一片花瓣</h2><p>${t}</p><p style="color:#706657;font-size:13px">提示不会替你自动完成谜题。</p>`)}
$('#hintBtn').onclick=hint;
$('#inventoryBtn').onclick=()=>showSide(`<h2>旧帆布笔袋</h2><div class="inventory-list">${state.inventory.length?state.inventory.map(x=>`<div class="inv-item">${x}</div>`).join(''):'<p>现在还是空的。</p>'}</div>`);
$('#notebookBtn').onclick=()=>showSide(`<h2>植物观察册</h2><img src="assets/art/notebook.webp" alt="植物观察册" style="width:100%;border:1px solid #8e8069"><p>${state.puzzles.pz8?'第33页已经回到册子旁边。桔梗页仍然留着一块空白。':state.puzzles.pz2?'第一页已经完成。后面的页角有许多被翻过的痕迹。':'封面旧得发软，里面还没有重新整理。'}</p>`);
$('#settingsBtn').onclick=()=>{const s=state.settings;$('#musicRange').value=s.music;$('#ambienceRange').value=s.ambience??.58;$('#sfxRange').value=s.sfx;$('#textRange').value=s.textSpeed;$('#motionCheck').checked=s.reduceMotion;el.settings.hidden=false};
$('#musicRange').oninput=e=>{state.settings.music=+e.target.value;save();updateAudioGain()};
$('#ambienceRange').oninput=e=>{state.settings.ambience=+e.target.value;save();updateAudioGain()};
$('#sfxRange').oninput=e=>{state.settings.sfx=+e.target.value;save()};
$('#textRange').oninput=e=>{state.settings.textSpeed=+e.target.value;save()};
$('#motionCheck').onchange=e=>{state.settings.reduceMotion=e.target.checked;document.documentElement.classList.toggle('reduce-motion',state.settings.reduceMotion);if(isReducedMotion()){try{cameraAnim?.cancel()}catch{}try{hotspotCameraAnim?.cancel()}catch{}try{toneAnim?.cancel()}catch{}cameraAnim=hotspotCameraAnim=toneAnim=null;el.sceneArt.style.transform='';el.hotspots.style.transform=''}else runSceneDirector(state.scene);seedPetals();save()};$('#resetBtn').onclick=()=>{if(confirm('确认清除《花语》的本机存档？'))reset()};

// Local ambience and foley: no network dependency. WebAudio is kept as a fallback.
const AUDIO={amb:{room:'amb_room.mp3',night:'amb_night.mp3',outdoor:'amb_outdoor.mp3',cafeteria:'amb_cafeteria.mp3',library:'amb_library.mp3',festival:'amb_festival.mp3',road:'amb_road.mp3'},score:{daisy:'score_daisy.mp3',sunflower:'score_sunflower.mp3',gardenia:'score_gardenia.mp3',jacaranda:'score_jacaranda.mp3',forget:'score_forgetmenot.mp3',ending:'score_ending.mp3'},sfx:{paper:'sfx_paper.mp3',click:'sfx_click.mp3',keys:'sfx_keys.mp3',basket:'sfx_basket.mp3',door:'sfx_door.mp3',bell:'sfx_bell.mp3',shutter:'sfx_shutter.mp3',tray:'sfx_tray.mp3',tape:'sfx_tape.mp3',step:'sfx_step.mp3',phone:'sfx_phone.mp3',focus:'focus_generic.mp3',focusPaper:'focus_paper.mp3',focusWindow:'focus_window.mp3',focusPerson:'focus_person.mp3',focusFlower:'focus_flower.mp3',focusMemory:'focus_memory.mp3',transition:'transition_bloom.mp3'}};
function ensureAudio(){if(audioCtx)return;try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.connect(audioCtx.destination);updateAudioGain()}catch{}}
function updateAudioGain(){if(masterGain)masterGain.gain.value=Math.max(.001,state.settings.music*.32);if(ambienceAudio)ambienceAudio.volume=Math.min(.28,(state.settings.ambience??.58)*.24);if(scoreAudio)scoreAudio.volume=Math.min(.52,state.settings.music*.48)}
function rampAudio(a,target,ms=320){if(!a)return;const start=a.volume,steps=Math.max(1,Math.round(ms/32)),delta=(target-start)/steps;let i=0;clearInterval(a._huayuRamp);a._huayuRamp=setInterval(()=>{i++;a.volume=Math.max(0,Math.min(1,start+delta*i));if(i>=steps){clearInterval(a._huayuRamp);a._huayuRamp=null}},32)}
function duckMix(on){const scoreTarget=Math.min(.52,state.settings.music*.48)*(on ? .62 : 1),ambTarget=Math.min(.28,(state.settings.ambience??.58)*.24)*(on ? .72 : 1);rampAudio(scoreAudio,scoreTarget,on?260:520);rampAudio(ambienceAudio,ambTarget,on?240:500)}
function stopAmbient(){ambientNodes.forEach(n=>{try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}});ambientNodes=[];if(ambienceAudio){const a=ambienceAudio;ambienceAudio=null;let v=a.volume;const fade=setInterval(()=>{v-=.05;if(v<=0){clearInterval(fade);a.pause();a.src=''}else a.volume=v},35)}}
function ambientFallback(kind='room'){ensureAudio();if(!audioCtx)return;const roots={room:[261.63,329.63,392],night:[220,261.63,329.63],outdoor:[293.66,369.99,440],cafeteria:[261.63,392,523.25],library:[246.94,329.63,392],festival:[329.63,415.3,493.88],road:[220,293.66,369.99]}[kind]||[261.63,329.63,392];let i=0;const tick=()=>{if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=roots[i++%roots.length];g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.001,(state.settings.ambience??.58)*.018),audioCtx.currentTime+.05);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.46);o.connect(g).connect(masterGain);o.start();o.stop(audioCtx.currentTime+.5)};tick();const timer=setInterval(tick,680);ambientNodes.push({stop:()=>clearInterval(timer),disconnect:()=>{}})}
function ambient(kind='room'){stopAmbient();const file=AUDIO.amb[kind]||AUDIO.amb.room;try{const a=new Audio('assets/audio/'+file);a.loop=true;a.preload='auto';a.volume=Math.min(.28,(state.settings.ambience??.58)*.24);ambienceAudio=a;const pr=a.play();pr?.catch?.(()=>{if(ambienceAudio===a){ambienceAudio=null;ambientFallback(kind)}})}catch{ambientFallback(kind)}}
function playSfx(kind){const file=AUDIO.sfx[kind];if(file){try{const a=new Audio('assets/audio/'+file);a.volume=Math.min(1,state.settings.sfx*.9);a.preload='auto';a.play().catch(()=>{});return}catch{}}ensureAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();g.gain.setValueAtTime(Math.max(.001,state.settings.sfx*.06),audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.08);o.frequency.value=kind==='bell'?660:kind==='basket'?90:420;o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.09)}
async function prologueSoundscape(){ambient('outdoor');await sleep(330);playSfx('basket');await sleep(310);playSfx('basket');await sleep(420);playSfx('keys');await sleep(410);playSfx('click');await sleep(260);playSfx('door');await sleep(520);ambient('room')}


function scoreForScene(key){
 if(key==='road'&&state.chapter>=6)return state.checkpoint==='ending'?'ending':'forget';
 if(state.chapter<=0)return 'daisy';
 if(state.chapter===1)return 'sunflower';
 if(state.chapter===2||state.chapter===3)return 'gardenia';
 if(state.chapter===4)return 'jacaranda';
 if(state.chapter===5)return 'forget';
 return 'ending';
}
function playScoreForScene(key){const k=scoreForScene(key);if(scoreKey===k&&scoreAudio&&!scoreAudio.paused)return;scoreKey=k;if(scoreAudio){const old=scoreAudio;let v=old.volume;const fade=setInterval(()=>{v-=.018;if(v<=0){clearInterval(fade);old.pause();old.src=''}else old.volume=v},48)}const file=AUDIO.score[k];if(!file)return;try{const a=new Audio('assets/audio/'+file);a.loop=true;a.preload='auto';a.volume=0;scoreAudio=a;a.play().then(()=>{let v=0;const target=Math.min(.52,state.settings.music*.48),fade=setInterval(()=>{if(scoreAudio!==a){clearInterval(fade);return}v=Math.min(target,v+.018);a.volume=v;if(v>=target)clearInterval(fade)},58)}).catch(()=>{})}catch{}}
function focusKind(label=''){
 if(/周野/.test(label))return 'person';if(/黑板/.test(label))return 'board';if(/吊扇/.test(label))return 'fan';if(/饮水/.test(label))return 'water';if(/桌面|课桌|讲台|作业/.test(label))return 'desk';if(/值日表|作文|节目单|留言|住址|订单|空白/.test(label))return 'paper';if(/储物柜/.test(label))return 'locker';if(/植物角/.test(label))return 'plant';if(/书包/.test(label))return 'bag';if(/饮料桌/.test(label))return 'cup';if(/餐盘|鸡米花|饭卡机|窗口/.test(label))return 'tray';if(/窗户|靠窗/.test(label))return 'window';if(/灯管/.test(label))return 'light';if(/相机/.test(label))return 'camera';if(/毕业照片/.test(label))return 'photo';if(/书架|分类牌/.test(label))return 'label';if(/桔梗/.test(label))return 'flower';return 'generic'
}
const focusAssets={
 '黑板':'blackboard.webp','吊扇':'fan.webp','饮水机':'water.webp','靠窗第三排':'window-seat.webp','课桌底部刻痕':'desk-scratch.webp','值日表':'duty-roster.webp','毕业照片标签':'grad-photo.webp','储物柜':'locker.webp','植物角':'plant-corner.webp','讲台':'podium.webp','沈知夏的桌面':'zhixia-desk.webp','周野':'zhouye.webp','窗口与饭卡机':'card-machine.webp','饭卡机':'card-machine.webp','鸡米花餐盘':'chicken-tray.webp','沈知夏的书包':'zhixia-bag.webp','远处餐盘声':'cafeteria-rhythm.webp','窗户倒影':'window-reflection.webp','白色灯管':'tube-light.webp','校刊室里的作文':'essay.webp','植物类书架':'library-shelf.webp','书架分类牌':'shelf-label.webp','饮料桌':'drinks-table.webp','唐梨的相机':'tangli-camera.webp','周野的节目单':'zhou-program.webp','四张无署名留言':'four-notes.webp','四个人的旧作业':'old-homework.webp','住址资料':'address-doc.webp','夹在册后的花店订单':'flower-order.webp','桔梗页的空白':'bellflower-blank.webp'
};
const focusCaptionsReplay={'靠窗第三排':'第一次看见这里的时候，我只觉得她坐得离窗很近。再来一次以后，好像更早就知道自己为什么会记住。','沈知夏的桌面':'纸还是那张纸。只是第二次看，连她压住页角的小习惯都能想起来。','窗户倒影':'第一次我说只是刚好。第二次再看，还是很难相信那真的是刚好。','夹在册后的花店订单':'第一次看到“桔梗”时我还在找证据。现在只觉得她那天一定犹豫了很久。','桔梗页的空白':'第二次走到这里，空白比字更明显。'};
const focusCaptions={
 '黑板':'黑板上写着“距高考还有两天”。以前看到只觉得烦，现在再看却像在提醒什么。','吊扇':'第三档又在晃。周野说它迟早会掉，我们居然认真讨论了半节课。','饮水机':'咕噜一声。谁在排队，谁在催，反正下课总是不够用。','靠窗第三排':'不是我的座位。我怎么每次一进教室还是先看这里。','课桌底部刻痕':'原来这么浅。我以前还担心会被老师发现。','值日表':'6月5日。再过两天拍毕业照。那时候谁会把这两个日期连起来。','毕业照片标签':'6月7日。有人闭眼，有人笑得太用力。','储物柜':'门还是有点卡。里面塞过试卷、零食，还有一些不想让老师看见的东西。','植物角':'她说先看叶子。我其实先看了她写字。','讲台':'粉笔、胶带、分组名单。老师每次说“就占你们两分钟”，都不止两分钟。','沈知夏的桌面':'她的字怎么能写这么小。借她笔记的时候我每次都要凑很近。','周野':'他绝对没睡。真的睡着的人不会一听见零食袋就抬头。','窗口与饭卡机':'两份。说完以后我才想起来，好像根本没问她要不要。','饭卡机':'绿灯已经亮过一次。她说以后还我，我当时还真信她会专门记着八块钱。','鸡米花餐盘':'十七块。周野嘴里那一块不算“合理损耗”。','沈知夏的书包':'……她明明带饭卡了。那刚才为什么说没带。','远处餐盘声':'叮、当、叮。听久了居然有节拍。','窗户倒影':'刚才是不是对视了？应该没有。她只是刚好抬头。嗯，肯定是。','白色灯管':'亮得有点过分。晚自习最奇怪的地方是，明明困得要死，又觉得今晚还很长。','校刊室里的作文':'我怎么会写“如果有一天离开这里”。写得像马上要毕业一样。','植物类书架':'这么多本。她到底怎么一眼就找到自己要的。','书架分类牌':'QK、QL、R。以前觉得麻烦，现在居然还能背出来。','饮料桌':'“少冰”改成“少点冰”，又划掉。唐梨说我写字像在跟自己吵架。','唐梨的相机':'她总说“别动”。可她后来留下最好看的照片，好像都没人准备好。','周野的节目单':'三个感叹号起步。除了周野没人会这样写。','四张无署名留言':'怎么都写这么短。是不是写长了就会显得太认真。','四个人的旧作业':'同一张作业纸，居然一眼就能看出是谁的。','住址资料':'毕业以后就搬走。不是今天，也不是明天。所以我那一秒还觉得——好像来得及。','夹在册后的花店订单':'桔梗。毕业那天取。她为什么要订这个。','桔梗页的空白':'这里明明压过笔。她最后还是没写。'
};
function focusMarkup(label){const file=focusAssets[label]||'generic.webp',kind=focusKind(label);const micro=kind==='paper'||kind==='board'?'<i class="focus-micro micro-paper-corner"></i><i class="focus-micro micro-pen"></i>':kind==='window'?'<i class="focus-micro micro-window-glint"></i>':kind==='person'?'<i class="focus-micro micro-person-blink"></i>':kind==='plant'||kind==='flower'?'<i class="focus-micro micro-plant-leaf"></i>':kind==='tray'||kind==='cup'?'<i class="focus-micro micro-steam"></i>':'';return `<figure class="focus-art-wrap" data-kind="${kind}"><img class="focus-art" src="assets/art/focus/${file}" alt="${label}的独立重构特写"><span class="focus-depth focus-depth-back" aria-hidden="true"></span><span class="focus-depth focus-depth-front" aria-hidden="true"></span><span class="focus-lens" aria-hidden="true"></span><span class="focus-breath" aria-hidden="true"></span>${micro}</figure>`}
function playFocusCue(kind,label){const cue=(kind==='paper'||kind==='board')?'focusPaper':kind==='window'?'focusWindow':kind==='person'?'focusPerson':(kind==='plant'||kind==='flower')?'focusFlower':state.flags.replay&&focusCaptionsReplay[label]?'focusMemory':'focus';playSfx(cue)}
function hotspotPoint(sourceButton){
 const r=sourceButton?.getBoundingClientRect?.();if(!r)return{x:innerWidth/2,y:innerHeight/2};const mx=Math.max(0,Math.min(100,+sourceButton.dataset.mx||50))/100,my=Math.max(0,Math.min(100,+sourceButton.dataset.my||50))/100;return{x:r.left+r.width*mx,y:r.top+r.height*my}
}
function focusPushIn(sourceButton){
 el.hotspots.style.pointerEvents='none';el.hotspots.classList.add('focus-transition');el.shade.classList.add('focus-push');
 if(isReducedMotion()||!el.sceneArt.animate)return Promise.resolve();
 try{focusPushAnim?.cancel()}catch{}
 const pt=hotspotPoint(sourceButton),dx=(innerWidth/2-pt.x)*.11,dy=(innerHeight/2-pt.y)*.11;
 focusPushAnim=el.sceneArt.animate([{transform:getComputedStyle(el.sceneArt).transform==='none'?'scale(1.02)':getComputedStyle(el.sceneArt).transform,filter:'brightness(1)'},{transform:`translate3d(${dx}px,${dy}px,0) scale(1.205)`,filter:'brightness(.88) saturate(.9)'}],{duration:560,easing:'cubic-bezier(.2,.72,.12,1)',fill:'forwards'});
 return focusPushAnim.finished.catch(()=>{});
}
function focusPullOut(){try{focusPushAnim?.cancel()}catch{}focusPushAnim=null;el.sceneArt.style.transform='';el.sceneArt.style.filter='';el.shade.classList.remove('focus-push');el.hotspots.style.pointerEvents='';el.hotspots.classList.remove('focus-transition');runSceneDirector(state.scene)}
function openFocusScene(label,sourceButton){return new Promise(async resolve=>{
 const pt=hotspotPoint(sourceButton),x=pt.x,y=pt.y;
 el.shade.style.setProperty('--focus-x',x+'px');el.shade.style.setProperty('--focus-y',y+'px');
 await focusPushIn(sourceButton);duckMix(true);
 el.focus.style.setProperty('--focus-x',x+'px');el.focus.style.setProperty('--focus-y',y+'px');el.focus.dataset.kind=focusKind(label);el.focusVisual.innerHTML=focusMarkup(label);el.focusTitle.textContent=label;el.focusCaption.textContent=(state.flags.replay&&focusCaptionsReplay[label])||focusCaptions[label]||'凑近一点以后，才发现这里原来有这么多小地方。';el.focusKicker.textContent=`${flowerNow().name} · ${state.chapter>=5?'毕业以前':'那时候'}`;el.focus.hidden=false;el.focus.classList.remove('ready','leaving');el.focus.classList.add('entering');playFocusCue(focusKind(label),label);
 const img=el.focusVisual.querySelector('img');img?.addEventListener('error',()=>{img.src='assets/art/focus/generic.webp'},{once:true});requestAnimationFrame(()=>requestAnimationFrame(()=>{el.focus.classList.add('ready');el.focus.classList.remove('entering')}));
 let done=false;const finish=(go)=>{if(done)return;done=true;focusDismiss=null;el.focus.classList.add('leaving');el.focus.classList.remove('ready');setTimeout(()=>{el.focus.hidden=true;el.focus.classList.remove('leaving','entering');$('#focusInspect').onclick=null;$('#focusBack').onclick=null;focusPullOut();duckMix(false);sourceButton?.focus?.({preventScroll:true});resolve(go)},isReducedMotion()?50:390)};
 focusDismiss=()=>finish(false);$('#focusInspect').onclick=()=>finish(true);$('#focusBack').onclick=()=>finish(false);setTimeout(()=>$('#focusInspect')?.focus({preventScroll:true}),isReducedMotion()?60:720)
})}
function memoryShotPool(){
 const seen=new Set(state.inspected||[]),map={blackboard:['黑板','blackboard.webp'],fan:['吊扇','fan.webp'],water:['饮水机','water.webp'],windowseat:['靠窗第三排','window-seat.webp'],scratch:['课桌底部刻痕','desk-scratch.webp'],duty:['值日表','duty-roster.webp'],gradphoto:['毕业照片标签','grad-photo.webp'],plant:['植物角','plant-corner.webp'],zhixia:['沈知夏的桌面','zhixia-desk.webp'],zhouye:['周野','zhouye.webp'],bag:['沈知夏的书包','zhixia-bag.webp'],canteenNoise:['远处餐盘声','cafeteria-rhythm.webp'],windowReflection:['窗户倒影','window-reflection.webp'],tubeHum:['白色灯管','tube-light.webp'],shelf:['书架分类牌','shelf-label.webp'],festivalDrink:['饮料桌','drinks-table.webp'],festivalPhoto:['唐梨的相机','tangli-camera.webp'],festivalZhou:['周野的节目单','zhou-program.webp'],handwriting:['四个人的旧作业','old-homework.webp'],addressdoc:['住址资料','address-doc.webp'],blankBell:['桔梗页的空白','bellflower-blank.webp']};
 return Object.entries(map).filter(([id])=>seen.has(id)).map(([,v])=>[`assets/art/focus/${v[1]}`,v[0]])
}
async function playMemoryMontage(){
 const personal=memoryShotPool().slice(0,7).map(([src,name],i)=>[src,[`我那时候真的停下来，看过${name}。`,`后来想起来，最先回来的也是${name}。`,`那时没有觉得特别。后来才知道，它其实一直留在我心里。`][i%3]]);
 const fixed=[
  ['assets/art/group_photo.webp','那时候拍照，总有人来不及站好。'],
  ['assets/art/shots/corridor_spring.webp','下课铃一响，走廊一下子就满了。'],
  ['assets/art/shots/cafeteria_shared.webp','“两份。” 然后谁也没有认真算过是谁欠谁。'],
  ['assets/art/shots/window_evening.webp','她抬头的时候，窗外的光也刚好落下来。'],
  ['assets/art/shots/festival_backstage.webp','唐梨的相机里，我们总比记忆先一步长大。'],
  ['assets/art/cg_peace.webp','四盒鸡米花。谁也没先笑，可谁都已经不生气了。'],
  ['assets/art/shots/countdown_48.webp','48天。那时候还觉得，够我们把很多话慢慢说完。'],
  ['assets/art/shots/bellflower_hands.webp','“那我……”  后半句，被风吹散了。'],
  ['assets/art/cg_graduation.webp','她把桔梗藏在身后，我把那张纸捏得很皱。'],
  ['assets/art/cg_pressflower.webp','最后一页合上以后，有些话就真的只剩花了。'],
  ['assets/art/shots/empty_classroom.webp','后来教室真的空了。只剩回忆还坐在原位。']
 ];
 const shots=[...personal,...fixed];
 el.montage.hidden=false;el.montage.classList.remove('cut','out','flash','fast');
 for(let i=0;i<shots.length;i++){
   const [src,caption]=shots[i];
   el.montage.classList.toggle('fast',i>Math.floor(shots.length*.62));
   el.montage.classList.remove('cut','out');
   el.montageImage.src=src;el.montageImage.alt='青春回忆 '+(i+1);el.montageCaption.textContent=caption;
   if(i>0){el.montage.classList.remove('flash');void el.montage.offsetWidth;el.montage.classList.add('flash')}
   await sleep(isReducedMotion()?90:120);
   el.montage.classList.add('cut');
   await sleep(isReducedMotion()?185:Math.max(500,1400-i*58));
   el.montage.classList.add('out');
   await sleep(isReducedMotion()?80:165)
 }
 el.montage.classList.remove('cut','fast');await sleep(isReducedMotion()?80:650);el.montage.hidden=true
}
function layoutHotspots(){
 const cw=el.hotspots.clientWidth||innerWidth,ch=el.hotspots.clientHeight||innerHeight;if(!cw||!ch)return;
 const sw=el.sceneArt.naturalWidth||1600,sh=el.sceneArt.naturalHeight||900,bw=el.sceneArt.offsetWidth||cw,bh=el.sceneArt.offsetHeight||ch,bl=el.sceneArt.offsetLeft||0,bt=el.sceneArt.offsetTop||0;
 const fit=getComputedStyle(el.sceneArt).objectFit||'cover',scale=fit==='contain'?Math.min(bw/sw,bh/sh):Math.max(bw/sw,bh/sh),rw=sw*scale,rh=sh*scale,ox=bl+(bw-rw)/2,oy=bt+(bh-rh)/2;
 el.hotspots.querySelectorAll('.hotspot').forEach(b=>{const x=+b.dataset.x||0,y=+b.dataset.y||0,w=+b.dataset.w||1,h=+b.dataset.h||1;b.style.left=(ox+rw*x/100)+'px';b.style.top=(oy+rh*y/100)+'px';b.style.width=(rw*w/100)+'px';b.style.height=(rh*h/100)+'px'})
}
el.sceneArt.addEventListener('load',()=>requestAnimationFrame(layoutHotspots));
addEventListener('resize',()=>requestAnimationFrame(layoutHotspots));

function setHotspots(items){
 el.hotspots.innerHTML='';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+n)?+n:min));
 items.forEach(h=>{
  const b=document.createElement('button');
  const x=clamp(h.x,0,99),y=clamp(h.y,0,99),w=clamp(h.w,1,100-x),hh=clamp(h.h,1,100-y);
  const mx=clamp(h.mx??50,8,92),my=clamp(h.my??50,8,92);
  b.className='hotspot'+(h.done?.()?' done':'');
  b.dataset.label=h.label;b.dataset.kind=focusKind(h.label);
  b.setAttribute('aria-label',h.label);b.title=h.label;
  b.dataset.x=x;b.dataset.y=y;b.dataset.w=w;b.dataset.h=hh;b.dataset.mx=mx;b.dataset.my=my;
  b.style.setProperty('--marker-x',mx+'%');b.style.setProperty('--marker-y',my+'%');
  const preload=new Image();preload.src='assets/art/focus/'+(focusAssets[h.label]||'generic.webp');
  b.onclick=async()=>{if(b.dataset.busy==='1')return;if(!el.dialogue.hidden||!el.cinematic.hidden||!el.montage.hidden||!el.object.hidden||!el.focus.hidden){if(!el.dialogue.hidden)toast('先把当前文字看完。');return}b.dataset.busy='1';const go=await openFocusScene(h.label,b);if(go){await h.onClick(b);if(h.id)markInspected(h.id);if(h.done?.())b.classList.add('done')}b.dataset.busy='0'};
  el.hotspots.appendChild(b)
 });layoutHotspots()
}

// PETALS
const cv=$('#petals'),ctx=cv.getContext('2d');let petals=[];
function resize(){const dpr=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);seedPetals()}
addEventListener('resize',resize);
function pick(arr){return arr[(Math.random()*arr.length)|0]}
const PETAL_PROFILE={daisy:{fall:.9,sway:1,tumble:1,flutter:.18,drift:.16,blurNear:1.2,alpha:.42},sunflower:{fall:1.14,sway:.78,tumble:1.45,flutter:.12,drift:.22,blurNear:1.35,alpha:.45},gardenia:{fall:.72,sway:.66,tumble:.72,flutter:.08,drift:.12,blurNear:1.05,alpha:.38},jacaranda:{fall:1.48,sway:1.32,tumble:1.18,flutter:.24,drift:.28,blurNear:1.5,alpha:.48},forget:{fall:.64,sway:.88,tumble:.58,flutter:.16,drift:.1,blurNear:.95,alpha:.34}};
function petalProfile(type){return PETAL_PROFILE[type]||PETAL_PROFILE.daisy}
function spawnPetal(p={},fresh=false){const f=flowerNow(),mobile=innerWidth<760,types=f.key==='mixed'?['daisy','sunflower','gardenia','jacaranda','forget']:[f.key],type=pick(types),cfg=petalProfile(type),size=f.size[0]+Math.random()*(f.size[1]-f.size[0]);p.type=type;p.s=size;p.depth=.42+Math.random()*1.28;p.v=f.speed*(.5+Math.random()*.95);p.w=f.wind*(.42+Math.random()*1.05);p.a=Math.random()*6.28;p.r=(Math.random()-.5)*(.018+Math.random()*.02);p.color=pick(f.color);p.phase=Math.random()*6.28;p.flutterPhase=Math.random()*6.28;p.flutterSpeed=.012+Math.random()*.028;p.flutterAmp=(mobile?1.6:2.2)*(cfg.flutter+.16*Math.random());p.blur=Math.random();p.x=fresh?Math.random()*innerWidth:(Math.random()<.28?-24-Math.random()*42:Math.random()*(innerWidth+48)-24);p.y=fresh?Math.random()*innerHeight:-18-Math.random()*innerHeight*.9;return p}
function seedPetals(){const f=flowerNow(),mobile=innerWidth<760,n=Math.round(f.density*(mobile?.68:1));petals=Array.from({length:n},(_,i)=>spawnPetal({},true))}
function paintPetal(p){
 const s=p.s,dep=p.depth||1;
 ctx.save();
 ctx.shadowColor='rgba(35,28,22,.22)';ctx.shadowBlur=dep>1.15?2.8:1.2;ctx.shadowOffsetY=dep>1.15?1.2:.5;
 const g=ctx.createLinearGradient(-s,-s,s,s);
 const base=p.color;g.addColorStop(0,'rgba(255,255,255,.90)');g.addColorStop(.28,base);g.addColorStop(.72,base);g.addColorStop(1,'rgba(84,70,62,.48)');ctx.fillStyle=g;
 ctx.strokeStyle='rgba(92,76,65,.22)';ctx.lineWidth=Math.max(.35,s*.055);
 ctx.beginPath();
 if(p.type==='daisy'){
   ctx.moveTo(0,-s*1.18);ctx.bezierCurveTo(s*.55,-s*.92,s*.5,s*.44,0,s*1.06);ctx.bezierCurveTo(-s*.5,s*.44,-s*.55,-s*.92,0,-s*1.18);ctx.closePath();
 }else if(p.type==='sunflower'){
   ctx.moveTo(0,-s*1.22);ctx.bezierCurveTo(s*.92,-s*.68,s*.68,s*.68,0,s*1.05);ctx.bezierCurveTo(-s*.5,s*.68,-s*.8,-s*.52,0,-s*1.22);ctx.closePath();
 }else if(p.type==='gardenia'){
   ctx.moveTo(0,-s*1.04);ctx.bezierCurveTo(s*1.04,-s*.77,s*.9,s*.72,0,s*.98);ctx.bezierCurveTo(-s*.88,s*.72,-s*1.05,-s*.7,0,-s*1.04);ctx.closePath();
 }else if(p.type==='jacaranda'){
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2,r1=s*.34,r2=s*.98;const x1=Math.cos(a-.36)*r1,y1=Math.sin(a-.36)*r1,x2=Math.cos(a)*r2,y2=Math.sin(a)*r2,x3=Math.cos(a+.36)*r1,y3=Math.sin(a+.36)*r1;if(i===0)ctx.moveTo(x1,y1);ctx.quadraticCurveTo(x2,y2,x3,y3)}ctx.closePath();
 }else{
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;const cx=Math.cos(a)*s*.45,cy=Math.sin(a)*s*.45;ctx.moveTo(0,0);ctx.quadraticCurveTo(cx*1.45,cy*1.45,cx,cy);ctx.quadraticCurveTo(cx*.55,cy*.55,0,0)}
 }
 ctx.fill();ctx.stroke();
 ctx.globalAlpha=.28;ctx.strokeStyle='rgba(255,248,228,.9)';ctx.lineWidth=Math.max(.3,s*.035);ctx.beginPath();ctx.moveTo(0,-s*.74);ctx.quadraticCurveTo(s*.08,0,0,s*.72);ctx.stroke();
 if(p.type==='forget'){ctx.globalAlpha=.45;ctx.fillStyle='rgba(235,207,91,.85)';ctx.beginPath();ctx.arc(0,0,s*.11,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
resize();
(function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);if(!isReducedMotion()){const t=performance.now()*.001,globalGust=Math.sin(t*.82)*.22+Math.cos(t*.31)*.16;petals.forEach(p=>{const cfg=petalProfile(p.type);p.phase+=.016+cfg.flutter*.08;p.flutterPhase+=p.flutterSpeed;p.y+=p.v*p.depth*cfg.fall*(1+.06*Math.sin(p.phase*.7));p.x+=(Math.sin(p.phase*1.2)*p.w*.34+Math.cos(p.phase*.66)*p.w*.18+globalGust*cfg.drift+Math.sin(p.flutterPhase*2.1)*p.flutterAmp)*p.depth;p.a+=p.r*cfg.tumble+Math.sin(p.phase*1.7)*.004*(.7+cfg.tumble*.45);const tilt=Math.sin(p.phase*1.35+p.flutterPhase)*(.08+cfg.flutter*.4);if(p.y>innerHeight+36||p.x<-56||p.x>innerWidth+56)spawnPetal(p,false);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a+tilt);ctx.scale(1+tilt*.06,1-Math.abs(tilt)*.09);ctx.globalAlpha=Math.min(.82,cfg.alpha+.2*p.depth);ctx.filter=p.depth>1.42?`blur(${cfg.blurNear}px)`:p.depth<.65?'blur(.55px)':'none';paintPetal(p);ctx.restore()})}requestAnimationFrame(draw)})();

// PUZZLES
function puzzle1(){
 const clues=[['黑板',inspected('blackboard')?'“距高考 2 天”':'还没仔细看'],['值日表',inspected('duty')?'6月5日':'还没仔细看'],['毕业照标签',inspected('gradphoto')?'拍摄：6月7日':'还没仔细看']];
 let fails=0;openObject(`<div class="physical"><h2>储物柜 · 四位机械锁</h2><div class="clue-board">${clues.map((c,i)=>`<div class="clue-card" style="--r:${[-1.3,.8,-.5][i]}deg"><strong>${c[0]}</strong>${c[1]}</div>`).join('')}</div><div class="lock">${[0,0,0,0].map((n,i)=>`<div class="wheel" data-i="${i}"><button class="up">⌃</button><span class="num">0</span><button class="down">⌄</button></div>`).join('')}</div><div class="status-line" id="lockStatus"></div><div style="text-align:center"><button class="metal-btn" id="tryLock">转动把手</button></div></div>`,()=>{
  $$('.wheel').forEach(w=>{let n=0,startY=null,lastStep=0;const render=()=>{w.querySelector('.num').textContent=n;w.dataset.v=n};const turn=d=>{n=(n+d+10)%10;render();playSfx('click')};w.querySelector('.up').onclick=()=>turn(1);w.querySelector('.down').onclick=()=>turn(-1);w.onwheel=e=>{e.preventDefault();turn(e.deltaY<0?1:-1)};w.onpointerdown=e=>{startY=e.clientY;lastStep=0;w.setPointerCapture?.(e.pointerId)};w.onpointermove=e=>{if(startY===null)return;const step=Math.trunc((startY-e.clientY)/24);if(step!==lastStep){turn(step>lastStep?1:-1);lastStep=step}};w.onpointerup=w.onpointercancel=()=>{startY=null;lastStep=0};render()});
  $('#tryLock').onclick=async()=>{const okClues=['blackboard','duty','gradphoto'].every(inspected);const code=$$('.wheel').map(w=>w.dataset.v||'0').join('');const st=$('#lockStatus');if(!okClues){st.className='status-line error';st.textContent='把手没有动。你还没有足够证据确定这个日期。';return}if(code!=='0607'){fails++;st.className='status-line error';st.textContent=fails>=2?'值日表是6月5日；黑板写“距高考2天”，毕业照也标着6月7日。所以锁码是 0607。':'金属锁舌没有弹开。三个日期线索应该指向同一天。';return}st.className='status-line success';st.textContent='咔哒。';state.puzzles.pz1=true;addItem('植物观察册');addItem('四人照片');addItem('旧课本');addItem('毕业日期');addItem('毕业照');setCheckpoint('transitionPast');playSfx('bell');await sleep(500);closeObject();await transitionToPast()}
 });
}
async function transitionToPast(){setCheckpoint('transitionPast');renderScene('photo',{memory:true,cinematic:true});await say([{t:'照片有点糊。可那天下午好像真的很亮。'},{s:'周野',t:'快点快点，再拍一张！'},{s:'唐梨',t:'你已经拍十六张了。'},{s:'沈知夏',t:'林屿你不要每次都闭眼。'}]);await playCinematicShot('corridor',2500);state.chapter=1;setCheckpoint('ch1class');renderScene('ch1class',{memory:true});ambient('room');await say([{t:'第一章 · 向日葵｜鸡米花应该算一道菜吗'},{s:'老师',t:'四人一组。沈知夏记录，唐梨拍照，林屿整理文字。'}]);await playCinematicShot('zhixiaIntro',1050);await say([{s:'沈知夏',t:'好。'}]);await playCinematicShot('zhouyeIntro',900);await say([{s:'周野',t:'我可以负责战略统筹。'},{s:'老师',t:'你负责搬花盆。'},{s:'唐梨',t:'……挺适合你的。'}]);setupCh1Class();}
function puzzle2(){
 const pts=[['花瓣',45,20],['叶片',28,43],['茎',49,53],['光照方向',75,18],['花盆标签',52,79]];
 openObject(`<div class="physical plant-board"><div class="plant-visual"><svg viewBox="0 0 520 440" aria-label="植物观察对象"><rect width="520" height="440" fill="#bcc9bd"/><rect y="350" width="520" height="90" fill="#9b8569"/><path d="M260 360 C250 300 270 250 258 175 C245 120 270 75 250 38" stroke="#53745a" stroke-width="12" fill="none"/><path d="M254 210 C200 180 170 180 132 145 C195 145 238 165 260 195 M260 275 C315 245 350 230 388 195 C330 195 290 215 260 250" stroke="#628164" stroke-width="15" fill="none"/><path d="M250 45 c-45 -35 -85 10 -62 52 c-49 7 -44 64 2 73 c-17 47 40 70 68 31 c34 35 84 4 69 -38 c49 -10 45 -65 -3 -74 c12 -46 -39 -74 -74 -44z" fill="#b6a565" stroke="#625c42" stroke-width="7"/><rect x="190" y="330" width="140" height="70" fill="#8c6f55" stroke="#5e4939" stroke-width="6"/><rect x="225" y="357" width="70" height="28" fill="#d9ccb1"/><text x="238" y="378" font-size="18" fill="#5a5144">B-17</text><path d="M380 60 L480 20" stroke="#e6d5a1" stroke-width="35" opacity=".32"/></svg>${pts.map(([n,x,y])=>`<button class="plant-point" data-name="${n}" style="left:${x}%;top:${y}%" aria-label="观察${n}"></button>`).join('')}</div><div class="plant-notes"><h2>植物观察</h2><p id="observeCount">已观察 0 / 5</p><div class="slots"><div class="slot" data-answer="5枚花瓣">花瓣：<span></span></div><div class="slot" data-answer="披针形">叶片：<span></span></div><div class="slot" data-answer="直立">茎：<span></span></div><div class="slot" data-answer="右上方">光照：<span></span></div><div class="slot" data-answer="B-17">标签：<span></span></div><div class="slot" data-answer="6月12日">日期：<span></span></div></div><div class="chips">${['右上方','B-17','披针形','5枚花瓣','直立','6月12日'].map(x=>`<div class="chip" draggable="true">${x}</div>`).join('')}</div><button class="puzzle-btn" id="finishPlant">完成第一页</button><div id="plantStatus" class="status-line"></div></div></div>`,()=>{
  let seen=new Set();$$('.plant-point').forEach(p=>p.onclick=()=>{seen.add(p.dataset.name);p.classList.add('seen');$('#observeCount').textContent=`已观察 ${seen.size} / 5`;playSfx('paper')});
  let drag='';$$('.chip').forEach(c=>{c.ondragstart=()=>{drag=c.textContent;c.classList.add('dragging')};c.ondragend=()=>c.classList.remove('dragging');c.onclick=()=>{drag=c.textContent;toast('已拿起：'+drag)}});$$('.slot').forEach(s=>{s.ondragover=e=>e.preventDefault();const put=()=>{if(!drag)return;s.querySelector('span').textContent=drag;s.dataset.value=drag;s.classList.add('filled');drag=''};s.ondrop=e=>{e.preventDefault();put()};s.onclick=put});
  $('#finishPlant').onclick=async()=>{const ok=seen.size===5 && $$('.slot').every(s=>s.dataset.value===s.dataset.answer);if(!ok){$('#plantStatus').textContent=seen.size<5?'先把植物本身完整观察一遍。':'有几项记录和你刚才看到的不一致。';return}state.puzzles.pz2=true;setCheckpoint('cafeteria');closeObject();await say([{s:'沈知夏',t:'还行。'},{s:'周野',t:'什么叫还行？这是团队智慧。'},{s:'唐梨',t:'你搬了三个花盆。'},{s:'周野',t:'体力劳动也是劳动。'}]);renderScene('cafeteria');setupCafeteria()}
 });
}
function puzzle3(){
 if(!hasFlag('boughtFoodForZhixia')){toast('先去窗口替沈知夏买一份。');return}
 let count=0,weighed=false,fails=0;const groups=[4,4,4,5];const positions=[{l:12,t:15,r:-12},{l:23,t:22,r:9},{l:33,t:13,r:20},{l:38,t:28,r:-20},{l:58,t:15,r:6},{l:69,t:20,r:-14},{l:78,t:12,r:16},{l:83,t:30,r:-5},{l:14,t:57,r:11},{l:25,t:64,r:-17},{l:35,t:54,r:4},{l:40,t:72,r:23},{l:58,t:55,r:-8},{l:67,t:68,r:18},{l:76,t:56,r:-19},{l:84,t:71,r:7},{l:70,t:82,r:22}];
 const zones=[{l:5,t:5,w:43,h:43},{l:52,t:5,w:43,h:43},{l:5,t:49,w:43,h:46},{l:52,t:49,w:43,h:46}];
 openObject(`<div class="physical"><h2>鸡米花调查</h2><p>别一块一块戳。像当时做实验一样，把餐盘分成四区数，再看电子秤。</p><div class="food-stage"><div><div class="food-tray">${positions.map((p,i)=>`<span class="kernel" aria-hidden="true" style="left:${p.l}%;top:${p.t}%;--rot:${p.r}deg"></span>`).join('')}${zones.map((z,i)=>`<button class="count-zone" data-zone="${i}" data-shown="" aria-label="数第${i+1}区" style="left:${z.l}%;top:${z.t}%;width:${z.w}%;height:${z.h}%"></button>`).join('')}</div><p>分区合计：<strong id="kernelCount">0</strong> 块</p><p class="radio-ear-note">把盘子想成四拍：左上、右上、左下、右下。每区只记一次。</p></div><div><div class="scale"><div><div class="display" id="scaleDisplay">--- g</div><button class="puzzle-btn light" id="weigh">把餐盘放上去</button></div></div><div class="receipts"><div class="receipt">前日：20块 / 180g</div><div class="receipt">昨日：20块 / 180g</div><div class="receipt">今天窗口标签：20块</div></div><div class="answers"><button class="puzzle-btn light ans" data-a="18">18g</button><button class="puzzle-btn light ans" data-a="27">27g</button><button class="puzzle-btn light ans" data-a="36">36g</button></div><div id="foodStatus" class="status-line"></div></div></div></div>`,()=>{
  $$('.count-zone').forEach(z=>z.onclick=()=>{if(z.classList.contains('marked'))return;const i=+z.dataset.zone,n=groups[i];z.classList.add('marked');z.dataset.shown=n;count+=n;$('#kernelCount').textContent=count;playSfx(i===3?'focusPaper':'click')});
  $('#weigh').onclick=()=>{weighed=true;$('#scaleDisplay').textContent='153 g';playSfx('tray')};
  $$('.ans').forEach(b=>b.onclick=async()=>{if(count<17||!weighed){$('#foodStatus').textContent=count<17?'四个区域还没有全部数完。':'数字有了，再把盘子放到电子秤上。';return}if(b.dataset.a!=='27'){fails++;$('#foodStatus').textContent=fails>=2?'完整20块是180g；今天整盘153g，所以少掉的是 180 - 153 = 27g。':'20块是180g；今天整盘153g。比较的是“应该有的总重量”和“现在的总重量”。';return}$('#foodStatus').textContent='少了27g。';await sleep(500);await say([{s:'唐梨',t:'周野。你刚刚是不是吃了？'},{s:'周野',t:'没有。'},{s:'沈知夏',t:'27克。'},{s:'周野',t:'什么？'},{s:'沈知夏',t:'你吃掉的重量。'},{s:'林屿',t:'嫌疑人当场销毁证据。'},{s:'周野',t:'科学实验允许合理损耗。'}]);state.puzzles.pz3=true;addItem('鸡米花小票');setCheckpoint('cafeteriaAfter');closeObject();setupCafeteriaAfter()})
 });
}
function puzzle4(){
 const slots=[{x:12,y:12,w:32,h:33},{x:43,y:12,w:39,h:33},{x:18,y:44,w:28,h:32},{x:45,y:44,w:32,h:32},{x:65,y:67,w:25,h:25}];
 const texts=['如果有一天真的离开这里……','我大概会先记得风扇。\n第三档总是会晃。','然后是窗边的光，\n下午会照到课桌右角。','靠窗第三排有人困得睁不开眼，','还坚持说自己没有睡着。'];
 const slotHtml=slots.map((s,i)=>`<button type="button" class="paper-slot" data-slot="${i}" aria-label="纸片位置 ${i+1}" style="left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%"></button>`).join('');
 const fragHtml=texts.map((t,i)=>`<button type="button" class="fragment" data-i="${i}" style="left:${5+(i*17)%68}%;top:${8+(i*13)%58}%;width:${slots[i].w}%;height:${slots[i].h}%">${t.replace(/\n/g,'<br>')}</button>`).join('');
 openObject(`<div class="physical"><h2>作文碎片</h2><p>把五块真实纸片拼回缺失的结尾。可以直接拖动；手机或键盘也可以先点一块纸，再点它对应的空位。</p><div class="paper-puzzle" id="paperBoard">${slotHtml}${fragHtml}</div><div id="paperStatus" class="status-line">纸张大小和断句，会告诉你它应该接在哪里。</div></div>`,()=>{
  const board=$('#paperBoard'),ctrl=new AbortController(),locked=new Set();let armed=null;
  const setStatus=t=>{$('#paperStatus').textContent=t};
  const arm=f=>{if(!f||f.classList.contains('locked'))return;$$('.fragment').forEach(x=>x.classList.remove('armed'));armed=f;f.classList.add('armed');setStatus('拿起了一块纸。再点它应该落下的空位。')};
  const finishIfDone=()=>{if(locked.size!==5)return;state.puzzles.pz4=true;addItem('作文残页');setCheckpoint('seat');setStatus('纸片重新连成了一段完整的文字。');setTimeout(()=>{closeObject();setupSeatPuzzleScene()},520)};
  const snap=(f,i)=>{const slt=slots[i];Object.assign(f.style,{left:slt.x+'%',top:slt.y+'%',width:slt.w+'%',height:slt.h+'%'});f.classList.remove('armed');f.classList.add('locked');f.disabled=true;locked.add(i);armed=null;const slot=$(`.paper-slot[data-slot="${i}"]`);slot?.classList.add('filled');playSfx('paper');finishIfDone()};
  $$('.fragment').forEach(f=>{let ox=0,oy=0,drag=false,moved=false,pid=null,sx=0,sy=0;
   f.onpointerdown=e=>{if(f.classList.contains('locked'))return;drag=true;moved=false;pid=e.pointerId;sx=e.clientX;sy=e.clientY;f.setPointerCapture?.(pid);const fr=f.getBoundingClientRect();ox=e.clientX-fr.left;oy=e.clientY-fr.top;e.preventDefault()};
   document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pid||f.classList.contains('locked'))return;if(Math.hypot(e.clientX-sx,e.clientY-sy)>5)moved=true;if(!moved)return;const r=board.getBoundingClientRect();f.style.left=((e.clientX-r.left-ox)/r.width*100)+'%';f.style.top=((e.clientY-r.top-oy)/r.height*100)+'%'},{signal:ctrl.signal});
   const up=e=>{if(!drag||e.pointerId!==pid)return;drag=false;const i=+f.dataset.i;if(!moved){arm(f);return}const r=board.getBoundingClientRect(),fr=f.getBoundingClientRect(),cx=(fr.left-r.left)/r.width*100,cy=(fr.top-r.top)/r.height*100,slt=slots[i];if(Math.abs(cx-slt.x)<7&&Math.abs(cy-slt.y)<7)snap(f,i);else setStatus('这块纸接在这里不顺。可以拖回去，也可以点它再选空位。')};
   document.addEventListener('pointerup',up,{signal:ctrl.signal});document.addEventListener('pointercancel',up,{signal:ctrl.signal});
   f.onclick=()=>{if(!moved&&!f.classList.contains('locked'))arm(f)};
   f.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!f.classList.contains('locked')){e.preventDefault();arm(f)}};
  });
  $$('.paper-slot').forEach(slot=>{slot.onclick=()=>{if(!armed){setStatus('先选一块纸。');return}const target=+slot.dataset.slot,actual=+armed.dataset.i;if(target!==actual){setStatus('断句和纸片大小对不上。换一个空位试试。');playSfx('click');return}snap(armed,target)}});
  return()=>ctrl.abort();
 });
}
function puzzle5(){
 const names=[['周野','韩宁','顾川','白婷','许宁'],['赵琪','唐梨','陈曦','林屿','郑方'],['宋嘉','程安','叶可','梁一','沈知夏'],['吴明','范秋','张可','李熙','何远']];
 let fails=0;openObject(`<div class="physical"><h2>靠窗第三排是谁</h2><p>座位表按教室前方向后排列。窗户在右侧。</p><div class="seat-grid"><div></div>${[1,2,3,4,5].map(i=>`<div class="seat">第${i}列</div>`).join('')}${names.map((row,r)=>`<div class="seat">第${r+1}排</div>${row.map((n,c)=>`<button class="seat ${r===2&&c===4?'target':''}" data-name="${n}">${n}</button>`).join('')}`).join('')}<div></div><div class="window-mark" style="grid-column:6">窗</div></div><div id="seatStatus" class="status-line"></div></div>`,()=>{$$('.seat[data-name]').forEach(b=>b.onclick=async()=>{if(b.dataset.name!=='沈知夏'){fails++;$('#seatStatus').textContent=fails>=2?'窗户在右侧；从讲台往后数第三排，再取最靠窗的座位，就是沈知夏。':'位置对不上。再从“靠窗”和“第三排”两个条件一起看。';return}state.puzzles.pz5=true;setCheckpoint('library');$('#seatStatus').textContent='沈知夏。';await sleep(450);closeObject();await say([{s:'林屿',t:'……'}]);renderScene('library');setupLibrary()})});
}
function puzzle6(){
 const bars=Array.from({length:46},(_,i)=>`<i style="--h:${26+((i*37)%58)}%"></i>`).join('');
 openObject(`<div class="physical radio-console"><h2>广播磁带</h2><p>这次磁带真的可以听。节目从17:40开始，后台话筒被误录进了其中一个声道。</p><div class="radio-display" id="radioTime">17:40:00</div><div class="tape-window"><i></i><i></i><span>校园广播留档 · A面</span></div><div id="tapeWave" class="tape-waveform">${bars}</div><input class="tape-slider" id="tape" type="range" min="0" max="220" step="1" value="0" aria-label="磁带位置"><div class="transport"><button class="puzzle-btn" id="playTape">播放</button><button class="puzzle-btn" data-d="-15">倒带 15s</button><button class="puzzle-btn" data-d="15">快进 15s</button></div><div class="channel-row"><button class="channel" data-ch="L">左声道</button><button class="channel active" data-ch="R">右声道</button></div><div class="transcript" id="transcript">右声道是一段有完整旋律和节拍的校园点歌节目。</div><p class="radio-ear-note">建议戴耳机。左/右声道是两条真实音轨；切换时会保留当前时间。</p><button class="puzzle-btn" id="confirmTape">确认这段录音</button><div id="radioStatus" class="status-line"></div></div>`,()=>{
  let ch='R',playing=false,raf=0,fails=0;const tape=$('#tape'),wave=$('#tapeWave');
  const tracks={R:new Audio('assets/audio/broadcast_right.mp3'),L:new Audio('assets/audio/broadcast_left.mp3')};Object.values(tracks).forEach(a=>{a.preload='auto';a.volume=Math.min(.9,state.settings.sfx*.72)});
  const fmt=v=>{v=Math.max(0,+v);const m=Math.floor(v/60),sec=Math.floor(v%60);return`17:${String(40+m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`};
  const active=()=>tracks[ch];
  const render=()=>{const v=+tape.value;$('#radioTime').textContent=fmt(v);const near=Math.abs(v-195)<=7;$('#transcript').textContent=ch==='R'?'右声道：旋律、主持串场和点歌节目。':near?'左声道：旋律下面突然出现一段压低的人声节奏。':'左声道：节目声很远，只剩后台话筒和房间里的回声。'};
  const loop=()=>{if(!playing)return;const a=active();tape.value=Math.min(220,a.currentTime||0);render();if(a.ended||a.currentTime>=219.5){stop();return}raf=requestAnimationFrame(loop)};
  const stop=()=>{playing=false;cancelAnimationFrame(raf);Object.values(tracks).forEach(a=>a.pause());wave.classList.remove('listening');const b=$('#playTape');if(b)b.textContent='播放'};
  const play=async()=>{const a=active();a.currentTime=Math.min(219,+tape.value);try{await a.play();playing=true;wave.classList.add('listening');$('#playTape').textContent='暂停';cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}catch{$('#radioStatus').textContent='浏览器拦截了播放。再点一次“播放”即可。'}};
  $('#playTape').onclick=()=>{playSfx('tape');playing?stop():play()};
  tape.oninput=()=>{Object.values(tracks).forEach(a=>a.currentTime=Math.min(219,+tape.value));render()};
  $$('[data-d]').forEach(b=>b.onclick=()=>{const was=playing;if(was)stop();tape.value=Math.max(0,Math.min(220,+tape.value+(+b.dataset.d)));Object.values(tracks).forEach(a=>a.currentTime=+tape.value);render();playSfx('tape');if(was)play()});
  $$('.channel').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.ch===ch?'true':'false');b.onclick=()=>{const was=playing,t=active().currentTime||+tape.value;if(was)stop();ch=b.dataset.ch;$$('.channel').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});tracks.R.currentTime=tracks.L.currentTime=Math.min(219,t);tape.value=t;render();playSfx('click');if(was)play()}});
  $('#confirmTape').onclick=async()=>{const v=+(active().currentTime||tape.value);if(ch!=='L'||Math.abs(v-195)>7){fails++;$('#radioStatus').textContent=fails>=2?'完整定位：左声道，17:43:15 左右。那里能听到节目旋律下面突然出现压低的人声。':'还不是。节目17:40开始；那句话在开始后大约3分15秒，而且不在节目声道。';return}stop();$('#transcript').innerHTML='唐梨：“那你问他。”<br>沈知夏：“不问。”<br>唐梨：“为什么？”<br><br>沈知夏：“问了以后，可能连现在都没有了。”';state.puzzles.pz6=true;setFlag('confirmedZhixiaLikesLinyu');addItem('广播录音时间');setCheckpoint('tapeReveal');await sleep(500);closeObject();await tapeRevealSequence()};render();return()=>{stop();Object.values(tracks).forEach(a=>{a.src='';a.load?.()})};
 });
}
async function tapeRevealSequence(){setCheckpoint('tapeReveal');renderScene('radio',{memory:true});ambient('room');await say([{s:'唐梨',t:'那你问他。'},{s:'沈知夏',t:'不问。'},{s:'唐梨',t:'为什么？'},{s:'沈知夏',t:'问了以后，可能连现在都没有了。'}]);setCheckpoint('postTape');await postTapeSequence()}
async function postTapeSequence(){setCheckpoint('postTape');renderScene('radio',{memory:true});ambient('room');await say([{s:'周野',t:'根据牛顿第三定律……'},{s:'林屿',t:'你最好不要继续。'},{s:'周野',t:'你喜欢她，她理论上也应该喜欢你。'},{s:'林屿',t:'牛顿会报警。'},{s:'唐梨',t:'他物理37。'},{s:'周野',t:'停止人身攻击。'}]);startChapter4()}
function puzzle7(){
 const authors=['林屿','沈知夏','周野','唐梨'];
 const notes=[['如果以后不联系了，也别觉得是谁的错。人本来就会去很多地方。但你们回来找我的时候，我肯定认识。','周野'],['希望知夏以后勇敢一点。希望林屿以后聪明一点。考虑到后者难度较大，主要祝前者成功。','唐梨'],['以后记得给植物浇水','沈知夏'],['以后——算了。\n不对，还是祝大家毕业快乐。','林屿']];
 let fails=0;openObject(`<div class="physical"><h2>无署名毕业留言</h2><p>别靠头像。看字迹、用笔、标点习惯、口头禅与纸张来源。点击纸条下方的署名章轮换判断。</p><div class="note-match">${notes.map((n,i)=>`<div class="note-card" style="--r:${[-1.2,.7,-.4,1.1][i]}deg"><p>${n[0].replace(/\n/g,'<br>')}</p><button class="author-stamp" data-answer="${n[1]}" data-i="-1">盖署名章</button></div>`).join('')}</div><button id="checkNotes" class="puzzle-btn">核对四张留言</button><div id="noteStatus" class="status-line"></div></div>`,()=>{$$('.author-stamp').forEach(b=>b.onclick=()=>{const i=(+b.dataset.i+1)%authors.length;b.dataset.i=i;b.dataset.value=authors[i];b.textContent='作者：'+authors[i];playSfx('paper')});$('#checkNotes').onclick=async()=>{if(!inspected('handwriting')){$('#noteStatus').textContent='先找一组四个人都有署名的笔迹样本。';return}const ok=$$('.author-stamp').every(b=>b.dataset.value===b.dataset.answer);if(!ok){fails++;$('#noteStatus').textContent=fails>=2?'完整对应：第一张周野；第二张唐梨；第三张沈知夏；第四张林屿。依据分别是口头禅/感叹号、字小规整、句末少标点、反复涂改。':'至少有一张不对。想想谁总爱用感叹号，谁几乎不用句末标点，谁会反复涂改。';return}state.puzzles.pz7=true;addItem('留言');setCheckpoint('addressReveal');closeObject();await addressRevealSequence()}})
}
async function addressRevealSequence(){setCheckpoint('addressReveal');renderScene('high3',{memory:true});ambient('room');if(!inspected('addressdoc'))markInspected('addressdoc');await say([{t:'周野把最后一张纸翻回桌面时，压在下面的住址资料露了出来。'},{t:'沈知夏父亲的新工作地点、家庭住址变更、搬家日期。'},{t:'她会正常毕业，只是毕业后全家搬走。'}]);setCheckpoint('conflict');await conflictSequence()}
function puzzle8(){
 const samples=[['作文本纸','横线间距不对；边缘不是同一方向撕裂'],['校刊纸','纸张太薄，纤维密度不同'],['照片背纸','有涂层，不会留下这种毛边'],['植物册原页','尺寸一致，但照片里第33页露出的纸角颜色更白']];
 let fails=0;openObject(`<div class="physical"><h2>植物册缺页 · 第33页</h2><p>31、32、34。第33页被撕走了。先把几种“看起来都像”的纸排除。</p><div class="sample-grid">${samples.map((s,i)=>`<button class="sample" data-i="${i}"><strong>${s[0]}</strong><span hidden>${s[1]}</span></button>`).join('')}</div><div id="sampleText" class="status-line">逐一检查纸张。</div><div class="book-search" id="bookSearch" hidden><button class="book">校刊合订本</button><button class="book">植物图鉴</button><button class="book" data-correct="1">旧课本夹层</button></div></div>`,()=>{let seen=new Set();$$('.sample').forEach(b=>b.onclick=()=>{seen.add(b.dataset.i);b.classList.add('examined');const sp=b.querySelector('span');sp.hidden=false;$('#sampleText').textContent=sp.textContent;if(seen.size===4)$('#bookSearch').hidden=false});$$('.book').forEach(b=>b.onclick=async()=>{if(!b.dataset.correct){fails++;toast(fails>=2?'第33页不在同类资料里。回想当时最容易随手夹纸的地方：旧课本夹层。':'没有找到。');return}state.puzzles.pz8=true;addItem('作文第33页');setCheckpoint('page33Reveal');closeObject();await page33RevealSequence()})})
}
async function page33RevealSequence(){setCheckpoint('page33Reveal');renderScene('notebook',{memory:true});ambient('room');await say([{t:'《十八岁的某一天》真正的结尾。'},{t:'其实我也不知道以后会去哪。\n但如果毕业以后还有联系，应该挺好的。\n如果她也愿意的话。'},{t:'最后一句被反复涂黑。放大后还能认出来：'},{t:'“我好像有点喜欢她。”'}]);setCheckpoint('returnPresent');returnToPresent()}
function puzzle9(){
 const ev=['花店订单','桔梗记录','作文残页','毕业日期','广播录音时间','毕业照','植物观察册','留言','车票','鸡米花小票','四人照片'].filter(x=>state.inventory.includes(x));
 openObject(`<div class="physical final-board"><h2>毕业日重构</h2><p>把证据从桌面拖到两个圆形磁铁位。手机也可以点一下证据，再点空位。</p><div class="evidence-workspace"><div class="evidence-tray">${ev.map(x=>`<button class="evidence" draggable="true" data-e="${x}">${x}<i></i></button>`).join('')}</div><div class="magnet-board"><div class="magnet-slot" data-slot="0"><span>证据 A</span></div><div class="magnet-slot" data-slot="1"><span>证据 B</span></div></div></div><div class="question-box"><strong id="qText">1. 沈知夏是什么时候决定说出口的？</strong><p id="qHint">放入两项证据。</p><div id="finalChoices" class="choice-grid" hidden><button class="choice" data-c="A">A. 有第三个人出现</button><button class="choice" data-c="B">B. 沈知夏临时改变心意</button><button class="choice" data-c="C">C. 两个人错过见面</button><button class="choice" data-c="D">D. 两个人都在等对方先证明自己在乎</button></div><button id="submitEvidence" class="puzzle-btn">确认黑板上的证据</button><div id="evStatus" class="status-line"></div></div></div>`,()=>{
  let q=1,slots=[null,null],drag=null,armed=null,fails=[0,0,0];const renderSlots=()=>{$$('.magnet-slot').forEach((slot,i)=>{const val=slots[i];slot.classList.toggle('filled',!!val);slot.innerHTML=val?`<b>${val}</b><small>点击取下</small>`:`<span>证据 ${i?'B':'A'}</span>`});$$('.evidence').forEach(b=>b.classList.toggle('selected',slots.includes(b.dataset.e)))};const place=(e,i)=>{const old=slots.indexOf(e);if(old>=0)slots[old]=null;if(slots[i]&&slots[i]!==e)return;slots[i]=e;playSfx('paper');renderSlots()};
  $$('.evidence').forEach(b=>{b.ondragstart=()=>{drag=b.dataset.e};b.ondragend=()=>drag=null;b.onclick=()=>{const e=b.dataset.e;if(slots.includes(e)){slots[slots.indexOf(e)]=null;armed=null}else{armed=e;const empty=slots.indexOf(null);if(empty>=0)place(e,empty)}renderSlots()}});$$('.magnet-slot').forEach(slot=>{slot.ondragover=e=>e.preventDefault();slot.ondrop=e=>{e.preventDefault();if(drag)place(drag,+slot.dataset.slot)};slot.onclick=()=>{const i=+slot.dataset.slot;if(armed&&!slots[i]){place(armed,i);armed=null}else if(slots[i]){slots[i]=null;renderSlots()}}});const clear=()=>{slots=[null,null];armed=null;renderSlots()};
  $('#submitEvidence').onclick=()=>{const sel=slots.filter(Boolean);if(sel.length<2){$('#evStatus').textContent='黑板上还缺一项证据。';return}if(q===1){if(sel.includes('花店订单')&&sel.includes('桔梗记录')){q=2;clear();$('#qText').textContent='2. 林屿有没有准备说？';$('#evStatus').textContent='她买了桔梗，也把桔梗留成观察册最后一种。'}else{fails[0]++;$('#evStatus').textContent=fails[0]>=2?'要证明她准备说：花店订单 + 桔梗记录。前者证明毕业日取花，后者证明桔梗被她特意留到植物册最后。':'这两项还不能共同证明“她准备说出口”。'}}else if(q===2){if(sel.includes('作文残页')&&sel.includes('毕业日期')){q=3;clear();$('#qText').textContent='3. 是什么阻止了他们？';$('#qHint').textContent='证据已经够了。现在只需要给出解释。';$('.evidence-workspace').classList.add('resolved');$('#finalChoices').hidden=false;$('#submitEvidence').hidden=true;$$('.choice').forEach(c=>c.onclick=async()=>{if(c.dataset.c!=='D'){fails[2]++;$('#evStatus').textContent=fails[2]>=2?'正确解释是 D：两个人都准备过，但都在等对方先证明自己在乎。其它选项都需要引入证据中不存在的新事件。':'这个解释会引入证据中不存在的新原因。';return}state.puzzles.pz9=true;setCheckpoint('graduationReplay');closeObject();await graduationReplay()})}else{fails[1]++;$('#evStatus').textContent=fails[1]>=2?'要证明林屿也准备说：作文残页 + 毕业日期。作文留下了“喜欢”的痕迹，日期证明机会已经逼近。':'再找能同时证明“他准备过”和“时间已经逼近”的两项。'}}};renderSlots();
 });
}

// SCENE SETUPS
async function beginPrologue(){state.started=true;state.chapter=0;state.step=0;setCheckpoint('prologue');el.title.classList.remove('active');el.game.hidden=false;renderScene('prologue');el.sceneArt.style.opacity='0';await prologueSoundscape();el.sceneArt.style.opacity='1';await sleep(450);await say([{t:'九年了。我还是先看了一眼自己的座位。'},{t:'门牌还是高三七班。居然一点都没变。'},{t:'我知道里面早就不是我们了。可手放到门把上，还是停了一下。'}]);setupPrologue()}
function setupPrologue(){setCheckpoint('prologue');renderScene('prologue');ambient('room');setHotspots([
 {id:'blackboard',label:'黑板',x:5,y:10,w:44,h:32,done:()=>inspected('blackboard'),onClick:()=>say([{t:'“距离高考还有——”\n后半已经擦掉。'},{t:'我以前觉得这几个字特别烦。\n现在居然有点想把它补回来。'},{t:'靠近边角还能辨认出：距高考 2 天。'}])},
 {id:'fan',label:'吊扇',x:46,y:1,w:10,h:9,mx:52,my:50,done:()=>inspected('fan'),onClick:()=>say([{t:'第三档还是会晃。'},{t:'周野以前赌它会在高考前掉下来。'},{t:'它没掉。\n我们先走了。'}])},
 {id:'water',label:'饮水机',x:89,y:58,w:10,h:15,mx:50,my:54,done:()=>inspected('water'),onClick:()=>say([{t:'咕噜。'},{t:'连声音都没怎么变。'}])},
 {id:'windowseat',label:'靠窗第三排',x:61,y:54,w:18,h:14,mx:50,my:50,done:()=>inspected('windowseat'),onClick:()=>say([{t:'我的座位不在这里。'}])},
 {id:'scratch',label:'课桌底部刻痕',x:65,y:69,w:18,h:13,mx:48,my:52,done:()=>inspected('scratch'),onClick:()=>say([{t:'L.Y'},{t:'旁边还有三个字：想得美。'}])},
 {id:'duty',label:'值日表',x:50,y:19,w:8,h:17,mx:52,my:48,done:()=>inspected('duty'),onClick:()=>say([{t:'值日表停在 6月5日。'}])},
 {id:'gradphoto',label:'毕业照片标签',x:58,y:19,w:8,h:17,mx:48,my:48,done:()=>inspected('gradphoto'),onClick:()=>say([{t:'墙上的毕业照标签：拍摄于 6月7日。'}])},
 {label:'储物柜',x:89,y:39,w:10,h:19,mx:50,my:52,onClick:()=>puzzle1()}
 ])}
function setupCh1Class(){setCheckpoint('ch1class');renderScene('ch1class',{memory:true});ambient('room');setHotspots([
 {label:'植物角',x:82,y:27,w:16,h:34,mx:56,my:50,onClick:puzzle2},
 {id:'teacherdesk',label:'讲台',x:3,y:55,w:22,h:24,mx:50,my:46,done:()=>inspected('teacherdesk'),onClick:()=>say([{t:'讲台边缘有粉笔灰。植物观察作业的分组名单还压在下面。'}])},
 {id:'zhixia',label:'沈知夏的桌面',x:27,y:34,w:22,h:36,mx:58,my:62,done:()=>inspected('zhixia'),onClick:()=>say([{t:'记录本摊开着。字不大，句尾几乎不用标点。'}])},
 {id:'zhouye',label:'周野',x:49,y:30,w:20,h:38,mx:52,my:48,done:()=>inspected('zhouye'),onClick:()=>say([{s:'周野',t:'战略统筹正在休息。'},{s:'唐梨',t:'你只是没事干。'}])}
 ])}
function setupCafeteria(){setCheckpoint('cafeteria');renderScene('cafeteria');ambient('cafeteria');say([{s:'沈知夏',t:'我忘带饭卡了。'},{s:'林屿',t:'你怎么比周野还不靠谱。'},{s:'周野',t:'为什么突然攻击我？'}]).then(()=>{const hotspots=[{id:'buyFood',label:hasFlag('boughtFoodForZhixia')?'饭卡机':'窗口与饭卡机',x:4,y:13,w:47,h:33,mx:34,my:63,done:()=>hasFlag('boughtFoodForZhixia'),onClick:async()=>{if(hasFlag('boughtFoodForZhixia')){await say([{t:'饭卡机的绿灯已经亮过一次。两份鸡米花，一份在她面前。'}]);return}setFlag('boughtFoodForZhixia');playSfx('tray');await say([{t:'滴。饭卡机亮起绿灯。'},{s:'林屿',t:'两份。'},{s:'沈知夏',t:'我之后还你。'},{s:'周野',t:'请问第三份属于团队经费吗？'},{s:'唐梨',t:'不属于。'}])}},{label:'鸡米花餐盘',x:66,y:50,w:28,h:30,onClick:puzzle3},{id:'bag',label:'沈知夏的书包',x:50,y:58,w:13,h:25,done:()=>inspected('bag'),onClick:async()=>{setFlag('sawZhixiaCard');await say([{t:state.flags.replay?'她那天其实带了。':'侧袋里有一张饭卡。'}])}},{id:'canteenNoise',label:'远处餐盘声',x:7,y:66,w:22,h:18,done:()=>inspected('canteenNoise'),onClick:async()=>{playSfx('tray');await say([{t:'不锈钢餐盘碰到桌沿。食堂里到处都是说话声。'},{s:'周野',t:'这种环境非常适合掩护犯罪。'},{s:'唐梨',t:'你先把嘴里的咽下去。'}])}}];setHotspots(hotspots)})}
async function setupCafeteriaAfter(){setCheckpoint('cafeteriaAfter');renderScene('cafeteria');ambient('cafeteria');setHotspots([{id:'bag',label:'沈知夏的书包',x:50,y:58,w:13,h:25,done:()=>inspected('bag'),onClick:async()=>{setFlag('sawZhixiaCard');await say([{t:state.flags.replay?'她那天其实带了。':'侧袋里有一张饭卡。'}])}}]);setAction('去操场',async()=>{await playCinematicShot('cafeteria',2400);await sunsetSequence()})}
async function sunsetSequence(){setCheckpoint('sunset');renderScene('sunset',{memory:true,cinematic:true});ambient('outdoor');await say([{s:'周野',t:'我以后发达了，一人请你们一百份鸡米花。'},{s:'林屿',t:'你先还我今天八块。'},{s:'唐梨',t:'你企业还没成立已经负债了。'},{s:'周野',t:'这是融资。'},{s:'沈知夏',t:'五十岁还算吗？'},{s:'周野',t:'算。'},{s:'沈知夏',t:'那五十岁也可以吃。'}]);startChapter2()}
async function startChapter2(){await playCinematicShot('walk',2600);state.chapter=2;setCheckpoint('chapter2');renderScene('night',{memory:true});ambient('night');await say([{t:'第二章 · 栀子花｜靠窗第三排'},{t:'晚自习的灯白得有点刺眼。窗外什么都看不清，我还是会往那边看。'}]);setHotspots([{id:'windowReflection',label:'窗户倒影',x:59,y:8,w:34,h:48,done:()=>inspected('windowReflection'),onClick:async()=>{await playCinematicShot('window',2800);await say([{t:'她抬头的时候，我刚好也在看窗户。'},{t:'应该只是刚好。'},{t:'……我先低头好了。'}])}},{id:'tubeHum',label:'白色灯管',x:32,y:2,w:27,h:13,done:()=>inspected('tubeHum'),onClick:async()=>{await say([{t:'灯管亮得有点过分。'},{t:'有人翻过一页试卷。怎么还不下课。'}])}},{label:'校刊室里的作文',x:6,y:50,w:35,h:34,onClick:puzzle4}])}
function setupSeatPuzzleScene(){setCheckpoint('seat');renderScene('night');ambient('night');setAction('打开旧座位表',puzzle5)}
function libraryPuzzle(){
 if(!inspected('shelf')){toast('先看看书架侧面的分类牌。');return}
 const books=[['QK 47.2','校园树木'],['QK 495.4 / Z17','开花植物图鉴'],['QK 91.3','苔藓与地衣'],['QL 11.8','昆虫观察'],['R 282','常见药用植物'],['QK 73.1','种子图谱']];
 openObject(`<div class="physical"><h2>图书馆 · 空间检索</h2><div class="library-slip"><strong>借阅记录</strong><br>书架字母：QK<br>分类号：495.4<br>著者号：Z17</div><p>先看借阅记录，再在对应书架里找对书脊。不是所有“植物”标题都属于同一分类。</p><div class="shelf-puzzle">${books.map((b,i)=>`<button class="book-spine ${i%2?'tall':''}" data-code="${b[0]}"><span>${b[0]}</span><small>${b[1]}</small></button>`).join('')}</div><div id="libraryStatus" class="status-line"></div></div>`,()=>{$$('.book-spine').forEach(b=>b.onclick=async()=>{if(b.dataset.code!=='QK 495.4 / Z17'){$('#libraryStatus').textContent='书架字母或分类号对不上。';return}addItem('桔梗记录');save();closeObject();await say([{t:'桔梗。'},{t:'书页旁是一幅完整的植物写生。下面只有很轻的铅笔字：'},{t:'“最后一种？”'}]);await say([{s:'林屿',t:'有笔吗？'},{t:'沈知夏把笔递过来。'},{s:'沈知夏',t:'你右手是什么？'},{t:'我低头。自己正拿着一支笔。'},{s:'周野',t:'……'},{t:'他在远处先笑出声。沈知夏也笑了。'}]);startChapter3()})})
}
function setupLibrary(){setCheckpoint('library');renderScene('library');ambient('library');setHotspots([{label:'植物类书架',x:48,y:8,w:48,h:79,onClick:libraryPuzzle},{id:'shelf',label:'书架分类牌',x:4,y:8,w:40,h:78,done:()=>inspected('shelf'),onClick:()=>say([{t:'QK：植物学。QL：动物学。R：医药卫生。'},{t:'沈知夏那本书的借阅记录末尾写着：495.4 / Z17。'}])}])}
async function startChapter3(){await playCinematicShot('festival',2500);state.chapter=3;setCheckpoint('chapter3');renderScene('festival',{memory:true});ambient('festival');await say([{t:'第三章 · 栀子花｜“没什么”到底算什么'},{s:'沈知夏',t:'挺好的。'},{s:'林屿',t:'什么？'},{s:'沈知夏',t:'没什么。'}]);setHotspots([{id:'festivalDrink',label:'饮料桌',x:12,y:55,w:24,h:22,done:()=>inspected('festivalDrink'),onClick:()=>say([{t:'塑料杯外壁全是水珠。有人把“少冰”写成了“少点冰”，又划掉重写。'},{s:'唐梨',t:'你写字为什么每次都要改。'},{s:'林屿',t:'看不顺眼。'}])},{id:'festivalPhoto',label:'唐梨的相机',x:51,y:52,w:18,h:27,done:()=>inspected('festivalPhoto'),onClick:async()=>{playSfx('shutter');await say([{s:'唐梨',t:'别动。'},{t:'快门响了一声。她的字贴在相机背面的标签上，小而规整。'}])}},{id:'festivalZhou',label:'周野的节目单',x:69,y:48,w:20,h:28,done:()=>inspected('festivalZhou'),onClick:()=>say([{t:'节目单边上写满感叹号：\n“压轴！！！别忘了！！！五点半！！！”'},{s:'周野',t:'重点就应该醒目。'}])}]);setAction('去广播站',()=>{setCheckpoint('radio');renderScene('radio');ambient('room');setAction('操作磁带机',puzzle6);puzzle6()})}
async function startChapter4(){state.chapter=4;setCheckpoint('chapter4');renderScene('high3',{memory:true});ambient('room');await playCinematicShot('countdown',2500);await say([{t:'第四章 · 蓝花楹｜48天听起来还挺久'},{t:'黑板上写着：距毕业 48 天。'}]);setHotspots([{label:'四张无署名留言',x:25,y:54,w:37,h:28,mx:52,my:48,onClick:puzzle7},{id:'handwriting',label:'四个人的旧作业',x:6,y:49,w:18,h:31,mx:48,my:52,done:()=>inspected('handwriting'),onClick:()=>say([{t:'林屿的作文有很多划掉重写的地方。'},{t:'沈知夏的记录很少在句尾加标点。'},{t:'周野的草稿边上总有醒目的感叹号。'},{t:'唐梨的字最小，也最规整。'}])},{id:'addressdoc',label:'住址资料',x:65,y:42,w:28,h:22,done:()=>inspected('addressdoc'),onClick:()=>say([{t:'沈知夏父亲的新工作地点、家庭住址变更、搬家日期。'},{t:'不是转学。她会正常毕业，只是毕业后全家搬走。'}])}])}
async function conflictSequence(){setCheckpoint('conflict');renderScene('high3');ambient('room');await say([{s:'周野',t:'你毕业以后要走？'},{s:'沈知夏',t:'我本来准备毕业前说。'},{s:'周野',t:'毕业前是哪一天？最后一天？'},{s:'唐梨',t:'这是她自己的事情。'},{s:'周野',t:'我知道。\n但我们不是别人。'},{s:'周野',t:'你一直帮她瞒？'},{s:'唐梨',t:'她让我不要说。那我还能怎么办？'},{s:'周野',t:'不知道。\n但我就是觉得不对。'}]);await sleep(350);renderScene('peacecg',{memory:true,cinematic:true});await say([{t:'第二天。四个人谁也没有先说话。'},{s:'周野',t:'和平谈判物资。'}]);await sleep(650);await say([{t:'他放下四盒鸡米花。十秒里没有人笑。'},{t:'沈知夏拿了一块。林屿拿了一块。唐梨拿了一块。'},{s:'周野',t:'……所以谈判成功？'},{s:'唐梨',t:'闭嘴。'}]);startChapter5()}
async function startChapter5(){state.chapter=5;setCheckpoint('chapter5');renderScene('notebook',{memory:true});ambient('room');addItem('车票');await say([{t:'第五章 · 勿忘我｜毕业之前'},{t:'植物册里夹着一张搬家清单。'},{s:'林屿',t:'你是不是毕业以后要走？'},{s:'沈知夏',t:'嗯。'},{s:'林屿',t:'什么时候知道的？'},{s:'沈知夏',t:'挺早。'},{s:'林屿',t:'唐梨知道？'},{s:'沈知夏',t:'嗯。'},{s:'林屿',t:'周野呢？'},{s:'沈知夏',t:'后来知道的。'},{s:'林屿',t:'就我不知道。'},{s:'沈知夏',t:'我本来准备……'},{s:'林屿',t:'什么时候？'},{s:'沈知夏',t:'毕业前。'},{s:'林屿',t:'还有几天算毕业前？'},{s:'沈知夏',t:'林屿。'},{s:'沈知夏',t:'本来也没什么一定要告诉你的。'},{s:'林屿',t:'也是。'}]);setHotspots([{id:'flowerOrder',label:'夹在册后的花店订单',x:23,y:18,w:25,h:55,mx:50,my:54,done:()=>hasFlag('flowerOrder'),onClick:async()=>{setFlag('flowerOrder');addItem('花店订单');await say([{t:'一张毕业日取花单。品名：桔梗。取花人写的是沈知夏。'}])}},{id:'blankBell',label:'桔梗页的空白',x:53,y:17,w:26,h:57,mx:58,my:58,done:()=>inspected('blankBell'),onClick:async()=>{await say([{t:'“桔梗”下面原本应该有一行观察记录。'},{t:'这一页只有压痕，没有写完。'}])}}]);setAction('检查植物册页码',()=>{if(!hasFlag('flowerOrder')){toast('册子后面似乎还夹着一张纸。');return}puzzle8()})}
async function returnToPresent(){setCheckpoint('returnPresent');renderScene('prologue');ambient('room');await playCinematicShot('empty',2800);await say([{t:'刚才那些声音，一下子都没有了。'},{t:'我下意识看了一眼靠窗第三排。'},{t:'空的。刚才那些人，一个也不在。'},{t:'植物册最后一页，还是没写完。'},{t:'桔梗还夹在里面。颜色淡得快认不出来了。'}]);state.chapter=6;setCheckpoint('blackboard');renderScene('blackboard');setAction('开始毕业日重构',puzzle9)}
async function graduationReplay(){setCheckpoint('graduationReplay');renderScene('gradcg',{memory:true,cinematic:true});ambient('outdoor');await say([{t:'毕业日。植物角。'},{t:'沈知夏把桔梗藏在身后。林屿口袋里，是那篇作文。'},{s:'沈知夏',t:'林屿。'},{s:'林屿',t:'嗯。'},{s:'沈知夏',t:'我有件事想跟你说。'},{s:'林屿',t:'你今晚就走？'},{s:'沈知夏',t:'嗯。'},{s:'林屿',t:'几点？'},{s:'沈知夏',t:'六点多。'},{s:'林屿',t:'那我……'}]);await playCinematicShot('bellflower',3200);await say([{s:'林屿',t:'一路顺风。'},{s:'沈知夏',t:'嗯。'}]);renderScene('presscg',{memory:true,cinematic:true});await say([{t:'她一个人回教室。'},{t:'拿出一朵桔梗，压进植物册。'},{t:'笔尖停在“桔梗”两个字下面。'},{t:'最后，她把笔放下，合上了册子。'}]);setCheckpoint('chase');startChase()}
function startChase(){setCheckpoint('chase');renderScene('gate',{memory:true,cinematic:true});ambient('outdoor');openObject(`<div class="physical"><h2>校门追逐</h2><p class="chase-instruction">向前。键盘按 W / D / →，手机按住画面右半侧。</p><div class="chase" id="chase"><div class="chase-track" id="track"></div><div class="runner-card" id="runnerCard"></div><div class="chase-foreground"></div><div class="chase-progress"><i id="chaseBar"></i></div></div><div id="chaseText" class="status-line">她的车就在前面。</div></div>`,()=>{let p=0,frozen=false,hold=false,raf=0,lastFoot=0;const chase=$('#chase');const advance=async amount=>{if(frozen)return;p=Math.min(100,p+amount);$('#runnerCard').style.left=(13+p*.64)+'%';$('#chaseBar').style.width=p+'%';$('#track').style.transform=`scale(1.08) translateX(${-p*.11}%)`;const now=performance.now();if(now-lastFoot>270){playSfx('step');lastFoot=now}if(p>=88){frozen=true;hold=false;cancelAnimationFrame(raf);$('#chase').classList.add('freeze');$('#chaseText').textContent='这段不是我的记忆。';await sleep(650);await say([{s:'成年林屿',t:'这段不是我的记忆。'},{s:'成年林屿',t:'因为那一天……'},{s:'成年林屿',t:'我没有追。'}]);state.endingFlags.chaseDone=true;setCheckpoint('adult');closeObject(true);adultEnding()}};const key=e=>{if(['ArrowRight','KeyD','KeyW'].includes(e.code)){e.preventDefault();advance(2.5)}};addEventListener('keydown',key);const loop=()=>{if(!hold||frozen)return;advance(.9);raf=requestAnimationFrame(loop)};chase.onpointerdown=e=>{const r=chase.getBoundingClientRect();if(e.clientX>r.left+r.width/2){hold=true;chase.setPointerCapture?.(e.pointerId);loop()}};chase.onpointerup=chase.onpointercancel=chase.onpointerleave=()=>{hold=false;cancelAnimationFrame(raf)};return()=>{removeEventListener('keydown',key);hold=false;cancelAnimationFrame(raf)}},false)}
async function adultEnding(){setCheckpoint('adult');renderScene('road');ambient('road');await say([{t:'走出校门以后，我站了好一会儿，才把手机拿出来。'}]);openObject(`<div class="phone"><div class="phone-screen"><div class="phone-head"><strong>沈知夏</strong><br><small>高中群成员</small></div><div class="msg">植物册找到了。</div><div class="msg">桔梗那页也找到了。</div><div class="typing" id="typing">当年我……</div><button class="send-btn" id="rewrite">删掉，重新写</button><button class="send-btn" id="sendFinal" hidden>发送</button><div id="delivered"></div></div></div>`,()=>{$('#rewrite').onclick=async()=>{$('#typing').textContent='当年我也喜欢你。\n\n不用回答。\n只是这次想把当年没说完的话说完。';$('#rewrite').hidden=true;$('#sendFinal').hidden=false};$('#sendFinal').onclick=async()=>{$('#delivered').innerHTML='<p style="text-align:right;color:#6d746b">已送达</p>';state.endingFlags.sent=true;setCheckpoint('finalRoad');playSfx('click');await sleep(800);closeObject(true);await finalRoad()}},false)}
async function finalRoad(){setCheckpoint('finalRoad');renderScene('road');ambient('road');await say([{t:'“两份？”'},{t:'“成交。”'},{t:'“你去的话，我也去。”'},{t:'“老班来了！”'},{t:'“合理实验损耗。”'},{t:'“五十岁也可以吃。”'}]);playSfx('phone');openObject(`<div class="physical"><h2>锁屏通知</h2><div class="notification"><strong>沈知夏</strong><br>周野是不是还欠我们……</div><p style="margin-top:22px">通知到这里截断。</p><button class="puzzle-btn" id="walkOn">继续往前走</button></div>`,()=>{$('#walkOn').onclick=()=>{state.endingFlags.notificationSeen=true;setCheckpoint('ending');closeObject(true);ending()}},false)}
async function ending(){setCheckpoint('ending');renderScene('road',{cinematic:true});scoreKey=null;playScoreForScene('road');stopAmbient();playSfx('bell');await playMemoryMontage();await playCinematicShot('empty',3200);const endLines=state.flags.replay?[{t:'明明已经知道后面会发生什么。'},{t:'走到这里的时候，我还是想让那一秒慢一点。'},{t:'很多话都可以明天再说。可明天也会用完。'}]:[{t:'那时候觉得三年挺长的。'},{t:'很多话都可以明天再说。'},{t:'后来才知道，明天也会用完。'}];await say(endLines);openObject(`<div class="ending-card"><p class="big">那时候我们天天见面。</p><p>所以谁也没有认真学过怎么说再见。</p><p>后来我们有了很多新的春天。</p><p class="big">只是再也没有哪一个春天，<br>教室里坐着当年的那些人。</p><h2>花语</h2><button class="paper-btn" id="endBack">回到封面</button></div>`,()=>{$('#endBack').onclick=()=>{state.completed=true;state.checkpoint='complete';try{localStorage.setItem(META,'1')}catch{}save();closeObject(true);el.game.hidden=true;el.title.classList.add('active')}},false)}

function resume(){el.title.classList.remove('active');el.game.hidden=false;ensureAudio();const cp=state.checkpoint||legacyCheckpoint();state.checkpoint=cp;save();const routes={prologue:()=>setupPrologue(),transitionPast:()=>transitionToPast(),ch1class:()=>setupCh1Class(),cafeteria:()=>setupCafeteria(),cafeteriaAfter:()=>setupCafeteriaAfter(),sunset:()=>sunsetSequence(),chapter2:()=>startChapter2(),seat:()=>setupSeatPuzzleScene(),library:()=>setupLibrary(),chapter3:()=>startChapter3(),radio:()=>{renderScene('radio');ambient('room');setAction('操作磁带机',puzzle6);puzzle6()},tapeReveal:()=>tapeRevealSequence(),postTape:()=>postTapeSequence(),chapter4:()=>startChapter4(),addressReveal:()=>addressRevealSequence(),conflict:()=>conflictSequence(),chapter5:()=>startChapter5(),page33Reveal:()=>page33RevealSequence(),returnPresent:()=>returnToPresent(),blackboard:()=>{state.chapter=6;renderScene('blackboard');setAction('开始毕业日重构',puzzle9)},graduationReplay:()=>graduationReplay(),chase:()=>startChase(),adult:()=>adultEnding(),finalRoad:()=>finalRoad(),ending:()=>ending(),complete:()=>ending()};(routes[cp]||routes[legacyCheckpoint()]||routes.prologue)()}
$('#startBtn').onclick=()=>{ensureAudio();let replay=false;try{replay=localStorage.getItem(META)==='1'}catch{}state=clone(defaultState);state.started=true;state.flags.replay=replay;state.checkpoint='prologue';save();beginPrologue()};$('#continueBtn').onclick=()=>{ensureAudio();resume()};updateContinue();

// Keyboard handling: Escape closes only closable surfaces; Tab stays inside the active modal.
addEventListener('keydown',e=>{
 const active=!el.settings.hidden?el.settings:!el.side.hidden?el.side:!el.object.hidden?el.object:!el.focus.hidden?el.focus:null;
 if(!active&&!el.dialogue.hidden&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showNextLine();return}
 if(e.key==='Escape'){if(active===el.settings)el.settings.hidden=true;else if(active===el.side)el.side.hidden=true;else if(active===el.object)closeObject();else if(active===el.focus)focusDismiss?.();return}
 if(e.key==='Tab'&&active){const fs=[...active.querySelectorAll('button:not([hidden]):not([disabled]),input:not([hidden]):not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(fs.length){const first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
});
})();

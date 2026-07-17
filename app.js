/* 1001 只飞鸟 · 1001 Birds — app */
(function(){
'use strict';
const DATA = (window.BIRD_DATA || []).slice();
// 图片基址：jsDelivr CDN（图床仓库 xujiann/1001birds-img@v2）。本地预览可临时置空。
const IMG_BASE = 'https://cdn.jsdelivr.net/gh/xujiann/1001birds-img@v3/';
const imgURL = p => IMG_BASE + p;
const commonsURL = f => f && /^https?:/.test(f) ? f : 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f||'');

const IUCN_ORDER = {EX:0,EW:1,CR:2,EN:3,VU:4,NT:5,LC:6,DD:7};
const PAGE = 60;

// ---- i18n ----
const L = {
  zh:{sub:' 只飞鸟', species:'种', orders:'目', families:'科', search:'搜索鸟名、学名、目/科…',
    allGroup:'全部类群', allRealm:'全部地理界', allIucn:'全部保护等级',
    taxo:'分类树', famidx:'科索引', threat:'⚠ 受胁', fav:'♥ 收藏', daily:'每日一鸟', random:'随机一鸟',
    order:'目', family:'科', realm:'类群', iucn:'保护等级', famLink:'查看该科全部鸟类 →',
    prev:'← 上一种', next:'下一种 →', nores:'未找到符合条件的鸟类', reset:'重置筛选',
    footer:'精选世界1001种飞鸟 · 数据来自 Wikidata / Wikimedia Commons / Wikipedia',
    original:'原图', credit:'图片', source:'来源', of:' / 共 ', rec:'录音',
    songPlay:'▶ 鸣声', songPause:'⏸ 暂停', songLoad:'⋯ 加载中', songErr:'✕ 无法播放',
    aboutIntro:'「1001 只飞鸟」精选世界各地具代表性的鸟类，按严谨的目/科分类编排，兼顾图鉴的信息与画廊的美感。现已收录 1001 种，覆盖 40+ 目、150+ 科。',
    aboutSources:'分类与元数据来自 Wikidata，图片来自 Wikimedia Commons，简介来自 Wikipedia。每张图片均保留原作者署名与许可。'},
  en:{sub:' Birds', species:'species', orders:'orders', families:'families', search:'Search name, sci. name, order/family…',
    allGroup:'All groups', allRealm:'All realms', allIucn:'All statuses',
    taxo:'Taxonomy', famidx:'Families', threat:'⚠ At risk', fav:'♥ Saved', daily:'Bird of the day', random:'Random bird',
    order:'Order', family:'Family', realm:'Group', iucn:'Conservation', famLink:'See all birds in this family →',
    prev:'← Prev', next:'Next →', nores:'No birds match your filters', reset:'Reset',
    footer:'A curated gallery of the world\'s birds · Data from Wikidata / Wikimedia Commons / Wikipedia',
    original:'Original', credit:'Image', source:'Source', of:' / of ', rec:'Recording',
    songPlay:'▶ Call', songPause:'⏸ Pause', songLoad:'⋯ Loading', songErr:'✕ Cannot play',
    aboutIntro:'“1001 Birds” is a curated, bilingual field-guide gallery of representative birds worldwide, organised by strict order/family taxonomy. It now holds 1001 species across 40+ orders and 150+ families.',
    aboutSources:'Taxonomy and metadata from Wikidata, images from Wikimedia Commons, summaries from Wikipedia. Each image keeps its author attribution and licence.'},
};
let lang = localStorage.getItem('birds_lang') || 'zh';
const IUCN_LABEL = {zh:{LC:'无危',NT:'近危',VU:'易危',EN:'濒危',CR:'极危',EW:'野外灭绝',EX:'灭绝',DD:'数据缺乏'},
  en:{LC:'Least Concern',NT:'Near Threatened',VU:'Vulnerable',EN:'Endangered',CR:'Critically Endangered',EW:'Extinct in Wild',EX:'Extinct',DD:'Data Deficient'}};

// ---- state ----
let favs = new Set(JSON.parse(localStorage.getItem('birds_favs')||'[]'));
const saveFavs = () => localStorage.setItem('birds_favs', JSON.stringify([...favs]));
let state = { q:'', group:'', realm:'', iucn:'', fam:'', sort:'default', favOnly:false, threatened:false, page:0, taxoOpen:false, list:'' };
const THREAT = new Set(['VU','EN','CR','EW','EX']);
let filtered = DATA.slice();
let modalIdx = -1;
let dailyId = -1;
let famIndexOpen = false;

const $ = s => document.querySelector(s);
const el = (tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 每图署名（CC 图片要求署名作者+许可）：credits.js 懒加载后填充
function creditHTML(b){
  const c = (window.BIRD_CREDITS||{})[b.id] || null;
  const parts = [];
  if(c && c.a) parts.push(esc(c.a));
  if(c && c.l) parts.push(c.u ? `<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.l)}</a>` : esc(c.l));
  if(b.file) parts.push(`<a href="${commonsURL(b.file)}" target="_blank" rel="noopener">Wikimedia Commons</a>`);
  return parts.length ? `<span class="mc-label">${L[lang].credit}${lang==='zh'?'：':': '}</span>${parts.join(' · ')}` : '';
}
const nm = b => lang==='zh' ? (b.zh||b.en) : (b.en||b.zh);
const orderName = b => lang==='zh' ? b.order_zh : b.order_en;
const familyName = b => lang==='zh' ? b.family_zh : b.family_en;

// ---- filtering ----
function apply(){
  const q = state.q.trim().toLowerCase();
  filtered = DATA.filter(b=>{
    if(state.favOnly && !favs.has(b.id)) return false;
    if(state.threatened && !THREAT.has(b.iucn)) return false;
    if(state.group && b.group!==state.group) return false;
    if(state.iucn && b.iucn!==state.iucn) return false;
    if(state.fam && b.family_en!==state.fam) return false;
    if(q){
      const hay = [b.zh,b.en,b.sci,b.order_zh,b.order_en,b.family_zh,b.family_en,b.py,b.group,b.realm].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  if(state.sort==='name') filtered.sort((a,b)=>a.zh.localeCompare(b.zh,'zh'));
  else if(state.sort==='iucn') filtered.sort((a,b)=>(IUCN_ORDER[a.iucn]??9)-(IUCN_ORDER[b.iucn]??9)||a.id-b.id);
  else filtered.sort((a,b)=>a.id-b.id);
  state.page=0;
  render();
}

// ---- render gallery ----
function render(){
  const g = $('#gallery');
  const start = state.page*PAGE, pageItems = filtered.slice(start, start+PAGE);
  g.innerHTML='';
  $('#no-results').style.display = filtered.length? 'none':'block';
  for(const b of pageItems) g.appendChild(card(b));
  renderPagination();
  $('#shown-count').textContent = filtered.length;
  lazyload();
}
function card(b){
  const c = el('div','art-card');
  c.style.setProperty('--ar', b.ar||1.3);
  c.dataset.id = b.id;
  const wrap = el('div','card-img-wrap loading');
  const img = el('img'); img.alt = nm(b); img.dataset.src = imgURL(b.thumb); img.loading='lazy';
  wrap.appendChild(img);
  wrap.appendChild(el('span','card-num','#'+b.id));
  if(b.iucn) wrap.appendChild(el('span','iucn-badge iucn-'+b.iucn, b.iucn));
  const favBtn = el('button','card-fav'+(favs.has(b.id)?' on':''), favs.has(b.id)?'♥':'♡');
  favBtn.onclick = e=>{e.stopPropagation();toggleFav(b.id,favBtn);};
  wrap.appendChild(favBtn);
  const body = el('div','card-body');
  body.appendChild(el('div','card-order', orderName(b)+' · '+familyName(b)));
  body.appendChild(el('div','card-title', nm(b)));
  body.appendChild(el('div','card-sci', b.sci));
  if(lang==='zh') body.appendChild(el('div','card-en', b.en));
  c.appendChild(wrap); c.appendChild(body);
  c.onclick = ()=>openModal(b.id);
  return c;
}
function lazyload(){
  document.querySelectorAll('.card-img-wrap img[data-src]').forEach(img=>{
    io.observe(img);
  });
}
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    if(!en.isIntersecting) return;
    const img = en.target; io.unobserve(img);
    img.src = img.dataset.src; img.removeAttribute('data-src');
    img.onload = ()=>{img.classList.add('loaded');img.closest('.card-img-wrap').classList.replace('loading','loaded');};
    img.onerror = ()=>{img.closest('.card-img-wrap').classList.remove('loading');};
  });
},{rootMargin:'400px'});

function renderPagination(){
  const p = $('#pagination'); p.innerHTML='';
  const pages = Math.ceil(filtered.length/PAGE);
  if(pages<=1) return;
  const mk=(label,pg,dis,act)=>{const b=el('button','page-btn'+(act?' active':''),label);if(dis)b.disabled=true;else b.onclick=()=>{state.page=pg;render();scrollTop();};return b;};
  p.appendChild(mk('‹', state.page-1, state.page===0));
  for(let i=0;i<pages;i++){ if(i===0||i===pages-1||Math.abs(i-state.page)<=2){p.appendChild(mk(i+1,i,false,i===state.page));}else if(Math.abs(i-state.page)===3){p.appendChild(el('span','page-btn',' … '));}}
  p.appendChild(mk('›', state.page+1, state.page>=pages-1));
}

// ---- favorites ----
function toggleFav(id,btn){
  if(favs.has(id)){favs.delete(id);btn&&(btn.textContent='♡',btn.classList.remove('on'));}
  else {favs.add(id);btn&&(btn.textContent='♥',btn.classList.add('on'));}
  saveFavs();
  if(state.favOnly) apply();
}

// ---- bird call playback (streamed from Commons, no download) ----
let songAudio = null, songPlaying = false;
function stopSong(){ if(songAudio){ songAudio.pause(); } songPlaying=false; const b=$('#modal-song'); if(b){ b.textContent=L[lang].songPlay; b.classList.remove('playing'); } }
function setupSong(b){
  const wrap=$('#modal-song-wrap'), btn=$('#modal-song'); if(!wrap) return;
  const s = (window.BIRD_SONGS||{})[b.id];
  stopSong();
  if(!s){ wrap.style.display='none'; return; }
  wrap.style.display='flex';
  $('#song-credit').textContent = s.a ? `${L[lang].rec}：${s.a}${s.l?' · '+s.l:''}` : '';
  btn.onclick=()=>{
    if(!songAudio){ songAudio=new Audio(); songAudio.onended=stopSong; }
    if(songPlaying){ stopSong(); return; }
    songAudio.src = commonsURL(s.f); btn.textContent=L[lang].songLoad;
    songAudio.play().then(()=>{ songPlaying=true; btn.textContent=L[lang].songPause; btn.classList.add('playing'); })
      .catch(()=>{ btn.textContent=L[lang].songErr; setTimeout(()=>{btn.textContent=L[lang].songPlay;},1800); });
  };
}

// ---- modal ----
function openModal(id){
  const idx = filtered.findIndex(b=>b.id===id);
  modalIdx = idx>=0?idx:DATA.findIndex(b=>b.id===id);
  fillModal();
  $('#modal').classList.add('open');
  history.replaceState(null,'','?id='+id);
}
function currentModalBird(){ return (modalIdx>=0 && filtered[modalIdx]) || DATA.find(b=>b.id===+new URLSearchParams(location.search).get('id')); }
function fillModal(){
  const b = filtered[modalIdx]; if(!b) return;
  const mi = $('#modal-img'); mi.classList.remove('ready'); mi.alt = nm(b);
  mi.onload = ()=>mi.classList.add('ready');
  mi.src = imgURL(b.img);
  if(mi.complete) mi.classList.add('ready');
  const daily = $('#modal-daily'); if(daily) daily.remove();
  if(b.id===dailyId){ const d=el('span','modal-daily-badge','🗓 '+(lang==='zh'?'今日一鸟':'Bird of the day')); d.id='modal-daily'; $('#modal-badges').appendChild(d); }
  $('#modal-order').textContent = orderName(b);
  const ib = $('#modal-iucn'); if(b.iucn){ ib.style.display=''; ib.textContent = b.iucn+' · '+(IUCN_LABEL[lang][b.iucn]||''); ib.className='modal-iucn-badge iucn-'+b.iucn; } else { ib.style.display='none'; }
  $('#modal-title').textContent = nm(b);
  $('#modal-sci').textContent = b.sci;
  $('#modal-en').textContent = lang==='zh'? b.en : '';
  $('#modal-order-full').textContent = b.order_zh+' '+b.order_en;
  $('#modal-family').textContent = b.family_zh+' '+b.family_en;
  $('#modal-realm').textContent = [b.group, b.realm].filter(Boolean).join(' · ') || '—';
  $('#modal-iucn-full').textContent = b.iucn ? b.iucn+' '+(IUCN_LABEL[lang][b.iucn]||'') : '—';
  const dd = (window.BIRD_DESCS && window.BIRD_DESCS[b.id]) || ['',''];
  $('#modal-desc').textContent = (lang==='zh'? (dd[0]||dd[1]) : (dd[1]||dd[0])) || (window.BIRD_DESCS ? '' : '…');
  const fav = $('#modal-fav'); fav.className='modal-fav'+(favs.has(b.id)?' on':''); fav.textContent = favs.has(b.id)?'♥ 已收藏':'♡ 收藏';
  $('#modal-credit').innerHTML = creditHTML(b);
  setupSong(b);
  $('#modal-num').textContent = (modalIdx+1)+L[lang].of+filtered.length;
  $('#modal-taxo-link').textContent = L[lang].famLink;
}
function navModal(d){ if(!filtered.length)return; modalIdx=(modalIdx+d+filtered.length)%filtered.length; fillModal(); history.replaceState(null,'','?id='+filtered[modalIdx].id); }
function closeModal(){ stopSong(); $('#modal').classList.remove('open'); history.replaceState(null,'',location.pathname); }

// ---- lightbox ----
let lb={scale:1,x:0,y:0,drag:false,sx:0,sy:0};
function openLightbox(b){
  const img=$('#lb-img'); $('#lb-spinner').classList.add('show');
  img.src=''; img.src=commonsURL(b.file)||imgURL(b.img);
  img.onload=()=>$('#lb-spinner').classList.remove('show');
  const lc = (window.BIRD_CREDITS||{})[b.id];
  $('#lb-caption').textContent = nm(b)+' · '+b.sci + (lc && lc.a ? ` · © ${lc.a}${lc.l?' / '+lc.l:''}` : '');
  $('#lb-original').href = commonsURL(b.file)||imgURL(b.img);
  lb={scale:1,x:0,y:0,drag:false}; applyLB();
  $('#lightbox').classList.add('open');
  const hint=$('#lb-hint'); hint.classList.remove('fade'); setTimeout(()=>hint.classList.add('fade'),2500);
}
function applyLB(){const img=$('#lb-img');img.style.transform=`translate(${lb.x}px,${lb.y}px) scale(${lb.scale})`;$('#lb-stage').classList.toggle('zoomed',lb.scale>1);}
function closeLightbox(){$('#lightbox').classList.remove('open');}

// ---- taxonomy nav ----
// ---- family visual index ----
function toggleFamIndex(show){
  famIndexOpen = show;
  $('#famindex-btn').classList.toggle('active', show);
  $('#fam-index').style.display = show ? 'grid' : 'none';
  $('#gallery').style.display = show ? 'none' : '';
  $('#pagination').style.display = show ? 'none' : '';
  if(show){ state.taxoOpen=false; $('#taxo-nav').style.display='none'; $('#taxo-btn').classList.remove('active'); buildFamIndex(); scrollTop(); }
}
function buildFamIndex(){
  const idx=$('#fam-index'); const fams={};
  DATA.forEach(b=>{ (fams[b.family_en]=fams[b.family_en]||{en:b.family_en,zh:b.family_zh,order_zh:b.order_zh,order_en:b.order_en,items:[]}).items.push(b); });
  const list=Object.values(fams).sort((a,b)=>DATA.findIndex(x=>x.family_en===a.en)-DATA.findIndex(x=>x.family_en===b.en));
  idx.innerHTML='';
  list.forEach(f=>{
    const cover=f.items[0];
    const card=el('div','fam-card');
    card.innerHTML=`<img class="fam-thumb" loading="lazy" src="${imgURL(cover.thumb)}" alt="${lang==='zh'?f.zh:f.en}">`+
      `<div class="fam-meta"><div class="fam-name">${lang==='zh'?f.zh:f.en}</div><div class="fam-latin">${f.en}</div>`+
      `<div class="fam-sub">${lang==='zh'?f.order_zh:f.order_en} · ${f.items.length}${lang==='zh'?' 种':''}</div></div>`;
    card.onclick=()=>{ state.fam=f.en; toggleFamIndex(false); state.taxoOpen=true; $('#taxo-nav').style.display='block'; apply(); buildTaxo(); updateCrumb(); scrollTop(); };
    idx.appendChild(card);
  });
}
function buildTaxo(){
  const nav=$('#taxo-nav'); nav.innerHTML='';
  const orders={};
  DATA.forEach(b=>{(orders[b.order_en]=orders[b.order_en]||{zh:b.order_zh,en:b.order_en,fams:{},n:0});orders[b.order_en].n++;
    const f=orders[b.order_en].fams; (f[b.family_en]=f[b.family_en]||{zh:b.family_zh,en:b.family_en,n:0}).n++;});
  Object.values(orders).sort((a,b)=>DATA.findIndex(x=>x.order_en===a.en)-DATA.findIndex(x=>x.order_en===b.en)).forEach(o=>{
    const box=el('div','taxo-order');
    const head=el('div','taxo-order-head');
    head.innerHTML=`<span class="caret">▶</span><span class="taxo-order-name">${lang==='zh'?o.zh:o.en} <small>${lang==='zh'?o.en:o.zh}</small></span><span class="taxo-order-cnt">${o.n}</span>`;
    head.onclick=()=>box.classList.toggle('open');
    const fams=el('div','taxo-fams');
    Object.values(o.fams).forEach(f=>{
      const chip=el('button','taxo-fam'+(state.fam===f.en?' active':''),`${lang==='zh'?f.zh:f.en}<small>${f.n}</small>`);
      chip.onclick=()=>{state.fam=(state.fam===f.en?'':f.en);apply();buildTaxo();updateCrumb();scrollTop();};
      fams.appendChild(chip);
    });
    box.appendChild(head);box.appendChild(fams);
    if(state.fam && Object.values(o.fams).some(f=>f.en===state.fam)) box.classList.add('open');
    nav.appendChild(box);
  });
}
function updateCrumb(){
  const bar=$('#crumb-bar');
  if(!state.fam){bar.style.display='none';return;}
  const b=DATA.find(x=>x.family_en===state.fam);
  bar.style.display='flex'; bar.innerHTML='';
  const home=el('button','crumb','← '+(lang==='zh'?'全部':'All')); home.onclick=()=>{state.fam='';apply();buildTaxo();updateCrumb();};
  bar.appendChild(home);
  bar.appendChild(el('span','cur',`${lang==='zh'?b.family_zh:b.family_en} <small>${lang==='zh'?b.order_zh:b.order_en}</small>`));
}

// ---- filters population ----
function fillSelects(){
  const groups=[...new Set(DATA.map(b=>b.group))].filter(Boolean);
  const iucns=['EX','EW','CR','EN','VU','NT','LC'].filter(k=>DATA.some(b=>b.iucn===k));
  $('#group-filter').innerHTML=`<option value="">${L[lang].allGroup}</option>`+groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  $('#iucn-filter').innerHTML=`<option value="">${L[lang].allIucn}</option>`+iucns.map(k=>`<option value="${k}">${k} ${IUCN_LABEL[lang][k]}</option>`).join('');
}

// ---- language ----
function applyLang(){
  document.documentElement.lang = lang==='zh'?'zh-CN':'en';
  $('#lang-toggle').textContent = lang==='zh'?'EN':'中';
  $('#t-sub').textContent=L[lang].sub; $('#t-species').textContent=L[lang].species;
  $('#t-orders').textContent=L[lang].orders; $('#t-families').textContent=L[lang].families;
  $('#search').placeholder=L[lang].search;
  $('#taxo-btn').textContent=L[lang].taxo; $('#famindex-btn').textContent=L[lang].famidx; $('#threat-btn').textContent=L[lang].threat; $('#fav-only-btn').innerHTML=L[lang].fav;
  $('#daily-btn').textContent=L[lang].daily; $('#random-btn').textContent=L[lang].random;
  $('#l-order').textContent=L[lang].order; $('#l-family').textContent=L[lang].family;
  $('#l-realm').textContent=L[lang].realm; $('#l-iucn').textContent=L[lang].iucn;
  $('#prev-item').textContent=L[lang].prev; $('#next-item').textContent=L[lang].next;
  $('#t-noresults').textContent=L[lang].nores; $('#reset-btn').textContent=L[lang].reset;
  $('#t-footer').textContent=L[lang].footer; $('#t-original').textContent=L[lang].original;
  $('#about-intro').textContent=L[lang].aboutIntro; $('#about-sources').textContent=L[lang].aboutSources;
  fillSelects(); buildTaxo(); updateCrumb(); if(famIndexOpen) buildFamIndex();
  $('#order-count').textContent=new Set(DATA.map(b=>b.order_en)).size;
  $('#family-count').textContent=new Set(DATA.map(b=>b.family_en)).size;
}

// ---- events ----
function scrollTop(){window.scrollTo({top:0,behavior:'smooth'});}
$('#lang-toggle').onclick=()=>{lang=lang==='zh'?'en':'zh';localStorage.setItem('birds_lang',lang);applyLang();apply();if($('#modal').classList.contains('open'))fillModal();};
$('#search').oninput=e=>{state.q=e.target.value;apply();};
$('#clear-search').onclick=()=>{state.q='';$('#search').value='';apply();};
$('#group-filter').onchange=e=>{state.group=e.target.value;apply();};
$('#threat-btn').onclick=()=>{state.threatened=!state.threatened;$('#threat-btn').classList.toggle('active',state.threatened);apply();};
$('#iucn-filter').onchange=e=>{state.iucn=e.target.value;apply();};
$('#sort-filter').onchange=e=>{state.sort=e.target.value;apply();};
$('#taxo-btn').onclick=()=>{if(famIndexOpen)toggleFamIndex(false);state.taxoOpen=!state.taxoOpen;$('#taxo-nav').style.display=state.taxoOpen?'block':'none';$('#taxo-btn').classList.toggle('active',state.taxoOpen);if(state.taxoOpen)buildTaxo();};
$('#famindex-btn').onclick=()=>toggleFamIndex(!famIndexOpen);
$('#fav-only-btn').onclick=()=>{state.favOnly=!state.favOnly;$('#fav-only-btn').classList.toggle('active',state.favOnly);apply();};
$('#random-btn').onclick=()=>{const b=DATA[Math.floor(Math.random()*DATA.length)];openModal(b.id);};
$('#daily-btn').onclick=()=>{const d=Math.floor(Date.now()/864e5)%DATA.length;dailyId=DATA[d].id;openModal(DATA[d].id);};
$('#view-toggle').onclick=()=>{$('#gallery').classList.toggle('list-view');$('#view-toggle').textContent=$('#gallery').classList.contains('list-view')?'☰':'⊞';};
$('#reset-btn').onclick=()=>{state={...state,q:'',group:'',iucn:'',fam:'',favOnly:false,threatened:false};$('#search').value='';$('#group-filter').value='';$('#iucn-filter').value='';$('#fav-only-btn').classList.remove('active');$('#threat-btn').classList.remove('active');apply();buildTaxo();updateCrumb();};
$('#modal-close').onclick=closeModal;
$('#modal').onclick=e=>{if(e.target===$('#modal'))closeModal();};
$('#prev-item').onclick=()=>navModal(-1);
$('#next-item').onclick=()=>navModal(1);
$('#modal-fav').onclick=()=>{const b=filtered[modalIdx];toggleFav(b.id);fillModal();document.querySelectorAll('.art-card[data-id="'+b.id+'"] .card-fav').forEach(x=>{x.textContent=favs.has(b.id)?'♥':'♡';x.classList.toggle('on',favs.has(b.id));});};
$('#modal-share').onclick=()=>{const b=filtered[modalIdx];navigator.clipboard.writeText(location.origin+location.pathname+'?id='+b.id).then(()=>{const s=$('#modal-share');s.classList.add('done');setTimeout(()=>s.classList.remove('done'),1200);});};
$('#modal-taxo-link').onclick=()=>{const b=filtered[modalIdx];closeModal();state.fam=b.family_en;state.taxoOpen=true;$('#taxo-nav').style.display='block';apply();buildTaxo();updateCrumb();scrollTop();};
$('#modal-img-wrap').onclick=e=>{if(e.target.id==='zoom-badge'||e.target.id==='modal-img'||e.target.id==='modal-img-wrap')openLightbox(filtered[modalIdx]);};
$('#lb-close').onclick=closeLightbox;
$('#lb-zoomin').onclick=()=>{lb.scale=Math.min(8,lb.scale*1.4);applyLB();};
$('#lb-zoomout').onclick=()=>{lb.scale=Math.max(1,lb.scale/1.4);if(lb.scale===1){lb.x=lb.y=0;}applyLB();};
$('#lb-reset').onclick=()=>{lb={scale:1,x:0,y:0};applyLB();};
const stage=$('#lb-stage');
stage.addEventListener('wheel',e=>{e.preventDefault();lb.scale=Math.min(8,Math.max(1,lb.scale*(e.deltaY<0?1.15:0.87)));if(lb.scale===1){lb.x=lb.y=0;}applyLB();},{passive:false});
stage.addEventListener('dblclick',()=>{lb.scale=lb.scale>1?1:2.5;if(lb.scale===1)lb.x=lb.y=0;applyLB();});
stage.addEventListener('mousedown',e=>{if(lb.scale<=1)return;lb.drag=true;lb.sx=e.clientX-lb.x;lb.sy=e.clientY-lb.y;stage.classList.add('grabbing');});
window.addEventListener('mousemove',e=>{if(!lb.drag)return;lb.x=e.clientX-lb.sx;lb.y=e.clientY-lb.sy;applyLB();});
window.addEventListener('mouseup',()=>{lb.drag=false;stage.classList.remove('grabbing');});
$('#help-btn').onclick=()=>$('#help-overlay').classList.add('open');
$('#help-close').onclick=()=>$('#help-overlay').classList.remove('open');
$('#help-overlay').onclick=e=>{if(e.target===$('#help-overlay'))$('#help-overlay').classList.remove('open');};
$('#about-btn').onclick=()=>{$('#about-stats').innerHTML=`<span><strong>${DATA.length}</strong>${L[lang].species}</span><span><strong>${new Set(DATA.map(b=>b.order_en)).size}</strong>${L[lang].orders}</span><span><strong>${new Set(DATA.map(b=>b.family_en)).size}</strong>${L[lang].families}</span>`;buildConserv();$('#about-overlay').classList.add('open');};

// 保护状况总览：IUCN 分布堆叠条 + 点击筛选
const IUCN_C = {LC:'#4caf50',NT:'#9cc021',VU:'#e6b428',EN:'#e8783c',CR:'#d83c3c',EW:'#7a3f8c',EX:'#2b2b2b',NA:'#5a6a63'};
function buildConserv(){
  const wrap=$('#conserv'); if(!wrap) return;
  const seq=['LC','NT','VU','EN','CR','EW','EX','NA'];
  const cnt={}; DATA.forEach(b=>{const k=b.iucn||'NA';cnt[k]=(cnt[k]||0)+1;});
  const rated=DATA.length-(cnt.NA||0);
  const threat=(cnt.VU||0)+(cnt.EN||0)+(cnt.CR||0);
  const gone=(cnt.EX||0)+(cnt.EW||0);
  const T={zh:{rated:'种已评估保护状况',threat:'受胁',gone:'已灭绝／野外灭绝',lbl:{LC:'无危',NT:'近危',VU:'易危',EN:'濒危',CR:'极危',EW:'野外灭绝',EX:'灭绝',NA:'未评估'}},
    en:{rated:' species assessed',threat:'threatened',gone:'extinct / EW',lbl:{LC:'Least Concern',NT:'Near Threatened',VU:'Vulnerable',EN:'Endangered',CR:'Critically Endangered',EW:'Extinct in Wild',EX:'Extinct',NA:'Not assessed'}}}[lang];
  const total=DATA.length;
  const bar=seq.filter(k=>cnt[k]).map(k=>{
    const w=(100*cnt[k]/total).toFixed(2);
    return `<div class="conserv-seg${k==='EX'?' ex':''}" style="flex:${cnt[k]} 0 auto;background:${IUCN_C[k]}" data-iucn="${k==='NA'?'':k}" title="${T.lbl[k]} ${k==='NA'?'':k} · ${cnt[k]} ${lang==='zh'?'种':''} · ${lang==='zh'?'点击筛选':'click to filter'}"></div>`;
  }).join('');
  const legend=seq.filter(k=>cnt[k]).map(k=>
    `<button class="conserv-chip" data-iucn="${k==='NA'?'':k}"><span class="conserv-sw" style="background:${IUCN_C[k]}"></span>${T.lbl[k]}<span class="n">${cnt[k]}</span></button>`).join('');
  wrap.innerHTML=`<div class="conserv-head">${rated} ${T.rated} · <b class="warn">${threat}</b> ${T.threat}${gone?` · <b class="crit">${gone}</b> ${T.gone}`:''}</div>
    <div class="conserv-bar">${bar}</div><div class="conserv-legend">${legend}</div>`;
  wrap.querySelectorAll('[data-iucn]').forEach(elm=>elm.onclick=()=>{
    const k=elm.getAttribute('data-iucn');
    state.iucn=k; $('#iucn-filter').value=k;
    $('#about-overlay').classList.remove('open'); apply(); scrollTop();
  });
}
$('#about-close').onclick=()=>$('#about-overlay').classList.remove('open');
$('#about-overlay').onclick=e=>{if(e.target===$('#about-overlay'))$('#about-overlay').classList.remove('open');};
window.addEventListener('scroll',()=>{$('#to-top').classList.toggle('show',window.scrollY>600);});
$('#to-top').onclick=scrollTop;
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(e.key==='Escape'){closeLightbox();closeModal();$('#help-overlay').classList.remove('open');$('#about-overlay').classList.remove('open');}
  else if($('#lightbox').classList.contains('open'))return;
  else if($('#modal').classList.contains('open')){if(e.key==='ArrowLeft')navModal(-1);if(e.key==='ArrowRight')navModal(1);}
  else if(e.key==='/'){e.preventDefault();$('#search').focus();}
  else if(e.key.toLowerCase()==='r'){$('#random-btn').click();}
  else if(e.key.toLowerCase()==='t'){$('#taxo-btn').click();}
  else if(e.key.toLowerCase()==='f'){$('#fav-only-btn').click();}
});

// ---- init ----
applyLang();
const params = new URLSearchParams(location.search);
const initQ = params.get('q');
if(initQ){ state.q = initQ; $('#search').value = initQ; }
apply();
const initId = +params.get('id');
if(initId) openModal(initId);

// lazy-load non-critical data after core render (descriptions = 74% of payload; per-image credits)
// — each refills an open modal on arrival
setTimeout(function loadExtras(){
  for(const src of ['descs.js?v=11','credits.js?v=11','songs.js?v=11']){
    const s=document.createElement('script'); s.src=src;
    s.onload=()=>{ if($('#modal').classList.contains('open')) fillModal(); };
    document.head.appendChild(s);
  }
}, 200);
})();

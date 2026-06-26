import { createFileRoute } from '@tanstack/react-router';

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no" />
<meta name="theme-color" content="#05010f" />
<title>OTT & AI Store</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#05010f; --surface:rgba(20,15,40,.7); --line:rgba(255,255,255,.08);
  --text:#f5f7ff; --muted:#9aa3c7;
  --c1:#7c3aed; --c2:#06b6d4; --c3:#2563eb; --c4:#ec4899;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:'Manrope',system-ui,sans-serif;min-height:100vh;overflow-x:hidden;overscroll-behavior-y:none;-webkit-text-size-adjust:100%;text-rendering:optimizeSpeed}
body{padding-bottom:96px}
h1,h2,h3,.display{font-family:'Sora',sans-serif;letter-spacing:-.02em;margin:0}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;touch-action:manipulation}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}

/* Static background — zero per-frame cost */
.bg-fx{position:fixed;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(60% 50% at 15% 10%, rgba(124,58,237,.28), transparent 60%),
  radial-gradient(50% 40% at 85% 20%, rgba(6,182,212,.22), transparent 60%),
  radial-gradient(70% 60% at 50% 100%, rgba(37,99,235,.20), transparent 70%),
  #05010f}

/* Splash */
#loader{position:fixed;inset:0;z-index:50;background:#000;transition:opacity .5s ease-out,visibility .5s;overflow:hidden;contain:strict}
#loader.hide{opacity:0;visibility:hidden;pointer-events:none}
#loader::before{content:"";position:absolute;left:50%;top:-20%;width:120%;height:80%;transform:translate3d(-50%,0,0);background:radial-gradient(ellipse at center,rgba(80,150,255,.35),rgba(20,60,140,.12) 40%,transparent 70%);pointer-events:none}
.splash-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transform:translateZ(0) scale(.92);animation:splashIn 1200ms cubic-bezier(.4,0,.2,1) forwards;will-change:opacity,transform}
@keyframes splashIn{to{opacity:1;transform:translateZ(0) scale(1)}}

/* Layout */
.wrap{max-width:520px;margin:0 auto;padding:18px 16px 24px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.logo{display:flex;align-items:center;gap:10px}
.logo-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--c1),var(--c2));display:grid;place-items:center;font-weight:800;font-family:Sora}
.logo-name{font-family:Sora;font-weight:700;font-size:17px}
.logo-sub{font-size:11px;color:var(--muted)}
.bell{width:40px;height:40px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center}

/* Flat translucent cards — no backdrop-filter */
.glass{background:linear-gradient(180deg,rgba(28,20,55,.72),rgba(14,10,30,.72));border:1px solid var(--line);border-radius:22px}

/* Profile */
.profile{padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:18px;border-color:rgba(124,58,237,.35)}
.avatar{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--c4),var(--c1));display:grid;place-items:center;font-family:Sora;font-weight:700;font-size:20px;flex:0 0 auto}
.profile h3{font-size:16px}
.profile .id{font-size:12px;color:var(--muted);margin-top:2px}
.badge{margin-left:auto;font-size:11px;padding:6px 10px;border-radius:999px;background:linear-gradient(90deg,var(--c1),var(--c2));font-weight:600}

/* Search */
.search{display:flex;align-items:center;gap:10px;padding:12px 14px;margin-bottom:18px}
.search svg{flex:0 0 auto;color:var(--muted)}
.search input{flex:1;background:none;border:0;outline:0;color:var(--text);font-size:14px;-webkit-appearance:none}

/* Section title */
.section-title{display:flex;align-items:center;justify-content:space-between;margin:18px 4px 12px}
.section-title h2{font-size:16px;font-weight:700}
.section-title a{font-size:12px;color:var(--muted)}

/* Categories */
.cats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.cat{aspect-ratio:1/1.05;padding:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:18px;text-align:center;contain:layout style}
.cat:active{transform:scale(.96)}
.cat .ico{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:18px;background:linear-gradient(135deg,var(--c1),var(--c3))}
.cat:nth-child(4n+2) .ico{background:linear-gradient(135deg,var(--c2),var(--c3))}
.cat:nth-child(4n+3) .ico{background:linear-gradient(135deg,var(--c4),var(--c1))}
.cat:nth-child(4n) .ico{background:linear-gradient(135deg,var(--c3),var(--c2))}
.cat .name{font-size:11px;font-weight:600;line-height:1.2}
.cat.active{box-shadow:inset 0 0 0 1px rgba(124,58,237,.7)}

/* Featured carousel */
.carousel{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;padding:4px 16px 8px;margin:0 -16px;-webkit-overflow-scrolling:touch;contain:content}
.carousel::-webkit-scrollbar{display:none}
.feature{flex:0 0 78%;scroll-snap-align:start;border-radius:22px;padding:18px;min-height:140px;position:relative;background:linear-gradient(135deg,rgba(124,58,237,.4),rgba(6,182,212,.25));border:1px solid rgba(255,255,255,.1)}
.feature h3{font-size:18px;margin-bottom:6px}
.feature p{font-size:12px;color:rgba(255,255,255,.75);margin:0 0 14px;max-width:80%}
.feature .cta{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.15);font-size:12px;font-weight:600}

/* Product grid */
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;content-visibility:auto;contain-intrinsic-size:auto 600px}
.card{padding:12px;border-radius:20px;contain:layout style}
.card:active{transform:scale(.97)}
.thumb{aspect-ratio:1/1;border-radius:14px;background:linear-gradient(135deg,#1a0f3d,#0a1a3d);display:grid;place-items:center;font-size:34px;margin-bottom:10px;position:relative;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover}
.thumb .pbadge{position:absolute;top:8px;left:8px;font-size:10px;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.5);font-weight:600}
.card h4{font-family:Sora;font-size:13px;font-weight:600;margin:0 0 4px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.price{font-family:Sora;font-weight:700;font-size:15px;color:#a78bfa}
.buy{padding:6px 12px;border-radius:10px;background:linear-gradient(135deg,var(--c1),var(--c3));font-size:11px;font-weight:700;color:#fff}

/* Skeleton */
.skel{background:rgba(255,255,255,.05);border-radius:14px;animation:shimmer 1.6s linear infinite;background-image:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.10),rgba(255,255,255,.04));background-size:200% 100%}
.skel-card{aspect-ratio:1/1.35;border-radius:20px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* Bottom nav */
.nav{position:fixed;left:50%;transform:translate3d(-50%,0,0);bottom:14px;width:min(94%,500px);padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;z-index:30}
.nav-item{position:relative;padding:10px 0;border-radius:16px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--muted)}
.nav-item .ni{width:22px;height:22px}
.nav-item.active{color:#fff;background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(6,182,212,.25))}

.empty{text-align:center;padding:32px 16px;color:var(--muted);font-size:13px}

/* Modal */
.modal{position:fixed;inset:0;background:rgba(2,1,12,.7);z-index:60;display:flex;align-items:flex-end;justify-content:center}
.modal.hidden{display:none}
.modal-card{width:100%;max-width:520px;padding:18px;border-radius:24px 24px 0 0;max-height:82vh;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:slideUp .28s ease-out;contain:content}
.modal-card h3{font-family:Sora;font-size:18px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}
.modal-card .close-x{font-size:18px;color:var(--muted);padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.06)}
.lang-opt{display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin-bottom:8px}
.lang-opt.active{box-shadow:inset 0 0 0 1px rgba(124,58,237,.7)}
.lang-opt .flag{font-size:22px}
.lang-opt .check{margin-left:auto;color:var(--c2)}
.wallet-row{padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin-bottom:8px}
.wallet-row .net{font-family:Sora;font-weight:700;font-size:13px;margin-bottom:6px;color:var(--c2)}
.wallet-row .addr{font-family:monospace;font-size:11px;word-break:break-all;color:var(--muted);padding:8px;background:rgba(0,0,0,.35);border-radius:8px;margin-top:6px}
.balance-card{padding:18px;border-radius:18px;background:linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.2));border:1px solid var(--line);margin-bottom:14px;text-align:center}
.balance-card .lbl{font-size:12px;color:var(--muted);margin-bottom:6px}
.balance-card .amt{font-family:Sora;font-size:32px;font-weight:800;color:#a78bfa}
.tab-row{display:flex;gap:6px;margin-bottom:14px;padding:4px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
.tab-row button{flex:1;padding:10px;border-radius:10px;font-size:12px;font-weight:600;color:var(--muted)}
.tab-row button.active{background:linear-gradient(135deg,var(--c1),var(--c3));color:#fff}
.order-row{padding:12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;font-size:13px}
.order-row .st{font-size:10px;padding:3px 8px;border-radius:999px;font-weight:600;display:inline-block;margin-top:4px}
.st.paid,.st.delivered{background:rgba(16,185,129,.2);color:#10b981}
.st.pending{background:rgba(251,191,36,.2);color:#fbbf24}
.st.cancelled{background:rgba(239,68,68,.2);color:#ef4444}
@keyframes slideUp{from{transform:translate3d(0,100%,0)}to{transform:translate3d(0,0,0)}}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
}
</style>
</head>
<body>
<div class="bg-fx"></div>

<div id="loader" aria-hidden="true">
  <img class="splash-img" src="/__l5e/assets-v1/5186d4c0-13a2-486e-b26f-49d284ff121a/nexra-splash.png" alt="" decoding="async" fetchpriority="high" />
</div>

<div class="wrap" id="app">
  <header class="header">
    <div class="logo">
      <div class="logo-mark">O</div>
      <div>
        <div class="logo-name">OTT & AI Store</div>
        <div class="logo-sub">Premium digital marketplace</div>
      </div>
    </div>
    <button class="bell" id="bell" aria-label="Wallet" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
    </button>
  </header>

  <section class="glass profile">
    <div class="avatar" id="avatar">U</div>
    <div>
      <h3 id="uname">Guest</h3>
      <div class="id" id="uid">ID: —</div>
    </div>
    <span class="badge">PREMIUM</span>
  </section>

  <div class="glass search">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="q" placeholder="Search apps, OTT, games…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
  </div>

  <div class="section-title"><h2>Categories</h2></div>
  <div class="cats" id="cats">
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
  </div>

  <div class="section-title"><h2>Featured</h2></div>
  <div class="carousel" id="featured">
    <div class="feature"><h3>Premium OTT Bundle</h3><p>Netflix, Prime, Disney+ at unbeatable prices.</p><span class="cta">Explore →</span></div>
    <div class="feature" style="background:linear-gradient(135deg,rgba(236,72,153,.4),rgba(124,58,237,.3))"><h3>AI Power Pack</h3><p>ChatGPT, Claude, Midjourney bundled.</p><span class="cta">Explore →</span></div>
  </div>

  <div class="section-title"><h2>All Products</h2></div>
  <div class="grid" id="grid">
    <div class="skel skel-card"></div><div class="skel skel-card"></div>
    <div class="skel skel-card"></div><div class="skel skel-card"></div>
  </div>
</div>

<div id="modal" class="modal hidden" aria-hidden="true">
  <div class="modal-card glass" id="modalContent"></div>
</div>

<nav class="glass nav">
  <button class="nav-item active" data-nav="home" type="button"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></button>
  <button class="nav-item" data-nav="cats" type="button"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Browse</span></button>
  <button class="nav-item" data-nav="orders" type="button"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>Orders</span></button>
  <button class="nav-item" data-nav="me" type="button"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Profile</span></button>
</nav>

<script>
(function(){
  'use strict';
  var tg = window.Telegram && window.Telegram.WebApp;
  if(tg){ try{ tg.ready(); tg.expand(); tg.setHeaderColor('#05010f'); tg.setBackgroundColor('#05010f'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); }catch(e){} }
  function haptic(t){ try{ tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t||'light'); }catch(e){} }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function $(id){ return document.getElementById(id); }
  function pickEmoji(n){ var s=String(n||'').toLowerCase(); if(s.indexOf('netflix')>-1)return'🎬'; if(s.indexOf('chat')>-1||s.indexOf('ai')>-1)return'🤖'; if(s.indexOf('game')>-1)return'🎮'; if(s.indexOf('music')>-1||s.indexOf('spotify')>-1)return'🎵'; return'⚡'; }

  // User
  var u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;
  if(u){
    $('uname').textContent = u.first_name + (u.last_name?' '+u.last_name:'');
    $('uid').textContent = 'ID: '+u.id;
    $('avatar').textContent = (u.first_name||'U').slice(0,1).toUpperCase();
  }

  // State
  var CATS=[], PRODS=[], activeCat=null, query='', filteredCache=null;

  function renderCats(){
    var html = '<button class="cat'+(activeCat===null?' active':'')+'" data-cat="all" type="button"><div class="ico">✨</div><div class="name">All</div></button>';
    for(var i=0;i<CATS.length;i++){
      var c=CATS[i];
      html += '<button class="cat'+(activeCat===c.id?' active':'')+'" data-cat="'+esc(c.id)+'" type="button"><div class="ico">'+esc(c.icon_emoji||'📦')+'</div><div class="name">'+esc(c.name)+'</div></button>';
    }
    $('cats').innerHTML = html;
  }

  function renderGrid(){
    var grid = $('grid');
    var list = PRODS;
    if(activeCat) list = list.filter(function(p){return p.category_id===activeCat;});
    if(query) list = list.filter(function(p){return p.name.toLowerCase().indexOf(query)>-1;});
    filteredCache = list;
    if(!list.length){ grid.innerHTML = '<div class="empty" style="grid-column:1/-1">No products found</div>'; return; }
    var parts = new Array(list.length);
    for(var i=0;i<list.length;i++){
      var p=list[i];
      var thumb = p.image_url
        ? '<img src="'+esc(p.image_url)+'" alt="" loading="lazy" decoding="async">'
        : '<span>'+pickEmoji(p.name)+'</span>';
      var badge = (p.stock>0)?'<span class="pbadge">In stock</span>':'<span class="pbadge">Sold out</span>';
      parts[i] = '<div class="glass card" data-id="'+esc(p.id)+'"><div class="thumb">'+thumb+badge+'</div><h4>'+esc(p.name)+'</h4><div class="meta"><span class="price">$'+Number(p.price).toFixed(2)+'</span><button class="buy" data-buy="'+esc(p.id)+'" type="button">Buy</button></div></div>';
    }
    grid.innerHTML = parts.join('');
  }

  function render(){ renderCats(); renderGrid(); }

  // Delegated tap handler — one listener for the whole app
  document.addEventListener('click', function(e){
    var t = e.target;
    var catBtn = t.closest && t.closest('[data-cat]');
    if(catBtn){
      var id = catBtn.getAttribute('data-cat');
      activeCat = id==='all' ? null : id;
      haptic('light');
      render();
      return;
    }
    var buyBtn = t.closest && t.closest('[data-buy]');
    if(buyBtn){
      e.stopPropagation();
      handleBuy(buyBtn);
      return;
    }
    var nav = t.closest && t.closest('[data-nav]');
    if(nav){
      document.querySelectorAll('.nav-item').forEach(function(x){x.classList.remove('active');});
      nav.classList.add('active');
      haptic('light');
      var k = nav.getAttribute('data-nav');
      if(k==='orders') openWallet('orders');
      else if(k==='me') openWallet('wallet');
      else if(k==='cats'){ closeModal(); var el=$('cats'); el && window.scrollTo({top:el.offsetTop-20, behavior:'smooth'}); }
      else { closeModal(); window.scrollTo({top:0, behavior:'smooth'}); }
      return;
    }
    if(t.id === 'bell'){ haptic('light'); openWallet('wallet'); return; }
    var tab = t.closest && t.closest('[data-tab]');
    if(tab){ haptic('light'); openWallet(tab.getAttribute('data-tab')); return; }
    var lang = t.closest && t.closest('[data-lang]');
    if(lang){ pickLang(lang.getAttribute('data-lang')); return; }
    var close = t.closest && t.closest('[data-close]');
    if(close){ closeModal(); return; }
  }, {passive:true});

  // Modal backdrop close
  $('modal').addEventListener('click', function(e){
    if(e.target.id === 'modal') closeModal();
  }, {passive:true});

  async function handleBuy(btn){
    var id = btn.getAttribute('data-buy');
    if(!u){ alert('Open this from inside Telegram'); return; }
    if(btn.dataset.busy==='1') return;
    btn.dataset.busy='1';
    var orig = btn.textContent;
    btn.textContent = '…';
    haptic('medium');
    try{
      var r = await fetch('/api/public/buy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tg_id:u.id,product_id:id,first_name:u.first_name,username:u.username,language:u.language_code})});
      var j = await r.json();
      if(j.ok){ if(tg){ tg.close(); } else { alert('Check your Telegram chat to complete payment'); } }
      else { alert(j.error||'Failed'); btn.textContent = orig; btn.dataset.busy=''; }
    }catch(err){ alert('Network error'); btn.textContent = orig; btn.dataset.busy=''; }
  }

  // Debounced search
  var searchTimer = 0;
  $('q').addEventListener('input', function(e){
    var v = e.target.value.toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function(){ query = v; renderGrid(); }, 140);
  });

  // Modal
  var modal = $('modal'), mc = $('modalContent');
  function openModal(html){
    mc.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    haptic('light');
  }
  function closeModal(){
    if(modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  var LANGS=[{code:'en',name:'English',flag:'🇬🇧'},{code:'ru',name:'Русский',flag:'🇷🇺'},{code:'zh',name:'中文',flag:'🇨🇳'},{code:'pl',name:'Polski',flag:'🇵🇱'},{code:'vi',name:'Tiếng Việt',flag:'🇻🇳'}];
  var NETLABEL={trc20:'USDT · TRC20 (Tron)',bep20:'USDT · BEP20 (BNB)',solana:'SOL · Solana'};
  var ME=null, MEpromise=null;

  function loadMe(){
    if(!u) return Promise.resolve(null);
    if(ME) return Promise.resolve(ME);
    if(MEpromise) return MEpromise;
    MEpromise = fetch('/api/public/me?tg_id='+u.id).then(function(r){return r.ok?r.json():null;}).then(function(d){ME=d;return d;}).catch(function(){return null;});
    return MEpromise;
  }

  async function openWallet(tab){
    tab = tab || 'wallet';
    var data = await loadMe();
    if(!data){ openModal('<h3>Wallet <span class="close-x" data-close>✕</span></h3><div class="empty">Open this app from inside Telegram to use your wallet.</div>'); return; }
    var bal = Number(data.user.balance||0).toFixed(2);
    var spent = Number(data.user.total_spent||0).toFixed(2);
    var tabs = '<div class="tab-row"><button class="'+(tab==='wallet'?'active':'')+'" data-tab="wallet" type="button">💰 Wallet</button><button class="'+(tab==='orders'?'active':'')+'" data-tab="orders" type="button">🧾 Orders</button><button class="'+(tab==='lang'?'active':'')+'" data-tab="lang" type="button">🌐 Language</button></div>';
    var body='';
    if(tab==='wallet'){
      var wallets = (data.wallets||[]).map(function(w){return '<div class="wallet-row"><div class="net">'+(NETLABEL[w.network]||w.network)+(w.label?' · '+esc(w.label):'')+'</div><div class="addr">'+esc(w.address)+'</div></div>';}).join('') || '<div class="empty">No wallets configured</div>';
      body = '<div class="balance-card"><div class="lbl">Balance</div><div class="amt">$'+bal+'</div><div class="lbl" style="margin-top:8px">Total spent: $'+spent+'</div></div><div style="font-family:Sora;font-weight:700;margin:8px 4px">Deposit USDT / SOL</div><div style="font-size:12px;color:var(--muted);margin-bottom:10px">Send to any address below, then tap "I have deposited" in the bot chat with your tx hash.</div>'+wallets;
    } else if(tab==='orders'){
      var orders = data.orders||[];
      body = orders.length ? orders.map(function(o){return '<div class="order-row"><div><div style="font-weight:600">'+esc((o.products&&o.products.name)||'Order')+'</div><div style="font-size:11px;color:var(--muted)">'+new Date(o.created_at).toLocaleDateString()+'</div></div><div style="text-align:right"><div class="price" style="font-size:14px">$'+Number(o.amount).toFixed(2)+'</div><span class="st '+esc(o.status)+'">'+esc(o.status)+'</span></div></div>';}).join('') : '<div class="empty">No orders yet</div>';
    } else {
      var cur = data.user.language||'en';
      body = LANGS.map(function(L){return '<div class="lang-opt'+(L.code===cur?' active':'')+'" data-lang="'+L.code+'"><span class="flag">'+L.flag+'</span><span>'+L.name+'</span>'+(L.code===cur?'<span class="check">✓</span>':'')+'</div>';}).join('');
    }
    openModal('<h3>Account <span class="close-x" data-close>✕</span></h3>'+tabs+body);
  }

  async function pickLang(code){
    if(!u || !ME) return;
    haptic('medium');
    try{
      await fetch('/api/public/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tg_id:u.id,language:code})});
      ME.user.language = code;
      openWallet('lang');
    }catch(e){}
  }

  // Bootstrap: fetch ASAP, hide splash when ready (min 1200ms for splash anim)
  var splashStart = performance.now();
  function hideSplash(){
    var elapsed = performance.now() - splashStart;
    var wait = Math.max(0, 1400 - elapsed);
    setTimeout(function(){
      var l = $('loader');
      l.classList.add('hide');
      setTimeout(function(){ l.remove(); }, 600);
    }, wait);
  }

  fetch('/api/public/storefront').then(function(r){return r.json();}).then(function(d){
    CATS = d.categories||[]; PRODS = d.products||[];
    render();
    hideSplash();
  }).catch(function(){
    $('grid').innerHTML = '<div class="empty" style="grid-column:1/-1">Could not load store. Pull to refresh.</div>';
    hideSplash();
  });
})();
</script>
</body>
</html>`;

export const Route = createFileRoute('/api/public/app')({
  server: {
    handlers: {
      GET: async () => new Response(HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      }),
    },
  },
});

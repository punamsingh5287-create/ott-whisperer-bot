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
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#05010f; --surface:rgba(255,255,255,.04); --line:rgba(255,255,255,.08);
  --text:#f5f7ff; --muted:#9aa3c7;
  --c1:#7c3aed; --c2:#06b6d4; --c3:#2563eb; --c4:#ec4899;
  --glow:0 0 30px rgba(124,58,237,.55), 0 0 60px rgba(6,182,212,.35);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:'Manrope',system-ui,sans-serif;min-height:100vh;overflow-x:hidden;overscroll-behavior-y:none}
body{padding-bottom:96px}
h1,h2,h3,.display{font-family:'Sora',sans-serif;letter-spacing:-.02em;margin:0}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
a{color:inherit;text-decoration:none}

/* Animated gradient background */
.bg-fx{position:fixed;inset:0;z-index:-2;background:
  radial-gradient(60% 50% at 15% 10%, rgba(124,58,237,.35), transparent 60%),
  radial-gradient(50% 40% at 85% 20%, rgba(6,182,212,.30), transparent 60%),
  radial-gradient(70% 60% at 50% 100%, rgba(37,99,235,.28), transparent 70%),
  #05010f;
  filter:saturate(120%);
  animation:bgshift 18s ease-in-out infinite alternate;
}
@keyframes bgshift{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(0,-2%,0) scale(1.05)}}
canvas#particles{position:fixed;inset:0;z-index:-1;pointer-events:none}

/* Loader */
#loader{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:radial-gradient(circle at center,#0a0420 0%,#02010a 70%);transition:opacity .6s ease,visibility .6s}
#loader.hide{opacity:0;visibility:hidden}
.orb{width:120px;height:120px;border-radius:50%;background:conic-gradient(from 0deg,var(--c1),var(--c2),var(--c4),var(--c1));filter:blur(2px);animation:spin 2.4s linear infinite;box-shadow:var(--glow)}
.orb::after{content:"";position:absolute;inset:14px;border-radius:50%;background:#05010f}
.orb-wrap{position:relative;display:grid;place-items:center}
.orb-label{position:absolute;font-family:Sora;font-weight:700;font-size:14px;letter-spacing:.3em;color:#fff;text-shadow:0 0 12px rgba(124,58,237,.8)}
@keyframes spin{to{transform:rotate(360deg)}}

/* Layout */
.wrap{max-width:520px;margin:0 auto;padding:18px 16px 24px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;animation:fadeDown .6s ease both}
.logo{display:flex;align-items:center;gap:10px}
.logo-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:var(--glow);display:grid;place-items:center;font-weight:800;font-family:Sora;animation:float 4s ease-in-out infinite}
.logo-name{font-family:Sora;font-weight:700;font-size:17px}
.logo-sub{font-size:11px;color:var(--muted)}
.bell{width:40px;height:40px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;backdrop-filter:blur(20px)}

/* Glass card */
.glass{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid var(--line);backdrop-filter:blur(24px) saturate(140%);border-radius:22px;box-shadow:0 10px 40px rgba(0,0,0,.4)}

/* Profile */
.profile{padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:18px;position:relative;overflow:hidden;animation:fadeUp .6s .05s ease both}
.profile::before{content:"";position:absolute;inset:-1px;border-radius:22px;padding:1px;background:linear-gradient(135deg,rgba(124,58,237,.6),rgba(6,182,212,.6),transparent 70%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
.avatar{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--c4),var(--c1));display:grid;place-items:center;font-family:Sora;font-weight:700;font-size:20px;box-shadow:0 0 24px rgba(236,72,153,.4)}
.profile h3{font-size:16px}
.profile .id{font-size:12px;color:var(--muted);margin-top:2px}
.badge{margin-left:auto;font-size:11px;padding:6px 10px;border-radius:999px;background:linear-gradient(90deg,var(--c1),var(--c2));font-weight:600}

/* Search */
.search{display:flex;align-items:center;gap:10px;padding:12px 14px;margin-bottom:18px;transition:all .3s cubic-bezier(.2,.8,.2,1);animation:fadeUp .6s .1s ease both}
.search:focus-within{box-shadow:0 0 0 1px rgba(124,58,237,.6),0 0 24px rgba(124,58,237,.35);transform:translateY(-1px)}
.search svg{flex:0 0 auto;color:var(--muted)}
.search input{flex:1;background:none;border:0;outline:0;color:var(--text);font-size:14px}
.search input::placeholder{color:var(--muted)}

/* Section title */
.section-title{display:flex;align-items:center;justify-content:space-between;margin:18px 4px 12px}
.section-title h2{font-size:16px;font-weight:700}
.section-title a{font-size:12px;color:var(--muted)}

/* Categories */
.cats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;animation:fadeUp .6s .15s ease both}
.cat{aspect-ratio:1/1.05;padding:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:18px;position:relative;transition:transform .2s ease;text-align:center}
.cat:active{transform:scale(.95)}
.cat .ico{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:18px;background:linear-gradient(135deg,var(--c1),var(--c3));box-shadow:0 6px 20px rgba(124,58,237,.4)}
.cat:nth-child(4n+2) .ico{background:linear-gradient(135deg,var(--c2),var(--c3))}
.cat:nth-child(4n+3) .ico{background:linear-gradient(135deg,var(--c4),var(--c1))}
.cat:nth-child(4n) .ico{background:linear-gradient(135deg,var(--c3),var(--c2))}
.cat .name{font-size:11px;font-weight:600;line-height:1.2}
.cat.active{box-shadow:inset 0 0 0 1px rgba(124,58,237,.7),0 0 22px rgba(124,58,237,.3)}

/* Featured carousel */
.carousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 0 8px;margin:0 -16px;padding-left:16px;padding-right:16px;animation:fadeUp .6s .2s ease both}
.carousel::-webkit-scrollbar{display:none}
.feature{flex:0 0 78%;scroll-snap-align:start;border-radius:22px;padding:18px;min-height:150px;position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(124,58,237,.4),rgba(6,182,212,.25));border:1px solid rgba(255,255,255,.1)}
.feature::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 100% 0,rgba(255,255,255,.18),transparent 50%);pointer-events:none}
.feature h3{font-size:18px;margin-bottom:6px}
.feature p{font-size:12px;color:rgba(255,255,255,.75);margin:0 0 14px;max-width:80%}
.feature .cta{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);font-size:12px;font-weight:600}

/* Product grid */
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;animation:fadeUp .6s .25s ease both}
.card{padding:12px;border-radius:20px;position:relative;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}
.card:active{transform:scale(.97)}
.card:hover{box-shadow:0 0 0 1px rgba(124,58,237,.6),0 10px 30px rgba(124,58,237,.25)}
.thumb{aspect-ratio:1/1;border-radius:14px;background:linear-gradient(135deg,#1a0f3d,#0a1a3d);display:grid;place-items:center;font-size:34px;margin-bottom:10px;position:relative;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover}
.thumb .pbadge{position:absolute;top:8px;left:8px;font-size:10px;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);font-weight:600}
.card h4{font-family:Sora;font-size:13px;font-weight:600;margin:0 0 4px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.price{font-family:Sora;font-weight:700;font-size:15px;background:linear-gradient(90deg,var(--c2),var(--c1));-webkit-background-clip:text;background-clip:text;color:transparent}
.buy{padding:6px 10px;border-radius:10px;background:linear-gradient(135deg,var(--c1),var(--c3));font-size:11px;font-weight:700;color:#fff;box-shadow:0 4px 14px rgba(124,58,237,.5);position:relative;overflow:hidden}
.buy::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-100%);transition:transform .6s}
.buy:hover::before{transform:translateX(100%)}

/* Skeleton */
.skel{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.10),rgba(255,255,255,.04));background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:14px}
.skel-card{aspect-ratio:1/1.35;border-radius:20px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* Bottom nav */
.nav{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;width:min(94%,500px);padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;z-index:30}
.nav-item{position:relative;padding:10px 0;border-radius:16px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--muted);transition:color .2s}
.nav-item .ni{width:22px;height:22px}
.nav-item.active{color:#fff}
.nav-item.active::before{content:"";position:absolute;inset:0;border-radius:16px;background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(6,182,212,.25));box-shadow:0 0 22px rgba(124,58,237,.6);z-index:-1}
.nav-item.active .dot{position:absolute;bottom:4px;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff}

/* Ripple */
.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.4);transform:scale(0);animation:ripple .6s ease-out;pointer-events:none}
@keyframes ripple{to{transform:scale(4);opacity:0}}

/* Animations */
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}

.empty{text-align:center;padding:32px 16px;color:var(--muted);font-size:13px}
</style>
</head>
<body>
<div class="bg-fx"></div>
<canvas id="particles"></canvas>

<div id="loader">
  <div class="orb-wrap"><div class="orb"></div><div class="orb-label">LOADING</div></div>
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
    <button class="bell" id="bell" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
    </button>
  </header>

  <section class="glass profile" id="profile">
    <div class="avatar" id="avatar">U</div>
    <div>
      <h3 id="uname">Guest</h3>
      <div class="id" id="uid">ID: —</div>
    </div>
    <span class="badge">PREMIUM</span>
  </section>

  <div class="glass search">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="q" placeholder="Search apps, OTT, games…" />
  </div>

  <div class="section-title"><h2>Categories</h2></div>
  <div class="cats" id="cats">
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
    <div class="skel" style="aspect-ratio:1/1.05;border-radius:18px"></div>
  </div>

  <div class="section-title"><h2>Featured</h2><a>See all</a></div>
  <div class="carousel" id="featured">
    <div class="feature"><h3>Premium OTT Bundle</h3><p>Netflix, Prime, Disney+ at unbeatable prices.</p><span class="cta">Explore →</span></div>
    <div class="feature" style="background:linear-gradient(135deg,rgba(236,72,153,.4),rgba(124,58,237,.3))"><h3>AI Power Pack</h3><p>ChatGPT, Claude, Midjourney bundled.</p><span class="cta">Explore →</span></div>
  </div>

  <div class="section-title"><h2 id="grid-title">All Products</h2></div>
  <div class="grid" id="grid">
    <div class="skel skel-card"></div><div class="skel skel-card"></div>
    <div class="skel skel-card"></div><div class="skel skel-card"></div>
  </div>
</div>

<nav class="glass nav">
  <button class="nav-item active" data-nav="home"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span><span class="dot"></span></button>
  <button class="nav-item" data-nav="cats"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Browse</span></button>
  <button class="nav-item" data-nav="orders"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>Orders</span></button>
  <button class="nav-item" data-nav="me"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Profile</span></button>
</nav>

<script>
(function(){
  const tg = window.Telegram && window.Telegram.WebApp;
  if(tg){ try{ tg.ready(); tg.expand(); tg.setHeaderColor('#05010f'); tg.setBackgroundColor('#05010f'); }catch(e){} }
  const haptic = (t='light') => { try{ tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t); }catch(e){} };

  // Particles
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, parts;
  function size(){ const d=Math.min(devicePixelRatio||1,2); W=canvas.clientWidth=innerWidth; H=canvas.clientHeight=innerHeight; canvas.width=W*d; canvas.height=H*d; ctx.setTransform(d,0,0,d,0,0); }
  function init(){ parts=Array.from({length:38},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.25,vy:-Math.random()*.35-.05,a:Math.random()*.6+.2,hue:Math.random()<.5?'#7c3aed':'#06b6d4'})); }
  function tick(){ ctx.clearRect(0,0,W,H); for(const p of parts){ p.x+=p.vx; p.y+=p.vy; if(p.y<-10){p.y=H+10;p.x=Math.random()*W} ctx.beginPath(); ctx.fillStyle=p.hue; ctx.globalAlpha=p.a; ctx.shadowColor=p.hue; ctx.shadowBlur=14; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1; ctx.shadowBlur=0; requestAnimationFrame(tick); }
  size(); init(); tick(); addEventListener('resize',()=>{size();init();});

  // Ripple
  document.addEventListener('pointerdown', e=>{
    const t = e.target.closest('.cat,.buy,.nav-item,.feature,.card,.bell,.cta');
    if(!t) return;
    const r=t.getBoundingClientRect();
    const span=document.createElement('span');
    span.className='ripple';
    const s=Math.max(r.width,r.height);
    span.style.width=span.style.height=s+'px';
    span.style.left=(e.clientX-r.left-s/2)+'px';
    span.style.top=(e.clientY-r.top-s/2)+'px';
    if(getComputedStyle(t).position==='static') t.style.position='relative';
    t.appendChild(span);
    setTimeout(()=>span.remove(),600);
    haptic('light');
  });

  // User
  const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;
  if(u){
    document.getElementById('uname').textContent = u.first_name + (u.last_name?' '+u.last_name:'');
    document.getElementById('uid').textContent = 'ID: '+u.id;
    document.getElementById('avatar').textContent = (u.first_name||'U').slice(0,1).toUpperCase();
  }

  // Data
  let CATS=[], PRODS=[], activeCat=null, query='';
  function render(){
    const cats = document.getElementById('cats');
    cats.innerHTML = '<div class="cat'+(activeCat===null?' active':'')+'" data-cat="all"><div class="ico">✨</div><div class="name">All</div></div>' +
      CATS.map(c=>'<div class="cat'+(activeCat===c.id?' active':'')+'" data-cat="'+c.id+'"><div class="ico">'+(c.icon_emoji||'📦')+'</div><div class="name">'+escape(c.name)+'</div></div>').join('');
    cats.querySelectorAll('.cat').forEach(el=>el.addEventListener('click',()=>{
      const id=el.dataset.cat; activeCat = id==='all'?null:id; haptic('medium'); render();
    }));
    const filtered = PRODS.filter(p=>(!activeCat||p.category_id===activeCat) && (!query||p.name.toLowerCase().includes(query)));
    const grid = document.getElementById('grid');
    grid.innerHTML = filtered.length ? filtered.map(p=>\`
      <div class="glass card" data-id="\${p.id}">
        <div class="thumb">\${p.image_url?'<img src="'+escape(p.image_url)+'" alt="">':'<span>'+pickEmoji(p.name)+'</span>'}\${p.stock>0?'<span class="pbadge">In stock</span>':'<span class="pbadge">Sold out</span>'}</div>
        <h4>\${escape(p.name)}</h4>
        <div class="meta"><span class="price">$\${Number(p.price).toFixed(2)}</span><button class="buy" data-buy="\${p.id}">Buy</button></div>
      </div>\`).join('') : '<div class="empty" style="grid-column:1/-1">No products found</div>';
    grid.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',e=>{
      e.stopPropagation(); haptic('medium');
      const id=b.dataset.buy;
      if(tg){ tg.sendData(JSON.stringify({action:'buy',product_id:id})); tg.close(); }
    }));
  }
  function pickEmoji(n){ const s=n.toLowerCase(); if(s.includes('netflix'))return'🎬'; if(s.includes('chat')||s.includes('ai'))return'🤖'; if(s.includes('game'))return'🎮'; if(s.includes('music')||s.includes('spotify'))return'🎵'; return'⚡'; }
  function escape(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  document.getElementById('q').addEventListener('input', e=>{ query=e.target.value.toLowerCase(); render(); });
  document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    n.classList.add('active'); haptic('light');
  }));

  fetch('/api/public/storefront').then(r=>r.json()).then(d=>{
    CATS = d.categories||[]; PRODS = d.products||[];
    render();
    setTimeout(()=>document.getElementById('loader').classList.add('hide'), 600);
  }).catch(()=>{
    document.getElementById('grid').innerHTML='<div class="empty" style="grid-column:1/-1">Could not load store</div>';
    document.getElementById('loader').classList.add('hide');
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

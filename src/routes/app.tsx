import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

export const Route = createFileRoute('/app')({
  head: () => ({
    meta: [
      { title: 'OTT & AI Store' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#05010f' },
    ],
    scripts: [{ src: 'https://telegram.org/js/telegram-web-app.js' }],
  }),
  component: MiniApp,
});

type Category = { id: string; name: string; icon_emoji?: string | null; premium_emoji_id?: string | null; sort_order?: number | null };
type Product = { id: string; name: string; description?: string | null; price: number; duration_days?: number | null; stock?: number | null; image_url?: string | null; category_id: string | null };

function CinematicIntro({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; hue: number };
    const particles: P[] = [];
    const streaks: { x: number; y: number; len: number; speed: number; hue: number; a: number }[] = [];
    for (let i = 0; i < 14; i++) {
      streaks.push({
        x: Math.random() * w, y: Math.random() * h,
        len: 120 + Math.random() * 280, speed: 6 + Math.random() * 14,
        hue: [195, 265, 220, 285][Math.floor(Math.random() * 4)], a: Math.random(),
      });
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = (t - start) / 1000;
      // background gradient
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(20,10,50,1)');
      g.addColorStop(0.5, 'rgba(5,2,20,1)');
      g.addColorStop(1, '#000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // pulse wave from center
      const pulseR = elapsed * 380;
      for (let i = 0; i < 3; i++) {
        const r = pulseR - i * 70;
        if (r > 0 && r < Math.max(w, h)) {
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${200 + i * 30}, 100%, 65%, ${Math.max(0, 0.5 - r / 800)})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 30; ctx.shadowColor = `hsl(${200 + i * 30},100%,60%)`;
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // streaks
      streaks.forEach((s) => {
        s.x += s.speed; if (s.x - s.len > w) { s.x = -s.len; s.y = Math.random() * h; }
        const grad = ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
        grad.addColorStop(0, `hsla(${s.hue},100%,65%,0)`);
        grad.addColorStop(1, `hsla(${s.hue},100%,75%,0.9)`);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
        ctx.shadowBlur = 14; ctx.shadowColor = `hsl(${s.hue},100%,60%)`;
        ctx.beginPath(); ctx.moveTo(s.x - s.len, s.y); ctx.lineTo(s.x, s.y); ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // energy burst spawn
      if (elapsed < 1.6 && particles.length < 220) {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1 + Math.random() * 5;
          particles.push({
            x: w / 2, y: h / 2,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 1 + Math.random() * 2.5, life: 1,
            hue: [195, 220, 265, 285][Math.floor(Math.random() * 4)],
          });
        }
      }
      // particles update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.008;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life})`;
        ctx.shadowBlur = 16; ctx.shadowColor = `hsl(${p.hue},100%,65%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

      // central core flare
      const coreA = Math.max(0, 1 - elapsed / 2.6);
      const core = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 220);
      core.addColorStop(0, `rgba(220,230,255,${0.9 * coreA})`);
      core.addColorStop(0.3, `rgba(140,90,255,${0.55 * coreA})`);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);

      // lens flare line
      const lf = Math.max(0, 1 - Math.abs(elapsed - 1.1) * 1.4);
      if (lf > 0) {
        const lg = ctx.createLinearGradient(0, h / 2, w, h / 2);
        lg.addColorStop(0, 'rgba(120,200,255,0)');
        lg.addColorStop(0.5, `rgba(180,220,255,${0.6 * lf})`);
        lg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, h / 2 - 1, w, 2);
      }

      if (elapsed < 3.0) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center animate-fade-in" style={{ animationDuration: '1.2s' }}>
          <div className="text-[11px] tracking-[0.5em] text-cyan-300/80 uppercase mb-3" style={{ textShadow: '0 0 12px rgba(120,220,255,0.9)' }}>
            Powered by AI
          </div>
          <div
            className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(120deg,#7dd3fc 0%,#a78bfa 45%,#22d3ee 100%)',
              filter: 'drop-shadow(0 0 24px rgba(140,100,255,0.55))',
            }}
          >
            OTT &amp; AI STORE
          </div>
          <div className="mt-4 text-[10px] tracking-[0.4em] text-violet-200/60 uppercase">Initializing experience</div>
        </div>
      </div>
    </div>
  );
}

function MiniApp() {
  const [introDone, setIntroDone] = useState(false);
  const [data, setData] = useState<{ categories: Category[]; products: Product[] } | null>(null);
  const [catId, setCatId] = useState<string | 'all'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    // Telegram WebApp expansion
    const w = window as any;
    if (w.Telegram?.WebApp) {
      try { w.Telegram.WebApp.ready(); w.Telegram.WebApp.expand(); w.Telegram.WebApp.setHeaderColor('#05010f'); } catch {}
    }
    fetch('/api/public/storefront').then((r) => r.json()).then(setData).catch(() => setData({ categories: [], products: [] }));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) =>
      (catId === 'all' || p.category_id === catId) &&
      (q.trim() === '' || p.name.toLowerCase().includes(q.toLowerCase())),
    );
  }, [data, catId, q]);

  const buy = (p: Product) => {
    const w = window as any;
    const tg = w.Telegram?.WebApp;
    const payload = `buy:${p.id}`;
    if (tg?.sendData) { tg.sendData(payload); tg.close?.(); }
    else alert('Open this inside Telegram to checkout.');
  };

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #1a0b3d 0%, #05010f 60%, #000 100%)' }}>
      {!introDone && <CinematicIntro onDone={() => setIntroDone(true)} />}

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <header className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-cyan-300/70 uppercase">Premium Store</div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(120deg,#7dd3fc,#a78bfa,#22d3ee)' }}>
              OTT &amp; AI
            </h1>
          </div>
          <div className="h-10 w-10 rounded-full grid place-items-center text-lg"
               style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 24px rgba(124,58,237,0.55)' }}>⚡</div>
        </header>

        <div className="relative mb-4">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search premium subscriptions…"
            className="w-full rounded-2xl bg-white/5 border border-white/10 backdrop-blur px-4 py-3 text-sm outline-none focus:border-violet-400/60"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: 'all', name: 'All', icon_emoji: '✨' } as any, ...(data?.categories ?? [])].map((c) => {
            const active = catId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold border transition"
                style={{
                  background: active ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
                  borderColor: active ? 'transparent' : 'rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 0 24px rgba(124,58,237,0.45)' : 'none',
                }}
              >
                <span className="mr-1.5">{c.icon_emoji || '📦'}</span>{c.name}
              </button>
            );
          })}
        </div>

        {!data ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-white/[0.04] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/50 py-16 text-sm">No products found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="group text-left rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur hover:border-violet-400/50 transition relative"
                style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
              >
                <div className="aspect-square w-full bg-gradient-to-br from-violet-900/40 to-cyan-900/30 relative overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-4xl">✨</div>
                  )}
                  <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10">
                    {p.stock && p.stock > 0 ? `${p.stock} left` : 'Sold out'}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-black text-cyan-300">${Number(p.price).toFixed(2)}</span>
                    {p.duration_days ? <span className="text-[10px] text-white/50">{p.duration_days}d</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#15082e] to-[#05010f]" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-gradient-to-br from-violet-900/50 to-cyan-900/40 relative overflow-hidden">
              {selected.image_url
                ? <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-6xl">✨</div>}
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold">{selected.name}</h3>
              {selected.description && <p className="text-sm text-white/60 mt-2">{selected.description}</p>}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Price</div>
                  <div className="text-base font-black text-cyan-300">${Number(selected.price).toFixed(2)}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Duration</div>
                  <div className="text-base font-bold">{selected.duration_days ?? '—'}d</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Stock</div>
                  <div className="text-base font-bold">{selected.stock ?? 0}</div>
                </div>
              </div>
              <button
                onClick={() => buy(selected)}
                disabled={!selected.stock || selected.stock <= 0}
                className="w-full mt-5 rounded-2xl py-3.5 font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 32px rgba(124,58,237,0.6)' }}
              >
                ⚡ Buy Now
              </button>
              <button onClick={() => setSelected(null)} className="w-full mt-2 py-2 text-xs text-white/50 hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

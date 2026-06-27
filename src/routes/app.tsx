import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/app')({
  head: () => ({
    meta: [
      { title: 'OTT & AI Store' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#000000' },
    ],
    scripts: [{ src: 'https://telegram.org/js/telegram-web-app.js' }],
  }),
  component: MiniApp,
});

type Category = { id: string; name: string; icon_emoji?: string | null; premium_emoji_id?: string | null; sort_order?: number | null };
type Product = { id: string; name: string; description?: string | null; price: number; duration_days?: number | null; stock?: number | null; image_url?: string | null; category_id: string | null };

function MiniApp() {
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

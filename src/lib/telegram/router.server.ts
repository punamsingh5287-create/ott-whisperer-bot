import { db } from './db.server';
import {
  sendMessage, sendVideo, deleteMessage, answerCallback, getMe, getFile, downloadFile,
  type InlineKeyboard,
} from './gateway.server';
import { escapeHtml, e, mkBtn, mkEmojiBtn, premiumEmoji } from './emoji';
import { closeView, getFlowAction, goBack, setFlowAction, showView, type NavState, type RenderedView } from './navigation.server';
import { LANGS, t, detect, type Lang } from './i18n';

const INTRO_VIDEO_URL = 'https://project--0e9ed495-46e4-42a2-801a-3588d25b626e-dev.lovable.app/__l5e/assets-v1/86a1868b-601f-44d2-9070-0877a0fa3fff/bot-intro.mp4';

async function playStartIntro(chatId: number) {
  try {
    const sent = await sendVideo(chatId, INTRO_VIDEO_URL, {
      caption: '<b>⚡ Booting OTT &amp; AI Store…</b>',
      supports_streaming: true,
    });
    const messageId = sent?.result?.message_id;
    if (messageId) {
      // Let the cinematic play, then quietly remove it before showing the menu.
      await new Promise((r) => setTimeout(r, 3200));
      await deleteMessage(chatId, messageId).catch(() => {});
    }
  } catch (err) {
    console.error('intro video failed', err);
  }
}

type TgUser = { id: number; username?: string; first_name?: string };
type Network = 'USDT_TRC20' | 'USDT_BEP20' | 'SOL';

const NETWORK_LABEL: Record<Network, string> = {
  USDT_TRC20: 'USDT (TRC20)',
  USDT_BEP20: 'USDT (BEP20)',
  SOL: 'Solana (SOL)',
};
const NETWORK_KEY: Record<Network, string> = {
  USDT_TRC20: 'pay_trc20', USDT_BEP20: 'pay_bep20', SOL: 'pay_sol',
};


async function categoryEmoji(c: any): Promise<string> {
  return premiumEmoji(c.premium_emoji_id, c.icon_emoji || '📦');
}

async function categoryBtn(c: any): Promise<any> {
  return mkEmojiBtn(c.icon_emoji || '📦', c.name, { callback_data: `cat:${c.id}` }, c.premium_emoji_id);
}

async function productEmoji(p: any): Promise<string> {
  return premiumEmoji(p.premium_emoji_id, p.fallback_emoji || '✨');
}

/* ─── user upsert ─────────────────────────────────────────────── */
function genReferralCode(telegramId: number) { return `R${telegramId.toString(36).toUpperCase()}`; }

async function upsertBotUser(from: TgUser & { language_code?: string }, startPayload?: string): Promise<string> {
  const supabase = db();
  const { data: existing } = await supabase
    .from('bot_users').select('id').eq('telegram_id', from.id).maybeSingle();
  if (existing) {
    await supabase.from('bot_users').update({
      username: from.username ?? null, first_name: from.first_name ?? null,
      last_active: new Date().toISOString(),
    }).eq('telegram_id', from.id);
    return existing.id as string;
  }
  let referredBy: string | null = null;
  if (startPayload?.startsWith('R')) {
    const { data: ref } = await supabase.from('bot_users').select('id').eq('referral_code', startPayload).maybeSingle();
    if (ref) referredBy = ref.id as string;
  }
  const { data: inserted, error } = await supabase.from('bot_users').insert({
    telegram_id: from.id, username: from.username ?? null, first_name: from.first_name ?? null,
    referral_code: genReferralCode(from.id), referred_by: referredBy,
    language: detect(from.language_code),
  }).select('id').single();
  if (error) throw error;
  if (referredBy) {
    await supabase.from('referrals').insert({
      referrer_bot_user_id: referredBy, referred_bot_user_id: inserted.id,
    });
  }
  return inserted.id as string;
}

async function getUserLang(botUserId: string): Promise<Lang> {
  const { data } = await db().from('bot_users').select('language').eq('id', botUserId).maybeSingle();
  return detect((data as any)?.language);
}

async function setUserLang(botUserId: string, lang: Lang) {
  await db().from('bot_users').update({ language: lang }).eq('id', botUserId);
}

async function getSettings() {
  const { data } = await db().from('settings').select('*').eq('id', 1).maybeSingle();
  return data ?? { welcome_text: 'Welcome!', support_handle: '@support', site_name: 'OTT Store', bot_username: null };
}

/* ─── menus ───────────────────────────────────────────────────── */
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://project--0e9ed495-46e4-42a2-801a-3588d25b626e-dev.lovable.app/api/public/app';

async function mainMenu(lang: Lang = 'en'): Promise<InlineKeyboard> {
  const [cats, search, orders, profile, wallet, ref, support, langBtn, close] = await Promise.all([
    mkBtn('menu_categories', '🗂', t(lang, 'categories'), { callback_data: 'menu:cats' }),
    mkBtn('menu_search', '🔎', t(lang, 'search'), { callback_data: 'menu:search' }),
    mkBtn('menu_orders', '🧾', t(lang, 'my_orders'), { callback_data: 'menu:orders' }),
    mkBtn('menu_profile', '👤', t(lang, 'profile'), { callback_data: 'menu:profile' }),
    mkBtn('menu_wallet', '💰', t(lang, 'wallet'), { callback_data: 'menu:wallet' }),
    mkBtn('menu_referrals', '🎁', t(lang, 'referrals'), { callback_data: 'menu:ref' }),
    mkBtn('menu_support', '💬', t(lang, 'support'), { callback_data: 'menu:support' }),
    mkBtn('menu_lang', '🌐', t(lang, 'language'), { callback_data: 'menu:lang' }),
    mkBtn('menu_close', '✕', t(lang, 'close'), { callback_data: 'nav:close' }),
  ]);
  const openApp = { text: `🚀  ${t(lang, 'open_app')}`, web_app: { url: MINI_APP_URL } } as any;
  return { inline_keyboard: [[openApp], [cats, search], [orders, wallet], [profile, ref], [support, langBtn], [close]] };
}

async function navRow(lang: Lang = 'en', includeHome = true): Promise<InlineKeyboard['inline_keyboard'][number]> {
  const buttons = [await mkBtn('menu_back', '‹', t(lang, 'back'), { callback_data: 'nav:back' })];
  if (includeHome) buttons.push(await mkBtn('menu_home', '🏠', t(lang, 'home'), { callback_data: 'menu:home' }));
  buttons.push(await mkBtn('menu_close', '✕', t(lang, 'close'), { callback_data: 'nav:close' }));
  return buttons;
}

async function backMenu(lang: Lang = 'en'): Promise<InlineKeyboard> {
  return { inline_keyboard: [await navRow(lang)] };
}


/* ─── views ───────────────────────────────────────────────────── */
async function renderHome(name?: string, lang: Lang = 'en'): Promise<RenderedView> {
  const s = await getSettings();
  const welcome = await e('welcome', '✨');
  const greet = name ? `, <b>${escapeHtml(name)}</b>` : '';
  const text =
    `${welcome}  <b>${escapeHtml(s.site_name || s.bot_name || 'OTT & AI Store')}</b>\n\n` +
    `${t(lang, 'hey')}${greet}! ${escapeHtml(s.welcome_text || '')}\n\n` +
    `${t(lang, 'browse')}`;
  return { text, reply_markup: await mainMenu(lang) };
}

async function renderLanguage(lang: Lang): Promise<RenderedView> {
  const rows = LANGS.map((L) => [{ text: `${L.flag}  ${L.name}${L.code === lang ? '  ✓' : ''}`, callback_data: `lang:${L.code}` }]);
  rows.push(await navRow(lang));
  return {
    text: `🌐  <b>${t(lang, 'language')}</b>\n\n${t(lang, 'choose_lang')}`,
    reply_markup: { inline_keyboard: rows },
  };
}

async function renderWallet(botUserId: string, lang: Lang): Promise<RenderedView> {
  const supabase = db();
  const [{ data: u }, { data: wallets }] = await Promise.all([
    supabase.from('bot_users').select('balance, total_spent').eq('id', botUserId).maybeSingle(),
    supabase.from('wallets').select('id, network, address, label').eq('is_active', true),
  ]);
  const balance = Number((u as any)?.balance ?? 0);
  const spent = Number((u as any)?.total_spent ?? 0);
  const ws = (wallets ?? []) as any[];

  const networkLines = ws.length
    ? ws.map((w) => `<b>${NETWORK_LABEL[w.network as Network] || w.network}</b>${w.label ? ` · ${escapeHtml(w.label)}` : ''}\n<code>${escapeHtml(w.address)}</code>`).join('\n\n')
    : t(lang, 'no_wallets');

  const text =
    `💰  <b>${t(lang, 'wallet')}</b>\n\n` +
    `${t(lang, 'balance')}: <b>$${balance.toFixed(2)}</b>\n` +
    `Total spent: <b>$${spent.toFixed(2)}</b>\n\n` +
    `<b>${t(lang, 'deposit')}</b>\n${t(lang, 'deposit_info')}\n\n${networkLines}`;

  const rows: InlineKeyboard['inline_keyboard'] = [];
  if (ws.length) rows.push([{ text: `✅  ${t(lang, 'deposited')}`, callback_data: 'wallet:deposited' }]);
  rows.push(await navRow(lang));
  return { text, reply_markup: { inline_keyboard: rows } };
}

async function captureDepositProof(chatId: number, botUserId: string, opts: { text?: string; photoFileId?: string }) {
  const supabase = db();
  const lang = await getUserLang(botUserId);
  let screenshotUrl: string | null = null;
  if (opts.photoFileId) {
    try {
      const f = await getFile(opts.photoFileId);
      const filePath = f?.result?.file_path as string | undefined;
      if (filePath) {
        const bytes = await downloadFile(filePath);
        const ext = filePath.split('.').pop() || 'jpg';
        const objKey = `topup-${botUserId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(
          objKey, new Uint8Array(bytes), { contentType: `image/${ext}`, upsert: false },
        );
        if (!upErr) screenshotUrl = objKey;
      }
    } catch (e) { console.error('topup proof upload failed', e); }
  }
  const { data: w } = await supabase.from('wallets').select('id, network').eq('is_active', true).limit(1).maybeSingle();
  await supabase.from('wallet_topups').insert({
    bot_user_id: botUserId,
    wallet_id: (w as any)?.id ?? null,
    network: (w as any)?.network ?? 'USDT_TRC20',
    amount: 0,
    tx_hash: opts.text ?? null,
    screenshot_url: screenshotUrl,
    status: 'pending',
  });
  await setFlowAction(botUserId, null);
  const edited = await navigateTo({ botUserId, chatId, state: { screen: 'deposit_received' }, replace: true });
  if (!edited) {
    await sendMessage(chatId, `${await e('status_success', '✅')} ${t(lang, 'deposit_received')}`, { reply_markup: await backMenu(lang) });
  }
}

// Premium button icons are added when Telegram supports them; gateway retries safely without icons otherwise.


async function renderCategories(): Promise<RenderedView> {
  const { data } = await db().from('categories')
    .select('id, name, slug, icon_emoji, premium_emoji_id').eq('is_active', true).order('sort_order');
  const cats = data ?? [];
  const categoryLines = await Promise.all(cats.map(async (c: any) => (
    `${await categoryEmoji(c)} <b>${escapeHtml(c.name)}</b>`
  )));
  const categoryRows = await Promise.all(cats.map(async (c: any) => [await categoryBtn(c)]));
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...categoryRows,
      await navRow(),
    ],
  };
  const text = categoryLines.length
    ? `${await e('menu_categories', '🗂')}  <b>Categories</b>\n\n${categoryLines.join('\n')}\n\nChoose a category below:`
    : `${await e('menu_categories', '🗂')}  <b>Categories</b>\n\nNo categories available yet.`;
  return { text, reply_markup: kb };
}

async function renderCategoryProducts(categoryId: string): Promise<RenderedView> {
  const supabase = db();
  const [{ data: cat }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('name, slug, icon_emoji, premium_emoji_id').eq('id', categoryId).maybeSingle(),
    supabase.from('products').select('id, name, price, fallback_emoji, premium_emoji_id, stock')
      .eq('category_id', categoryId).eq('status', 'active').order('sort_order').limit(50),
  ]);
  const items = prods ?? [];
  const productLines = await Promise.all(items.map(async (p: any) => (
    `${await productEmoji(p)} <b>${escapeHtml(p.name)}</b> — <b>$${p.price}</b>${p.stock <= 0 ? ' · sold out' : ''}`
  )));
  const productRows = await Promise.all(items.map(async (p: any) => {
    const label = `${p.name} — $${p.price}${p.stock <= 0 ? ' (sold out)' : ''}`;
    return [await mkEmojiBtn(p.fallback_emoji || '✨', label, { callback_data: `prod:${p.id}` }, p.premium_emoji_id)];
  }));
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...productRows,
      await navRow(),
    ],
  };
  const header = `${cat ? await categoryEmoji(cat) : await e('category_default', '📦')} <b>${escapeHtml(cat?.name || 'Products')}</b>`;
  const text = items.length ? `${header}\n\n${productLines.join('\n')}\n\nTap a product below for details:` : `${header}\n\nNo products available yet.`;
  return { text, reply_markup: kb };
}


async function renderProduct(productId: string): Promise<RenderedView> {
  const { data: p } = await db().from('products').select('*, categories(name, icon_emoji)').eq('id', productId).maybeSingle();
  if (!p) return { text: `${await e('status_error', '⚠️')} Product not found.`, reply_markup: await backMenu() };
  const emoji = await productEmoji(p);
  const [stockIcon, outStock, priceIcon, durationIcon, tagIcon] = await Promise.all([
    e('stock', '📦'),
    e('status_rejected', '⛔'),
    e('price', '💵'),
    e('duration', '📅'),
    e('tag', '🏷'),
  ]);
  const stockLine = p.stock > 0 ? `${stockIcon} In stock (${p.stock})` : `${outStock} Out of stock`;
  const tagLine = (p.tags?.length) ? `\n${tagIcon} ${p.tags.map((t: string) => `<code>${escapeHtml(t)}</code>`).join(' ')}` : '';
  const text =
    `${emoji}  <b>${escapeHtml(p.name)}</b>\n\n` +
    `${escapeHtml(p.description || '')}\n\n` +
    `${priceIcon} <b>$${p.price}</b>\n${durationIcon} ${p.duration_days} days\n${stockLine}${tagLine}`;
  const buy = await mkBtn('action_buy', '🛒', `Buy now — $${p.price}`, { callback_data: `buy:${p.id}` });
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...(p.stock > 0 ? [[buy]] : []),
      await navRow(),
    ],
  };
  return { text, reply_markup: kb };
}

/* ─── crypto checkout ─────────────────────────────────────────── */
async function renderBuyNetworks(productId: string): Promise<RenderedView> {
  const { data: p } = await db().from('products').select('name, price, stock, status').eq('id', productId).maybeSingle();
  if (!p || p.status !== 'active' || p.stock <= 0) {
    return { text: `${await e('status_error', '⚠️')} This product is unavailable.`, reply_markup: await backMenu() };
  }
  const { data: wallets } = await db().from('wallets').select('id, network').eq('is_active', true);
  const have = new Set((wallets ?? []).map((w: any) => w.network));
  const rows: InlineKeyboard['inline_keyboard'] = [];
  for (const net of ['USDT_TRC20', 'USDT_BEP20', 'SOL'] as Network[]) {
    if (!have.has(net)) continue;
    rows.push([await mkBtn(NETWORK_KEY[net], '💠', `Pay with ${NETWORK_LABEL[net]}`, { callback_data: `pay:${net}:${productId}` })]);
  }
  if (rows.length === 0) {
    return { text: `${await e('status_error', '⚠️')} No payment networks configured. Contact support.`, reply_markup: await backMenu() };
  }
  rows.push(await navRow());

  return { text: `${await e('payment', '💳')} <b>Choose a payment network</b>\n\n` +
    `<b>${escapeHtml(p.name)}</b>\nAmount: <b>$${p.price}</b>\n\n` +
    `Pick the crypto network you'd like to pay with. After paying, send your transaction hash or screenshot here for verification.`,
    reply_markup: { inline_keyboard: rows } };
}

async function renderPayment(productId: string, network: Network, botUserId: string, cbId?: string): Promise<RenderedView> {
  const supabase = db();
  const activePayment = await getFlowAction<{
    type?: string;
    payment_id?: string;
    order_id?: string;
    product_id?: string;
    network?: Network;
  }>(botUserId);

  let row: any = null;
  let wallet: any = null;

  if (activePayment?.type === 'payment_proof' && activePayment.payment_id && activePayment.product_id === productId && activePayment.network === network) {
    const { data: payment } = await supabase.from('payments')
      .select('id, amount, network, order_id, wallet_id')
      .eq('id', activePayment.payment_id).maybeSingle();
    if (payment) {
      const [{ data: order }, { data: savedWallet }] = await Promise.all([
        supabase.from('orders').select('id, products(name)').eq('id', payment.order_id).maybeSingle(),
        supabase.from('wallets').select('id, address, qr_url, label').eq('id', payment.wallet_id).maybeSingle(),
      ]);
      wallet = savedWallet;
      row = {
        payment_id: payment.id,
        order_id: payment.order_id,
        product_name: (order as any)?.products?.name ?? 'Product',
        amount: payment.amount,
      };
    }
  }

  if (!row) {
    const { data: selectedWallet } = await supabase.from('wallets')
      .select('id, address, qr_url, label').eq('network', network).eq('is_active', true).limit(1).maybeSingle();
    wallet = selectedWallet;
    if (!wallet) return { text: `${await e('status_error', '⚠️')} No wallet configured for this network.`, reply_markup: await backMenu() };

    const { data, error } = await supabase.rpc('create_pending_order', {
      _product_id: productId, _bot_user_id: botUserId, _network: network, _wallet_id: wallet.id,
    });
    row = Array.isArray(data) ? data[0] : data;
    if (error || !row || row.error) {
        const msg = row?.error === 'out_of_stock' ? 'Out of stock'
        : row?.error === 'inactive' ? 'Product unavailable'
        : row?.error === 'wallet_unavailable' ? 'Wallet not available'
        : 'Could not start payment';
      if (cbId) await answerCallback(cbId, msg, true);
      return { text: `${await e('status_error', '⚠️')} ${escapeHtml(msg)}`, reply_markup: await backMenu() };
    }
    if (cbId) await answerCallback(cbId, 'Order created');
    await setFlowAction(botUserId, {
      type: 'payment_proof',
      payment_id: row.payment_id,
      order_id: row.order_id,
      product_id: productId,
      network,
    });
  }
  if (!wallet) return { text: `${await e('status_error', '⚠️')} Wallet details are unavailable.`, reply_markup: await backMenu() };

  const pending = await e('status_pending', '⏳');
  const qrLine = wallet.qr_url ? `\nQR: ${escapeHtml(wallet.qr_url)}\n` : '\n';
  const text =
    `${pending}  <b>Payment Instructions</b>\n\n` +
    `Product: <b>${escapeHtml(row.product_name)}</b>\n` +
    `Order: <code>${String(row.order_id).slice(0, 8)}</code>\n` +
    `Network: <b>${NETWORK_LABEL[network]}</b>\n` +
    `Amount: <b>$${row.amount}</b>\n\n` +
    `Send the <b>exact amount</b> to:\n<code>${escapeHtml(wallet.address)}</code>${qrLine}\n` +
    `Then reply here with your <b>transaction hash</b> or <b>screenshot</b> of the payment. ` +
    `Tap "I have paid" once submitted.`;
  const kb: InlineKeyboard = {
    inline_keyboard: [
      [await mkBtn('action_paid', '✅', 'I have paid', { callback_data: `paid:${row.payment_id}` })],
      await navRow(),
    ],
  };
  return { text, reply_markup: kb };
}

/* ─── orders / profile / referrals / support / search ────────── */
async function renderOrders(botUserId: string): Promise<RenderedView> {
  const { data } = await db().from('orders')
    .select('id, amount, status, created_at, products(name, fallback_emoji, premium_emoji_id), payments(network, status)')
    .eq('bot_user_id', botUserId).order('created_at', { ascending: false }).limit(10);
  const rows = (data ?? []) as any[];
  const lines = rows.length
    ? (await Promise.all(rows.map(async (o) => {
        const d = new Date(o.created_at).toLocaleDateString();
        const pay = o.payments?.[0];
        const payLine = pay ? ` · ${pay.network} ${pay.status}` : '';
        return `${await productEmoji(o.products ?? {})} <b>${escapeHtml(o.products?.name || 'Product')}</b> — $${o.amount} · ${o.status}${payLine} · ${d}`;
      }))).join('\n')
    : 'You have no orders yet.';
  return { text: `${await e('menu_orders', '🧾')} <b>Your orders</b>\n\n${lines}`, reply_markup: await backMenu() };
}

async function renderProfile(botUserId: string): Promise<RenderedView> {
  const { data: u } = await db().from('bot_users')
    .select('first_name, username, joined_at, total_spent, is_subscribed, referral_code').eq('id', botUserId).maybeSingle();
  if (!u) return { text: `${await e('status_error', '⚠️')} Profile not found.`, reply_markup: await backMenu() };
  const [sub, free] = await Promise.all([e('subscription', '⭐'), e('status_free', '⚪')]);
  return { text: `${await e('menu_profile', '👤')} <b>Your Profile</b>\n\n` +
    `Name: ${escapeHtml(u.first_name || '—')}\n` +
    `Username: @${escapeHtml(u.username || '—')}\n` +
    `Joined: ${new Date(u.joined_at).toLocaleDateString()}\n` +
    `Total spent: $${u.total_spent}\n` +
    `Status: ${u.is_subscribed ? `${sub} Active` : `${free} Free`}\n` +
    `Referral code: <code>${u.referral_code}</code>`,
    reply_markup: await backMenu() };
}

async function renderReferrals(botUserId: string): Promise<RenderedView> {
  const supabase = db();
  const [{ data: u }, { count }, settings] = await Promise.all([
    supabase.from('bot_users').select('referral_code').eq('id', botUserId).maybeSingle(),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_bot_user_id', botUserId),
    getSettings(),
  ]);
  const username = settings.bot_username;
  const link = username
    ? `https://t.me/${username.replace(/^@/, '')}?start=${u?.referral_code}`
    : `Share your code: ${u?.referral_code}`;
  return { text: `${await e('menu_referrals', '🎁')} <b>Referrals</b>\n\nInvite friends and earn rewards on every paid order.\n\n` +
    `Your code: <code>${u?.referral_code}</code>\nInvited: <b>${count ?? 0}</b>\n\n` +
    (username ? `Share link:\n${link}` : `<i>${link}</i>`),
    reply_markup: await backMenu() };
}

async function renderSupport(botUserId: string): Promise<RenderedView> {
  await setFlowAction(botUserId, { type: 'support_message' });
  const s = await getSettings();
  return { text: `${await e('menu_support', '💬')} <b>Support</b>\n\nSend your message in the next reply and our team will respond. You can also reach us at ${escapeHtml(s.support_handle || '@support')}.`,
    reply_markup: await backMenu() };
}

async function renderSearchPrompt(botUserId: string): Promise<RenderedView> {
  await setFlowAction(botUserId, { type: 'search' });
  return { text: `${await e('menu_search', '🔎')} <b>Search</b>\n\nSend a keyword (e.g. <i>netflix</i>, <i>chatgpt</i>).`,
    reply_markup: await backMenu() };
}

async function renderSearchResults(query: string): Promise<RenderedView> {
  const q = `%${query.replace(/[%_]/g, '')}%`;
  const { data } = await db().from('products')
    .select('id, name, price, fallback_emoji, premium_emoji_id, stock')
    .or(`name.ilike.${q},description.ilike.${q}`).eq('status', 'active').limit(20);
  const items = data ?? [];
  const resultLines = await Promise.all(items.map(async (p: any) => `${await productEmoji(p)} <b>${escapeHtml(p.name)}</b> — <b>$${p.price}</b>`));
  const productRows = await Promise.all(items.map(async (p: any) => {
    const label = `${p.name} — $${p.price}`;
    return [await mkEmojiBtn(p.fallback_emoji || '✨', label, { callback_data: `prod:${p.id}` }, p.premium_emoji_id)];
  }));
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...productRows,
      await navRow(),
    ],
  };
  return { text: items.length ? `${await e('menu_search', '🔎')} Results for "<b>${escapeHtml(query)}</b>":\n\n${resultLines.join('\n')}\n\nChoose a product below:`
      : `${await e('status_error', '⚠️')} No matches for "<b>${escapeHtml(query)}</b>".`,
    reply_markup: kb };
}

async function renderView(state: NavState, botUserId: string, name?: string): Promise<RenderedView> {
  if (!['support', 'search', 'payment', 'proof'].includes(state.screen)) {
    await setFlowAction(botUserId, null);
  }

  switch (state.screen) {
    case 'home': return renderHome(name);
    case 'categories': return renderCategories();
    case 'category': return renderCategoryProducts(state.params?.categoryId ?? '');
    case 'product': return renderProduct(state.params?.productId ?? '');
    case 'buy': return renderBuyNetworks(state.params?.productId ?? '');
    case 'payment': return renderPayment(state.params?.productId ?? '', state.params?.network as Network, botUserId);
    case 'proof': return {
      text: `${await e('status_pending', '⏳')} <b>Payment proof</b>\n\nPlease reply with your <b>transaction hash</b> or send a <b>screenshot</b> of the payment.`,
      reply_markup: await backMenu(),
    };
    case 'payment_review': return {
      text: `${await e('status_pending', '⏳')} <b>Payment under review</b>\n\nWe received your proof. An admin will verify shortly and update your order.`,
      reply_markup: await backMenu(),
    };
    case 'orders': return renderOrders(botUserId);
    case 'profile': return renderProfile(botUserId);
    case 'referrals': return renderReferrals(botUserId);
    case 'support': return renderSupport(botUserId);
    case 'support_received': return {
      text: `${await e('status_success', '✅')} <b>Message received</b>\n\nOur team will reply here soon.`,
      reply_markup: await backMenu(),
    };
    case 'search': return renderSearchPrompt(botUserId);
    case 'search_results': return renderSearchResults(state.params?.query ?? '');
    default: return renderHome(name);
  }
}

async function navigateTo(args: {
  botUserId: string;
  chatId: number;
  messageId?: number;
  callbackMessage?: any;
  state: NavState;
  name?: string;
  reset?: boolean;
  replace?: boolean;
  allowNewMessage?: boolean;
  forceNewMessage?: boolean;
}) {
  return showView({
    botUserId: args.botUserId,
    chatId: args.chatId,
    messageId: args.messageId,
    callbackMessage: args.callbackMessage,
    state: args.state,
    reset: args.reset,
    replace: args.replace,
    allowNewMessage: args.allowNewMessage,
    forceNewMessage: args.forceNewMessage,
    renderView: (state) => renderView(state, args.botUserId, args.name),
  });
}


async function captureSupportMessage(chatId: number, botUserId: string, body: string) {
  const supabase = db();
  const { data: open } = await supabase.from('support_tickets')
    .select('id').eq('bot_user_id', botUserId).eq('status', 'open').maybeSingle();
  let ticketId = open?.id as string | undefined;
  if (!ticketId) {
    const { data: t } = await supabase.from('support_tickets')
      .insert({ bot_user_id: botUserId, subject: body.slice(0, 80), last_message: body }).select('id').single();
    ticketId = t!.id as string;
  } else {
    await supabase.from('support_tickets').update({ last_message: body, updated_at: new Date().toISOString() }).eq('id', ticketId);
  }
  await supabase.from('support_messages').insert({ ticket_id: ticketId, from_admin: false, body });
  await setFlowAction(botUserId, null);
  const edited = await navigateTo({ botUserId, chatId, state: { screen: 'support_received' }, replace: true });
  if (!edited) {
    await sendMessage(chatId, `${await e('status_success', '✅')} Got it — our team will reply here.`, { reply_markup: await backMenu() });
  }
}

/* ─── payment proof capture (text or photo) ───────────────────── */
async function capturePaymentProof(
  chatId: number, botUserId: string, paymentId: string, opts: { text?: string; photoFileId?: string },
) {
  const supabase = db();
  let screenshotUrl: string | null = null;
  if (opts.photoFileId) {
    try {
      const f = await getFile(opts.photoFileId);
      const filePath = f?.result?.file_path as string | undefined;
      if (filePath) {
        const bytes = await downloadFile(filePath);
        const ext = filePath.split('.').pop() || 'jpg';
        const objKey = `${paymentId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(
          objKey, new Uint8Array(bytes), { contentType: `image/${ext}`, upsert: false },
        );
        if (!upErr) screenshotUrl = objKey;
      }
    } catch (e) { console.error('proof upload failed', e); }
  }
  await supabase.rpc('submit_payment_proof', {
    _payment_id: paymentId,
    _tx_hash: opts.text ?? null,
    _screenshot_url: screenshotUrl,
  });
  await setFlowAction(botUserId, null);
  const edited = await navigateTo({ botUserId, chatId, state: { screen: 'payment_review' }, replace: true });
  if (!edited) {
    await sendMessage(chatId,
      `${await e('status_pending', '⏳')} <b>Payment under review</b>\n\nWe received your proof. An admin will verify shortly and update your order.`,
      { reply_markup: await backMenu() });
  }
}

/* ─── entry points ────────────────────────────────────────────── */
export async function handleMessage(message: any) {
  if (!message?.from?.id || !message?.chat?.id) return;
  const chatId = message.chat.id;
  const text: string = message.text ?? message.caption ?? '';
  const startPayload = text.startsWith('/start') ? text.split(' ')[1] : undefined;
  const botUserId = await upsertBotUser(message.from, startPayload);

  const pending = await getFlowAction<{ type?: string; payment_id?: string }>(botUserId);

  // Photo upload → if user is in payment_proof mode, treat as proof
  if (message.photo?.length && pending?.type === 'payment_proof' && pending.payment_id) {
    const largest = message.photo[message.photo.length - 1];
    await capturePaymentProof(chatId, botUserId, pending.payment_id, { photoFileId: largest.file_id, text: text || undefined });
    return;
  }

  if (pending?.type && !text.startsWith('/')) {
    if (pending.type === 'search') {
      await setFlowAction(botUserId, null);
      await navigateTo({ botUserId, chatId, state: { screen: 'search_results', params: { query: text } }, replace: true }); return;
    }
    if (pending.type === 'support_message') { await captureSupportMessage(chatId, botUserId, text); return; }
    if (pending.type === 'payment_proof' && pending.payment_id && text) {
      await capturePaymentProof(chatId, botUserId, pending.payment_id, { text }); return;
    }
  }

  if (text.startsWith('/start')) {
    await playStartIntro(chatId);
    await navigateTo({ botUserId, chatId, state: { screen: 'home' }, name: message.from.first_name, reset: true, forceNewMessage: true });
    return;
  }
  if (text.startsWith('/menu')) { await navigateTo({ botUserId, chatId, state: { screen: 'home' }, name: message.from.first_name, reset: true, forceNewMessage: true }); return; }
  if (text.startsWith('/categories')) { await navigateTo({ botUserId, chatId, state: { screen: 'categories' }, forceNewMessage: true }); return; }
  if (text.startsWith('/orders')) { await navigateTo({ botUserId, chatId, state: { screen: 'orders' }, forceNewMessage: true }); return; }
  if (text.startsWith('/profile')) { await navigateTo({ botUserId, chatId, state: { screen: 'profile' }, forceNewMessage: true }); return; }
  if (text.startsWith('/referrals')) { await navigateTo({ botUserId, chatId, state: { screen: 'referrals' }, forceNewMessage: true }); return; }
  if (text.startsWith('/support')) { await navigateTo({ botUserId, chatId, state: { screen: 'support' }, forceNewMessage: true }); return; }
  if (text.startsWith('/search')) {
    const q = text.slice(7).trim();
    if (q) await navigateTo({ botUserId, chatId, state: { screen: 'search_results', params: { query: q } }, forceNewMessage: true });
    else await navigateTo({ botUserId, chatId, state: { screen: 'search' }, forceNewMessage: true });
    return;
  }
  await navigateTo({ botUserId, chatId, state: { screen: 'home' }, name: message.from.first_name, reset: true, forceNewMessage: true });
}

export async function handleCallback(cb: any) {
  if (!cb?.from?.id || !cb?.message?.chat?.id) return;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data: string = cb.data ?? '';
  const botUserId = await upsertBotUser(cb.from);

  if (data === 'nav:close') { await answerCallback(cb.id); await closeView(botUserId, chatId, messageId); return; }
  if (data === 'nav:back') {
    await answerCallback(cb.id);
    await goBack({
      botUserId,
      chatId,
      messageId,
      callbackMessage: cb.message,
      fallback: { screen: 'home' },
      renderView: (state) => renderView(state, botUserId, cb.from.first_name),
    });
    return;
  }
  if (data === 'menu:home') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'home' }, name: cb.from.first_name, reset: true }); return; }
  if (data === 'menu:cats') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'categories' } }); return; }
  if (data === 'menu:search') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'search' } }); return; }
  if (data === 'menu:orders') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'orders' } }); return; }
  if (data === 'menu:profile') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'profile' } }); return; }
  if (data === 'menu:ref') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'referrals' } }); return; }
  if (data === 'menu:support') { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'support' } }); return; }

  if (data.startsWith('cat:')) { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'category', params: { categoryId: data.slice(4) } } }); return; }
  if (data.startsWith('prod:')) { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'product', params: { productId: data.slice(5) } } }); return; }
  if (data.startsWith('buy:')) { await answerCallback(cb.id); await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'buy', params: { productId: data.slice(4) } } }); return; }
  if (data.startsWith('pay:')) {
    const [, net, prodId] = data.split(':');
    await answerCallback(cb.id);
    await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'payment', params: { productId: prodId, network: net } } });
    return;
  }
  if (data.startsWith('paid:')) {
    await answerCallback(cb.id, 'Send your tx hash or screenshot now.');
    const currentPayment = await getFlowAction<Record<string, unknown>>(botUserId);
    await setFlowAction(botUserId, { ...(currentPayment ?? {}), type: 'payment_proof', payment_id: data.slice(5) });
    await navigateTo({ botUserId, chatId, messageId, callbackMessage: cb.message, state: { screen: 'proof', params: { paymentId: data.slice(5) } }, replace: true });
    return;
  }
  await answerCallback(cb.id);
}

/* ─── notify user when admin reviews payment ──────────────────── */
export async function notifyPaymentReviewed(paymentId: string, approved: boolean, note?: string) {
  const supabase = db();
  const { data } = await supabase.from('payments')
    .select('amount, network, order_id, bot_users(telegram_id), orders(products(name))')
    .eq('id', paymentId).single();
  if (!data) return;
  const chatId = (data as any).bot_users?.telegram_id;
  if (!chatId) return;
  const productName = (data as any).orders?.products?.name ?? 'order';
  if (approved) {
    await sendMessage(chatId,
      `${await e('status_success', '🎉')} <b>Payment approved!</b>\n\n` +
      `${escapeHtml(productName)} — $${(data as any).amount}\n\n` +
      `Your subscription is now active. ${note ? `\n<i>${escapeHtml(note)}</i>` : ''}`);
  } else {
    await sendMessage(chatId,
      `${await e('status_rejected', '❌')} <b>Payment rejected</b>\n\n` +
      `${escapeHtml(productName)} — $${(data as any).amount}\n` +
      `${note ? `Reason: ${escapeHtml(note)}\n` : ''}\nContact support if you believe this is an error.`);
  }
}

export async function syncBotUsername() {
  try {
    const me = await getMe();
    const username = me?.result?.username;
    if (username) await db().from('settings').update({ bot_username: username }).eq('id', 1);
  } catch (e) { console.error('syncBotUsername failed', e); }
}

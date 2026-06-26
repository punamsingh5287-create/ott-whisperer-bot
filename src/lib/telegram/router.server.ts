import { db } from './db.server';
import {
  sendMessage, sendPhoto, editMessage, answerCallback, getMe, getFile, downloadFile,
  type InlineKeyboard,
} from './gateway.server';
import { renderEmoji, escapeHtml, e, mkBtn } from './emoji';

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

/* ─── user upsert ─────────────────────────────────────────────── */
function genReferralCode(telegramId: number) { return `R${telegramId.toString(36).toUpperCase()}`; }

async function upsertBotUser(from: TgUser, startPayload?: string): Promise<string> {
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
  }).select('id').single();
  if (error) throw error;
  if (referredBy) {
    await supabase.from('referrals').insert({
      referrer_bot_user_id: referredBy, referred_bot_user_id: inserted.id,
    });
  }
  return inserted.id as string;
}

async function getSettings() {
  const { data } = await db().from('settings').select('*').eq('id', 1).maybeSingle();
  return data ?? { welcome_text: 'Welcome!', support_handle: '@support', site_name: 'OTT Store', bot_username: null };
}

/* ─── menus ───────────────────────────────────────────────────── */
async function mainMenu(): Promise<InlineKeyboard> {
  const [cats, search, orders, profile, ref, support, home] = await Promise.all([
    mkBtn('menu_categories', '🗂', 'Categories', { callback_data: 'menu:cats' }),
    mkBtn('menu_search', '🔎', 'Search', { callback_data: 'menu:search' }),
    mkBtn('menu_orders', '🧾', 'My Orders', { callback_data: 'menu:orders' }),
    mkBtn('menu_profile', '👤', 'Profile', { callback_data: 'menu:profile' }),
    mkBtn('menu_referrals', '🎁', 'Referrals', { callback_data: 'menu:ref' }),
    mkBtn('menu_support', '💬', 'Support', { callback_data: 'menu:support' }),
    mkBtn('menu_home', '🏠', 'Home', { callback_data: 'menu:home' }),
  ]);
  return { inline_keyboard: [[cats, search], [orders, profile], [ref, support], [home]] };
}

async function backMenu(): Promise<InlineKeyboard> {
  const back = await mkBtn('menu_back', '«', 'Back to menu', { callback_data: 'menu:home' });
  return { inline_keyboard: [[back]] };
}


/* ─── views ───────────────────────────────────────────────────── */
async function viewHome(chatId: number, name?: string) {
  const s = await getSettings();
  const welcome = await e('welcome', '✨');
  const greet = name ? `, <b>${escapeHtml(name)}</b>` : '';
  const text =
    `${welcome}  <b>${escapeHtml(s.site_name || s.bot_name || 'OTT & AI Store')}</b>\n\n` +
    `Hey${greet}! ${escapeHtml(s.welcome_text || '')}\n\n` +
    `Browse premium <b>OTT</b>, <b>AI</b>, <b>Gaming</b> & <b>Utility</b> subscriptions. Instant delivery, crypto-friendly checkout.`;
  await sendMessage(chatId, text, { reply_markup: await mainMenu() });
}

function rowIcon(row: { premium_emoji_id?: string | null }): { icon_custom_emoji_id?: string } {
  const id = row.premium_emoji_id ? String(row.premium_emoji_id).replace(/[^0-9]/g, '') : '';
  return id ? { icon_custom_emoji_id: id } : {};
}

async function viewCategories(chatId: number, messageId?: number) {
  const { data } = await db().from('categories')
    .select('id, name, icon_emoji, premium_emoji_id').eq('is_active', true).order('sort_order');
  const cats = data ?? [];
  const back = await mkBtn('menu_back', '«', 'Back', { callback_data: 'menu:home' });
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...cats.map((c: any) => {
        const icon = rowIcon(c);
        const text = icon.icon_custom_emoji_id ? c.name : `${c.icon_emoji || '📦'}  ${c.name}`;
        return [{ text, callback_data: `cat:${c.id}`, ...icon }];
      }),
      [back],
    ],
  };
  const text = `${await e('menu_categories', '🗂')}  <b>Categories</b>\n\nChoose a category to browse:`;
  if (messageId) await editMessage(chatId, messageId, text, kb);
  else await sendMessage(chatId, text, { reply_markup: kb });
}

async function viewCategoryProducts(chatId: number, categoryId: string, messageId?: number) {
  const supabase = db();
  const [{ data: cat }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('name, icon_emoji').eq('id', categoryId).maybeSingle(),
    supabase.from('products').select('id, name, price, fallback_emoji, premium_emoji_id, stock')
      .eq('category_id', categoryId).eq('status', 'active').order('sort_order').limit(50),
  ]);
  const items = prods ?? [];
  const back = await mkBtn('menu_back', '«', 'Back', { callback_data: 'menu:cats' });
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...items.map((p: any) => {
        const icon = rowIcon(p);
        const label = `${p.name} — $${p.price}${p.stock <= 0 ? ' (sold out)' : ''}`;
        const text = icon.icon_custom_emoji_id ? label : `${p.fallback_emoji || '✨'}  ${label}`;
        return [{ text, callback_data: `prod:${p.id}`, ...icon }];
      }),
      [back],
    ],
  };
  const header = `${cat?.icon_emoji || '📦'} <b>${escapeHtml(cat?.name || 'Products')}</b>`;
  const text = items.length ? `${header}\n\nTap a product for details:` : `${header}\n\nNo products available yet.`;
  if (messageId) await editMessage(chatId, messageId, text, kb);
  else await sendMessage(chatId, text, { reply_markup: kb });
}


async function viewProduct(chatId: number, productId: string) {
  const { data: p } = await db().from('products').select('*, categories(name, icon_emoji)').eq('id', productId).maybeSingle();
  if (!p) { await sendMessage(chatId, `${await e('status_error', '⚠️')} Product not found.`, { reply_markup: await backMenu() }); return; }
  const emoji = renderEmoji(p.premium_emoji_id, p.fallback_emoji);
  const stockLine = p.stock > 0 ? `✅ In stock (${p.stock})` : `⛔ Out of stock`;
  const tagLine = (p.tags?.length) ? `\n🏷 ${p.tags.map((t: string) => `<code>${escapeHtml(t)}</code>`).join(' ')}` : '';
  const caption =
    `${emoji}  <b>${escapeHtml(p.name)}</b>\n\n` +
    `${escapeHtml(p.description || '')}\n\n` +
    `💰 <b>$${p.price}</b>\n⏳ ${p.duration_days} days\n${stockLine}${tagLine}`;
  const buy = await mkBtn('action_buy', '🛒', `Buy now — $${p.price}`, { callback_data: `buy:${p.id}` });
  const back = await mkBtn('menu_back', '«', 'Back', { callback_data: p.category_id ? `cat:${p.category_id}` : 'menu:cats' });
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...(p.stock > 0 ? [[buy]] : []),
      [back],
    ],
  };

  if (p.image_url) await sendPhoto(chatId, p.image_url, caption, kb);
  else await sendMessage(chatId, caption, { reply_markup: kb });
}

/* ─── crypto checkout ─────────────────────────────────────────── */
async function viewBuyNetworks(chatId: number, productId: string) {
  const { data: p } = await db().from('products').select('name, price, stock, status').eq('id', productId).maybeSingle();
  if (!p || p.status !== 'active' || p.stock <= 0) {
    await sendMessage(chatId, `${await e('status_error', '⚠️')} This product is unavailable.`, { reply_markup: await backMenu() });
    return;
  }
  const { data: wallets } = await db().from('wallets').select('id, network').eq('is_active', true);
  const have = new Set((wallets ?? []).map((w: any) => w.network));
  const rows: InlineKeyboard['inline_keyboard'] = [];
  for (const net of ['USDT_TRC20', 'USDT_BEP20', 'SOL'] as Network[]) {
    if (!have.has(net)) continue;
    rows.push([await mkBtn(NETWORK_KEY[net], '💠', `Pay with ${NETWORK_LABEL[net]}`, { callback_data: `pay:${net}:${productId}` })]);
  }
  if (rows.length === 0) {
    await sendMessage(chatId, `${await e('status_error', '⚠️')} No payment networks configured. Contact support.`, { reply_markup: await backMenu() });
    return;
  }
  rows.push([await mkBtn('menu_back', '«', 'Cancel', { callback_data: `prod:${productId}` })]);

  await sendMessage(chatId,
    `💳 <b>Choose a payment network</b>\n\n` +
    `<b>${escapeHtml(p.name)}</b>\nAmount: <b>$${p.price}</b>\n\n` +
    `Pick the crypto network you'd like to pay with. After paying, send your transaction hash or screenshot here for verification.`,
    { reply_markup: { inline_keyboard: rows } });
}

async function startPayment(chatId: number, botUserId: string, productId: string, network: Network, cbId: string) {
  const supabase = db();
  const { data: wallet } = await supabase.from('wallets')
    .select('id, address, qr_url, label').eq('network', network).eq('is_active', true).limit(1).maybeSingle();
  if (!wallet) { await answerCallback(cbId, 'No wallet configured for this network.', true); return; }

  const { data, error } = await supabase.rpc('create_pending_order', {
    _product_id: productId, _bot_user_id: botUserId, _network: network, _wallet_id: wallet.id,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || row.error) {
    const msg = row?.error === 'out_of_stock' ? 'Out of stock 😔'
      : row?.error === 'inactive' ? 'Product unavailable'
      : row?.error === 'wallet_unavailable' ? 'Wallet not available'
      : 'Could not start payment';
    await answerCallback(cbId, msg, true); return;
  }
  await answerCallback(cbId, '✅ Order created');
  await supabase.from('bot_users').update({
    pending_action: { type: 'payment_proof', payment_id: row.payment_id, order_id: row.order_id },
  }).eq('id', botUserId);

  const pending = await e('status_pending', '⏳');
  const caption =
    `${pending}  <b>Payment Instructions</b>\n\n` +
    `Product: <b>${escapeHtml(row.product_name)}</b>\n` +
    `Order: <code>${String(row.order_id).slice(0, 8)}</code>\n` +
    `Network: <b>${NETWORK_LABEL[network]}</b>\n` +
    `Amount: <b>$${row.amount}</b>\n\n` +
    `Send the <b>exact amount</b> to:\n<code>${escapeHtml(wallet.address)}</code>\n\n` +
    `Then reply here with your <b>transaction hash</b> or <b>screenshot</b> of the payment. ` +
    `Tap "I have paid" once submitted.`;
  const kb: InlineKeyboard = {
    inline_keyboard: [
      [await mkBtn('action_paid', '✅', 'I have paid', { callback_data: `paid:${row.payment_id}` })],
      [await mkBtn('menu_back', '«', 'Cancel', { callback_data: 'menu:home' })],
    ],
  };

  if (wallet.qr_url) await sendPhoto(chatId, wallet.qr_url, caption, kb);
  else await sendMessage(chatId, caption, { reply_markup: kb });
}

/* ─── orders / profile / referrals / support / search ────────── */
async function viewOrders(chatId: number, botUserId: string) {
  const { data } = await db().from('orders')
    .select('id, amount, status, created_at, products(name, fallback_emoji), payments(network, status)')
    .eq('bot_user_id', botUserId).order('created_at', { ascending: false }).limit(10);
  const rows = (data ?? []) as any[];
  const lines = rows.length
    ? rows.map((o) => {
        const d = new Date(o.created_at).toLocaleDateString();
        const pay = o.payments?.[0];
        const payLine = pay ? ` · ${pay.network} ${pay.status}` : '';
        return `${o.products?.fallback_emoji || '🧾'} <b>${escapeHtml(o.products?.name || 'Product')}</b> — $${o.amount} · ${o.status}${payLine} · ${d}`;
      }).join('\n')
    : 'You have no orders yet.';
  await sendMessage(chatId, `${await e('menu_orders', '🧾')} <b>Your orders</b>\n\n${lines}`, { reply_markup: await backMenu() });
}

async function viewProfile(chatId: number, botUserId: string) {
  const { data: u } = await db().from('bot_users')
    .select('first_name, username, joined_at, total_spent, is_subscribed, referral_code').eq('id', botUserId).maybeSingle();
  if (!u) return;
  const sub = await e('subscription', '⭐');
  await sendMessage(chatId,
    `${await e('menu_profile', '👤')} <b>Your Profile</b>\n\n` +
    `Name: ${escapeHtml(u.first_name || '—')}\n` +
    `Username: @${escapeHtml(u.username || '—')}\n` +
    `Joined: ${new Date(u.joined_at).toLocaleDateString()}\n` +
    `Total spent: $${u.total_spent}\n` +
    `Status: ${u.is_subscribed ? `${sub} Active` : '⚪ Free'}\n` +
    `Referral code: <code>${u.referral_code}</code>`,
    { reply_markup: await backMenu() });
}

async function viewReferrals(chatId: number, botUserId: string) {
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
  await sendMessage(chatId,
    `${await e('menu_referrals', '🎁')} <b>Referrals</b>\n\nInvite friends and earn rewards on every paid order.\n\n` +
    `Your code: <code>${u?.referral_code}</code>\nInvited: <b>${count ?? 0}</b>\n\n` +
    (username ? `Share link:\n${link}` : `<i>${link}</i>`),
    { reply_markup: await backMenu() });
}

async function viewSupport(chatId: number, botUserId: string) {
  await db().from('bot_users').update({ pending_action: { type: 'support_message' } }).eq('id', botUserId);
  const s = await getSettings();
  await sendMessage(chatId,
    `${await e('menu_support', '💬')} <b>Support</b>\n\nSend your message in the next reply and our team will respond. You can also reach us at ${escapeHtml(s.support_handle || '@support')}.`,
    { reply_markup: await backMenu() });
}

async function viewSearchPrompt(chatId: number, botUserId: string) {
  await db().from('bot_users').update({ pending_action: { type: 'search' } }).eq('id', botUserId);
  await sendMessage(chatId, `${await e('menu_search', '🔎')} <b>Search</b>\n\nSend a keyword (e.g. <i>netflix</i>, <i>chatgpt</i>).`,
    { reply_markup: await backMenu() });
}

async function runSearch(chatId: number, query: string) {
  const q = `%${query.replace(/[%_]/g, '')}%`;
  const { data } = await db().from('products')
    .select('id, name, price, fallback_emoji, premium_emoji_id, stock')
    .or(`name.ilike.${q},description.ilike.${q}`).eq('status', 'active').limit(20);
  const items = data ?? [];
  const back = await mkBtn('menu_back', '«', 'Menu', { callback_data: 'menu:home' });
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...items.map((p: any) => {
        const icon = rowIcon(p);
        const label = `${p.name} — $${p.price}`;
        const text = icon.icon_custom_emoji_id ? label : `${p.fallback_emoji || '✨'}  ${label}`;
        return [{ text, callback_data: `prod:${p.id}`, ...icon }];
      }),
      [back],
    ],
  };
  await sendMessage(chatId,
    items.length ? `${await e('menu_search', '🔎')} Results for "<b>${escapeHtml(query)}</b>":`
      : `${await e('status_error', '⚠️')} No matches for "<b>${escapeHtml(query)}</b>".`,
    { reply_markup: kb });
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
  await supabase.from('bot_users').update({ pending_action: null }).eq('id', botUserId);
  await sendMessage(chatId, `${await e('status_success', '✅')} Got it — our team will reply here.`, { reply_markup: await backMenu() });
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
  await supabase.from('bot_users').update({ pending_action: null }).eq('id', botUserId);
  await sendMessage(chatId,
    `${await e('status_pending', '⏳')} <b>Payment under review</b>\n\nWe received your proof. An admin will verify shortly and update your order.`,
    { reply_markup: await backMenu() });
}

/* ─── entry points ────────────────────────────────────────────── */
export async function handleMessage(message: any) {
  if (!message?.from?.id || !message?.chat?.id) return;
  const chatId = message.chat.id;
  const text: string = message.text ?? message.caption ?? '';
  const startPayload = text.startsWith('/start') ? text.split(' ')[1] : undefined;
  const botUserId = await upsertBotUser(message.from, startPayload);

  const { data: u } = await db().from('bot_users').select('pending_action').eq('id', botUserId).maybeSingle();
  const pending = u?.pending_action as { type?: string; payment_id?: string } | null;

  // Photo upload → if user is in payment_proof mode, treat as proof
  if (message.photo?.length && pending?.type === 'payment_proof' && pending.payment_id) {
    const largest = message.photo[message.photo.length - 1];
    await capturePaymentProof(chatId, botUserId, pending.payment_id, { photoFileId: largest.file_id, text: text || undefined });
    return;
  }

  if (pending?.type && !text.startsWith('/')) {
    if (pending.type === 'search') {
      await db().from('bot_users').update({ pending_action: null }).eq('id', botUserId);
      await runSearch(chatId, text); return;
    }
    if (pending.type === 'support_message') { await captureSupportMessage(chatId, botUserId, text); return; }
    if (pending.type === 'payment_proof' && pending.payment_id && text) {
      await capturePaymentProof(chatId, botUserId, pending.payment_id, { text }); return;
    }
  }

  if (text.startsWith('/start') || text.startsWith('/menu')) { await viewHome(chatId, message.from.first_name); return; }
  if (text.startsWith('/categories')) { await viewCategories(chatId); return; }
  if (text.startsWith('/orders')) { await viewOrders(chatId, botUserId); return; }
  if (text.startsWith('/profile')) { await viewProfile(chatId, botUserId); return; }
  if (text.startsWith('/referrals')) { await viewReferrals(chatId, botUserId); return; }
  if (text.startsWith('/support')) { await viewSupport(chatId, botUserId); return; }
  if (text.startsWith('/search')) {
    const q = text.slice(7).trim();
    if (q) await runSearch(chatId, q); else await viewSearchPrompt(chatId, botUserId);
    return;
  }
  await viewHome(chatId, message.from.first_name);
}

export async function handleCallback(cb: any) {
  if (!cb?.from?.id || !cb?.message?.chat?.id) return;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data: string = cb.data ?? '';
  const botUserId = await upsertBotUser(cb.from);

  if (data === 'menu:home') { await answerCallback(cb.id); await viewHome(chatId, cb.from.first_name); return; }
  if (data === 'menu:cats') { await answerCallback(cb.id); await viewCategories(chatId, messageId); return; }
  if (data === 'menu:search') { await answerCallback(cb.id); await viewSearchPrompt(chatId, botUserId); return; }
  if (data === 'menu:orders') { await answerCallback(cb.id); await viewOrders(chatId, botUserId); return; }
  if (data === 'menu:profile') { await answerCallback(cb.id); await viewProfile(chatId, botUserId); return; }
  if (data === 'menu:ref') { await answerCallback(cb.id); await viewReferrals(chatId, botUserId); return; }
  if (data === 'menu:support') { await answerCallback(cb.id); await viewSupport(chatId, botUserId); return; }

  if (data.startsWith('cat:')) { await answerCallback(cb.id); await viewCategoryProducts(chatId, data.slice(4), messageId); return; }
  if (data.startsWith('prod:')) { await answerCallback(cb.id); await viewProduct(chatId, data.slice(5)); return; }
  if (data.startsWith('buy:')) { await answerCallback(cb.id); await viewBuyNetworks(chatId, data.slice(4)); return; }
  if (data.startsWith('pay:')) {
    const [, net, prodId] = data.split(':');
    await startPayment(chatId, botUserId, prodId, net as Network, cb.id);
    return;
  }
  if (data.startsWith('paid:')) {
    await answerCallback(cb.id, 'Send your tx hash or screenshot now.');
    await sendMessage(chatId, `${await e('status_pending', '⏳')} Please reply with your <b>transaction hash</b> or send a <b>screenshot</b> of the payment.`);
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

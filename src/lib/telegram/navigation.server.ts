import { db } from './db.server';
import {
  editMessage,
  editMessageCaption,
  editMessageReplyMarkup,
  sendMessage,
  type InlineKeyboard,
} from './gateway.server';

export type NavState = {
  screen: string;
  params?: Record<string, string>;
};

export type RenderedView = {
  text: string;
  reply_markup?: InlineKeyboard;
};

type NavSession = {
  chat_id: number;
  message_id?: number;
  message_kind?: 'text' | 'media';
  current?: NavState;
  stack: NavState[];
};

type PendingState = Record<string, unknown> & { nav?: NavSession; type?: string };

type ShowViewArgs = {
  botUserId: string;
  chatId: number;
  messageId?: number;
  callbackMessage?: any;
  state: NavState;
  renderView: (state: NavState) => Promise<RenderedView>;
  reset?: boolean;
  replace?: boolean;
  allowNewMessage?: boolean;
  forceNewMessage?: boolean;
};

function isObject(value: unknown): value is PendingState {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function statesEqual(a?: NavState, b?: NavState): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function isMediaMessage(message: any): boolean {
  return Boolean(message?.photo?.length || message?.video || message?.animation || message?.document);
}

function ok(result: any): boolean {
  if (result?.ok === true) return true;
  const description = String(result?.description ?? result?.error ?? '').toLowerCase();
  return description.includes('message is not modified');
}

async function readPending(botUserId: string): Promise<PendingState> {
  const { data } = await db().from('bot_users').select('pending_action').eq('id', botUserId).maybeSingle();
  return isObject(data?.pending_action) ? data.pending_action : {};
}

async function writePending(botUserId: string, pending: PendingState) {
  await db().from('bot_users').update({ pending_action: pending }).eq('id', botUserId);
}

async function editCurrentMessage(
  chatId: number,
  messageId: number,
  messageKind: 'text' | 'media',
  view: RenderedView,
): Promise<boolean> {
  const tryText = () => editMessage(chatId, messageId, view.text, view.reply_markup);
  const tryCaption = () => editMessageCaption(chatId, messageId, view.text, view.reply_markup);
  const tryMarkup = () => editMessageReplyMarkup(chatId, messageId, view.reply_markup);

  const order = messageKind === 'media' ? [tryCaption, tryText] : [tryText, tryCaption];
  for (const attempt of order) {
    const r = await attempt();
    if (ok(r)) return true;
  }
  // Last resort: at least refresh the keyboard so the message stays in sync.
  const r = await tryMarkup();
  return ok(r);
}

export async function setFlowAction(botUserId: string, action: Record<string, unknown> | null) {
  const pending = await readPending(botUserId);
  const nav = pending.nav;
  const next: PendingState = action ? { ...action } : {};
  if (nav) next.nav = nav;
  await writePending(botUserId, next);
}

export async function getFlowAction<T extends Record<string, unknown>>(botUserId: string): Promise<T | null> {
  const pending = await readPending(botUserId);
  const { nav: _nav, ...action } = pending;
  return action.type ? (action as T) : null;
}

export async function showView(args: ShowViewArgs): Promise<boolean> {
  const [pending, view] = await Promise.all([
    readPending(args.botUserId),
    args.renderView(args.state),
  ]);
  const existing = pending.nav;
  const targetMessageId = args.messageId ?? existing?.message_id;
  const messageKind = isMediaMessage(args.callbackMessage) ? 'media' : (existing?.message_kind ?? 'text');

  let edited = false;
  let savedMessageId = targetMessageId;
  let savedKind = messageKind;

  if (targetMessageId && !args.forceNewMessage) {
    edited = await editCurrentMessage(args.chatId, targetMessageId, messageKind, view);
  }

  if (!edited && (args.allowNewMessage || args.forceNewMessage)) {
    const sent = await sendMessage(args.chatId, view.text, { reply_markup: view.reply_markup });
    if (sent?.ok && sent?.result?.message_id) {
      edited = true;
      savedMessageId = sent.result.message_id;
      savedKind = 'text';
    }
  }

  if (!edited) return false;

  const stack = args.reset
    ? []
    : (!args.replace && existing?.current && !statesEqual(existing.current, args.state))
        ? [...(existing.stack ?? []), existing.current].slice(-25)
        : (existing?.stack ?? []);

  pending.nav = {
    chat_id: args.chatId,
    message_id: savedMessageId,
    message_kind: savedKind,
    current: args.state,
    stack,
  };
  await writePending(args.botUserId, pending);
  return true;
}


export async function goBack(args: Omit<ShowViewArgs, 'state'> & { fallback: NavState }): Promise<boolean> {
  const pending = await readPending(args.botUserId);
  const nav = pending.nav;
  const stack = [...(nav?.stack ?? [])];
  const previous = stack.pop() ?? args.fallback;
  const view = await args.renderView(previous);

  // Always edit the message the user actually tapped Back on — that's the one
  // guaranteed to exist and be recent. Fall back to the tracked message only
  // if no callback message id was provided (e.g. text-driven back).
  const targetMessageId = args.messageId ?? nav?.message_id;
  if (!targetMessageId) return false;

  const messageKind = isMediaMessage(args.callbackMessage) ? 'media' : (nav?.message_kind ?? 'text');
  const edited = await editCurrentMessage(args.chatId, targetMessageId, messageKind, view);
  if (!edited) return false;

  const latestPending = await readPending(args.botUserId);
  latestPending.nav = {
    chat_id: args.chatId,
    // Re-anchor the session to the message we just edited so future
    // navigation continues editing this same bubble (no new messages).
    message_id: targetMessageId,
    message_kind: messageKind,
    current: previous,
    stack,
  };
  await writePending(args.botUserId, latestPending);
  return true;
}

export async function closeView(botUserId: string, chatId: number, messageId?: number): Promise<boolean> {
  const pending = await readPending(botUserId);
  const targetMessageId = messageId ?? pending.nav?.message_id;
  if (!targetMessageId) return false;
  const result = await editMessageReplyMarkup(chatId, targetMessageId);
  if (!ok(result)) return false;
  pending.nav = {
    ...(pending.nav ?? { chat_id: chatId, stack: [] }),
    chat_id: chatId,
    message_id: targetMessageId,
  };
  await writePending(botUserId, pending);
  return true;
}
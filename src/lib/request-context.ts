import { AsyncLocalStorage } from "node:async_hooks";

export type RequestCtx = {
  waitUntil: (promise: Promise<unknown>) => void;
};

export const requestCtxStorage = new AsyncLocalStorage<RequestCtx>();

/** Run `work` after the response is sent. Falls back to fire-and-forget. */
export function runAfterResponse(work: Promise<unknown>): void {
  const ctx = requestCtxStorage.getStore();
  if (ctx) {
    ctx.waitUntil(work.catch((e) => console.error("background work failed", e)));
  } else {
    // dev / node fallback — just don't await
    work.catch((e) => console.error("background work failed", e));
  }
}

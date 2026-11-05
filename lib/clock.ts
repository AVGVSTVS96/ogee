// Runs in the page: replaces timers, rAF, Date and CSS/Web animations with a clock
// that only moves when __advance(ms) is called, so each video frame is exact.
export const clock = `(() => {
  let now = 0, seq = 0, frames = [];
  const t0 = Date.now(), timers = new Map(), started = new WeakMap();
  const add = (fn, ms, args, repeat) => {
    const wait = Math.max(0, Number(ms) || 0);
    timers.set(++seq, { fn, at: now + wait, wait, args, repeat });
    return seq;
  };
  window.setTimeout = (fn, ms, ...a) => add(fn, ms, a, false);
  window.setInterval = (fn, ms, ...a) => add(fn, ms, a, true);
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.requestAnimationFrame = (fn) => frames.push(fn);
  window.cancelAnimationFrame = (id) => { frames[id - 1] = null; };
  performance.now = () => now;
  const RealDate = Date;
  window.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(t0 + now); } static now() { return t0 + now; } };
  window.__advance = (ms) => {
    const end = now + ms;
    for (;;) {
      let due;
      for (const [id, t] of timers) if (t.at <= end && (!due || t.at < due[1].at)) due = [id, t];
      if (!due) break;
      const [id, t] = due;
      now = t.at;
      t.repeat ? (t.at += Math.max(t.wait, 1)) : timers.delete(id);
      typeof t.fn === "function" ? t.fn(...t.args) : (0, eval)(t.fn);
    }
    now = end;
    const run = frames; frames = [];
    run.forEach((f) => f && f(now));
    for (const a of document.getAnimations()) {
      if (!started.has(a)) started.set(a, now - (a.currentTime ?? 0));
      a.pause();
      a.currentTime = now - started.get(a);
    }
  };
})();`;

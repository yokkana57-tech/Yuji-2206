const KEY = "is_visitor_id";

export function visitorId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

const post = (path: string, body: unknown) => {
  const payload = JSON.stringify(body);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(path, new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    /* fallthrough */
  }
  void fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
};

export const trackView = (slug: string, pageKind: string) =>
  post("/api/track/view", { slug, pageKind, visitorId: visitorId(), path: location.pathname, referrer: document.referrer || null });

export const trackEvent = (slug: string, type: string) => post("/api/track/event", { slug, type, visitorId: visitorId() });

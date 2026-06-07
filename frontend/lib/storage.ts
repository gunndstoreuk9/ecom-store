const CART_KEY = "tawazon_cart";
const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredCart {
  offerId: string;
  savedAt: number;
  utm: Record<string, string>;
}

export function saveCartToStorage(offerId: string, utm: Record<string, string> = {}): void {
  try {
    const data: StoredCart = { offerId, savedAt: Date.now(), utm };
    localStorage.setItem(CART_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadCartFromStorage(): StoredCart | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    const data: StoredCart = JSON.parse(raw);
    if (Date.now() - data.savedAt > CART_TTL_MS) {
      localStorage.removeItem(CART_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearCartStorage(): void {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // ignore
  }
}

export function getUtmFromUrl(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

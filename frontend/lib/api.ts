import { SITE } from "@/config/site";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${SITE.apiBase}${path}`;
  const res = await fetchWithRetry(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail ?? "Request failed", data);
  }
  return data as T;
}

export interface CreateOrderPayload {
  name: string;
  phone_raw: string;
  phone_e164: string;
  city?: string;
  offer_id: string;
  qty: number;
  price_mad: number;
  sku: string;
  utm?: Record<string, string>;
  event_id?: string;
}

export interface Order {
  order_id: string;
  status: string;
  name: string;
  phone: string;
  offer_id: string;
  qty: number;
  price_mad: number;
  total_mad: number;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return api<Order>("/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrder(orderId: string): Promise<Order> {
  return api<Order>(`/v1/orders/${orderId}`);
}

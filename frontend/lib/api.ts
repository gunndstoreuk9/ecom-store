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

export interface AdminOrderItem {
  sku: string;
  name_ar: string;
  qty: number;
  unit_price_mad: number;
  total_price_mad: number;
  item_type: string;
}

export interface AdminOrder {
  id: string;
  public_order_number: string;
  status: string;
  customer_name: string;
  phone_local: string;
  phone_e164: string;
  city?: string | null;
  hero_sku: string;
  hero_qty: number;
  total_mad: number;
  currency: string;
  sheet_sync_status: string;
  sheet_last_error?: string | null;
  created_at: string;
  updated_at: string;
  utm?: Record<string, string> | null;
  items: AdminOrderItem[];
}

export interface AdminOrdersResponse {
  total: number;
  limit: number;
  offset: number;
  orders: AdminOrder[];
}

export interface AdminStatusCount {
  status: string;
  count: number;
  total_mad: number;
}

export interface AdminDailyRevenue {
  date: string;
  orders: number;
  total_mad: number;
}

export interface AdminCityCount {
  city: string;
  orders: number;
  total_mad: number;
}

export interface AdminSheetSyncCount {
  status: string;
  count: number;
}

export interface AdminPeriodMetric {
  key: string;
  label: string;
  orders: number;
  revenue_mad: number;
}

export interface AdminRateMetric {
  key: string;
  label: string;
  value: number;
}

export interface AdminFunnelStep {
  key: string;
  label: string;
  count: number;
  rate: number;
}

export interface AdminAnalytics {
  days: number;
  total_orders: number;
  total_revenue_mad: number;
  average_order_value_mad: number;
  today_orders: number;
  today_revenue_mad: number;
  pending_sheet_sync: number;
  failed_sheet_sync: number;
  status_breakdown: AdminStatusCount[];
  sheet_sync_breakdown: AdminSheetSyncCount[];
  daily_revenue: AdminDailyRevenue[];
  top_cities: AdminCityCount[];
  recent_orders: AdminOrder[];
  period_metrics: AdminPeriodMetric[];
  delivery_metrics: AdminRateMetric[];
  order_funnel: AdminFunnelStep[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return api<Order>("/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
}

export async function getOrder(orderId: string): Promise<Order> {
  return api<Order>(`/v1/orders/${orderId}`);
}

export async function getAdminAnalytics(adminKey: string, days = 30): Promise<AdminAnalytics> {
  return api<AdminAnalytics>(`/v1/admin/analytics?days=${days}`, {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function getAdminOrders(
  adminKey: string,
  params: {
    limit?: number;
    offset?: number;
    status?: string;
    sheet_sync_status?: string;
    q?: string;
  } = {}
): Promise<AdminOrdersResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return api<AdminOrdersResponse>(`/v1/admin/orders?${search.toString()}`, {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function updateAdminOrderStatus(adminKey: string, orderId: string, status: string): Promise<AdminOrder> {
  return api<AdminOrder>(`/v1/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({ status }),
  });
}

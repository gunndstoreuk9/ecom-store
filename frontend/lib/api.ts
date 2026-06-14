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

function detailToMessage(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
        return typeof item === "string" ? item : JSON.stringify(item);
      })
      .join(" · ");
  }
  if (typeof detail === "object" && "msg" in (detail as object)) return String((detail as { msg: unknown }).msg);
  return JSON.stringify(detail);
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
    throw new ApiError(res.status, detailToMessage(data?.detail) ?? `Request failed (${res.status})`, data);
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
  address?: string | null;
  call_status?: string | null;
  call_note?: string | null;
  call_attempts: number;
  delivery_company?: string | null;
  delivery_city?: string | null;
  delivery_tracking?: string | null;
  delivery_error?: string | null;
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

export interface AdminOrderCallPayload {
  call_status: string;
  call_note?: string;
  delivery_company?: string;
  delivery_city?: string;
}

export interface AdminOrderEditPayload {
  customer_name?: string;
  address?: string;
  city?: string;
  delivery_city?: string;
  qty?: number;
  total_mad?: number;
}

export interface AdminRatePeriod {
  key: string;
  label: string;
  total: number;
  confirmed: number;
  rate: number;
}

export interface AdminRateByOffer {
  offer_id: string;
  qty: number;
  total: number;
  confirmed: number;
  rate: number;
}

export interface AdminCallCenterStats {
  by_period: AdminRatePeriod[];
  by_offer: AdminRateByOffer[];
}

export interface AdminDispatchResponse {
  updated: number;
  orders: AdminOrder[];
}

export interface ConfirmationPayoutDetailItem {
  order_id: string;
  public_order_number: string;
  customer_name: string;
  total_mad: number;
  commission_mad: number;
  dispatched_at: string | null;
}

export interface ConfirmationPayout {
  orders_count: number;
  commission_per_order: number;
  base_amount_mad: number;
  manual_adjustment_mad: number;
  total_due_mad: number;
  last_reset_at: string | null;
  status: "paid" | "unpaid";
  details?: ConfirmationPayoutDetailItem[] | null;
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

export async function getAdminRole(adminKey: string): Promise<{ role: "admin" | "call_center" }> {
  return api<{ role: "admin" | "call_center" }>(`/v1/admin/me`, {
    headers: { "X-Admin-Key": adminKey },
  });
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
    call_status?: string;
    bucket?: string;
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

export async function updateAdminOrderCall(adminKey: string, orderId: string, payload: AdminOrderCallPayload): Promise<AdminOrder> {
  return api<AdminOrder>(`/v1/admin/orders/${orderId}/call`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });
}

export async function editAdminOrder(adminKey: string, orderId: string, payload: AdminOrderEditPayload): Promise<AdminOrder> {
  return api<AdminOrder>(`/v1/admin/orders/${orderId}/details`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });
}

export async function getCallCenterStats(adminKey: string): Promise<AdminCallCenterStats> {
  return api<AdminCallCenterStats>(`/v1/admin/call-center/stats`, {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function dispatchOrders(adminKey: string, orderIds: string[], deliveryCompany: string): Promise<AdminDispatchResponse> {
  return api<AdminDispatchResponse>(`/v1/admin/dispatch`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({ order_ids: orderIds, delivery_company: deliveryCompany, status: "shipped" }),
  });
}

export type TrackingPlatform = "meta" | "tiktok" | "google_ads" | "youtube" | "ga4";
export type TrackingHealth = "excellent" | "warning" | "critical";

export interface TrackingPixel {
  id: string;
  platform: TrackingPlatform;
  name: string;
  pixel_id: string;
  has_token: boolean;
  token_masked: string | null;
  test_event_code: string | null;
  capi_enabled: boolean;
  status: "active" | "disabled";
  scope_type: "store" | "product" | "landing" | "campaign";
  scope_value: string | null;
  events_enabled: string[] | null;
  extra: Record<string, unknown> | null;
  health: TrackingHealth;
  created_at: string;
  updated_at: string;
}

export interface TrackingPlatformStat {
  platform: TrackingPlatform;
  pixels: number;
  active: number;
  total_events: number;
  purchases: number;
  leads: number;
  browser_events: number;
  server_events: number;
  errors: number;
  spend_mad: number;
  revenue_mad: number;
  roas: number | null;
  cost_per_lead: number | null;
  cost_per_purchase: number | null;
  health: TrackingHealth;
}

export interface TrackingAnalytics {
  range_days: number;
  total_events: number;
  total_purchases: number;
  total_leads: number;
  conversion_rate: number;
  browser_events: number;
  server_events: number;
  deduplication_rate: number;
  event_match_quality: number;
  health_score: number;
  spend_mad: number;
  revenue_mad: number;
  roas: number | null;
  cost_per_lead: number | null;
  cost_per_purchase: number | null;
  by_platform: TrackingPlatformStat[];
}

export interface TrackingLog {
  id: string;
  pixel_id: string | null;
  platform: TrackingPlatform;
  event_name: string;
  source: "browser" | "server" | "test";
  status: "ok" | "error";
  message: string | null;
  created_at: string;
}

export interface TrackingMeta {
  platforms: string[];
  events: string[];
  scope_types: string[];
}

export interface TrackingPixelPayload {
  platform?: TrackingPlatform;
  name?: string;
  pixel_id?: string;
  access_token?: string;
  test_event_code?: string | null;
  capi_enabled?: boolean;
  status?: "active" | "disabled";
  scope_type?: "store" | "product" | "landing" | "campaign";
  scope_value?: string | null;
  events_enabled?: string[];
  extra?: Record<string, unknown> | null;
  pin?: string;
}

export async function getTrackingMeta(adminKey: string): Promise<TrackingMeta> {
  return api<TrackingMeta>(`/v1/admin/tracking/meta`, { headers: { "X-Admin-Key": adminKey } });
}

export async function getTrackingPixels(adminKey: string): Promise<TrackingPixel[]> {
  return api<TrackingPixel[]>(`/v1/admin/tracking/pixels`, { headers: { "X-Admin-Key": adminKey } });
}

export async function createTrackingPixel(adminKey: string, payload: TrackingPixelPayload): Promise<TrackingPixel> {
  return api<TrackingPixel>(`/v1/admin/tracking/pixels`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });
}

export async function updateTrackingPixel(adminKey: string, id: string, payload: TrackingPixelPayload): Promise<TrackingPixel> {
  return api<TrackingPixel>(`/v1/admin/tracking/pixels/${id}`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });
}

export async function deleteTrackingPixel(adminKey: string, id: string, pin: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/v1/admin/tracking/pixels/${id}/delete`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({ pin }),
  });
}

export async function testTrackingPixel(adminKey: string, id: string): Promise<{ ok: boolean; platform: string; message: string }> {
  return api<{ ok: boolean; platform: string; message: string }>(`/v1/admin/tracking/pixels/${id}/test`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({}),
  });
}

export async function getTrackingAnalytics(adminKey: string, days = 7): Promise<TrackingAnalytics> {
  return api<TrackingAnalytics>(`/v1/admin/tracking/analytics?days=${days}`, { headers: { "X-Admin-Key": adminKey } });
}

export async function getTrackingLogs(
  adminKey: string,
  params: { platform?: string; status?: string; limit?: number } = {}
): Promise<{ total: number; logs: TrackingLog[] }> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return api<{ total: number; logs: TrackingLog[] }>(`/v1/admin/tracking/logs?${search.toString()}`, {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function upsertTrackingSpend(adminKey: string, platform: string, day: string, amountMad: number): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/v1/admin/tracking/spend`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({ platform, day, amount_mad: amountMad }),
  });
}

export async function getConfirmationPayout(adminKey: string, details = false): Promise<ConfirmationPayout> {
  return api<ConfirmationPayout>(`/v1/admin/confirmation-payouts${details ? "?details=true" : ""}`, {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function updateConfirmationPayout(
  adminKey: string,
  payload: { commission_per_order?: number; manual_adjustment_mad?: number }
): Promise<ConfirmationPayout> {
  return api<ConfirmationPayout>(`/v1/admin/confirmation-payouts`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });
}

export async function resetConfirmationPayout(adminKey: string, pin: string): Promise<ConfirmationPayout> {
  return api<ConfirmationPayout>(`/v1/admin/confirmation-payouts/reset`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: JSON.stringify({ pin }),
  });
}

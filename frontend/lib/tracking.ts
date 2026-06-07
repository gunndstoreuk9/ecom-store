import { SITE } from "@/config/site";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView() {
  if (SITE.metaPixelId && window.fbq) window.fbq("track", "PageView");
  if (SITE.tiktokPixelId && window.ttq) window.ttq.track("ViewContent");
  if (SITE.googleTagId && window.gtag) window.gtag("event", "page_view");
}

export function trackViewContent(params: { value: number; currency?: string; eventId?: string }) {
  if (SITE.metaPixelId && window.fbq) {
    window.fbq("track", "ViewContent", { value: params.value, currency: "MAD" }, { eventID: params.eventId });
  }
  if (SITE.tiktokPixelId && window.ttq) {
    window.ttq.track("ViewContent", { value: params.value, currency: "MAD", event_id: params.eventId });
  }
}

export function trackAddToCart(params: { value: number; eventId?: string }) {
  if (SITE.metaPixelId && window.fbq) {
    window.fbq("track", "AddToCart", { value: params.value, currency: "MAD" }, { eventID: params.eventId });
  }
  if (SITE.tiktokPixelId && window.ttq) {
    window.ttq.track("AddToCart", { value: params.value, currency: "MAD", event_id: params.eventId });
  }
}

export function trackInitiateCheckout(params: { value: number; eventId?: string }) {
  if (SITE.metaPixelId && window.fbq) {
    window.fbq("track", "InitiateCheckout", { value: params.value, currency: "MAD" }, { eventID: params.eventId });
  }
  if (SITE.tiktokPixelId && window.ttq) {
    window.ttq.track("InitiateCheckout", { value: params.value, currency: "MAD", event_id: params.eventId });
  }
}

export function trackLead(params: { value: number; eventId?: string }) {
  if (SITE.metaPixelId && window.fbq) {
    window.fbq("track", "Lead", { value: params.value, currency: "MAD" }, { eventID: params.eventId });
  }
  if (SITE.tiktokPixelId && window.ttq) {
    window.ttq.track("SubmitForm", { value: params.value, currency: "MAD", event_id: params.eventId });
  }
}

export function trackPurchase(params: { value: number; eventId?: string }) {
  if (SITE.metaPixelId && window.fbq) {
    window.fbq("track", "Purchase", { value: params.value, currency: "MAD" }, { eventID: params.eventId });
  }
  if (SITE.tiktokPixelId && window.ttq) {
    window.ttq.track("CompletePayment", { value: params.value, currency: "MAD", event_id: params.eventId });
  }
  if (SITE.googleTagId && window.gtag) {
    window.gtag("event", "purchase", {
      value: params.value,
      currency: "MAD",
      send_to: SITE.googleAdsConversionId,
      transaction_id: params.eventId,
    });
  }
}

export function trackUpsellAccepted(params: { value: number; eventId?: string }) {
  trackAddToCart(params);
  trackPurchase(params);
}

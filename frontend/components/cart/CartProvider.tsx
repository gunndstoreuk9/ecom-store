"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { HERO_OFFERS, type OfferId } from "@/config/offers";
import { loadCartFromStorage, saveCartToStorage } from "@/lib/storage";

interface CartState {
  selectedOfferId: OfferId;
  drawerOpen: boolean;
  checkoutOpen: boolean;
  lastOrderId: string | null;
  utm: Record<string, string>;
  // computed
  itemCount: number;
  selectedOffer: (typeof HERO_OFFERS)[number];
  // actions
  setOffer: (id: OfferId) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  setLastOrderId: (id: string) => void;
  setUtm: (utm: Record<string, string>) => void;
}

const defaultOffer = HERO_OFFERS.find((o) => o.default) ?? HERO_OFFERS[2];

export const useCartStore = create<CartState>((set, get) => ({
  selectedOfferId: defaultOffer.id,
  drawerOpen: false,
  checkoutOpen: false,
  lastOrderId: null,
  utm: {},
  get itemCount() {
    return get().selectedOffer.qty;
  },
  get selectedOffer() {
    return HERO_OFFERS.find((o) => o.id === get().selectedOfferId) ?? defaultOffer;
  },
  setOffer: (id) => {
    set({ selectedOfferId: id });
    saveCartToStorage(id, get().utm);
  },
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  openCheckout: () => set({ checkoutOpen: true }),
  closeCheckout: () => set({ checkoutOpen: false }),
  setLastOrderId: (id) => set({ lastOrderId: id }),
  setUtm: (utm) => set({ utm }),
}));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const didRehydrate = useRef(false);

  useEffect(() => {
    if (didRehydrate.current) return;
    didRehydrate.current = true;

    const stored = loadCartFromStorage();
    if (!stored) return;

    const store = useCartStore.getState();
    const validOffer = HERO_OFFERS.find((o) => o.id === stored.offerId);

    if (validOffer) store.setOffer(stored.offerId as OfferId);
    if (stored.utm) store.setUtm(stored.utm);
  }, []);

  return <>{children}</>;
}

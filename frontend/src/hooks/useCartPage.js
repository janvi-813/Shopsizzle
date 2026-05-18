import { useAuth } from "@clerk/clerk-react";

import { useCart } from "../store/cart";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useState } from "react";

export default function useCartPage() {
  const { getToken } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);

  const {
    data,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch("/api/products"),
    enabled: items.length > 0,
  });

  const products = data?.products ?? [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items.map((line) => ({
    line,
    product: byId.get(line.productId) ?? null,
  }));

  const subtotal = lines.reduce((sum, { line, product: p }) => {
    if (!p) return sum;
    return sum + p.priceCents * line.quantity;
  }, 0);

  async function checkout() {
    setCheckoutError(null);
    setCheckoutLoading(true);

    const body = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };

    try {
      const res = await apiFetch("/api/checkout", {
        getToken,
        method: "POST",
        body,
      });

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      throw new Error("Checkout did not return a valid URL");
    } catch (error) {
      console.error("Checkout failed", error);
      setCheckoutError(error instanceof Error ? error.message : String(error));
    } finally {
      setCheckoutLoading(false);
    }
  }

  return {
    items,
    setQty,
    removeItem,
    productsLoading,
    productsError,
    lines,
    subtotal,
    checkout,
    checkoutLoading,
    checkoutError,
  };
}

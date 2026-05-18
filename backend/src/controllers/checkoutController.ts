import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../lib/env";
import z from "zod";
import { getAuth } from "@clerk/express";
import { getLocalUser } from "../lib/users";
import { db } from "../db";
import { CheckoutSessionLine, checkoutSessions, products } from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { polarCreateCheckout } from "../lib/polar";

const env = getEnv();

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    // only signed-in users can start checkout
    const { userId, isAuthenticated } = getAuth(req);
    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = cartSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid cart", details: parsed.error.flatten() });
      return;
    }

    // polar access token is required
    if (!env.POLAR_ACCESS_TOKEN) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }

    const localUser = await getLocalUser(userId);
    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const ids = parsed.data.items.map((i) => i.productId);

    // load every cart product that exists, is active, and matches the IDs we asked for.
    const prodRows = await db
      .select()
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.active, true)));

    if (prodRows.length !== ids.length) {
      res.status(400).json({ error: "One or more products are invalid" });
      return;
    }

    const normalizeCurrency = (value: string) => {
      const lower = value.trim().toLowerCase();
      if (lower === "rupee" || lower === "rs" || lower === "₹") return "inr";
      return lower;
    };

    const currency = normalizeCurrency(prodRows[0].currency);
    if (!prodRows.every((p) => normalizeCurrency(p.currency) === currency)) {
      res.status(400).json({ error: "Mixed currencies are not supported in one checkout." });
      return;
    }

    const overrideCurrency = env.POLAR_PRESENTMENT_CURRENCY
      ? normalizeCurrency(env.POLAR_PRESENTMENT_CURRENCY)
      : undefined;
    const checkoutCurrency = overrideCurrency ?? "inr";
    const presentmentCurrency = overrideCurrency ?? "inr";

    const byId = new Map(prodRows.map((p) => [p.id, p]));
    let totalCents = 0;
    const lines: CheckoutSessionLine[] = [];

    for (const line of parsed.data.items) {
      const p = byId.get(line.productId)!;
      totalCents += p.priceCents * line.quantity;
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.priceCents,
      });
    }

    const lookupPolarMinimum = (currency: string) => {
      switch (currency.toLowerCase()) {
        case "inr":
          return 6000;
        default:
          return 100;
      }
    };

    const minimumPolarAmount = lookupPolarMinimum(checkoutCurrency);
    if (totalCents < minimumPolarAmount) {
      const formattedMin = checkoutCurrency === "inr" ? "₹60.00" : `${minimumPolarAmount / 100} ${checkoutCurrency.toUpperCase()}`;
      res.status(400).json({
        error: `Total below Polar minimum (${formattedMin}). Please increase the cart total to continue.`,
      });
      return;
    }

    const [session] = await db
      .insert(checkoutSessions)
      .values({
        userId: localUser.id,
        lines,
        totalCents,
        currency: "inr",
      })
      .returning();

    const successUrl = `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`;
    const returnUrl = `${env.FRONTEND_URL}/cart`;

    const checkout = await polarCreateCheckout(env, {
      products: [env.POLAR_CHECKOUT_PRODUCT_ID],
      prices: {
        [env.POLAR_CHECKOUT_PRODUCT_ID]: [
          {
            amount_type: "fixed",
            price_currency: checkoutCurrency,
            price_amount: totalCents,
          },
        ],
      },
      presentment_currency: presentmentCurrency,

      success_url: successUrl,
      return_url: returnUrl,
      external_customer_id: userId,
      metadata: { checkout_session_id: session.id },
    });

    await db
      .update(checkoutSessions)
      .set({ polarCheckoutId: checkout.id })
      .where(eq(checkoutSessions.id, session.id));

    res.json({ checkoutUrl: checkout.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("Checkout error", e);
    res.status(500).json({ error: message });
  }
}

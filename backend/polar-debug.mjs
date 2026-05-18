import 'dotenv/config';

const token = process.env.POLAR_ACCESS_TOKEN;
console.log('token-set', !!token);
const base = process.env.POLAR_API_BASE;
console.log('base', base);
console.log('productId', process.env.POLAR_CHECKOUT_PRODUCT_ID);

async function inspect() {
  const productResp = await fetch(`${base}/v1/products/${process.env.POLAR_CHECKOUT_PRODUCT_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('product-status', productResp.status);
  console.log(await productResp.text());

  const checkoutResp = await fetch(`${base}/v1/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      products: [
        {
          product_id: process.env.POLAR_CHECKOUT_PRODUCT_ID,
          product_price_id: 'fb6ed890-1d75-4683-b464-6188f7c79f35',
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      return_url: 'https://example.com/return',
      external_customer_id: 'test-user',
      metadata: { checkout_session_id: 'test' },
    }),
  });
  console.log('checkout-status', checkoutResp.status);
  console.log(await checkoutResp.text());
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});

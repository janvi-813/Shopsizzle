require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const res = await pool.query('select id, slug, currency, price_cents from products where id = $1', ['5b539020-1f4a-41b3-8611-ab1fda11280f']);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();

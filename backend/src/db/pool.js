const { Pool } = require("pg");

// A single shared pool. Postgres per the plan; Redis stays out until a
// second backend instance actually exists (also per the plan) - nothing
// here depends on it.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/resorts',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

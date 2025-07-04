const express = require('express');
const next = require('next');
const db = require('./db');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '../frontend' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  // simple auth middleware (placeholder)
  const auth = (req, res, next) => {
    const memberId = req.header('x-member-id');
    if (!memberId) return res.status(401).json({ error: 'Unauthorized' });
    req.memberId = memberId;
    next();
  };

  // API routes
  server.post('/api/login', async (req, res) => {
    const { memberId, password } = req.body;
    try {
      // TODO: validate with database
      const result = await db.query('SELECT id FROM members WHERE id=$1 AND password=$2', [memberId, password]);
      if (result.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.get('/api/resorts', auth, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM resorts');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.put('/api/member/address', auth, async (req, res) => {
    const { address } = req.body;
    try {
      await db.query('UPDATE members SET address=$1 WHERE id=$2', [address, req.memberId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.put('/api/member/password', auth, async (req, res) => {
    const { password } = req.body;
    try {
      await db.query('UPDATE members SET password=$1 WHERE id=$2', [password, req.memberId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.post('/api/member/feedback', auth, async (req, res) => {
    const { message } = req.body;
    try {
      await db.query('INSERT INTO feedback(member_id, message) VALUES($1, $2)', [req.memberId, message]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.post('/api/member/vacation', auth, async (req, res) => {
    const { resortId, seasonId, startDate, endDate } = req.body;
    try {
      await db.query(
        'INSERT INTO vacation_requests(member_id, resort_id, season_id, start_date, end_date) VALUES($1, $2, $3, $4, $5)',
        [req.memberId, resortId, seasonId, startDate, endDate]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Next.js pages
  server.all('*', (req, res) => handle(req, res));

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

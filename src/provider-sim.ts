import express from 'express';

const app = express();
const port = 4000;

app.use(express.json());

app.post('/book', (req, res) => {
  console.log('[EXTERNAL PROVIDER] Received booking request:', req.body);
  const { destination } = req.body;
  
  if (destination === 'fail') {
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  res.json({
    status: 'confirmed',
    booking_id: `EXT_${Math.floor(Math.random() * 10000)}`,
    destination: destination,
    message: 'Cab is on the way!'
  });
});

app.listen(port, () => {
  console.log(`[EXTERNAL PROVIDER SIM] Running on http://localhost:${port}`);
});

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const platformRoutes = require('./routes/platformRoutes');
const setupRoutes = require('./routes/setupRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'SmartStay API',
    status: 'running',
    message: 'This is the backend API. Open the web app at http://localhost:5173',
    health: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'smartstay-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/hostel', roomRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

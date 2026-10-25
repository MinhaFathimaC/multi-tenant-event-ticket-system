import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import db from './db/connection.js';
import initDatabase from './db/initDb.js';
import seed from './db/seed.js';
import cronWorker from './services/cronWorker.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import reservationRoutes from './routes/reservations.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Initialize database schema and auto-seed if first run
initDatabase();
const usersCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (usersCount === 0) {
  console.log('[Bootstrap] Database is empty. Running initial seed...');
  seed();
}

// Start Background Hold Expiration Cron Worker
cronWorker.start();

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Multi-Tenant Event & Ticket Reservation System',
    timestamp: new Date().toISOString(),
    holdDurationMinutes: config.holdDurationMinutes,
    cronWorkerRunning: cronWorker.isRunning
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// In Production, serve Vite static assets
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UnhandledError]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Reservation API Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ 10-Minute Hold Engine: Active`);
  console.log(`🔒 Zero Double-Booking Atomic Locks: Active`);
  console.log(`====================================================`);
});

export default app;

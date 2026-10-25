import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-event-ticket-reservation-2026',
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/reservation_system.db'),
  redisUrl: process.env.REDIS_URL || null,
  holdDurationMinutes: parseInt(process.env.HOLD_DURATION_MINUTES || '10', 10),
  holdDurationSeconds: parseInt(process.env.HOLD_DURATION_MINUTES || '10', 10) * 60,
  workerIntervalMs: parseInt(process.env.WORKER_INTERVAL_MS || '10000', 10), // Every 10 seconds
  env: process.env.NODE_ENV || 'development'
};

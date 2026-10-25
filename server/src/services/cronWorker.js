import cron from 'node-cron';
import reservationEngine from './reservationEngine.js';
import { config } from '../config/index.js';

class CronWorker {
  constructor() {
    this.timer = null;
    this.cronTask = null;
    this.isRunning = false;
    this.lastRunTime = null;
    this.totalExpiredPurged = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[CronWorker] Starting Background Hold Expiration Worker (Interval: ${config.workerIntervalMs / 1000}s)`);

    // High frequency interval (every 10s)
    this.timer = setInterval(() => {
      this.runPurge();
    }, config.workerIntervalMs);

    // Also schedule standard 1-minute cron as backup
    try {
      this.cronTask = cron.schedule('* * * * *', () => {
        this.runPurge();
      });
    } catch (e) {
      // cron fallback
    }

    // Initial run on boot
    this.runPurge();
  }

  runPurge() {
    try {
      const purgedCount = reservationEngine.releaseExpiredHolds();
      this.lastRunTime = new Date().toISOString();
      if (purgedCount > 0) {
        this.totalExpiredPurged += purgedCount;
        console.log(`[CronWorker] Cleaned up ${purgedCount} expired reservation holds at ${this.lastRunTime}`);
      }
      return purgedCount;
    } catch (err) {
      console.error('[CronWorker] Error purging expired holds:', err.message);
      return 0;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.cronTask) this.cronTask.stop();
    this.isRunning = false;
    console.log('[CronWorker] Background worker stopped.');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalSeconds: config.workerIntervalMs / 1000,
      lastRunTime: this.lastRunTime,
      totalExpiredPurged: this.totalExpiredPurged
    };
  }
}

export const cronWorker = new CronWorker();
export default cronWorker;

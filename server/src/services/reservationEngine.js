import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import cacheService from './cacheService.js';
import { config } from '../config/index.js';

class ReservationEngine {
  /**
   * Get accurate real-time inventory for a tier
   * Total = total_capacity
   * Held = active unexpired holds
   * Confirmed = paid orders
   * Available = total - (held + confirmed)
   */
  getTierInventory(tierId) {
    const tier = db.prepare('SELECT id, event_id, name, price, total_capacity FROM ticket_tiers WHERE id = ?').get(tierId);
    if (!tier) return null;

    // Active unexpired holds
    const heldResult = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS held_count
      FROM reservations
      WHERE tier_id = ?
        AND status = 'HELD'
        AND expires_at > datetime('now')
    `).get(tierId);

    // Confirmed orders
    const confirmedResult = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS confirmed_count
      FROM reservations
      WHERE tier_id = ?
        AND status = 'COMPLETED'
    `).get(tierId);

    const heldCount = heldResult.held_count;
    const confirmedCount = confirmedResult.confirmed_count;
    const available = Math.max(0, tier.total_capacity - (heldCount + confirmedCount));

    return {
      tierId: tier.id,
      tierName: tier.name,
      price: tier.price,
      totalCapacity: tier.total_capacity,
      heldCount,
      confirmedCount,
      available,
      isSoldOut: available <= 0
    };
  }

  /**
   * Atomic Reservation method to place a temporary 10-minute hold
   * Guaranteed zero double-booking under extreme concurrency.
   */
  reserveTickets({ userId, eventId, tierId, quantity, clientIp = null }) {
    if (quantity <= 0) {
      const err = new Error('Reservation quantity must be at least 1');
      err.status = 400;
      throw err;
    }

    // Atomic transaction - BEGIN IMMEDIATE lock
    const executeReservation = db.transaction(() => {
      // 1. Validate event and cutoff date
      const event = db.prepare('SELECT id, title, sales_cutoff_date, status FROM events WHERE id = ?').get(eventId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
      }

      if (event.status !== 'ACTIVE') {
        const err = new Error(`Cannot reserve tickets. Event status is ${event.status}`);
        err.status = 400;
        throw err;
      }

      const now = new Date();
      const cutoffDate = new Date(event.sales_cutoff_date);
      if (now > cutoffDate) {
        const err = new Error('Ticket sales have ended for this event (sales cut-off reached)');
        err.status = 400;
        throw err;
      }

      // 2. Fetch tier
      const tier = db.prepare('SELECT id, name, price, total_capacity FROM ticket_tiers WHERE id = ? AND event_id = ?').get(tierId, eventId);
      if (!tier) {
        const err = new Error('Ticket tier not found for this event');
        err.status = 404;
        throw err;
      }

      // 3. Purge any expired holds first within this transaction
      db.prepare(`
        UPDATE reservations
        SET status = 'EXPIRED'
        WHERE tier_id = ?
          AND status = 'HELD'
          AND expires_at <= datetime('now')
      `).run(tierId);

      // 4. Calculate current commitments
      const heldResult = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) AS held_count
        FROM reservations
        WHERE tier_id = ?
          AND status = 'HELD'
          AND expires_at > datetime('now')
      `).get(tierId);

      const confirmedResult = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) AS confirmed_count
        FROM reservations
        WHERE tier_id = ?
          AND status = 'COMPLETED'
      `).get(tierId);

      const currentCommitted = heldResult.held_count + confirmedResult.confirmed_count;
      const available = tier.total_capacity - currentCommitted;

      // 5. Concurrency Check: Is there enough inventory?
      if (quantity > available) {
        const err = new Error(
          available <= 0
            ? `Sorry, '${tier.name}' tickets are currently sold out or temporarily held by other buyers.`
            : `Only ${available} '${tier.name}' ticket(s) remaining. Cannot reserve ${quantity}.`
        );
        err.status = 409; // HTTP 409 Conflict
        err.available = Math.max(0, available);
        throw err;
      }

      // 6. Create 10-minute hold reservation
      const reservationId = uuidv4();
      const holdDuration = config.holdDurationMinutes;

      db.prepare(`
        INSERT INTO reservations (
          id, user_id, event_id, tier_id, quantity, status, held_at, expires_at, client_ip
        ) VALUES (
          ?, ?, ?, ?, ?, 'HELD', datetime('now'), datetime('now', '+${holdDuration} minutes'), ?
        )
      `).run(reservationId, userId, eventId, tierId, quantity, clientIp);

      const createdReservation = db.prepare(`
        SELECT r.*, t.name AS tier_name, t.price, e.title AS event_title,
          strftime('%s', r.expires_at) - strftime('%s', 'now') AS remaining_seconds
        FROM reservations r
        JOIN ticket_tiers t ON r.tier_id = t.id
        JOIN events e ON r.event_id = e.id
        WHERE r.id = ?
      `).get(reservationId);

      return createdReservation;
    });

    const result = executeReservation();
    
    // Invalidate Redis/Memory cache for this event
    cacheService.invalidateEvent(eventId);

    return result;
  }

  /**
   * Release an active reservation hold (User cancelled or manual release)
   */
  cancelReservation(reservationId, userId) {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) {
      const err = new Error('Reservation not found');
      err.status = 404;
      throw err;
    }

    if (userId && reservation.user_id !== userId) {
      const err = new Error('Unauthorized to cancel this reservation');
      err.status = 403;
      throw err;
    }

    if (reservation.status !== 'HELD') {
      const err = new Error(`Reservation is already ${reservation.status}`);
      err.status = 400;
      throw err;
    }

    db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?").run(reservationId);
    cacheService.invalidateEvent(reservation.event_id);

    return { success: true, message: 'Reservation hold released.' };
  }

  /**
   * Background job cleanup: Expire all stale holds
   */
  releaseExpiredHolds() {
    const result = db.prepare(`
      UPDATE reservations
      SET status = 'EXPIRED'
      WHERE status = 'HELD'
        AND expires_at <= datetime('now')
    `).run();

    if (result.changes > 0) {
      console.log(`[Worker] Expired ${result.changes} stale reservation hold(s). Seats returned to inventory.`);
      cacheService.delPattern('event:*');
    }
    return result.changes;
  }

  /**
   * Get user's active reservation if any
   */
  getUserActiveReservation(userId) {
    // Purge expired holds
    this.releaseExpiredHolds();

    const reservation = db.prepare(`
      SELECT r.*, t.name AS tier_name, t.price, e.title AS event_title, e.banner_url,
        strftime('%s', r.expires_at) - strftime('%s', 'now') AS remaining_seconds
      FROM reservations r
      JOIN ticket_tiers t ON r.tier_id = t.id
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
        AND r.status = 'HELD'
        AND r.expires_at > datetime('now')
      ORDER BY r.held_at DESC
      LIMIT 1
    `).get(userId);

    return reservation || null;
  }
}

export const reservationEngine = new ReservationEngine();
export default reservationEngine;

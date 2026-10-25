import reservationEngine from '../services/reservationEngine.js';
import cronWorker from '../services/cronWorker.js';

export function holdTickets(req, res) {
  try {
    const { eventId, tierId, quantity = 1 } = req.body;
    const userId = req.user.id;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!eventId || !tierId) {
      return res.status(400).json({ error: 'eventId and tierId are required' });
    }

    const reservation = reservationEngine.reserveTickets({
      userId,
      eventId,
      tierId,
      quantity: parseInt(quantity, 10),
      clientIp
    });

    res.status(201).json({
      message: 'Tickets successfully placed on temporary 10-minute hold.',
      reservation
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message,
      available: err.available !== undefined ? err.available : null
    });
  }
}

export function getActiveReservation(req, res) {
  try {
    const userId = req.user.id;
    const reservation = reservationEngine.getUserActiveReservation(userId);

    res.json({ reservation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function cancelReservation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = reservationEngine.cancelReservation(id, userId);
    res.json(result);
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ error: err.message });
  }
}

export function manualPurgeExpired(req, res) {
  try {
    const purged = cronWorker.runPurge();
    res.json({
      message: `Manual expiration cleanup triggered. Purged ${purged} expired reservation hold(s).`,
      purgedCount: purged
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

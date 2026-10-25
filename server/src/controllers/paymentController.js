import paymentService from '../services/paymentService.js';
import db from '../db/connection.js';

export async function simulatePayment(req, res) {
  try {
    const { reservationId, action = 'APPROVE', paymentMethod = 'CREDIT_CARD', cardDetails = {} } = req.body;
    const userId = req.user.id;

    if (!reservationId) {
      return res.status(400).json({ error: 'reservationId is required' });
    }

    const result = await paymentService.processPayment({
      reservationId,
      userId,
      action,
      paymentMethod,
      cardDetails
    });

    if (!result.success) {
      return res.status(result.status === 'DECLINED' ? 402 : 504).json(result);
    }

    res.json(result);
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ error: err.message });
  }
}

export async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;

    const order = await paymentService.getOrderDetails(id, userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ error: err.message });
  }
}

export async function getMyTickets(req, res) {
  try {
    const userId = req.user.id;

    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
             e.title AS event_title, e.venue, e.event_date, e.banner_url,
             tt.name AS tier_name
      FROM orders o
      LEFT JOIN reservations r ON o.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      LEFT JOIN ticket_tiers tt ON r.tier_id = tt.id
      WHERE o.user_id = ? AND o.status = 'PAID'
      ORDER BY o.created_at DESC
    `).all(userId);

    const fullOrders = await Promise.all(
      orders.map((ord) => paymentService.getOrderDetails(ord.id, userId))
    );

    res.json({ orders: fullOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function paymentWebhook(req, res) {
  try {
    const event = req.body;
    console.log('[PaymentWebhook] Received payment gateway webhook event:', event.type || event);

    res.json({ received: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

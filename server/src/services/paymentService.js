import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../db/connection.js';
import cacheService from './cacheService.js';

class PaymentService {
  /**
   * Process payment simulation
   * action: 'APPROVE' | 'DECLINE' | 'TIMEOUT'
   */
  async processPayment({ reservationId, userId, action = 'APPROVE', paymentMethod = 'CREDIT_CARD', cardDetails = {} }) {
    // 1. Validate reservation
    const reservation = db.prepare(`
      SELECT r.*, t.price, t.name AS tier_name, e.tenant_id, e.title AS event_title
      FROM reservations r
      JOIN ticket_tiers t ON r.tier_id = t.id
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `).get(reservationId);

    if (!reservation) {
      const err = new Error('Reservation not found');
      err.status = 404;
      throw err;
    }

    if (reservation.user_id !== userId) {
      const err = new Error('Unauthorized reservation checkout');
      err.status = 403;
      throw err;
    }

    if (reservation.status !== 'HELD') {
      const err = new Error(`Cannot checkout. Reservation status is '${reservation.status}'`);
      err.status = 400;
      throw err;
    }

    // Check if expired
    const isExpired = db.prepare("SELECT datetime('now') > datetime(?) AS is_expired").get(reservation.expires_at).is_expired;
    if (isExpired) {
      db.prepare("UPDATE reservations SET status = 'EXPIRED' WHERE id = ?").run(reservationId);
      cacheService.invalidateEvent(reservation.event_id);
      const err = new Error('Reservation hold expired! Your temporary 10-minute hold has elapsed and tickets were released.');
      err.status = 410; // HTTP 410 Gone
      throw err;
    }

    // 2. Simulate Async Gateway Latency (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const totalAmount = reservation.price * reservation.quantity;
    const gatewayTxId = `TXN_SIM_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Handle DECLINE simulation
    if (action === 'DECLINE') {
      // Release reservation back to available inventory
      db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?").run(reservationId);
      cacheService.invalidateEvent(reservation.event_id);

      return {
        success: false,
        status: 'DECLINED',
        message: 'Payment simulation declined: Card declined or insufficient funds.',
        gatewayTxId,
        reservationId
      };
    }

    // Handle TIMEOUT simulation
    if (action === 'TIMEOUT') {
      return {
        success: false,
        status: 'TIMEOUT',
        message: 'Payment simulation timed out: Gateway did not respond within 30 seconds.',
        gatewayTxId,
        reservationId
      };
    }

    // Handle APPROVE flow - Atomic Transaction
    const executeOrderCreation = db.transaction(() => {
      const orderId = uuidv4();
      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Insert Order
      db.prepare(`
        INSERT INTO orders (
          id, order_number, tenant_id, user_id, reservation_id, total_amount, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PAID', datetime('now'))
      `).run(orderId, orderNumber, reservation.tenant_id, userId, reservationId, totalAmount);

      // 2. Create Order Items (individual tickets with unique codes)
      const ticketItems = [];
      for (let i = 0; i < reservation.quantity; i++) {
        const itemId = uuidv4();
        const ticketCode = `TCK-${reservation.tier_name.substring(0, 3).toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`;
        const qrPayload = JSON.stringify({
          ticketCode,
          orderNumber,
          eventId: reservation.event_id,
          tierName: reservation.tier_name,
          issuedAt: new Date().toISOString()
        });

        db.prepare(`
          INSERT INTO order_items (
            id, order_id, tier_id, ticket_code, qr_data, price, attendee_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, orderId, reservation.tier_id, ticketCode, qrPayload, reservation.price, cardDetails.cardholderName || 'Attendee');

        ticketItems.push({
          itemId,
          ticketCode,
          qrPayload,
          tierName: reservation.tier_name,
          price: reservation.price
        });
      }

      // 3. Insert Transaction Record
      const transactionId = uuidv4();
      const gatewayResponse = JSON.stringify({
        gateway: 'MockPaymentGateway',
        authCode: 'AUTH_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        network: 'VISA_TEST',
        simulatedAt: new Date().toISOString()
      });

      db.prepare(`
        INSERT INTO transactions (
          id, order_id, gateway_tx_id, amount, currency, status, payment_method, gateway_response, created_at
        ) VALUES (?, ?, ?, ?, 'USD', 'SUCCESS', ?, ?, datetime('now'))
      `).run(transactionId, orderId, gatewayTxId, totalAmount, paymentMethod, gatewayResponse);

      // 4. Update reservation to COMPLETED
      db.prepare("UPDATE reservations SET status = 'COMPLETED' WHERE id = ?").run(reservationId);

      return {
        orderId,
        orderNumber,
        totalAmount,
        ticketItems,
        gatewayTxId,
        transactionId
      };
    });

    const result = executeOrderCreation();

    // Invalidate Redis/memory cache
    cacheService.invalidateEvent(reservation.event_id);

    // Generate real Base64 QR code for each ticket
    const ticketsWithQr = await Promise.all(
      result.ticketItems.map(async (item) => {
        const qrBase64 = await QRCode.toDataURL(item.qrPayload, {
          width: 240,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        return {
          ...item,
          qrImage: qrBase64
        };
      })
    );

    return {
      success: true,
      status: 'SUCCESS',
      message: 'Payment simulation approved! Your tickets have been confirmed.',
      order: {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        totalAmount: result.totalAmount,
        eventTitle: reservation.event_title,
        eventId: reservation.event_id,
        tierName: reservation.tier_name,
        quantity: reservation.quantity,
        tickets: ticketsWithQr,
        gatewayTxId: result.gatewayTxId
      }
    };
  }

  /**
   * Get order details by orderId or orderNumber
   */
  async getOrderDetails(orderIdOrNumber, userId = null) {
    const order = db.prepare(`
      SELECT o.*, e.title AS event_title, e.venue, e.event_date, e.banner_url,
             u.name AS user_name, u.email AS user_email, t.name AS tenant_name
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN reservations r ON o.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE o.id = ? OR o.order_number = ?
    `).get(orderIdOrNumber, orderIdOrNumber);

    if (!order) return null;

    if (userId && order.user_id !== userId) {
      const err = new Error('Unauthorized to view this order');
      err.status = 403;
      throw err;
    }

    const items = db.prepare(`
      SELECT oi.*, tt.name AS tier_name
      FROM order_items oi
      JOIN ticket_tiers tt ON oi.tier_id = tt.id
      WHERE oi.order_id = ?
    `).all(order.id);

    const itemsWithQr = await Promise.all(
      items.map(async (item) => {
        const qrBase64 = await QRCode.toDataURL(item.qr_data, {
          width: 240,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        return {
          ...item,
          qrImage: qrBase64
        };
      })
    );

    const transaction = db.prepare('SELECT * FROM transactions WHERE order_id = ?').get(order.id);

    return {
      ...order,
      items: itemsWithQr,
      transaction
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;

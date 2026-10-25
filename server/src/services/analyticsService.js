import db from '../db/connection.js';

class AnalyticsService {
  /**
   * Get analytics dashboard metrics for an organizer (tenant) or admin
   */
  getOrganizerAnalytics(tenantId = null) {
    const tenantFilter = tenantId ? 'WHERE e.tenant_id = ?' : '';
    const orderTenantFilter = tenantId ? 'WHERE o.tenant_id = ?' : '';
    const resTenantFilter = tenantId ? 'WHERE e.tenant_id = ?' : '';

    // 1. Overview KPIs: Total Revenue, Total Orders, Total Tickets Sold
    const kpiParams = tenantId ? [tenantId] : [];
    const kpis = db.prepare(`
      SELECT 
        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi_count.items_count), 0) AS total_tickets_sold
      FROM orders o
      LEFT JOIN (
        SELECT order_id, COUNT(*) AS items_count
        FROM order_items
        GROUP BY order_id
      ) oi_count ON o.id = oi_count.order_id
      ${orderTenantFilter ? 'WHERE o.tenant_id = ? AND o.status = "PAID"' : 'WHERE o.status = "PAID"'}
    `).get(...kpiParams);

    // 2. Conversion Funnel: Views -> Holds -> Paid Orders
    const viewsData = db.prepare(`
      SELECT COALESCE(SUM(view_count), 0) AS total_views
      FROM events e
      ${tenantFilter}
    `).get(...kpiParams);

    const holdsData = db.prepare(`
      SELECT 
        COUNT(r.id) AS total_holds_created,
        COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_holds,
        COALESCE(SUM(CASE WHEN r.status = 'EXPIRED' THEN 1 ELSE 0 END), 0) AS expired_holds,
        COALESCE(SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_holds
      FROM reservations r
      JOIN events e ON r.event_id = e.id
      ${resTenantFilter}
    `).get(...kpiParams);

    const totalViews = viewsData.total_views || 100;
    const totalHolds = holdsData.total_holds_created || 0;
    const completedHolds = holdsData.completed_holds || 0;
    
    // Conversion rates
    const holdConversionRate = totalHolds > 0 ? ((completedHolds / totalHolds) * 100).toFixed(1) : '0.0';
    const viewToPurchaseRate = totalViews > 0 ? ((kpis.total_orders / totalViews) * 100).toFixed(1) : '0.0';

    // 3. Tier Breakdown: Sales & Revenue by Tier
    const tierParams = tenantId ? [tenantId] : [];
    const tierBreakdown = db.prepare(`
      SELECT 
        tt.name AS tier_name,
        e.title AS event_title,
        tt.total_capacity,
        tt.price,
        COUNT(oi.id) AS sold_tickets,
        COALESCE(SUM(oi.price), 0) AS tier_revenue,
        ROUND((COUNT(oi.id) * 100.0) / tt.total_capacity, 1) AS utilization_rate
      FROM ticket_tiers tt
      JOIN events e ON tt.event_id = e.id
      LEFT JOIN order_items oi ON oi.tier_id = tt.id
      ${tenantId ? 'WHERE e.tenant_id = ?' : ''}
      GROUP BY tt.id
      ORDER BY tier_revenue DESC
      LIMIT 10
    `).all(...tierParams);

    // 4. Sales Trends (Daily / Recent sales)
    const salesTrends = db.prepare(`
      SELECT 
        date(o.created_at) AS sale_date,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS daily_revenue
      FROM orders o
      ${orderTenantFilter ? 'WHERE o.tenant_id = ? AND o.status = "PAID"' : 'WHERE o.status = "PAID"'}
      GROUP BY date(o.created_at)
      ORDER BY sale_date ASC
      LIMIT 14
    `).all(...kpiParams);

    // 5. Recent Live Orders Feed
    const recentOrders = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        u.name AS buyer_name,
        u.email AS buyer_email,
        e.title AS event_title,
        COUNT(oi.id) AS ticket_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN reservations r ON o.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${orderTenantFilter}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 8
    `).all(...kpiParams);

    return {
      kpis: {
        totalRevenue: kpis.total_revenue || 0,
        totalOrders: kpis.total_orders || 0,
        totalTicketsSold: kpis.total_tickets_sold || 0,
        holdConversionRate: parseFloat(holdConversionRate),
        viewToPurchaseRate: parseFloat(viewToPurchaseRate)
      },
      funnel: {
        views: totalViews,
        holds: totalHolds,
        completedOrders: completedHolds,
        expiredHolds: holdsData.expired_holds || 0,
        cancelledHolds: holdsData.cancelled_holds || 0
      },
      tierBreakdown,
      salesTrends,
      recentOrders
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

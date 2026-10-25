import analyticsService from '../services/analyticsService.js';

export function getDashboardAnalytics(req, res) {
  try {
    const isPlatformAdmin = req.user.role === 'ADMIN';
    const tenantId = isPlatformAdmin ? (req.query.tenant_id || null) : req.user.tenant_id;

    const data = analyticsService.getOrganizerAnalytics(tenantId);

    res.json({
      tenantId: tenantId || 'ALL_TENANTS',
      analytics: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

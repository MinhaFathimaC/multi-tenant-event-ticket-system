/**
 * Role-Based Access Control (RBAC) Middleware
 * Allowed roles: 'ADMIN', 'ORGANIZER', 'ATTENDEE'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' is not authorized. Required: [${allowedRoles.join(', ')}]`
      });
    }

    next;
    next();
  };
}

/**
 * Ensures an organizer can only access or modify their own tenant's resources
 * Admins bypass this tenant isolation.
 */
export function requireTenantOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const requestedTenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
  if (requestedTenantId && req.user.tenant_id !== requestedTenantId) {
    return res.status(403).json({
      error: 'Forbidden. You cannot manage resources belonging to another organization/tenant.'
    });
  }

  next();
}

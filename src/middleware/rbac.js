const ROLE_HIERARCHY = {
  SuperAdmin:   4,
  TenantAdmin:  3,
  Member:       2,
  Viewer:       1,
};

// requireRole('TenantAdmin') — user must be TenantAdmin or higher
function requireRole(...roles) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] ?? 0;
    const requiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 999));

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user?.role,
      });
    }

    next();
  };
}

module.exports = { requireRole };

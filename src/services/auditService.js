const { pool } = require('../../db');

async function log({
  tenantId,
  userId,
  userEmail,
  userRole,          // role at time of action — roles change, log should not
  action,            // 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
  resource,          // table name
  resourceId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) {
  const query = `
    INSERT INTO audit_logs
      (tenant_id, user_id, user_email, user_role, action, resource,
       resource_id, old_values, new_values, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

  const values = [
    tenantId, userId, userEmail, userRole, action, resource,
    resourceId,
    oldValues  ? JSON.stringify(oldValues)  : null,
    newValues  ? JSON.stringify(newValues)  : null,
    ipAddress,
    userAgent,
  ];

  // Fire-and-forget — audit logging must never block or fail a user request
  pool.query(query, values).catch((err) => {
    console.error('[AuditService] Failed to write log:', err.message);
  });
}

module.exports = { log };

const { pool } = require('../../db');

// List all projects for a tenant — tenantId is ALWAYS from the JWT
async function listProjects(tenantId) {
  const result = await pool.query(
    `SELECT id, name, description, created_by, created_at
     FROM projects
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
}

// Get a single project — returns null if it belongs to a different tenant
// NOTE: Returns 404 (not 403) intentionally — don't reveal the resource exists
async function getProject(id, tenantId) {
  const result = await pool.query(
    `SELECT id, name, description, created_by, created_at
     FROM projects
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return result.rows[0] || null;
}

async function createProject({ tenantId, name, description, createdBy }) {
  const result = await pool.query(
    `INSERT INTO projects (tenant_id, name, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, name, description, createdBy]
  );
  return result.rows[0];
}

async function updateProject(id, tenantId, updates) {
  const result = await pool.query(
    `UPDATE projects
     SET name = COALESCE($3, name),
         description = COALESCE($4, description),
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, updates.name, updates.description]
  );
  return result.rows[0] || null;
}

async function deleteProject(id, tenantId) {
  const result = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  return result.rows[0] || null;
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };

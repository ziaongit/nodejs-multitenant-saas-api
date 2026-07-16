require('dotenv').config();
const request = require('supertest');
const app     = require('../app');
const { generateToken } = require('../src/utils/token');
const { pool } = require('../db');

// Test fixture: two tenants, one project each
async function seedTestData() {
  await pool.query(`DELETE FROM projects WHERE name LIKE 'TEST-%'`);
  await pool.query(`DELETE FROM tenants WHERE name IN ('Tenant A', 'Tenant B')`);

  const tenantA = (await pool.query(
    `INSERT INTO tenants (name, plan) VALUES ('Tenant A', 'pro') RETURNING id`
  )).rows[0].id;

  const tenantB = (await pool.query(
    `INSERT INTO tenants (name, plan) VALUES ('Tenant B', 'pro') RETURNING id`
  )).rows[0].id;

  const userA = (await pool.query(
    `INSERT INTO users (tenant_id, email, role) VALUES ($1, 'usera@a.com', 'Member') RETURNING id`,
    [tenantA]
  )).rows[0].id;

  // Create a user in tenantB so the created_by FK reference is valid
  const userB = (await pool.query(
    `INSERT INTO users (tenant_id, email, role) VALUES ($1, 'userb@b.com', 'Member') RETURNING id`,
    [tenantB]
  )).rows[0].id;

  const projectB = (await pool.query(
    `INSERT INTO projects (tenant_id, name, created_by)
     VALUES ($1, 'TEST-Secret Project', $2) RETURNING id`,
    [tenantB, userB]
  )).rows[0].id;

  return { tenantA, tenantB, userA, userB, projectB };
}

describe('Tenant Isolation', () => {
  let data;

  beforeAll(async () => {
    data = await seedTestData();
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM tenants WHERE name IN ('Tenant A', 'Tenant B')`);
    await pool.end();
  });

  test('Tenant A user cannot read Tenant B project', async () => {
    const token = generateToken({
      userId:   data.userA,
      tenantId: data.tenantA,   // Tenant A token
      email:    'usera@a.com',
      role:     'Member',
    });

    const res = await request(app)
      .get(`/api/projects/${data.projectB}`)  // Tenant B's project ID
      .set('Authorization', `Bearer ${token}`);

    // Must be 404, not 200 or 403
    expect(res.status).toBe(404);
  });

  test('Tenant A user cannot list Tenant B projects', async () => {
    const token = generateToken({
      userId:   data.userA,
      tenantId: data.tenantA,
      email:    'usera@a.com',
      role:     'TenantAdmin',
    });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Response must contain zero Tenant B projects
    const names = res.body.map(p => p.name);
    expect(names).not.toContain('TEST-Secret Project');
  });

  test('Viewer cannot delete a project', async () => {
    const token = generateToken({
      userId:   data.userA,
      tenantId: data.tenantA,
      email:    'usera@a.com',
      role:     'Viewer',
    });

    const res = await request(app)
      .delete(`/api/projects/${data.projectB}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

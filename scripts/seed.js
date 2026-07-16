require('dotenv').config();
const { pool } = require('../db');
const { generateToken } = require('../src/utils/token');

async function seed() {
  console.log('Seeding database...');

  // Create a tenant
  const tenant = (await pool.query(
    `INSERT INTO tenants (name, plan) VALUES ('Acme Corp', 'pro')
     ON CONFLICT DO NOTHING RETURNING id`
  )).rows[0];

  if (!tenant) {
    console.log('Tenant already exists — skipping seed. Drop the DB and re-run if needed.');
    await pool.end();
    return;
  }

  // Create two users
  const admin = (await pool.query(
    `INSERT INTO users (tenant_id, email, role)
     VALUES ($1, 'admin@acme.com', 'TenantAdmin') RETURNING id`,
    [tenant.id]
  )).rows[0];

  const viewer = (await pool.query(
    `INSERT INTO users (tenant_id, email, role)
     VALUES ($1, 'viewer@acme.com', 'Viewer') RETURNING id`,
    [tenant.id]
  )).rows[0];

  // Generate tokens
  const adminToken = generateToken({
    userId:   admin.id,
    tenantId: tenant.id,
    email:    'admin@acme.com',
    role:     'TenantAdmin',
  });

  const viewerToken = generateToken({
    userId:   viewer.id,
    tenantId: tenant.id,
    email:    'viewer@acme.com',
    role:     'Viewer',
  });

  console.log('\n✅ Seed complete\n');
  console.log('TenantAdmin token (full access):');
  console.log(adminToken);
  console.log('\nViewer token (read-only):');
  console.log(viewerToken);
  console.log('\nTest commands:');
  console.log(`curl.exe -H "Authorization: Bearer ${adminToken}" http://localhost:3001/api/projects`);

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

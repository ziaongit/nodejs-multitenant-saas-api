const express = require('express');
const { authMiddleware }  = require('../middleware/auth');
const { requireRole }     = require('../middleware/rbac');
const { defaultLimiter }  = require('../middleware/rateLimiter');
const audit               = require('../services/auditService');
const repo                = require('../repositories/projectRepo');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(defaultLimiter);

// GET /api/projects — list all (Viewer and above)
router.get('/', async (req, res) => {
  const projects = await repo.listProjects(req.user.tenantId);

  audit.log({
    tenantId:   req.user.tenantId,
    userId:     req.user.userId,
    userEmail:  req.user.email,
    userRole:   req.user.role,
    action:     'VIEW',
    resource:   'projects',
    ipAddress:  req.ip,
    userAgent:  req.headers['user-agent'],
  });

  res.json(projects);
});

// GET /api/projects/:id — single project (Viewer and above)
router.get('/:id', async (req, res) => {
  const project = await repo.getProject(req.params.id, req.user.tenantId);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// POST /api/projects — create (Member and above)
router.post('/', requireRole('Member', 'TenantAdmin', 'SuperAdmin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const project = await repo.createProject({
    tenantId:    req.user.tenantId,
    name,
    description,
    createdBy:   req.user.userId,
  });

  audit.log({
    tenantId:    req.user.tenantId,
    userId:      req.user.userId,
    userEmail:   req.user.email,
    userRole:    req.user.role,
    action:      'CREATE',
    resource:    'projects',
    resourceId:  project.id,
    newValues:   project,
    ipAddress:   req.ip,
    userAgent:   req.headers['user-agent'],
  });

  res.status(201).json(project);
});

// PUT /api/projects/:id — update (Member and above)
router.put('/:id', requireRole('Member', 'TenantAdmin', 'SuperAdmin'), async (req, res) => {
  const oldProject = await repo.getProject(req.params.id, req.user.tenantId);
  if (!oldProject) return res.status(404).json({ error: 'Not found' });

  const updated = await repo.updateProject(req.params.id, req.user.tenantId, req.body);

  audit.log({
    tenantId:    req.user.tenantId,
    userId:      req.user.userId,
    userEmail:   req.user.email,
    userRole:    req.user.role,
    action:      'UPDATE',
    resource:    'projects',
    resourceId:  req.params.id,
    oldValues:   oldProject,
    newValues:   updated,
    ipAddress:   req.ip,
    userAgent:   req.headers['user-agent'],
  });

  res.json(updated);
});

// DELETE /api/projects/:id — TenantAdmin and above only
router.delete('/:id', requireRole('TenantAdmin', 'SuperAdmin'), async (req, res) => {
  const project = await repo.getProject(req.params.id, req.user.tenantId);
  if (!project) return res.status(404).json({ error: 'Not found' });

  await repo.deleteProject(req.params.id, req.user.tenantId);

  audit.log({
    tenantId:    req.user.tenantId,
    userId:      req.user.userId,
    userEmail:   req.user.email,
    userRole:    req.user.role,
    action:      'DELETE',
    resource:    'projects',
    resourceId:  req.params.id,
    oldValues:   project,
    ipAddress:   req.ip,
    userAgent:   req.headers['user-agent'],
  });

  res.json({ deleted: true });
});

module.exports = router;

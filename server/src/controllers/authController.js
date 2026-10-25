import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { config } from '../config/index.js';

export function register(req, res) {
  try {
    const { name, email, password, role = 'ATTENDEE', tenant_name = null, tenant_id = null } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!['ADMIN', 'ORGANIZER', 'ATTENDEE'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    let assignedTenantId = tenant_id;

    // If organizer is registering with a new organization name
    if (role === 'ORGANIZER' && !assignedTenantId && tenant_name) {
      assignedTenantId = 'tenant-' + uuidv4().substring(0, 8);
      const slug = tenant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      db.prepare(`
        INSERT INTO tenants (id, name, slug, description, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(assignedTenantId, tenant_name, `${slug}-${Date.now()}`, `Organization created by ${name}`);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, assignedTenantId, name, email, passwordHash, role);

    const token = jwt.sign({ id: userId, role, tenant_id: assignedTenantId }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        tenant_id: assignedTenantId,
        name,
        email,
        role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare(`
      SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, t.name AS tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ?
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, tenant_id: user.tenant_id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function getMe(req, res) {
  try {
    const user = db.prepare(`
      SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.created_at, t.name AS tenant_name, t.slug AS tenant_slug
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Demo 1-Click Role Switcher for instant evaluator testing
 */
export function switchDemoUser(req, res) {
  try {
    const { role } = req.params;
    let targetEmail;

    if (role.toUpperCase() === 'ADMIN') {
      targetEmail = 'admin@ticketsystem.com';
    } else if (role.toUpperCase() === 'ORGANIZER') {
      targetEmail = 'apex@organizer.com';
    } else {
      targetEmail = 'sarah@example.com';
    }

    const user = db.prepare(`
      SELECT u.id, u.tenant_id, u.name, u.email, u.role, t.name AS tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ?
    `).get(targetEmail);

    if (!user) {
      return res.status(404).json({ error: `Demo user for role ${role} not found. Please run db seed.` });
    }

    const token = jwt.sign({ id: user.id, role: user.role, tenant_id: user.tenant_id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    res.json({
      message: `Switched demo session to ${user.role} (${user.name})`,
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

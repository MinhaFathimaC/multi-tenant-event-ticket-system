import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import cacheService from '../services/cacheService.js';
import reservationEngine from '../services/reservationEngine.js';

export async function getEvents(req, res) {
  try {
    const { category, search, tenant_id, status = 'ACTIVE' } = req.query;
    const cacheKey = `events:list:${category || 'all'}:${tenant_id || 'all'}:${status}:${search || ''}`;

    // 1. Check Redis Cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ events: cached, source: 'cache' });
    }

    // 2. Build Query
    let query = `
      SELECT e.*, t.name AS tenant_name, t.slug AS tenant_slug,
        (SELECT MIN(price) FROM ticket_tiers WHERE event_id = e.id) AS starting_price,
        (SELECT SUM(total_capacity) FROM ticket_tiers WHERE event_id = e.id) AS total_capacity
      FROM events e
      JOIN tenants t ON e.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }
    if (tenant_id) {
      query += ' AND e.tenant_id = ?';
      params.push(tenant_id);
    }
    if (search) {
      query += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY e.event_date ASC';

    const events = db.prepare(query).all(...params);

    // Attach basic tier summary
    const eventsWithTiers = events.map((ev) => {
      const tiers = db.prepare('SELECT id, name, price, total_capacity FROM ticket_tiers WHERE event_id = ?').all(ev.id);
      return {
        ...ev,
        tiers
      };
    });

    // Cache in Redis for 60 seconds
    await cacheService.set(cacheKey, eventsWithTiers, 60);

    res.json({ events: eventsWithTiers, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const cacheKey = `event:${id}`;

    // Increment view count asynchronously
    db.prepare('UPDATE events SET view_count = view_count + 1 WHERE id = ?').run(id);

    // 1. Check Redis Cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      // Refresh dynamic real-time inventory for tiers
      const tiersWithLiveInventory = cached.tiers.map((t) => reservationEngine.getTierInventory(t.id));
      return res.json({
        event: {
          ...cached,
          tiers: tiersWithLiveInventory
        },
        source: 'cache'
      });
    }

    // 2. Fetch from DB
    const event = db.prepare(`
      SELECT e.*, t.name AS tenant_name, t.slug AS tenant_slug, t.description AS tenant_description
      FROM events e
      JOIN tenants t ON e.tenant_id = t.id
      WHERE e.id = ? OR e.slug = ?
    `).get(id, id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // 3. Fetch tiers with real-time inventory
    const tiers = db.prepare('SELECT * FROM ticket_tiers WHERE event_id = ? ORDER BY price ASC').all(event.id);
    const tiersWithLiveInventory = tiers.map((t) => ({
      ...t,
      ...reservationEngine.getTierInventory(t.id)
    }));

    const eventData = {
      ...event,
      tiers: tiersWithLiveInventory
    };

    // Cache in Redis for 30s
    await cacheService.set(cacheKey, eventData, 30);

    res.json({ event: eventData, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      category = 'Concert',
      banner_url,
      venue,
      event_date,
      sales_cutoff_date,
      tiers = []
    } = req.body;

    if (!title || !description || !venue || !event_date || !sales_cutoff_date) {
      return res.status(400).json({ error: 'Title, description, venue, event_date, and sales_cutoff_date are required.' });
    }

    if (!tiers || tiers.length === 0) {
      return res.status(400).json({ error: 'At least one ticket tier must be provided.' });
    }

    const tenantId = req.user.role === 'ADMIN' ? (req.body.tenant_id || req.user.tenant_id || 'tenant-apex-1') : req.user.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Organizer does not belong to any tenant organization.' });
    }

    const eventId = uuidv4();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-5);

    const executeCreate = db.transaction(() => {
      db.prepare(`
        INSERT INTO events (
          id, tenant_id, title, slug, description, category, banner_url, venue, event_date, sales_cutoff_date, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
      `).run(eventId, tenantId, title, slug, description, category, banner_url || null, venue, event_date, sales_cutoff_date);

      for (const tier of tiers) {
        const tierId = uuidv4();
        db.prepare(`
          INSERT INTO ticket_tiers (
            id, event_id, name, price, total_capacity, perks, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(tierId, eventId, tier.name, tier.price, tier.total_capacity, tier.perks || null);
      }
    });

    executeCreate();

    // Invalidate Redis caches
    await cacheService.delPattern('events:*');

    const createdEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    const createdTiers = db.prepare('SELECT * FROM ticket_tiers WHERE event_id = ?').all(eventId);

    res.status(201).json({
      message: 'Event created successfully.',
      event: {
        ...createdEvent,
        tiers: createdTiers
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { title, description, category, banner_url, venue, event_date, sales_cutoff_date, status } = req.body;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'ADMIN' && event.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    db.prepare(`
      UPDATE events
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          banner_url = COALESCE(?, banner_url),
          venue = COALESCE(?, venue),
          event_date = COALESCE(?, event_date),
          sales_cutoff_date = COALESCE(?, sales_cutoff_date),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(title, description, category, banner_url, venue, event_date, sales_cutoff_date, status, id);

    await cacheService.invalidateEvent(id);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json({ message: 'Event updated successfully.', event: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'ADMIN' && event.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    await cacheService.invalidateEvent(id);

    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

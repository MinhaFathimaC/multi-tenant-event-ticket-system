import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './connection.js';
import initDatabase from './initDb.js';

export function seed() {
  console.log('[Seed] Initializing schema and populating demo seed data...');
  initDatabase();

  // Clean existing data
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM reservations;
    DELETE FROM ticket_tiers;
    DELETE FROM events;
    DELETE FROM users;
    DELETE FROM tenants;
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);
  const orgHash = bcrypt.hashSync('organizer123', 10);
  const attendeeHash = bcrypt.hashSync('attendee123', 10);

  // 1. Tenants
  const tenantApex = {
    id: 'tenant-apex-1',
    name: 'Apex Entertainment Group',
    slug: 'apex-entertainment',
    description: 'Global concert and tech festival promoter producing premium experiences worldwide.',
    logo_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80'
  };

  const tenantTech = {
    id: 'tenant-tech-2',
    name: 'CyberTech Summits',
    slug: 'cybertech-summits',
    description: 'Premier enterprise AI, developer conference, and cutting-edge software summits.',
    logo_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150&auto=format&fit=crop&q=80'
  };

  const tenantSound = {
    id: 'tenant-sound-3',
    name: 'SoundPulse Global',
    slug: 'soundpulse-global',
    description: 'Electronic dance music and stadium touring powerhouse.',
    logo_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80'
  };

  const insertTenant = db.prepare(`
    INSERT INTO tenants (id, name, slug, description, logo_url, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '-30 days'))
  `);

  insertTenant.run(tenantApex.id, tenantApex.name, tenantApex.slug, tenantApex.description, tenantApex.logo_url);
  insertTenant.run(tenantTech.id, tenantTech.name, tenantTech.slug, tenantTech.description, tenantTech.logo_url);
  insertTenant.run(tenantSound.id, tenantSound.name, tenantSound.slug, tenantSound.description, tenantSound.logo_url);

  // 2. Users (RBAC)
  const insertUser = db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-25 days'))
  `);

  const adminId = 'usr-admin-1';
  const orgApexId = 'usr-org-apex';
  const orgTechId = 'usr-org-tech';
  const attendee1Id = 'usr-attendee-sarah';
  const attendee2Id = 'usr-attendee-alex';
  const attendee3Id = 'usr-attendee-marcus';

  insertUser.run(adminId, null, 'Platform Administrator', 'admin@ticketsystem.com', adminHash, 'ADMIN');
  insertUser.run(orgApexId, tenantApex.id, 'Elena Rostova (Apex Director)', 'apex@organizer.com', orgHash, 'ORGANIZER');
  insertUser.run(orgTechId, tenantTech.id, 'David Chen (CyberTech Lead)', 'tech@organizer.com', orgHash, 'ORGANIZER');
  insertUser.run(attendee1Id, null, 'Sarah Jenkins', 'sarah@example.com', attendeeHash, 'ATTENDEE');
  insertUser.run(attendee2Id, null, 'Alex Rivera', 'alex@example.com', attendeeHash, 'ATTENDEE');
  insertUser.run(attendee3Id, null, 'Marcus Brody', 'marcus@example.com', attendeeHash, 'ATTENDEE');

  // 3. Events
  const insertEvent = db.prepare(`
    INSERT INTO events (
      id, tenant_id, title, slug, description, category, banner_url, venue, event_date, sales_cutoff_date, status, view_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(?), datetime(?), 'ACTIVE', ?, datetime('now', '-15 days'))
  `);

  const ev1Id = 'ev-ai-summit-2026';
  const ev2Id = 'ev-neon-horizon-2026';
  const ev3Id = 'ev-fintech-disrupt-2026';
  const ev4Id = 'ev-cyber-esports-2026';

  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString();
  const in28Days = new Date(Date.now() + 28 * 86400000).toISOString();
  const in45Days = new Date(Date.now() + 45 * 86400000).toISOString();
  const in44Days = new Date(Date.now() + 44 * 86400000).toISOString();
  const in20Days = new Date(Date.now() + 20 * 86400000).toISOString();
  const in19Days = new Date(Date.now() + 19 * 86400000).toISOString();
  const in15Days = new Date(Date.now() + 15 * 86400000).toISOString();
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString();

  insertEvent.run(
    ev1Id,
    tenantTech.id,
    'Global AI & Cloud Architecture Summit 2026',
    'global-ai-cloud-summit-2026',
    'Join 4,000+ top software architects, AI researchers, and engineering leaders. Featuring keynotes from pioneers in autonomous agents, large-scale distributed databases, and high-performance cloud clusters.',
    'Technology',
    '/images/ai_summit.jpg',
    'Moscone Center South, San Francisco, CA',
    in30Days,
    in28Days,
    1480
  );

  insertEvent.run(
    ev2Id,
    tenantApex.id,
    'Neon Horizon EDM Music Festival 2026',
    'neon-horizon-edm-festival-2026',
    'Three days of non-stop electronic music across 4 immersive stages, mind-bending lasers, spatial audio, and world-class headliner DJs under the illuminated Miami skyline.',
    'Concert',
    '/images/neon_edm.jpg',
    'Bayfront Amphitheater, Miami, FL',
    in45Days,
    in44Days,
    2950
  );

  insertEvent.run(
    ev3Id,
    tenantTech.id,
    'FinTech Disrupt & Quantum Payments 2026',
    'fintech-disrupt-quantum-payments-2026',
    'The premier European fintech expo exploring atomic settlement, next-gen ledger architectures, institutional digital assets, and high-frequency risk compliance.',
    'Business',
    '/images/fintech_disrupt.jpg',
    'ExCeL London International Convention Centre, UK',
    in20Days,
    in19Days,
    890
  );

  insertEvent.run(
    ev4Id,
    tenantSound.id,
    'Cyberpunk World Esports Grand Finals',
    'cyberpunk-world-esports-finals-2026',
    'Witness the top 16 global teams battle for the $2,500,000 prize pool live on massive 360-degree LED jumbotrons with state-of-the-art haptic spectator pods.',
    'Gaming',
    '/images/esports_finals.jpg',
    'Crypto.com Arena, Los Angeles, CA',
    in15Days,
    in14Days,
    1640
  );

  // 4. Ticket Tiers
  const insertTier = db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, perks, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-15 days'))
  `);

  // Event 1 Tiers (AI Summit)
  const tierAiEarly = 'tier-ai-early';
  const tierAiVip = 'tier-ai-vip';
  const tierAiGen = 'tier-ai-gen';
  insertTier.run(tierAiEarly, ev1Id, 'Early Bird Access', 199.00, 80, 'Full 3-day access, Expo Hall, Lunch Buffets, Conference Swag');
  insertTier.run(tierAiVip, ev1Id, 'VIP Executive Pass', 599.00, 25, 'VIP Lounge, Priority Keynote Seating, Speaker Dinner & 1-on-1 Sessions');
  insertTier.run(tierAiGen, ev1Id, 'General Admission', 299.00, 150, 'All stage sessions, Expo Hall, Networking App access');

  // Event 2 Tiers (Neon Horizon)
  const tierEdmGa = 'tier-edm-ga';
  const tierEdmVip = 'tier-edm-vip';
  const tierEdmBackstage = 'tier-edm-backstage';
  insertTier.run(tierEdmGa, ev2Id, '3-Day General Admission', 129.00, 250, 'Full 3-day festival grounds access, water refill stations');
  insertTier.run(tierEdmVip, ev2Id, 'VIP Sky Deck Lounge', 349.00, 50, 'Elevated viewing platform, dedicated air-conditioned restrooms, 4 complimentary drink tokens');
  insertTier.run(tierEdmBackstage, ev2Id, 'All-Access Backstage Pass', 799.00, 10, 'Side-stage viewing, artist lounge access, commemorative metal badge');

  // Event 3 Tiers (Fintech)
  const tierFinGa = 'tier-fin-ga';
  const tierFinInv = 'tier-fin-inv';
  insertTier.run(tierFinGa, ev3Id, 'Delegate Standard', 349.00, 100, 'Access to all keynote stages, networking reception, digital session recordings');
  insertTier.run(tierFinInv, ev3Id, 'Founders & Investors VIP', 899.00, 20, 'Exclusive Dealflow Room, LP Speed Dating, Private Gala Dinner');

  // Event 4 Tiers (Gaming)
  const tierGameBleach = 'tier-game-bleach';
  const tierGameFloor = 'tier-game-floor';
  insertTier.run(tierGameBleach, ev4Id, 'Arena Upper Bowl', 45.00, 200, 'Reserved seat in upper bowl, tournament booklet');
  insertTier.run(tierGameFloor, ev4Id, 'Floor VIP + Player Meet', 160.00, 40, 'Floor row seat in front of stage, limited jersey, autograph signing');

  // 5. Seed Historical Orders & Reservations spanning the past 10 days for rich Analytics
  console.log('[Seed] Generating historical transactions for analytics engine...');
  
  const seedOrdersData = [
    { buyerId: attendee1Id, tierId: tierAiEarly, eventId: ev1Id, tenantId: tenantTech.id, qty: 2, daysAgo: 8 },
    { buyerId: attendee2Id, tierId: tierAiVip, eventId: ev1Id, tenantId: tenantTech.id, qty: 1, daysAgo: 7 },
    { buyerId: attendee3Id, tierId: tierEdmGa, eventId: ev2Id, tenantId: tenantApex.id, qty: 3, daysAgo: 6 },
    { buyerId: attendee1Id, tierId: tierEdmVip, eventId: ev2Id, tenantId: tenantApex.id, qty: 2, daysAgo: 5 },
    { buyerId: attendee2Id, tierId: tierFinGa, eventId: ev3Id, tenantId: tenantTech.id, qty: 1, daysAgo: 4 },
    { buyerId: attendee3Id, tierId: tierFinInv, eventId: ev3Id, tenantId: tenantTech.id, qty: 1, daysAgo: 3 },
    { buyerId: attendee1Id, tierId: tierGameFloor, eventId: ev4Id, tenantId: tenantSound.id, qty: 2, daysAgo: 2 },
    { buyerId: attendee2Id, tierId: tierAiGen, eventId: ev1Id, tenantId: tenantTech.id, qty: 2, daysAgo: 1 },
    { buyerId: attendee3Id, tierId: tierEdmGa, eventId: ev2Id, tenantId: tenantApex.id, qty: 2, daysAgo: 0 }
  ];

  for (const s of seedOrdersData) {
    const tier = db.prepare('SELECT name, price FROM ticket_tiers WHERE id = ?').get(s.tierId);
    const totalAmount = tier.price * s.qty;
    const resId = 'res-seed-' + uuidv4().substring(0, 8);
    const orderId = 'ord-seed-' + uuidv4().substring(0, 8);
    const orderNumber = `ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // Completed reservation
    db.prepare(`
      INSERT INTO reservations (id, user_id, event_id, tier_id, quantity, status, held_at, expires_at, client_ip)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', datetime('now', '-${s.daysAgo} days', '-15 minutes'), datetime('now', '-${s.daysAgo} days', '-5 minutes'), '127.0.0.1')
    `).run(resId, s.buyerId, s.eventId, s.tierId, s.qty);

    // Paid Order
    db.prepare(`
      INSERT INTO orders (id, order_number, tenant_id, user_id, reservation_id, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PAID', datetime('now', '-${s.daysAgo} days'))
    `).run(orderId, orderNumber, s.tenantId, s.buyerId, resId, totalAmount);

    // Order items
    for (let i = 0; i < s.qty; i++) {
      const code = `TCK-${tier.name.substring(0, 3).toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`;
      const qrPayload = JSON.stringify({ ticketCode: code, orderNumber, tier: tier.name });
      db.prepare(`
        INSERT INTO order_items (id, order_id, tier_id, ticket_code, qr_data, price, attendee_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), orderId, s.tierId, code, qrPayload, tier.price, 'Demo Attendee');
    }

    // Transaction
    db.prepare(`
      INSERT INTO transactions (id, order_id, gateway_tx_id, amount, currency, status, payment_method, gateway_response, created_at)
      VALUES (?, ?, ?, ?, 'USD', 'SUCCESS', 'CREDIT_CARD', '{"simulated": true, "auth": "OK"}', datetime('now', '-${s.daysAgo} days'))
    `).run(uuidv4(), orderId, `TXN_SEED_${Date.now()}_${Math.floor(Math.random() * 9999)}`, totalAmount);
  }

  // Also seed a few expired and cancelled reservations to prove the conversion funnel metrics!
  for (let j = 0; j < 5; j++) {
    db.prepare(`
      INSERT INTO reservations (id, user_id, event_id, tier_id, quantity, status, held_at, expires_at, client_ip)
      VALUES (?, ?, ?, ?, 1, 'EXPIRED', datetime('now', '-${j + 1} days', '-30 minutes'), datetime('now', '-${j + 1} days', '-20 minutes'), '127.0.0.1')
    `).run(uuidv4(), attendee1Id, ev1Id, tierAiGen);
  }

  console.log('[Seed] Seed data generation complete.');
  console.log('--------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('Admin:     admin@ticketsystem.com / admin123');
  console.log('Organizer: apex@organizer.com     / organizer123');
  console.log('Organizer: tech@organizer.com     / organizer123');
  console.log('Attendee:  sarah@example.com      / attendee123');
  console.log('--------------------------------------------------');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed();
}

export default seed;

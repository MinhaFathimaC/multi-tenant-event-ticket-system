-- Multi-Tenant Event & Ticket Reservation System Schema

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'ORGANIZER', 'ATTENDEE')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Concert',
  banner_url TEXT,
  venue TEXT NOT NULL,
  event_date DATETIME NOT NULL,
  sales_cutoff_date DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT', 'ACTIVE', 'PAST', 'CANCELLED')),
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  total_capacity INTEGER NOT NULL CHECK(total_capacity > 0),
  perks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  status TEXT NOT NULL DEFAULT 'HELD' CHECK(status IN ('HELD', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  held_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  client_ip TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  total_amount REAL NOT NULL CHECK(total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'PAID' CHECK(status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  ticket_code TEXT UNIQUE NOT NULL,
  qr_data TEXT NOT NULL,
  price REAL NOT NULL,
  attendee_name TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway_tx_id TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'DECLINED', 'TIMEOUT', 'REFUNDED')),
  payment_method TEXT DEFAULT 'CREDIT_CARD',
  gateway_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indices for fast queries and concurrency locks
CREATE INDEX IF NOT EXISTS idx_reservations_tier_status_expiry 
  ON reservations (tier_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_reservations_user 
  ON reservations (user_id, status);

CREATE INDEX IF NOT EXISTS idx_events_tenant_status 
  ON events (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event 
  ON ticket_tiers (event_id);

CREATE INDEX IF NOT EXISTS idx_orders_tenant 
  ON orders (tenant_id);

CREATE INDEX IF NOT EXISTS idx_orders_user 
  ON orders (user_id);

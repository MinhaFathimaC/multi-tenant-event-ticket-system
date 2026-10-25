import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Search, Calendar, MapPin, Ticket, ShieldCheck, Zap, Sparkles, Clock, ChevronRight } from 'lucide-react';

export function Marketplace({ onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cacheSource, setCacheSource] = useState('database');

  const categories = ['All', 'Technology', 'Concert', 'Business', 'Gaming'];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getEvents({
        category: selectedCategory === 'All' ? '' : selectedCategory,
        search: searchQuery
      });
      setEvents(res.events || []);
      setCacheSource(res.source || 'database');
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div>
      
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-tag">
          <Sparkles style={{ width: 14, height: 14, color: '#818cf8' }} />
          <span>Multi-Tenant High-Concurrency Platform</span>
        </div>

        <h1 className="hero-title">
          Reserve Tiered Tickets with <span className="gradient-text">Zero Double-Booking</span>.
        </h1>

        <p className="hero-description">
          Engineered with SQLite / PostgreSQL atomic transactional locks, Redis read caching, and an active 10-minute temporary reservation hold engine.
        </p>

        {/* Feature Pills */}
        <div className="features-pill-row">
          <div className="feature-pill-box">
            <div className="feature-pill-title">
              <ShieldCheck style={{ width: 16, height: 16, color: 'var(--primary-light)' }} />
              ACID Locks
            </div>
            <div className="feature-pill-desc">0 double-bookings guaranteed</div>
          </div>

          <div className="feature-pill-box">
            <div className="feature-pill-title">
              <Clock style={{ width: 16, height: 16, color: 'var(--amber)' }} />
              10-Min Temporary Holds
            </div>
            <div className="feature-pill-desc">Atomic seat holding before checkout</div>
          </div>

          <div className="feature-pill-box">
            <div className="feature-pill-title">
              <Zap style={{ width: 16, height: 16, color: 'var(--cyan)' }} />
              Redis Caching
            </div>
            <div className="feature-pill-desc">High read throughput under load</div>
          </div>

          <div className="feature-pill-box">
            <div className="feature-pill-title">
              <Sparkles style={{ width: 16, height: 16, color: 'var(--emerald)' }} />
              Background Worker
            </div>
            <div className="feature-pill-desc">Auto-releases stale holds every 10s</div>
          </div>
        </div>
      </section>

      {/* Filter and Search Row */}
      <div className="filter-controls-row">
        <div className="category-tabs">
          {categories.map((cat) => {
            const isSelected = (!selectedCategory && cat === 'All') || selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                className={`category-tab ${isSelected ? 'active' : ''}`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <form onSubmit={handleSearchSubmit} className="search-input-wrap">
            <Search className="search-icon" style={{ width: 16, height: 16 }} />
            <input
              type="text"
              placeholder="Search events, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>

          <span className="badge badge-indigo" style={{ padding: '6px 12px' }}>
            <Zap style={{ width: 12, height: 12 }} />
            {cacheSource === 'cache' ? 'Redis Hit' : 'DB Read'}
          </span>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <div>Loading active events...</div>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <Ticket style={{ width: 48, height: 48, color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No events found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try selecting another category or clear your search query.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((ev) => (
            <div key={ev.id} className="event-card">
              <div>
                {/* Banner */}
                <div className="event-card-banner">
                  <img
                    src={ev.banner_url || '/images/ai_summit.jpg'}
                    alt={ev.title}
                  />
                  <div className="event-card-gradient" />

                  <div className="event-badge-row">
                    <span className="badge badge-indigo">{ev.category}</span>
                  </div>

                  <div className="event-card-header-overlay">
                    <span className="event-promoter-tag">{ev.tenant_name}</span>
                    <span className="event-price-tag">From ${ev.starting_price}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="event-card-body">
                  <h3 className="event-title">{ev.title}</h3>
                  <p className="event-desc">{ev.description}</p>

                  <div className="event-meta-list">
                    <div className="event-meta-item">
                      <Calendar style={{ width: 14, height: 14, color: '#818cf8' }} />
                      <span>{new Date(ev.event_date).toLocaleDateString()}</span>
                    </div>
                    <div className="event-meta-item">
                      <MapPin style={{ width: 14, height: 14, color: '#38bdf8' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.venue}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="event-card-footer">
                <button
                  onClick={() => onSelectEvent(ev.id)}
                  className="btn btn-primary btn-full"
                >
                  <Ticket style={{ width: 16, height: 16 }} />
                  <span>Select Tier & Reserve</span>
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Marketplace;

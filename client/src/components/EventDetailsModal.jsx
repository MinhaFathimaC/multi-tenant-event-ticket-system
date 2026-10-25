import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useReservation } from '../context/ReservationContext.jsx';
import { Calendar, MapPin, Clock, ShieldCheck, Ticket, X, AlertTriangle, ArrowRight } from 'lucide-react';

export function EventDetailsModal({ eventId, onClose }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isHolding, setIsHolding] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { holdTickets } = useReservation();

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        const res = await api.getEventById(eventId);
        setEvent(res.event);
        if (res.event.tiers?.length > 0) {
          const firstAvailable = res.event.tiers.find((t) => t.available > 0) || res.event.tiers[0];
          setSelectedTierId(firstAvailable.id);
        }
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const handleReserve = async () => {
    if (!selectedTierId) return;
    setErrorMessage(null);
    setIsHolding(true);
    try {
      await holdTickets(event.id, selectedTierId, quantity);
      onClose();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsHolding(false);
    }
  };

  if (!eventId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '680px' }}>
        
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <div>Fetching real-time tier inventory...</div>
          </div>
        ) : event ? (
          <div>
            {/* Banner */}
            <div style={{ height: 220, position: 'relative', overflow: 'hidden' }}>
              <img
                src={event.banner_url || '/images/ai_summit.jpg'}
                alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f1523 0%, rgba(15,21,35,0.4) 60%, transparent 100%)' }} />
              
              <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className="badge badge-indigo">{event.category}</span>
                  <span className="badge badge-emerald">{event.tenant_name}</span>
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
                  {event.title}
                </h2>
              </div>
            </div>

            {/* Meta Row */}
            <div style={{ padding: '12px 20px', background: '#090e18', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar style={{ width: 14, height: 14, color: '#818cf8' }} />
                <span>{new Date(event.event_date).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin style={{ width: 14, height: 14, color: '#38bdf8' }} />
                <span>{event.venue}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
                <Clock style={{ width: 14, height: 14 }} />
                <span>Sales Ends: {new Date(event.sales_cutoff_date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                {event.description}
              </p>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ticket style={{ width: 16, height: 16, color: '#818cf8' }} />
                Select Tier & Place 10-Minute Hold
              </div>

              {errorMessage && (
                <div style={{ background: 'var(--rose-bg)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 'var(--radius-md)', padding: '12px', color: '#fecdd3', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: '#f43f5e' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Tiers List */}
              <div className="tiers-list">
                {event.tiers?.map((tier) => {
                  const isSelected = selectedTierId === tier.id;
                  const isSoldOut = tier.available <= 0;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTierId(tier.id)}
                      className={`tier-item ${isSelected ? 'selected' : ''} ${isSoldOut ? 'disabled' : ''}`}
                    >
                      <div className="tier-row-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="tier-name">{tier.name}</span>
                          {isSoldOut ? (
                            <span className="badge badge-rose">Sold Out</span>
                          ) : tier.available <= 5 ? (
                            <span className="badge badge-amber">Only {tier.available} Left!</span>
                          ) : (
                            <span className="badge badge-emerald">{tier.available} Available</span>
                          )}
                        </div>
                        <div className="tier-price">${tier.price}</div>
                      </div>

                      {tier.perks && (
                        <div className="tier-perks">{tier.perks}</div>
                      )}

                      <div className="capacity-meter-row">
                        <span>Total Capacity: {tier.totalCapacity}</span>
                        <span>{tier.confirmedCount} sold • {tier.heldCount} on hold</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quantity & CTA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quantity:</span>
                  <div style={{ display: 'flex', gap: '4px', background: '#090e18', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 2 }}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuantity(n)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          background: quantity === n ? 'var(--primary)' : 'transparent',
                          color: quantity === n ? '#ffffff' : 'var(--text-muted)'
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleReserve}
                  disabled={isHolding || !selectedTierId}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontSize: '0.9rem' }}
                >
                  <ShieldCheck style={{ width: 18, height: 18 }} />
                  <span>{isHolding ? 'Holding Seat...' : 'Reserve for 10 Mins'}</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>

            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default EventDetailsModal;

import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Ticket, Calendar, MapPin, CheckCircle2, QrCode } from 'lucide-react';

export function MyTickets() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketForQr, setSelectedTicketForQr] = useState(null);

  useEffect(() => {
    async function loadTickets() {
      try {
        setLoading(true);
        const res = await api.getMyTickets();
        setOrders(res.orders || []);
      } catch (err) {
        console.error('Failed to load tickets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  return (
    <div>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ticket style={{ width: 28, height: 28, color: '#818cf8' }} />
            My Ticket Passes
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Confirmed admission passes with cryptographic QR verification.
          </p>
        </div>

        <div className="badge badge-indigo" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
          Total Orders: <strong style={{ color: '#ffffff', marginLeft: 4 }}>{orders.length}</strong>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <div>Retrieving your ticket portfolio...</div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', maxWidth: '520px', margin: '0 auto' }}>
          <Ticket style={{ width: 48, height: 48, color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No ticket orders found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You haven't reserved or purchased any tickets yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {orders.map((ord) => (
            <div key={ord.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              
              {/* Order Bar */}
              <div style={{ padding: '14px 20px', background: '#0a0e18', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="badge badge-emerald">
                    <CheckCircle2 style={{ width: 14, height: 14 }} /> Confirmed Order
                  </span>
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Order: <strong style={{ color: '#ffffff' }}>{ord.order_number}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Purchased: {new Date(ord.created_at).toLocaleDateString()}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    ${ord.total_amount?.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Order Content */}
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  {ord.event_title}
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar style={{ width: 14, height: 14, color: '#818cf8' }} />
                    <span>{new Date(ord.event_date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin style={{ width: 14, height: 14, color: '#38bdf8' }} />
                    <span>{ord.venue}</span>
                  </div>
                </div>

                {/* Tickets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {ord.items?.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{ background: '#090e18', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <span className="badge badge-indigo">{item.tier_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Pass #{idx + 1}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                          {item.ticket_code}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          Holder: {item.attendee_name || 'Sarah Jenkins'}
                        </div>
                      </div>

                      <div
                        onClick={() => setSelectedTicketForQr(item)}
                        style={{ cursor: 'pointer', background: '#ffffff', padding: 4, borderRadius: 6 }}
                        title="Click to view QR pass"
                      >
                        <img src={item.qrImage} alt="QR" style={{ width: 56, height: 56, display: 'block' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* QR Zoom Modal */}
      {selectedTicketForQr && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '360px', textAlign: 'center', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>Admission Pass QR</h3>
            <p style={{ fontFamily: 'var(--font-mono)', color: '#818cf8', fontSize: '0.85rem', marginBottom: '16px' }}>{selectedTicketForQr.ticket_code}</p>
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: '16px' }}>
              <img src={selectedTicketForQr.qrImage} alt="QR" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '16px' }}>Present this QR code to the entrance scanner.</p>
            <button onClick={() => setSelectedTicketForQr(null)} className="btn btn-secondary btn-full">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default MyTickets;

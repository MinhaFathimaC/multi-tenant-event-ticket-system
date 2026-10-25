import React from 'react';
import { useReservation } from '../context/ReservationContext.jsx';
import { CheckCircle2, Ticket, Download, X, QrCode } from 'lucide-react';

export function ConfirmedOrderModal() {
  const { confirmedOrder, isConfirmedModalOpen, setIsConfirmedModalOpen } = useReservation();

  if (!isConfirmedModalOpen || !confirmedOrder) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '680px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <div className="modal-title">Booking Confirmed!</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Order #{confirmedOrder.orderNumber} • Settled Successfully
              </div>
            </div>
          </div>
          <button onClick={() => setIsConfirmedModalOpen(false)} className="modal-close-btn">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em' }}>
            Digital Admission Tickets ({confirmedOrder.tickets?.length || 1})
          </div>

          {confirmedOrder.tickets?.map((ticket, index) => (
            <div key={ticket.itemId || index} className="ticket-pass">
              <div className="ticket-pass-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-indigo">{ticket.tierName || confirmedOrder.tierName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Pass #{index + 1}</span>
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
                  {confirmedOrder.eventTitle}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Ticket style={{ width: 14, height: 14, color: '#818cf8' }} />
                  <span>Ticket Code: <strong style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{ticket.ticketCode}</strong></span>
                </div>
              </div>

              <div className="ticket-pass-right">
                {ticket.qrImage ? (
                  <img src={ticket.qrImage} alt="QR" className="ticket-qr-img" />
                ) : (
                  <div style={{ width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode style={{ width: 48, height: 48, color: 'var(--text-dim)' }} />
                  </div>
                )}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                  Scan at Entrance
                </div>
              </div>
            </div>
          ))}

          {/* Audit Data */}
          <div style={{ background: '#090e18', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Gateway Tx ID:</span>
              <span style={{ color: '#e2e8f0' }}>{confirmedOrder.gatewayTxId || 'MOCK_TXN_OK'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Settlement Total:</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>${confirmedOrder.totalAmount} USD</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(8,11,18,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
            <Download style={{ width: 14, height: 14 }} /> Print Tickets
          </button>
          <button onClick={() => setIsConfirmedModalOpen(false)} className="btn btn-primary btn-sm">
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConfirmedOrderModal;

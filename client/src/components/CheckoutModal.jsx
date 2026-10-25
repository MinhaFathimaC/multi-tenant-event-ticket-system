import React, { useState } from 'react';
import { useReservation } from '../context/ReservationContext.jsx';
import { Clock, ShieldCheck, CreditCard, Lock, X, RefreshCw, XCircle } from 'lucide-react';

export function CheckoutModal() {
  const {
    activeReservation,
    remainingSeconds,
    isCheckoutOpen,
    setIsCheckoutOpen,
    releaseHold,
    processCheckout
  } = useReservation();

  const [cardholderName, setCardholderName] = useState('Sarah Jenkins');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expDate, setExpDate] = useState('12/28');
  const [cvv, setCvv] = useState('888');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSimulationMode, setActiveSimulationMode] = useState('APPROVE');

  if (!isCheckoutOpen || !activeReservation) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentRemaining = Math.max(0, Math.min(100, (remainingSeconds / 600) * 100));
  const isUrgent = remainingSeconds < 180;
  const totalAmount = (activeReservation.price * activeReservation.quantity).toFixed(2);

  const handleAction = async (action) => {
    setActiveSimulationMode(action);
    setIsProcessing(true);
    try {
      await processCheckout(action, {
        cardholderName,
        cardNumber
      });
    } catch (e) {
      // toast in context
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="modal-title">Temporary Reservation Hold</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Protected via Atomic Database Transaction</div>
            </div>
          </div>
          <button onClick={() => setIsCheckoutOpen(false)} className="modal-close-btn">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="modal-body">
          
          {/* 10-Minute Urgency Bar */}
          <div className={`hold-urgency-banner ${isUrgent ? 'urgent' : ''}`}>
            <div className="hold-timer-row">
              <span className="hold-timer-text">
                <Clock style={{ width: 16, height: 16, color: isUrgent ? 'var(--rose)' : 'var(--amber)' }} />
                Temporary Hold Expires In:
              </span>
              <span className="hold-timer-countdown">
                {formatTime(remainingSeconds)}
              </span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${percentRemaining}%` }} />
            </div>

            <p className="hold-notice-caption">
              Your seats are temporarily locked. If checkout is not completed in 10 minutes, the background worker will release them back to the pool.
            </p>
          </div>

          {/* Order Summary */}
          <div style={{ background: '#0a0e18', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{activeReservation.event_title}</strong>
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '2px' }}>{activeReservation.tier_name}</div>
              </div>
              <span className="badge badge-indigo">Qty: {activeReservation.quantity}</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>${totalAmount} USD</span>
            </div>
          </div>

          {/* Payment Form Controls */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard style={{ width: 16, height: 16, color: '#818cf8' }} />
              Simulated Payment Gateway
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cardholder Name</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  style={{ width: '100%', background: '#070a12', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', color: '#ffffff', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Card Number (Pre-filled Test Card)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{ width: '100%', background: '#070a12', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleAction('APPROVE')}
              disabled={isProcessing}
              className="btn btn-primary btn-full"
              style={{ padding: '12px 18px', fontSize: '0.95rem' }}
            >
              {isProcessing && activeSimulationMode === 'APPROVE' ? (
                <>
                  <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  <span>Processing Gateway Authorization...</span>
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: 18, height: 18 }} />
                  <span>Approve & Complete Order (${totalAmount})</span>
                </>
              )}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => handleAction('DECLINE')}
                disabled={isProcessing}
                className="btn btn-secondary btn-sm"
                style={{ color: '#fda4af' }}
              >
                <XCircle style={{ width: 14, height: 14 }} />
                <span>Simulate Decline</span>
              </button>

              <button
                onClick={() => handleAction('TIMEOUT')}
                disabled={isProcessing}
                className="btn btn-secondary btn-sm"
                style={{ color: '#fcd34d' }}
              >
                <Clock style={{ width: 14, height: 14 }} />
                <span>Simulate Timeout</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={releaseHold}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Cancel Hold & Return Tickets
            </button>
            <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck style={{ width: 14, height: 14 }} /> TLS 256-bit Mock Encrypted
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default CheckoutModal;

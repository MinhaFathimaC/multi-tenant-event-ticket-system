import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useReservation } from '../context/ReservationContext.jsx';
import { Ticket, Shield, BarChart3, Clock, ChevronRight } from 'lucide-react';

export function Navbar({ currentTab, setCurrentTab }) {
  const { role, switchToDemo } = useAuth();
  const { activeReservation, remainingSeconds, setIsCheckoutOpen } = useReservation();

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = remainingSeconds < 180;

  return (
    <header className="site-header">
      <div className="app-container">
        <div className="header-inner">
          
          {/* Logo & Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div 
              onClick={() => setCurrentTab('marketplace')}
              className="logo-group"
            >
              <div className="logo-icon-wrap">
                <Ticket style={{ width: 22, height: 22, color: '#ffffff' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="logo-title">NexTicket</span>
                  <span className="logo-badge">Multi-Tenant</span>
                </div>
                <div className="logo-subtitle">Zero Double-Booking Engine</div>
              </div>
            </div>

            <nav className="nav-links">
              <button
                onClick={() => setCurrentTab('marketplace')}
                className={`nav-btn ${currentTab === 'marketplace' ? 'active' : ''}`}
              >
                Marketplace
              </button>

              <button
                onClick={() => setCurrentTab('my-tickets')}
                className={`nav-btn ${currentTab === 'my-tickets' ? 'active' : ''}`}
              >
                My Tickets
              </button>

              {(role === 'ORGANIZER' || role === 'ADMIN') && (
                <button
                  onClick={() => setCurrentTab('organizer')}
                  className={`nav-btn ${currentTab === 'organizer' ? 'active' : ''}`}
                >
                  <BarChart3 style={{ width: 16, height: 16, color: '#a78bfa' }} />
                  Organizer Analytics
                </button>
              )}

              {role === 'ADMIN' && (
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`nav-btn ${currentTab === 'admin' ? 'active' : ''}`}
                >
                  <Shield style={{ width: 16, height: 16, color: '#34d399' }} />
                  Admin & Concurrency
                </button>
              )}
            </nav>
          </div>

          {/* Right Controls: 10-Min Hold Badge + 1-Click Role Switcher */}
          <div className="header-right">
            
            {/* Active Hold Countdown Badge */}
            {activeReservation && remainingSeconds > 0 && (
              <div
                onClick={() => setIsCheckoutOpen(true)}
                className={`live-hold-pill ${isUrgent ? 'urgent' : ''}`}
                title="Click to resume checkout before timer expires"
              >
                <Clock style={{ width: 14, height: 14 }} />
                <span>Hold: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCountdown(remainingSeconds)}</strong></span>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </div>
            )}

            {/* 1-Click Role Switcher */}
            <div className="role-pill-bar">
              <span className="role-label">Persona:</span>

              <button
                onClick={() => {
                  switchToDemo('ATTENDEE');
                  setCurrentTab('marketplace');
                }}
                className={`role-btn ${role === 'ATTENDEE' ? 'active-attendee' : ''}`}
              >
                Attendee
              </button>

              <button
                onClick={() => {
                  switchToDemo('ORGANIZER');
                  setCurrentTab('organizer');
                }}
                className={`role-btn ${role === 'ORGANIZER' ? 'active-organizer' : ''}`}
              >
                Organizer
              </button>

              <button
                onClick={() => {
                  switchToDemo('ADMIN');
                  setCurrentTab('admin');
                }}
                className={`role-btn ${role === 'ADMIN' ? 'active-admin' : ''}`}
              >
                Admin
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { ReservationProvider } from './context/ReservationContext.jsx';
import Navbar from './components/Navbar.jsx';
import Marketplace from './pages/Marketplace.jsx';
import MyTickets from './pages/MyTickets.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import EventDetailsModal from './components/EventDetailsModal.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import ConfirmedOrderModal from './components/ConfirmedOrderModal.jsx';
import Toast from './components/Toast.jsx';
import { Shield, Zap, Clock } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('marketplace');
  const [selectedEventId, setSelectedEventId] = useState(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="app-container main-content">
          {currentTab === 'marketplace' && (
            <Marketplace onSelectEvent={(id) => setSelectedEventId(id)} />
          )}

          {currentTab === 'my-tickets' && (
            <MyTickets />
          )}

          {currentTab === 'organizer' && (
            <OrganizerDashboard />
          )}

          {currentTab === 'admin' && (
            <AdminDashboard />
          )}
        </main>
      </div>

      {/* Modals & Alerts */}
      <EventDetailsModal
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
      <CheckoutModal />
      <ConfirmedOrderModal />
      <Toast />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(8,11,18,0.85)', padding: '24px 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <div className="app-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ color: '#ffffff' }}>NexTicket</strong>
            <span>• Multi-Tenant Event & Ticket Reservation Platform</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#818cf8' }}>
              <Shield style={{ width: 14, height: 14 }} /> Zero Double-Booking Invariant
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
              <Clock style={{ width: 14, height: 14 }} /> 10-Min Temporary Hold
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
              <Zap style={{ width: 14, height: 14 }} /> Redis Read Cache
            </span>
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            Ready for Docker, Render, and Vercel
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ReservationProvider>
        <AppContent />
      </ReservationProvider>
    </AuthProvider>
  );
}

export default App;

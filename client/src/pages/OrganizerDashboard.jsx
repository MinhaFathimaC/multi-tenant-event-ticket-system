import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  BarChart3, DollarSign, ShoppingCart, Ticket, TrendingUp, Plus, 
  Layers, X 
} from 'lucide-react';

export function OrganizerDashboard() {
  const { tenantName } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: 'Technology',
    venue: '',
    banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
    event_date: '',
    sales_cutoff_date: '',
    tiers: [
      { name: 'General Admission', price: 99.00, total_capacity: 100, perks: 'All Stage Access' },
      { name: 'VIP Sky Pass', price: 299.00, total_capacity: 25, perks: 'VIP Lounge & Bar' }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardAnalytics();
      setData(res.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      await api.createEvent(eventForm);
      setIsCreateModalOpen(false);
      fetchAnalytics();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTier = () => {
    setEventForm({
      ...eventForm,
      tiers: [
        ...eventForm.tiers,
        { name: 'New Tier', price: 150.00, total_capacity: 50, perks: 'Standard Inclusions' }
      ]
    });
  };

  const handleRemoveTier = (index) => {
    if (eventForm.tiers.length <= 1) return;
    setEventForm({
      ...eventForm,
      tiers: eventForm.tiers.filter((_, i) => i !== index)
    });
  };

  const handleTierChange = (index, field, value) => {
    const updated = [...eventForm.tiers];
    updated[index][field] = field === 'price' || field === 'total_capacity' ? Number(value) : value;
    setEventForm({ ...eventForm, tiers: updated });
  };

  return (
    <div>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-indigo">{tenantName || 'Apex Entertainment Group'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>• Organizer Portal</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 style={{ width: 28, height: 28, color: '#a78bfa' }} />
            Real-Time Analytics & Event Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Monitor live gross revenue, ticket conversion funnel, tier inventory, and order settlement.
          </p>
        </div>

        <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }} />
          <span>Host New Event</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <div>Calculating real-time telemetry and revenue metrics...</div>
        </div>
      ) : data ? (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span>Gross Revenue</span>
                <DollarSign style={{ width: 18, height: 18, color: '#34d399' }} />
              </div>
              <div className="kpi-value">${data.kpis?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="kpi-subtext">Settled via mock gateway</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span>Completed Orders</span>
                <ShoppingCart style={{ width: 18, height: 18, color: '#818cf8' }} />
              </div>
              <div className="kpi-value">{data.kpis?.totalOrders || 0}</div>
              <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>Atomic transaction confirmed</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span>Tickets Sold</span>
                <Ticket style={{ width: 18, height: 18, color: '#38bdf8' }} />
              </div>
              <div className="kpi-value">{data.kpis?.totalTicketsSold || 0}</div>
              <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>Across all active tiers</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span>Hold Conversion Rate</span>
                <TrendingUp style={{ width: 18, height: 18, color: '#fbbf24' }} />
              </div>
              <div className="kpi-value" style={{ color: '#fbbf24' }}>{data.kpis?.holdConversionRate || '0.0'}%</div>
              <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>Holds converted to purchases</div>
            </div>
          </div>

          {/* Chart & Funnel Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            
            {/* Revenue Trend SVG Chart */}
            <div className="chart-container" style={{ gridColumn: 'span 2' }}>
              <div className="chart-header">
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp style={{ width: 18, height: 18, color: '#818cf8' }} />
                    Revenue & Sales Timeline
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily gross revenue from confirmed orders</p>
                </div>
                <span className="badge badge-indigo">Real-Time</span>
              </div>

              <div className="chart-bars-wrap">
                {data.salesTrends?.length > 0 ? (
                  data.salesTrends.map((point, index) => {
                    const maxRev = Math.max(...data.salesTrends.map((p) => p.daily_revenue), 100);
                    const heightPercent = Math.max(14, Math.round((point.daily_revenue / maxRev) * 100));

                    return (
                      <div key={index} className="chart-bar-item" title={`$${point.daily_revenue} on ${point.sale_date}`}>
                        <div
                          className="chart-bar-pillar"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="chart-date-label">{point.sale_date?.slice(5)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No sales trend data yet.
                  </div>
                )}
              </div>
            </div>

            {/* Funnel Telemetry */}
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers style={{ width: 18, height: 18, color: '#a78bfa' }} />
                    Conversion Funnel
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buyer journey telemetry</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#090e18', padding: '12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    <span>1. Page Views</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{data.funnel?.views || 0}</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }} /></div>
                </div>

                <div style={{ background: '#090e18', padding: '12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>
                    <span>2. 10-Min Holds</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{data.funnel?.holds || 0}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(12, ((data.funnel?.holds || 0) / (data.funnel?.views || 1)) * 100))}%` }} />
                  </div>
                </div>

                <div style={{ background: '#090e18', padding: '12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#34d399', marginBottom: 6 }}>
                    <span>3. Completed Orders</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{data.funnel?.completedOrders || 0}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${data.kpis?.holdConversionRate || 50}%`, background: 'var(--emerald)' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Tier Capacity Breakdown Table */}
          <div className="table-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket style={{ width: 18, height: 18, color: '#38bdf8' }} />
              Tier Capacity & Inventory Utilization
            </h3>

            <table className="styled-table">
              <thead>
                <tr>
                  <th>Tier Name</th>
                  <th>Event Title</th>
                  <th>Price</th>
                  <th>Sold / Capacity</th>
                  <th>Utilization</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.tierBreakdown?.map((tier, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{tier.tier_name}</td>
                    <td>{tier.event_title}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>${tier.price}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{tier.sold_tickets} / {tier.total_capacity}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, tier.utilization_rate)}%`, background: 'var(--primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{tier.utilization_rate}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                      ${tier.tier_revenue?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Orders Feed */}
          <div className="table-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart style={{ width: 18, height: 18, color: '#818cf8' }} />
              Live Order Feed
            </h3>

            <table className="styled-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Buyer</th>
                  <th>Event</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders?.map((ord, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a5b4fc' }}>{ord.order_number}</td>
                    <td>{ord.buyer_name}</td>
                    <td>{ord.event_title}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>${ord.total_amount?.toFixed(2)}</td>
                    <td><span className="badge badge-emerald">{ord.status}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{new Date(ord.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </>
      ) : null}

      {/* Host New Event Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div className="modal-title">Host New Tiered Event</div>
              <button onClick={() => setIsCreateModalOpen(false)} className="modal-close-btn"><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {createError && (
                <div style={{ background: 'var(--rose-bg)', color: '#fecdd3', padding: 12, borderRadius: 8, fontSize: '0.8rem', marginBottom: 16 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. European DevOps Summit 2026"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Category</label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                      style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                    >
                      <option value="Technology">Technology</option>
                      <option value="Concert">Concert</option>
                      <option value="Business">Business</option>
                      <option value="Gaming">Gaming</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Venue Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Moscone Center, SF"
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Event Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Sales Cut-off Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.sales_cutoff_date}
                      onChange={(e) => setEventForm({ ...eventForm, sales_cutoff_date: e.target.value })}
                      style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>Description</label>
                  <textarea
                    required
                    rows={2}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    style={{ width: '100%', background: '#090e18', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', color: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Tiers Builder */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Ticket Tiers & Capacities</span>
                    <button type="button" onClick={handleAddTier} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                      + Add Tier
                    </button>
                  </div>

                  {eventForm.tiers.map((t, idx) => (
                    <div key={idx} style={{ background: '#090e18', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          placeholder="Tier Name (e.g. VIP Pass)"
                          value={t.name}
                          onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                          style={{ background: '#0f1523', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', color: '#ffffff', fontSize: '0.8rem' }}
                        />
                        <input
                          type="number"
                          placeholder="Price ($)"
                          value={t.price}
                          onChange={(e) => handleTierChange(idx, 'price', e.target.value)}
                          style={{ background: '#0f1523', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', color: '#ffffff', fontSize: '0.8rem' }}
                        />
                        <input
                          type="number"
                          placeholder="Capacity"
                          value={t.total_capacity}
                          onChange={(e) => handleTierChange(idx, 'total_capacity', e.target.value)}
                          style={{ background: '#0f1523', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', color: '#ffffff', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Tier inclusions / perks"
                          value={t.perks}
                          onChange={(e) => handleTierChange(idx, 'perks', e.target.value)}
                          style={{ flex: 1, background: '#0f1523', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', color: '#cbd5e1', fontSize: '0.75rem' }}
                        />
                        {eventForm.tiers.length > 1 && (
                          <button type="button" onClick={() => handleRemoveTier(idx)} style={{ color: '#fda4af', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                    {isSubmitting ? 'Publishing...' : 'Publish Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default OrganizerDashboard;

import React, { useState, useEffect } from 'react';
import { apiRequest, BASE_URL, formatCurrency } from '../services/api';
import { Compass, Plus, Calendar, MapPin, Search } from 'lucide-react';

export default function MyTrips({ onOpenCreateTrip, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, ONGOING, UPCOMING, COMPLETED
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/trips')
      .then(res => {
        if (res.success) setTrips(res.data.trips || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredTrips = trips.filter(trip => {
    const matchesFilter = filter === 'ALL' || trip.status === filter;
    const matchesSearch = trip.title.toLowerCase().includes(search.toLowerCase()) ||
                          trip.country.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-wrap">
      {/* Header and Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">My Journeys 🧳</h1>
          <p className="page-subtitle">
            Browse and manage all your ongoing, upcoming, and completed journeys.
          </p>
        </div>
        <button onClick={onOpenCreateTrip} className="glass-btn-primary">
          <Plus size={18} />
          <span>Plan a Trip</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div className="segmented">
          {['ALL', 'ONGOING', 'UPCOMING', 'COMPLETED'].map(statusKey => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={filter === statusKey ? 'active' : ''}
            >
              {statusKey === 'ALL' ? 'All Journeys' : statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search by trip or country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: '38px', padding: '10px 14px 10px 38px', fontSize: '13px' }}
          />
        </div>
      </div>

      {loading && (
        <div className="loading-inline">
          <div className="spinner" />
          Loading journeys...
        </div>
      )}

      {/* Empty State */}
      {filteredTrips.length === 0 && !loading && (
        <div className="glass-panel empty-state">
          <Compass size={44} color="var(--primary)" style={{ margin: '0 auto 14px' }} />
          <h3>No journeys found</h3>
          <p>
            {search ? 'Try adjusting your search criteria.' : 'Create a new trip to start planning your days!'}
          </p>
          <button onClick={onOpenCreateTrip} className="glass-btn-primary">
            <Plus size={18} /> Plan a Trip
          </button>
        </div>
      )}

      {/* Trip Cards Grid matching section #25 */}
      <div className="cards-grid">
        {filteredTrips.map(trip => (
          <div
            key={trip.id}
            onClick={() => onSelectTrip(trip.id)}
            className="glass-panel hover-lift"
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              height: '170px',
              position: 'relative',
              background: trip.cover_photo
                ? `url(${BASE_URL}${trip.cover_photo}) center/cover no-repeat`
                : 'var(--hero-fallback)'
            }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                <span className={`badge badge-${trip.status.toLowerCase()}`}>
                  {trip.status}
                </span>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <div className="accent-text" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {trip.country}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', marginBottom: '10px' }}>
                {trip.title}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <Calendar size={14} />
                <span>{trip.start_date} → {trip.end_date}</span>
                <span style={{ color: 'var(--text-dim)' }}>({trip.duration_days} days)</span>
              </div>

              <div style={{
                paddingTop: '14px',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Spent: </span>
                  <strong>{formatCurrency(trip.total_spent, trip.currency)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-dim)' }}>
                  <span>{trip.destinations_count || 0} stops</span>
                  <span>•</span>
                  <span>{trip.photos_count || 0} photos</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

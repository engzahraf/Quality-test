import React, { useState, useEffect } from 'react';
import { apiRequest, SUPPORTED_CURRENCIES } from '../services/api';
import { useToast } from '../context/ToastContext';
import { X, Calendar, Globe, DollarSign, Users, Image as ImageIcon } from 'lucide-react';

export default function CreateTripModal({ isOpen, onClose, onTripCreated }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    country: '',
    startDate: '',
    endDate: '',
    travelersCount: 1,
    budget: '',
    currency: 'USD',
    cover: null
  });

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate duration automatically
  let calculatedDuration = null;
  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end >= start) {
      calculatedDuration = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, cover: file });
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.country || !formData.startDate || !formData.endDate) {
      addToast('Please fill all required trip fields.', 'error');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      addToast('Start date must be before or equal to End date.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('country', formData.country);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      data.append('travelersCount', formData.travelersCount);
      data.append('budget', formData.budget || '0');
      data.append('currency', formData.currency);
      if (formData.cover) {
        data.append('cover', formData.cover);
      }

      const res = await apiRequest('/trips', {
        method: 'POST',
        body: data
      });

      addToast(res.message || 'Trip planned successfully! 🎉');
      onTripCreated(res.data?.tripId);
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="icon-btn modal-close"
          aria-label="Close"
          style={{ width: 32, height: 32, borderRadius: '50%' }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
          Plan a New Journey 🗺️
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          Days will be automatically generated and linked to your itinerary.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Trip Cover Image Upload */}
          <div>
            <label className="field-label">Trip Cover Photo</label>
            <div
              className="cover-upload"
              style={coverPreview ? { background: `url(${coverPreview}) center/cover no-repeat` } : undefined}
            >
              {!coverPreview && (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                  <ImageIcon size={28} style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '12px' }}>Upload Cover Photo (JPG, PNG, WebP)</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Trip Name & Country (Strict Spec: NO separate "Main Destination" field) */}
          <div className="grid-2">
            <div>
              <label className="field-label">Trip Name *</label>
              <input
                type="text"
                placeholder="e.g. Summer in Tokyo"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
                className="glass-input"
              />
            </div>
            <div>
              <label className="field-label">Country *</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="e.g. Japan"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="glass-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          </div>

          {/* Dates & Auto Duration */}
          <div className="grid-2">
            <div>
              <label className="field-label">Start Date *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="glass-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
            <div>
              <label className="field-label">End Date *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="glass-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          </div>

          {/* Duration Badge Banner */}
          {calculatedDuration !== null && (
            <div className="duration-banner">
              <span>Calculated Journey Duration:</span>
              <strong style={{ fontSize: '15px' }}>{calculatedDuration} Days (Auto-Generated)</strong>
            </div>
          )}

          {/* Currency, Budget & Travelers */}
          <div className="grid-3">
            <div>
              <label className="field-label">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="glass-input"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Budget</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--link)',
                  fontWeight: 700,
                  fontSize: '13px',
                  pointerEvents: 'none'
                }}>
                  {SUPPORTED_CURRENCIES.find(c => c.code === formData.currency)?.symbol || '$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="3000"
                  value={formData.budget}
                  onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  className="glass-input"
                  style={{ paddingLeft: (SUPPORTED_CURRENCIES.find(c => c.code === formData.currency)?.symbol?.length > 2 ? '42px' : '32px') }}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Travelers</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                <input
                  type="number"
                  min="1"
                  value={formData.travelersCount}
                  onChange={e => setFormData({ ...formData, travelersCount: e.target.value })}
                  className="glass-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="glass-btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? 'Generating Days...' : 'Create Trip & Generate Days'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

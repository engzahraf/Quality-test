import React, { useState, useEffect } from 'react';
import { apiRequest, BASE_URL, formatCurrency } from '../services/api';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  Calendar, MapPin, Plus, CheckCircle2, Circle, ArrowLeft,
  DollarSign, Camera, BookOpen, Share2, Eye, Trash2, Edit3,
  Clock, ShieldAlert, Sparkles, Image as ImageIcon, Send
} from 'lucide-react';

export default function TripDetailPage({ tripId, onBack }) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('journey'); // journey, overview, expenses, memories, journal, share
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddDestModal, setShowAddDestModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [destForm, setDestForm] = useState({ name: '', description: '', location: '', plannedTime: '', estimatedCost: 0 });

  // Add Item to Exploration state
  const [activeDestForExplore, setActiveDestForExplore] = useState(null);
  const [newItemText, setNewItemText] = useState('');

  // Expense form state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'Food', expenseDate: '', notes: '' });
  const [expensesData, setExpensesData] = useState(null);

  // Journal form state
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm, setJournalForm] = useState({ title: '', content: '', entryDate: '' });
  const [journalEntries, setJournalEntries] = useState([]);

  // Photos state
  const [photosList, setPhotosList] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Sharing state
  const [collaborators, setCollaborators] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);

  const fetchTrip = async () => {
    try {
      const res = await apiRequest(`/trips/${tripId}`);
      if (res.success) {
        setTripData(res.data);
      }
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await apiRequest(`/expenses/trip/${tripId}`);
      if (res.success) setExpensesData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPhotos = async () => {
    try {
      const res = await apiRequest(`/photos/trip/${tripId}`);
      if (res.success) setPhotosList(res.data.photos || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJournal = async () => {
    try {
      const res = await apiRequest(`/journal/trip/${tripId}`);
      if (res.success) setJournalEntries(res.data.entries || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await apiRequest(`/sharing/trip/${tripId}/collaborators`);
      if (res.success) setCollaborators(res.data.collaborators || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'memories') fetchPhotos();
    if (activeTab === 'journal') fetchJournal();
    if (activeTab === 'share') fetchCollaborators();
  }, [activeTab]);

  if (loading || !tripData) {
    return (
      <div className="loading-inline">
        <div className="spinner" />
        Loading journey details...
      </div>
    );
  }

  const { trip, isReadOnly, days } = tripData;

  // 16. Done Exploring Workflow Handler
  const handleDoneExploring = async (destId) => {
    try {
      const res = await apiRequest(`/destinations/${destId}/complete`, { method: 'POST' });
      addToast(res.message, 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      fetchTrip();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // 17. Toggle Checklist Item
  const handleToggleChecklist = async (itemId) => {
    try {
      const res = await apiRequest(`/exploration/${itemId}/toggle`, { method: 'PUT' });
      addToast(res.message, 'info');
      fetchTrip();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Add Exploration item
  const handleAddExplorationItem = async (e, destId) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    try {
      await apiRequest(`/destinations/${destId}/exploration`, {
        method: 'POST',
        body: JSON.stringify({ itemText: newItemText })
      });
      setNewItemText('');
      setActiveDestForExplore(null);
      addToast('Exploration item added!');
      fetchTrip();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Add Destination
  const handleAddDestination = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/days/${selectedDayId}/destinations`, {
        method: 'POST',
        body: JSON.stringify(destForm)
      });
      setShowAddDestModal(false);
      setDestForm({ name: '', description: '', location: '', plannedTime: '', estimatedCost: 0 });
      addToast('Destination added to itinerary!');
      fetchTrip();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Add Expense
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/expenses/trip/${tripId}`, {
        method: 'POST',
        body: JSON.stringify(expenseForm)
      });
      setShowExpenseModal(false);
      setExpenseForm({ title: '', amount: '', category: 'Food', expenseDate: '', notes: '' });
      addToast('Expense recorded successfully!');
      fetchExpenses();
      fetchTrip();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Add Journal Entry
  const handleAddJournalSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/journal/trip/${tripId}`, {
        method: 'POST',
        body: JSON.stringify(journalForm)
      });
      setShowJournalModal(false);
      setJournalForm({ title: '', content: '', entryDate: '' });
      addToast('Story saved in journal! ✍️');
      fetchJournal();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Upload Photos
  const handlePhotosUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const data = new FormData();
      for (let i = 0; i < files.length; i++) {
        data.append('photos', files[i]);
      }
      await apiRequest(`/photos/trip/${tripId}`, {
        method: 'POST',
        body: data
      });
      addToast('Photos uploaded successfully! 📸');
      fetchPhotos();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Share user search
  const handleSearchUsers = async (query) => {
    setSearchUserQuery(query);
    if (query.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }
    try {
      const res = await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
      if (res.success) setSearchedUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareWithUser = async (targetUserId) => {
    try {
      const res = await apiRequest(`/sharing/trip/${tripId}/share`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      addToast(res.message);
      setSearchUserQuery('');
      setSearchedUsers([]);
      fetchCollaborators();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleRemoveShare = async (targetUserId) => {
    try {
      const res = await apiRequest(`/sharing/trip/${tripId}/share/${targetUserId}`, {
        method: 'DELETE'
      });
      addToast(res.message);
      fetchCollaborators();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="page-wrap" style={{ gap: '24px' }}>
      {/* Top Bar with Back Button & View Only Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} className="glass-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <ArrowLeft size={16} /> Back to Trips
        </button>
        {isReadOnly && (
          <div className="badge-viewonly" style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 20 }}>
            <Eye size={16} /> 👁 View Only (Shared Trip)
          </div>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="glass-panel" style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        minHeight: '220px',
        background: trip.cover_photo
          ? `linear-gradient(rgba(11,15,25,0.7), rgba(11,15,25,0.85)), url(${BASE_URL}${trip.cover_photo}) center/cover no-repeat`
          : 'var(--hero-fallback)',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA', fontSize: '14px', fontWeight: 600 }}>
          <MapPin size={16} /> {trip.country}
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginTop: '6px', color: '#fff' }}>
          {trip.title}
        </h1>
        <div style={{ display: 'flex', gap: '20px', marginTop: '14px', color: 'var(--text-muted)', fontSize: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} /> {trip.start_date} → {trip.end_date} ({trip.duration_days} Days)
          </div>
          <div>
            <strong>Budget:</strong> {formatCurrency(trip.budget, trip.currency)}
          </div>
          <div>
            <strong>Spent:</strong> {formatCurrency(trip.total_spent, trip.currency)}
          </div>
          <div className={`badge badge-${trip.status.toLowerCase()}`}>
            {trip.status}
          </div>
        </div>
      </div>

      {/* 26. Main Trip Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--border-glass)',
        padding: '6px',
        borderRadius: '16px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'journey', label: 'Journey Timeline', icon: Sparkles },
          { id: 'expenses', label: 'Expenses & Budget', icon: DollarSign },
          { id: 'memories', label: 'Photos & Memories', icon: Camera },
          { id: 'journal', label: 'Travel Journal', icon: BookOpen },
          { id: 'share', label: 'Share Trip', icon: Share2 },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                background: active ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minWidth: '150px'
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 27. Journey Timeline */}
      {activeTab === 'journey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {days.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No days found for this trip.
            </div>
          )}

          {days.map(day => (
            <div key={day.id} className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                    Day {day.day_number}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
                    {day.date} — {day.title || `Day ${day.day_number}`}
                  </h3>
                </div>

                {!isReadOnly && (
                  <button
                    onClick={() => {
                      setSelectedDayId(day.id);
                      setShowAddDestModal(true);
                    }}
                    className="glass-btn-secondary"
                    style={{ fontSize: '13px', padding: '8px 14px' }}
                  >
                    <Plus size={16} /> Add Destination
                  </button>
                )}
              </div>

              {/* Destinations List within this Day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {day.destinations.length === 0 ? (
                  <div style={{
                    padding: '24px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '13px'
                  }}>
                    No destinations added yet for this day. Click "+ Add Destination" to map out your stops.
                  </div>
                ) : (
                  day.destinations.map((dest, idx) => {
                    const isCompleted = dest.status === 'COMPLETED';
                    const isOngoing = dest.status === 'ONGOING';
                    const isUpcoming = dest.status === 'UPCOMING';

                    return (
                      <div
                        key={dest.id}
                        style={{
                          padding: '20px',
                          borderRadius: '16px',
                          background: isOngoing
                            ? 'rgba(16, 185, 129, 0.06)'
                            : isCompleted
                              ? 'rgba(255, 255, 255, 0.02)'
                              : 'rgba(255, 255, 255, 0.04)',
                          border: isOngoing
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : '1px solid var(--border-glass)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {/* Destination Header & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isCompleted ? '#10B98120' : (isOngoing ? '#3B82F620' : 'rgba(255,255,255,0.05)'),
                              color: isCompleted ? '#10B981' : (isOngoing ? '#60A5FA' : 'var(--text-dim)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px'
                            }}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 style={{
                                fontSize: '18px',
                                fontWeight: 700,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isCompleted ? 'var(--text-muted)' : '#fff'
                              }}>
                                {dest.name}
                              </h4>
                              {dest.location && (
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} /> {dest.location}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={`badge badge-${dest.status.toLowerCase()}`}>
                              {dest.status}
                            </span>

                            {/* 16. Done Exploring Button (Only on ONGOING or UPCOMING when owner) */}
                            {!isReadOnly && !isCompleted && (
                              <button
                                onClick={() => handleDoneExploring(dest.id)}
                                className="glass-btn-primary"
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  background: 'linear-gradient(135deg, #10B981, #059669)'
                                }}
                              >
                                <CheckCircle2 size={16} /> Done Exploring
                              </button>
                            )}
                          </div>
                        </div>

                        {dest.description && (
                          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {dest.description}
                          </p>
                        )}

                        {/* 17. Exploration Checklist */}
                        <div style={{
                          marginTop: '6px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#93C5FD', marginBottom: '8px' }}>
                            What I want to explore:
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dest.exploration_items && dest.exploration_items.map(item => (
                              <div
                                key={item.id}
                                onClick={() => !isReadOnly && handleToggleChecklist(item.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  fontSize: '13px',
                                  color: item.is_completed ? 'var(--text-dim)' : 'var(--text-main)',
                                  textDecoration: item.is_completed ? 'line-through' : 'none',
                                  cursor: isReadOnly ? 'default' : 'pointer'
                                }}
                              >
                                {item.is_completed ? (
                                  <CheckCircle2 size={16} color="#10B981" />
                                ) : (
                                  <Circle size={16} color="var(--text-dim)" />
                                )}
                                <span>{item.item_text}</span>
                              </div>
                            ))}

                            {!isReadOnly && (
                              <div style={{ marginTop: '8px' }}>
                                {activeDestForExplore === dest.id ? (
                                  <form onSubmit={(e) => handleAddExplorationItem(e, dest.id)} style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                      type="text"
                                      placeholder="e.g. Try local street food..."
                                      value={newItemText}
                                      onChange={e => setNewItemText(e.target.value)}
                                      className="glass-input"
                                      style={{ padding: '6px 12px', fontSize: '13px' }}
                                      autoFocus
                                    />
                                    <button type="submit" className="glass-btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveDestForExplore(null)}
                                      className="glass-btn-secondary"
                                      style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                      Cancel
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => setActiveDestForExplore(dest.id)}
                                    style={{
                                      background: 'transparent',
                                      color: '#60A5FA',
                                      fontSize: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Plus size={14} /> Add checklist item
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: 18. Expenses & Budget */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Budget</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
                {formatCurrency(expensesData?.budget, trip.currency)}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Spent</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#F43F5E' }}>
                {formatCurrency(expensesData?.totalSpent, trip.currency)}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Remaining Balance</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#10B981' }}>
                {formatCurrency(expensesData?.remaining, trip.currency)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Recorded Expenses</h3>
            {!isReadOnly && (
              <button onClick={() => setShowExpenseModal(true)} className="glass-btn-primary">
                <Plus size={18} /> Record Expense
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Expense / Title</span>
              <span>Category</span>
              <span>Date</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>

            {expensesData?.expenses?.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No expenses logged for this trip yet.
              </div>
            ) : (
              expensesData?.expenses?.map(exp => (
                <div key={exp.id} style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  fontSize: '14px',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{exp.title}</strong>
                    {exp.notes && <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{exp.notes}</div>}
                  </div>
                  <div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.06)',
                      fontSize: '12px'
                    }}>
                      {exp.category}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>{exp.expense_date}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: '#F43F5E' }}>
                    {formatCurrency(exp.amount, trip.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 20. Photos and Memories */}
      {activeTab === 'memories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Trip Photo Gallery</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Capture and preserve memories organized by journey days.
              </p>
            </div>
            {!isReadOnly && (
              <label className="glass-btn-primary" style={{ cursor: 'pointer' }}>
                <Camera size={18} />
                <span>{uploadingPhotos ? 'Uploading...' : 'Upload Photos'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotosUpload}
                  disabled={uploadingPhotos}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {photosList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <ImageIcon size={44} color="#3B82F6" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>No photos uploaded yet</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>
                Upload snapshots taken during this adventure!
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
              {photosList.map(photo => (
                <div key={photo.id} className="glass-panel" style={{ overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={`${BASE_URL}${photo.image_url}`}
                    alt={photo.caption || 'Trip Photo'}
                    style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                  />
                  {photo.caption && (
                    <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 21. Journal */}
      {activeTab === 'journal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Travel Stories & Journal</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Record your daily thoughts, reflections, and experiences.
              </p>
            </div>
            {!isReadOnly && (
              <button onClick={() => setShowJournalModal(true)} className="glass-btn-primary">
                <BookOpen size={18} /> New Entry
              </button>
            )}
          </div>

          {journalEntries.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <BookOpen size={44} color="#8B5CF6" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>Your journal is blank</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>
                Write your first story about this incredible journey.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {journalEntries.map(entry => (
                <div key={entry.id} className="glass-panel" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{entry.title}</h4>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{entry.entry_date}</span>
                  </div>
                  <p style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 22 & 23. Share Trip */}
      {activeTab === 'share' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Share with Travelers</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Shared travelers can view your timeline, expenses, and photos in <strong>Read Only</strong> mode.
            </p>

            {!isReadOnly ? (
              <div>
                <input
                  type="text"
                  placeholder="Search registered user by name, email, or username..."
                  value={searchUserQuery}
                  onChange={e => handleSearchUsers(e.target.value)}
                  className="glass-input"
                  style={{ marginBottom: '12px' }}
                />

                {searchedUsers.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '16px'
                  }}>
                    {searchedUsers.map(u => (
                      <div key={u.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)'
                      }}>
                        <div>
                          <strong>{u.name}</strong> ({u.email})
                        </div>
                        <button
                          onClick={() => handleShareWithUser(u.id)}
                          className="glass-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                        >
                          Share View Access
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                Only the trip owner can share access with other users.
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>People With Access</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {collaborators.map(c => (
                <div key={c.share_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}>
                  <div>
                    <strong>{c.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>({c.email})</span>
                    <div style={{ fontSize: '11px', color: '#60A5FA', marginTop: '2px' }}>Role: View Only</div>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveShare(c.user_id)}
                      style={{ background: 'transparent', color: '#F43F5E', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Destination */}
      {showAddDestModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Add Destination / Stop</h3>
            <form onSubmit={handleAddDestination} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Destination Name (e.g. Tokyo Tower)"
                value={destForm.name}
                onChange={e => setDestForm({ ...destForm, name: e.target.value })}
                required
                className="glass-input"
              />
              <input
                type="text"
                placeholder="Location / Address"
                value={destForm.location}
                onChange={e => setDestForm({ ...destForm, location: e.target.value })}
                className="glass-input"
              />
              <textarea
                placeholder="Description or notes..."
                value={destForm.description}
                onChange={e => setDestForm({ ...destForm, description: e.target.value })}
                className="glass-input"
                rows={3}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddDestModal(false)} className="glass-btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary" style={{ flex: 1 }}>
                  Add Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Expense */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Record Expense</h3>
            <form onSubmit={handleAddExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Expense Title (e.g. Dinner in Shibuya)"
                value={expenseForm.title}
                onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                required
                className="glass-input"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  className="glass-input"
                />
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="glass-input"
                  style={{ background: '#121826' }}
                >
                  {['Food', 'Transport', 'Entrance Fees', 'Shopping', 'Accommodation', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                required
                className="glass-input"
                style={{ colorScheme: 'dark' }}
              />
              <textarea
                placeholder="Optional notes..."
                value={expenseForm.notes}
                onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="glass-input"
                rows={2}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="glass-btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary" style={{ flex: 1 }}>
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Journal Entry */}
      {showJournalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>New Journal Entry ✍️</h3>
            <form onSubmit={handleAddJournalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Title (e.g. Walking through ancient bamboo groves)"
                value={journalForm.title}
                onChange={e => setJournalForm({ ...journalForm, title: e.target.value })}
                required
                className="glass-input"
              />
              <input
                type="date"
                value={journalForm.entryDate}
                onChange={e => setJournalForm({ ...journalForm, entryDate: e.target.value })}
                required
                className="glass-input"
                style={{ colorScheme: 'dark' }}
              />
              <textarea
                placeholder="Pour your thoughts and memories here..."
                value={journalForm.content}
                onChange={e => setJournalForm({ ...journalForm, content: e.target.value })}
                required
                className="glass-input"
                rows={6}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowJournalModal(false)} className="glass-btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary" style={{ flex: 1 }}>
                  Publish Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import BannerCard from '../components/BannerCard';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch dashboard data');
        return r.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState type="skeleton" />;

  const stats = data || {
    totalPartners: 0, totalAnalyses: 0, avgFitmentScore: 0,
    recentAnalyses: [], topPartners: []
  };

  return (
    <div>
      <BannerCard 
        title="Smart Factory Joint Partner Recommendation Agent Dashboard"
        description="View ecosystem stats, recent fitment analyses, and perform quick actions to find matching partners."
      />

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Partners</div>
            <div className="stat-value">{stats.totalPartners}</div>
            <div className="stat-change">In ecosystem</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Analyses</div>
            <div className="stat-value">{stats.totalAnalyses}</div>
            <div className="stat-change">All time</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <svg viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Avg. Fitment Score</div>
            <div className="stat-value">{stats.avgFitmentScore || '—'}</div>
            <div className="stat-change">Across analyses</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">
            <svg viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Top Partner</div>
            <div className="stat-value" style={{ fontSize: 'var(--text-md)' }}>
              {stats.topPartners?.[0]?.name || '—'}
            </div>
            <div className="stat-change">
              {stats.topPartners?.[0] ? `${stats.topPartners[0].count} matches, avg ${stats.topPartners[0].avgScore}` : 'No data yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/analyze" className="quick-action-card" id="quick-analyze">
          <div className="quick-action-icon" style={{ background: 'var(--color-accent-subtle)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <div className="quick-action-title">Analyze Client Problem</div>
          <div className="quick-action-desc">Describe a client challenge or upload an RFP to find the best-fit partners</div>
        </Link>
        <Link to="/partners" className="quick-action-card" id="quick-partners">
          <div className="quick-action-icon" style={{ background: 'var(--color-success-subtle)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div className="quick-action-title">Manage Partners</div>
          <div className="quick-action-desc">View, add, or import partners into the ecosystem database</div>
        </Link>
        <Link to="/compare" className="quick-action-card" id="quick-compare">
          <div className="quick-action-icon" style={{ background: 'var(--color-warning-subtle)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div className="quick-action-title">Compare Partners</div>
          <div className="quick-action-desc">Side-by-side AI-powered comparison of selected partners against a problem</div>
        </Link>
      </div>

      {/* Recent Analyses */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Analyses</h3>
            <div className="card-subtitle">Latest fitment analyses performed</div>
          </div>
          <Link to="/analyze" className="btn btn-secondary btn-sm">New Analysis</Link>
        </div>
        {stats.recentAnalyses?.length > 0 ? (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Problem Summary</th>
                  <th>Top Partner</th>
                  <th>Score</th>
                  <th>Partners</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAnalyses.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className={`badge ${a.type === 'document' ? 'badge-amber' : 'badge-blue'}`}>
                        {a.type === 'document' ? 'Document' : 'Text'}
                      </span>
                    </td>
                    <td className="text-primary" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.summary}
                    </td>
                    <td className="text-primary">{a.topPartner}</td>
                    <td>
                      <span style={{
                        color: a.topScore >= 80 ? 'var(--color-score-excellent)' :
                               a.topScore >= 60 ? 'var(--color-score-good)' :
                               'var(--color-score-moderate)',
                        fontWeight: 600
                      }}>
                        {a.topScore}
                      </span>
                    </td>
                    <td>{a.partnerCount} matched</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-8)' }}>
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="var(--color-accent)">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h3>No analyses yet</h3>
            <p>Start by analyzing a client problem to see partner fitment results here.</p>
            <Link to="/analyze" className="btn btn-primary">Start First Analysis</Link>
          </div>
        )}
      </div>
    </div>
  );
}

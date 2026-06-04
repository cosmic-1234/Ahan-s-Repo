import React, { useState, useEffect } from 'react';
import LoadingState from '../components/LoadingState';

const CHART_COLORS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#10B981', '#14B8A6', '#06B6D4',
];

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - 20) / 2;
  let cumulative = 0;

  const paths = data.map((d, i) => {
    const startAngle = (cumulative / total) * 360;
    const sliceAngle = (d.count / total) * 360;
    cumulative += d.count;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = (((startAngle + sliceAngle) - 90) * Math.PI) / 180;
    const largeArc = sliceAngle > 180 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const innerRadius = radius * 0.6;
    const x3 = cx + innerRadius * Math.cos(endRad);
    const y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad);
    const y4 = cy + innerRadius * Math.sin(startRad);

    return (
      <path
        key={i}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={CHART_COLORS[i % CHART_COLORS.length]}
        opacity={0.85}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--color-text-primary)" fontSize="20" fontWeight="700" fontFamily="var(--font-heading)">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="10">
        Total
      </text>
    </svg>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <div className="empty-state"><h3>Unable to load analytics</h3></div>;

  const maxPartnerCount = Math.max(...(data.topPartners || []).map(p => p.count), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Insights and trends from partnership fitment analyses across your ecosystem.</p>
      </div>

      {/* Top Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 20 20"><path fill="var(--color-accent)" d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Partners</div>
            <div className="stat-value">{data.totalPartners}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 20 20"><path fill="var(--color-success)" fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Analyses</div>
            <div className="stat-value">{data.totalAnalyses}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <svg viewBox="0 0 20 20"><path fill="var(--color-warning)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Avg. Fitment Score</div>
            <div className="stat-value">{data.avgFitmentScore || '—'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">
            <svg viewBox="0 0 20 20"><path fill="var(--color-info)" fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Analysis Types</div>
            <div className="stat-value" style={{ fontSize: 'var(--text-md)' }}>
              {data.analysisTypes?.text || 0} Text / {data.analysisTypes?.document || 0} Doc
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {/* Top Partners */}
        <div className="chart-container">
          <div className="chart-title">Top Partners by Match Frequency</div>
          {data.topPartners?.length > 0 ? (
            <div className="bar-chart">
              {data.topPartners.map((p, i) => (
                <div key={i} className="bar-chart-row">
                  <div className="bar-chart-label">{p.name}</div>
                  <div className="bar-chart-track">
                    <div className="bar-chart-fill" style={{ width: `${(p.count / maxPartnerCount) * 100}%` }} />
                  </div>
                  <div className="bar-chart-value">{p.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No data yet. Run analyses to see trends.</p>
          )}
        </div>

        {/* Industry Distribution */}
        <div className="chart-container">
          <div className="chart-title">Industry Distribution</div>
          {data.industryDistribution?.length > 0 ? (
            <div className="donut-chart-wrapper">
              <div className="donut-chart">
                <DonutChart data={data.industryDistribution} />
              </div>
              <div className="donut-legend">
                {data.industryDistribution.slice(0, 8).map((item, i) => (
                  <div key={i} className="donut-legend-item">
                    <div className="donut-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span>{item.name}</span>
                    <span className="donut-legend-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No data yet. Run analyses to see industry breakdown.</p>
          )}
        </div>
      </div>

      {/* Partner Tier Distribution */}
      <div className="chart-container" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="chart-title">Partner Tier Distribution</div>
        <div style={{ display: 'flex', gap: 'var(--space-8)', padding: 'var(--space-4) 0' }}>
          {Object.entries(data.tierDistribution || {}).map(([tier, count]) => (
            <div key={tier} style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: 'var(--radius-xl)',
                background: tier === 'Platinum' ? 'rgba(167,139,250,0.15)' :
                             tier === 'Gold' ? 'rgba(251,191,36,0.15)' : 'rgba(148,163,184,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-2)'
              }}>
                <span style={{
                  fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700,
                  color: tier === 'Platinum' ? 'var(--color-tier-platinum)' :
                         tier === 'Gold' ? 'var(--color-tier-gold)' : 'var(--color-tier-silver)'
                }}>
                  {count}
                </span>
              </div>
              <span className={`badge badge-tier ${tier.toLowerCase()}`}>{tier}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Analysis Activity</h3>
        </div>
        {data.recentAnalyses?.length > 0 ? (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Summary</th>
                  <th>Top Partner</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAnalyses.map(a => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge ${a.type === 'document' ? 'badge-amber' : 'badge-blue'}`}>{a.type}</span>
                    </td>
                    <td className="text-primary" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.summary}
                    </td>
                    <td className="text-primary">{a.topPartner}</td>
                    <td>
                      <span style={{
                        color: a.topScore >= 80 ? 'var(--color-score-excellent)' :
                               a.topScore >= 60 ? 'var(--color-score-good)' : 'var(--color-score-moderate)',
                        fontWeight: 600
                      }}>{a.topScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-8)', textAlign: 'center' }}>
            No analysis activity yet. Run your first analysis to see data here.
          </p>
        )}
      </div>
    </div>
  );
}

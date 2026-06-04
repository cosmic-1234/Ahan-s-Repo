import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { ScoreRing } from '../components/FitmentCard';
import LoadingState from '../components/LoadingState';

export default function ComparePartners() {
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [problemText, setProblemText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/partners')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch partners');
        return r.json();
      })
      .then(data => setPartners(data.partners || []))
      .catch(console.error)
      .finally(() => setLoadingPartners(false));
  }, []);

  const togglePartner = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(pid => pid !== id);
      if (prev.length >= 4) {
        toast.warning('Limit', 'Select up to 4 partners for comparison.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.warning('Selection Required', 'Please select at least 2 partners to compare.');
      return;
    }
    if (problemText.trim().length < 10) {
      toast.warning('Context Required', 'Please describe the client problem for meaningful comparison.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerIds: selectedIds, problemText }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setResult(data);
      toast.success('Comparison Complete', 'AI-powered analysis generated successfully.');
    } catch (error) {
      toast.error('Comparison Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPartners) return <LoadingState />;

  const selectedPartners = partners.filter(p => selectedIds.includes(p.id));

  return (
    <div>
      <div className="page-header">
        <h1>Compare Partners</h1>
        <p>Select 2-4 partners and provide a problem context for AI-powered side-by-side comparison.</p>
      </div>

      {!result && !loading && (
        <>
          {/* Problem Context */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Client Problem Context</label>
              <textarea
                id="compare-problem-input"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="Describe the client problem that you want to evaluate these partners against..."
                rows={4}
              />
            </div>
          </div>

          {/* Partner Selection */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                Select Partners ({selectedIds.length}/4)
              </h3>
              {selectedIds.length >= 2 && (
                <button id="compare-btn" className="btn btn-primary" onClick={handleCompare}>
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                  Compare {selectedIds.length} Partners
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              {partners.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--color-accent)' : undefined,
                      background: isSelected ? 'var(--color-accent-subtle)' : undefined,
                    }}
                    onClick={() => togglePartner(p.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <svg viewBox="0 0 20 20"><path fill="white" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{p.name}</div>
                      </div>
                      <span className={`badge badge-tier ${p.tier.toLowerCase()}`}>{p.tier}</span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                      {p.description.substring(0, 120)}...
                    </p>
                    <div className="tags-list">
                      {p.solutions.slice(0, 3).map((s, i) => <span key={i} className="tag">{s}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Loading */}
      {loading && <LoadingState type="processing" />}

      {/* Results */}
      {result && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Comparison Results</h3>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>New Comparison</button>
          </div>

          {/* Problem Context */}
          {result.problemContext && (
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="fitment-card-section-title">Problem Context</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{result.problemContext}</p>
            </div>
          )}

          {/* Partner Analysis Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(result.partnerAnalyses?.length || 2, 3)}, 1fr)`, gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {result.partnerAnalyses?.map(pa => {
              const isTop = pa.partnerId === result.overallRecommendation?.topChoice;
              return (
                <div
                  key={pa.partnerId}
                  className="card"
                  style={{ borderColor: isTop ? 'var(--color-accent)' : undefined }}
                >
                  {isTop && (
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 'var(--space-3)'
                    }}>
                      ★ Top Recommendation
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <ScoreRing score={pa.fitmentScore} size={56} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{pa.partnerName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        Fitment Score: {pa.fitmentScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="fitment-card-section">
                    <div className="fitment-card-section-title">Strengths</div>
                    <ul className="fitment-card-list">
                      {pa.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  <div className="fitment-card-section">
                    <div className="fitment-card-section-title">Weaknesses</div>
                    <ul className="fitment-card-list gaps">
                      {pa.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>

                  <div className="fitment-card-section">
                    <div className="fitment-card-section-title">Differentiators</div>
                    <ul className="fitment-card-list">
                      {pa.differentiators?.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>

                  {pa.riskFactors?.length > 0 && (
                    <div className="fitment-card-section">
                      <div className="fitment-card-section-title">Risk Factors</div>
                      <ul className="fitment-card-list gaps">
                        {pa.riskFactors?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {pa.engagementApproach && (
                    <div className="fitment-card-section" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                      <div className="fitment-card-section-title">Engagement Approach</div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{pa.engagementApproach}</p>
                    </div>
                  )}

                  {/* Dimension Scores */}
                  {pa.dimensionScores && (
                    <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                      <div className="fitment-card-section-title">Dimension Scores</div>
                      {Object.entries(pa.dimensionScores).map(([dim, score]) => (
                        <div key={dim} className="bar-chart-row" style={{ marginBottom: 'var(--space-2)' }}>
                          <span className="bar-chart-label" style={{ width: '120px', fontSize: 'var(--text-xs)' }}>{dim}</span>
                          <div className="bar-chart-track" style={{ height: '16px' }}>
                            <div className="bar-chart-fill" style={{ width: `${score}%` }} />
                          </div>
                          <span className="bar-chart-value" style={{ fontSize: 'var(--text-xs)', width: '30px' }}>{score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall Recommendation */}
          {result.overallRecommendation && (
            <div className="card" style={{ borderColor: 'var(--color-accent-border)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Overall Recommendation</h3>
              <div className="fitment-card-section">
                <div className="fitment-card-section-title">Rationale</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {result.overallRecommendation.rationale}
                </p>
              </div>
              {result.overallRecommendation.alternativeScenarios && (
                <div className="fitment-card-section">
                  <div className="fitment-card-section-title">Alternative Scenarios</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {result.overallRecommendation.alternativeScenarios}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

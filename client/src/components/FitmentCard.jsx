import React from 'react';

export function ScoreRing({ score, size = 72 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let tier = 'low';
  if (score >= 80) tier = 'excellent';
  else if (score >= 60) tier = 'good';
  else if (score >= 40) tier = 'moderate';

  return (
    <div className={`score-ring ${tier}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="score-ring-bg" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="score-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-value">{score}</div>
    </div>
  );
}

export default function FitmentCard({ partner, rank, onSelect, selected }) {
  return (
    <div className="fitment-card">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <ScoreRing score={partner.fitmentScore} />
        <span className="fitment-card-rank">#{rank}</span>
      </div>

      <div className="fitment-card-body">
        <div className="fitment-card-header">
          <h3 className="fitment-card-name">{partner.partnerName}</h3>
          {partner.fullDetails?.tier && (
            <span className={`badge badge-tier ${partner.fullDetails.tier.toLowerCase()}`}>
              {partner.fullDetails.tier}
            </span>
          )}
        </div>

        <p className="fitment-card-assessment">{partner.overallAssessment}</p>

        {partner.strengthsMatched?.length > 0 && (
          <div className="fitment-card-section">
            <div className="fitment-card-section-title">Strengths Matched</div>
            <ul className="fitment-card-list">
              {partner.strengthsMatched.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {partner.capabilitiesMatched?.length > 0 && (
          <div className="fitment-card-section">
            <div className="fitment-card-section-title">Capabilities</div>
            <div className="tags-list">
              {partner.capabilitiesMatched.map((c, i) => (
                <span key={i} className="tag">{c}</span>
              ))}
            </div>
          </div>
        )}

        {partner.gaps?.length > 0 && (
          <div className="fitment-card-section">
            <div className="fitment-card-section-title">Gaps & Considerations</div>
            <ul className="fitment-card-list gaps">
              {partner.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}

        {partner.recommendedApproach && (
          <div className="fitment-card-section">
            <div className="fitment-card-section-title">Recommended Approach</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {partner.recommendedApproach}
            </p>
          </div>
        )}

        {onSelect && (
          <div className="fitment-card-footer">
            <button
              className={`btn ${selected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => onSelect(partner.partnerId)}
            >
              {selected ? '✓ Selected for Comparison' : 'Select for Comparison'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

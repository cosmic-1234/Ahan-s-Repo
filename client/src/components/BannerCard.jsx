import React, { useState, useEffect } from 'react';

// Credit badge shown top-right of the banner
function CreditBadge({ credits }) {
  if (!credits) return null;

  const isFree = credits.isFree || credits.status === 'free_unlimited';
  const isNearLimit = credits.status === 'near_limit';

  // Color: green = free/ok, amber = near limit
  const color = isNearLimit
    ? 'var(--color-warning, #f59e0b)'
    : 'var(--color-success, #10b981)';

  const bgColor = isNearLimit
    ? 'rgba(245,158,11,0.12)'
    : 'rgba(16,185,129,0.12)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
      minWidth: '200px',
    }}>
      {/* Provider pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: bgColor,
        border: `1px solid ${color}`,
        borderRadius: '999px',
        padding: '4px 12px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}>
        {/* Pulse dot */}
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          boxShadow: `0 0 0 2px ${color}33`,
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        {isFree ? '∞ Free — No Daily Limit' : credits.label}
      </div>

      {/* Progress bar only for paid tier near limit */}
      {!isFree && credits.usagePct > 0 && (
        <div style={{ width: '180px' }}>
          <div style={{
            height: '4px',
            background: 'var(--color-surface-border)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${credits.usagePct}%`,
              background: isNearLimit
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                : 'linear-gradient(90deg, #10b981, #06b6d4)',
              borderRadius: '999px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--color-text-muted)',
            marginTop: '3px',
            textAlign: 'right',
          }}>
            {credits.usagePct}% used
          </div>
        </div>
      )}

      {/* Provider label */}
      <div style={{
        fontSize: '0.65rem',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.02em',
      }}>
        AI: {credits.provider}
      </div>
    </div>
  );
}

export default function BannerCard({
  badge = 'Tech Mahindra SFS + Partner recommendation agent',
  title = 'Smart Factory Joint Partner Recommendation Agent',
  description = "Enter a client problem statement. The agent infers ICP, maps the use-case to Tech Mahindra SFS, and explains why each partner is a good fit for that specific client.",
  showCredits = false,
}) {
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!showCredits) return;
    let cancelled = false;

    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCredits(data);
      } catch {
        // silently ignore — don't break the UI
      }
    };

    fetchCredits();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCredits, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [showCredits]);

  return (
    <div className="banner-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-6)' }}>
      <div className="banner-card-left" style={{ flex: 1 }}>
        <div className="banner-card-badge">{badge}</div>
        <h1 className="banner-card-title">{title}</h1>
        <p className="banner-card-description">{description}</p>
      </div>
      {showCredits && (
        <div style={{ paddingTop: 'var(--space-2)', flexShrink: 0 }}>
          {credits
            ? <CreditBadge credits={credits} />
            : (
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'var(--color-text-muted)',
                  display: 'inline-block',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                Loading credits...
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

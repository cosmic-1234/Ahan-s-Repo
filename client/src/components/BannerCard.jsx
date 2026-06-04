import React from 'react';

export default function BannerCard({ 
  badge = "Tech Mahindra SFS + Partner recommendation agent", 
  title = "Smart Factory Joint Partner Recommendation Agent", 
  description = "Enter a client problem statement. The agent infers ICP, maps the use-case to Tech Mahindra SFS, and explains why each partner is a good fit for that specific client." 
}) {
  return (
    <div className="banner-card">
      <div className="banner-card-left">
        <div className="banner-card-badge">{badge}</div>
        <h1 className="banner-card-title">{title}</h1>
        <p className="banner-card-description">{description}</p>
      </div>
      <div className="banner-card-right">
        <div className="guardrail-title">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746a1 1 0 01.532.889v4.298a12.83 12.83 0 01-6.19 11.233 1 1 0 01-1.115 0 12.83 12.83 0 01-6.19-11.233V5.789a1 1 0 01.532-.89zM10 3.238L4 6.108v3.379a10.826 10.826 0 005.155 9.42L10 19.412l.845-.494A10.826 10.826 0 0016 9.487V6.11l-6-2.871z" clipRule="evenodd"/>
            <path fillRule="evenodd" d="M13.707 7.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L8 11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
          Official-source-only guardrail
        </div>
        <div className="guardrail-desc">
          Capability claims are shown only when mapped to official partner / Tech Mahindra sources. Otherwise the card keeps the candidate but flags insufficient evidence.
        </div>
        <div className="guardrail-actions">
          <span className="badge-pill-solid">Evidence gate ON</span>
          <span className="badge-pill-outline">TechM theme</span>
        </div>
      </div>
    </div>
  );
}

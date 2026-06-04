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
    </div>
  );
}

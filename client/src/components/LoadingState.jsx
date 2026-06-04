import React from 'react';

export default function LoadingState({ text = 'Loading...', type = 'spinner' }) {
  if (type === 'skeleton') {
    return (
      <div>
        <div className="skeleton skeleton-block" />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      </div>
    );
  }

  if (type === 'processing') {
    return (
      <div className="processing-overlay">
        <div className="processing-icon">
          <div className="processing-ring" />
        </div>
        <div className="processing-title">Analyzing with AI</div>
        <div className="processing-subtitle">
          Claude is evaluating your problem against our partner ecosystem.
          This typically takes 15-30 seconds.
        </div>
        <div className="processing-steps">
          <div className="processing-step done">
            <span className="processing-step-dot" />
            <span>Input received</span>
          </div>
          <div className="processing-step active">
            <span className="processing-step-dot" />
            <span>Analyzing requirements & matching partners</span>
          </div>
          <div className="processing-step">
            <span className="processing-step-dot" />
            <span>Generating fitment scores & rationale</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <div className="loading-text">{text}</div>
    </div>
  );
}

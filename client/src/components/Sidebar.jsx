import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  {
    section: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: 'dashboard' },
    ]
  },
  {
    section: 'Analysis',
    items: [
      { path: '/analyze', label: 'Analyze Problem', icon: 'analyze' },
      { path: '/compare', label: 'Compare Partners', icon: 'compare' },
    ]
  },
  {
    section: 'Data',
    items: [
      { path: '/partners', label: 'Partner Database', icon: 'partners' },
      { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    ]
  },
  {
    section: 'Output',
    items: [
      { path: '/reports', label: 'Export Reports', icon: 'reports' },
    ]
  }
];

const icons = {
  dashboard: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>,
  analyze: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>,
  compare: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>,
  partners: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>,
  analytics: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>,
  reports: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/></svg>,
};

export default function Sidebar() {
  const location = useLocation();
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('portal-theme') || 'light';
  });
  const [status, setStatus] = React.useState({ provider: 'AI', connected: false });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    const checkHealth = () => {
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          setStatus({
            provider: data.activeProvider === 'gemini' ? 'Gemini' : 'Claude',
            connected: data.apiKeyConfigured
          });
        })
        .catch(() => {
          setStatus({ provider: 'AI', connected: false });
        });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // check health every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 120 70" width="46" height="27" style={{ display: 'block' }}>
              <polygon points="5,24 115,2 115,46 5,68" fill="#E31B23" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>TECH</span>
            <span style={{ fontSize: '20px', fontWeight: '600', textTransform: 'lowercase', color: '#E31B23', letterSpacing: '-0.02em', marginTop: '1px' }}>mahindra</span>
          </div>
        </div>
        <div className="sidebar-subtitle" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-surface-border)', paddingTop: 'var(--space-2)' }}>
          Partner Recommendation Portal
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive && (item.path === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
                }
                end={item.path === '/'}
              >
                {icons[item.icon]}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className={`sidebar-status-dot ${status.connected ? '' : 'offline'}`} id="api-status-dot"></span>
          <span>{status.connected ? `${status.provider} Connected` : 'AI Server Offline'}</span>
        </div>

        <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle color theme">
          {theme === 'light' ? (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-6.364a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM16 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm8.364 4.364a1 1 0 00-1.414 0l-.707.707a1 1 0 001.414 1.414l.707-.707a1 1 0 000-1.414zM10 14a1 1 0 011-1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.336 4.336a1 1 0 000 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 0zM14.657 14.657a1 1 0 000 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Light Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

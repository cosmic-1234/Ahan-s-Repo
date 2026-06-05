import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import LoadingState from '../components/LoadingState';

export default function PartnerDatabase() {
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [filters, setFilters] = useState({ industries: [], capabilities: [], tiers: [], solutions: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterCapability, setFilterCapability] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [profiling, setProfiling] = useState(false);

  const handleAddPartnerDocument = async (file) => {
    if (!file) return;
    setProfiling(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const res = await fetch('/api/partners/add-partner-document', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add partner');
      const data = await res.json();
      toast.success('Partner Added', `${data.partner.name} has been automatically added to the database.`);
      fetchPartners();
      fetchFilters();
    } catch (error) {
      toast.error('Failed to Add Partner', error.message);
    } finally {
      setProfiling(false);
    }
  };

  const fetchPartners = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterIndustry) params.set('industry', filterIndustry);
      if (filterTier) params.set('tier', filterTier);
      if (filterCapability) params.set('capability', filterCapability);

      const res = await fetch(`/api/partners?${params}`);
      if (!res.ok) throw new Error('Failed to fetch partners');
      const data = await res.json();
      setPartners(data.partners || []);
    } catch (error) {
      toast.error('Error', 'Failed to fetch partners');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterIndustry, filterTier, filterCapability]);

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/partners/filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      const data = await res.json();
      setFilters(data);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchPartners(), 300);
    return () => clearTimeout(timer);
  }, [fetchPartners]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete partner "${name}"? This action cannot be undone.`)) return;
    try {
      await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      toast.success('Deleted', `${name} has been removed from the database.`);
      fetchPartners();
      fetchFilters();
    } catch (error) {
      toast.error('Error', 'Failed to delete partner');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await fetch('/api/partners/import', { method: 'POST', body: formData });
      const data = await res.json();
      toast.success('Import Complete', data.message);
      setImportFile(null);
      fetchPartners();
      fetchFilters();
    } catch (error) {
      toast.error('Import Failed', error.message);
    }
  };

  const handleSavePartner = async (partnerData) => {
    try {
      const isEdit = !!partnerData.id;
      const url = isEdit ? `/api/partners/${partnerData.id}` : '/api/partners';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerData),
      });

      if (!res.ok) throw new Error((await res.json()).error);

      toast.success(isEdit ? 'Updated' : 'Created', `${partnerData.name} has been ${isEdit ? 'updated' : 'added'}.`);
      setShowAddModal(false);
      setEditingPartner(null);
      fetchPartners();
      fetchFilters();
    } catch (error) {
      toast.error('Error', error.message);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="page-header">
        <h1>Partner Database</h1>
        <p>Manage your technology partner ecosystem. Add, edit, or import partners.</p>
      </div>

      {/* Search & Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
          <input
            id="partner-search"
            type="text"
            placeholder="Search partners by name, capability, solution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          {filters.tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => { setEditingPartner(null); setShowAddModal(true); }}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
          Add Partner
        </button>
      </div>

      {/* Import & Profiling Section */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setImportFile(e.target.files[0])}
          style={{ display: 'none' }}
          id="import-file-input"
        />
        <label htmlFor="import-file-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
          Import from Spreadsheet
        </label>
        
        <input
          type="file"
          accept=".pdf,.pptx,.ppt,.docx,.txt"
          onChange={(e) => handleAddPartnerDocument(e.target.files[0])}
          style={{ display: 'none' }}
          id="add-partner-document-input"
        />
        <label htmlFor="add-partner-document-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          Add Partner from PDF/PPTX
        </label>

        {importFile && (
          <>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{importFile.name}</span>
            <button className="btn btn-primary btn-sm" onClick={handleImport}>Upload & Import</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setImportFile(null)}>Cancel</button>
          </>
        )}

        {profiling && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="spinner-mini" style={{ width: '14px', height: '14px', border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
            AI is profiling and adding partner...
          </span>
        )}

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {partners.length} partner{partners.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Partners Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Tier</th>
              <th>Solutions</th>
              <th>Capabilities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <React.Fragment key={p.id}>
                <tr
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <td className="text-primary">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{p.name}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {p.headquarters || 'Location N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-tier ${p.tier.toLowerCase()}`}>{p.tier}</span>
                  </td>
                  <td>
                    <div className="tags-list" style={{ maxWidth: '260px' }}>
                      {p.solutions.slice(0, 3).map((s, i) => (
                        <span key={i} className="tag">{s}</span>
                      ))}
                      {p.solutions.length > 3 && (
                        <span className="tag">+{p.solutions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="tags-list" style={{ maxWidth: '260px' }}>
                      {p.capabilities.slice(0, 3).map((c, i) => (
                        <span key={i} className="tag">{c}</span>
                      ))}
                      {p.capabilities.length > 3 && (
                        <span className="tag">+{p.capabilities.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="btn-group">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPartner(p); setShowAddModal(true); }}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--space-6)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                        <div>
                          <div className="fitment-card-section-title">Description</div>
                          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                            {p.description}
                          </p>

                          <div className="fitment-card-section-title">Use Cases</div>
                          <ul className="fitment-card-list" style={{ marginBottom: 'var(--space-4)' }}>
                            {p.useCases.map((uc, i) => <li key={i}>{uc}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="fitment-card-section-title">Capabilities</div>
                          <div className="tags-list" style={{ marginBottom: 'var(--space-4)' }}>
                            {p.capabilities.map((c, i) => <span key={i} className="tag">{c}</span>)}
                          </div>

                          <div className="fitment-card-section-title">Certifications</div>
                          <div className="tags-list" style={{ marginBottom: 'var(--space-4)' }}>
                            {p.certifications.map((c, i) => <span key={i} className="badge badge-blue">{c}</span>)}
                          </div>

                          {p.website && (
                            <div>
                              <div className="fitment-card-section-title">Contact</div>
                              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                {p.contactEmail}<br/>
                                Founded: {p.yearFounded || 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {partners.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="var(--color-accent)"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <h3>No partners found</h3>
          <p>Try adjusting your search or filters, or add a new partner.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PartnerModal
          partner={editingPartner}
          onSave={handleSavePartner}
          onClose={() => { setShowAddModal(false); setEditingPartner(null); }}
        />
      )}
    </div>
  );
}

function PartnerModal({ partner, onSave, onClose }) {
  const [form, setForm] = useState({
    name: partner?.name || '',
    description: partner?.description || '',
    solutions: partner?.solutions?.join(', ') || '',
    capabilities: partner?.capabilities?.join(', ') || '',
    useCases: partner?.useCases?.join('\n') || '',
    certifications: partner?.certifications?.join(', ') || '',
    tier: partner?.tier || 'Silver',
    website: partner?.website || '',
    contactEmail: partner?.contactEmail || '',
    headquarters: partner?.headquarters || '',
    employeeCount: partner?.employeeCount || '',
    yearFounded: partner?.yearFounded || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const parseList = (val) => val.split(',').map(s => s.trim()).filter(Boolean);
    onSave({
      ...(partner?.id ? { id: partner.id } : {}),
      name: form.name,
      description: form.description,
      solutions: parseList(form.solutions),
      capabilities: parseList(form.capabilities),
      industries: ['Manufacturing'],
      useCases: form.useCases.split('\n').map(s => s.trim()).filter(Boolean),
      certifications: parseList(form.certifications),
      tier: form.tier,
      website: form.website,
      contactEmail: form.contactEmail,
      headquarters: form.headquarters,
      employeeCount: parseInt(form.employeeCount) || 0,
      yearFounded: parseInt(form.yearFounded) || 0,
    });
  };

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{partner ? 'Edit Partner' : 'Add New Partner'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Partner Name *</label>
                <input value={form.name} onChange={update('name')} required placeholder="e.g., CloudSphere Technologies" />
              </div>
              <div className="form-group">
                <label className="form-label">Tier</label>
                <select value={form.tier} onChange={update('tier')}>
                  <option value="Platinum">Platinum</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={update('description')} rows={3} placeholder="Describe the partner's expertise and value proposition..." />
            </div>

            <div className="form-group">
              <label className="form-label">Solutions</label>
              <input value={form.solutions} onChange={update('solutions')} placeholder="Comma-separated: Cloud Migration, DevOps, Security..." />
              <div className="form-hint">Separate multiple solutions with commas</div>
            </div>

            <div className="form-group">
              <label className="form-label">Capabilities</label>
              <input value={form.capabilities} onChange={update('capabilities')} placeholder="Comma-separated: AWS, Kubernetes, Terraform..." />
            </div>



            <div className="form-group">
              <label className="form-label">Certifications</label>
              <input value={form.certifications} onChange={update('certifications')} placeholder="Comma-separated: AWS Partner, ISO 27001..." />
            </div>

            <div className="form-group">
              <label className="form-label">Use Cases</label>
              <textarea value={form.useCases} onChange={update('useCases')} rows={3} placeholder="One use case per line..." />
              <div className="form-hint">Enter one use case per line</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Headquarters</label>
                <input value={form.headquarters} onChange={update('headquarters')} placeholder="e.g., San Francisco, CA" />
              </div>
              <div className="form-group">
                <label className="form-label">Employee Count</label>
                <input type="number" value={form.employeeCount} onChange={update('employeeCount')} placeholder="e.g., 5000" />
              </div>
              <div className="form-group">
                <label className="form-label">Year Founded</label>
                <input type="number" value={form.yearFounded} onChange={update('yearFounded')} placeholder="e.g., 2015" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Website</label>
                <input value={form.website} onChange={update('website')} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input value={form.contactEmail} onChange={update('contactEmail')} placeholder="partnerships@..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{partner ? 'Update Partner' : 'Add Partner'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import LoadingState from '../components/LoadingState';

export default function ExportReports() {
  const toast = useToast();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    fetch('/api/analyze/history?limit=50')
      .then(r => r.json())
      .then(data => setAnalyses(data.analyses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportPDF = async (analysisId) => {
    setExporting(analysisId + '-pdf');
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json();
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      const report = data.report;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('Partnership Fitment Analysis Report', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 14, 30);
      doc.text(`Analysis ID: ${report.analysisId}`, 14, 36);

      // Problem Summary
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Problem Summary', 14, 48);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const summaryLines = doc.splitTextToSize(report.problemSummary || 'N/A', 180);
      doc.text(summaryLines, 14, 55);
      let yPos = 55 + summaryLines.length * 5 + 10;

      // Key Requirements
      if (report.keyRequirements?.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Key Requirements', 14, yPos);
        yPos += 7;
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        report.keyRequirements.forEach(req => {
          doc.text(`• ${req}`, 18, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Table
      if (report.rankedPartners?.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Ranked Partners', 14, yPos);
        yPos += 5;

        doc.autoTable({
          startY: yPos,
          head: [['Rank', 'Partner', 'Score', 'Assessment']],
          body: report.rankedPartners.map((p, i) => [
            i + 1,
            p.partnerName,
            p.fitmentScore,
            (p.overallAssessment || '').substring(0, 120)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 20 } },
          margin: { left: 14, right: 14 },
        });

        // Detail pages for each partner
        report.rankedPartners.forEach((p, i) => {
          doc.addPage();
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text(`#${i + 1} — ${p.partnerName} (Score: ${p.fitmentScore})`, 14, 20);

          let dy = 32;
          const addSection = (title, content) => {
            if (!content) return;
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(title, 14, dy);
            dy += 6;
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const lines = doc.splitTextToSize(content, 180);
            doc.text(lines, 14, dy);
            dy += lines.length * 4.5 + 6;
          };

          addSection('Assessment', p.overallAssessment);
          addSection('Strengths', (p.strengthsMatched || []).join('; '));
          addSection('Capabilities Matched', (p.capabilitiesMatched || []).join(', '));
          addSection('Gaps', (p.gaps || []).join('; '));
          addSection('Recommended Approach', p.recommendedApproach);
        });
      }

      doc.save(`fitment-report-${analysisId.slice(0, 8)}.pdf`);
      toast.success('PDF Exported', 'Report downloaded successfully.');
    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async (analysisId) => {
    setExporting(analysisId + '-xlsx');
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json();
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        { Field: 'Analysis Date', Value: data.report.analysisDate },
        { Field: 'Problem Summary', Value: data.report.problemSummary },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Rankings sheet
      const wsRankings = XLSX.utils.json_to_sheet(data.report.rows);
      XLSX.utils.book_append_sheet(wb, wsRankings, 'Partner Rankings');

      XLSX.writeFile(wb, `fitment-report-${analysisId.slice(0, 8)}.xlsx`);
      toast.success('Excel Exported', 'Report downloaded successfully.');
    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="page-header">
        <h1>Export Reports</h1>
        <p>Download PDF or Excel reports from past fitment analyses to share with stakeholders.</p>
      </div>

      {analyses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="var(--color-accent)">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3>No analyses to export</h3>
          <p>Run a fitment analysis first, then come back here to export the results as PDF or Excel.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Problem Summary</th>
                <th>Top Partner</th>
                <th>Score</th>
                <th>Partners</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(a => {
                const summary = a.result?.problemSummary || a.input?.problemText?.substring(0, 100) || 'Document analysis';
                const topPartner = a.result?.rankedPartners?.[0];
                return (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.timestamp).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                    <td>
                      <span className={`badge ${a.type === 'document' ? 'badge-amber' : 'badge-blue'}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="text-primary" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {summary}
                    </td>
                    <td className="text-primary">{topPartner?.partnerName || 'N/A'}</td>
                    <td>
                      <span style={{
                        color: (topPartner?.fitmentScore || 0) >= 80 ? 'var(--color-score-excellent)' :
                               (topPartner?.fitmentScore || 0) >= 60 ? 'var(--color-score-good)' : 'var(--color-score-moderate)',
                        fontWeight: 600
                      }}>
                        {topPartner?.fitmentScore || '—'}
                      </span>
                    </td>
                    <td>{a.partnerCount || 0}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleExportPDF(a.id)}
                          disabled={exporting === a.id + '-pdf'}
                        >
                          {exporting === a.id + '-pdf' ? '...' : 'PDF'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleExportExcel(a.id)}
                          disabled={exporting === a.id + '-xlsx'}
                        >
                          {exporting === a.id + '-xlsx' ? '...' : 'Excel'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

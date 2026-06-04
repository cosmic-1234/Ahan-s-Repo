import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import AnalyzeProblem from './pages/AnalyzeProblem';
import PartnerDatabase from './pages/PartnerDatabase';
import ComparePartners from './pages/ComparePartners';
import Analytics from './pages/Analytics';
import ExportReports from './pages/ExportReports';

export default function App() {
  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<AnalyzeProblem />} />
            <Route path="/partners" element={<PartnerDatabase />} />
            <Route path="/compare" element={<ComparePartners />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<ExportReports />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

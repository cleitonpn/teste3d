import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjetistaEditor from './pages/ProjetistaEditor.jsx';
import SubmissionsView from './pages/SubmissionsView.jsx';
import AdminCatalog from './pages/AdminCatalog.jsx';
import AdminPrices from './pages/AdminPrices.jsx';
import CriarPage from './pages/CriarPage.jsx';
import ClientView from './pages/ClientView.jsx';
import Viewer from './viewer/Viewer.jsx';
import './ui.css';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Carregando…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Protected><Dashboard /></Protected>} />
          <Route path="/editar/:id" element={<Protected><ProjetistaEditor /></Protected>} />
          <Route path="/envios/:id" element={<Protected><SubmissionsView /></Protected>} />
          <Route path="/admin" element={<Protected><AdminCatalog /></Protected>} />
          <Route path="/admin/precos" element={<Protected><AdminPrices /></Protected>} />
          <Route path="/criar" element={<CriarPage />} />
          <Route path="/p/:id" element={<ClientView />} />
          <Route path="/demo" element={<Viewer />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { useAuth, useUI } from './hooks';
import apiClient from './utils/apiClient';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatPage from './pages/ChatPage';
import AdminPanel from './pages/AdminPanel';
import NotificationContainer from './components/NotificationContainer';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function PageTransition({ children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
      {children}
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const { initTheme } = useUI();
  const currentUser = useSelector(s => s.auth.currentUser);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => { await initTheme(); await checkAuth(); setAppReady(true); };
    init();

    apiClient.subscribeTokenRefresh((newToken) => {
      store.dispatch({ type: 'TOKEN_REFRESHED', payload: newToken });
    });
  }, [checkAuth, initTheme]);

  if (!appReady || isLoading) return <LoadingScreen />;

  return (
    <Routes location={location}>
      <Route path="/" element={<PageTransition><Home /></PageTransition>} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" replace /> : <PageTransition><Login /></PageTransition>} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/chat" replace /> : <PageTransition><Signup /></PageTransition>} />
      <Route path="/chat" element={isAuthenticated ? <PageTransition><ChatPage /></PageTransition> : <Navigate to="/login" replace />} />
      <Route path="/admin" element={
        isAuthenticated && currentUser?.isAdmin
          ? <PageTransition><AdminPanel /></PageTransition>
          : <Navigate to="/chat" replace />
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppContent() {
  return <><AnimatedRoutes /><NotificationContainer /></>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router>
          <AppContent />
        </Router>
      </Provider>
    </ErrorBoundary>
  );
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import SubsystemErrorBoundary from './components/SubsystemErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SubsystemErrorBoundary name="CAVDAX Application Gateway">
      <App />
    </SubsystemErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for PWA & Background Web Push Notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

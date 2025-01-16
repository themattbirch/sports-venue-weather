// src/entry.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Create React root
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker only in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('Service Worker registered:', registration);
      },
      (registrationError) => {
        console.error('Service Worker registration failed:', registrationError);
      }
    );
  });
}

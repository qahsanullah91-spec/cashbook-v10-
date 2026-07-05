import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


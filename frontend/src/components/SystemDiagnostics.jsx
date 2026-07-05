import { API_BASE } from '../services/api';

function StatusPill({ online, children }) {
  return <span className={`status-pill ${online ? 'online' : 'offline'}`}>{children}</span>;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export default function SystemDiagnostics({ diagnostics, currentUser, onRefresh }) {
  const health = diagnostics?.health || {};
  const database = diagnostics?.database || {};
  const auth = diagnostics?.auth || {};
  const isLoading = diagnostics?.loading;
  const healthStatus = normalizeStatus(health.status);
  const apiStatus = normalizeStatus(health.api || health.status);
  const databaseStatus = normalizeStatus(database.database || health.database);
  const authStatus = normalizeStatus(auth.auth || health.auth);
  const backendOnline = normalizeStatus(health.backend) === 'online'
    || apiStatus === 'ok'
    || healthStatus === 'ok'
    || healthStatus === 'healthy'
    || databaseStatus === 'connected'
    || authStatus === 'ready';
  const backendLabel = isLoading ? 'checking...' : backendOnline ? 'online' : 'offline';
  const portLabel = health.port || (API_BASE ? API_BASE.replace(/^https?:\/\//, '') : 'N/A');
  const user = health.currentUser || currentUser;
  return (
    <div className="glass-card form-card diagnostics-panel">
      <div className="card-header">
        <h3>System Diagnostics</h3>
        <button className="ghost-btn" onClick={onRefresh} disabled={isLoading}>{isLoading ? 'Checking...' : 'Refresh'}</button>
      </div>
      {diagnostics?.error && <div className="diagnostics-error">Health check warning: {diagnostics.error}</div>}
      <div className="diagnostics-grid">
        <div title={diagnostics?.error ? `Health check failed: ${diagnostics.error}` : undefined}><span>Backend Status</span><StatusPill online={backendOnline}>{backendLabel}</StatusPill></div>
        <div><span>Database Status</span><StatusPill online={databaseStatus === 'connected'}>{database.database || health.database || (isLoading ? 'checking...' : 'offline')}</StatusPill></div>
        <div><span>API Status</span><StatusPill online={apiStatus === 'ok' || healthStatus === 'healthy'}>{health.api || health.status || (isLoading ? 'checking...' : 'offline')}</StatusPill></div>
        <div><span>Auth Status</span><StatusPill online={authStatus === 'ready'}>{auth.auth || health.auth || (isLoading ? 'checking...' : 'offline')}</StatusPill></div>
        <div><span>Server Version</span><strong>{health.version || '1.0.0'}</strong></div>
        <div><span>Port</span><strong>{portLabel}</strong></div>
        <div><span>Current User</span><strong>{user ? `${user.full_name} (${user.role})` : 'Not signed in'}</strong></div>
      </div>
      {diagnostics?.error && <p className="diagnostics-error">Health check failed: {diagnostics.error}</p>}
    </div>
  );
}

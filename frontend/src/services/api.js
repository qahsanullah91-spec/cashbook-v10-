import { formatApiErrorDetail } from './errorFormatting.js';

export const API_BASE = import.meta.env?.PROD ? '' : (import.meta.env?.VITE_API_URL || 'http://localhost:8000');
let authToken = localStorage.getItem('cashbook-session-token') || '';

export function setAuthToken(token) {
  authToken = token || '';
  try {
    if (authToken) localStorage.setItem('cashbook-session-token', authToken);
    else localStorage.removeItem('cashbook-session-token');
  } catch {
    localStorage.removeItem('cashbook-current-user');
    try {
      if (authToken) localStorage.setItem('cashbook-session-token', authToken);
      else localStorage.removeItem('cashbook-session-token');
    } catch {
      // Keep the in-memory session usable when persistent storage is unavailable.
    }
  }
}

async function request(path, options = {}) {
  let response;
  const isFormData = options.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { 'X-Session-Token': authToken } : {}),
        ...(options.headers || {})
      },
      ...options
    });
  } catch (error) {
    throw new Error(`Backend connection failed: ${error.message}`);
  }
  if (!response.ok) {
    const text = await response.text();
    let message = `Server error (${response.status}): `;
    try {
      const payload = JSON.parse(text);
      message += formatApiErrorDetail(payload.detail ?? payload.message) || response.statusText;
    } catch {
      // If response is HTML or can't be parsed, use status code
      if (text.includes('<!doctype') || text.includes('<html')) {
        message += response.statusText || 'HTML Error Page';
      } else {
        message += text.substring(0, 200) || response.statusText;
      }
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  
  // Clone the response so we can read it multiple times if needed
  const responseText = await response.clone().text();
  try {
    return JSON.parse(responseText);
  } catch (error) {
    // If JSON parsing fails, provide helpful error message
    if (responseText.includes('<!doctype') || responseText.includes('<html')) {
      throw new Error(`Server returned HTML error. Status: ${response.status}. Check backend server.`);
    }
    throw new Error(`Failed to parse response as JSON: ${error.message}. Response: ${responseText.substring(0, 100)}`);
  }
}

export const api = {
  health: () => request('/api/health'),
  status: () => request('/api/status'),
  healthDatabase: () => request('/health/database'),
  healthAuth: () => request('/health/auth'),
  getSummary: () => request('/api/summary'),
  getTransactions: (query = '') => request(`/api/transactions${query}`),
  getTransaction: (id) => request(`/api/transactions/${id}`),
  createTransaction: (payload) => request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) => request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),
  getAccounts: () => request('/api/accounts'),
  searchAccounts: (name) => request(`/api/accounts/search?name=${encodeURIComponent(name)}`),
  createAccount: (payload) => request('/api/accounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccount: (id, payload) => request(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccount: (id) => request(`/api/accounts/${id}`, { method: 'DELETE' }),
  getLedger: (id) => request(`/api/accounts/${id}/ledger`),
  getAccountBalance: (id) => request(`/api/accounts/${id}/balance`),
  getEmployees: () => request('/api/employees'),
  createEmployee: (payload) => request('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEmployee: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),
  getEmployeeSalarySummary: (id, month) => request(`/api/employees/${id}/salary-summary?month=${encodeURIComponent(month)}`),
  getSalaryReport: (month, year) => request(`/api/employees/salary-report?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`),
  getSalarySummaryTotals: (month, year) => request(`/api/employees/salary-summary?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`),
  createSalaryPayment: (payload) => request('/api/employees/salary-payments', { method: 'POST', body: JSON.stringify(payload) }),
  updateSalaryPayment: (id, payload) => request(`/api/employees/salary-payments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSalaryPayment: (id) => request(`/api/employees/salary-payments/${id}`, { method: 'DELETE' }),
  getEmployeeSalaryHistory: (id) => request(`/api/employees/${id}/salary-history`),
  changeEmployeeSalary: (id, payload) => request(`/api/employees/${id}/salary-history`, { method: 'POST', body: JSON.stringify(payload) }),
  getSalaryChangeReport: () => request('/api/employees/salary-changes'),
  getDailyReport: () => request('/api/summary/daily'),
  getMonthlyReport: () => request('/api/summary/monthly'),
  getDateRangeReport: (start, end) => request(`/api/reports/date-range?start_date=${start}&end_date=${end}`),
  getExpenseReport: () => request('/api/reports/expenses'),
  getSettings: () => request('/api/settings'),
  updateSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getAuthStatus: () => request('/api/auth/status'),
  setupOwner: (payload) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getMe: () => request('/api/auth/me'),
  getUsers: () => request('/api/auth/users'),
  createUser: (payload) => request('/api/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  resetUserPassword: (id, payload) => request(`/api/auth/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),
  exportBackup: () => request('/api/backup/export'),
  createBackupSnapshot: () => request('/api/backup/snapshot', { method: 'POST' }),
  getBackupSnapshots: () => request('/api/backup/snapshots'),
  restoreBackupSnapshot: (id) => request(`/api/backup/snapshots/${id}/restore`, { method: 'POST' }),
  importBackup: (payload, replaceAll = false) => request(`/api/backup/import?replace_all=${replaceAll ? 'true' : 'false'}`, { method: 'POST', body: JSON.stringify(payload) }),
  importCashbookCsv: (content, filename) => request('/api/backup/import-csv', {
    method: 'POST',
    body: JSON.stringify({ content, filename })
  }),
  clearAll: () => request('/api/backup/clear-all', { method: 'DELETE' }),
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/upload', {
      method: 'POST',
      body: formData
    });
  },
  /**
   * Exchange a Neon Auth JWT for a standard cashbook session token.
   * @param {string} jwtToken - The Bearer token from Neon Auth
   */
  neonAuthLogin: (jwtToken) => request('/api/auth/neon-login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtToken}` },
  }),
};

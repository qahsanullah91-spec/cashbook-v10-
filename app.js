const STORAGE_KEY = 'bawar-star-cash-book-v1';
const defaultSettings = {
  companyName: 'BAWAR STAR PLASTIC INDUSTRY',
  currency: 'AFN',
  exchangeRate: 64.3,
  theme: 'dark',
  printHeader: true,
  lastBackup: ''
};

const state = {
  transactions: [],
  accounts: [],
  settings: { ...defaultSettings },
  activeView: 'dashboard',
  selectedAccount: '',
  filters: {
    search: '',
    startDate: '',
    endDate: '',
    type: 'all'
  }
};

const els = {};

function init() {
  bindElements();
  loadState();
  applyTheme();
  renderAll();
  bindEvents();
  setTodayDefaults();
}

function bindElements() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  els.pageTitle = document.getElementById('pageTitle');
  els.dashboardView = document.getElementById('dashboardView');
  els.cashbookView = document.getElementById('cashbookView');
  els.ledgerView = document.getElementById('ledgerView');
  els.converterView = document.getElementById('converterView');
  els.settingsView = document.getElementById('settingsView');

  els.latestTransactions = document.getElementById('latestTransactions');
  els.totalCashInAfn = document.getElementById('totalCashInAfn');
  els.totalCashOutAfn = document.getElementById('totalCashOutAfn');
  els.currentAfnBalance = document.getElementById('currentAfnBalance');
  els.totalUsdIn = document.getElementById('totalUsdIn');
  els.totalUsdOut = document.getElementById('totalUsdOut');
  els.currentUsdBalance = document.getElementById('currentUsdBalance');
  els.todayCount = document.getElementById('todayCount');
  els.monthlySummary = document.getElementById('monthlySummary');

  els.cashInForm = document.getElementById('cashInForm');
  els.cashOutForm = document.getElementById('cashOutForm');
  els.cashInMessage = document.getElementById('cashInMessage');
  els.cashOutMessage = document.getElementById('cashOutMessage');

  els.transactionsTableBody = document.getElementById('transactionsTableBody');
  els.cashbookTableCard = document.getElementById('cashbookTableCard');
  els.tableSummary = document.getElementById('tableSummary');
  els.searchInput = document.getElementById('searchInput');
  els.startDateFilter = document.getElementById('startDateFilter');
  els.endDateFilter = document.getElementById('endDateFilter');
  els.typeFilter = document.getElementById('typeFilter');
  els.clearFiltersBtn = document.getElementById('clearFiltersBtn');
  els.fullscreenTableBtn = document.getElementById('fullscreenTableBtn');

  els.accountForm = document.getElementById('accountForm');
  els.accountNameInput = document.getElementById('accountNameInput');
  els.openingBalanceInput = document.getElementById('openingBalanceInput');
  els.accountSearchInput = document.getElementById('accountSearchInput');
  els.accountList = document.getElementById('accountList');
  els.ledgerTitle = document.getElementById('ledgerTitle');
  els.ledgerSummary = document.getElementById('ledgerSummary');
  els.ledgerTableBody = document.getElementById('ledgerTableBody');

  els.converterDirection = document.getElementById('converterDirection');
  els.converterAmount = document.getElementById('converterAmount');
  els.converterRate = document.getElementById('converterRate');
  els.conversionResult = document.getElementById('conversionResult');
  els.saveRateBtn = document.getElementById('saveRateBtn');

  els.companyNameSetting = document.getElementById('companyNameSetting');
  els.currencySetting = document.getElementById('currencySetting');
  els.exchangeRateSetting = document.getElementById('exchangeRateSetting');
  els.themeSetting = document.getElementById('themeSetting');
  els.printHeaderSetting = document.getElementById('printHeaderSetting');
  els.saveSettingsBtn = document.getElementById('saveSettingsBtn');
  els.backupSettingsBtn = document.getElementById('backupSettingsBtn');
  els.importSettingsBtn = document.getElementById('importSettingsBtn');
  els.clearDataBtn = document.getElementById('clearDataBtn');
  els.backupFileInput = document.getElementById('backupFileInput');
  els.backupStatus = document.getElementById('backupStatus');
  els.lastBackupLabel = document.getElementById('lastBackupLabel');

  els.themeToggle = document.getElementById('themeToggle');
  els.printCurrentBtn = document.getElementById('printCurrentBtn');
  els.quickPrintBtn = document.getElementById('quickPrintBtn');
  els.backupBtn = document.getElementById('backupBtn');
  els.restoreBtn = document.getElementById('restoreBtn');
  els.fullPrintBtn = document.getElementById('fullPrintBtn');
  els.exportCashBookBtn = document.getElementById('exportCashBookBtn');
  els.printLedgerBtn = document.getElementById('printLedgerBtn');
  els.exportLedgerBtn = document.getElementById('exportLedgerBtn');
  els.quickCashInBtn = document.getElementById('quickCashInBtn');
  els.quickCashOutBtn = document.getElementById('quickCashOutBtn');
  els.quickLedgerBtn = document.getElementById('quickLedgerBtn');
  els.quickPrintActionBtn = document.getElementById('quickPrintActionBtn');
  els.quickBackupActionBtn = document.getElementById('quickBackupActionBtn');
  els.quickRestoreActionBtn = document.getElementById('quickRestoreActionBtn');
  els.receiptModal = document.getElementById('receiptModal');
  els.closeReceiptModal = document.getElementById('closeReceiptModal');
  els.receiptContent = document.getElementById('receiptContent');
}

function bindEvents() {
  els.cashInForm.addEventListener('submit', (e) => handleQuickSubmit(e, 'cash-in'));
  els.cashOutForm.addEventListener('submit', (e) => handleQuickSubmit(e, 'cash-out'));

  els.searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderTransactions();
  });
  els.startDateFilter.addEventListener('change', (e) => {
    state.filters.startDate = e.target.value;
    renderTransactions();
  });
  els.endDateFilter.addEventListener('change', (e) => {
    state.filters.endDate = e.target.value;
    renderTransactions();
  });
  els.typeFilter.addEventListener('change', (e) => {
    state.filters.type = e.target.value;
    renderTransactions();
  });
  els.clearFiltersBtn.addEventListener('click', () => {
    state.filters = { search: '', startDate: '', endDate: '', type: 'all' };
    els.searchInput.value = '';
    els.startDateFilter.value = '';
    els.endDateFilter.value = '';
    els.typeFilter.value = 'all';
    renderTransactions();
  });
  els.fullscreenTableBtn.addEventListener('click', toggleTableFullscreen);
  document.addEventListener('fullscreenchange', () => {
    if (els.fullscreenTableBtn) {
      els.fullscreenTableBtn.textContent = document.fullscreenElement === els.cashbookTableCard ? 'Exit Full Screen' : 'Full Screen';
    }
  });

  els.accountForm.addEventListener('submit', handleAccountSubmit);
  els.accountSearchInput.addEventListener('input', renderAccounts);

  els.saveRateBtn.addEventListener('click', saveExchangeRate);
  els.converterDirection.addEventListener('change', renderConversion);
  els.converterAmount.addEventListener('input', renderConversion);
  els.converterRate.addEventListener('input', renderConversion);

  els.saveSettingsBtn.addEventListener('click', saveSettings);
  els.backupSettingsBtn.addEventListener('click', exportBackup);
  els.importSettingsBtn.addEventListener('click', () => els.backupFileInput.click());
  els.backupFileInput.addEventListener('change', importBackup);
  els.clearDataBtn.addEventListener('click', clearAllData);

  els.themeToggle.addEventListener('click', toggleTheme);
  els.printCurrentBtn.addEventListener('click', () => printCurrentView());
  els.quickPrintBtn.addEventListener('click', () => printCurrentView());
  els.backupBtn.addEventListener('click', exportBackup);
  els.restoreBtn.addEventListener('click', () => els.backupFileInput.click());
  els.fullPrintBtn.addEventListener('click', () => printTransactionsView());
  els.exportCashBookBtn.addEventListener('click', exportTransactionsCsv);
  els.printLedgerBtn.addEventListener('click', () => printLedgerView());
  els.exportLedgerBtn.addEventListener('click', exportLedgerJson);
  els.quickCashInBtn.addEventListener('click', () => switchView('cashbook'));
  els.quickCashOutBtn.addEventListener('click', () => switchView('cashbook'));
  els.quickLedgerBtn.addEventListener('click', () => switchView('ledger'));
  els.quickPrintActionBtn.addEventListener('click', () => printCurrentView());
  els.quickBackupActionBtn.addEventListener('click', exportBackup);
  els.quickRestoreActionBtn.addEventListener('click', () => els.backupFileInput.click());
  els.closeReceiptModal.addEventListener('click', closeReceiptModal);
  els.receiptModal.addEventListener('click', (e) => {
    if (e.target === els.receiptModal) closeReceiptModal();
  });
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state.settings = { ...defaultSettings, ...(parsed.settings || {}) };
      state.transactions = normalizeTransactions(parsed.transactions);
      state.accounts = normalizeAccounts(parsed.accounts);
      state.selectedAccount = parsed.selectedAccount || '';
    }
  } catch (error) {
    console.warn('Could not load state', error);
  }
}

function saveState() {
  const payload = {
    transactions: normalizeTransactions(state.transactions),
    accounts: normalizeAccounts(state.accounts),
    settings: state.settings,
    selectedAccount: state.selectedAccount
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function toAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];
  return transactions
    .filter(Boolean)
    .map((tx) => {
      const type = tx.type === 'cash-out' ? 'cash-out' : 'cash-in';
      const fallbackAmount = toAmount(tx.amount);
      return {
        id: tx.id || createId(),
        date: tx.date || new Date().toISOString().split('T')[0],
        accountName: String(tx.accountName || tx.name || '').trim(),
        detail: String(tx.detail || '').trim(),
        type,
        cashInAfn: type === 'cash-in' ? toAmount(tx.cashInAfn ?? fallbackAmount) : 0,
        cashOutAfn: type === 'cash-out' ? toAmount(tx.cashOutAfn ?? fallbackAmount) : 0,
        usdIn: type === 'cash-in' ? toAmount(tx.usdIn) : 0,
        usdOut: type === 'cash-out' ? toAmount(tx.usdOut) : 0,
        exchangeRate: toAmount(tx.exchangeRate || state.settings.exchangeRate || defaultSettings.exchangeRate),
        note: String(tx.note || '').trim(),
        createdAt: tx.createdAt || new Date().toISOString(),
        updatedAt: tx.updatedAt || tx.createdAt || new Date().toISOString()
      };
    })
    .filter((tx) => tx.accountName && tx.detail);
}

function normalizeAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  const seen = new Set();
  return accounts
    .filter(Boolean)
    .map((account) => ({
      id: account.id || createId(),
      name: String(account.name || '').trim(),
      openingBalance: toAmount(account.openingBalance),
      createdAt: account.createdAt || new Date().toISOString()
    }))
    .filter((account) => {
      const key = account.name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderAccounts();
  renderLedger();
  renderConverter();
  renderSettings();
}

function setTodayDefaults() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('cashInDate').value = today;
  document.getElementById('cashOutDate').value = today;
  els.converterRate.value = state.settings.exchangeRate || defaultSettings.exchangeRate;
  els.exchangeRateSetting.value = state.settings.exchangeRate || defaultSettings.exchangeRate;
  els.companyNameSetting.value = state.settings.companyName || defaultSettings.companyName;
  els.currencySetting.value = state.settings.currency || defaultSettings.currency;
  els.themeSetting.value = state.settings.theme || 'dark';
  els.printHeaderSetting.checked = state.settings.printHeader !== false;
  els.lastBackupLabel.textContent = state.settings.lastBackup || 'Never';
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
  document.querySelectorAll('.view-section').forEach((section) => section.classList.toggle('active', section.id === `${view}View`));
  els.pageTitle.textContent = view === 'dashboard' ? 'Dashboard' : view === 'cashbook' ? 'Cash Book' : view === 'ledger' ? 'Ledger' : view === 'converter' ? 'Converter' : 'Settings';
}

function applyTheme() {
  document.body.classList.toggle('light', (state.settings.theme || 'dark') === 'light');
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

function formatCurrency(value, currency = 'AFN') {
  const number = Number(value || 0);
  if (currency === 'USD') return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `AFN ${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getMetrics() {
  const cashInAfn = state.transactions.reduce((sum, tx) => sum + Number(tx.cashInAfn || 0), 0);
  const cashOutAfn = state.transactions.reduce((sum, tx) => sum + Number(tx.cashOutAfn || 0), 0);
  const usdIn = state.transactions.reduce((sum, tx) => sum + Number(tx.usdIn || 0), 0);
  const usdOut = state.transactions.reduce((sum, tx) => sum + Number(tx.usdOut || 0), 0);
  const afnBalance = cashInAfn - cashOutAfn;
  const usdBalance = usdIn - usdOut;
  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = state.transactions.filter((tx) => tx.date === today).length;
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = state.transactions.filter((tx) => tx.date.startsWith(monthKey)).length;
  return { cashInAfn, cashOutAfn, afnBalance, usdIn, usdOut, usdBalance, todayTransactions, monthlyTransactions };
}

function renderDashboard() {
  const metrics = getMetrics();
  els.totalCashInAfn.textContent = formatCurrency(metrics.cashInAfn);
  els.totalCashOutAfn.textContent = formatCurrency(metrics.cashOutAfn);
  els.currentAfnBalance.textContent = formatCurrency(metrics.afnBalance);
  els.totalUsdIn.textContent = formatCurrency(metrics.usdIn, 'USD');
  els.totalUsdOut.textContent = formatCurrency(metrics.usdOut, 'USD');
  els.currentUsdBalance.textContent = formatCurrency(metrics.usdBalance, 'USD');
  els.todayCount.textContent = metrics.todayTransactions;
  els.monthlySummary.textContent = `${metrics.monthlyTransactions} entries`;

  const latest = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  if (!latest.length) {
    els.latestTransactions.innerHTML = '<div class="list-item">No transactions yet.</div>';
    return;
  }
  els.latestTransactions.innerHTML = latest.map((tx) => `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(tx.accountName || 'Unnamed')}</strong>
        <p>${escapeHtml(tx.detail || '')}</p>
      </div>
      <div class="${tx.type === 'cash-in' ? 'balance-positive' : 'balance-negative'}">
        ${tx.type === 'cash-in' ? '+' : '-'}${formatCurrency(tx.cashInAfn || tx.cashOutAfn)}
      </div>
    </div>
  `).join('');
}

function renderTransactions() {
  const filtered = getFilteredTransactions();
  let balance = 0;
  els.transactionsTableBody.innerHTML = filtered.length ? filtered.map((tx, index) => {
    balance += tx.type === 'cash-in' ? Number(tx.cashInAfn || 0) : -Number(tx.cashOutAfn || 0);
    const typeClass = tx.type === 'cash-in' ? 'in' : 'out';
    const typeLabel = tx.type === 'cash-in' ? 'Cash In' : 'Cash Out';
    return `
      <tr class="${tx.type}">
        <td>${index + 1}</td>
        <td>${escapeHtml(tx.date)}</td>
        <td>
          <strong>${escapeHtml(tx.accountName || '')}</strong>
          <span class="account-meta"><span class="row-type ${typeClass}">${typeLabel}</span></span>
        </td>
        <td>${escapeHtml(tx.detail || '')}</td>
        <td class="money-cell balance-positive">${tx.cashInAfn ? formatCurrency(tx.cashInAfn) : '-'}</td>
        <td class="money-cell balance-negative">${tx.cashOutAfn ? formatCurrency(tx.cashOutAfn) : '-'}</td>
        <td class="money-cell ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">${formatCurrency(balance)}</td>
        <td class="money-cell">${tx.usdIn ? formatCurrency(tx.usdIn, 'USD') : '-'}</td>
        <td class="money-cell">${tx.usdOut ? formatCurrency(tx.usdOut, 'USD') : '-'}</td>
        <td>${tx.exchangeRate || '-'}</td>
        <td>${escapeHtml(tx.note || '')}</td>
        <td>
          <div class="row-actions">
            <button class="ghost-btn table-action" data-action="edit" data-id="${tx.id}">Edit</button>
            <button class="ghost-btn table-action" data-action="receipt" data-id="${tx.id}">Receipt</button>
            <button class="ghost-btn table-action" data-action="delete" data-id="${tx.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="12" style="text-align:center;padding:24px;">No transactions match your filters.</td></tr>';

  const totals = filtered.reduce((acc, tx) => {
    acc.cashIn += Number(tx.cashInAfn || 0);
    acc.cashOut += Number(tx.cashOutAfn || 0);
    acc.usdIn += Number(tx.usdIn || 0);
    acc.usdOut += Number(tx.usdOut || 0);
    return acc;
  }, { cashIn: 0, cashOut: 0, usdIn: 0, usdOut: 0 });

  els.tableSummary.innerHTML = `
    <span>Total Cash In: ${formatCurrency(totals.cashIn)}</span>
    <span>Total Cash Out: ${formatCurrency(totals.cashOut)}</span>
    <span>USD In: ${formatCurrency(totals.usdIn, 'USD')}</span>
    <span>USD Out: ${formatCurrency(totals.usdOut, 'USD')}</span>
  `;

  els.transactionsTableBody.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => handleTableAction(button.dataset.action, button.dataset.id));
  });
}

function getFilteredTransactions() {
  return [...state.transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter((tx) => {
      const search = state.filters.search.toLowerCase();
      const matchesSearch = !search || `${tx.accountName} ${tx.detail} ${tx.date} ${tx.note}`.toLowerCase().includes(search);
      const matchesStart = !state.filters.startDate || tx.date >= state.filters.startDate;
      const matchesEnd = !state.filters.endDate || tx.date <= state.filters.endDate;
      const matchesType = state.filters.type === 'all' || (state.filters.type === 'cash-in' && tx.type === 'cash-in') || (state.filters.type === 'cash-out' && tx.type === 'cash-out');
      return matchesSearch && matchesStart && matchesEnd && matchesType;
    });
}

function handleQuickSubmit(event, type) {
  event.preventDefault();
  const form = type === 'cash-in' ? els.cashInForm : els.cashOutForm;
  const messageEl = type === 'cash-in' ? els.cashInMessage : els.cashOutMessage;
  const date = form.querySelector('input[type="date"]').value;
  const name = form.querySelectorAll('input[type="text"]')[0]?.value?.trim();
  const detail = form.querySelectorAll('input[type="text"]')[1]?.value?.trim();
  const afnAmount = toAmount(form.querySelectorAll('input[type="number"]')[0]?.value || 0);
  const usdAmount = toAmount(form.querySelectorAll('input[type="number"]')[1]?.value || 0);
  const rate = toAmount(form.querySelectorAll('input[type="number"]')[2]?.value || state.settings.exchangeRate);
  const note = form.querySelectorAll('input[type="text"]')[2]?.value?.trim();
  const editId = form.getAttribute('data-edit-id');

  if (!date || !name || !detail) {
    showMessage(messageEl, 'Please fill date, account name and detail.', 'error');
    return;
  }

  if (afnAmount <= 0 && usdAmount <= 0) {
    showMessage(messageEl, 'Enter an AFN or USD amount greater than zero.', 'error');
    return;
  }

  const transactionPayload = {
    date,
    accountName: name,
    detail,
    type: type === 'cash-in' ? 'cash-in' : 'cash-out',
    cashInAfn: type === 'cash-in' ? afnAmount : 0,
    cashOutAfn: type === 'cash-out' ? afnAmount : 0,
    usdIn: type === 'cash-in' ? usdAmount : 0,
    usdOut: type === 'cash-out' ? usdAmount : 0,
    exchangeRate: rate || toAmount(state.settings.exchangeRate),
    note: note || '',
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const existing = state.transactions.find((tx) => tx.id === editId);
    if (existing) {
      Object.assign(existing, { ...transactionPayload, id: editId, createdAt: existing.createdAt || new Date().toISOString() });
    }
  } else {
    state.transactions.unshift({ ...transactionPayload, id: createId(), createdAt: new Date().toISOString() });
  }

  ensureAccount(name, 0);
  state.settings.exchangeRate = rate || toAmount(state.settings.exchangeRate);
  saveState();
  renderAll();
  form.reset();
  form.querySelector('input[type="date"]').value = date;
  form.removeAttribute('data-edit-id');
  showMessage(messageEl, `${type === 'cash-in' ? 'Cash In' : 'Cash Out'} saved successfully.`, 'success');
}

function handleTableAction(action, id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;
  if (action === 'delete') {
    if (!confirm('Delete this transaction?')) return;
    state.transactions = state.transactions.filter((item) => item.id !== id);
    saveState();
    renderAll();
  }
  if (action === 'receipt') {
    openReceipt(tx);
  }
  if (action === 'edit') {
    fillEditForm(tx);
    switchView('cashbook');
  }
}

function fillEditForm(tx) {
  const dateInput = document.getElementById('cashInDate');
  const form = tx.type === 'cash-in' ? els.cashInForm : els.cashOutForm;
  const dateField = form.querySelector('input[type="date"]');
  const textFields = form.querySelectorAll('input[type="text"]');
  const numberFields = form.querySelectorAll('input[type="number"]');
  dateField.value = tx.date;
  textFields[0].value = tx.accountName || '';
  textFields[1].value = tx.detail || '';
  numberFields[0].value = tx.type === 'cash-in' ? tx.cashInAfn : tx.cashOutAfn;
  numberFields[1].value = tx.type === 'cash-in' ? tx.usdIn : tx.usdOut;
  numberFields[2].value = tx.exchangeRate || state.settings.exchangeRate;
  textFields[2].value = tx.note || '';

  if (tx.type === 'cash-in') {
    form.setAttribute('data-edit-id', tx.id);
    els.cashInMessage.textContent = 'Editing transaction. Save to update.';
  } else {
    form.setAttribute('data-edit-id', tx.id);
    els.cashOutMessage.textContent = 'Editing transaction. Save to update.';
  }
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function handleAccountSubmit(event) {
  event.preventDefault();
  const name = els.accountNameInput.value.trim();
  const opening = Number(els.openingBalanceInput.value || 0);
  if (!name) return;
  ensureAccount(name, opening);
  els.accountNameInput.value = '';
  els.openingBalanceInput.value = '';
  saveState();
  renderAccounts();
  renderLedger();
}

function ensureAccount(name, openingBalance = 0) {
  const normalizedName = String(name || '').trim();
  let account = state.accounts.find((item) => item.name.toLowerCase() === normalizedName.toLowerCase());
  if (!account) {
    account = { id: createId(), name: normalizedName, openingBalance: toAmount(openingBalance), createdAt: new Date().toISOString() };
    state.accounts.push(account);
  } else if (toAmount(openingBalance) && !toAmount(account.openingBalance)) {
    account.openingBalance = toAmount(openingBalance);
  }
  state.selectedAccount = account.name;
  return account;
}

function getAccountBalance(accountName) {
  const account = state.accounts.find((item) => item.name.toLowerCase() === accountName.toLowerCase());
  return state.transactions
    .filter((tx) => tx.accountName.toLowerCase() === accountName.toLowerCase())
    .reduce((sum, tx) => sum + (tx.type === 'cash-in' ? Number(tx.cashInAfn || 0) : -Number(tx.cashOutAfn || 0)), Number(account?.openingBalance || 0));
}

function renderAccounts() {
  const search = els.accountSearchInput.value.toLowerCase();
  const filtered = state.accounts.filter((account) => account.name.toLowerCase().includes(search));
  els.accountList.innerHTML = filtered.length ? filtered.map((account) => `
    <div class="account-item ${account.name === state.selectedAccount ? 'active' : ''}">
      <div>
        <strong>${escapeHtml(account.name)}</strong>
        <span class="account-meta">${formatCurrency(getAccountBalance(account.name))}</span>
      </div>
      <div>
        <button class="ghost-btn table-action" data-account="${escapeHtml(account.name)}">Select</button>
      </div>
    </div>
  `).join('') : '<div class="list-item">No accounts found.</div>';
  els.accountList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedAccount = button.dataset.account;
      renderAccounts();
      renderLedger();
    });
  });
}

function renderLedger() {
  const accountName = state.selectedAccount || state.accounts[0]?.name || '';
  state.selectedAccount = accountName;
  if (!accountName) {
    els.ledgerTitle.textContent = 'Selected Ledger';
    els.ledgerSummary.innerHTML = '<p>No account selected.</p>';
    els.ledgerTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;">Create an account to begin.</td></tr>';
    return;
  }

  const account = state.accounts.find((item) => item.name.toLowerCase() === accountName.toLowerCase());
  const transactions = state.transactions
    .filter((tx) => tx.accountName.toLowerCase() === accountName.toLowerCase())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = Number(account?.openingBalance || 0);
  els.ledgerTitle.textContent = `${accountName} Ledger`;

  const totalCredit = transactions.reduce((sum, tx) => sum + Number(tx.cashInAfn || 0), 0);
  const totalDebit = transactions.reduce((sum, tx) => sum + Number(tx.cashOutAfn || 0), 0);
  const finalBalance = runningBalance + totalCredit - totalDebit;

  els.ledgerSummary.innerHTML = `
    <div class="receipt-grid">
      <div><strong>Opening Balance</strong><div>${formatCurrency(runningBalance)}</div></div>
      <div><strong>Total Debit</strong><div>${formatCurrency(totalDebit)}</div></div>
      <div><strong>Total Credit</strong><div>${formatCurrency(totalCredit)}</div></div>
      <div><strong>Final Balance</strong><div>${formatCurrency(finalBalance)}</div></div>
    </div>
  `;

  els.ledgerTableBody.innerHTML = transactions.length ? transactions.map((tx, index) => {
    const delta = tx.type === 'cash-in' ? Number(tx.cashInAfn || 0) : -Number(tx.cashOutAfn || 0);
    runningBalance += delta;
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(tx.date)}</td>
        <td>${escapeHtml(tx.detail || '')}</td>
        <td class="money-cell balance-positive">${tx.cashInAfn ? formatCurrency(tx.cashInAfn) : '-'}</td>
        <td class="money-cell balance-negative">${tx.cashOutAfn ? formatCurrency(tx.cashOutAfn) : '-'}</td>
        <td class="money-cell ${runningBalance >= 0 ? 'balance-positive' : 'balance-negative'}">${formatCurrency(runningBalance)}</td>
        <td class="money-cell">${tx.usdIn ? formatCurrency(tx.usdIn, 'USD') : '-'}</td>
        <td class="money-cell">${tx.usdOut ? formatCurrency(tx.usdOut, 'USD') : '-'}</td>
        <td>${escapeHtml(tx.note || '')}</td>
        <td>
          <button class="ghost-btn table-action" data-action="receipt" data-id="${tx.id}">Receipt</button>
        </td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="10" style="text-align:center;padding:24px;">No transactions for this account.</td></tr>';

  els.ledgerTableBody.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => handleTableAction(button.dataset.action, button.dataset.id));
  });
}

function renderConverter() {
  els.converterRate.value = state.settings.exchangeRate || defaultSettings.exchangeRate;
  renderConversion();
}

function renderConversion() {
  const direction = els.converterDirection.value;
  const amount = Number(els.converterAmount.value || 0);
  const rate = Number(els.converterRate.value || state.settings.exchangeRate || 0);
  let result = '';
  if (!rate) {
    els.conversionResult.textContent = 'Enter an exchange rate greater than zero.';
    return;
  }
  if (direction === 'afnToUsd') {
    result = `${formatCurrency(amount)} ÷ ${rate} = ${formatCurrency(amount / rate, 'USD')}`;
  } else {
    result = `${formatCurrency(amount, 'USD')} × ${rate} = ${formatCurrency(amount * rate)}`;
  }
  els.conversionResult.textContent = result;
}

function saveExchangeRate() {
  const rate = Number(els.converterRate.value || 0);
  if (!rate) return;
  state.settings.exchangeRate = rate;
  saveState();
  els.conversionResult.textContent = `Default exchange rate saved: ${rate}`;
}

function renderSettings() {
  els.companyNameSetting.value = state.settings.companyName || defaultSettings.companyName;
  els.currencySetting.value = state.settings.currency || defaultSettings.currency;
  els.exchangeRateSetting.value = state.settings.exchangeRate || defaultSettings.exchangeRate;
  els.themeSetting.value = state.settings.theme || 'dark';
  els.printHeaderSetting.checked = state.settings.printHeader !== false;
  els.lastBackupLabel.textContent = state.settings.lastBackup || 'Never';
}

function saveSettings() {
  state.settings.companyName = els.companyNameSetting.value.trim() || defaultSettings.companyName;
  state.settings.currency = els.currencySetting.value.trim() || 'AFN';
  state.settings.exchangeRate = Number(els.exchangeRateSetting.value || defaultSettings.exchangeRate);
  state.settings.theme = els.themeSetting.value || 'dark';
  state.settings.printHeader = els.printHeaderSetting.checked;
  applyTheme();
  saveState();
  els.backupStatus.textContent = 'Settings saved.';
}

function exportBackup() {
  const payload = {
    backupId: createId(),
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    accounts: state.accounts,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bawar-cash-book-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  state.settings.lastBackup = new Date().toLocaleString();
  saveState();
  renderSettings();
  els.backupStatus.textContent = 'Backup exported.';
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!confirm('Restore this backup and overwrite current local data?')) return;
      state.settings = { ...defaultSettings, ...(payload.settings || {}) };
      state.transactions = normalizeTransactions(payload.transactions);
      state.accounts = normalizeAccounts(payload.accounts);
      state.selectedAccount = state.accounts[0]?.name || '';
      saveState();
      renderAll();
      els.backupStatus.textContent = 'Backup restored successfully.';
    } catch (error) {
      els.backupStatus.textContent = 'Invalid backup file.';
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearAllData() {
  if (!confirm('Clear all data from local storage? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state.transactions = [];
  state.accounts = [];
  state.settings = { ...defaultSettings };
  state.selectedAccount = '';
  saveState();
  renderAll();
  els.backupStatus.textContent = 'All local data cleared.';
}

function exportTransactionsCsv() {
  const rows = getFilteredTransactions();
  const header = ['Date', 'Name', 'Detail', 'Type', 'Cash In AFN', 'Cash Out AFN', 'USD In', 'USD Out', 'Exchange Rate', 'Note'];
  const csv = [header.map(csvCell).join(',')]
    .concat(rows.map((tx) => [tx.date, tx.accountName, tx.detail, tx.type, tx.cashInAfn, tx.cashOutAfn, tx.usdIn, tx.usdOut, tx.exchangeRate, tx.note].map(csvCell).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cash-book-export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportLedgerJson() {
  const accountName = state.selectedAccount || state.accounts[0]?.name || '';
  if (!accountName) return;
  const payload = {
    accountName,
    transactions: state.transactions.filter((tx) => tx.accountName === accountName)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${accountName.replace(/\s+/g, '-').toLowerCase()}-ledger.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function toggleTableFullscreen() {
  if (!els.cashbookTableCard) return;
  if (document.fullscreenElement === els.cashbookTableCard) {
    document.exitFullscreen?.();
    return;
  }
  if (els.cashbookTableCard.requestFullscreen) {
    els.cashbookTableCard.requestFullscreen();
    return;
  }
  els.cashbookTableCard.classList.toggle('fullscreen-fallback');
  els.fullscreenTableBtn.textContent = els.cashbookTableCard.classList.contains('fullscreen-fallback') ? 'Exit Full Screen' : 'Full Screen';
}

function getPrintStyles() {
  return `
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:0;padding:0;font-size:11px}
    h1{font-size:20px;margin:0 0 4px;text-transform:uppercase}
    h2{font-size:14px;margin:0 0 8px;letter-spacing:.08em}
    p{margin:0 0 10px;color:#444}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 14px;font-weight:700}
    .summary span,.summary div{border:1px solid #cfd4dc;background:#f7f9fc;padding:8px}
    table{width:100%;border-collapse:collapse;page-break-inside:auto}
    thead{display:table-header-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{padding:5px 6px;border:1px solid #d6dbe3;text-align:left;vertical-align:top}
    th{background:#eef2f7;font-size:10px;text-transform:uppercase}
    td:nth-child(5),td:nth-child(6),td:nth-child(7),td:nth-child(8),td:nth-child(9){white-space:nowrap}
  `;
}

function printCurrentView() {
  window.print();
}

function printTransactionsView() {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  const rows = getFilteredTransactions();
  const metrics = getMetrics();
  let runningBalance = 0;
  const content = `
    <html>
      <head><title>${escapeHtml(state.settings.companyName)} - Cash Book</title><style>${getPrintStyles()}</style></head>
      <body>
        <h1>${escapeHtml(state.settings.companyName)}</h1>
        <h2>CASH BOOK / RECORDS</h2>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <div class="summary">
          <span>Cash In: ${formatCurrency(metrics.cashInAfn)}</span>
          <span>Cash Out: ${formatCurrency(metrics.cashOutAfn)}</span>
          <span>Balance: ${formatCurrency(metrics.afnBalance)}</span>
        </div>
        <table>
          <thead><tr><th>SN</th><th>Date</th><th>Name</th><th>Detail</th><th>Cash In</th><th>Cash Out</th><th>Balance</th><th>USD In</th><th>USD Out</th><th>Exchange Rate</th><th>Note</th></tr></thead>
          <tbody>${rows.map((tx, index) => {
            runningBalance += tx.type === 'cash-in' ? Number(tx.cashInAfn || 0) : -Number(tx.cashOutAfn || 0);
            return `<tr><td>${index + 1}</td><td>${escapeHtml(tx.date)}</td><td>${escapeHtml(tx.accountName || '')}</td><td>${escapeHtml(tx.detail || '')}</td><td>${tx.cashInAfn ? formatCurrency(tx.cashInAfn) : ''}</td><td>${tx.cashOutAfn ? formatCurrency(tx.cashOutAfn) : ''}</td><td>${formatCurrency(runningBalance)}</td><td>${tx.usdIn ? formatCurrency(tx.usdIn, 'USD') : ''}</td><td>${tx.usdOut ? formatCurrency(tx.usdOut, 'USD') : ''}</td><td>${tx.exchangeRate || ''}</td><td>${escapeHtml(tx.note || '')}</td></tr>`;
          }).join('')}</tbody>
        </table>
      </body>
    </html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function printLedgerView() {
  const accountName = state.selectedAccount || state.accounts[0]?.name || '';
  if (!accountName) return;
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  const account = state.accounts.find((item) => item.name.toLowerCase() === accountName.toLowerCase());
  const transactions = state.transactions.filter((tx) => tx.accountName.toLowerCase() === accountName.toLowerCase()).sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalCredit = transactions.reduce((sum, tx) => sum + Number(tx.cashInAfn || 0), 0);
  const totalDebit = transactions.reduce((sum, tx) => sum + Number(tx.cashOutAfn || 0), 0);
  const finalBalance = Number(account?.openingBalance || 0) + totalCredit - totalDebit;
  const content = `
    <html>
      <head><title>${escapeHtml(state.settings.companyName)} - Ledger</title><style>${getPrintStyles()}</style></head>
      <body>
        <h1>${escapeHtml(state.settings.companyName)}</h1>
        <h2>ACCOUNT LEDGER - ${escapeHtml(accountName)}</h2>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <div class="summary">
          <div>Opening Balance: ${formatCurrency(account?.openingBalance || 0)}</div>
          <div>Total Credit: ${formatCurrency(totalCredit)}</div>
          <div>Total Debit: ${formatCurrency(totalDebit)}</div>
          <div>Final Balance: ${formatCurrency(finalBalance)}</div>
        </div>
        <table>
          <thead><tr><th>SN</th><th>Date</th><th>Detail</th><th>Cash In</th><th>Cash Out</th><th>Balance</th><th>USD In</th><th>USD Out</th><th>Note</th></tr></thead>
          <tbody>${transactions.reduce((rows, tx, index) => {
            rows.balance += tx.type === 'cash-in' ? Number(tx.cashInAfn || 0) : -Number(tx.cashOutAfn || 0);
            rows.html.push(`<tr><td>${index + 1}</td><td>${escapeHtml(tx.date)}</td><td>${escapeHtml(tx.detail || '')}</td><td>${tx.cashInAfn ? formatCurrency(tx.cashInAfn) : ''}</td><td>${tx.cashOutAfn ? formatCurrency(tx.cashOutAfn) : ''}</td><td>${formatCurrency(rows.balance)}</td><td>${tx.usdIn ? formatCurrency(tx.usdIn, 'USD') : ''}</td><td>${tx.usdOut ? formatCurrency(tx.usdOut, 'USD') : ''}</td><td>${escapeHtml(tx.note || '')}</td></tr>`);
            return rows;
          }, { balance: Number(account?.openingBalance || 0), html: [] }).html.join('')}</tbody>
        </table>
      </body>
    </html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openReceipt(tx) {
  els.receiptContent.innerHTML = `
    <div class="receipt-head">
      <div>
        <h2>${state.settings.companyName}</h2>
        <p>Receipt / Voucher</p>
      </div>
      <div>
        <strong>Receipt No:</strong> ${tx.id.slice(0, 8)}<br />
        <strong>Date:</strong> ${tx.date}
      </div>
    </div>
    <div class="receipt-grid">
      <div><strong>Name:</strong> ${escapeHtml(tx.accountName || '')}</div>
      <div><strong>Detail:</strong> ${escapeHtml(tx.detail || '')}</div>
      <div><strong>Type:</strong> ${tx.type === 'cash-in' ? 'Cash In' : 'Cash Out'}</div>
      <div><strong>AFN Amount:</strong> ${formatCurrency(tx.type === 'cash-in' ? tx.cashInAfn : tx.cashOutAfn)}</div>
      <div><strong>USD Amount:</strong> ${tx.type === 'cash-in' ? formatCurrency(tx.usdIn || 0, 'USD') : formatCurrency(tx.usdOut || 0, 'USD')}</div>
      <div><strong>Exchange Rate:</strong> ${tx.exchangeRate || state.settings.exchangeRate}</div>
      <div><strong>Note:</strong> ${escapeHtml(tx.note || '')}</div>
    </div>
    <div class="signature-line">
      <div>Prepared By</div>
      <div>Approved By</div>
    </div>
    <div class="signature-line">
      <div>____________________</div>
      <div>____________________</div>
    </div>
    <div class="signature-line">
      <div>Cashier</div>
      <div>Manager</div>
    </div>
    <button class="primary-btn" onclick="window.print()">Print Receipt</button>
  `;
  els.receiptModal.classList.remove('hidden');
}

function closeReceiptModal() {
  els.receiptModal.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.addEventListener('DOMContentLoaded', init);

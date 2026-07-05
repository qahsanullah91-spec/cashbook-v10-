import { lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ReceiptModal from './components/ReceiptModal';
import ConfirmDialog from './components/ConfirmDialog';
import ToastNotification from './components/ToastNotification';
import Dashboard from './pages/Dashboard';
import CashBook from './pages/CashBook';
import LoginScreen from './pages/LoginScreen';
import SecuritySetup from './pages/SecuritySetup';
import { api, setAuthToken } from './services/api';
import { isLegacyUpdateDateError, withoutTransactionDate } from './services/transactionCompatibility';
import { currency, csvCell, dateLabel, jalaliDateLabel, todayInputValue } from './utils/format';
import { buildPrintReport, reportDateRange, waitForCondition, waitForPrintReady, withTimeout } from './utils/printEngine';
import { buildCashBookRows, CASH_BOOK_PAGE_SIZE, currentMonthDateRange, filterCashBookRows, monthDateRangeForDate, summarizeCashBookRows } from './utils/transactions';
import { employeeSalarySnapshot, salaryMonthStart } from './utils/payroll';
import useDebouncedValue from './hooks/useDebouncedValue';

const AccountLedger = lazy(() => import('./pages/AccountLedger'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Reports = lazy(() => import('./pages/Reports'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const CurrencyConverter = lazy(() => import('./pages/CurrencyConverter'));
const Settings = lazy(() => import('./pages/Settings'));
const EmployeesSalary = lazy(() => import('./pages/EmployeesSalary'));
const GlassPrintPreview = lazy(() => import('./components/GlassPrintPreview'));

const today = todayInputValue();
const activeCashMonthRange = currentMonthDateRange();

function persistCurrentUser(user) {
  try {
    localStorage.removeItem('cashbook-current-user');
    if (!user) return;
    const compactUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      last_login: user.last_login,
      avatar_path: user.avatar_path && !String(user.avatar_path).startsWith('data:') && String(user.avatar_path).length < 2048
        ? user.avatar_path
        : ''
    };
    localStorage.setItem('cashbook-current-user', JSON.stringify(compactUser));
  } catch {
    localStorage.removeItem('cashbook-current-user');
  }
}

const emptyCashForm = (type) => ({
  date: today,
  account_id: null,
  employee_id: null,
  salary_month: salaryMonthStart(today),
  payroll_kind: 'salary',
  account_name: '',
  detail: '',
  cash_amount: '',
  usd_amount: '',
  exchange_rate: '64.30',
  category: 'other',
  payment_method: 'cash',
  note: '',
  transaction_type: type,
  editingId: null
});

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('cashbook-theme') || 'dark');
  const [companyName, setCompanyName] = useState('BAWAR STAR PLASTIC INDUSTRY');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyTaxNumber, setCompanyTaxNumber] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLicense, setCompanyLicense] = useState('');
  const [currencyCode, setCurrencyCode] = useState('AFN');
  const [exchangeRate, setExchangeRate] = useState('64.30');
  const [printHeader, setPrintHeader] = useState(true);
  const [language, setLanguage] = useState('English');
  const [dateDisplayFormat, setDateDisplayFormat] = useState('dual');
  const [printFooterText, setPrintFooterText] = useState('Prepared by BAWAR STAR PLASTIC INDUSTRY');
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(30);
  const [summary, setSummary] = useState({ cash_in_afn: 0, cash_out_afn: 0, afn_balance: 0, usd_in: 0, usd_out: 0, usd_balance: 0, today_transactions: 0, monthly_transactions: 0 });
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [cashSearch, setCashSearch] = useState('');
  const [cashStartDate, setCashStartDate] = useState(activeCashMonthRange.startDate);
  const [cashEndDate, setCashEndDate] = useState(activeCashMonthRange.endDate);
  const [cashTypeFilter, setCashTypeFilter] = useState('all');
  const [cashCategoryFilter, setCashCategoryFilter] = useState('all');
  const [cashPaymentFilter, setCashPaymentFilter] = useState('all');
  const [cashAccountFilter, setCashAccountFilter] = useState('');
  const [cashPage, setCashPage] = useState(1);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountForm, setAccountForm] = useState({ id: null, name: '', account_type: 'customer', phone: '', address: '', opening_balance_afn: '', opening_balance_usd: '', note: '' });
  const [reportMode, setReportMode] = useState('daily');
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [reportData, setReportData] = useState(null);
  const [converterDirection, setConverterDirection] = useState('afnToUsd');
  const [converterAmount, setConverterAmount] = useState('');
  const [converterRate, setConverterRate] = useState('64.30');
  const [converterResult, setConverterResult] = useState('');
  const [cashInForm, setCashInForm] = useState(emptyCashForm('cash_in'));
  const [cashOutForm, setCashOutForm] = useState(emptyCashForm('cash_out'));
  const [cashInMessage, setCashInMessage] = useState('');
  const [cashOutMessage, setCashOutMessage] = useState('');
  const [transactionSavingType, setTransactionSavingType] = useState('');
  const [tableFullscreen, setTableFullscreen] = useState(false);
  const [activeTransactionType, setActiveTransactionType] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printReport, setPrintReport] = useState(null);
  const [printStatus, setPrintStatus] = useState('idle');
  const [printError, setPrintError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem('cashbook-last-backup-at') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsers, setLoginUsers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const fileRef = useRef(null);
  const csvFileRef = useRef(null);
  const tableRef = useRef(null);
  const printDocumentRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const printContextRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('cashbook-theme', theme);
  }, [theme]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (currentUser && !passwordChangeRequired) loadAll();
    if (currentUser?.role === 'Administrator' && !passwordChangeRequired) reloadManagedUsers();
  }, [currentUser, passwordChangeRequired]);

  useEffect(() => {
    if (currentUser && activeView === 'settings') refreshDiagnostics();
  }, [activeView, currentUser]);

  useEffect(() => {
    if (activeTransactionType !== null) {
      setActiveView('cashbook');
    }
  }, [activeTransactionType]);

  useEffect(() => {
    if (activeView !== 'cashbook') {
      setActiveTransactionType(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, markActivity));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !autoLogoutMinutes) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current > Number(autoLogoutMinutes) * 60 * 1000) {
        onLogout('Session expired after inactivity.');
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [currentUser, autoLogoutMinutes]);

  useEffect(() => {
    const handleFullscreen = () => setTableFullscreen(document.fullscreenElement === tableRef.current || tableRef.current?.classList.contains('fullscreen-fallback'));
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    const rate = Number(converterRate || exchangeRate || 0);
    const amount = Number(converterAmount || 0);
    if (!rate) {
      setConverterResult('Enter an exchange rate greater than zero.');
      return;
    }
    if (converterDirection === 'afnToUsd') {
      setConverterResult(`${currency(amount)} / ${rate} = ${currency(amount / rate, 'USD')}`);
      return;
    }
    setConverterResult(`${currency(amount, 'USD')} x ${rate} = ${currency(amount * rate)}`);
  }, [converterAmount, converterDirection, converterRate, exchangeRate]);

  async function loadAll() {
    setIsLoading(true);
    setPageError('');
    try {
      const [summaryData, transactionData, accountData, employeeData, settingsData] = await Promise.all([
        api.getSummary(),
        api.getTransactions(),
        api.getAccounts(),
        api.getEmployees(),
        api.getSettings()
      ]);
      setSummary(summaryData);
      setTransactions(transactionData);
      setAccounts(accountData);
      setEmployees(employeeData);
      setTheme(settingsData.theme || 'dark');
      setCompanyName(settingsData.company_name || companyName);
      setCompanyPhone(settingsData.company_phone || '');
      setCompanyEmail(settingsData.company_email || '');
      setCompanyWebsite(settingsData.company_website || '');
      setCompanyTaxNumber(settingsData.company_tax_number || '');
      setCompanyLogo(settingsData.company_logo || '');
      setCompanyAddress(settingsData.company_address || '');
      setCompanyLicense(settingsData.company_license || '');
      setCurrencyCode(settingsData.default_currency || 'AFN');
      setLanguage(settingsData.language || 'English');
      setDateDisplayFormat(settingsData.date_display_format || 'dual');
      setPrintFooterText(settingsData.print_footer_text || '');
      setAutoLogoutMinutes(settingsData.auto_logout_minutes || 30);
      setExchangeRate(String(settingsData.default_exchange_rate || exchangeRate));
      setConverterRate(String(settingsData.default_exchange_rate || exchangeRate));
      if (accountData.length && !selectedAccount) {
        await onSelectAccount(accountData[0]);
      } else if (!accountData.length) {
        setSelectedAccount(null);
        setLedger(null);
      }
    } catch (error) {
      setPageError(error.message);
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 2500);
  }

  async function initializeAuth() {
    setAuthLoading(true);
    setPageError('');
    try {
      await api.health();
      const status = await api.getAuthStatus();
      setLoginUsers(status.users || []);
      setSetupRequired(Boolean(status.setup_required));
      
      const token = localStorage.getItem('cashbook-session-token');
      if (token) {
        setAuthToken(token);
        const user = await api.getMe();
        setCurrentUser(user);
        setPasswordChangeRequired(Boolean(user.must_change_password));
        persistCurrentUser(user);
      } else {
        setAuthToken('');
        localStorage.removeItem('cashbook-current-user');
        setCurrentUser(null);
        setPasswordChangeRequired(false);
        setIsLoading(false);
      }
    } catch (error) {
      setAuthToken('');
      localStorage.removeItem('cashbook-session-token');
      localStorage.removeItem('cashbook-current-user');
      setPageError(error.message);
      setCurrentUser(null);
      setPasswordChangeRequired(false);
      setIsLoading(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function onLogin(payload) {
    // Neon Auth path: LoginScreen already called api.neonAuthLogin() and
    // setAuthToken(). We receive the completed response, skip the API call.
    const response = payload._neonAuthResponse
      ? payload._neonAuthResponse
      : await api.login(payload);
    setPageError('');
    setAuthToken(response.token);
    setCurrentUser(response.user);
    setPasswordChangeRequired(Boolean(response.must_change_password || response.user?.must_change_password));
    persistCurrentUser(response.user);
    try {
      if (payload.remember_user) localStorage.setItem('cashbook-remembered-user', response.user.username);
      else localStorage.removeItem('cashbook-remembered-user');
    } catch {
      localStorage.removeItem('cashbook-remembered-user');
    }
    lastActivityRef.current = Date.now();
    showToast('Login successful.', 'success');
  }

  async function onSetupOwner(payload) {
    const response = await api.setupOwner(payload);
    setAuthToken(response.token);
    setCurrentUser(response.user);
    setSetupRequired(false);
    setPasswordChangeRequired(false);
    persistCurrentUser(response.user);
    lastActivityRef.current = Date.now();
    showToast('Administrator account created.', 'success');
  }

  async function onChangePassword(payload) {
    const user = await api.changePassword(payload);
    setCurrentUser(user);
    setPasswordChangeRequired(false);
    persistCurrentUser(user);
    lastActivityRef.current = Date.now();
    showToast('Password changed successfully.', 'success');
  }

  async function onLogout(message = 'Logged out.') {
    try {
      await api.logout();
    } catch {
      // Keep local logout reliable if the API is temporarily unavailable.
    }
    setAuthToken('');
    localStorage.removeItem('cashbook-current-user');
    setCurrentUser(null);
    setPasswordChangeRequired(false);
    await initializeAuth();
    showToast(message, 'success');
  }

  async function reloadManagedUsers() {
    if (currentUser?.role !== 'Administrator') return;
    const users = await api.getUsers();
    setManagedUsers(users);
    setLoginUsers(users.filter((user) => user.is_active));
  }

  function normalizeAccountName(name) {
    return name.trim();
  }

  function buildTransactionPayload(form, type) {
    const afn = Number(form.cash_amount || 0);
    const usd = Number(form.usd_amount || 0);
    const rate = Number(form.exchange_rate || exchangeRate || 0);
    const derivedAfN = afn > 0 ? afn : usd > 0 && rate > 0 ? Number((usd * rate).toFixed(2)) : 0;
    const derivedUsd = usd > 0 ? usd : afn > 0 && rate > 0 ? Number((afn / rate).toFixed(2)) : 0;
    const accountName = normalizeAccountName(form.account_name);
    const matchingSelectedAccount = selectedAccount?.name?.toLowerCase() === accountName.toLowerCase();
    return {
      date: form.date,
      account_id: form.account_id || (matchingSelectedAccount ? selectedAccount.id : null),
      employee_id: form.employee_id || null,
      salary_month: form.salary_month,
      payroll_kind: form.employee_id ? (form.payroll_kind || 'salary') : null,
      account_name: accountName,
      detail: form.detail.trim(),
      transaction_type: type,
      cash_in_afn: type === 'cash_in' ? derivedAfN : 0,
      cash_out_afn: type === 'cash_out' ? derivedAfN : 0,
      usd_in: type === 'cash_in' ? derivedUsd : 0,
      usd_out: type === 'cash_out' ? derivedUsd : 0,
      exchange_rate: rate,
      converted_afn: derivedAfN,
      category: form.category,
      payment_method: form.payment_method,
      note: form.note.trim()
    };
  }

  async function submitTransaction(form, type) {
    if (!form.account_name.trim() || !form.detail.trim()) {
      return `${type === 'cash_in' ? 'Cash In' : 'Cash Out'} requires name and detail.`;
    }
    if (Number(form.cash_amount || 0) <= 0 && Number(form.usd_amount || 0) <= 0) {
      return 'Enter an AFN or USD amount greater than zero.';
    }
    try {
      setTransactionSavingType(type);
      const payload = buildTransactionPayload(form, type);
      const accountAlreadyLoaded = accounts.some((account) => account.name.toLowerCase() === payload.account_name.toLowerCase());
      let savedTransaction;
      if (form.editingId) {
        try {
          savedTransaction = await api.updateTransaction(form.editingId, payload);
        } catch (error) {
          if (!isLegacyUpdateDateError(error)) throw error;
          savedTransaction = await api.updateTransaction(form.editingId, withoutTransactionDate(payload));
        }
      } else {
        savedTransaction = await api.createTransaction(payload);
      }
      setTransactions((current) => form.editingId
        ? current.map((transaction) => transaction.id === savedTransaction.id ? savedTransaction : transaction)
        : [...current, savedTransaction]);
      const [nextSummary, nextAccounts] = await Promise.all([
        api.getSummary(),
        accountAlreadyLoaded ? Promise.resolve(null) : api.getAccounts()
      ]);
      setSummary(nextSummary);
      if (nextAccounts) setAccounts(nextAccounts);
      return 'Saved successfully.';
    } catch (error) {
      return error.message;
    } finally {
      setTransactionSavingType('');
    }
  }

  async function onCashInSubmit(event) {
    event.preventDefault();
    const message = await submitTransaction(cashInForm, 'cash_in');
    setCashInMessage(message);
    if (message.includes('Saved')) setCashInForm(emptyCashForm('cash_in'));
    showToast(message, message.includes('Saved') ? 'success' : 'error');
  }

  async function onCashOutSubmit(event) {
    event.preventDefault();
    const message = await submitTransaction(cashOutForm, 'cash_out');
    setCashOutMessage(message);
    if (message.includes('Saved')) setCashOutForm(emptyCashForm('cash_out'));
    showToast(message, message.includes('Saved') ? 'success' : 'error');
  }

  function onTransactionAccountChange(type, value) {
    const setter = type === 'cash_out' ? setCashOutForm : setCashInForm;
    setter((current) => ({ ...current, account_name: value, account_id: null, employee_id: null }));
  }

  function onTransactionAccountSelect(type, item) {
    const setter = type === 'cash_out' ? setCashOutForm : setCashInForm;
    setter((current) => {
      if (item.kind !== 'employee' || type !== 'cash_out') {
        return {
          ...current,
          account_name: item.name,
          account_id: item.accountId,
          employee_id: null,
          category: current.category
        };
      }
      const employee = item.employee;
      const salaryMonth = salaryMonthStart(current.salary_month || current.date);
      return {
        ...current,
        account_name: employee.full_name,
        account_id: employee.account_id,
        employee_id: employee.id,
        salary_month: salaryMonth,
        payroll_kind: 'salary',
        category: 'salary',
        detail: `Salary Payment - ${employee.full_name}`
      };
    });
  }

  function onEditTransaction(transaction) {
    const common = {
      date: transaction.date,
      account_name: transaction.account_name,
      account_id: transaction.account_id,
      employee_id: transaction.employee_id,
      salary_month: transaction.salary_month || salaryMonthStart(transaction.date),
      payroll_kind: transaction.payroll_kind || 'salary',
      detail: transaction.detail,
      cash_amount: transaction.transaction_type === 'cash_in' ? transaction.cash_in_afn : transaction.cash_out_afn,
      usd_amount: transaction.transaction_type === 'cash_in' ? transaction.usd_in : transaction.usd_out,
      exchange_rate: transaction.exchange_rate,
      category: transaction.category || 'other',
      payment_method: transaction.payment_method || 'cash',
      note: transaction.note,
      editingId: transaction.id
    };
    if (transaction.transaction_type === 'cash_in') {
      setCashInForm({ ...emptyCashForm('cash_in'), ...common, transaction_type: 'cash_in' });
      setCashOutForm(emptyCashForm('cash_out'));
      setCashInMessage('Editing transaction. Save to update it.');
      setActiveTransactionType('cash_in');
    } else {
      setCashOutForm({ ...emptyCashForm('cash_out'), ...common, transaction_type: 'cash_out' });
      setCashInForm(emptyCashForm('cash_in'));
      setCashOutMessage('Editing transaction. Save to update it.');
      setActiveTransactionType('cash_out');
    }
    setActiveView('cashbook');
  }

  async function onCreateAccount(event) {
    event.preventDefault();
    try {
      await api.createAccount({
        name: accountName,
        opening_balance_afn: Number(openingBalance || 0),
        opening_balance_usd: 0
      });
      setAccountName('');
      setOpeningBalance('');
      await loadAll();
      showToast('Account added.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function onSaveSettings() {
    try {
      await api.updateSettings({
        company_name: companyName,
        company_phone: companyPhone,
        company_email: companyEmail,
        company_website: companyWebsite,
        company_tax_number: companyTaxNumber,
        company_logo: companyLogo,
        company_address: companyAddress,
        company_license: companyLicense,
        default_exchange_rate: Number(exchangeRate || 0),
        default_currency: currencyCode,
        theme,
        language,
        date_display_format: dateDisplayFormat,
        print_footer_text: printFooterText,
        auto_logout_minutes: Number(autoLogoutMinutes || 30)
      });
      showToast('Settings saved.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function onBackup() {
    try {
      await api.createBackupSnapshot();
      const payload = await api.exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bawar-star-backup-${todayInputValue()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      const stamp = new Date().toLocaleString();
      setLastBackupAt(stamp);
      localStorage.setItem('cashbook-last-backup-at', stamp);
      setSettingsStatus('Cloud snapshot saved and local backup exported.');
      showToast('Cloud and local backups completed.', 'success');
    } catch (error) {
      setSettingsStatus('Backup failed.');
      showToast(error.message, 'error');
    }
  }

  function onImportClick() {
    fileRef.current?.click();
  }

  function onCsvImportClick() {
    csvFileRef.current?.click();
  }

  function onDownloadCsvTemplate() {
    const template = [
      'date,account_name,detail,transaction_type,cash_in_afn,cash_out_afn,usd_in,usd_out,exchange_rate,payment_method,category,note',
      '2026-06-14,Example Customer,Customer payment,cash_in,1000,0,0,0,0,cash,other,Sample row',
      '2026-06-14,Example Supplier,Material purchase,cash_out,0,700,0,0,0,bank,factory_expense,Sample row'
    ].join('\r\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cashbook-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onCsvImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('CSV file must be 5 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }
    const content = await file.text();
    setConfirm({
      title: 'Import cash book CSV',
      message: `Import transactions from ${file.name}? Exact duplicate rows will be skipped.`,
      onConfirm: async () => {
        try {
          const result = await api.importCashbookCsv(content, file.name);
          await loadAll();
          const summary = `Imported ${result.imported_transactions} transactions, skipped ${result.skipped_duplicates} duplicates, and created ${result.created_accounts} accounts.`;
          setSettingsStatus(summary);
          setConfirm(null);
          showToast(summary, 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
    event.target.value = '';
  }

  async function onImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      showToast('Invalid backup JSON file.', 'error');
      event.target.value = '';
      return;
    }
    setConfirm({
      title: 'Restore backup',
      message: 'This will import the backup and overwrite current local data if you choose replace.',
      onConfirm: async () => {
        try {
          await api.importBackup(payload, true);
          await loadAll();
          const stamp = new Date().toLocaleString();
          setLastBackupAt(stamp);
          localStorage.setItem('cashbook-last-backup-at', stamp);
          setSettingsStatus('Backup restored.');
          setConfirm(null);
          showToast('Backup restored.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
    event.target.value = '';
  }

  async function onClearAll() {
    setConfirm({
      title: 'Clear all data',
      message: 'This will delete all accounts, transactions, and settings from local storage.',
      onConfirm: async () => {
        try {
          await api.clearAll();
          await loadAll();
          setConfirm(null);
          showToast('All data cleared.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  }

  async function onPrint() {
    setPrintPreviewOpen(true);
    setPrintStatus('loading');
    setPrintError('');

    try {
      if (isLoadingRef.current) {
        await waitForCondition(() => !isLoadingRef.current, { timeoutMs: 8000 });
      }

      let context = printContextRef.current;
      if (!context) throw new Error('Report data is not available yet.');

      if (context.activeView === 'reports') {
        const data = await withTimeout(
          runReport({ throwOnError: true }),
          10000,
          'The report request timed out. Check the backend and try again.'
        );
        context = { ...context, reportData: data };
      }

      if (context.activeView === 'ledger' && context.selectedAccount && !context.ledger) {
        const ledgerData = await withTimeout(
          api.getLedger(context.selectedAccount.id),
          10000,
          'The ledger request timed out. Check the backend and try again.'
        );
        setLedger(ledgerData);
        context = { ...context, ledger: ledgerData };
      }

      const preparedReport = buildPrintReport(context);
      startTransition(() => {
        setPrintReport(preparedReport);
        setPrintStatus('ready');
      });
    } catch (error) {
      setPrintError(error.message || 'Print preview could not be prepared.');
      setPrintStatus('error');
    }
  }

  async function printPreparedDocument() {
    if (printStatus !== 'ready' || !printDocumentRef.current) return;
    setPrintStatus('printing');
    setPrintError('');
    try {
      await waitForPrintReady({ root: printDocumentRef.current, timeoutMs: 4000 });
      window.print();
    } catch (error) {
      setPrintError(error.message || 'The print dialog could not be opened.');
      setPrintStatus('error');
      return;
    }
    setPrintStatus('ready');
  }

  async function refreshDiagnostics() {
    setDiagnostics((current) => ({ ...(current || {}), loading: true, error: '' }));
    try {
      const [healthResult, databaseResult, authResult] = await Promise.allSettled([
        api.health(),
        api.healthDatabase(),
        api.healthAuth()
      ]);
      const health = healthResult.status === 'fulfilled' ? healthResult.value : {};
      const database = databaseResult.status === 'fulfilled' ? databaseResult.value : {};
      const auth = authResult.status === 'fulfilled' ? authResult.value : {};
      const failures = [healthResult, databaseResult, authResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason?.message || 'Request failed');
      const anyReachable = [healthResult, databaseResult, authResult].some((result) => result.status === 'fulfilled');
      setDiagnostics({
        loading: false,
        error: failures.join(' | '),
        health: {
          ...health,
          backend: anyReachable ? (health.backend || 'online') : 'offline',
          status: health.status || health.api || (anyReachable ? 'ok' : 'offline'),
        },
        database,
        auth
      });
    } catch (error) {
      setDiagnostics({
        loading: false,
        error: error.message,
        health: { status: 'offline', backend: 'offline', database: 'offline', auth: 'offline', detail: error.message },
        database: { status: 'offline', database: 'offline' },
        auth: { status: 'offline', auth: 'offline' }
      });
    }
  }

  function onExportCashBook() {
    const rows = cashRows;
    const header = ['SN', 'Date', 'Name', 'Detail', 'Cash In AFN', 'Cash Out AFN', 'Balance', 'USD In', 'USD Out', 'Exchange Rate', 'Note'];
    const csv = [
      header.map(csvCell).join(',')
    ].concat(rows.map((row, index) => [row.isOpeningBalance ? 'BF' : index + 1, row.date, row.account_name, row.detail, row.cash_in_afn, row.cash_out_afn, row.runningBalance, row.usd_in, row.usd_out, row.exchange_rate, row.note].map(csvCell).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-book-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportCashBookJson() {
    const blob = new Blob([JSON.stringify(cashRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-book-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportLedger() {
    const rows = ledger?.rows || [];
    const blob = new Blob([JSON.stringify({ ledger, rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ledger-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportPreviewData() {
    const blob = new Blob([JSON.stringify(printReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bawar-star-print-preview-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onSaveAccount(event) {
    event.preventDefault();
    const payload = {
      ...accountForm,
      opening_balance_afn: Number(accountForm.opening_balance_afn || 0),
      opening_balance_usd: Number(accountForm.opening_balance_usd || 0)
    };
    delete payload.id;
    try {
      if (accountForm.id) await api.updateAccount(accountForm.id, payload);
      else await api.createAccount(payload);
      setAccountForm({ id: null, name: '', account_type: 'customer', phone: '', address: '', opening_balance_afn: '', opening_balance_usd: '', note: '' });
      await loadAll();
      showToast('Account saved.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function onCreateEmployee(payload) {
    try {
      const employee = await api.createEmployee(payload);
      const nextAccounts = await api.getAccounts();
      setEmployees((current) => [...current, employee].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setAccounts(nextAccounts);
      showToast('Employee added.', 'success');
      return employee;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function onSalaryPaymentSaved() {
    const [nextTransactions, nextSummary] = await Promise.all([
      api.getTransactions(),
      api.getSummary()
    ]);
    setTransactions(nextTransactions);
    setSummary(nextSummary);
  }

  async function onEmployeeSalaryChanged() {
    setEmployees(await api.getEmployees());
  }

  async function onEmployeeAvatarChanged(employee) {
    setEmployees((current) => current.map((item) => Number(item.id) === Number(employee.id) ? employee : item));
    showToast('Employee picture updated.', 'success');
  }

  async function onEmployeeDeleted() {
    await loadAll();
    showToast('Employee deleted.', 'success');
  }

  function onDeleteAccount(account) {
    setConfirm({
      title: 'Delete account',
      message: `Delete ${account.name} and its linked transactions?`,
      onConfirm: async () => {
        try {
          await api.deleteAccount(account.id);
          setConfirm(null);
          await loadAll();
          showToast('Account deleted.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  }

  async function runReport({ throwOnError = false } = {}) {
    try {
      let data;
      if (reportMode === 'daily' || reportMode === 'monthly') {
        const range = reportDateRange(reportMode);
        data = await api.getDateRangeReport(range.start, range.end);
      }
      else if (reportMode === 'expenses') data = await api.getExpenseReport();
      else data = await api.getDateRangeReport(reportStartDate, reportEndDate);
      setReportData(data);
      showToast('Report generated.', 'success');
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      if (throwOnError) throw error;
      return null;
    }
  }

  async function onSelectAccount(account) {
    try {
      setSelectedAccount(account);
      setLedger(null);
      const ledgerData = await api.getLedger(account.id);
      setLedger(ledgerData);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function setCashMonthFromDate(dateValue) {
    const range = monthDateRangeForDate(dateValue);
    setCashStartDate(range.startDate);
    setCashEndDate(range.endDate);
  }

  const latestTransactions = useMemo(() => [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6), [transactions]);
  const deferredCashSearch = useDebouncedValue(cashSearch);
  const deferredCashAccountFilter = useDebouncedValue(cashAccountFilter);
  const cashRowsWithBalances = useMemo(() => buildCashBookRows(transactions), [transactions]);
  const cashRows = useMemo(() => filterCashBookRows(cashRowsWithBalances, {
    search: deferredCashSearch,
    account: deferredCashAccountFilter,
    startDate: cashStartDate,
    endDate: cashEndDate,
    type: cashTypeFilter,
    category: cashCategoryFilter,
    payment: cashPaymentFilter
  }), [cashRowsWithBalances, deferredCashSearch, deferredCashAccountFilter, cashStartDate, cashEndDate, cashTypeFilter, cashCategoryFilter, cashPaymentFilter]);
  const cashTotals = useMemo(() => summarizeCashBookRows(cashRows), [cashRows]);
  const selectedCashOutEmployee = useMemo(
    () => employees.find((employee) => Number(employee.id) === Number(cashOutForm.employee_id)) || null,
    [employees, cashOutForm.employee_id]
  );
  const selectedEmployeeSalary = useMemo(
    () => employeeSalarySnapshot(selectedCashOutEmployee, transactions, cashOutForm.salary_month || cashOutForm.date),
    [selectedCashOutEmployee, transactions, cashOutForm.salary_month, cashOutForm.date]
  );
  const cashPageCount = Math.max(1, Math.ceil(cashRows.length / CASH_BOOK_PAGE_SIZE));
  const cashPageStart = (cashPage - 1) * CASH_BOOK_PAGE_SIZE;
  const visibleCashRows = useMemo(
    () => cashRows.slice(cashPageStart, cashPageStart + CASH_BOOK_PAGE_SIZE),
    [cashRows, cashPageStart]
  );

  useEffect(() => {
    setCashPage(1);
  }, [deferredCashSearch, deferredCashAccountFilter, cashStartDate, cashEndDate, cashTypeFilter, cashCategoryFilter, cashPaymentFilter]);

  useEffect(() => {
    if (cashPage > cashPageCount) setCashPage(cashPageCount);
  }, [cashPage, cashPageCount]);

  const ledgerRows = ledger?.rows || [];
  const ledgerSummary = ledger ? {
    opening: currency(ledger.opening_balance_afn),
    debit: currency(ledger.total_cash_out_afn),
    credit: currency(ledger.total_cash_in_afn),
    final: currency(ledger.final_balance_afn)
  } : { opening: currency(0), debit: currency(0), credit: currency(0), final: currency(0) };
  printContextRef.current = {
    activeView,
    company: {
      companyName,
      companyLogo,
      companyAddress,
      companyPhone,
      companyEmail,
    },
    preparedBy: currentUser?.full_name || 'System User',
    dateDisplayFormat,
    summary,
    latestTransactions,
    cashRows,
    cashTotals,
    ledger,
    selectedAccount,
    reportMode,
    reportData
  };

  const printReceipt = async () => {
    if (!receipt) return;
    const content = `
      <html><head><title>Receipt</title><style>${printStyles()}</style></head>
      <body>${receiptHtml(receipt)}</body></html>
    `;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast('Allow popups to print the receipt.', 'error');
      return;
    }
    win.document.write(content);
    win.document.close();
    win.focus();
    try {
      await waitForPrintReady({
        root: win.document.body,
        documentRef: win.document,
        requestFrame: win.requestAnimationFrame.bind(win),
        timeoutMs: 3000
      });
      win.print();
    } catch (error) {
      showToast(error.message || 'Receipt printing failed.', 'error');
    }
  };

  const printStyles = () => `
    @page{size:A5 portrait;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;margin:0;color:#101828;background:#fff;font-size:12px}
    .receipt-sheet{border:1.5px solid #1d2939;padding:18px;min-height:175mm;position:relative}
    .receipt-header{display:flex;justify-content:space-between;gap:20px;padding-bottom:14px;border-bottom:2px solid #1d2939}
    .receipt-header h1{font-size:20px;margin:0 0 5px}.receipt-header p,.receipt-header h2{margin:2px 0}
    .receipt-meta{text-align:right;line-height:1.6}
    .type-badge{display:inline-block;margin:16px 0 10px;padding:6px 10px;border:1px solid #101828;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #98a2b3;padding:9px;text-align:left}
    th{width:34%;background:#f2f4f7}.amount-row td{font-size:16px;font-weight:700}
    .signature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:54px;text-align:center}
    .signature{padding-top:8px;border-top:1px solid #344054}
    .receipt-footer{position:absolute;bottom:14px;left:18px;right:18px;padding-top:8px;border-top:1px solid #d0d5dd;text-align:center;color:#475467}
  `;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const receiptHtml = (tx) => `
    <main class="receipt-sheet">
      <header class="receipt-header">
        <div>
          <h1>${escapeHtml(companyName)}</h1>
          <p>${escapeHtml(companyAddress)}</p>
          <p>${escapeHtml(companyPhone)}</p>
        </div>
        <div class="receipt-meta">
          <h2>RECEIPT / VOUCHER</h2>
          <div><strong>No:</strong> ${escapeHtml(tx.transaction_no || String(tx.id).slice(0, 8))}</div>
          <div><strong>Date:</strong> ${escapeHtml(dateDisplayFormat === 'gregorian' ? dateLabel(tx.date) : dateDisplayFormat === 'persian' ? jalaliDateLabel(tx.date) : `${jalaliDateLabel(tx.date)} | ${dateLabel(tx.date)}`)}</div>
        </div>
      </header>
      <div class="type-badge">${tx.transaction_type === 'cash_in' ? 'Cash Receipt' : 'Payment Voucher'}</div>
      <table>
        <tr><th>Account Name</th><td>${escapeHtml(tx.account_name)}</td></tr>
        <tr><th>Details</th><td>${escapeHtml(tx.detail)}</td></tr>
        <tr class="amount-row"><th>Amount AFN</th><td>${escapeHtml(tx.transaction_type === 'cash_in' ? currency(tx.cash_in_afn) : currency(tx.cash_out_afn))}</td></tr>
        <tr><th>Amount USD</th><td>${escapeHtml(tx.transaction_type === 'cash_in' ? currency(tx.usd_in, 'USD') : currency(tx.usd_out, 'USD'))}</td></tr>
        <tr><th>Exchange Rate</th><td>${escapeHtml(tx.exchange_rate)}</td></tr>
        <tr><th>Payment Method</th><td>${escapeHtml(tx.payment_method || 'cash')}</td></tr>
        <tr><th>Note</th><td>${escapeHtml(tx.note || '-')}</td></tr>
      </table>
      <div class="signature-grid">
        <div class="signature">Prepared By</div>
        <div class="signature">Received By</div>
        <div class="signature">Authorized By</div>
      </div>
      <footer class="receipt-footer">${escapeHtml(printFooterText)}</footer>
    </main>
  `;

  function toggleTableFullscreen() {
    const node = tableRef.current;
    if (!node) return;
    if (document.fullscreenElement === node) {
      document.exitFullscreen?.();
      setTableFullscreen(false);
      return;
    }
    if (node.requestFullscreen) {
      node.requestFullscreen();
      setTableFullscreen(true);
      return;
    }
    node.classList.toggle('fullscreen-fallback');
    setTableFullscreen(node.classList.contains('fullscreen-fallback'));
  }

  if (setupRequired && !currentUser) {
    return (
      <>
        <SecuritySetup mode="setup" onSetup={onSetupOwner} companyName={companyName} companyLogo={companyLogo} />
        {authLoading && <div className="login-loading">Preparing secure setup...</div>}
        {pageError && <div className="login-loading error">{pageError}</div>}
        <ToastNotification toast={toast} />
      </>
    );
  }

  if (currentUser && passwordChangeRequired) {
    return (
      <>
        <SecuritySetup mode="change" currentUser={currentUser} onChangePassword={onChangePassword} onLogout={onLogout} companyName={companyName} companyLogo={companyLogo} />
        <ToastNotification toast={toast} />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen
          users={loginUsers}
          rememberedUsername={localStorage.getItem('cashbook-remembered-user') || ''}
          onLogin={onLogin}
          connectionError={pageError}
          isPreparing={authLoading}
          onRetryConnection={initializeAuth}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        {authLoading && <div className="login-loading">Preparing secure login...</div>}
        <ToastNotification toast={toast} />
      </>
    );
  }

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar activeView={activeView} setView={setActiveView} onPrint={onPrint} onBackup={onBackup} onRestore={onImportClick} />
      <main className="main-panel">
        <Topbar
          title={activeView === 'cashbook' ? 'Cash Book' : activeView === 'salary' ? 'Employees & Salary' : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onPrint={onPrint}
          currentUser={currentUser}
          onLogout={onLogout}
          companyName={companyName}
          companyLogo={companyLogo}
          theme={theme}
        />
        <Suspense fallback={<div className="loading-strip">Loading workspace...</div>}>
        <div>
          {isLoading && <div className="loading-strip">Loading latest cash book data...</div>}
          {pageError && <div className="error-banner">{pageError}</div>}
          {activeView === 'dashboard' && (
            <Dashboard
              summary={summary}
              latestTransactions={latestTransactions}
              onNavigate={setActiveView}
              onBackup={onBackup}
              onRestore={onImportClick}
              onPrint={onPrint}
              companyName={companyName}
              companyLogo={companyLogo}
              activeTransactionType={activeTransactionType}
              setActiveTransactionType={setActiveTransactionType}
            />
          )}
          {activeView === 'cashbook' && (
            <CashBook
              search={cashSearch}
              setSearch={setCashSearch}
              startDate={cashStartDate}
              setStartDate={setCashMonthFromDate}
              endDate={cashEndDate}
              setEndDate={setCashEndDate}
              typeFilter={cashTypeFilter}
              setTypeFilter={setCashTypeFilter}
              categoryFilter={cashCategoryFilter}
              setCategoryFilter={setCashCategoryFilter}
              paymentFilter={cashPaymentFilter}
              setPaymentFilter={setCashPaymentFilter}
              accountFilter={cashAccountFilter}
              setAccountFilter={setCashAccountFilter}
              onClearFilters={() => {
                setCashSearch('');
                setCashStartDate(activeCashMonthRange.startDate);
                setCashEndDate(activeCashMonthRange.endDate);
                setCashTypeFilter('all');
                setCashCategoryFilter('all');
                setCashPaymentFilter('all');
                setCashAccountFilter('');
              }}
              rows={visibleCashRows}
              rowOffset={cashPageStart}
              page={cashPage}
              pageCount={cashPageCount}
              totalRows={cashRows.length}
              onPageChange={setCashPage}
              totals={{
                cashIn: currency(cashTotals.cashIn),
                cashOut: currency(cashTotals.cashOut),
                usdIn: currency(cashTotals.usdIn, 'USD'),
                usdOut: currency(cashTotals.usdOut, 'USD')
              }}
              cashInForm={cashInForm}
              setCashInForm={setCashInForm}
              cashOutForm={cashOutForm}
              accounts={accounts}
              employees={employees}
              selectedEmployee={selectedCashOutEmployee}
              selectedEmployeeSalary={selectedEmployeeSalary}
              onCashInAccountChange={(value) => onTransactionAccountChange('cash_in', value)}
              onCashOutAccountChange={(value) => onTransactionAccountChange('cash_out', value)}
              onCashInAccountSelect={(item) => onTransactionAccountSelect('cash_in', item)}
              onCashOutAccountSelect={(item) => onTransactionAccountSelect('cash_out', item)}
              onQuickAddEmployee={onCreateEmployee}
              setCashOutForm={setCashOutForm}
              cashInMessage={cashInMessage}
              cashOutMessage={cashOutMessage}
              savingType={transactionSavingType}
              onCashInSubmit={onCashInSubmit}
              onCashOutSubmit={onCashOutSubmit}
              onClearCashIn={() => setCashInForm(emptyCashForm('cash_in'))}
              onClearCashOut={() => setCashOutForm(emptyCashForm('cash_out'))}
              onEditTransaction={onEditTransaction}
              onDeleteTransaction={(id) => setConfirm({
                title: 'Delete transaction',
                message: 'This transaction will be permanently deleted.',
                onConfirm: async () => {
                  try {
                    await api.deleteTransaction(id);
                    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
                    setSummary(await api.getSummary());
                    setConfirm(null);
                    showToast('Transaction deleted.', 'success');
                  } catch (error) {
                    showToast(error.message, 'error');
                  }
                }
              })}
              onReceipt={setReceipt}
              onToggleFullscreen={toggleTableFullscreen}
              fullscreen={tableFullscreen}
              tableRef={tableRef}
              dateDisplayFormat={dateDisplayFormat}
              onPrint={onPrint}
              onExport={onExportCashBook}
              onExportJson={onExportCashBookJson}
              activeTransactionType={activeTransactionType}
              setActiveTransactionType={setActiveTransactionType}
            />
          )}
          {activeView === 'ledger' && (
            <AccountLedger
              accounts={accounts.filter((account) => !ledgerSearch || account.name.toLowerCase().includes(ledgerSearch.toLowerCase())).map((account) => ({
                ...account,
                balance: ledger && selectedAccount?.id === account.id ? ledger.final_balance_afn : account.opening_balance_afn
              }))}
              accountName={accountName}
              setAccountName={setAccountName}
              openingBalance={openingBalance}
              setOpeningBalance={setOpeningBalance}
              search={ledgerSearch}
              setSearch={setLedgerSearch}
              onCreateAccount={onCreateAccount}
              selectedAccountName={selectedAccount?.name}
              onSelectAccount={onSelectAccount}
              ledgerTitle={selectedAccount ? `${selectedAccount.name} Ledger` : 'Selected Ledger'}
              ledgerSummary={ledgerSummary}
              rows={ledgerRows}
              dateDisplayFormat={dateDisplayFormat}
              onReceipt={(tx) => setReceipt(tx)}
              onPrint={onPrint}
              onExport={onExportLedger}
            />
          )}
          {activeView === 'accounts' && (
            <Accounts
              accounts={accounts}
              form={accountForm}
              setForm={setAccountForm}
              onSave={onSaveAccount}
              onEdit={setAccountForm}
              onDelete={onDeleteAccount}
              search={accountSearch}
              setSearch={setAccountSearch}
            />
          )}
          {activeView === 'salary' && (
            <EmployeesSalary
              employees={employees}
              transactions={transactions}
              onCreateEmployee={onCreateEmployee}
              onOpenCashBook={() => setActiveView('cashbook')}
              onSalaryPaymentSaved={onSalaryPaymentSaved}
              companyName={companyName}
              companyLogo={companyLogo}
              currentUser={currentUser}
              onEmployeeSalaryChanged={onEmployeeSalaryChanged}
              onEmployeeAvatarChanged={onEmployeeAvatarChanged}
              onEmployeeDeleted={onEmployeeDeleted}
            />
          )}
          {activeView === 'reports' && (
            <Reports
              mode={reportMode}
              setMode={(mode) => {
                setReportMode(mode);
                setReportData(null);
              }}
              startDate={reportStartDate}
              setStartDate={setReportStartDate}
              endDate={reportEndDate}
              setEndDate={setReportEndDate}
              dateDisplayFormat={dateDisplayFormat}
              onRun={runReport}
              data={reportData}
              onPrint={onPrint}
              onExport={() => {
                const blob = new Blob([JSON.stringify(reportData || {}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${reportMode}-report.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            />
          )}
          {activeView === 'converter' && (
            <CurrencyConverter
              direction={converterDirection}
              setDirection={setConverterDirection}
              amount={converterAmount}
              setAmount={setConverterAmount}
              rate={converterRate}
              setRate={setConverterRate}
              result={converterResult}
              onSaveRate={async () => {
                setExchangeRate(converterRate);
                await onSaveSettings();
                showToast('Default exchange rate saved.', 'success');
              }}
            />
          )}
          {activeView === 'settings' && (
            <Settings
              companyName={companyName}
              setCompanyName={setCompanyName}
              companyPhone={companyPhone}
              setCompanyPhone={setCompanyPhone}
              companyEmail={companyEmail}
              setCompanyEmail={setCompanyEmail}
              companyWebsite={companyWebsite}
              setCompanyWebsite={setCompanyWebsite}
              companyTaxNumber={companyTaxNumber}
              setCompanyTaxNumber={setCompanyTaxNumber}
              companyLogo={companyLogo}
              setCompanyLogo={setCompanyLogo}
              companyAddress={companyAddress}
              setCompanyAddress={setCompanyAddress}
              companyLicense={companyLicense}
              setCompanyLicense={setCompanyLicense}
              currencyCode={currencyCode}
              setCurrencyCode={setCurrencyCode}
              exchangeRate={exchangeRate}
              setExchangeRate={setExchangeRate}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
              dateDisplayFormat={dateDisplayFormat}
              setDateDisplayFormat={setDateDisplayFormat}
              printFooterText={printFooterText}
              setPrintFooterText={setPrintFooterText}
              autoLogoutMinutes={autoLogoutMinutes}
              setAutoLogoutMinutes={setAutoLogoutMinutes}
              printHeader={printHeader}
              setPrintHeader={setPrintHeader}
              onSave={onSaveSettings}
              onPrintPreview={onPrint}
              onBackup={onBackup}
              onImportClick={onImportClick}
              onImportFile={onImportFile}
              onClear={onClearAll}
              fileRef={fileRef}
              status={settingsStatus}
              setSettingsStatus={setSettingsStatus}
              lastBackup={lastBackupAt || 'Never'}
              currentUser={currentUser}
              users={managedUsers}
              onReloadUsers={reloadManagedUsers}
              onCreateUser={async (payload) => {
                await api.createUser(payload);
                await reloadManagedUsers();
                showToast('User added successfully', 'success');
              }}
              onUpdateUser={async (id, payload) => {
                await api.updateUser(id, payload);
                await reloadManagedUsers();
                showToast('User updated successfully', 'success');
              }}
              onResetUserPassword={async (id, payload) => {
                const result = await api.resetUserPassword(id, payload);
                showToast('Password reset.', 'success');
                return result;
              }}
              onDeleteUser={(user) => setConfirm({
                title: 'Delete user account',
                message: 'Are you sure you want to delete this account?',
                onConfirm: async () => {
                  await api.deleteUser(user.id);
                  setConfirm(null);
                  await reloadManagedUsers();
                  showToast('User deleted.', 'success');
                }
              })}
              diagnostics={diagnostics}
              onRefreshDiagnostics={refreshDiagnostics}
            />
          )}
          {activeView === 'backup' && (
            <BackupRestore
              onBackup={onBackup}
              onImportClick={onImportClick}
              onImportFile={onImportFile}
              onCsvImportClick={onCsvImportClick}
              onCsvImportFile={onCsvImportFile}
              onDownloadCsvTemplate={onDownloadCsvTemplate}
              onClear={onClearAll}
              fileRef={fileRef}
              csvFileRef={csvFileRef}
              status={settingsStatus}
              lastBackup={lastBackupAt || 'Never'}
            />
          )}
        </div>
        </Suspense>
      </main>
      <ReceiptModal transaction={receipt} companyName={companyName} dateDisplayFormat={dateDisplayFormat} onClose={() => setReceipt(null)} onPrint={printReceipt} />
      {printPreviewOpen && <Suspense fallback={<div className="loading-strip">Loading print studio...</div>}><GlassPrintPreview
        open={printPreviewOpen}
        onClose={() => {
          setPrintPreviewOpen(false);
          setPrintStatus('idle');
          setPrintError('');
        }}
        report={printReport}
        onPrint={printPreparedDocument}
        status={printStatus}
        error={printError}
        onRetry={onPrint}
        documentRef={printDocumentRef}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onDownloadData={onExportPreviewData}
        onSettings={() => {
          setPrintPreviewOpen(false);
          setActiveView('settings');
        }}
        onLogout={onLogout}
      /></Suspense>}
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} onCancel={() => setConfirm(null)} onConfirm={confirm?.onConfirm} />
      <ToastNotification toast={toast} />
    </div>
  );
}

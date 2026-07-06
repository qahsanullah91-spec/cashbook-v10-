import { Banknote, Building2, Camera, CircleDollarSign, Clock3, Download, FileSpreadsheet, Printer, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { currency, csvCell, dateLabel } from '../utils/format';
import { employeeSalarySnapshot } from '../utils/payroll';

const tabs = ['Overview', 'Employees', 'Salary Payments', 'Reports'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthName(monthNum) {
  const index = Number(monthNum) - 1;
  return monthNames.at(index) || '';
}
const emptyEmployee = {
  full_name: '',
  father_name: '',
  phone: '',
  position: '',
  department: '',
  joining_date: new Date().toISOString().slice(0, 10),
  monthly_salary: '',
  currency: 'AFN',
  status: 'active',
  notes: ''
};

function currentMonthYear() {
  const date = new Date();
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function EmployeesSalary({
  employees = [],
  transactions = [],
  onCreateEmployee,
  onUpdateEmployee,
  onOpenCashBook,
  onSalaryPaymentSaved,
  onEmployeeSalaryChanged,
  onEmployeeAvatarChanged,
  onEmployeeDeleted,
  currentUser,
  companyName = 'BAWAR STAR PLASTIC INDUSTRY',
  companyLogo = ''
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ search: '', department: '', status: '', ...currentMonthYear() });
  const [payingRow, setPayingRow] = useState(null);
  const [editingSalaryRow, setEditingSalaryRow] = useState(null);
  const [salaryChanges, setSalaryChanges] = useState([]);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState(null);

  const salaryTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.category === 'salary' && transaction.transaction_type === 'cash_out'),
    [transactions]
  );
  const monthlySalaryPaid = report?.summary?.total_paid_this_month ?? salaryTransactions
    .filter((transaction) => String(transaction.salary_month || transaction.date || '').startsWith(`${filters.year}-${String(filters.month).padStart(2, '0')}`))
    .reduce((total, transaction) => total + Number(transaction.cash_out_afn || 0), 0);
  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(), [employees]);
  const pending = report?.summary?.total_remaining_salary ?? employees.reduce((total, employee) => total + Math.max(employeeSalarySnapshot(employee, transactions)?.remaining_salary || 0, 0), 0);

  useEffect(() => {
    loadSalaryReport(filters.month, filters.year);
  }, [filters.month, filters.year, employees.length]);

  useEffect(() => {
    api.getSalaryChangeReport().then(setSalaryChanges).catch(() => setSalaryChanges([]));
  }, [employees.length]);

  async function loadSalaryReport(month = filters.month, year = filters.year) {
    setReportLoading(true);
    setReportError('');
    try {
      const data = await api.getSalaryReport(month, year);
      setReport(data);
    } catch (error) {
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  }

  function showLocalToast(message) {
    setToast(message);
    window.clearTimeout(showLocalToast.timer);
    showLocalToast.timer = window.setTimeout(() => setToast(''), 2600);
  }

  function handleEditEmployee(employeeOrRow) {
    const employee = employeeOrRow.id
      ? employeeOrRow
      : employees.find((emp) => Number(emp.id) === Number(employeeOrRow.employee_id));
    if (!employee) return;

    setEmployeeForm({
      full_name: employee.full_name || '',
      father_name: employee.father_name || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || '',
      joining_date: employee.joining_date || new Date().toISOString().slice(0, 10),
      monthly_salary: String(employee.monthly_salary || ''),
      currency: employee.currency || 'AFN',
      status: employee.status || 'active',
      notes: employee.notes || ''
    });
    setEditingEmployeeId(employee.id);
    setActiveTab('Employees');
  }

  async function submitEmployee(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...employeeForm, monthly_salary: Number(employeeForm.monthly_salary || 0) };
      if (editingEmployeeId) {
        await onUpdateEmployee(editingEmployeeId, payload);
        setEditingEmployeeId(null);
      } else {
        await onCreateEmployee(payload);
      }
      setEmployeeForm(emptyEmployee);
      await loadSalaryReport();
    } finally {
      setSaving(false);
    }
  }

  async function saveSalaryPayment(payload) {
    const payment = await api.createSalaryPayment(payload);
    await loadSalaryReport(payload.month, payload.year);
    if (onSalaryPaymentSaved) await onSalaryPaymentSaved(payment);
    showLocalToast('Salary payment saved and Cashbook updated.');
    setPayingRow(null);
  }

  async function saveSalaryChange(employeeId, payload) {
    await api.changeEmployeeSalary(employeeId, payload);
    if (onEmployeeSalaryChanged) await onEmployeeSalaryChanged();
    const [nextReport, nextChanges] = await Promise.all([
      api.getSalaryReport(filters.month, filters.year),
      api.getSalaryChangeReport()
    ]);
    setReport(nextReport);
    setSalaryChanges(nextChanges);
    setEditingSalaryRow(null);
    showLocalToast('Employee salary updated. Old salary records remain unchanged.');
  }

  async function deleteEmployee(record) {
    const employeeId = Number(record.employee_id || record.id);
    const employeeName = record.employee_name || record.full_name || 'this employee';
    const employeeCode = record.employee_code ? ` (${record.employee_code})` : '';
    if (!employeeId) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${employeeName}?`);
    if (!confirmed) return;
    setDeletingEmployeeId(employeeId);
    setReportError('');
    try {
      await api.deleteEmployee(employeeId);
      if (onEmployeeDeleted) await onEmployeeDeleted();
      await loadSalaryReport(filters.month, filters.year);
      showLocalToast(`${employeeName}${employeeCode} deleted successfully.`);
    } catch (error) {
      const message = error.message || 'Failed to delete employee.';
      setReportError(message);
      showLocalToast(message);
    } finally {
      setDeletingEmployeeId(null);
    }
  }

  async function updateEmployeeAvatar(employee, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showLocalToast('Please select a valid image file.');
      return;
    }
    setUploadingAvatarId(Number(employee.id));
    try {
      let avatarUrl = '';
      try {
        const uploadRes = await api.uploadMedia(file);
        if (uploadRes && uploadRes.url) {
          avatarUrl = uploadRes.url;
        } else {
          throw new Error('Upload returned empty response.');
        }
      } catch (uploadError) {
        console.warn('Google Drive upload failed, using local fallback:', uploadError);
        if (file.size > 900 * 1024) {
          throw new Error('Employee picture must be smaller than 900 KB for local database fallback.');
        }
        avatarUrl = await imageFileToDataUrl(file);
      }

      const updated = await api.updateEmployee(employee.id, { avatar_url: avatarUrl });
      if (onEmployeeAvatarChanged) await onEmployeeAvatarChanged(updated);
      showLocalToast('Employee picture updated.');
    } catch (error) {
      showLocalToast(error.message || 'Failed to update employee picture.');
    } finally {
      setUploadingAvatarId(null);
    }
  }

  const rows = useMemo(() => {
    const source = report?.rows || [];
    const search = filters.search.trim().toLowerCase();
    return source.filter((row) => {
      const matchesSearch = !search || [row.employee_name, row.employee_code, row.department, row.position].some((value) => String(value || '').toLowerCase().includes(search));
      const matchesDepartment = !filters.department || row.department === filters.department;
      const matchesStatus = !filters.status || row.payment_status === filters.status;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [report, filters.search, filters.department, filters.status]);

  const summary = report?.summary || {
    total_employees: employees.length,
    total_monthly_salary: employees.reduce((total, employee) => total + Number(employee.monthly_salary || 0), 0),
    total_payable_salary: report?.summary?.total_payable_salary ?? employees.reduce((total, employee) => total + Number(employeeSalarySnapshot(employee, transactions)?.total_payable_salary || employee.monthly_salary || 0), 0),
    total_paid_this_month: monthlySalaryPaid,
    total_remaining_salary: pending,
    fully_paid_employees: 0,
    unpaid_employees: employees.length,
    partial_paid_employees: 0
  };

  function printReport() {
    const html = salaryReportHtml({ rows, summary, filters, companyName, companyLogo });
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    // Print is triggered by the script inside the HTML after the logo loads
  }

  function exportExcel() {
    const header = ['S.No', 'Employee ID', 'Employee Name', 'Department / Position', 'Base Monthly Salary', 'Previous Carry Forward', 'Total Payable Salary', 'Paid Salary', 'Closing Carry Forward', 'Payment Status', 'Last Payment Date'];
    const body = rows.map((row, index) => [
      index + 1,
      row.employee_code,
      row.employee_name,
      `${row.department || '-'} / ${row.position || '-'}`,
      row.monthly_salary,
      row.previous_carry_forward_balance || 0,
      row.total_payable_salary ?? row.monthly_salary,
      row.paid_salary,
      row.remaining_salary,
      row.payment_status,
      row.last_payment_date || ''
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-salary-report-${filters.year}-${String(filters.month).padStart(2, '0')}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="salary-workspace">
      {toast && <div className="success-banner">{toast}</div>}
      <header className="section-header glass-card salary-workspace-header">
        <div>
          <p className="eyebrow">Employees & Salary</p>
          <h3>Employee Payroll Management</h3>
          <p>Add employees, pay monthly salaries, create Cash Out entries automatically, and print salary reports.</p>
        </div>
        <div className="section-actions">
          <button className="ghost-btn" type="button" onClick={() => setActiveTab('Employees')}>Add Employee</button>
          <button className="primary-btn" type="button" onClick={() => setActiveTab('Reports')}>Employees Salary Report</button>
        </div>
      </header>

      <nav className="salary-tabs glass-card" aria-label="Employees and salary sections">
        {tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab === 'Reports' ? 'Employees Salary Report' : tab}</button>)}
      </nav>

      {activeTab === 'Overview' && (
        <>
          <div className="salary-stat-grid">
            <SalaryStat icon={UsersRound} label="Employees" value={employees.length} tone="blue" />
            <SalaryStat icon={Building2} label="Departments" value={departments.length} tone="violet" />
            <SalaryStat icon={Banknote} label="Paid This Month" value={currency(monthlySalaryPaid)} tone="green" />
            <SalaryStat icon={Clock3} label="Remaining Salary" value={currency(pending)} tone="amber" />
          </div>
          <div className="salary-overview-grid">
            <article className="glass-card salary-panel">
              <div className="salary-panel-heading"><div><p className="eyebrow">Current Payroll</p><h3>Salary Activity</h3></div><CircleDollarSign size={24} /></div>
              <div className="salary-activity-summary"><span>Salary payments recorded</span><strong>{report?.payments?.length ?? salaryTransactions.length}</strong></div>
              <div className="salary-progress"><span style={{ width: summary.total_monthly_salary ? `${Math.min((summary.total_paid_this_month / summary.total_monthly_salary) * 100, 100)}%` : '0%' }} /></div>
              <p className="salary-muted">Salary payments now create linked Cashbook Cash Out entries and update monthly balances immediately.</p>
            </article>
            <EmployeeList employees={employees} transactions={transactions} reportRows={report?.rows} onPay={(row) => { setActiveTab('Reports'); setPayingRow(row); }} onEditEmployee={currentUser?.role === 'Administrator' ? handleEditEmployee : null} onEditSalary={currentUser?.role === 'Administrator' ? setEditingSalaryRow : null} onDeleteEmployee={currentUser?.role === 'Administrator' ? deleteEmployee : null} onChangeAvatar={currentUser?.role === 'Administrator' ? updateEmployeeAvatar : null} deletingEmployeeId={deletingEmployeeId} uploadingAvatarId={uploadingAvatarId} />
          </div>
        </>
      )}

      {activeTab === 'Employees' && (
        <div className="salary-management-grid">
          <article className="glass-card salary-panel">
            <div className="salary-panel-heading"><div><p className="eyebrow">Employee Management</p><h3>{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</h3></div></div>
            <form id="employeeForm" className="entry-form" onSubmit={submitEmployee}>
              <input name="fullName" value={employeeForm.full_name} onChange={(event) => setEmployeeForm({ ...employeeForm, full_name: event.target.value })} placeholder="Full Name" required />
              <input name="fatherName" value={employeeForm.father_name} onChange={(event) => setEmployeeForm({ ...employeeForm, father_name: event.target.value })} placeholder="Father Name" />
              <input name="phoneNumber" value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} placeholder="Phone Number" />
              <input name="position" value={employeeForm.position} onChange={(event) => setEmployeeForm({ ...employeeForm, position: event.target.value })} placeholder="Position / Job Title" required />
              <input name="department" value={employeeForm.department} onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })} placeholder="Department" />
              <label className="salary-month-field"><span>Joining Date</span><input name="joiningDate" type="date" value={employeeForm.joining_date} onChange={(event) => setEmployeeForm({ ...employeeForm, joining_date: event.target.value })} required /></label>
              <input name="monthlySalary" type="number" min="0" step="0.01" value={employeeForm.monthly_salary} onChange={(event) => setEmployeeForm({ ...employeeForm, monthly_salary: event.target.value })} placeholder="Monthly Salary" required />
              <select name="currency" value={employeeForm.currency} onChange={(event) => setEmployeeForm({ ...employeeForm, currency: event.target.value })}><option value="AFN">AFN</option><option value="USD">USD</option></select>
              <textarea name="notes" value={employeeForm.notes} onChange={(event) => setEmployeeForm({ ...employeeForm, notes: event.target.value })} placeholder="Notes" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingEmployeeId ? 'Update Employee' : 'Save Employee')}</button>
                {editingEmployeeId && (
                  <button className="ghost-btn" type="button" onClick={() => { setEmployeeForm(emptyEmployee); setEditingEmployeeId(null); }}>Cancel</button>
                )}
              </div>
            </form>
          </article>
          <EmployeeList employees={employees} transactions={transactions} reportRows={report?.rows} expanded onPay={(row) => { setActiveTab('Reports'); setPayingRow(row); }} onEditEmployee={currentUser?.role === 'Administrator' ? handleEditEmployee : null} onEditSalary={currentUser?.role === 'Administrator' ? setEditingSalaryRow : null} onDeleteEmployee={currentUser?.role === 'Administrator' ? deleteEmployee : null} onChangeAvatar={currentUser?.role === 'Administrator' ? updateEmployeeAvatar : null} deletingEmployeeId={deletingEmployeeId} uploadingAvatarId={uploadingAvatarId} />
        </div>
      )}

      {activeTab === 'Salary Payments' && (
        <article className="glass-card salary-panel">
          <div className="salary-panel-heading"><div><p className="eyebrow">Payment History</p><h3>Salary Cash Out Records</h3></div><button className="primary-btn" type="button" onClick={() => setActiveTab('Reports')}>Pay Salary</button></div>
          {salaryTransactions.length ? <div className="salary-payment-list">{salaryTransactions.slice().reverse().map((transaction) => <div className="salary-payment-row" key={transaction.id}><div><strong>{transaction.account_name}</strong><span>{transaction.detail}</span></div><div><strong>{currency(transaction.cash_out_afn)}</strong><span>{transaction.date}</span></div></div>)}</div> : <EmptyState title="No salary payments yet" body="Open the Employees Salary Report and use Pay Salary for the first payment." action="Open Report" onAction={() => setActiveTab('Reports')} />}
        </article>
      )}

      {activeTab === 'Reports' && (
        <EmployeesSalaryReport
          rows={rows}
          summary={summary}
          filters={filters}
          setFilters={setFilters}
          departments={departments}
          loading={reportLoading}
          error={reportError}
          onRefresh={() => loadSalaryReport()}
          onPay={setPayingRow}
          onPrint={printReport}
          onPdf={printReport}
          onExcel={exportExcel}
          onEditSalary={currentUser?.role === 'Administrator' ? setEditingSalaryRow : null}
          onEditEmployee={currentUser?.role === 'Administrator' ? handleEditEmployee : null}
          onDeleteEmployee={currentUser?.role === 'Administrator' ? deleteEmployee : null}
          deletingEmployeeId={deletingEmployeeId}
          salaryChanges={salaryChanges}
          companyName={companyName}
          companyLogo={companyLogo}
        />
      )}

      {payingRow && (
        <SalaryPaymentModal
          row={payingRow}
          month={filters.month}
          year={filters.year}
          onClose={() => setPayingRow(null)}
          onSave={saveSalaryPayment}
        />
      )}
      {editingSalaryRow && (
        <EditEmployeeSalaryModal
          row={editingSalaryRow}
          currentUser={currentUser}
          onClose={() => setEditingSalaryRow(null)}
          onSave={saveSalaryChange}
        />
      )}
    </section>
  );
}

function EmployeesSalaryReport({ rows, summary, filters, setFilters, departments, loading, error, onRefresh, onPay, onPrint, onPdf, onExcel, onEditSalary, onEditEmployee, onDeleteEmployee, deletingEmployeeId, salaryChanges, companyName, companyLogo }) {
  const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - 3 + index);
  return (
    <article className="glass-card salary-panel salary-report-workspace">
      <div className="salary-panel-heading">
        <div><p className="eyebrow">Monthly Payroll</p><h3>Employees Salary Report</h3></div>
        <div className="salary-report-actions">
          <button className="ghost-btn" type="button" onClick={onPrint}><Printer size={18} /> Print Report</button>
          <button className="ghost-btn" type="button" onClick={onPdf}><Download size={18} /> Download PDF</button>
          <button className="ghost-btn" type="button" onClick={onExcel}><FileSpreadsheet size={18} /> Export Excel</button>
        </div>
      </div>
      <div className="salary-report-summary-grid">
        <SalaryMiniStat label="Total Employees" value={summary.total_employees} />
        <SalaryMiniStat label="Total Payable Salary" value={currency(summary.total_payable_salary ?? summary.total_monthly_salary)} />
        <SalaryMiniStat label="Total Paid This Month" value={currency(summary.total_paid_this_month)} tone="green" />
        <SalaryMiniStat label="Total Remaining Salary" value={currency(summary.total_remaining_salary)} tone="amber" />
        <SalaryMiniStat label="Fully Paid Employees" value={summary.fully_paid_employees} tone="green" />
        <SalaryMiniStat label="Unpaid Employees" value={summary.unpaid_employees} tone="amber" />
      </div>
      <div className="salary-report-filters">
        <label><Search size={16} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search employee name" /></label>
        <select value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}><option value="">All Departments</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All Status</option><option>Paid</option><option>Partial Paid</option><option>Unpaid</option><option>Advance</option></select>
        <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: Number(event.target.value) })}>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
        <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: Number(event.target.value) })}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>
        <button className="ghost-btn" type="button" onClick={onRefresh}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="salary-report-table-wrap">
        <table className="salary-report-table">
          <thead><tr><th>S.No</th><th>Employee ID</th><th>Employee Name</th><th>Department / Position</th><th>Total Payable</th><th>Paid Salary</th><th>Carry Forward</th><th>Payment Status</th><th>Last Payment Date</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.employee_id}>
                <td>{index + 1}</td>
                <td>{row.employee_code}</td>
                <td><strong>{row.employee_name}</strong></td>
                <td>{row.department || '-'} / {row.position || '-'}</td>
                <td>{currency(row.total_payable_salary ?? row.monthly_salary)}</td>
                <td className="salary-paid">{currency(row.paid_salary)}</td>
                <td className="salary-remaining">{currency(row.remaining_salary)}</td>
                <td><span className={`salary-status-badge ${row.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{row.payment_status}</span></td>
                <td>{row.last_payment_date ? dateLabel(row.last_payment_date) : '-'}</td>
                <td><div className="salary-row-actions"><button className="primary-btn salary-action-btn" type="button" onClick={() => onPay(row)}>Pay Salary</button>{onEditEmployee && <button className="ghost-btn salary-action-btn" type="button" onClick={() => onEditEmployee(row)}>Edit</button>}{onEditSalary && <button className="ghost-btn salary-action-btn" type="button" onClick={() => onEditSalary(row)}>Edit Salary</button>}{onDeleteEmployee && <button className="ghost-btn salary-action-btn salary-delete-btn" type="button" disabled={deletingEmployeeId === Number(row.employee_id)} onClick={() => onDeleteEmployee(row)}><Trash2 size={15} /> {deletingEmployeeId === Number(row.employee_id) ? 'Deleting...' : 'Delete'}</button>}</div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="10"><EmptyState title="No salary report rows" body="Try changing the search, department, status, month, or year filter." action="Refresh" onAction={onRefresh} /></td></tr>}
          </tbody>
        </table>
      </div>
      <SalaryChangeHistoryReport changes={salaryChanges} companyName={companyName} companyLogo={companyLogo} />
    </article>
  );
}

function salaryPaymentInputValue(value) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function SalaryPaymentModal({ row, month, year, onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentCarryForward = Number(row.remaining_salary || 0);
  const payableLimit = Math.max(0, currentCarryForward);
  const amount = Number(form.amount || 0);

  function updateAmount(rawValue) {
    setError('');
    if (rawValue === '') {
      setForm({ ...form, amount: '' });
      return;
    }

    const nextAmount = Number(rawValue);
    if (!Number.isFinite(nextAmount)) return;
    if (nextAmount < 0) {
      setForm({ ...form, amount: '0' });
      return;
    }

    if (nextAmount > payableLimit) {
      setForm({ ...form, amount: salaryPaymentInputValue(payableLimit) });
      setError('Amount cannot be more than remaining salary.');
      return;
    }

    setForm({ ...form, amount: rawValue });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!amount) return setError('Amount cannot be empty.');
    if (amount <= 0) return setError('Amount must be greater than 0.');
    if (payableLimit <= 0) return setError('No remaining salary is available to pay.');
    if (amount > payableLimit) return setError('Amount cannot be more than remaining salary.');
    setSaving(true);
    try {
      await onSave({
        employee_id: row.employee_id,
        month,
        year,
        amount,
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        notes: form.notes
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  const closingCarryForward = Number((currentCarryForward - amount).toFixed(2));

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="glass-card salary-pay-modal" onSubmit={submit}>
        <div className="salary-panel-heading"><div><p className="eyebrow">Salary Payment</p><h3>Pay Salary</h3></div><button className="ghost-btn" type="button" onClick={onClose}>Close</button></div>
        <div className="salary-pay-grid">
          <ReadOnlyMetric label="Employee name" value={row.employee_name} />
          <ReadOnlyMetric label="Base monthly salary" value={currency(row.monthly_salary)} />
          <ReadOnlyMetric label="Previous carry forward" value={currency(row.previous_carry_forward_balance || 0)} tone={Number(row.previous_carry_forward_balance || 0) < 0 ? 'amber' : 'green'} />
          <ReadOnlyMetric label="Total payable salary" value={currency(row.total_payable_salary ?? row.monthly_salary)} />
          <ReadOnlyMetric label="Already paid amount" value={currency(row.paid_salary)} tone="green" />
          <ReadOnlyMetric label="Current carry forward" value={currency(currentCarryForward)} tone={currentCarryForward < 0 ? 'amber' : 'green'} />
          <ReadOnlyMetric label="After this payment" value={currency(closingCarryForward)} tone={closingCarryForward < 0 ? 'amber' : 'green'} />
        </div>
        <label>Amount to pay now<input type="number" min="0" max={payableLimit} step="0.01" value={form.amount} onChange={(event) => updateAmount(event.target.value)} placeholder="0.00" autoFocus /></label>
        <label>Payment date<input type="date" value={form.payment_date} onChange={(event) => setForm({ ...form, payment_date: event.target.value })} required /></label>
        <label>Payment method<select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option><option value="hawala">Hawala</option><option value="other">Other</option></select></label>
        <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={`Salary payment for ${getMonthName(month)} ${year}`} /></label>
        {amount > 0 && closingCarryForward > 0 && <div className="salary-overpayment-warning"><Clock3 size={18} /><span>{currency(closingCarryForward)} will remain as arrears for next month.</span></div>}
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-btn" type="submit" disabled={saving || payableLimit <= 0}>{saving ? 'Saving...' : 'Save Salary Payment'}</button>
      </form>
    </div>
  );
}

function EditEmployeeSalaryModal({ row, currentUser, onClose, onSave }) {
  const [form, setForm] = useState({
    new_salary: '',
    new_currency: row.currency || 'AFN',
    effective_date: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: ''
  });
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEmployeeSalaryHistory(row.employee_id).then(setHistory).catch(() => setHistory([]));
  }, [row.employee_id]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.new_salary === '') return setError('New salary cannot be empty.');
    if (Number(form.new_salary) < 0) return setError('Salary cannot be negative.');
    if (!form.effective_date) return setError('Effective date is required.');
    if (!form.reason.trim()) return setError('Reason for salary change is required.');
    const confirmed = window.confirm('Are you sure you want to change this employee salary? Old records will stay unchanged. New salary will apply from selected effective date.');
    if (!confirmed) return;
    setSaving(true);
    try {
      await onSave(row.employee_id, { ...form, new_salary: Number(form.new_salary) });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="glass-card salary-pay-modal salary-edit-modal" onSubmit={submit}>
        <div className="salary-panel-heading"><div><p className="eyebrow">Administrator Control</p><h3>Edit Employee Salary</h3></div><button className="ghost-btn" type="button" onClick={onClose}>Close</button></div>
        <div className="salary-pay-grid">
          <ReadOnlyMetric label="Employee Name" value={row.employee_name} />
          <ReadOnlyMetric label="Employee ID" value={row.employee_code} />
          <ReadOnlyMetric label="Current Salary" value={currency(row.monthly_salary, row.currency)} />
          <ReadOnlyMetric label="Current Currency" value={row.currency || 'AFN'} />
        </div>
        <label>New Salary<input type="number" min="0" step="0.01" value={form.new_salary} onChange={(event) => setForm({ ...form, new_salary: event.target.value })} required /></label>
        <label>New Currency<select value={form.new_currency} onChange={(event) => setForm({ ...form, new_currency: event.target.value })}><option value="AFN">AFN</option><option value="USD">USD</option></select></label>
        <label>Effective Date<input type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} required /></label>
        <label>Reason for Salary Change<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Promotion, annual review, role change..." required /></label>
        <label>Changed By<input value={`${currentUser?.full_name || 'Administrator'} (${currentUser?.role || 'Administrator'})`} readOnly /></label>
        <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional notes" /></label>
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving Salary Change...' : 'Save Salary Change'}</button>
        <div className="salary-history-list">
          <div className="salary-panel-heading"><div><p className="eyebrow">Employee Profile</p><h3>Salary History</h3></div></div>
          {history.length ? history.map((change) => <div className="salary-history-item" key={change.id}><strong>{currency(change.old_salary, change.old_currency)} → {currency(change.new_salary, change.new_currency)}</strong><span>Effective From: {dateLabel(change.effective_date)}</span><span>Reason: {change.reason}</span><span>Changed by {change.changed_by}</span></div>) : <p className="salary-muted">No previous salary changes.</p>}
        </div>
      </form>
    </div>
  );
}

function SalaryChangeHistoryReport({ changes = [], companyName, companyLogo }) {
  function download(format) {
    const rows = changes.map((change) => ({
      employee_name: change.employee_name,
      employee_id: change.employee_code,
      old_salary: change.old_salary,
      new_salary: change.new_salary,
      currency: change.new_currency,
      effective_date: change.effective_date,
      changed_by: change.changed_by,
      reason: change.reason,
      notes: change.notes
    }));
    const content = format === 'json'
      ? JSON.stringify(rows, null, 2)
      : [['Employee Name', 'Employee ID', 'Old Salary', 'New Salary', 'Currency', 'Effective Date', 'Changed By', 'Reason', 'Notes'], ...rows.map(Object.values)].map((line) => line.map(csvCell).join(',')).join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salary-change-history.${format === 'excel' ? 'xls' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printHistory() {
    const body = changes.map((change) => `<tr><td>${change.employee_name}</td><td>${currency(change.old_salary, change.old_currency)}</td><td>${currency(change.new_salary, change.new_currency)}</td><td>${change.effective_date}</td><td>${change.changed_by}</td><td>${change.reason}</td></tr>`).join('');
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Salary Change History</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial;color:#111827}.header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:12px}.logo{max-height:48px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#eaf2ff;color:#1d4ed8}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:70px}.signatures div{border-top:1px solid #111;padding-top:8px;text-align:center}</style></head><body><div class="header"><div>${companyLogo ? `<img class="logo" src="${companyLogo}"/>` : ''}<h2>${companyName}</h2><strong>Salary Change History</strong></div><span>Generated: ${new Date().toLocaleString()}</span></div><table><thead><tr><th>Employee Name</th><th>Old Salary</th><th>New Salary</th><th>Effective Date</th><th>Changed By</th><th>Reason</th></tr></thead><tbody>${body}</tbody></table><div class="signatures"><div>Employee Signature</div><div>Accountant Signature</div><div>Manager Signature</div></div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  return <section className="salary-change-report"><div className="salary-panel-heading"><div><p className="eyebrow">Audit Report</p><h3>Salary Change History</h3></div><div className="salary-report-actions"><button className="ghost-btn" type="button" onClick={printHistory}><Printer size={17} /> Print / PDF</button><button className="ghost-btn" type="button" onClick={() => download('csv')}>CSV</button><button className="ghost-btn" type="button" onClick={() => download('json')}>JSON</button><button className="ghost-btn" type="button" onClick={() => download('excel')}>Excel</button></div></div><div className="salary-report-table-wrap"><table className="salary-report-table salary-change-table"><thead><tr><th>Employee Name</th><th>Old Salary</th><th>New Salary</th><th>Effective Date</th><th>Changed By</th><th>Reason</th></tr></thead><tbody>{changes.map((change) => <tr key={change.id}><td>{change.employee_name}</td><td>{currency(change.old_salary, change.old_currency)}</td><td>{currency(change.new_salary, change.new_currency)}</td><td>{dateLabel(change.effective_date)}</td><td>{change.changed_by}</td><td>{change.reason}</td></tr>)}{!changes.length && <tr><td colSpan="6">No salary changes recorded.</td></tr>}</tbody></table></div></section>;
}

function SalaryMiniStat({ label, value, tone = 'blue' }) {
  return <div className={`salary-mini-stat salary-mini-stat-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function ReadOnlyMetric({ label, value, tone = '' }) {
  return <div className={`salary-readonly ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function SalaryStat({ icon: Icon, label, value, tone }) {
  return <article className={`glass-card salary-stat salary-stat-${tone}`}><span><Icon size={20} /></span><p>{label}</p><strong>{value}</strong></article>;
}

function EmployeeAvatar({ employee, onChangeAvatar, uploading }) {
  const initials = String(employee.full_name || 'E').slice(0, 2).toUpperCase();
  const avatarUrl = employee.avatar_url || employee.avatarUrl || '';
  const content = avatarUrl
    ? <img src={avatarUrl} alt={`${employee.full_name} profile`} />
    : <span>{initials}</span>;

  if (!onChangeAvatar) {
    return <span className="salary-avatar">{content}</span>;
  }

  return (
    <label className={`salary-avatar salary-avatar-upload ${uploading ? 'uploading' : ''}`} title="Change employee picture">
      {content}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChangeAvatar(employee, file);
          event.target.value = '';
        }}
      />
      <span className="salary-avatar-overlay"><Camera size={14} /></span>
    </label>
  );
}

function EmployeeList({ employees, transactions, reportRows = [], expanded = false, onPay, onEditSalary, onEditEmployee, onDeleteEmployee, onChangeAvatar, deletingEmployeeId, uploadingAvatarId }) {
  const rowByEmployee = new Map((reportRows || []).map((row) => [Number(row.employee_id), row]));
  return (
    <article className={`glass-card salary-panel ${expanded ? 'salary-panel-wide' : ''}`}>
      <div className="salary-panel-heading"><div><p className="eyebrow">Employee Directory</p><h3>Salary Balances</h3></div></div>
      {employees.length ? <div className="salary-employee-list">{employees.map((employee) => {
        const fallback = employeeSalarySnapshot(employee, transactions);
        const row = rowByEmployee.get(Number(employee.id)) || {
          employee_id: employee.id,
          employee_name: employee.full_name,
          employee_code: employee.employee_code,
          department: employee.department,
          position: employee.position,
          monthly_salary: fallback.monthly_salary,
          previous_carry_forward_balance: fallback.previous_carry_forward_balance,
          total_payable_salary: fallback.total_payable_salary,
          paid_salary: fallback.paid_amount,
          remaining_salary: fallback.remaining_salary,
          carry_forward_balance: fallback.carry_forward_balance,
          payment_status: fallback.remaining_salary < 0 ? 'Advance' : fallback.remaining_salary === 0 ? 'Paid' : fallback.paid_amount > 0 ? 'Partial Paid' : 'Unpaid',
          currency: fallback.currency
        };
        return (
          <div className="salary-employee-row" key={employee.id}>
            <EmployeeAvatar employee={employee} onChangeAvatar={onChangeAvatar} uploading={uploadingAvatarId === Number(employee.id)} />
            <div>
              <strong>{employee.full_name}</strong>
              <span>{employee.position} · {employee.employee_code}</span>
              <span>Payable: {(row.total_payable_salary ?? row.monthly_salary).toLocaleString()} {row.currency} · Paid: {row.paid_salary.toLocaleString()} {row.currency}</span>
            </div>
            <div className="salary-balance">
              <span>Carry forward</span>
              <strong>{row.remaining_salary.toLocaleString()} {row.currency}</strong>
            </div>
            <div className="salary-row-actions">
              {onPay && <button className="ghost-btn salary-list-pay" type="button" onClick={() => onPay(row)}>Pay Salary</button>}
              {onEditEmployee && <button className="ghost-btn salary-list-pay" type="button" onClick={() => onEditEmployee(employee)}>Edit</button>}
              {onEditSalary && <button className="ghost-btn salary-list-pay" type="button" onClick={() => onEditSalary(row)}>Edit Salary</button>}
              {onDeleteEmployee && <button className="ghost-btn salary-list-pay salary-delete-btn" type="button" disabled={deletingEmployeeId === Number(employee.id)} onClick={() => onDeleteEmployee({ ...row, id: employee.id, full_name: employee.full_name, employee_code: employee.employee_code })}><Trash2 size={15} /> {deletingEmployeeId === Number(employee.id) ? 'Deleting...' : 'Delete'}</button>}
            </div>
          </div>
        );
      })}</div> : <EmptyState title="No employees found" body="Add an employee with a monthly salary to begin." action="Add Employee" onAction={() => {}} />}
    </article>
  );
}

function EmptyState({ title, body, action, onAction }) {
  return <div className="salary-empty-state"><UsersRound size={32} /><h3>{title}</h3><p>{body}</p><button className="primary-btn" type="button" onClick={onAction}>{action}</button></div>;
}

function salaryReportHtml({ rows, summary, filters, companyName, companyLogo }) {
  const generated = new Date().toLocaleString();
  const reportMonth = `${getMonthName(filters.month)} ${filters.year}`;
  const tableRows = rows.map((row, index) => {
    const statusClass = row.payment_status === 'Paid' ? 'status-paid' : row.payment_status === 'Partial Paid' ? 'status-partial' : row.payment_status === 'Advance' ? 'status-advance' : 'status-unpaid';
    return `
      <tr>
        <td class="index">${index + 1}</td>
        <td class="code">${row.employee_code}</td>
        <td class="name">${row.employee_name}</td>
        <td>${row.department || '-'} / ${row.position || '-'}</td>
        <td class="money">${currency(row.total_payable_salary ?? row.monthly_salary)}</td>
        <td class="money paid-money">${currency(row.paid_salary)}</td>
        <td class="money due-money">${currency(row.remaining_salary)}</td>
        <td style="text-align: center;"><span class="status-badge ${statusClass}">${row.payment_status}</span></td>
        <td style="text-align: center; color: #4b5563; font-family: monospace;">${row.last_payment_date || '-'}</td>
      </tr>
    `;
  }).join('');

  const initials = (companyName || 'SKY').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SKY';

  const logoHtml = companyLogo
    ? `<img class="logo" src="${companyLogo}" id="report-logo" />`
    : `<div class="logo logo-placeholder"><span>${initials}</span></div>`;

  return `<!doctype html><html><head><title>Employees Salary Report – ${reportMonth}</title><style>
    /* ===== BASE STYLES (screen + print) ===== */
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.5;
      background: #f3f4f6;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-container {
      max-width: 297mm;
      margin: 0 auto;
      background: #fff;
    }

    .document-frame {
      min-height: 190mm;
      padding: 8mm 10mm;
    }

    /* --- Header --- */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1d4ed8;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 6px;
    }
    .logo-placeholder {
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 10px rgba(29, 78, 216, 0.15);
      border: none !important;
    }
    .report-title h2 {
      font-size: 10px;
      margin: 0 0 2px 0;
      color: #1d4ed8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
    }
    .report-title h1 {
      font-size: 20px;
      margin: 0;
      font-weight: 800;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      line-height: 1.15;
      color: #111827;
    }
    .subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 3px;
    }
    .report-meta {
      text-align: right;
      font-size: 9px;
      color: #6b7280;
      line-height: 1.6;
      flex-shrink: 0;
    }
    .report-meta strong {
      display: block;
      color: #111827;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    /* --- Summary Metrics Grid --- */
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4b5563;
      margin: 20px 0 10px 0;
    }
    .summary-metrics {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .metric-box {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f9fafb;
    }
    .metric-box-green {
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .metric-box-green .metric-value {
      color: #059669;
    }
    .metric-box-amber {
      border-color: #fde68a;
      background: #fffbeb;
    }
    .metric-box-amber .metric-value {
      color: #d97706;
    }
    .metric-label {
      font-size: 8px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 700;
      display: block;
    }
    .metric-value {
      font-size: 14px;
      font-weight: 800;
      color: #111827;
      display: block;
    }

    /* --- Table --- */
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      page-break-inside: auto;
      margin-bottom: 28px;
      font-size: 9.5px;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #f3f4f6; }
    th, td {
      padding: 9px 6px;
      text-align: left;
      vertical-align: middle;
      word-break: normal;
    }
    th {
      background: #f1f5f9;
      border-bottom: 2px solid #1e293b;
      border-top: 1px solid #e2e8f0;
      color: #475569;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      vertical-align: bottom;
    }
    td {
      border-bottom: 1px solid #e5e7eb;
    }
    tfoot td {
      font-weight: 800;
      background: #f8fafc !important;
      border-top: 2px solid #1e293b;
      border-bottom: 2px solid #1e293b;
      font-size: 10px;
    }
    .index { width: 35px; text-align: center; color: #9ca3af; }
    .code { font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace; font-size: 9px; color: #6b7280; }
    .name { font-weight: 700; color: #111827; }
    .money {
      font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }
    .paid-money { color: #059669; }
    .due-money { color: #dc2626; }

    /* --- Status Badges --- */
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      border: 1.5px solid currentColor;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .status-paid { color: #059669; background: #ecfdf5; }
    .status-partial { color: #d97706; background: #fffbeb; }
    .status-unpaid { color: #dc2626; background: #fef2f2; }
    .status-advance { color: #7c3aed; background: #f5f3ff; }

    /* --- Signatures --- */
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 50px;
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1.5px solid #374151;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      color: #374151;
    }

    footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
      margin-top: 10mm;
      padding-top: 6px;
      font-size: 9px;
      color: #9ca3af;
    }

    /* ===== PRINT OVERRIDES ===== */
    @media print {
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      body { background: #fff !important; }
      .print-container { max-width: none; box-shadow: none; }
      .document-frame { padding: 2mm 4mm; }
      tbody tr:nth-child(even) { background: #f9fafb !important; }
    }

    /* ===== SCREEN PREVIEW ===== */
    @media screen {
      body { padding: 20px; }
      .print-container {
        box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        border-radius: 8px;
      }
    }
  </style></head><body><main class="print-container"><section class="document-frame">
    <header class="report-header">
      <div class="brand">
        ${logoHtml}
        <div class="report-title">
          <h2>Official Payroll Report</h2>
          <h1>${companyName}</h1>
          <div class="subtitle">Employees Salary Report</div>
        </div>
      </div>
      <div class="report-meta">
        <strong>Report Term: ${reportMonth}</strong>
        <div>Generated: ${generated}</div>
        <div>Currency: AFN</div>
      </div>
    </header>
    <p class="section-title">Summary Metrics</p>
    <section class="summary-metrics">
      <div class="metric-box">
        <span class="metric-label">Total Employees</span>
        <strong class="metric-value">${summary.total_employees}</strong>
      </div>
      <div class="metric-box">
        <span class="metric-label">Total Payable</span>
        <strong class="metric-value">${currency(summary.total_payable_salary ?? summary.total_monthly_salary)}</strong>
      </div>
      <div class="metric-box metric-box-green">
        <span class="metric-label">Total Paid</span>
        <strong class="metric-value">${currency(summary.total_paid_this_month)}</strong>
      </div>
      <div class="metric-box ${summary.total_remaining_salary > 0 ? 'metric-box-amber' : ''}">
        <span class="metric-label">Total Carry Forward</span>
        <strong class="metric-value">${currency(summary.total_remaining_salary)}</strong>
      </div>
      <div class="metric-box metric-box-green">
        <span class="metric-label">Fully Paid</span>
        <strong class="metric-value">${summary.fully_paid_employees}</strong>
      </div>
      <div class="metric-box ${summary.unpaid_employees > 0 ? 'metric-box-amber' : ''}">
        <span class="metric-label">Unpaid</span>
        <strong class="metric-value">${summary.unpaid_employees}</strong>
      </div>
    </section>
    <p class="section-title">Salary Record Details</p>
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">S.No</th>
          <th style="width: 75px;">Emp ID</th>
          <th style="width: 140px;">Employee Name</th>
          <th style="width: 170px;">Department / Position</th>
          <th style="width: 95px; text-align: right;">Total Payable</th>
          <th style="width: 95px; text-align: right;">Paid Salary</th>
          <th style="width: 95px; text-align: right;">Carry Forward</th>
          <th style="width: 90px; text-align: center;">Status</th>
          <th style="width: 90px; text-align: center;">Last Payment</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align: right; padding-right: 15px;">Totals</td>
          <td class="money">${currency(summary.total_payable_salary ?? summary.total_monthly_salary)}</td>
          <td class="money">${currency(summary.total_paid_this_month)}</td>
          <td class="money">${currency(summary.total_remaining_salary)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
    <section class="signatures">
      <div class="sig-line">Prepared By</div>
      <div class="sig-line">Accountant Signature</div>
      <div class="sig-line">Manager Signature</div>
    </section>
    <footer><span>Generated by Bawar Star Cash Book</span><span>${companyName}</span></footer>
  </section>
  </main>
  <script>
    // Wait for the logo image to load before printing, with a fallback timeout
    (function() {
      var logo = document.getElementById('report-logo');
      function doPrint() {
        window.focus();
        window.print();
      }
      if (logo && !logo.complete) {
        logo.onload = function() { setTimeout(doPrint, 200); };
        logo.onerror = function() {
          var initials = "${initials}";
          var placeholder = document.createElement('div');
          placeholder.className = 'logo logo-placeholder';
          placeholder.innerHTML = '<span>' + initials + '</span>';
          logo.parentNode.replaceChild(placeholder, logo);
          setTimeout(doPrint, 200);
        };
        // Fallback: print after 3s even if image hasn't loaded
        setTimeout(doPrint, 3000);
      } else {
        setTimeout(doPrint, 300);
      }
    })();
  </script>
  </body></html>`;
}


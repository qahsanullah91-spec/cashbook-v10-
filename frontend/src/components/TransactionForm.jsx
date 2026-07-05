import { AlertTriangle, Banknote, BriefcaseBusiness, UserRound } from 'lucide-react';
import { memo, useState } from 'react';
import DateField from './DateField';
import QuickAddEmployeeModal from './QuickAddEmployeeModal';
import SmartAccountAutocomplete from './SmartAccountAutocomplete';

function TransactionForm({
  title,
  type,
  form,
  setForm,
  dateDisplayFormat,
  saving = false,
  onSubmit,
  onClear,
  message,
  accounts = [],
  employees = [],
  selectedEmployee = null,
  selectedEmployeeSalary = null,
  onAccountNameChange,
  onAccountSelect,
  onQuickAddEmployee
}) {
  const [quickAddName, setQuickAddName] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const rate = Number(form.exchange_rate || 0);
  const enteredAmount = selectedEmployee?.currency === 'USD'
    ? Number(form.usd_amount || 0) || (rate ? Number(form.cash_amount || 0) / rate : 0)
    : Number(form.cash_amount || 0) || Number(form.usd_amount || 0) * rate;
  const exceedsRemaining = selectedEmployeeSalary && enteredAmount > Number(selectedEmployeeSalary.remaining_salary || 0);
  const salaryCurrency = selectedEmployeeSalary?.currency || selectedEmployee?.currency || 'AFN';
  const salaryAmount = (value) => `${Number(value || 0).toLocaleString()} ${salaryCurrency}`;

  function changePayrollKind(kind) {
    setForm((current) => ({
      ...current,
      payroll_kind: kind,
      category: 'salary',
      detail: `${kind === 'advance' ? 'Salary Advance' : 'Salary Payment'} - ${selectedEmployee?.full_name || current.account_name}`
    }));
  }

  return (
    <div className={`glass-card form-card ${type === 'cash_in' ? 'cash-in-card' : 'cash-out-card'}`}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <form className="entry-form" onSubmit={onSubmit}>
        <DateField value={form.date} onChange={(e) => update('date', e.target.value)} displayFormat={dateDisplayFormat} required />
        <SmartAccountAutocomplete
          value={form.account_name}
          employees={employees}
          accounts={accounts}
          onChange={(value) => onAccountNameChange ? onAccountNameChange(value) : update('account_name', value)}
          onSelect={onAccountSelect}
          onQuickAddEmployee={(name) => setQuickAddName(name)}
        />
        {type === 'cash_out' && form.employee_id && (
          <>
            <div className="employee-info-preview">
              <header className="employee-info-header">
                <span className="employee-info-avatar" aria-hidden="true"><UserRound size={22} /></span>
                <div className="employee-info-copy">
                  <span>Employee Information</span>
                  <strong>{selectedEmployee?.full_name || form.account_name || 'Selected Employee'}</strong>
                  <small><BriefcaseBusiness size={14} /> {selectedEmployee?.position || 'Employee'}</small>
                </div>
              </header>
              <div className="employee-info-grid">
                <div className="salary-metric-row">
                  <span>Monthly Salary</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.monthly_salary)}</strong>
                </div>
                <div className="salary-metric-row is-paid">
                  <span>Paid This Month</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.paid_amount)}</strong>
                </div>
                <div className="salary-metric-row is-remaining">
                  <span>Remaining Salary</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.remaining_salary)}</strong>
                </div>
                <div className="salary-metric-row">
                  <span>Advance Taken</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.advance_taken)}</strong>
                </div>
              </div>
            </div>
            <div className="payroll-kind-toggle" role="group" aria-label="Employee salary transaction type">
              <button type="button" className={(form.payroll_kind || 'salary') === 'salary' ? 'active' : ''} onClick={() => changePayrollKind('salary')}><Banknote size={17} /> Salary Payment</button>
              <button type="button" className={form.payroll_kind === 'advance' ? 'active' : ''} onClick={() => changePayrollKind('advance')}><Banknote size={17} /> Salary Advance</button>
            </div>
            <label className="salary-month-field">
              <span>Salary Month</span>
              <input type="month" value={String(form.salary_month || '').slice(0, 7)} onChange={(e) => update('salary_month', `${e.target.value}-01`)} required />
            </label>
            {exceedsRemaining ? <div className="salary-overpayment-warning"><AlertTriangle size={18} /><span>Payment exceeds the remaining salary by {(enteredAmount - selectedEmployeeSalary.remaining_salary).toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedEmployeeSalary.currency}.</span></div> : null}
          </>
        )}
        <input type="text" value={form.detail} onChange={(e) => update('detail', e.target.value)} placeholder="Detail" required dir="auto" />
        <input type="number" value={form.cash_amount} onChange={(e) => update('cash_amount', e.target.value)} placeholder="AFN Amount" step="0.01" min="0" />
        <input type="number" value={form.usd_amount} onChange={(e) => update('usd_amount', e.target.value)} placeholder="USD Amount" step="0.01" min="0" />
        <input type="number" value={form.exchange_rate} onChange={(e) => update('exchange_rate', e.target.value)} placeholder="Exchange Rate" step="0.01" min="0" />
        <select value={form.category} onChange={(e) => update('category', e.target.value)}>
          <option value="other">Other</option>
          <option value="salary">Salary</option>
          <option value="rent">Rent</option>
          <option value="factory_expense">Factory Expense</option>
          <option value="home_expense">Home Expense</option>
          <option value="bottles_account">Bottles Account</option>
          <option value="office_expense">Office Expense</option>
        </select>
        <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="hawala">Hawala</option>
          <option value="other">Other</option>
        </select>
        <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Note" dir="auto" />
        <button className="ghost-btn full-width" type="button" onClick={onClear} disabled={saving}>Clear</button>
        <button className={`primary-btn ${type === 'cash_out' ? 'danger' : ''} full-width`} type="submit" disabled={saving}>{saving ? 'Saving...' : type === 'cash_out' ? 'Save Cash Out' : 'Save Cash In'}</button>
        <div className="form-message" aria-live="polite">{message}</div>
      </form>
      {quickAddName && (
        <QuickAddEmployeeModal
          initialName={quickAddName}
          onClose={() => setQuickAddName('')}
          onSave={async (payload) => {
            const employee = await onQuickAddEmployee(payload);
            onAccountSelect({
              key: `employee-${employee.id}`,
              kind: 'employee',
              name: employee.full_name,
              employee,
              accountId: employee.account_id
            });
            setQuickAddName('');
          }}
        />
      )}
    </div>
  );
}

export default memo(TransactionForm);

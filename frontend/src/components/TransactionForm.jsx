import { AlertTriangle, Banknote, BriefcaseBusiness, UserRound } from 'lucide-react';
import { memo, useState } from 'react';
import DateField from './DateField';
import QuickAddEmployeeModal from './QuickAddEmployeeModal';
import SmartAccountAutocomplete from './SmartAccountAutocomplete';

const translations = {
  English: {
    'Employee Information': 'Employee Information',
    'Base Monthly Salary': 'Base Monthly Salary',
    'Previous Month Balance': 'Previous Month Balance',
    'Adjusted Available Salary': 'Adjusted Available Salary',
    'Paid This Month': 'Paid This Month',
    'Remaining Salary': 'Remaining Salary',
    'Advance Taken': 'Advance Taken',
    'Salary Month': 'Salary Month',
    'Payment exceeds the remaining salary by ': 'Payment exceeds the remaining salary by ',
    'Other': 'Other',
    'Salary': 'Salary',
    'Rent': 'Rent',
    'Factory Expense': 'Factory Expense',
    'Home Expense': 'Home Expense',
    'Bottles Account': 'Bottles Account',
    'Office Expense': 'Office Expense',
    'Cash': 'Cash',
    'Bank': 'Bank',
    'Hawala': 'Hawala',
    'Clear': 'Clear'
  },
  Pashto: {
    'Employee Information': 'د کارکوونکي معلومات',
    'Base Monthly Salary': 'اساسي میاشتنۍ معاش',
    'Previous Month Balance': 'د تېرې میاشتې پاتې شوني',
    'Adjusted Available Salary': 'برابر شوی شته معاش',
    'Paid This Month': 'پدې میاشت کې تادیه شوي',
    'Remaining Salary': 'پاتې معاش',
    'Advance Taken': 'اخیستل شوی مخکینی تادیه',
    'Salary Month': 'د معاش میاشت',
    'Payment exceeds the remaining salary by ': 'تادیه له پاتې معاش څخه زیاته ده په: ',
    'Other': 'نور',
    'Salary': 'معاش',
    'Rent': 'کرایه',
    'Factory Expense': 'د فابریکې لګښت',
    'Home Expense': 'د کور لګښت',
    'Bottles Account': 'د بوتلونو حساب',
    'Office Expense': 'د دفتر لګښت',
    'Cash': 'نغدي',
    'Bank': 'بانک',
    'Hawala': 'حواله',
    'Clear': 'پاکول'
  },
  Dari: {
    'Employee Information': 'معلومات کارمند',
    'Base Monthly Salary': 'معاش ماهانه اساسی',
    'Previous Month Balance': 'باقیمانده ماه گذشته',
    'Adjusted Available Salary': 'معاش قابل دسترس تعدیل شده',
    'Paid This Month': 'پرداخت شده در این ماه',
    'Remaining Salary': 'معاش باقیمانده',
    'Advance Taken': 'مساعده گرفته شده',
    'Salary Month': 'ماه معاش',
    'Payment exceeds the remaining salary by ': 'پرداخت بیشتر از معاش باقیمانده است به مقدار: ',
    'Other': 'دیگر',
    'Salary': 'معاش',
    'Rent': 'کرایه',
    'Factory Expense': 'مصرف فابریکه',
    'Home Expense': 'مصرف خانه',
    'Bottles Account': 'حساب بوتلها',
    'Office Expense': 'مصرف دفتر',
    'Cash': 'نقدی',
    'Bank': 'بانک',
    'Hawala': 'حواله',
    'Clear': 'پاک کردن'
  }
};

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
  onQuickAddEmployee,
  language = 'English'
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

  const t = (key) => {
    const lang = language || 'English';
    return translations[lang]?.[key] ?? translations['English']?.[key] ?? key;
  };

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
                  <span>{t('Employee Information')}</span>
                  <strong>{selectedEmployee?.full_name || form.account_name || 'Selected Employee'}</strong>
                  <small><BriefcaseBusiness size={14} /> {selectedEmployee?.position || 'Employee'}</small>
                </div>
              </header>
              <div className="employee-info-grid">
                <div className="salary-metric-row">
                  <span>{t('Base Monthly Salary')}</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.monthly_salary)}</strong>
                </div>
                <div className="salary-metric-row">
                  <span>{t('Previous Month Balance')}</span>
                  <strong style={{
                    color: (selectedEmployeeSalary?.previous_carry_forward_balance || 0) < 0 
                      ? '#ef4444' 
                      : (selectedEmployeeSalary?.previous_carry_forward_balance || 0) > 0 
                      ? '#10b981' 
                      : 'inherit'
                  }}>
                    {salaryAmount(selectedEmployeeSalary?.previous_carry_forward_balance)}
                  </strong>
                </div>
                <div className="salary-metric-row">
                  <span>{t('Adjusted Available Salary')}</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.total_payable_salary)}</strong>
                </div>
                <div className="salary-metric-row is-paid">
                  <span>{t('Paid This Month')}</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.paid_amount)}</strong>
                </div>
                <div className="salary-metric-row is-remaining">
                  <span>{t('Remaining Salary')}</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.remaining_salary)}</strong>
                </div>
                <div className="salary-metric-row">
                  <span>{t('Advance Taken')}</span>
                  <strong>{salaryAmount(selectedEmployeeSalary?.advance_taken)}</strong>
                </div>
              </div>
            </div>
            <div className="payroll-kind-toggle" role="group" aria-label="Employee salary transaction type">
              <button type="button" className={(form.payroll_kind || 'salary') === 'salary' ? 'active' : ''} onClick={() => changePayrollKind('salary')}><Banknote size={17} /> Salary Payment</button>
              <button type="button" className={form.payroll_kind === 'advance' ? 'active' : ''} onClick={() => changePayrollKind('advance')}><Banknote size={17} /> Salary Advance</button>
            </div>
            <label className="salary-month-field">
              <span>{t('Salary Month')}</span>
              <input type="month" value={String(form.salary_month || '').slice(0, 7)} onChange={(e) => update('salary_month', `${e.target.value}-01`)} required />
            </label>
            {exceedsRemaining ? <div className="salary-overpayment-warning"><AlertTriangle size={18} /><span>{t('Payment exceeds the remaining salary by ')}{(enteredAmount - selectedEmployeeSalary.remaining_salary).toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedEmployeeSalary.currency}.</span></div> : null}
          </>
        )}
        <input type="text" value={form.detail} onChange={(e) => update('detail', e.target.value)} placeholder="Detail" required dir="auto" />
        <input type="number" value={form.cash_amount} onChange={(e) => update('cash_amount', e.target.value)} placeholder="AFN Amount" step="0.01" min="0" />
        <input type="number" value={form.usd_amount} onChange={(e) => update('usd_amount', e.target.value)} placeholder="USD Amount" step="0.01" min="0" />
        <input type="number" value={form.exchange_rate} onChange={(e) => update('exchange_rate', e.target.value)} placeholder="Exchange Rate" step="0.01" min="0" />
        <select value={form.category} onChange={(e) => update('category', e.target.value)}>
          <option value="other">{t('Other')}</option>
          <option value="salary">{t('Salary')}</option>
          <option value="rent">{t('Rent')}</option>
          <option value="factory_expense">{t('Factory Expense')}</option>
          <option value="home_expense">{t('Home Expense')}</option>
          <option value="bottles_account">{t('Bottles Account')}</option>
          <option value="office_expense">{t('Office Expense')}</option>
        </select>
        <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
          <option value="cash">{t('Cash')}</option>
          <option value="bank">{t('Bank')}</option>
          <option value="hawala">{t('Hawala')}</option>
          <option value="other">{t('Other')}</option>
        </select>
        <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Note" dir="auto" />
        <button className="ghost-btn full-width" type="button" onClick={onClear} disabled={saving}>{t('Clear')}</button>
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

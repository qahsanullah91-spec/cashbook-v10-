import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import DateField from '../components/DateField';

export default function CashBook(props) {
  const { activeTransactionType, setActiveTransactionType } = props;
  const isCashIn = activeTransactionType !== 'cash_out';
  const activeFormProps = isCashIn
    ? {
      title: 'Cash In Entry',
      type: 'cash_in',
      form: props.cashInForm,
      setForm: props.setCashInForm,
      saving: props.savingType === 'cash_in',
      onSubmit: props.onCashInSubmit,
      onClear: props.onClearCashIn,
      message: props.cashInMessage,
      onAccountNameChange: props.onCashInAccountChange,
      onAccountSelect: props.onCashInAccountSelect
    }
    : {
      title: 'Cash Out Entry',
      type: 'cash_out',
      form: props.cashOutForm,
      setForm: props.setCashOutForm,
      saving: props.savingType === 'cash_out',
      onSubmit: props.onCashOutSubmit,
      onClear: props.onClearCashOut,
      message: props.cashOutMessage,
      selectedEmployee: props.selectedEmployee,
      selectedEmployeeSalary: props.selectedEmployeeSalary,
      onAccountNameChange: props.onCashOutAccountChange,
      onAccountSelect: props.onCashOutAccountSelect
    };

  return (
    <>
      <div className="section-header glass-card">
        <div>
          <p className="eyebrow">Cash Book</p>
          <h3>Transaction Entry & Records</h3>
        </div>
        <div className="section-actions">
          <button className="ghost-btn" onClick={props.onPrint}>Print Cash Book</button>
          <button className="ghost-btn" onClick={props.onExport}>Export CSV</button>
          <button className="ghost-btn" onClick={props.onExportJson}>Export JSON</button>
        </div>
      </div>
      {!activeTransactionType ? (
        <div className="open-workspace-container glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px', marginBottom: '24px' }}>
          <button
            className="primary-btn"
            style={{ padding: '12px 24px', fontSize: '0.98rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setActiveTransactionType('cash_in')}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
            <span>New Cash Book Entry</span>
          </button>
        </div>
      ) : (
        <section className={`transaction-control-center glass-card ${isCashIn ? 'is-cash-in' : 'is-cash-out'} workspace-fade-in`}>
          <header className="transaction-control-header">
            <div>
              <p className="eyebrow">Transaction Control Center</p>
              <h3>{isCashIn ? 'Cash In Entry' : 'Cash Out Entry'}</h3>
              <span>{isCashIn ? 'Record incoming AFN/USD funds with linked account details.' : 'Record outgoing funds, salary payments, and expense routing.'}</span>
            </div>
            <div className="transaction-mode-toggle" role="tablist" aria-label="Transaction type">
              <button
                type="button"
                role="tab"
                aria-selected={isCashIn}
                className={isCashIn ? 'active cash-in' : 'cash-in'}
                onClick={() => setActiveTransactionType(activeTransactionType === 'cash_in' ? null : 'cash_in')}
              >
                <ArrowDownLeft size={18} />
                <span>Cash In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isCashIn}
                className={!isCashIn ? 'active cash-out' : 'cash-out'}
                onClick={() => setActiveTransactionType(activeTransactionType === 'cash_out' ? null : 'cash_out')}
              >
                <ArrowUpRight size={18} />
                <span>Cash Out</span>
              </button>
            </div>
          </header>
          <TransactionForm
            {...activeFormProps}
            dateDisplayFormat={props.dateDisplayFormat}
            accounts={props.accounts}
            employees={props.employees}
            onQuickAddEmployee={props.onQuickAddEmployee}
            language={props.language}
          />
        </section>
      )}
      <div className="glass-card table-card">
        <div className="card-header">
          <h3>Cash Book Filters</h3>
        </div>
        <div className="filters">
          <input type="search" value={props.search} onChange={(e) => props.setSearch(e.target.value)} placeholder="Search name, detail, note" />
          <DateField value={props.startDate} onChange={(e) => props.setStartDate(e.target.value)} displayFormat={props.dateDisplayFormat} label="From date" className="filter-date-field" />
          <DateField value={props.endDate} onChange={(e) => props.setEndDate(e.target.value)} displayFormat={props.dateDisplayFormat} label="To date" className="filter-date-field" />
          <select value={props.typeFilter} onChange={(e) => props.setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="cash_in">Cash In</option>
            <option value="cash_out">Cash Out</option>
          </select>
          <select value={props.categoryFilter} onChange={(e) => props.setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="salary">Salary</option><option value="rent">Rent</option>
            <option value="factory_expense">Factory Expense</option><option value="home_expense">Home Expense</option>
            <option value="bottles_account">Bottles Account</option><option value="office_expense">Office Expense</option><option value="other">Other</option>
          </select>
          <select value={props.paymentFilter} onChange={(e) => props.setPaymentFilter(e.target.value)}>
            <option value="all">All Payment Methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="hawala">Hawala</option><option value="other">Other</option>
          </select>
          <input type="search" value={props.accountFilter} onChange={(e) => props.setAccountFilter(e.target.value)} placeholder="Filter account" />
          <button className="ghost-btn" type="button" onClick={props.onClearFilters}>Clear</button>
        </div>
      </div>
      <TransactionTable rows={props.rows} rowOffset={props.rowOffset} page={props.page} pageCount={props.pageCount} totalRows={props.totalRows} dateDisplayFormat={props.dateDisplayFormat} onPageChange={props.onPageChange} onEdit={props.onEditTransaction} onDelete={props.onDeleteTransaction} onReceipt={props.onReceipt} onToggleFullscreen={props.onToggleFullscreen} fullscreen={props.fullscreen} tableRef={props.tableRef} />
      <div className="table-summary">
        <span>Total Cash In: {props.totals.cashIn}</span>
        <span>Total Cash Out: {props.totals.cashOut}</span>
        <span>USD In: {props.totals.usdIn}</span>
        <span>USD Out: {props.totals.usdOut}</span>
      </div>
    </>
  );
}

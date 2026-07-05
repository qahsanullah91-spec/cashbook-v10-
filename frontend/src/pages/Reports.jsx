import { currency } from '../utils/format';
import DateDisplay from '../components/DateDisplay';
import DateField from '../components/DateField';

export default function Reports({ mode, setMode, startDate, setStartDate, endDate, setEndDate, dateDisplayFormat, onRun, data, onPrint, onExport }) {
  const summary = data?.summary || data || {};
  const rows = data?.transactions || [];
  return (
    <>
      <div className="section-header glass-card">
        <div><p className="eyebrow">Reports</p><h3>Daily, Monthly and Date Range Analysis</h3></div>
        <div className="section-actions"><button className="ghost-btn" onClick={onPrint}>Print Report</button><button className="ghost-btn" onClick={onExport}>Export JSON</button></div>
      </div>
      <div className="glass-card report-controls">
        <div className="filters">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="daily">Daily Report</option><option value="monthly">Monthly Report</option>
            <option value="dateRange">Date Range Report</option><option value="expenses">Expense Report</option>
          </select>
          {mode === 'dateRange' && <><DateField value={startDate} onChange={(e) => setStartDate(e.target.value)} displayFormat={dateDisplayFormat} label="From date" className="filter-date-field" /><DateField value={endDate} onChange={(e) => setEndDate(e.target.value)} displayFormat={dateDisplayFormat} label="To date" className="filter-date-field" /></>}
          <button className="primary-btn" onClick={onRun}>Run Report</button>
        </div>
      </div>
      <div className="stats-grid">
        <div className="glass-card stat-card"><p>Cash In AFN</p><h3>{currency(summary.cash_in_afn)}</h3></div>
        <div className="glass-card stat-card"><p>Cash Out AFN</p><h3>{currency(summary.cash_out_afn)}</h3></div>
        <div className="glass-card stat-card"><p>AFN Balance</p><h3>{currency(summary.afn_balance)}</h3></div>
        <div className="glass-card stat-card"><p>USD Balance</p><h3>{currency(summary.usd_balance, 'USD')}</h3></div>
      </div>
      {rows.length === 0 && <div className="glass-card"><div className="empty-state">Run a report to see transaction rows here.</div></div>}
      {rows.length > 0 && <div className="glass-card table-card"><div className="table-wrapper"><table className="accounting-table report-screen-table">
        <thead><tr><th className="col-index">SN</th><th className="col-date">Date</th><th className="col-tx">TX No</th><th className="col-account">Account</th><th className="col-detail">Detail</th><th className="col-category">Category</th><th className="col-amount">Cash In</th><th className="col-amount">Cash Out</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}><td className="col-index">{index + 1}</td><td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td><td className="col-tx" title={row.transaction_no}>{row.transaction_no || '-'}</td><td className="col-account">{row.account_name}</td><td className="col-detail">{row.detail}</td><td className="col-category">{row.category}</td><td className="money-cell col-amount">{currency(row.cash_in_afn)}</td><td className="money-cell col-amount">{currency(row.cash_out_afn)}</td></tr>)}</tbody>
      </table></div></div>}
    </>
  );
}

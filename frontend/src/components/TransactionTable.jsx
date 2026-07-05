import { memo } from 'react';
import { currency } from '../utils/format';
import DateDisplay from './DateDisplay';

function TransactionTable({ rows, rowOffset, page, pageCount, totalRows, dateDisplayFormat, onPageChange, onEdit, onDelete, onReceipt, onToggleFullscreen, fullscreen, tableRef }) {
  return (
    <div className={`glass-card table-card cashbook-records-card ${fullscreen ? 'table-card-fullscreen-active' : ''}`} ref={tableRef}>
      <div className="card-header records-table-header">
        <div className="records-table-heading">
          <p className="eyebrow">Live Ledger</p>
          <div className="records-table-title">
            <h3>Cash Book Records</h3>
            <span>{totalRows.toLocaleString('en-US')} {totalRows === 1 ? 'record' : 'records'}</span>
          </div>
        </div>
        <div className="records-table-actions">
          <span className="fullscreen-hint">{fullscreen ? 'Scroll horizontally to review every column' : 'Open a focused table workspace'}</span>
          <button className="ghost-btn fullscreen-toggle" type="button" onClick={onToggleFullscreen}>
            {fullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="accounting-table cashbook-screen-table">
          <thead>
            <tr>
              <th className="col-index">SN</th>
              <th className="col-date">Date</th>
              <th className="col-tx">TX No</th>
              <th className="col-account">Account</th>
              <th className="col-detail">Detail</th>
              <th className="col-category">Category</th>
              <th className="col-amount">Cash In AFN</th>
              <th className="col-amount">Cash Out AFN</th>
              <th className="col-amount">Balance</th>
              <th className="col-amount">USD In</th>
              <th className="col-amount">USD Out</th>
              <th className="col-rate">Rate</th>
              <th className="col-note">Note</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan="14">
                  <div className="empty-state">No cash book records match the current filters.</div>
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.id} dir="auto" className={row.isOpeningBalance ? 'opening-balance-row' : undefined}>
                <td className="col-index">{row.isOpeningBalance ? 'BF' : rowOffset + index + 1}</td>
                <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
                <td className="col-tx" title={row.transaction_no}>{row.transaction_no || '-'}</td>
                <td className="col-account">{row.account_name}</td>
                <td className="col-detail">{row.detail}</td>
                <td className="col-category">{row.isOpeningBalance ? 'opening balance' : String(row.category || 'other').replaceAll('_', ' ')}</td>
                <td className="money-cell col-amount balance-positive">{row.cash_in_afn ? currency(row.cash_in_afn) : '-'}</td>
                <td className="money-cell col-amount balance-negative">{row.cash_out_afn ? currency(row.cash_out_afn) : '-'}</td>
                <td className={`money-cell col-amount ${row.runningBalance >= 0 ? 'balance-positive' : 'balance-negative'}`}>{currency(row.runningBalance)}</td>
                <td className="money-cell col-amount">{row.usd_in ? currency(row.usd_in, 'USD') : '-'}</td>
                <td className="money-cell col-amount">{row.usd_out ? currency(row.usd_out, 'USD') : '-'}</td>
                <td className="col-rate">{row.exchange_rate}</td>
                <td className="col-note">{row.note || '-'}</td>
                <td className="col-actions">
                  {row.isOpeningBalance ? (
                    <span className="muted">Opening</span>
                  ) : (
                    <div className="row-actions">
                      <button className="ghost-btn table-action" onClick={() => onEdit(row)}>Edit</button>
                      <button className="ghost-btn table-action" onClick={() => onReceipt(row)}>Receipt</button>
                      <button className="ghost-btn table-action" onClick={() => onDelete(row.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalRows > 0 && (
        <div className="table-pagination" aria-label="Cash book pagination">
          <span>{rowOffset + 1}-{Math.min(rowOffset + rows.length, totalRows)} of {totalRows.toLocaleString('en-US')}</span>
          <div>
            <button className="ghost-btn" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
            <strong>Page {page} of {pageCount}</strong>
            <button className="ghost-btn" type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TransactionTable);

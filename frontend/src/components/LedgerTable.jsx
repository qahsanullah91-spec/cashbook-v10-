import { useEffect, useMemo, useState } from 'react';
import { currency } from '../utils/format';
import DateDisplay from './DateDisplay';

const LEDGER_PAGE_SIZE = 50;

export default function LedgerTable({ rows, dateDisplayFormat, onReceipt }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / LEDGER_PAGE_SIZE));
  const pageStart = (page - 1) * LEDGER_PAGE_SIZE;
  const visibleRows = useMemo(() => rows.slice(pageStart, pageStart + LEDGER_PAGE_SIZE), [rows, pageStart]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="ledger-table-block table-card">
      <div className="card-header">
        <h3>Ledger Entries</h3>
        <span className="table-count-pill">{rows.length} records</span>
      </div>
      <div className="table-wrapper">
        <table className="accounting-table ledger-screen-table">
          <thead>
            <tr>
              <th className="col-index">SN</th><th className="col-date">Date</th><th className="col-tx">TX No</th><th className="col-detail">Detail</th>
              <th className="col-amount">Cash In</th><th className="col-amount">Cash Out</th><th className="col-amount">Balance</th>
              <th className="col-amount">USD In</th><th className="col-amount">USD Out</th><th className="col-rate">Rate</th>
              <th className="col-note">Note</th><th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan="12">
                  <div className="empty-state">No ledger entries for this account yet.</div>
                </td>
              </tr>
            )}
            {visibleRows.map((row, index) => (
              <tr key={row.id} dir="auto">
                <td className="col-index">{pageStart + index + 1}</td>
                <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
                <td className="col-tx" title={row.transaction_no}>{row.transaction_no || '-'}</td>
                <td className="col-detail">{row.detail}</td>
                <td className="money-cell col-amount balance-positive">{row.cash_in_afn ? currency(row.cash_in_afn) : '-'}</td>
                <td className="money-cell col-amount balance-negative">{row.cash_out_afn ? currency(row.cash_out_afn) : '-'}</td>
                <td className={`money-cell col-amount ${row.balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>{currency(row.balance)}</td>
                <td className="money-cell col-amount">{row.usd_in ? currency(row.usd_in, 'USD') : '-'}</td>
                <td className="money-cell col-amount">{row.usd_out ? currency(row.usd_out, 'USD') : '-'}</td>
                <td className="col-rate">{row.exchange_rate}</td>
                <td className="col-note">{row.note || '-'}</td>
                <td className="col-actions"><button className="ghost-btn table-action" onClick={() => onReceipt(row)}>Receipt</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > LEDGER_PAGE_SIZE && (
        <div className="table-pagination ledger-pagination">
          <span>{pageStart + 1}-{Math.min(pageStart + LEDGER_PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div>
            <button className="ghost-btn" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <strong>Page {page} of {pageCount}</strong>
            <button className="ghost-btn" type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

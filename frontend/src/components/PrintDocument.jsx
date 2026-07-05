import CompanyLogo from './CompanyLogo';
import DateDisplay from './DateDisplay';
import { currency, jalaliDateLabel } from '../utils/format';

const amount = (value, code = 'AFN') => Number(value || 0) ? currency(value, code) : '-';

function ReportHeader({ report }) {
  const company = report.company || {};
  return (
    <header className="print-document-header">
      <CompanyLogo logo={company.companyLogo} name={company.companyName} size="lg" />
      <div className="print-document-heading">
        <span className="print-document-kicker">Official Accounting Report</span>
        <h1>{company.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</h1>
        <h2>{report.title}</h2>
        <div className="print-document-meta">
          <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
          {report.dateDisplayFormat !== 'gregorian' ? <span>Jalali: {jalaliDateLabel(report.generatedAt)}</span> : null}
          <span>Prepared by: {report.preparedBy || 'System User'}</span>
        </div>
        {(company.companyAddress || company.companyPhone || company.companyEmail) && (
          <p>{[company.companyAddress, company.companyPhone, company.companyEmail].filter(Boolean).join(' | ')}</p>
        )}
      </div>
    </header>
  );
}

function SummaryCards({ report }) {
  const summary = report.summary || {};
  let cards;

  if (report.kind === 'ledger') {
    cards = [
      ['Opening Balance', currency(summary.opening_balance_afn)],
      ['Total Cash In', currency(summary.total_cash_in_afn)],
      ['Total Cash Out', currency(summary.total_cash_out_afn)],
      ['Final Balance', currency(summary.final_balance_afn)]
    ];
  } else if (report.kind === 'cashbook') {
    cards = [
      ['Total Cash In', currency(summary.cash_in_afn)],
      ['Total Cash Out', currency(summary.cash_out_afn)],
      ['Net Balance', currency(Number(summary.cash_in_afn || 0) - Number(summary.cash_out_afn || 0))],
      ['USD In', currency(summary.usd_in, 'USD')],
      ['USD Out', currency(summary.usd_out, 'USD')]
    ];
  } else {
    cards = [
      ['Total Cash In', currency(summary.cash_in_afn)],
      ['Total Cash Out', currency(summary.cash_out_afn)],
      ['Available Balance', currency(summary.afn_balance)],
      ["Today's Activity", `${currency(summary.today_cash_in)} in`, `${currency(summary.today_cash_out)} out`],
      ['Monthly Activity', `${currency(summary.monthly_cash_in)} in`, `${currency(summary.monthly_cash_out)} out`]
    ];
  }

  return (
    <section className={`print-summary-grid print-summary-${cards.length}`}>
      {cards.map(([label, value, detail]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail ? <small>{detail}</small> : null}
        </div>
      ))}
    </section>
  );
}

function DashboardTable({ rows, dateDisplayFormat }) {
  return (
    <table className="print-data-table print-table-dashboard">
      <thead><tr><th className="col-date">Date</th><th className="col-account">Account</th><th className="col-detail">Detail</th><th className="col-amount">Cash In</th><th className="col-amount">Cash Out</th></tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
            <td className="col-account" dir="auto">{row.account_name}</td>
            <td className="col-detail" dir="auto">{row.detail}</td>
            <td className="print-money col-amount">{row.transaction_type === 'cash_in' ? amount(row.cash_in_afn) : '-'}</td>
            <td className="print-money col-amount">{row.transaction_type === 'cash_out' ? amount(row.cash_out_afn) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CashBookTable({ rows, dateDisplayFormat }) {
  return (
    <table className="print-data-table print-table-cashbook">
      <thead>
        <tr>
          <th className="col-index">S.No</th><th className="col-date">Date</th>
          <th className="col-account">Account / Person / Company</th><th className="col-detail">Detail</th>
          <th className="col-amount">Cash In AFN</th><th className="col-amount">Cash Out AFN</th>
          <th className="col-amount col-usd">USD In</th><th className="col-amount col-usd">USD Out</th>
          <th className="col-rate">Rate</th><th className="col-amount">Balance</th><th className="col-type">Type</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id}>
            <td className="col-index">{row.isOpeningBalance ? 'BF' : index + 1}</td>
            <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
            <td className="col-account" dir="auto">{row.account_name}</td>
            <td className="col-detail" dir="auto">{row.detail}</td>
            <td className="print-money col-amount">{amount(row.cash_in_afn)}</td>
            <td className="print-money col-amount">{amount(row.cash_out_afn)}</td>
            <td className="print-money col-amount col-usd">{amount(row.usd_in, 'USD')}</td>
            <td className="print-money col-amount col-usd">{amount(row.usd_out, 'USD')}</td>
            <td className="print-money col-rate">{row.exchange_rate || '-'}</td>
            <td className="print-money col-amount">{currency(row.runningBalance)}</td>
            <td className="col-type">{row.isOpeningBalance ? 'Brought Forward' : row.transaction_type === 'cash_in' ? 'Cash In' : 'Cash Out'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgerTable({ rows, dateDisplayFormat }) {
  return (
    <table className="print-data-table print-table-ledger">
      <thead>
        <tr>
          <th className="col-index">SN</th><th className="col-date">Date</th><th className="col-tx">TX No</th><th className="col-detail">Detail</th>
          <th className="col-amount">Cash In</th><th className="col-amount">Cash Out</th><th className="col-amount">Balance</th>
          <th className="col-amount col-usd">USD In</th><th className="col-amount col-usd">USD Out</th><th className="col-rate">Rate</th><th className="col-note">Note</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id}>
            <td className="col-index">{index + 1}</td>
            <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
            <td className="col-tx" title={row.transaction_no}>{row.transaction_no || '-'}</td>
            <td className="col-detail" dir="auto">{row.detail}</td>
            <td className="print-money col-amount">{amount(row.cash_in_afn)}</td>
            <td className="print-money col-amount">{amount(row.cash_out_afn)}</td>
            <td className="print-money col-amount">{currency(row.balance)}</td>
            <td className="print-money col-amount col-usd">{amount(row.usd_in, 'USD')}</td>
            <td className="print-money col-amount col-usd">{amount(row.usd_out, 'USD')}</td>
            <td className="print-money col-rate">{row.exchange_rate || '-'}</td>
            <td className="col-note" dir="auto">{row.note || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportTable({ rows, dateDisplayFormat }) {
  return (
    <table className="print-data-table print-table-report">
      <thead><tr><th className="col-index">SN</th><th className="col-date">Date</th><th className="col-tx">TX No</th><th className="col-account">Account</th><th className="col-detail">Detail</th><th className="col-category">Category</th><th className="col-amount">Cash In</th><th className="col-amount">Cash Out</th></tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id}>
            <td className="col-index">{index + 1}</td>
            <td className="col-date"><DateDisplay value={row.date} format={dateDisplayFormat} /></td>
            <td className="col-tx" title={row.transaction_no}>{row.transaction_no || '-'}</td>
            <td className="col-account" dir="auto">{row.account_name}</td>
            <td className="col-detail" dir="auto">{row.detail}</td>
            <td className="col-category">{String(row.category || 'other').replaceAll('_', ' ')}</td>
            <td className="print-money col-amount">{amount(row.cash_in_afn)}</td>
            <td className="print-money col-amount">{amount(row.cash_out_afn)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportRows({ report }) {
  if (!report.rows.length) {
    return <div className="print-empty-state">No records are available for this report.</div>;
  }
  if (report.kind === 'cashbook') return <CashBookTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  if (report.kind === 'ledger') return <LedgerTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  if (report.kind === 'report') return <ReportTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  return <DashboardTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
}

export default function PrintDocument({ report, documentRef, zoom = 1 }) {
  return (
    <article
      className={`print-container print-document print-document-${report.kind} a4-paper flagship-a4-paper`}
      ref={documentRef}
      style={{ '--paper-zoom': zoom }}
    >
      <ReportHeader report={report} />
      <section className="print-company-strip">
        <strong>{report.company?.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</strong>
        <span>{report.kind === 'ledger' && report.account ? `Account: ${report.account.name}` : 'Financial Accounting Report'}</span>
      </section>
      <SummaryCards report={report} />
      <section className="print-table-section">
        <h3>{report.kind === 'ledger' ? 'Ledger Entries' : report.kind === 'cashbook' ? 'Cash Book Records' : 'Transactions'}</h3>
        <ReportRows report={report} />
      </section>
      <section className="print-signature-grid" aria-label="Report authorization signatures">
        <div><span>Prepared By</span></div>
        <div><span>Accountant Signature</span></div>
        <div><span>Authorized Manager</span></div>
      </section>
      <footer className="print-document-footer">
        <span>Generated by SKY Cash Book</span>
        <span>{report.company?.companyName}</span>
      </footer>
    </article>
  );
}

import { useTranslation } from 'react-i18next';
import CompanyLogo from './CompanyLogo';
import DateDisplay from './DateDisplay';
import { currency, jalaliDateLabel } from '../utils/format';

const amount = (value, code = 'AFN') => Number(value || 0) ? currency(value, code) : '-';

function ReportHeader({ report }) {
  const { t } = useTranslation();
  const company = report.company || {};
  return (
    <header className="print-document-header">
      <CompanyLogo logo={company.companyLogo} name={company.companyName} size="lg" />
      <div className="print-document-heading">
        <span className="print-document-kicker">{t('print.officialReport')}</span>
        <h1>{company.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</h1>
        <h2>{report.title}</h2>
        <div className="print-document-meta">
          <span>{t('print.generated')}{new Date(report.generatedAt).toLocaleString()}</span>
          {report.dateDisplayFormat !== 'gregorian' ? <span>{t('print.jalali')}{jalaliDateLabel(report.generatedAt)}</span> : null}
          <span>{t('print.preparedByLabel')}{report.preparedBy || 'System User'}</span>
        </div>
        {(company.companyAddress || company.companyPhone || company.companyEmail) && (
          <p>{[company.companyAddress, company.companyPhone, company.companyEmail].filter(Boolean).join(' | ')}</p>
        )}
      </div>
    </header>
  );
}

function SummaryCards({ report }) {
  const { t } = useTranslation();
  const summary = report.summary || {};
  let cards;

  if (report.kind === 'ledger') {
    const finalBalance = Number(summary.final_balance_afn || 0);
    cards = [
      [t('print.openingBalance'), currency(summary.opening_balance_afn)],
      [t('print.totalCashIn'), currency(summary.total_cash_in_afn), null, 'green'],
      [t('print.totalCashOut'), currency(summary.total_cash_out_afn), null, 'red'],
      [t('print.finalBalance'), currency(summary.final_balance_afn), null, finalBalance < 0 ? 'red' : 'green']
    ];
  } else if (report.kind === 'cashbook') {
    const net = Number(summary.cash_in_afn || 0) - Number(summary.cash_out_afn || 0);
    cards = [
      [t('print.totalCashIn'), currency(summary.cash_in_afn), null, 'green'],
      [t('print.totalCashOut'), currency(summary.cash_out_afn), null, 'red'],
      [t('print.netBalance'), currency(net), null, net < 0 ? 'red' : 'green'],
      [t('print.usdIn'), currency(summary.usd_in, 'USD'), null, 'green'],
      [t('print.usdOut'), currency(summary.usd_out, 'USD'), null, 'red']
    ];
  } else {
    cards = [
      [t('print.totalCashIn'), currency(summary.cash_in_afn), null, 'green'],
      [t('print.totalCashOut'), currency(summary.cash_out_afn), null, 'red'],
      [t('print.availableBalance'), currency(summary.afn_balance)],
      [t('print.todayActivity'), `${currency(summary.today_cash_in)} ${t('print.in')}`, `${currency(summary.today_cash_out)} ${t('print.out')}`],
      [t('print.monthlyActivity'), `${currency(summary.monthly_cash_in)} ${t('print.in')}`, `${currency(summary.monthly_cash_out)} ${t('print.out')}`]
    ];
  }

  return (
    <section className={`print-summary-grid print-summary-${cards.length}`}>
      {cards.map(([label, value, detail, tone]) => (
        <div key={label} className={tone ? `print-metric-${tone}` : undefined}>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail ? <small>{detail}</small> : null}
        </div>
      ))}
    </section>
  );
}

function DashboardTable({ rows, dateDisplayFormat }) {
  const { t } = useTranslation();
  return (
    <table className="print-data-table print-table-dashboard">
      <thead><tr><th className="col-date">{t('print.date')}</th><th className="col-account">{t('print.account')}</th><th className="col-detail">{t('print.detail')}</th><th className="col-amount">{t('print.cashIn')}</th><th className="col-amount">{t('print.cashOut')}</th></tr></thead>
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
  const { t } = useTranslation();
  return (
    <table className="print-data-table print-table-cashbook">
      <thead>
        <tr>
          <th className="col-index">{t('print.sNo')}</th><th className="col-date">{t('print.date')}</th>
          <th className="col-account">{t('print.accountPersonCompany')}</th><th className="col-detail">{t('print.detail')}</th>
          <th className="col-amount">{t('print.cashInAfn')}</th><th className="col-amount">{t('print.cashOutAfn')}</th>
          <th className="col-amount col-usd">{t('print.usdIn')}</th><th className="col-amount col-usd">{t('print.usdOut')}</th>
          <th className="col-rate">{t('print.rate')}</th><th className="col-amount">{t('print.balance')}</th><th className="col-type">{t('print.type')}</th>
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
            <td className="col-type">{row.isOpeningBalance ? t('print.broughtForward') : row.transaction_type === 'cash_in' ? t('print.cashIn') : t('print.cashOut')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgerTable({ rows, dateDisplayFormat }) {
  const { t } = useTranslation();
  return (
    <table className="print-data-table print-table-ledger">
      <thead>
        <tr>
          <th className="col-index">{t('print.sn')}</th><th className="col-date">{t('print.date')}</th><th className="col-tx">{t('print.txNo')}</th><th className="col-detail">{t('print.detail')}</th>
          <th className="col-amount">{t('print.cashIn')}</th><th className="col-amount">{t('print.cashOut')}</th><th className="col-amount">{t('print.balance')}</th>
          <th className="col-amount col-usd">{t('print.usdIn')}</th><th className="col-amount col-usd">{t('print.usdOut')}</th><th className="col-rate">{t('print.rate')}</th><th className="col-note">{t('print.note')}</th>
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
            <td className="print-money col-amount">{currency(row.runningBalance || row.balance)}</td>
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
  const { t } = useTranslation();
  return (
    <table className="print-data-table print-table-report">
      <thead><tr><th className="col-index">{t('print.sn')}</th><th className="col-date">{t('print.date')}</th><th className="col-tx">{t('print.txNo')}</th><th className="col-account">{t('print.account')}</th><th className="col-detail">{t('print.detail')}</th><th className="col-category">{t('print.category')}</th><th className="col-amount">{t('print.cashIn')}</th><th className="col-amount">{t('print.cashOut')}</th></tr></thead>
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
  const { t } = useTranslation();
  if (!report.rows.length) {
    return <div className="print-empty-state">{t('print.noRecords')}</div>;
  }
  if (report.kind === 'cashbook') return <CashBookTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  if (report.kind === 'ledger') return <LedgerTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  if (report.kind === 'report') return <ReportTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
  return <DashboardTable rows={report.rows} dateDisplayFormat={report.dateDisplayFormat} />;
}

export default function PrintDocument({ report, documentRef, zoom = 1 }) {
  const { t } = useTranslation();
  return (
    <article
      className={`print-container print-document print-document-${report.kind} a4-paper flagship-a4-paper`}
      ref={documentRef}
      style={{ '--paper-zoom': zoom }}
    >
      <ReportHeader report={report} />
      <section className="print-company-strip">
        <strong>{report.company?.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</strong>
        <span>{report.kind === 'ledger' && report.account ? `${t('print.account')}: ${report.account.name}` : t('print.financialReport')}</span>
      </section>
      <SummaryCards report={report} />
      <section className="print-table-section">
        <h3>{report.kind === 'ledger' ? t('print.ledgerEntries') : report.kind === 'cashbook' ? t('print.cashbookRecords') : t('print.transactions')}</h3>
        <ReportRows report={report} />
      </section>
      <section className="print-signature-grid" aria-label="Report authorization signatures">
        <div><span>{t('print.preparedBy')}</span></div>
        <div><span>{t('print.accountantSignature')}</span></div>
        <div><span>{t('print.authorizedManager')}</span></div>
      </section>
      <footer className="print-document-footer">
        <span>{t('print.generatedBySky')}</span>
        <span>{report.company?.companyName}</span>
      </footer>
    </article>
  );
}

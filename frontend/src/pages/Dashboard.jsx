import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  DatabaseBackup,
  FileText,
  Landmark,
  Printer,
  RefreshCcw,
  WalletCards
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import CompanyLogo from '../components/CompanyLogo';
import { currency, currencyTone } from '../utils/format';

const companyFallback = 'BAWAR STAR PLASTIC INDUSTRY';

const afnMetricItems = [
  { label: 'Total Cash In', key: 'cash_in_afn', icon: ArrowDownLeft, intent: 'in' },
  { label: 'Total Cash Out', key: 'cash_out_afn', icon: ArrowUpRight, intent: 'out' },
  { label: 'Available Balance', key: 'afn_balance', icon: WalletCards, intent: 'balance' },
  { label: "Today's Cash In", key: 'today_cash_in', icon: CalendarDays, intent: 'in' },
  { label: "Today's Cash Out", key: 'today_cash_out', icon: CalendarDays, intent: 'out' },
  { label: "This Month's Cash In", key: 'monthly_cash_in', icon: CalendarRange, intent: 'in' },
  { label: "This Month's Cash Out", key: 'monthly_cash_out', icon: CalendarRange, intent: 'out' }
];

const usdMetricItems = [
  { label: 'Total Cash In', key: 'usd_in', icon: ArrowDownLeft, intent: 'in' },
  { label: 'Total Cash Out', key: 'usd_out', icon: ArrowUpRight, intent: 'out' },
  { label: 'Available Balance', key: 'usd_balance', icon: WalletCards, intent: 'balance' }
];

const quickActions = [
  { label: 'Ledger', view: 'ledger', icon: Landmark },
  { label: 'Reports', view: 'reports', icon: FileText }
];

const formatCount = (value) => Number(value || 0).toLocaleString('en-US');

const signedCurrency = (value, type = 'cash_in') => {
  const amount = Math.abs(Number(value || 0));
  return `${type === 'cash_in' ? '+' : '-'}${currency(amount)}`;
};

const resolveMetricTone = (value, intent) => {
  if (intent === 'balance') return currencyTone(value);
  if (Number(value || 0) === 0) return 'neutral';
  return intent === 'out' ? 'danger' : 'success';
};

function EntryStat({ icon: Icon, label, value }) {
  return (
    <article className="dashboard-entry-stat">
      <span className="dashboard-entry-icon" aria-hidden="true"><Icon size={20} /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function FinancialMetricCard({ item, code, summary }) {
  const Icon = item.icon;
  const value = Number(summary[item.key] || 0);
  const tone = resolveMetricTone(value, item.intent);

  return (
    <article className={`financial-metric-card financial-metric-${tone}`}>
      <div className="financial-metric-card-header">
        <span className="financial-metric-icon" aria-hidden="true"><Icon size={18} /></span>
        <span>{item.label}</span>
      </div>
      <strong>{currency(value, code)}</strong>
    </article>
  );
}

function CurrencySummary({ title, code, items, summary }) {
  return (
    <section className="currency-summary-section" aria-label={title}>
      <div className="currency-summary-header">
        <div>
          <span className="dashboard-section-kicker">{code}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="currency-metric-grid">
        {items.map((item) => (
          <FinancialMetricCard key={item.key} item={item} code={code} summary={summary} />
        ))}
      </div>
    </section>
  );
}

export default function Dashboard({
  summary,
  latestTransactions,
  onNavigate,
  onBackup,
  onRestore,
  onPrint,
  companyName,
  companyLogo,
  activeTransactionType,
  setActiveTransactionType
}) {
  const displayCompanyName = companyName || companyFallback;

  return (
    <>
      <GlassCard className="hero-card dashboard-overview-card">
        <div className="dashboard-overview-content">
          <div className="dashboard-company-summary">
            <CompanyLogo logo={companyLogo} name={displayCompanyName} size="lg" />
            <div>
              <p className="eyebrow">Cash Management Dashboard</p>
              <h3>{displayCompanyName}</h3>
              <p>Manage daily cash-in, cash-out, account ledgers, currency balances, backups, and printable accounting reports in one place.</p>
            </div>
          </div>
          <div className="dashboard-entry-stats" aria-label="Cash book entry counts">
            <EntryStat icon={CalendarDays} label="Today's Entries" value={formatCount(summary.today_transactions)} />
            <EntryStat icon={CalendarRange} label="This Month's Entries" value={formatCount(summary.monthly_transactions)} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="dashboard-metrics-panel dashboard-financial-summary">
        <CurrencySummary title="AFN Cash Flow" code="AFN" items={afnMetricItems} summary={summary} />
        <CurrencySummary title="USD Cash Flow" code="USD" items={usdMetricItems} summary={summary} />
      </GlassCard>

      <div className="dashboard-grid">
        <GlassCard className="dashboard-actions-card">
          <div className="card-header"><h3>Quick Actions</h3></div>
          <div className="action-toolbar" role="toolbar" aria-label="Quick actions">
            <button
              className={`toolbar-btn toolbar-primary success ${activeTransactionType === 'cash_in' ? 'active' : ''}`}
              onClick={() => setActiveTransactionType(activeTransactionType === 'cash_in' ? null : 'cash_in')}
            >
              <ArrowDownLeft size={17} /> Add Cash In
            </button>
            <button
              className={`toolbar-btn toolbar-primary danger ${activeTransactionType === 'cash_out' ? 'active' : ''}`}
              onClick={() => setActiveTransactionType(activeTransactionType === 'cash_out' ? null : 'cash_out')}
            >
              <ArrowUpRight size={17} /> Add Cash Out
            </button>
            {quickActions.map(({ label, view, icon: Icon }) => (
              <button className="toolbar-btn" key={view} onClick={() => onNavigate(view)}>
                <Icon size={17} /> {label}
              </button>
            ))}
            <button className="toolbar-btn" onClick={onPrint}><Printer size={17} /> Print</button>
            <button className="toolbar-btn" onClick={onBackup}><DatabaseBackup size={17} /> Backup</button>
            <button className="toolbar-btn" onClick={onRestore}><RefreshCcw size={17} /> Restore</button>
          </div>
        </GlassCard>
        <GlassCard className="recent-activity-card">
          <div className="card-header"><h3>Recent Cash Book Activity</h3></div>
          <div className="activity-list-compact">
            {!latestTransactions.length ? <div className="activity-row-compact">No transactions recorded yet. Add a Cash In or Cash Out entry to start the cash book.</div> : latestTransactions.map((tx) => {
              const isCashIn = tx.transaction_type === 'cash_in';
              const amount = isCashIn ? tx.cash_in_afn : tx.cash_out_afn;
              return (
                <div className="activity-row-compact" key={tx.id}>
                  <div>
                    <strong>{tx.account_name}</strong>
                    <p>{tx.detail}</p>
                  </div>
                  <div className={`activity-amount ${isCashIn ? 'balance-positive' : 'balance-negative'}`}>
                    {signedCurrency(amount, tx.transaction_type)}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </>
  );
}

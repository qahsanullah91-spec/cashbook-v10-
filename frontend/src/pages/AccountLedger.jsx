import { ChevronRight } from 'lucide-react';
import LedgerTable from '../components/LedgerTable';

export default function AccountLedger(props) {
  const visibleAccounts = props.accounts.filter((account) => !props.search || account.name.toLowerCase().includes(props.search.toLowerCase()));
  return (
    <section className="ledger-workspace" aria-label="Account ledger workspace">
      <div className="section-header glass-card ledger-command-bar">
        <div>
          <p className="eyebrow">Account Ledger</p>
          <h3>Customer and Company Ledger</h3>
        </div>
        <div className="section-actions">
          <button className="ghost-btn" onClick={props.onPrint}>Print Ledger</button>
          <button className="ghost-btn" onClick={props.onExport}>Export Ledger</button>
        </div>
      </div>
      <div className="entry-grid ledger-grid">
        <div className="glass-card form-card ledger-create-panel">
          <div className="card-header"><h3>Create Account</h3></div>
          <form className="entry-form" onSubmit={props.onCreateAccount}>
            <input type="text" value={props.accountName} onChange={(e) => props.setAccountName(e.target.value)} placeholder="Customer / Company Name" required dir="auto" />
            <input type="number" value={props.openingBalance} onChange={(e) => props.setOpeningBalance(e.target.value)} placeholder="Opening Balance AFN" step="0.01" min="0" />
            <button className="primary-btn full-width" type="submit">Add Account</button>
          </form>
          <div className="card-header account-subheader"><h3>Search Accounts</h3></div>
          <input type="search" value={props.search} onChange={(e) => props.setSearch(e.target.value)} placeholder="Search account name" />
          <div className="account-list">
            {!visibleAccounts.length && <div className="empty-state">No accounts found.</div>}
            {visibleAccounts.map((account) => (
              <div className={`account-item ${account.name === props.selectedAccountName ? 'active' : ''}`} key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span className="account-meta">AFN {Number(account.balance || account.opening_balance_afn || 0).toLocaleString('en-US')}</span>
                </div>
                <button className="account-select-icon" type="button" onClick={() => props.onSelectAccount(account)} aria-label={`Select ${account.name}`}>
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card form-card ledger-selected-panel">
          <div className="card-header"><h3>{props.ledgerTitle}</h3></div>
          <div className="ledger-summary">
            <div className="receipt-grid">
              <div className="ledger-summary-card"><strong>Opening Balance</strong><div>{props.ledgerSummary.opening}</div></div>
              <div className="ledger-summary-card"><strong>Total Debit</strong><div>{props.ledgerSummary.debit}</div></div>
              <div className="ledger-summary-card"><strong>Total Credit</strong><div>{props.ledgerSummary.credit}</div></div>
              <div className="ledger-summary-card is-final"><strong>Final Balance</strong><div>{props.ledgerSummary.final}</div></div>
            </div>
          </div>
          <LedgerTable rows={props.rows} dateDisplayFormat={props.dateDisplayFormat} onReceipt={props.onReceipt} />
        </div>
      </div>
    </section>
  );
}

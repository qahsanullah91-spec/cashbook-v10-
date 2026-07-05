import { currency } from '../utils/format';

export default function Accounts({ accounts, form, setForm, onSave, onEdit, onDelete, search, setSearch }) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const visible = accounts.filter((account) => !search || `${account.name} ${account.phone} ${account.account_type}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="section-header glass-card">
        <div><p className="eyebrow">Accounts</p><h3>Customers, Suppliers and Workers</h3></div>
      </div>
      <div className="entry-grid accounts-layout">
        <div className="glass-card form-card">
          <div className="card-header"><h3>{form.id ? 'Edit Account' : 'Add Account'}</h3></div>
          <form className="entry-form" onSubmit={onSave}>
            <input autoFocus type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Account name" required dir="auto" />
            <select value={form.account_type} onChange={(e) => update('account_type', e.target.value)}>
              <option value="customer">Customer</option><option value="supplier">Supplier</option>
              <option value="worker">Worker</option><option value="factory">Factory</option>
              <option value="expense">Expense</option><option value="other">Other</option>
            </select>
            <input type="text" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone" />
            <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Address" dir="auto" />
            <input type="number" value={form.opening_balance_afn} onChange={(e) => update('opening_balance_afn', e.target.value)} placeholder="Opening balance AFN" step="0.01" />
            <input type="number" value={form.opening_balance_usd} onChange={(e) => update('opening_balance_usd', e.target.value)} placeholder="Opening balance USD" step="0.01" />
            <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Note" dir="auto" />
            <button className="primary-btn" type="submit">{form.id ? 'Update Account' : 'Save Account'}</button>
          </form>
        </div>
        <div className="glass-card table-card">
          <div className="card-header"><h3>Account Directory</h3></div>
          <div className="filters"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts" /></div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Opening AFN</th><th>Opening USD</th><th>Actions</th></tr></thead>
              <tbody>
              {!visible.length && <tr><td colSpan="6"><div className="empty-state">No accounts yet. Add the first customer, supplier, worker, or expense account.</div></td></tr>}
              {visible.map((account) => (
                <tr key={account.id} dir="auto">
                  <td><strong>{account.name}</strong><span className="account-meta">{account.address}</span></td>
                  <td>{account.account_type}</td><td>{account.phone || '-'}</td>
                  <td>{currency(account.opening_balance_afn)}</td>
                  <td>{currency(account.opening_balance_usd, 'USD')}</td>
                  <td><div className="row-actions"><button className="ghost-btn table-action" onClick={() => onEdit(account)}>Edit</button><button className="ghost-btn table-action" onClick={() => onDelete(account)}>Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

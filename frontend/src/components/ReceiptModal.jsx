import { currency } from '../utils/format';
import DateDisplay from './DateDisplay';

export default function ReceiptModal({ transaction, companyName, dateDisplayFormat, onClose, onPrint }) {
  if (!transaction) return null;
  return (
    <div className="modal">
      <div className="modal-card glass-card receipt-modal">
        <div className="modal-header">
          <h3>Receipt / Voucher</h3>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
        <div className="receipt-content">
          <div className="receipt-head">
            <div>
              <h2>{companyName}</h2>
              <p>Receipt / Voucher</p>
            </div>
            <div>
              <strong>Receipt No:</strong> {transaction.transaction_no || String(transaction.id).slice(0, 8)}<br />
              <strong>Date:</strong> <DateDisplay value={transaction.date} format={dateDisplayFormat} />
            </div>
          </div>
          <div className="receipt-grid">
            <div><strong>Name:</strong> {transaction.account_name}</div>
            <div><strong>Detail:</strong> {transaction.detail}</div>
            <div><strong>Type:</strong> {transaction.transaction_type === 'cash_in' ? 'Cash In' : 'Cash Out'}</div>
            <div><strong>AFN Amount:</strong> {currency(transaction.transaction_type === 'cash_in' ? transaction.cash_in_afn : transaction.cash_out_afn)}</div>
            <div><strong>USD Amount:</strong> {currency(transaction.transaction_type === 'cash_in' ? transaction.usd_in : transaction.usd_out, 'USD')}</div>
            <div><strong>Exchange Rate:</strong> {transaction.exchange_rate}</div>
            <div><strong>Payment Method:</strong> {transaction.payment_method || 'cash'}</div>
            <div><strong>Note:</strong> {transaction.note || '-'}</div>
          </div>
          <div className="signature-line">
            <div>Prepared By</div>
            <div>Received By</div>
          </div>
          <div className="signature-line">
            <div>____________________</div>
            <div>____________________</div>
          </div>
          <div className="signature-line">
            <div>Cashier</div>
            <div>Manager</div>
          </div>
          <button className="primary-btn" onClick={onPrint}>Print Receipt</button>
        </div>
      </div>
    </div>
  );
}

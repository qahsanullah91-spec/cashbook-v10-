export default function CurrencyConverter(props) {
  return (
    <>
      <div className="section-header glass-card">
        <div>
          <p className="eyebrow">Currency Converter</p>
          <h3>AFN and USD Exchange</h3>
        </div>
      </div>
      <div className="entry-grid">
        <div className="glass-card form-card">
          <div className="card-header"><h3>Live Conversion</h3></div>
          <div className="converter-form">
            <label>Direction<select value={props.direction} onChange={(e) => props.setDirection(e.target.value)}><option value="afnToUsd">AFN to USD</option><option value="usdToAfn">USD to AFN</option></select></label>
            <label>Amount<input type="number" value={props.amount} onChange={(e) => props.setAmount(e.target.value)} step="0.01" placeholder="Enter amount" /></label>
            <label>Exchange Rate<input type="number" value={props.rate} onChange={(e) => props.setRate(e.target.value)} step="0.01" placeholder="Exchange rate" /></label>
            <button className="primary-btn full-width" onClick={props.onSaveRate}>Save Default Rate</button>
            <div className="conversion-result">{props.result}</div>
          </div>
        </div>
        <div className="glass-card form-card">
          <div className="card-header"><h3>Example</h3></div>
          <div className="info-box">
            <p>Example calculation:</p>
            <p className="highlight">USD 1,200 x 64.30 = AFN 77,160</p>
            <p>Use the saved exchange rate for all transactions automatically.</p>
          </div>
        </div>
      </div>
    </>
  );
}

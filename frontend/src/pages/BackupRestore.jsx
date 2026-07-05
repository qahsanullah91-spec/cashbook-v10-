export default function BackupRestore({
  onBackup,
  onImportClick,
  onImportFile,
  onCsvImportClick,
  onCsvImportFile,
  onDownloadCsvTemplate,
  onClear,
  fileRef,
  csvFileRef,
  status,
  lastBackup
}) {
  return (
    <div className="entry-grid">
      <div className="glass-card form-card">
        <div className="card-header"><h3>Backup and Restore</h3></div>
        <div className="backup-actions">
          <button className="primary-btn full-width" onClick={onBackup}>Export Full JSON Backup</button>
          <button className="ghost-btn full-width" onClick={onImportClick}>Import Backup JSON</button>
          <button className="secondary-btn full-width" onClick={onCsvImportClick}>Import Cash Book CSV</button>
          <button className="ghost-btn full-width" onClick={onDownloadCsvTemplate}>Download CSV Template</button>
          <button className="danger-btn full-width" onClick={onClear}>Clear All Data</button>
        </div>
        <input type="file" ref={fileRef} accept="application/json" hidden onChange={onImportFile} />
        <input type="file" ref={csvFileRef} accept=".csv,text/csv" hidden onChange={onCsvImportFile} />
        <div className="backup-status">{status}</div>
        <p className="muted">Last backup: {lastBackup || 'Never'}</p>
        <p className="muted csv-import-help">
          CSV requires date, account_name, and detail. Add cash_in_afn or cash_out_afn, or use USD columns with exchange_rate.
        </p>
      </div>
    </div>
  );
}

import UserAccounts from '../components/UserAccounts';
import SystemDiagnostics from '../components/SystemDiagnostics';
import SettingsCompany from './SettingsCompany';
import { BadgeCheck, Building2, Factory, Printer, ShieldCheck } from 'lucide-react';

export default function Settings(props) {
  return (
    <>
      <section className="settings-command-center glass-card">
        <div className="settings-command-copy">
          <p className="eyebrow">Enterprise Settings</p>
          <h2>Company Branding & Print Operations</h2>
          <p>Manage identity, secure preferences, backups, and document output for BAWAR STAR PLASTIC INDUSTRY.</p>
        </div>
        <button className="primary-btn icon-text-btn" onClick={props.onPrintPreview}><Printer size={18} />Open Print Preview Center</button>
      </section>
      <div className="settings-overview-grid">
        {[
          { icon: Building2, title: 'Company', value: props.companyName || 'BAWAR STAR PLASTIC INDUSTRY' },
          { icon: Factory, title: 'Industry', value: 'Plastic Manufacturing' },
          { icon: ShieldCheck, title: 'Administrator', value: props.currentUser?.full_name || 'System User' },
          { icon: BadgeCheck, title: 'Print Status', value: props.printHeader ? 'Header enabled' : 'Header hidden' }
        ].map(({ icon: Icon, title, value }) => (
          <div className="settings-overview-card glass-card" key={title}>
            <div className="metric-icon"><Icon size={19} /></div>
            <span>{title}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <SettingsCompany
        companyName={props.companyName}
        setCompanyName={props.setCompanyName}
        companyLogo={props.companyLogo}
        setCompanyLogo={props.setCompanyLogo}
        companyAddress={props.companyAddress}
        setCompanyAddress={props.setCompanyAddress}
        companyPhone={props.companyPhone}
        setCompanyPhone={props.setCompanyPhone}
        companyEmail={props.companyEmail}
        setCompanyEmail={props.setCompanyEmail}
        companyWebsite={props.companyWebsite}
        setCompanyWebsite={props.setCompanyWebsite}
        companyTaxNumber={props.companyTaxNumber}
        setCompanyTaxNumber={props.setCompanyTaxNumber}
        companyLicense={props.companyLicense}
        setCompanyLicense={props.setCompanyLicense}
        onStatus={props.setSettingsStatus}
      />
      <div className="entry-grid">
        <div className="glass-card form-card">
          <div className="card-header"><h3>Preferences</h3></div>
          <div className="settings-form">
            <label>Default Currency<input type="text" value={props.currencyCode} onChange={(e) => props.setCurrencyCode(e.target.value)} /></label>
            <label>Default Exchange Rate<input type="number" value={props.exchangeRate} onChange={(e) => props.setExchangeRate(e.target.value)} step="0.01" /></label>
            <label>Theme<select value={props.theme} onChange={(e) => props.setTheme(e.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></label>
            <label>Language<select value={props.language} onChange={(e) => props.setLanguage(e.target.value)}><option value="English">English</option><option value="Pashto">Pashto</option><option value="Dari">Dari</option></select></label>
            <label>Date Display Format<select value={props.dateDisplayFormat} onChange={(e) => props.setDateDisplayFormat(e.target.value)}><option value="dual">Persian + Gregorian</option><option value="persian">Persian Only</option><option value="gregorian">Gregorian Only</option></select></label>
            <label>Print Footer<input type="text" value={props.printFooterText} onChange={(e) => props.setPrintFooterText(e.target.value)} dir="auto" /></label>
            <label>Auto Logout Minutes<input type="number" min="1" value={props.autoLogoutMinutes} onChange={(e) => props.setAutoLogoutMinutes(e.target.value)} /></label>
            <label className="checkbox-row"><input type="checkbox" checked={props.printHeader} onChange={(e) => props.setPrintHeader(e.target.checked)} /><span>Show company header in print</span></label>
            <button className="primary-btn full-width" onClick={props.onSave}>Save Settings</button>
          </div>
        </div>
        <div className="glass-card form-card">
          <div className="card-header"><h3>Backup and Restore</h3></div>
          <div className="backup-actions">
            <button className="primary-btn full-width" onClick={props.onBackup}>Export JSON Backup</button>
            <button className="ghost-btn full-width" onClick={props.onImportClick}>Import Backup</button>
            <button className="danger-btn full-width" onClick={props.onClear}>Clear All Data</button>
          </div>
          <input type="file" ref={props.fileRef} accept="application/json" hidden onChange={props.onImportFile} />
          <div className="backup-status">{props.status}</div>
          <p className="muted">Last backup: {props.lastBackup || 'Never'}</p>
        </div>
      </div>
      <SystemDiagnostics diagnostics={props.diagnostics} currentUser={props.currentUser} onRefresh={props.onRefreshDiagnostics} />
      <UserAccounts
        currentUser={props.currentUser}
        users={props.users || []}
        onReload={props.onReloadUsers}
        onCreate={props.onCreateUser}
        onUpdate={props.onUpdateUser}
        onDelete={props.onDeleteUser}
        onResetPassword={props.onResetUserPassword}
      />
    </>
  );
}

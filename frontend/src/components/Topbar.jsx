import { Clock3, LogOut, Moon, Printer, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import CompanyLogo from './CompanyLogo';

export default function Topbar({ title, onThemeToggle, onPrint, currentUser, onLogout, companyName, companyLogo, theme }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <header className="topbar">
      <div className="topbar-title-block">
        <CompanyLogo logo={companyLogo} name={companyName} size="sm" />
        <div>
          <p className="eyebrow">Professional Business Management</p>
          <h2>{title}</h2>
          <small>{companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</small>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="time-chip" aria-label="Current date and time">
          <Clock3 size={18} aria-hidden="true" />
          <span>
            <strong>{dateLabel}</strong>
            <small>{timeLabel}</small>
          </span>
        </div>
        {currentUser && (
          <div className="signed-in-user">
            <span>{currentUser.full_name}</span>
            <small>{currentUser.role}</small>
          </div>
        )}
        <button className="ghost-btn icon-text-btn" onClick={onThemeToggle} aria-label="Toggle light and dark theme" title="Toggle theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          <span>Theme</span>
        </button>
        <button className="primary-btn icon-text-btn" onClick={onPrint} aria-label="Open print preview" title="Print dashboard"><Printer size={17} /><span>Print</span></button>
        {currentUser && <button className="danger-btn icon-text-btn" onClick={() => onLogout()} aria-label="Log out" title="Log out"><LogOut size={17} /><span>Log Out</span></button>}
      </div>
    </header>
  );
}

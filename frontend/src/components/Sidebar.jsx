import { BarChart3, Calculator, ChevronLeft, ChevronRight, Circle, ClipboardList, DatabaseBackup, FileDown, LayoutDashboard, Menu, Printer, ReceiptText, RotateCcw, Settings, SlidersHorizontal, UserRoundCog, Users, WalletCards, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar({ activeView, setView, onPrint, onBackup, onRestore }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cashbook', label: 'Cash Book', icon: ReceiptText },
    { id: 'ledger', label: 'Ledger', icon: ClipboardList },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'salary', label: 'Employees & Salary', icon: UserRoundCog },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'converter', label: 'Converter', icon: Calculator },
    { id: 'backup', label: 'Backup', icon: DatabaseBackup },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];
  const ActionIconFallback = Circle;

  function SidebarIcon({ icon: Icon, size = 20 }) {
    const IconComponent = Icon || ActionIconFallback;

    return <IconComponent className="nav-icon-svg" size={size} strokeWidth={1.9} aria-hidden="true" />;
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [activeView]);

  function navigate(view) {
    setView(view);
    setMobileOpen(false);
  }

  return (
    <>
      <button
        className={`mobile-sidebar-launcher ${mobileOpen ? 'is-open' : ''}`}
        type="button"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && (
        <button
          className="mobile-sidebar-scrim"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand" title={isSidebarCollapsed ? 'BAWAR STAR Modern ERP' : undefined}>
            <div className="brand-icon">CB</div>
            <div className="brand-copy">
              <h1>BAWAR STAR</h1>
              <p>Modern ERP</p>
            </div>
          </div>
          <button
            className="sidebar-menu-toggle"
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <button
            className="sidebar-collapse-toggle"
            type="button"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>{isSidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
        <div className="sidebar-collapsible" id="primary-navigation">
          <nav className="nav-links" aria-label="Primary navigation">
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-btn ${activeView === id ? 'active' : ''}`}
                onClick={() => navigate(id)}
                title={isSidebarCollapsed ? label : undefined}
                aria-label={label}
              >
                <div className="nav-icon">
                  <SidebarIcon icon={Icon} />
                </div>
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-card">
            <h3>System Actions</h3>
            <button className="secondary-btn icon-text-btn" onClick={onPrint} title="Print Preview" aria-label="Print Preview"><div className="nav-icon"><SidebarIcon icon={Printer} size={18} /></div><span className="nav-label">Print Preview</span></button>
            <button className="secondary-btn icon-text-btn" onClick={onBackup} title="Backup Database" aria-label="Backup Database"><div className="nav-icon"><SidebarIcon icon={DatabaseBackup} size={18} /></div><span className="nav-label">Backup Database</span></button>
            <button className="secondary-btn icon-text-btn" onClick={onRestore} title="Restore Database" aria-label="Restore Database"><div className="nav-icon"><SidebarIcon icon={RotateCcw} size={18} /></div><span className="nav-label">Restore Database</span></button>
            <button className="secondary-btn icon-text-btn" onClick={() => navigate('reports')} title="Export Data" aria-label="Export Data"><div className="nav-icon"><SidebarIcon icon={FileDown} size={18} /></div><span className="nav-label">Export Data</span></button>
            <button className="secondary-btn icon-text-btn" onClick={() => navigate('settings')} title="System Settings" aria-label="System Settings"><div className="nav-icon"><SidebarIcon icon={SlidersHorizontal} size={18} /></div><span className="nav-label">System Settings</span></button>
          </div>
        </div>
      </aside>
    </>
  );
}

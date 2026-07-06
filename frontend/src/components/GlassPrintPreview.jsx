import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CheckCircle2,
  DatabaseBackup,
  Download,
  Factory,
  FileDown,
  LogOut,
  Moon,
  Printer,
  Settings,
  ShieldCheck,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import PrintDocument from './PrintDocument';

function GlassSurface({ as: Element = 'section', className = '', children }) {
  return <Element className={`preview-glass-surface ${className}`.trim()}>{children}</Element>;
}

function DashboardHeader({ report, onClose }) {
  const { t } = useTranslation();
  const now = new Date();
  return (
    <GlassSurface as="header" className="preview-dashboard-header no-print">
      <div className="preview-header-copy">
        <span className="preview-kicker">{t('print.documentStudio')}</span>
        <h1>{t('print.printPreviewCenter')}</h1>
        <p>{t('print.brandingSystemSubtitle')}</p>
      </div>
      <div className="preview-header-meta">
        <div className="system-online">
          <span aria-hidden="true" />
          <strong>{t('print.systemOnline')}</strong>
        </div>
        <div>
          <span>{t('print.currentUser')}</span>
          <strong>{report.preparedBy || 'System User'}</strong>
        </div>
        <div>
          <span>{t('print.dateLabel')}</span>
          <strong>{now.toLocaleDateString()}</strong>
        </div>
        <div>
          <span>{t('print.timeLabel')}</span>
          <strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
        </div>
        <button className="preview-icon-close" onClick={onClose} aria-label="Close print preview">
          <LogOut size={18} />
        </button>
      </div>
    </GlassSurface>
  );
}

function BusinessOverview({ report }) {
  const { t } = useTranslation();
  const cards = [
    { icon: Building2, title: t('print.companyLabel'), value: report.company.companyName || 'BAWAR STAR PLASTIC INDUSTRY' },
    { icon: Factory, title: t('print.industryLabel'), value: t('print.industryValue') },
    { icon: ShieldCheck, title: t('print.administratorLabel'), value: report.preparedBy || 'System User' },
    { icon: CheckCircle2, title: t('print.printStatusLabel'), value: t('print.printStatusValue') }
  ];

  return (
    <div className="business-overview-grid no-print">
      {cards.map(({ icon: Icon, title, value }) => (
        <GlassSurface key={title} className="business-overview-card">
          <div className="metric-icon"><Icon size={20} /></div>
          <span>{title}</span>
          <strong>{value}</strong>
        </GlassSurface>
      ))}
    </div>
  );
}

function PrintWorkspace({ report, zoom, status, error, documentRef, onRetry }) {
  const { t } = useTranslation();
  const documentReady = (status === 'ready' || status === 'printing') && report;
  return (
    <div className="print-workspace-shell">
      <div className="paper-ruler paper-ruler-top no-print" aria-hidden="true" />
      <div className="paper-ruler paper-ruler-left no-print" aria-hidden="true" />
      {status === 'loading' && (
        <div className="print-preview-state" role="status">
          <span className="print-preview-spinner" aria-hidden="true" />
          <strong>{t('print.preparingReport')}</strong>
          <p>{t('print.loadingAssets')}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="print-preview-state print-preview-error" role="alert">
          <strong>{t('print.errorPreparing')}</strong>
          <p>{error}</p>
          <button className="primary-btn" type="button" onClick={onRetry}>{t('print.tryAgain')}</button>
        </div>
      )}
      {documentReady ? (
        <>
          <div className="print-margin-guide no-print" aria-hidden="true" />
          <PrintDocument report={report} documentRef={documentRef} zoom={zoom} />
        </>
      ) : null}
    </div>
  );
}

function ActionDock({ onPrint, onThemeToggle, onDownloadData, onSettings, onLogout, onClose, onDownloadPng, zoom, setZoom, printDisabled }) {
  const { t } = useTranslation();
  const actions = [
    { label: t('print.dockPrint'), icon: Printer, tone: 'blue', onClick: onPrint, disabled: printDisabled },
    { label: t('print.dockExportPdf'), icon: FileDown, tone: 'green', onClick: onPrint, disabled: printDisabled },
    { label: t('print.dockExportPng'), icon: Download, tone: 'purple', onClick: onDownloadPng, disabled: printDisabled },
    { label: t('print.dockDownload'), icon: DatabaseBackup, tone: 'cyan', onClick: onDownloadData },
    { label: t('print.dockTheme'), icon: Moon, tone: 'glass', onClick: onThemeToggle },
    { label: t('print.dockSettings'), icon: Settings, tone: 'glass', onClick: onSettings },
    { label: t('print.dockLogout'), icon: LogOut, tone: 'red', onClick: onLogout || onClose }
  ];

  return (
    <GlassSurface className="floating-action-dock no-print">
      <div className="zoom-cluster">
        <button onClick={() => setZoom(Math.max(0.72, Number((zoom - 0.08).toFixed(2))))} aria-label="Zoom out"><ZoomOut size={17} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(1, Number((zoom + 0.08).toFixed(2))))} aria-label="Zoom in"><ZoomIn size={17} /></button>
      </div>
      {actions.map(({ label, icon: Icon, tone, onClick, disabled }) => (
        <button key={label} className={`dock-button dock-button-${tone}`} onClick={() => onClick?.()} disabled={disabled}>
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </GlassSurface>
  );
}

export default function GlassPrintPreview({
  open,
  onClose,
  report,
  onPrint,
  onThemeToggle,
  onDownloadData,
  onSettings,
  onLogout,
  status,
  error,
  onRetry,
  documentRef
}) {
  const [zoom, setZoom] = useState(0.86);

  if (!open) return null;

  const downloadPng = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 24;
    ctx.fillRect(180, 120, 1240, 860);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 54px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    if (!report) return;
    ctx.fillText(report.company.companyName || 'BAWAR STAR PLASTIC INDUSTRY', 800, 690);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 28px Inter, Arial, sans-serif';
    ctx.fillText('Premium Manufacturing & Plastic Packaging Solutions', 800, 742);

    if (report.company.companyLogo) {
      await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          const ratio = Math.min(380 / image.width, 200 / image.height);
          const width = image.width * ratio;
          const height = image.height * ratio;
          ctx.drawImage(image, 800 - width / 2, 290, width, height);
          resolve();
        };
        image.onerror = resolve;
        image.src = report.company.companyLogo;
      });
    } else {
      ctx.fillStyle = '#2563eb';
      ctx.font = '800 150px Inter, Arial, sans-serif';
      ctx.fillText('BS', 800, 470);
    }

    const link = document.createElement('a');
    link.download = 'bawar-star-print-preview.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="print-preview-overlay">
      <main className="print-preview-modal premium-print-preview flagship-preview">
        <div className="preview-ambient" aria-hidden="true" />
        <div className="preview-reflection" aria-hidden="true" />
        <DashboardHeader report={report || { preparedBy: 'Preparing report' }} onClose={onClose} />
        {report ? <BusinessOverview report={report} /> : null}
        <section className="print-preview-studio">
          <PrintWorkspace
            report={report}
            zoom={zoom}
            status={status}
            error={error}
            documentRef={documentRef}
            onRetry={onRetry}
          />
        </section>
        <ActionDock
          onPrint={onPrint}
          onThemeToggle={onThemeToggle}
          onDownloadData={onDownloadData}
          onSettings={onSettings}
          onLogout={onLogout}
          onClose={onClose}
          onDownloadPng={downloadPng}
          zoom={zoom}
          setZoom={setZoom}
          printDisabled={status !== 'ready'}
        />
      </main>
    </div>
  );
}

import CompanyLogo from './CompanyLogo';

export default function ReportHeader({ companyName, companyLogo, companyAddress, companyPhone, companyEmail, title, preparedBy }) {
  return (
    <header className="report-header">
      <CompanyLogo logo={companyLogo} name={companyName} size="lg" />
      <div>
        <h1>{companyName}</h1>
        <h2>{title}</h2>
        <p>Generated Date: {new Date().toLocaleString()}</p>
        <p>Prepared By: {preparedBy || 'System User'}</p>
        {(companyAddress || companyPhone || companyEmail) && (
          <p className="report-company-line">{[companyAddress, companyPhone, companyEmail].filter(Boolean).join(' | ')}</p>
        )}
      </div>
    </header>
  );
}

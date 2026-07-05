import { memo } from 'react';

function CompanyLogo({ logo, name, size = 'md', className = '' }) {
  const initials = (name || 'SKY').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SKY';
  return (
    <div className={`company-logo company-logo-${size} ${className}`}>
      {logo ? <img src={logo} alt={`${name || 'Company'} logo`} decoding="async" /> : <span>{initials}</span>}
    </div>
  );
}

export default memo(CompanyLogo);

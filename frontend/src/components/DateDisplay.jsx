import { dateLabel, jalaliDateLabel } from '../utils/format';

export const DATE_DISPLAY_FORMATS = {
  PERSIAN: 'persian',
  GREGORIAN: 'gregorian',
  DUAL: 'dual'
};

export default function DateDisplay({ value, format = DATE_DISPLAY_FORMATS.DUAL, compact = false }) {
  if (!value) return compact ? null : <span className="date-empty">-</span>;

  const persian = jalaliDateLabel(value);
  const gregorian = dateLabel(value);
  const showPersian = format !== DATE_DISPLAY_FORMATS.GREGORIAN;
  const showGregorian = format !== DATE_DISPLAY_FORMATS.PERSIAN;

  return (
    <span
      className={`dual-date dual-date-${format}${compact ? ' dual-date-compact' : ''}`}
      aria-label={[showPersian && persian, showGregorian && gregorian].filter(Boolean).join(', ')}
    >
      {showPersian ? <strong className="date-primary" dir="ltr">{persian}</strong> : null}
      {showGregorian ? <small className={showPersian ? 'date-secondary' : 'date-primary date-gregorian-primary'}>{gregorian}</small> : null}
    </span>
  );
}

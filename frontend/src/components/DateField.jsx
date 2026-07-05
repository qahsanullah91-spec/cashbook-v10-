import DateDisplay from './DateDisplay';

export default function DateField({
  value,
  onChange,
  displayFormat,
  label = 'Date',
  required = false,
  className = ''
}) {
  return (
    <label className={`date-field ${className}`.trim()}>
      <span className="date-field-label">{label}</span>
      <input type="date" value={value} onChange={onChange} required={required} />
      <DateDisplay value={value} format={displayFormat} compact />
    </label>
  );
}

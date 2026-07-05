export const currency = (value, code = 'AFN') => {
  const number = Number(value || 0);
  const label = code === 'USD' ? 'USD' : 'AFN';
  const formatted = Math.abs(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${number < 0 ? '-' : ''}${label} ${formatted}`;
};

export const currencyTone = (value) => {
  const number = Number(value || 0);
  if (number > 0) return 'success';
  if (number < 0) return 'danger';
  return 'neutral';
};

export const todayInputValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const dateLabel = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const jalaliDateLabel = (value, { persianDigits = false } = {}) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const locale = persianDigits ? 'fa-IR-u-ca-persian' : 'fa-IR-u-ca-persian-nu-latn';
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}/${values.month}/${values.day}`;
};

export const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const isRTLText = (text = '') => /[\u0591-\u08FF]/.test(text);

export const compactTransactionNo = (value = '') => {
  const text = String(value);
  return text.replace(/^TX-(\d{2})(\d{6})-(\d+)$/i, 'TX-$2-$3');
};

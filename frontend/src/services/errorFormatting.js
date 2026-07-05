function fieldLabel(location) {
  if (!Array.isArray(location)) return '';
  const field = location.filter((part) => part !== 'body').at(-1);
  if (field === undefined || field === null) return '';
  return String(field)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatApiErrorDetail(detail) {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        const message = item.msg || item.message || item.detail;
        if (!message) return '';
        const field = fieldLabel(item.loc);
        return field ? `${field}: ${message}` : String(message);
      })
      .filter(Boolean);
    return messages.join('; ');
  }

  if (detail && typeof detail === 'object') {
    return formatApiErrorDetail(detail.message || detail.msg || detail.detail)
      || JSON.stringify(detail);
  }

  return '';
}

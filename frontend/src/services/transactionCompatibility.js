export function isLegacyUpdateDateError(error) {
  return error instanceof Error && error.message.includes('Date: Input should be None');
}

export function withoutTransactionDate(payload) {
  const { date: _date, ...compatiblePayload } = payload;
  return compatiblePayload;
}

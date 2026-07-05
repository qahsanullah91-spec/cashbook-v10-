const COMPANY_TYPES = new Set(['supplier', 'factory']);

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

export function buildAccountSearchIndex({ employees = [], accounts = [] }) {
  const employeeAccountIds = new Set(employees.map((employee) => employee.account_id));
  return [
    ...employees.map((employee) => ({
      key: `employee-${employee.id}`,
      group: 'Employees',
      kind: 'employee',
      name: employee.full_name,
      subtitle: employee.position || 'Employee',
      search: normalize(`${employee.full_name} ${employee.position} ${employee.department} ${employee.employee_code}`),
      employee,
      accountId: employee.account_id
    })),
    ...accounts
      .filter((account) => !employeeAccountIds.has(account.id))
      .map((account) => {
        const company = COMPANY_TYPES.has(account.account_type);
        return {
          key: `account-${account.id}`,
          group: company ? 'Companies' : 'Accounts',
          kind: company ? 'company' : 'account',
          name: account.name,
          subtitle: account.account_type || 'Account',
          search: normalize(`${account.name} ${account.account_type} ${account.phone}`),
          account,
          accountId: account.id
        };
      })
  ];
}

export function searchAccountIndex(index, query, limit = 8) {
  const needle = normalize(query);
  if (!needle) return [];
  const matches = [];
  for (const item of index) {
    const position = item.search.indexOf(needle);
    if (position < 0) continue;
    matches.push({ item, score: item.name.toLocaleLowerCase().startsWith(needle) ? 0 : position + 1 });
  }
  matches.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name));
  const selected = matches.slice(0, limit).map(({ item }) => item);
  return ['Employees', 'Companies', 'Accounts']
    .map((label) => ({ label, items: selected.filter((item) => item.group === label) }))
    .filter((group) => group.items.length);
}

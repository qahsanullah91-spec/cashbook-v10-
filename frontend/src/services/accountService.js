import { api } from './api';

export const accountService = {
  list: api.getAccounts,
  search: api.searchAccounts,
  create: api.createAccount,
  update: api.updateAccount,
  remove: api.deleteAccount,
  ledger: api.getLedger,
  balance: api.getAccountBalance
};

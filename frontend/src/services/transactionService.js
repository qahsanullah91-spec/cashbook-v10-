import { api } from './api.js';

export const transactionService = {
  list: api.getTransactions,
  create: api.createTransaction,
  update: api.updateTransaction,
  remove: api.deleteTransaction,
  summary: api.getSummary
};

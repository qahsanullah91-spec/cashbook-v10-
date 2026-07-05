import { api } from './api';

export const settingsService = {
  get: api.getSettings,
  update: api.updateSettings,
  backup: api.exportBackup,
  restore: api.importBackup,
  clear: api.clearAll
};

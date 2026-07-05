import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const documentSource = readFileSync(new URL('../components/PrintDocument.jsx', import.meta.url), 'utf8');

test('cash book print CSS uses A4 landscape printable width and content-driven pagination', () => {
  assert.match(css, /size:\s*A4 landscape/);
  assert.match(css, /max-width:\s*281mm !important/);
  assert.match(css, /\.print-table-section\s*\{[^}]*break-inside:\s*auto !important/s);
  assert.match(css, /\.print-data-table thead[^}]*display:\s*table-header-group !important/s);
});

test('cash book printable table includes the required accounting columns', () => {
  for (const label of [
    'S.No',
    'Date',
    'Account / Person / Company',
    'Detail',
    'Cash In AFN',
    'Cash Out AFN',
    'USD In',
    'USD Out',
    'Rate',
    'Balance',
    'Type'
  ]) {
    assert.match(documentSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(documentSource, /Jalali:/);
});

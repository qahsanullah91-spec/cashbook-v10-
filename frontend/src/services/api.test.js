import assert from 'node:assert/strict';
import test from 'node:test';
import { formatApiErrorDetail } from './errorFormatting.js';

test('formats FastAPI validation detail arrays into readable field messages', () => {
  const detail = [
    {
      type: 'string_too_short',
      loc: ['body', 'password'],
      msg: 'String should have at least 8 characters',
      input: 'short'
    },
    {
      type: 'missing',
      loc: ['body', 'username'],
      msg: 'Field required'
    }
  ];

  assert.equal(
    formatApiErrorDetail(detail),
    'Password: String should have at least 8 characters; Username: Field required'
  );
});

test('preserves plain server error strings', () => {
  assert.equal(formatApiErrorDetail('Invalid username or password'), 'Invalid username or password');
});

test('formats nested message objects without object coercion', () => {
  assert.equal(
    formatApiErrorDetail({ message: 'CSV row is invalid', row: 4 }),
    'CSV row is invalid'
  );
});

/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordModel } = require('../dist/modules/records/model.js');

test('empty objects inside record data are kept so assessment answers can be saved', () => {
  const attempt = recordModel('assessment-attempt').hydrate({ userId: 'u', title: 'Quiz', data: { status: 'IN_PROGRESS', answers: {} } });
  const stored = attempt.toObject({ transform: false, virtuals: false, depopulate: true });
  assert.deepEqual(stored.data.answers, {});
  const fresh = new (recordModel('assessment-attempt'))({ userId: 'u', title: 'Quiz', data: { status: 'IN_PROGRESS', answers: {} } });
  assert.deepEqual(fresh.toObject({ transform: false, virtuals: false, depopulate: true }).data.answers, {});
});

test('in-place edits to record data are persisted once the field is marked modified', () => {
  const row = recordModel('roadmap').hydrate({ userId: 'u', title: 'Plan', data: { tasks: [{ id: 't1', status: 'TODO' }] } });
  const data = row.get('data');
  data.tasks[0].status = 'COMPLETED';
  row.set('data', data);
  row.markModified('data');
  assert.equal(row.isModified('data'), true);
});

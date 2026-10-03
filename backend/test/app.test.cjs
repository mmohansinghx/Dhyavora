/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/app.js');

test('health is available while readiness accurately reports missing cloud credentials', async (t) => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).data.status, 'ALIVE');
  const ready = await fetch(`${base}/ready`);
  assert.equal(ready.status, 503);
  assert.equal((await ready.json()).data.status, 'NOT_READY');
});

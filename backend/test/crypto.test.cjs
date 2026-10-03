/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('hex');
const { createOauthState, decryptSecret, encryptSecret, getOauthStateUid, verifyOauthState } = require('../dist/modules/integrations/crypto.js');

test('OAuth state preserves Firebase UIDs containing periods and rejects tampering', () => {
  const uid = 'firebase.uid.with.periods';
  const state = createOauthState(uid);
  assert.equal(verifyOauthState(state), true);
  assert.equal(verifyOauthState(state, uid), true);
  assert.equal(getOauthStateUid(state), uid);
  assert.equal(verifyOauthState(state, 'different.uid'), false);
  assert.equal(verifyOauthState(`${state.slice(0, -1)}x`), false);
});

test('OAuth token encryption round trips without storing plaintext', () => {
  const token = 'test-access-token-only';
  const encrypted = encryptSecret(token);
  assert.notEqual(encrypted, token);
  assert.equal(decryptSecret(encrypted), token);
});

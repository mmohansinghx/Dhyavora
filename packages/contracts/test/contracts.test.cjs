const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeSkillGap, stableTaskId } = require('../dist/index.js');

test('skill gap consistently classifies missing, developing and matched skills', () => {
  assert.deepEqual(computeSkillGap([{ name: 'TypeScript', level: 'INTERMEDIATE' }, { name: 'React', level: 'ADVANCED' }], [
    { name: 'Node.js', requiredLevel: 'BEGINNER' },
    { name: 'TypeScript', requiredLevel: 'ADVANCED' },
    { name: 'React', requiredLevel: 'INTERMEDIATE' },
  ]).map(x => x.status), ['MISSING', 'DEVELOPING', 'MATCHED']);
});

test('roadmap IDs are stable for the same career and skill', () => {
  assert.equal(stableTaskId('backend', 'Node.js', 0), stableTaskId('backend', ' node.js ', 0));
});

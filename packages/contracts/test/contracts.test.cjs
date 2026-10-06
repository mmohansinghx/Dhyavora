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

const { summarizeReadiness, rankCareerMatches, buildRoadmapPlan, projectCompletion, stableTaskId: stableId } = require('../dist/index.js');

test('readiness gives partial credit for developing skills', () => {
  const gap = [
    { name: 'React', requiredLevel: 'INTERMEDIATE', currentLevel: 'BEGINNER', status: 'DEVELOPING' },
    { name: 'Testing', requiredLevel: 'BEGINNER', status: 'MISSING' },
    { name: 'JavaScript', requiredLevel: 'INTERMEDIATE', currentLevel: 'ADVANCED', status: 'MATCHED' },
  ];
  const summary = summarizeReadiness(gap);
  assert.equal(summary.readiness, 60);
  assert.equal(summary.matched, 1);
  assert.equal(summary.developing, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.stepsRemaining, 2);
  assert.equal(summarizeReadiness([]).readiness, 0);
});

test('career matches are ranked by readiness and skip careers without a skill map', () => {
  const ranked = rankCareerMatches([{ name: 'SQL', level: 'INTERMEDIATE' }], [
    { id: 'a', title: 'Frontend Engineer', requirements: [{ name: 'React', requiredLevel: 'INTERMEDIATE' }] },
    { id: 'b', title: 'Data Analyst', category: 'Data', requirements: [{ name: 'SQL', requiredLevel: 'INTERMEDIATE' }] },
    { id: 'c', title: 'Empty', requirements: [] },
  ]);
  assert.deepEqual(ranked.map((item) => item.careerId), ['b', 'a']);
  assert.equal(ranked[0].readiness, 100);
  assert.deepEqual(ranked[1].topGaps, ['React']);
});

test('roadmap plan is phased, ordered and keeps the original learn task id', () => {
  const plan = buildRoadmapPlan('career1', [
    { name: 'SQL', requiredLevel: 'INTERMEDIATE', status: 'MISSING' },
    { name: 'Python', requiredLevel: 'BEGINNER', currentLevel: 'BEGINNER', status: 'MATCHED' },
  ]);
  assert.deepEqual(plan.map((task) => task.phase), ['FOUNDATION', 'BUILD', 'PROVE']);
  assert.deepEqual(plan.map((task) => task.order), [1, 2, 3]);
  assert.equal(plan[0].id, stableId('career1', 'SQL', 0));
  assert.ok(plan.every((task) => task.skill === 'SQL' && task.estimateHours > 0));
});

test('completion projection rounds weeks up and handles empty work', () => {
  assert.deepEqual(projectCompletion(20, 8, new Date('2026-01-01T00:00:00Z')), { weeks: 3, date: '2026-01-22' });
  assert.equal(projectCompletion(0, 8), null);
});

const { skillLeverage } = require('../dist/index.js');
test('leverage lists open skills shared by several careers and skips matched ones', () => {
  const careers = [
    { title: 'A', requirements: [{ name: 'Python', requiredLevel: 'INTERMEDIATE' }, { name: 'SQL', requiredLevel: 'BEGINNER' }] },
    { title: 'B', requirements: [{ name: 'python', requiredLevel: 'BEGINNER' }, { name: 'Design', requiredLevel: 'BEGINNER' }] },
    { title: 'C', requirements: [{ name: 'SQL', requiredLevel: 'BEGINNER' }] },
  ];
  const result = skillLeverage([{ name: 'SQL', level: 'BEGINNER' }], careers);
  assert.deepEqual(result.map((item) => [item.name, item.careerCount]), [['Python', 2]]);
  assert.deepEqual(result[0].careerTitles, ['A', 'B']);
});

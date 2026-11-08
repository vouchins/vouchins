/**
 * @jest-environment node
 */

import { evaluateResumeHeuristically, sanitizeBulletText } from '@/lib/jobs/xyz-evaluator';
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';
import { computeResumeContentHash } from '@/lib/jobs/cost-guard';

describe('Deterministic ATS Resume Evaluator & Hash Guard', () => {
  it('evaluates sample resume deterministically without score fluctuation', () => {
    const eval1 = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);
    const eval2 = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);

    expect(eval1.overallScore).toBe(eval2.overallScore);
    expect(eval1.pillarScores).toEqual(eval2.pillarScores);
    expect(eval1.overallScore).toBeGreaterThanOrEqual(75);
    expect(eval1.overallScore).toBeLessThanOrEqual(95);
  });

  it('increases impact score when Google XYZ suggestions are applied', () => {
    const before = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);

    // Apply suggestion to replace weak bullet with metric-rich XYZ bullet
    const updatedResume = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    updatedResume.experience[0].bullets[2] =
      'Spearheaded automated CI/CD and developer tooling initiatives across 45+ engineers, cutting average pull request build cycle times from 28 minutes to 6 minutes (78% acceleration).';

    const after = evaluateResumeHeuristically(updatedResume);

    expect(after.pillarScores.impact).toBeGreaterThan(before.pillarScores.impact);
    expect(after.overallScore).toBeGreaterThanOrEqual(before.overallScore);
  });

  it('computes identical content hashes for unchanged resume structures', () => {
    const hash1 = computeResumeContentHash(SAMPLE_STAFF_RESUME);
    const cloned = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    const hash2 = computeResumeContentHash(cloned);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // Valid sha256 hex
  });

  it('detects document modifications and yields a different content hash', () => {
    const originalHash = computeResumeContentHash(SAMPLE_STAFF_RESUME);
    const modifiedResume = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    modifiedResume.experience[0].bullets[0] = 'Different bullet text without metrics.';

    const newHash = computeResumeContentHash(modifiedResume);
    expect(newHash).not.toBe(originalHash);
  });

  it('heals broken word hyphenation artifacts like ori-ented and distrib-uted', () => {
    const rawWithBrokenWords = sanitizeBulletText('Architected results-ori-ented microservices with distrib- uted caching.');
    expect(rawWithBrokenWords).toContain('results-oriented');
    expect(rawWithBrokenWords).toContain('distributed');
    expect(rawWithBrokenWords).not.toContain('ori-ented');
    expect(rawWithBrokenWords).not.toContain('distrib- uted');
  });

  it('preserves legitimate compound words like real-time and full-stack', () => {
    const text = sanitizeBulletText('Engineered real-time full-stack distributed systems.');
    expect(text).toContain('real-time');
    expect(text).toContain('full-stack');
  });
});

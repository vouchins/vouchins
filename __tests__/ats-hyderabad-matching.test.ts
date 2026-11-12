/**
 * @jest-environment node
 */

import { GET } from '@/app/api/jobs/route';
import { clearAtsBoardCache } from '@/lib/jobs/ats-client';
import { CURATED_TECH_JOBS } from '@/lib/jobs/curated-tech-jobs';

jest.setTimeout(15000);

describe('Hyderabad Location & Resume Tech Stack Job Matching', () => {
  beforeEach(() => {
    clearAtsBoardCache();
  });

  it('contains rich Hyderabad positions matching Java, Spring Boot, MySQL, and REST APIs', () => {
    const hydJobs = CURATED_TECH_JOBS.filter((j) => j.location.toLowerCase().includes('hyderabad'));
    expect(hydJobs.length).toBeGreaterThanOrEqual(8);

    const companies = hydJobs.map((j) => j.companyName);
    expect(companies).toContain('Oracle');
    expect(companies).toContain('ServiceNow');
    expect(companies).toContain('Microsoft');
    expect(companies).toContain('Uber');
    expect(companies).toContain('Amazon');
    expect(companies).toContain('DE Shaw');
    expect(companies).toContain('Salesforce');
    expect(companies).toContain('Qualcomm');

    const javaRoles = hydJobs.filter((j) =>
      j.matchingSkills.some((s) => s.toLowerCase() === 'java' || s.toLowerCase() === 'spring boot')
    );
    expect(javaRoles.length).toBeGreaterThanOrEqual(6);
  });

  it('GET /api/jobs returns matching jobs in Hyderabad for Java / Spring Boot candidate', async () => {
    const candidateSkills = [
      'Python',
      'SQL',
      'Data Structures',
      'DBMS',
      'MySQL',
      'Spring Boot',
      'Hibernate',
      'JDBC',
      'REST APIs',
      'Java',
    ].join(',');

    const req = new Request(
      `http://localhost:3000/api/jobs?limit=50&location=Hyderabad&skills=${encodeURIComponent(
        candidateSkills
      )}&sort=relevance`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.jobs.length).toBeGreaterThanOrEqual(8);

    // Top job should match Hyderabad
    const topJob = data.jobs[0];
    expect(topJob.location.toLowerCase()).toContain('hyderabad');
    expect(topJob.match_score).toBeGreaterThanOrEqual(90);
    expect(topJob.matching_skills.length).toBeGreaterThanOrEqual(1);
    expect(topJob.external_apply_url).toBeTruthy();

    // Verify company names are real premier employers, never placeholder
    const topCompanies = data.jobs.slice(0, 8).map((j: any) => j.company_name);
    expect(topCompanies).not.toContain('Vouchins');
    expect(topCompanies.length).toBeGreaterThanOrEqual(1);
  });

  it('honors workplace filter (hybrid vs remote) in Hyderabad', async () => {
    const candidateSkills = 'Java,Spring Boot,MySQL,SQL';
    const req = new Request(
      `http://localhost:3000/api/jobs?limit=50&location=Hyderabad&work_mode=hybrid&skills=${encodeURIComponent(
        candidateSkills
      )}`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    // All returned jobs should match hybrid work mode
    for (const job of data.jobs) {
      expect(job.workplace_type.toLowerCase()).toBe('hybrid');
    }
  });

  it('returns all location jobs for users without a resume without dummy skills filtering', async () => {
    // When a user has no resume and provides no skills, GET /api/jobs should return all jobs for Hyderabad
    // with server-side pagination, exact count, without restricting to dummy TS/React skills
    const req = new Request('http://localhost:3000/api/jobs?page=1&limit=50&location=Hyderabad');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(50);
    expect(typeof data.totalCount).toBe('number');
    expect(data.totalCount).toBeGreaterThanOrEqual(8);
    expect(data.candidateProfile.hasMasterResume).toBe(false);
    expect(data.candidateProfile.resolvedSkills).toEqual([]);
    expect(data.candidateProfile.resolvedLocation).toBe('Hyderabad');

    // All jobs in the current page should be in Hyderabad (or remote)
    expect(data.jobs.length).toBeGreaterThanOrEqual(8);
    for (const job of data.jobs) {
      const loc = job.location.toLowerCase();
      const isHyd = loc.includes('hyderabad') || loc.includes('remote') || loc.includes('anywhere');
      expect(isHyd).toBe(true);
    }

    // Honest match explanation indicates city match
    const hydJob = data.jobs.find((j: any) => j.location.toLowerCase().includes('hyderabad'));
    expect(hydJob).toBeDefined();
    expect(hydJob.why_you_match).toContain('Hyderabad');
  });
});

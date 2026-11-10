import { metadata as jobsOverviewMetadata } from '@/app/jobs/page';
import { metadata as jobsListMetadata } from '@/app/jobs/list/page';
import fs from 'fs';
import path from 'path';

describe('Jobs Hub Routing Architecture', () => {
  it('configures /jobs to load Overview tab metadata', () => {
    expect(jobsOverviewMetadata.title).toContain('Jobs Overview');
    expect(jobsOverviewMetadata.alternates?.canonical).toBe('https://www.vouchins.com/jobs');
  });

  it('configures /jobs/list to load Job Recommendations listing metadata', () => {
    expect(jobsListMetadata.title).toContain('AI Job Recommendations');
    expect(jobsListMetadata.alternates?.canonical).toBe('https://www.vouchins.com/jobs/list');
  });

  it('verifies JobsSidebar links Overview to /jobs and Jobs to /jobs/list', () => {
    const sidebarSource = fs.readFileSync(
      path.join(process.cwd(), 'components/jobs/jobs-sidebar.tsx'),
      'utf8'
    );
    expect(sidebarSource).toContain("label: 'Overview'");
    expect(sidebarSource).toContain("href: '/jobs'");
    expect(sidebarSource).toContain("label: 'Jobs'");
    expect(sidebarSource).toContain("href: '/jobs/list'");
  });

  it('verifies /jobs/dashboard redirects to /jobs', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'app/jobs/dashboard/page.tsx'),
      'utf8'
    );
    expect(dashboardSource).toContain("redirect('/jobs')");
  });

  it('verifies middleware covers /jobs, /jobs/list, and /jobs/dashboard', () => {
    const middlewareSource = fs.readFileSync(
      path.join(process.cwd(), 'middleware.ts'),
      'utf8'
    );
    expect(middlewareSource).toContain("'/jobs'");
    expect(middlewareSource).toContain("'/jobs/list'");
    expect(middlewareSource).toContain("'/jobs/dashboard'");
  });
});


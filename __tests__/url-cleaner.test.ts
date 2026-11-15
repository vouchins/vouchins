import { cleanJobApplyUrl, hasTrackingParam, isValidJobUrl } from '@/lib/jobs/url-cleaner';

describe('Job URL Sanitizer (cleanJobApplyUrl)', () => {
  it('strips utm_source from company career URLs that fail on extra parameters', () => {
    // Oracle SPA career portal
    expect(cleanJobApplyUrl('https://careers.oracle.com/jobs/229643?utm_source=vouchins')).toBe(
      'https://careers.oracle.com/jobs/229643'
    );

    // Qualcomm Workday WD5 portal
    expect(
      cleanJobApplyUrl(
        'https://qualcomm.wd5.myworkdayjobs.com/External/job/Hyderabad/Senior-Backend-Engineer_30192?utm_source=vouchins'
      )
    ).toBe(
      'https://qualcomm.wd5.myworkdayjobs.com/External/job/Hyderabad/Senior-Backend-Engineer_30192'
    );

    // Uber Careers
    expect(
      cleanJobApplyUrl('https://www.uber.com/global/en/careers/list/89312/?utm_source=freehire')
    ).toBe('https://www.uber.com/global/en/careers/list/89312/');

    // ServiceNow
    expect(
      cleanJobApplyUrl('https://careers.servicenow.com/jobs/7439999812903?utm_source=vouchins')
    ).toBe('https://careers.servicenow.com/jobs/7439999812903');

    // Microsoft
    expect(
      cleanJobApplyUrl('https://careers.microsoft.com/us/en/job/184920?utm_source=test')
    ).toBe('https://careers.microsoft.com/us/en/job/184920');
  });

  it('strips all utm parameters (medium, campaign, term, content, id)', () => {
    const dirtyUrl =
      'https://jobs.lever.co/company/abc-123?utm_source=vouchins&utm_medium=cpc&utm_campaign=summer&utm_term=engineer&utm_content=button';
    expect(cleanJobApplyUrl(dirtyUrl)).toBe('https://jobs.lever.co/company/abc-123');
  });

  it('preserves legitimate non-tracking query parameters', () => {
    // Greenhouse requisition ID
    const greenhouseUrl =
      'https://boards.greenhouse.io/stripe/jobs/123456?gh_jid=123456&utm_source=vouchins';
    expect(cleanJobApplyUrl(greenhouseUrl)).toBe(
      'https://boards.greenhouse.io/stripe/jobs/123456?gh_jid=123456'
    );

    // Multi-param with utm_source in the middle
    const multiParam =
      'https://example.com/careers?lang=en&utm_source=vouchins&jobId=98765';
    expect(cleanJobApplyUrl(multiParam)).toBe(
      'https://example.com/careers?lang=en&jobId=98765'
    );
  });

  it('cleans utm parameters appended after or inside hash fragments', () => {
    expect(
      cleanJobApplyUrl('https://careers.microsoft.com/job/184920#apply?utm_source=vouchins')
    ).toBe('https://careers.microsoft.com/job/184920#apply');
  });

  it('handles null, undefined, and empty string safely', () => {
    expect(cleanJobApplyUrl(null)).toBe('');
    expect(cleanJobApplyUrl(undefined)).toBe('');
    expect(cleanJobApplyUrl('')).toBe('');
    expect(cleanJobApplyUrl('   ')).toBe('');
  });

  describe('hasTrackingParam', () => {
    it('detects tracking parameters accurately', () => {
      expect(hasTrackingParam('https://example.com?utm_source=vouchins')).toBe(true);
      expect(hasTrackingParam('https://example.com/jobs/123')).toBe(false);
      expect(hasTrackingParam(null)).toBe(false);
    });
  });

  describe('isValidJobUrl', () => {
    it('approves legitimate corporate career portal URLs', () => {
      expect(isValidJobUrl('https://careers.google.com/jobs/results/12345')).toBe(true);
      expect(isValidJobUrl('https://oracle.wd5.myworkdayjobs.com/External/job/123')).toBe(true);
      expect(isValidJobUrl('http://careers.microsoft.com/job/456')).toBe(true);
    });

    it('rejects malformed, javascript, anchor, or localhost URLs', () => {
      expect(isValidJobUrl('')).toBe(false);
      expect(isValidJobUrl(null)).toBe(false);
      expect(isValidJobUrl(undefined)).toBe(false);
      expect(isValidJobUrl('javascript:void(0)')).toBe(false);
      expect(isValidJobUrl('#apply')).toBe(false);
      expect(isValidJobUrl('http://localhost:3000/job/1')).toBe(false);
      expect(isValidJobUrl('not-a-valid-url')).toBe(false);
    });

    it('rejects dead third-party job aggregator URLs and root domains without paths', () => {
      // Third-party aggregators
      expect(isValidJobUrl('https://www.hirist.tech/j/mern-stack-developer-1682760')).toBe(false);
      expect(isValidJobUrl('https://www.hirist.com/j/react-lead-123')).toBe(false);
      expect(isValidJobUrl('https://www.naukri.com/job-listings-frontend-engineer-12345')).toBe(false);
      expect(isValidJobUrl('https://www.shine.com/jobs/lead-developer/98765')).toBe(false);
      expect(isValidJobUrl('https://www.foundit.in/job/software-engineer-54321')).toBe(false);
      expect(isValidJobUrl('https://in.indeed.com/viewjob?jk=abcdef')).toBe(false);

      // Generic root domain homepages without specific job requisitions
      expect(isValidJobUrl('https://oracle.com')).toBe(false);
      expect(isValidJobUrl('https://www.microsoft.com/')).toBe(false);

      // Google search fallback links
      expect(isValidJobUrl('https://www.google.com/search?q=oracle+jobs')).toBe(false);
    });
  });
});


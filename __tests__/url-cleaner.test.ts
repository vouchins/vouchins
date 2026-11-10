import { cleanJobApplyUrl, hasTrackingParam } from '@/lib/jobs/url-cleaner';

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
});


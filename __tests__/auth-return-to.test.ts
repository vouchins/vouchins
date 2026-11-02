import { sanitizeReturnTo } from '@/lib/auth/return-to';

describe('sanitizeReturnTo security & redirection utility', () => {
  it('allows safe internal relative paths', () => {
    expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard');
    expect(sanitizeReturnTo('/jobs/dashboard')).toBe('/jobs/dashboard');
    expect(sanitizeReturnTo('/feed')).toBe('/feed');
    expect(sanitizeReturnTo('/resume')).toBe('/resume');
    expect(sanitizeReturnTo('/jobs/recommend?id=123')).toBe('/jobs/recommend?id=123');
  });

  it('rejects protocol-relative open redirect attacks', () => {
    expect(sanitizeReturnTo('//evil.com')).toBeNull();
    expect(sanitizeReturnTo('//attacker.org/dashboard')).toBeNull();
    expect(sanitizeReturnTo('///evil.com')).toBeNull();
  });

  it('allows official Jobs subdomain URLs', () => {
    expect(sanitizeReturnTo('https://jobs.vouchins.com/dashboard')).toBe(
      'https://jobs.vouchins.com/dashboard'
    );
    expect(sanitizeReturnTo('https://jobs.vouchins.com/resume')).toBe(
      'https://jobs.vouchins.com/resume'
    );
    expect(sanitizeReturnTo('http://jobs.localhost:3000/dashboard')).toBe(
      'http://jobs.localhost:3000/dashboard'
    );
    expect(sanitizeReturnTo('http://localhost:3000/dashboard')).toBe(
      'http://localhost:3000/dashboard'
    );
  });

  it('blocks untrusted third-party domains', () => {
    expect(sanitizeReturnTo('https://evil.com/dashboard')).toBeNull();
    expect(sanitizeReturnTo('https://attacker-jobpass.vouchins.com')).toBeNull();
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnTo('data:text/html,evil')).toBeNull();
  });

  it('handles null, undefined, and non-string inputs safely', () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo('')).toBeNull();
    expect(sanitizeReturnTo('   ')).toBeNull();
  });
});

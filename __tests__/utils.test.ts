import { isValidDomain, cn } from '@/lib/utils';
import { isValidLinkedInUrl, normalizeLinkedInUrl, LINKEDIN_URL_PREFIX } from '@/lib/auth/validation';

describe('Utility Functions', () => {
  describe('isValidDomain', () => {
    it('should return true for valid domains', () => {
      expect(isValidDomain('google.com')).toBe(true);
      expect(isValidDomain('www.google.com')).toBe(true);
      expect(isValidDomain('https://google.com')).toBe(true);
      expect(isValidDomain('http://www.google.com')).toBe(true);
      expect(isValidDomain('sub.domain.co.uk')).toBe(true);
      expect(isValidDomain('my-domain.org')).toBe(true);
    });

    it('should return false for invalid domains', () => {
      expect(isValidDomain('invalid')).toBe(false);
      expect(isValidDomain('invalid.')).toBe(false);
      expect(isValidDomain('.invalid.com')).toBe(false);
      expect(isValidDomain('invalid..com')).toBe(false);
      expect(isValidDomain('my_domain.com')).toBe(false); // underscores not allowed in domains usually
    });
  });

  describe('LinkedIn URL Validation', () => {
    it('should return true for valid LinkedIn URLs', () => {
      expect(isValidLinkedInUrl('https://www.linkedin.com/in/satyanadella')).toBe(true);
      expect(isValidLinkedInUrl('https://linkedin.com/in/sundarpichai')).toBe(true);
      expect(isValidLinkedInUrl('https://in.linkedin.com/in/user-profile-123')).toBe(true);
      expect(isValidLinkedInUrl('linkedin.com/in/username')).toBe(true);
      expect(isValidLinkedInUrl('www.linkedin.com/company/google')).toBe(true);
    });

    it('should return false for empty or prefix-only LinkedIn inputs', () => {
      expect(isValidLinkedInUrl('')).toBe(false);
      expect(isValidLinkedInUrl(LINKEDIN_URL_PREFIX)).toBe(false);
      expect(isValidLinkedInUrl('https://linkedin.com/')).toBe(false);
      expect(isValidLinkedInUrl('https://www.linkedin.com/')).toBe(false);
      expect(isValidLinkedInUrl('https://facebook.com/username')).toBe(false);
      expect(isValidLinkedInUrl('not-a-url')).toBe(false);
    });

    it('should correctly normalize LinkedIn URLs', () => {
      expect(normalizeLinkedInUrl('linkedin.com/in/user')).toBe('https://linkedin.com/in/user');
      expect(normalizeLinkedInUrl('https://www.linkedin.com/in/user')).toBe('https://www.linkedin.com/in/user');
      expect(normalizeLinkedInUrl(LINKEDIN_URL_PREFIX)).toBe('');
      expect(normalizeLinkedInUrl('')).toBe('');
    });
  });

  describe('cn (Tailwind Merge)', () => {
    it('should merge tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('p-4 p-8')).toBe('p-8'); // Tailwind merge should prefer the latter
      expect(cn('text-black', undefined, null, false, 'bg-white')).toBe('text-black bg-white');
    });
  });
});

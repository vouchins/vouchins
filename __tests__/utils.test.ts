import { isValidDomain, cn } from '@/lib/utils';

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

  describe('cn (Tailwind Merge)', () => {
    it('should merge tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('p-4 p-8')).toBe('p-8'); // Tailwind merge should prefer the latter
      expect(cn('text-black', undefined, null, false, 'bg-white')).toBe('text-black bg-white');
    });
  });
});

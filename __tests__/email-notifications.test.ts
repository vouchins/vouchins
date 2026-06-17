import { getTargetNotificationEmail } from '@/lib/email-notifications';

describe('getTargetNotificationEmail', () => {
  const company = { domain: 'acme.com' };

  describe('When personal_email is provided', () => {
    it('should return personal_email if it does not contain the company domain', () => {
      const recipient = {
        email: 'employee@acme.com',
        personal_email: 'user.personal@gmail.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBe('user.personal@gmail.com');
    });

    it('should return null if personal_email contains the company domain name', () => {
      const recipient = {
        email: 'employee@acme.com',
        personal_email: 'employee.acme@acme.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBeNull();
    });

    it('should return null if personal_email contains company domain as a substring', () => {
      const recipient = {
        email: 'employee@acme.com',
        personal_email: 'acme.com-hacker@gmail.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBeNull();
    });
  });

  describe('When personal_email is empty/missing', () => {
    it('should return primary email if primary email is a known personal domain and not the company domain', () => {
      const recipient = {
        email: 'user.login@gmail.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBe('user.login@gmail.com');
    });

    it('should return null if primary email contains the company domain name', () => {
      const recipient = {
        email: 'employee@acme.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBeNull();
    });

    it('should return null if primary email belongs to a corporate domain (not in PERSONAL_EMAIL_DOMAINS)', () => {
      const recipient = {
        email: 'employee@othercorp.com',
        company,
      };
      expect(getTargetNotificationEmail(recipient)).toBeNull();
    });
  });

  describe('Handling Edge Cases and different structures', () => {
    it('should handle company as an array of companies correctly', () => {
      const recipient = {
        email: 'employee@acme.com',
        personal_email: 'user@acme.com',
        company: [{ domain: 'acme.com' }],
      };
      expect(getTargetNotificationEmail(recipient)).toBeNull();
    });

    it('should handle company as null or undefined without throwing errors', () => {
      const recipientPersonal = {
        email: 'user@google.com',
        personal_email: 'user.personal@gmail.com',
        company: null,
      };
      expect(getTargetNotificationEmail(recipientPersonal)).toBe('user.personal@gmail.com');

      const recipientCorpOnly = {
        email: 'user@google.com',
        company: null,
      };
      expect(getTargetNotificationEmail(recipientCorpOnly)).toBeNull();
    });
  });
});

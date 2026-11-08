/**
 * @jest-environment node
 */

let mockResumeData: any = null;
let mockUserData: any = null;

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => {
      if (table === 'job_resumes') {
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          neq: jest.fn(() => chain),
          ilike: jest.fn(() => chain),
          order: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          maybeSingle: jest.fn().mockImplementation(() =>
            Promise.resolve({
              data: mockResumeData,
              error: null,
            })
          ),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({
              data: mockResumeData,
              error: mockResumeData ? null : new Error('Not found'),
            })
          ),
        };
        return chain;
      }

      if (table === 'users') {
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          ilike: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          maybeSingle: jest.fn().mockImplementation(() =>
            Promise.resolve({
              data: mockUserData,
              error: null,
            })
          ),
        };
        return chain;
      }

      return {};
    }),
  },
}));

import { GET as getShareableResume } from '@/app/api/resume/share/[id]/route';

describe('Shareable Resume Functionality', () => {
  beforeEach(() => {
    mockResumeData = null;
    mockUserData = null;
  });

  describe('GET /api/resume/share/[id]', () => {
    it('returns 404 when resume ID does not exist', async () => {
      mockResumeData = null;

      const req = new Request('http://localhost:3000/api/resume/share/non-existent-id');
      const res = await getShareableResume(req, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Resume not found');
    });

    it('returns 200 with resume document when resume exists', async () => {
      mockResumeData = {
        id: 'res-12345',
        user_id: 'user-abc',
        title: 'Senior Backend Engineer Resume',
        document_schema: {
          contact: {
            fullName: 'Taher Shaik',
            email: 'taher@example.com',
            phone: '+91 9876543210',
            location: 'Hyderabad, India',
            linkedinUrl: 'https://linkedin.com/in/tshaik',
          },
          summary: 'Experienced Backend Engineer specializing in high-throughput distributed systems.',
          experience: [
            {
              id: 'exp-1',
              company: 'Vouchins Tech',
              roleTitle: 'Senior Software Engineer',
              startDate: '2023',
              endDate: 'Present',
              bullets: [
                'Architected high-scale REST APIs reducing latency by 42%.',
              ],
            },
          ],
          education: [
            {
              id: 'edu-1',
              institution: 'Osmania University',
              degree: 'Bachelor of Technology in Computer Science',
              endDate: '2022',
            },
          ],
          skills: [
            {
              category: 'Backend',
              items: ['Java', 'Spring Boot', 'MySQL', 'REST APIs'],
            },
          ],
        },
        raw_text: null,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-08T00:00:00Z',
      };

      const req = new Request('http://localhost:3000/api/resume/share/res-12345');
      const res = await getShareableResume(req, {
        params: Promise.resolve({ id: 'res-12345' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.resume.id).toBe('res-12345');
      expect(json.resume.title).toBe('Senior Backend Engineer Resume');
      expect(json.resume.document.contact.fullName).toBe('Taher Shaik');
      expect(json.resume.document.experience.length).toBe(1);
      expect(json.resume.document.skills[0].items).toContain('Spring Boot');
    });

    it('enriches candidate full name from user profile when missing in schema', async () => {
      mockResumeData = {
        id: 'res-needs-enrichment',
        user_id: 'user-profile-99',
        title: 'Master Resume',
        document_schema: {
          contact: {
            fullName: '',
            email: '',
          },
          experience: [],
          education: [],
          skills: [],
        },
        raw_text: null,
      };

      mockUserData = {
        full_name: 'Verified Admin User',
        email: 'admin@vouchins.com',
        city: 'Hyderabad',
      };

      const req = new Request('http://localhost:3000/api/resume/share/res-needs-enrichment');
      const res = await getShareableResume(req, {
        params: Promise.resolve({ id: 'res-needs-enrichment' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.resume.document.contact.fullName).toBe('Verified Admin User');
      expect(json.resume.document.contact.email).toBe('admin@vouchins.com');
      expect(json.resume.document.contact.location).toBe('Hyderabad');
    });

    it('returns isVerified: true for verified candidate accounts', async () => {
      mockResumeData = {
        id: 'res-verified-user',
        user_id: 'user-verified-1',
        title: 'Verified Candidate Resume',
        document_schema: {
          contact: { fullName: 'Taher Shaik' },
        },
      };

      mockUserData = {
        id: 'user-verified-1',
        full_name: 'Taher Shaik',
        is_verified: true,
        is_admin: false,
      };

      const req = new Request('http://localhost:3000/api/resume/share/res-verified-user');
      const res = await getShareableResume(req, {
        params: Promise.resolve({ id: 'res-verified-user' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.resume.isVerified).toBe(true);
    });

    it('returns isVerified: false for unverified candidate accounts', async () => {
      mockResumeData = {
        id: 'res-unverified-user',
        user_id: 'user-unverified-2',
        title: 'Unverified Candidate Resume',
        document_schema: {
          contact: { fullName: 'Guest User' },
        },
      };

      mockUserData = {
        id: 'user-unverified-2',
        full_name: 'Guest User',
        is_verified: false,
        is_admin: false,
      };

      const req = new Request('http://localhost:3000/api/resume/share/res-unverified-user');
      const res = await getShareableResume(req, {
        params: Promise.resolve({ id: 'res-unverified-user' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.resume.isVerified).toBe(false);
    });
  });
});


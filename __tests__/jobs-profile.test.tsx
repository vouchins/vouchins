import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobsProfilePage from '@/app/jobs/profile/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/jobs/profile',
  useSearchParams: () => new URLSearchParams(),
}));
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';

// Mock user provider
jest.mock('@/components/user-provider', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
      full_name: 'Shaik Taher',
      email: 'shaik.t30@gmail.com',
      city: 'San Francisco, CA',
      phone_number: '+1 555 123 4567',
      linkedin_url: 'https://linkedin.com/in/john-doe',
      is_verified: true,
      vouch_points: 100,
    },
    loading: false,
  }),
}));

// Mock client cache
jest.mock('@/lib/jobs/client-cache', () => {
  const { SAMPLE_STAFF_RESUME } = require('@/components/jobs/sample-resumes');
  return {
    fetchCachedResumes: jest.fn().mockResolvedValue({
      resumes: [
        {
          id: 'res-1',
          name: 'Master Software Engineer Resume',
          isPrimary: true,
          document: SAMPLE_STAFF_RESUME,
          evaluation: { overallScore: 88, targetRole: 'Staff Software Engineer' },
        },
      ],
      latestScore: 88,
    }),
  };
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        user: {
          full_name: 'Shaik Taher',
          city: 'San Francisco, CA',
          linkedin_url: 'https://linkedin.com/in/john-doe',
        },
        document: SAMPLE_STAFF_RESUME,
      }),
  })
) as jest.Mock;

describe('JobsProfilePage Component', () => {
  it('renders header, privacy banner, and candidate name', async () => {
    render(<JobsProfilePage />);

    expect(screen.getByText('PROFILE')).toBeInTheDocument();
    expect(screen.getByText('Your profile data is kept private and secure.')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Shaik Taher')).toBeInTheDocument();
    });
  });

  it('renders navigation tabs matching Jobright layout', async () => {
    render(<JobsProfilePage />);

    expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Education' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work Experience' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equal Employment' })).toBeInTheDocument();
  });

  it('renders Education and Work Experience timelines', async () => {
    render(<JobsProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Education' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Work Experience' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument();
    });
  });

  it('renders right sidebar action cards and hides Complete Profile and LinkedIn Import when already complete', async () => {
    render(<JobsProfilePage />);

    await waitFor(() => {
      // Since default document has personal info, education, experience, and skills, Complete Profile is hidden
      expect(screen.queryByText('Complete Profile')).not.toBeInTheDocument();
      expect(screen.getByText('Manage My Resume')).toBeInTheDocument();
      expect(screen.getByText('Master Resume')).toBeInTheDocument();
      // Import from LinkedIn option is hidden when user already has a resume or complete profile
      expect(screen.queryByText('Import from LinkedIn')).not.toBeInTheDocument();
    });
  });

  it('shows Complete Profile alert and Import from LinkedIn when candidate has no resume and incomplete profile', async () => {
    const { fetchCachedResumes } = require('@/lib/jobs/client-cache');
    fetchCachedResumes.mockResolvedValueOnce({ resumes: [], latestScore: null });

    // Mock fetch to return an incomplete document missing education and experience
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          user: {
            full_name: 'New Candidate',
            city: '',
            linkedin_url: '',
          },
          document: {
            contact: { fullName: '', email: '', location: '' },
            education: [],
            experience: [],
            skills: [],
          },
        }),
    });

    render(<JobsProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Complete Profile')).toBeInTheDocument();
      expect(screen.getByText('Import from LinkedIn')).toBeInTheDocument();
    });

    // Clicking opens the LinkedIn PDF import dialog
    const importBtn = screen.getByRole('button', { name: /import linkedin/i });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText(/How to download your official LinkedIn PDF/i)).toBeInTheDocument();
    });
  });

  it('scrolls to relevant section when a tab is clicked', async () => {
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(<JobsProfilePage />);

    const eduTab = screen.getByRole('button', { name: 'Education' });
    fireEvent.click(eduTab);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('hides the Complete Profile section when user profile is already complete', async () => {
    const { useUser } = require('@/components/user-provider');
    const originalUseUser = useUser;

    // Temporarily mock a user with is_profile_complete: true
    jest.spyOn(require('@/components/user-provider'), 'useUser').mockReturnValue({
      user: {
        id: 'complete-user-123',
        full_name: 'Shaik Taher',
        email: 'shaik.t30@gmail.com',
        city: 'San Francisco, CA',
        phone_number: '+1 555 123 4567',
        linkedin_url: 'https://linkedin.com/in/john-doe',
        is_verified: true,
        vouch_points: 100,
        is_profile_complete: true,
        profile_completion_percentage: 100,
      },
      loading: false,
    });

    render(<JobsProfilePage />);

    await waitFor(() => {
      expect(screen.queryByText('Complete Profile')).not.toBeInTheDocument();
      expect(screen.getByText('Manage My Resume')).toBeInTheDocument();
      expect(screen.queryByText('Import from LinkedIn')).not.toBeInTheDocument();
    });
  });

  it('displays empty states and marks profile incomplete without John Doe data when no resume is uploaded', async () => {
    // Mock API returning null document and client cache returning empty resumes
    const { fetchCachedResumes } = require('@/lib/jobs/client-cache');
    fetchCachedResumes.mockResolvedValueOnce({ resumes: [], latestScore: null });

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            user: {
              full_name: 'Shaik Taher',
              city: 'San Francisco, CA',
            },
            document: null,
          }),
      })
    );

    render(<JobsProfilePage />);

    await waitFor(() => {
      // Must NOT display John Doe mock positions
      expect(screen.queryByText('Apex Cloud Systems')).not.toBeInTheDocument();
      expect(screen.queryByText('Staff Systems Architect')).not.toBeInTheDocument();
      expect(screen.queryByText('University of Washington')).not.toBeInTheDocument();

      // Must display clean empty states with Add buttons
      expect(screen.getByText('No education added yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Education' })).toBeInTheDocument();
      expect(screen.getByText('No work experience added yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Work Experience' })).toBeInTheDocument();
      expect(screen.getByText('No skills cataloged yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Skills' })).toBeInTheDocument();
    });
  });
});

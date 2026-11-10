import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { JobsOverviewDashboard } from '@/components/jobs/jobs-overview';

let mockUser: any = null;
let mockResumesData: any = { resumes: [], latestScore: null };

jest.mock('@/components/user-provider', () => ({
  useUser: () => ({
    user: mockUser,
    loading: false,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/jobs',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/jobs/client-cache', () => ({
  fetchCachedResumes: jest.fn(() => Promise.resolve(mockResumesData)),
  fetchCachedJobs: jest.fn(() => Promise.resolve([])),
}));

describe('JobsOverviewDashboard User Greeting Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Welcome to Vouchins Jobs" and sign-in button for unauthenticated users', async () => {
    mockUser = null;
    mockResumesData = { resumes: [], latestScore: null };

    render(<JobsOverviewDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Vouchins Jobs');
    });

    expect(screen.getByText(/Discover high-impact engineering opportunities/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In to Get Started/i })).toBeInTheDocument();
  });

  it('renders "Welcome to Vouchins Jobs, {name}" for new logged-in users who have no resume yet', async () => {
    mockUser = {
      id: 'user-new',
      full_name: 'Shaik Taher',
      email: 'shaik@vouchins.com',
    };
    mockResumesData = { resumes: [], latestScore: null };

    render(<JobsOverviewDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Vouchins Jobs, Shaik');
    });

    expect(screen.getByText(/Get started by adding your Master Resume/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Upload Master Resume/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Welcome back, {name}" for returning logged-in users with an active resume', async () => {
    mockUser = {
      id: 'user-returning',
      full_name: 'Shaik Taher',
      email: 'shaik@vouchins.com',
    };
    mockResumesData = {
      resumes: [
        {
          id: 'res-primary',
          name: 'Master Resume',
          isPrimary: true,
          document: {},
        },
      ],
      latestScore: 92,
    };

    render(<JobsOverviewDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Shaik');
    });

    expect(screen.getByText(/Your Master Resume is active/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Master Resume Studio/i })).toBeInTheDocument();
  });
});


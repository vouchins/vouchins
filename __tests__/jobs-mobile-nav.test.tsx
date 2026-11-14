import { render, screen } from '@testing-library/react';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/jobs/list'),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
}));

// Mock User Provider
jest.mock('@/components/user-provider', () => ({
  useUser: jest.fn().mockReturnValue({
    user: {
      id: 'test-user-id',
      email: 'candidate@vouchins.com',
      full_name: 'Test Candidate',
      avatar_url: '',
    },
  }),
}));

describe('Jobs Mobile Navigation Bar (components/jobs/jobs-sidebar)', () => {
  it('renders Coaching item in the mobile bottom navigation bar', () => {
    render(<JobsSidebar activeTab="jobs" />);

    const mobileNav = screen.getByLabelText('Jobs mobile navigation');
    expect(mobileNav).toBeInTheDocument();

    // Verify all 7 navigation tabs are present in mobile bottom bar
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jobs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Resume').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Coaching').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Interview').length).toBeGreaterThanOrEqual(1);

    // Verify Coaching links to /jobs/skills-development
    const coachingLinks = screen.getAllByRole('link', { name: /Coaching/i });
    expect(coachingLinks.some((l) => l.getAttribute('href') === '/jobs/skills-development')).toBe(true);
  });

  it('highlights Coaching tab when activeTab="coaching"', () => {
    render(<JobsSidebar activeTab="coaching" />);

    const mobileNav = screen.getByLabelText('Jobs mobile navigation');
    expect(mobileNav).toBeInTheDocument();

    const coachingMobileLink = mobileNav.querySelector('a[href="/jobs/skills-development"]');
    expect(coachingMobileLink).toBeTruthy();
    expect(coachingMobileLink?.className).toContain('text-[#0A1B5C]');
  });

  it('hides mobile navigation when hideMobileNav is true', () => {
    render(<JobsSidebar activeTab="jobs" hideMobileNav={true} />);

    const mobileNav = screen.queryByLabelText('Jobs mobile navigation');
    expect(mobileNav).not.toBeInTheDocument();
  });
});


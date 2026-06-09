import { render, screen } from '@testing-library/react';
import { MobileNav } from '@/components/mobile-nav';

// 1. Mock Next.js Navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/feed'),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
  useSearchParams: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(''),
  }),
}));

// 2. Mock CreatePostDialog component to isolate MobileNav testing
jest.mock('@/components/create-post-dialog', () => ({
  CreatePostDialog: () => <div data-testid="mock-create-post-dialog" />,
}));

describe('Frontend MobileNav Component (components/mobile-nav)', () => {
  const mockUser = {
    id: 'user-1',
    full_name: 'Test User',
    city: 'Hyderabad',
    company: { name: 'Test Co', domain: 'test.com' },
    is_admin: false,
    is_verified: true,
  };

  it('should render the selected city label when provided', () => {
    render(
      <MobileNav
        user={mockUser}
        onOpenCreatePost={jest.fn()}
        setActiveTab={jest.fn()}
        selectedCity="All Cities"
      />
    );
    expect(screen.getByText('All Cities')).toBeInTheDocument();
  });

  it('should fallback to user.city if selectedCity is not specified', () => {
    render(
      <MobileNav
        user={mockUser}
        onOpenCreatePost={jest.fn()}
        setActiveTab={jest.fn()}
      />
    );
    expect(screen.getByText('Hyderabad')).toBeInTheDocument();
  });

  it('should render "City" if selectedCity is not specified and user.city is missing', () => {
    const userWithoutCity = {
      ...mockUser,
      city: '',
    };
    render(
      <MobileNav
        user={userWithoutCity}
        onOpenCreatePost={jest.fn()}
        setActiveTab={jest.fn()}
      />
    );
    expect(screen.getByText('City')).toBeInTheDocument();
  });
});

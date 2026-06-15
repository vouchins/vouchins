import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCompletionWidget } from '@/components/profile-completion-widget';
import { ProfileCompletionDialog } from '@/components/profile-completion-dialog';

// 1. Mock Next.js Navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
}));

// 2. Mock Supabase Browser client
jest.mock('@/lib/supabase/browser', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url/avatar.jpg' } }),
      }),
    },
  },
}));

// 3. Mock the useUser hook
const mockRefetch = jest.fn();
let mockUser: any = null;

jest.mock('@/components/user-provider', () => ({
  useUser: () => ({
    user: mockUser,
    refetch: mockRefetch,
  }),
}));

describe('ProfileCompletionWidget Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when user is not logged in', () => {
    mockUser = null;
    const { container } = render(<ProfileCompletionWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when profile is already 100% complete', () => {
    mockUser = {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@vouchins.com',
      city: 'Hyderabad',
      vouch_points: 100,
      is_admin: false,
      is_verified: true,
      is_profile_complete: true,
      profile_completion_percentage: 100,
      avatar_url: 'https://mock.url/avatar.jpg',
      linkedin_url: 'https://linkedin.com/in/username',
      phone_number: '+919876543210',
    };

    const { container } = render(<ProfileCompletionWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders widget when profile is incomplete', () => {
    mockUser = {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@vouchins.com',
      city: 'Hyderabad',
      vouch_points: 0,
      is_admin: false,
      is_verified: false,
      is_profile_complete: false,
      profile_completion_percentage: 25,
      avatar_url: 'https://mock.url/avatar.jpg',
      linkedin_url: '',
      phone_number: '',
    };

    render(<ProfileCompletionWidget />);

    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Add Profile Picture')).toBeInTheDocument();
    expect(screen.getByText('Add LinkedIn URL')).toBeInTheDocument();
    expect(screen.getByText('Add Phone Number')).toBeInTheDocument();
    expect(screen.getByText('Verify Company Email')).toBeInTheDocument();
  });
});

describe('ProfileCompletionDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@vouchins.com',
      city: 'Hyderabad',
      vouch_points: 25,
      is_admin: false,
      is_verified: false,
      is_profile_complete: false,
      profile_completion_percentage: 25,
      avatar_url: 'https://mock.url/avatar.jpg',
      linkedin_url: '',
      phone_number: '',
    };
  });

  it('renders inline percentage badge next to the title without overlap', () => {
    render(<ProfileCompletionDialog isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Profile Setup')).toBeInTheDocument();
    const percentBadge = screen.getByText('25%');
    expect(percentBadge).toBeInTheDocument();
    // Verify it uses the badge style
    expect(percentBadge.className).toContain('bg-primary/10');
  });

  it('renders correct LinkedIn tab specific messaging and does not contain old privacy clutter', () => {
    render(<ProfileCompletionDialog isOpen={true} onClose={jest.fn()} initialTab="linkedin" />);

    // Check specific text is present
    expect(screen.getByText('Add linkedin url and get 25 Vouch points')).toBeInTheDocument();

    // Check that the old privacy clutter description is NOT in the document
    expect(screen.queryByText('Your URL remains strictly private and encrypted.')).not.toBeInTheDocument();
  });
});

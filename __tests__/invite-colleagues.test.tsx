import { render, screen } from '@testing-library/react';

// Mock Supabase Browser client BEFORE importing components that use it
jest.mock('@/lib/supabase/browser', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  },
}));

import { getHighestBadge } from '@/app/users/[id]/page';
import { InviteDialog } from '@/components/invite-dialog';

// Mock Sonner Toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Day 5: Invite Colleagues 2.0 Badge Logic', () => {
  it('returns null for counts below 5', () => {
    expect(getHighestBadge(0)).toBeNull();
    expect(getHighestBadge(4)).toBeNull();
  });

  it('returns Community Builder badge for counts between 5 and 24', () => {
    expect(getHighestBadge(5)).toEqual({ name: 'Community Builder', icon: '🌱' });
    expect(getHighestBadge(24)).toEqual({ name: 'Community Builder', icon: '🌱' });
  });

  it('returns Network Catalyst badge for counts between 25 and 49', () => {
    expect(getHighestBadge(25)).toEqual({ name: 'Network Catalyst', icon: '🚀' });
    expect(getHighestBadge(49)).toEqual({ name: 'Network Catalyst', icon: '🚀' });
  });

  it('returns Founding Connector badge for counts 50 or above', () => {
    expect(getHighestBadge(50)).toEqual({ name: 'Founding Connector', icon: '🏆' });
    expect(getHighestBadge(100)).toEqual({ name: 'Founding Connector', icon: '🏆' });
  });
});

describe('InviteDialog Component', () => {
  it('renders correctly when open', () => {
    render(
      <InviteDialog isOpen={true} onClose={jest.fn()} userId="test-user-id" />
    );

    expect(screen.getByText('Invite Colleagues')).toBeInTheDocument();
    expect(screen.getByText('Grow the Network')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/signup\?invite=test-user-id/)).toBeInTheDocument();
  });
});

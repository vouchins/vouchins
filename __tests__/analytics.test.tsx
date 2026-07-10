import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import posthog from 'posthog-js';
import { FeedSearch } from '@/components/feed-search';
import { InviteDialog } from '@/components/invite-dialog';

// Mock posthog-js
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: jest.fn(),
    init: jest.fn(),
    startSessionRecording: jest.fn(),
  },
}));

// Mock Sonner Toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PostHog Analytics Events Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FeedSearch Tracking', () => {
    it('captures Search Started and Search Query when a search is submitted', () => {
      const mockOnSearch = jest.fn();
      render(<FeedSearch onSearch={mockOnSearch} />);

      const input = screen.getByPlaceholderText(/Search housing, recommendations/);
      fireEvent.change(input, { target: { value: 'remote jobs' } });

      const searchButton = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith('remote jobs');
      expect(posthog.capture).toHaveBeenCalledWith('Search Started');
      expect(posthog.capture).toHaveBeenCalledWith('Search Query', { query: 'remote jobs' });
    });
  });

  describe('InviteDialog Tracking', () => {
    it('captures Invite Sent with clipboard method when copy button is clicked', async () => {
      // Mock navigator.clipboard
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });
      // Mock window.isSecureContext
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true,
      });

      render(<InviteDialog isOpen={true} onClose={jest.fn()} userId="test-user-id" />);

      const copyButton = screen.getByRole('button', { name: /Copy/ });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/signup?invite=test-user-id')
        );
      });
      expect(posthog.capture).toHaveBeenCalledWith('Invite Sent', { method: 'clipboard' });
    });
  });
});

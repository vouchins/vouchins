import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { JobRecommendationsDashboard } from '@/components/jobs/recommend-dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/jobs',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/components/user-provider', () => ({
  useUser: () => ({
    user: {
      id: 'user-tailor-1',
      full_name: 'Test Candidate',
      email: 'candidate@example.com',
      city: 'Remote',
      is_verified: true,
    },
    loading: false,
  }),
}));

jest.mock('@/lib/supabase/browser', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { overall_score: 75 }, error: null }),
            }),
          }),
        }),
      }),
    }),
    auth: {
      signOut: jest.fn(),
    },
  },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
    info: (...args: any[]) => mockToastInfo(...args),
    loading: jest.fn(),
  },
}));

jest.mock('@/components/jobs/jobs-sidebar', () => ({
  JobsSidebar: () => <div data-testid="jobs-sidebar" />,
}));
jest.mock('@/components/jobs/jobs-navbar', () => ({
  JobsNavbar: ({ children }: any) => <div data-testid="jobs-navbar">{children}</div>,
}));
jest.mock('@/components/invite-dialog', () => ({
  InviteDialog: () => null,
  triggerNativeShare: jest.fn(),
}));
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

describe('Tailor Resume Modal End-to-End Sync', () => {
  const baseJob1 = {
    id: 'job-1',
    title: 'Senior Platform Engineer',
    company_name: 'Acme Corp',
    location: 'Remote',
    workplace_type: 'Remote',
    job_type: 'Full-time',
    experience_level: 'Senior',
    category: 'Engineering',
    salary_range: '$180k - $220k',
    description: 'Platform engineering with TypeScript, React, Docker, Kubernetes.',
    requirements: 'TypeScript, React, Docker, Kubernetes',
    external_apply_url: 'https://acme.com/jobs/101',
    is_internal: false,
    match_score: 84,
    match_breakdown: { skillsScore: 84, experienceScore: 82, stackScore: 84 },
    why_you_match: ['Strong TypeScript & React match'],
    matching_skills: ['TypeScript', 'React'],
    missing_skills: ['Docker', 'Kubernetes'],
    tailored_bullet_suggestion: {
      original: 'Built services.',
      tailored: 'Architected Docker and Kubernetes services.',
    },
    is_recommended: true,
    insider_count: 0,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (global as any).IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
    (global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    if (typeof Element !== 'undefined') {
      Element.prototype.scrollTo = jest.fn();
    }
  });

  const mockResponse = (body: any, status = 200) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as any;

  function setupFetchMock(overrides: {
    profilePost?: () => Promise<any>;
    jobDetailGet?: () => Promise<any>;
    jobsGetAfterSave?: () => Promise<any>;
  } = {}) {
    let saved = false;
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('/api/jobs/profile')) {
        if (init?.method === 'POST') {
          if (overrides.profilePost) {
            const res = await overrides.profilePost();
            if (res.ok) saved = true;
            return res;
          }
          saved = true;
          return mockResponse({
            success: true,
            resumeId: 'res-1',
            addedSkills: ['Docker', 'Kubernetes'],
            document: {
              skills: [
                {
                  category: 'Technical',
                  items: ['TypeScript', 'React', 'Docker', 'Kubernetes'],
                },
              ],
            },
          });
        }
        return mockResponse({
          success: true,
          resumeId: 'res-1',
          latestScore: 75,
          document: {
            skills: [{ category: 'Technical', items: ['TypeScript', 'React'] }],
            experience: [{ roleTitle: 'Engineer', company: 'PrevCo', isCurrent: true }],
          },
        });
      }

      if (url.startsWith('/api/jobs/job-1')) {
        if (overrides.jobDetailGet) {
          return overrides.jobDetailGet();
        }
        return mockResponse({
          success: true,
          job: {
            ...baseJob1,
            match_score: 94,
            matching_skills: ['TypeScript', 'React', 'Docker', 'Kubernetes'],
            missing_skills: [],
          },
        });
      }

      if (url.startsWith('/api/jobs?')) {
        if (saved && overrides.jobsGetAfterSave) {
          return overrides.jobsGetAfterSave();
        }
        const jobsPayload = saved
          ? [
              {
                ...baseJob1,
                match_score: 94,
                matching_skills: ['TypeScript', 'React', 'Docker', 'Kubernetes'],
                missing_skills: [],
              },
            ]
          : [baseJob1];
        return mockResponse({
          success: true,
          jobs: jobsPayload,
          totalCount: 1,
          hasMore: false,
        });
      }

      return mockResponse({});
    });

    (global as any).fetch = fetchMock;
    return fetchMock;
  }

  it('requires unchecked skill confirmation, sends 1 POST on double-click, syncs server match, and refreshes feed on close', async () => {
    const fetchMock = setupFetchMock();
    render(<JobRecommendationsDashboard />);

    const trigger = await screen.findByText('1-Click add missing keywords via Tailor Studio');
    fireEvent.click(trigger);

    // Checkboxes start unchecked and button is disabled with hint
    expect(screen.getByText('Select at least one skill you have to enable applying.')).toBeTruthy();
    const applyBtn = screen.getByRole('button', { name: /Add 0 skills to Master Resume/i });
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);

    // Tick Docker and Kubernetes
    fireEvent.click(screen.getByLabelText('Docker'));
    fireEvent.click(screen.getByLabelText('Kubernetes'));

    const enabledApplyBtn = screen.getByRole('button', { name: /Add 2 skills to Master Resume/i });
    expect((enabledApplyBtn as HTMLButtonElement).disabled).toBe(false);

    // Rapid double click sends exactly 1 POST
    await act(async () => {
      fireEvent.click(enabledApplyBtn);
      fireEvent.click(enabledApplyBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Keywords Added to Master Resume!')).toBeTruthy();
    });

    const postCalls = fetchMock.mock.calls.filter(
      ([u, i]) => String(u).startsWith('/api/jobs/profile') && i?.method === 'POST'
    );
    expect(postCalls).toHaveLength(1);
    expect(JSON.parse(String(postCalls[0][1]?.body))).toEqual({
      action: 'add-skills',
      resumeId: 'res-1',
      skills: ['Docker', 'Kubernetes'],
    });

    expect(screen.getByText('4 / 4 Skills Aligned')).toBeTruthy();
    expect(sessionStorage.getItem('vouchins_jobs_feed_stale_user-tailor-1')).toBe('1');

    // Close modal via Done -> deferred refresh fires once and clears stale key
    const jobsCallsBeforeClose = fetchMock.mock.calls.filter(([u]) =>
      String(u).startsWith('/api/jobs?')
    ).length;

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    });

    await waitFor(() => {
      const jobsCallsAfterClose = fetchMock.mock.calls.filter(([u]) =>
        String(u).startsWith('/api/jobs?')
      ).length;
      expect(jobsCallsAfterClose).toBe(jobsCallsBeforeClose + 1);
      expect(sessionStorage.getItem('vouchins_jobs_feed_stale_user-tailor-1')).toBeNull();
    });

    // Detail panel now shows Keywords Missing (0)
    expect(screen.getByText('Keywords Missing (0)')).toBeTruthy();
  });

  it('keeps ticked boxes on 409 conflict and leaves state unchanged on 500', async () => {
    let mode: '409' | '500' = '409';
    setupFetchMock({
      profilePost: async () =>
        mockResponse(
          { error: mode === '409' ? 'Conflict' : 'Server Error' },
          mode === '409' ? 409 : 500
        ),
    });

    render(<JobRecommendationsDashboard />);
    const trigger = await screen.findByText('1-Click add missing keywords via Tailor Studio');
    fireEvent.click(trigger);

    const dockerBox = screen.getByLabelText('Docker') as HTMLInputElement;
    fireEvent.click(dockerBox);
    expect(dockerBox.checked).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add 1 skill to Master Resume/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Your resume was updated in another tab - click Add again to merge.'
      );
    });
    // Checkbox stays ticked and no success card appears
    expect((screen.getByLabelText('Docker') as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText('Keywords Added to Master Resume!')).toBeNull();

    mode = '500';
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add 1 skill to Master Resume/i }));
    });
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Server Error');
    });
    expect(screen.queryByText('Keywords Added to Master Resume!')).toBeNull();
  });

  it('handles soft detail-fetch failure after successful save and shows canonical unmatched note when needed', async () => {
    setupFetchMock({
      jobDetailGet: async () => mockResponse({ error: 'Detail timeout' }, 500),
    });

    render(<JobRecommendationsDashboard />);
    const trigger = await screen.findByText('1-Click add missing keywords via Tailor Studio');
    fireEvent.click(trigger);

    fireEvent.click(screen.getByLabelText('Docker'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add 1 skill to Master Resume/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Keywords Added to Master Resume!')).toBeTruthy();
      expect(
        screen.getByText('Skills saved to your Master Resume. Job scores will refresh shortly.')
      ).toBeTruthy();
    });
    expect(sessionStorage.getItem('vouchins_jobs_feed_stale_user-tailor-1')).toBe('1');
  });
});

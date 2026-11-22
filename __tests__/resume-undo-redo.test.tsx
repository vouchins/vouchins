/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Workspace } from '@/components/jobs/workspace';
import { ResumeDocument, ResumeEvaluation } from '@/lib/jobs/types';

jest.mock('@/components/user-provider', () => ({
  useUser: () => ({
    user: { id: 'test-user-id', email: 'test@vouchins.com', full_name: 'Test User' },
    profile: null,
    loading: false,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const INITIAL_DOC: ResumeDocument = {
  contact: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    linkedinUrl: '',
    githubUrl: '',
    leetcodeUrl: '',
    portfolioUrl: '',
  },
  summary: 'Experienced software engineer.',
  skills: [
    {
      category: 'Languages',
      items: ['TypeScript'],
    },
  ],
  experience: [
    {
      id: 'exp-1',
      roleTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'New York, NY',
      startDate: '2022',
      endDate: 'Present',
      isCurrent: true,
      bullets: ['Built scalable microservices.'],
    },
  ],
  education: [],
  projects: [],
  certifications: [],
};

const INITIAL_EVAL: ResumeEvaluation = {
  overallScore: 80,
  pillarScores: { impact: 80, relevance: 80, brevity: 80 },
  detectedSeniority: 'Mid-Level',
  targetRole: 'Software Engineer',
  strengths: ['Strong impact'],
  missingKeywords: [],
  suggestions: [],
  jobMatchVectors: {
    detectedRole: 'Software Engineer',
    seniority: 'Mid-Level',
    primarySkills: ['TypeScript'],
    secondarySkills: ['React'],
    estimatedYearsExperience: 3,
    targetCompanyTier: ['Tier 1 Tech'],
    preferredLocations: ['Remote'],
  },
};

describe('Workspace Undo and Redo Toolbar', () => {
  it('renders visible Undo and Redo labels beside the icons with keyboard hints', () => {
    render(<Workspace initialDocument={INITIAL_DOC} initialEvaluation={INITIAL_EVAL} />);

    const undoBtn = screen.getByRole('button', { name: /undo change/i });
    const redoBtn = screen.getByRole('button', { name: /redo change/i });

    expect(undoBtn).toBeInTheDocument();
    expect(redoBtn).toBeInTheDocument();

    expect(undoBtn).toHaveTextContent('Undo');
    expect(undoBtn).toHaveTextContent('⌘Z');
    expect(redoBtn).toHaveTextContent('Redo');
    expect(redoBtn).toHaveTextContent('⌘⇧Z');

    // Initially disabled because no edits made yet
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });
});

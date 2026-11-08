import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PublicResumeViewer } from '@/components/jobs/public-resume-viewer';

import { ResumeDocument } from '@/lib/jobs/types';

const sampleDocument: ResumeDocument = {
  contact: {
    fullName: 'Taher Shaik',
    email: 'taher@vouchins.com',
    phone: '+91 9876543210',
    location: 'Hyderabad, India',
    linkedinUrl: 'https://linkedin.com/in/tshaik',
    githubUrl: 'https://github.com/shaiktaher',
    portfolioUrl: 'https://vouchins.com/resume/taher-dev',
  },
  summary: 'Staff Software Engineer with deep backend expertise.',
  experience: [
    {
      id: 'exp-1',
      company: 'Vouchins Tech',
      roleTitle: 'Senior Software Engineer',
      startDate: '2023',
      endDate: 'Present',
      isCurrent: true,
      bullets: ['Scaled high-availability services.'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Osmania University',
      degree: 'B.Tech in Computer Science',
      endDate: '2022',
    },
  ],
  skills: [
    {
      category: 'Backend',
      items: ['Go', 'Java', 'Next.js'],
    },
  ],
  projects: [],
  certifications: [],
};

describe('PublicResumeViewer Verification Badge & Brand Elements', () => {
  it('renders official Vouchins logo image', () => {
    render(
      <PublicResumeViewer
        resumeId="res-123"
        title="Taher Shaik - Resume"
        document={sampleDocument}
        isVerifiedCandidate={true}
      />
    );

    const logoImg = screen.getAllByRole('img', { name: /vouchins/i });
    expect(logoImg.length).toBeGreaterThanOrEqual(1);
    expect(decodeURIComponent(logoImg[0].getAttribute('src') || '')).toContain('/images/logo.png');
  });

  it('renders "Verified Candidate Resume" badge when isVerifiedCandidate is true', () => {
    render(
      <PublicResumeViewer
        resumeId="res-verified-123"
        title="Taher Shaik - Resume"
        document={sampleDocument}
        isVerifiedCandidate={true}
      />
    );

    expect(screen.getByText('Verified Candidate Resume')).toBeInTheDocument();
  });

  it('does NOT render "Verified Candidate Resume" badge when isVerifiedCandidate is false', () => {
    render(
      <PublicResumeViewer
        resumeId="res-unverified-456"
        title="Candidate Resume"
        document={sampleDocument}
        isVerifiedCandidate={false}
      />
    );

    expect(screen.queryByText('Verified Candidate Resume')).not.toBeInTheDocument();
  });

  it('renders candidate contact details and experience correctly', () => {
    render(
      <PublicResumeViewer
        resumeId="res-test-789"
        title="Taher Shaik - Resume"
        document={sampleDocument}
        isVerifiedCandidate={true}
      />
    );

    expect(screen.getByText('Taher Shaik')).toBeInTheDocument();
    expect(screen.getByText('Hyderabad, India')).toBeInTheDocument();
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Vouchins Tech')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });
});

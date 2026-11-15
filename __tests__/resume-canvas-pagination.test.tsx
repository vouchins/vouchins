/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResumeCanvas } from '@/components/jobs/resume-canvas';
import { ResumeDocument } from '@/lib/jobs/types';

const SAMPLE_LARGE_DOC: ResumeDocument = {
  contact: {
    fullName: 'Ummu Farwah',
    email: 'Ummufarwah.fm@gmail.com',
    phone: '+1 (347) 686-2993',
    location: 'Jersey City, NJ',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  },
  summary:
    'Doctor of Pharmacy graduate and master candidate in Drug Regulatory Affairs with extensive clinical hospital experience.',
  skills: [
    {
      category: 'Core Skills',
      items: [
        'Regulatory Affairs',
        'Drug Safety',
        'Clinical Pharmacology',
        'Pharmacokinetics',
        'Compliance Review',
      ],
    },
  ],
  experience: [
    {
      id: 'exp-1',
      roleTitle: 'Clinical Pharmacist',
      company: 'Tuffah Hospital',
      location: 'Hyderabad, India',
      startDate: 'Mar 2023',
      endDate: 'Aug 2023',
      isCurrent: false,
      bullets: [
        'Reviewed and evaluated physician-prescribed medications to ensure appropriate drug selection, dosage, and frequency.',
        'Assessed medication regimens for potential drug-drug interactions, contraindications, and adverse effects.',
        'Collaborated with physicians, nurses, and healthcare professionals to review treatment plans and provide evidence-based recommendations.',
        'Monitored patient medication therapy and evaluated treatment effectiveness, identifying potential safety concerns.',
        'Provided patient counseling on prescription medications, including dosage instructions and precautions.',
        'Maintained accurate and organized clinical documentation while ensuring confidentiality and adherence to hospital standards.',
        'Applied clinical pharmacology and drug therapy knowledge to contribute to patient safety initiatives.',
        'Supported medication-related decision-making by reviewing clinical information and communicating findings clearly.',
      ],
    },
    {
      id: 'exp-2',
      roleTitle: 'Clinical Pharmacology Intern',
      company: 'Tuffah Hospital',
      location: 'Hyderabad, India',
      startDate: 'Sept 2022',
      endDate: 'Feb 2023',
      isCurrent: false,
      bullets: [
        'Developed practical knowledge of clinical pharmacology through exposure to patient treatment plans and medication reviews.',
        'Studied drug mechanisms of action, pharmacokinetics, and pharmacodynamics to understand medication safety.',
        'Assisted in evaluating prescribed medications for potential drug interactions and dosage concerns.',
        'Reviewed relevant patient information and clinical data to support assessment of medication effectiveness.',
        'Worked alongside clinical pharmacists to understand evidence-based treatment approaches.',
        'Educated patients on appropriate medication administration, treatment adherence, and possible side effects.',
        'Participated in clinical research-related activities, including reviewing medical information and collecting data.',
        'Strengthened understanding of drug safety principles and the importance of accurate clinical documentation.',
        'Applied foundational knowledge of pharmacology to support clinical assessments and medication management.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Masters in Drug Regulatory Affairs',
      fieldOfStudy: 'Drug Regulatory Affairs',
      institution: 'Long Island University, Brooklyn, New York',
      startDate: '2024',
      endDate: '2026',
    },
    {
      id: 'edu-2',
      degree: 'Doctor of Pharmacy (Pharm-D)',
      fieldOfStudy: 'Pharmacy',
      institution: 'MESCO College of Pharmacy, affiliated with Osmania University, Hyderabad, India',
      startDate: '2017',
      endDate: '2023',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title:
        'A Prospective Observational Study on Hepatoprotective Agents Used in Alcoholic Liver Disease at a Tertiary Care Teaching Hospital',
      techStack: ['Osmania University'],
      bullets: [
        'Conducted a prospective research study on hepatoprotective agents used in the treatment of alcoholic liver disease.',
        'Collected and analyzed patient data to assess treatment outcomes and therapeutic effectiveness.',
        'Prepared and submitted a formal dissertation to Osmania University as partial fulfillment of the Pharm-D degree.',
      ],
    },
  ],
  certifications: [],
};

describe('ResumeCanvas Multi-Page Pagination & Layout', () => {
  it('correctly partitions long resumes into multi-page sheets without overflow', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_LARGE_DOC} onChange={onChange} />);

    // Should generate exactly 2 pages matching the PDF export (Page 1 of 2, Page 2 of 2)
    const pageIndicators = screen.getAllByText(/Page \d+ of \d+/);
    expect(pageIndicators.length).toBe(2);
    expect(pageIndicators[0].textContent).toBe('Page 1 of 2');
    expect(pageIndicators[1].textContent).toBe('Page 2 of 2');

    // Education should not duplicate field of study if already in degree
    const eduDegreeText = screen.getByText((content) =>
      content.includes('Masters in Drug Regulatory Affairs')
    );
    expect(eduDegreeText.textContent).not.toContain(
      'Masters in Drug Regulatory Affairs in Drug Regulatory Affairs'
    );

    // Project title should be present and wrap cleanly
    expect(
      screen.getByText((content) =>
        content.includes('A Prospective Observational Study')
      )
    ).toBeInTheDocument();
  });

  it('flows long roles across page breaks to eliminate awkward whitespace on page 1', () => {
    const longBulletsDoc: ResumeDocument = {
      ...SAMPLE_LARGE_DOC,
      experience: [
        SAMPLE_LARGE_DOC.experience[0],
        {
          ...SAMPLE_LARGE_DOC.experience[1],
          bullets: SAMPLE_LARGE_DOC.experience[1].bullets.map(
            (b) => `${b} - expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating and cutting query compute latency by 40%.`
          ),
        },
      ],
    };

    render(<ResumeCanvas document={longBulletsDoc} onChange={jest.fn()} />);

    // Should flow across the page boundary, eliminating empty space on Page 1
    // and rendering a clean continuation indicator on Page 2
    expect(
      screen.getByText((content) =>
        content.includes('Clinical Pharmacology Intern • Tuffah Hospital (Continued)')
      )
    ).toBeInTheDocument();
  });
});


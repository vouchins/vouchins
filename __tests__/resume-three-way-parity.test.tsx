/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResumeCanvas } from '@/components/jobs/resume-canvas';
import { ExportResumeDialog } from '@/components/jobs/export-resume-dialog';
import { ResumePDFDocument } from '@/components/jobs/pdf-document';
import { ResumeDocument, DEFAULT_EXPORT_CONFIG } from '@/lib/jobs/types';
import { partitionResumePages } from '@/lib/jobs/pagination';

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn(() => ({
    toBlob: jest.fn().mockResolvedValue(new Blob(['mock pdf content'], { type: 'application/pdf' })),
  })),
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

const SAMPLE_CLINICAL_DOC: ResumeDocument = {
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

describe('3-Way Parity across Studio Canvas, Export Dialog Preview, and Downloaded PDF', () => {
  it('guarantees identical page count and section layout for standard documents', () => {
    const expectedPages = partitionResumePages(SAMPLE_CLINICAL_DOC, 'LETTER');
    expect(expectedPages.length).toBe(2);

    // 1. Studio Canvas View
    const { unmount: unmountCanvas } = render(
      <ResumeCanvas document={SAMPLE_CLINICAL_DOC} onChange={jest.fn()} />
    );
    const canvasFooters = screen.getAllByText(/Page \d+ of \d+/);
    expect(canvasFooters.length).toBe(expectedPages.length);
    expect(canvasFooters[0].textContent).toBe('Page 1 of 2');
    expect(canvasFooters[1].textContent).toBe('Page 2 of 2');
    expect(screen.getByText('Long Island University, Brooklyn, New York')).toBeInTheDocument();
    unmountCanvas();

    // 2. Export Dialog Preview Modal
    const { unmount: unmountDialog } = render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_CLINICAL_DOC}
        resumeName="Clinical Pharmacist"
      />
    );
    const dialogFooters = screen.getAllByText(/Page \d+ of \d+/);
    expect(dialogFooters.length).toBe(expectedPages.length);
    expect(dialogFooters[0].textContent).toBe('Page 1 of 2');
    expect(dialogFooters[1].textContent).toBe('Page 2 of 2');
    expect(screen.getByText('Long Island University, Brooklyn, New York')).toBeInTheDocument();
    unmountDialog();

    // 3. Downloaded PDF Vector Document
    const { getAllByTestId, container: pdfContainer, unmount: unmountPdf } = render(
      <ResumePDFDocument
        document={SAMPLE_CLINICAL_DOC}
        config={DEFAULT_EXPORT_CONFIG}
      />
    );
    const pdfPages = getAllByTestId('pdf-page');
    expect(pdfPages.length).toBe(expectedPages.length);
    expect(pdfContainer).toHaveTextContent('Long Island University, Brooklyn, New York');
    expect(pdfContainer).toHaveTextContent('Page 1 of 2');
    expect(pdfContainer).toHaveTextContent('Page 2 of 2');
    unmountPdf();
  });

  it('guarantees identical role split and (Continued) indicator across all 3 representations when roles overflow', () => {
    const longBulletsDoc: ResumeDocument = {
      ...SAMPLE_CLINICAL_DOC,
      experience: [
        SAMPLE_CLINICAL_DOC.experience[0],
        {
          ...SAMPLE_CLINICAL_DOC.experience[1],
          bullets: SAMPLE_CLINICAL_DOC.experience[1].bullets.map(
            (b) =>
              `${b} - expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating and cutting query compute latency by 40%.`
          ),
        },
      ],
    };

    const expectedPages = partitionResumePages(longBulletsDoc, 'LETTER');
    expect(expectedPages.length).toBe(2);
    expect(expectedPages[1].roles.some((r) => r.isContinuation)).toBe(true);

    // 1. Studio Canvas View
    const { unmount: unmountCanvas } = render(
      <ResumeCanvas document={longBulletsDoc} onChange={jest.fn()} />
    );
    expect(
      screen.getByText((content) =>
        content.includes('Clinical Pharmacology Intern • Tuffah Hospital (Continued)')
      )
    ).toBeInTheDocument();
    unmountCanvas();

    // 2. Export Dialog Preview Modal
    const { unmount: unmountDialog } = render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={longBulletsDoc}
        resumeName="Clinical Pharmacist"
      />
    );
    expect(
      screen.getByText((content) =>
        content.includes('Clinical Pharmacology Intern • Tuffah Hospital (Continued)')
      )
    ).toBeInTheDocument();
    unmountDialog();

    // 3. Downloaded PDF Vector Document
    const { container: pdfContainer, unmount: unmountPdf } = render(
      <ResumePDFDocument
        document={longBulletsDoc}
        config={DEFAULT_EXPORT_CONFIG}
      />
    );
    expect(pdfContainer).toHaveTextContent(
      'Clinical Pharmacology Intern • Tuffah Hospital (Continued)'
    );
    unmountPdf();
  });

  it('renders skills category and list tightly inline without artificial whitespace gap across all 3 views', () => {
    // 1. Studio Canvas View
    const { container: canvasContainer, unmount: unmountCanvas } = render(
      <ResumeCanvas document={SAMPLE_CLINICAL_DOC} onChange={jest.fn()} />
    );
    const canvasCategorySpan = canvasContainer.querySelector('span.shrink-0');
    expect(canvasCategorySpan?.className).not.toContain('w-36');
    const canvasTextarea = canvasContainer.querySelector('textarea.leading-snug');
    expect(canvasTextarea).toBeInTheDocument();
    unmountCanvas();

    // 2. Export Dialog Preview Modal
    const { container: dialogContainer, unmount: unmountDialog } = render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_CLINICAL_DOC}
      />
    );
    const dialogCategorySpan = screen.getByText('Core Skills:');
    expect(dialogCategorySpan).toBeInTheDocument();
    expect(dialogCategorySpan.className).toContain('mr-1.5');
    expect(dialogCategorySpan.className).not.toContain('w-36');
    const dialogSkillRow = dialogCategorySpan.closest('div');
    expect(dialogSkillRow?.className).toContain('leading-snug');
    unmountDialog();

    // 3. Downloaded PDF Vector Document
    const { container: pdfContainer, unmount: unmountPdf } = render(
      <ResumePDFDocument
        document={SAMPLE_CLINICAL_DOC}
        config={DEFAULT_EXPORT_CONFIG}
      />
    );
    expect(pdfContainer).toHaveTextContent('Core Skills: Regulatory Affairs, Drug Safety');
    unmountPdf();
  });

  it('renders technical and profile links (LinkedIn, GitHub, LeetCode, Portfolio) consistently across Canvas, Export Dialog, and PDF', () => {
    const docWithLinks: ResumeDocument = {
      ...SAMPLE_CLINICAL_DOC,
      contact: {
        ...SAMPLE_CLINICAL_DOC.contact,
        linkedinUrl: 'https://linkedin.com/in/ummu-farwah',
        githubUrl: 'https://github.com/ummu-farwah',
        leetcodeUrl: 'https://leetcode.com/u/ummu-farwah',
        portfolioUrl: 'https://ummu-portfolio.dev',
      },
    };

    // 1. Studio Canvas View
    const { container: canvasContainer, unmount: unmountCanvas } = render(
      <ResumeCanvas document={docWithLinks} onChange={jest.fn()} />
    );
    expect(canvasContainer.querySelector('input[value="https://linkedin.com/in/ummu-farwah"]')).toBeInTheDocument();
    expect(canvasContainer.querySelector('input[value="https://github.com/ummu-farwah"]')).toBeInTheDocument();
    expect(canvasContainer.querySelector('input[value="https://leetcode.com/u/ummu-farwah"]')).toBeInTheDocument();
    expect(canvasContainer.querySelector('input[value="https://ummu-portfolio.dev"]')).toBeInTheDocument();
    unmountCanvas();

    // 2. Export Dialog Preview
    const { unmount: unmountDialog } = render(
      <ExportResumeDialog isOpen={true} onClose={jest.fn()} document={docWithLinks} />
    );
    expect(screen.getByText('linkedin.com/in/ummu-farwah')).toBeInTheDocument();
    expect(screen.getByText('github.com/ummu-farwah')).toBeInTheDocument();
    expect(screen.getByText('leetcode.com/u/ummu-farwah')).toBeInTheDocument();
    expect(screen.getByText('ummu-portfolio.dev')).toBeInTheDocument();
    unmountDialog();

    // 3. Downloaded PDF Vector Document
    const { container: pdfContainer, unmount: unmountPdf } = render(
      <ResumePDFDocument document={docWithLinks} config={DEFAULT_EXPORT_CONFIG} />
    );
    expect(pdfContainer).toHaveTextContent('linkedin.com/in/ummu-farwah');
    expect(pdfContainer).toHaveTextContent('github.com/ummu-farwah');
    expect(pdfContainer).toHaveTextContent('leetcode.com/u/ummu-farwah');
    expect(pdfContainer).toHaveTextContent('ummu-portfolio.dev');
    unmountPdf();
  });

  it('renders quick-add buttons in ResumeCanvas when links are empty and calls updateContact on click', () => {
    const handleUpdate = jest.fn();
    const { container, unmount } = render(
      <ResumeCanvas document={SAMPLE_CLINICAL_DOC} onChange={handleUpdate} />
    );

    const leetcodeButton = screen.getByText('+ LeetCode');
    expect(leetcodeButton).toBeInTheDocument();
    leetcodeButton.click();

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        contact: expect.objectContaining({
          leetcodeUrl: 'leetcode.com/u/',
        }),
      })
    );

    unmount();
  });
});

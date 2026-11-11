import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportResumeDialog } from '@/components/jobs/export-resume-dialog';
import { ResumePDFDocument } from '@/components/jobs/pdf-document';
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';
import { DEFAULT_EXPORT_CONFIG } from '@/lib/jobs/types';

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn(() => ({
    toBlob: jest.fn().mockResolvedValue(new Blob(['mock pdf content'], { type: 'application/pdf' })),
  })),
  Document: ({ children }: any) => <div>{children}</div>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

describe('ExportResumeDialog Component', () => {
  it('renders modal header and ATS-friendly format badge when open', () => {
    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
        resumeName="Staff Software Engineer"
      />
    );

    expect(screen.getByText('Export Resume')).toBeInTheDocument();
    expect(screen.getByText('ATS-friendly format')).toBeInTheDocument();
    expect(screen.getByText('Paper Size')).toBeInTheDocument();
    expect(screen.getByText('ATS-friendly Resume Template')).toBeInTheDocument();
  });

  it('renders all four templates with Recommended badge on Standard', () => {
    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
      />
    );

    expect(screen.getByRole('button', { name: /standard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /centered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /structured/i })).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('switches templates when clicked', () => {
    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
      />
    );

    const compactBtn = screen.getByRole('button', { name: /compact/i });
    fireEvent.click(compactBtn);
    expect(screen.getByText(/compact layout/i)).toBeInTheDocument();

    const centeredBtn = screen.getByRole('button', { name: /centered/i });
    fireEvent.click(centeredBtn);
    expect(screen.getByText(/centered layout/i)).toBeInTheDocument();

    const structuredBtn = screen.getByRole('button', { name: /structured/i });
    fireEvent.click(structuredBtn);
    expect(screen.getByText(/structured layout/i)).toBeInTheDocument();
  });

  it('renders live preview containing candidate details and download button', () => {
    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
      />
    );

    // Verify candidate name in live preview
    expect(screen.getByText(SAMPLE_STAFF_RESUME.contact.fullName)).toBeInTheDocument();
    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('Work Experience')).toBeInTheDocument();

    // Verify primary download action button
    const downloadButton = screen.getByRole('button', { name: /download resume/i });
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).not.toBeDisabled();
  });

  it('renders ResumePDFDocument in structured layout matching sidebar hierarchy without crashing', () => {
    const { container } = render(
      <ResumePDFDocument
        document={SAMPLE_STAFF_RESUME}
        config={{ ...DEFAULT_EXPORT_CONFIG, template: 'structured' }}
      />
    );

    // Should render candidate name, skills, experience, and education
    expect(container).toHaveTextContent(SAMPLE_STAFF_RESUME.contact.fullName);
    expect(container).toHaveTextContent('Technical Skills');
    expect(container).toHaveTextContent('Education');
    expect(container).toHaveTextContent(SAMPLE_STAFF_RESUME.education[0].institution);
  });
});


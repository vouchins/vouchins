import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportResumeDialog } from '@/components/jobs/export-resume-dialog';
import { ResumePDFDocument } from '@/components/jobs/pdf-document';
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';
import { DEFAULT_EXPORT_CONFIG } from '@/lib/jobs/types';

const mockGetOrRenderPdf = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/jobs/pdf-render-cache', () => ({
  getOrRenderPdf: (...args: any[]) => mockGetOrRenderPdf(...args),
  loadPdfJsClient: jest.fn(async () => ({
    getDocument: jest.fn(() => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: jest.fn(async (p: number) => ({
          getViewport: ({ scale }: any) => ({ width: 612 * scale, height: 792 * scale }),
          render: jest.fn(() => ({ promise: Promise.resolve() })),
          cleanup: jest.fn(),
        })),
        destroy: mockDestroy,
      }),
    })),
  })),
}));

jest.mock('@react-pdf/renderer', () => ({
  Font: { registerHyphenationCallback: jest.fn() },
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
  beforeEach(() => {
    jest.clearAllMocks();
    const fakeBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    (fakeBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    mockGetOrRenderPdf.mockResolvedValue({
      cacheKey: '0|LETTER|standard',
      blob: fakeBlob,
      numPages: 2,
      renderMs: 42,
    });

    // Mock canvas 2d context in jsdom
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({} as any));
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,stub');
  });

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

    fireEvent.click(screen.getByRole('button', { name: /compact/i }));
    expect(screen.getByText(/compact layout/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /centered/i }));
    expect(screen.getByText(/centered layout/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /structured/i }));
    expect(screen.getByText(/structured layout/i)).toBeInTheDocument();
  });

  it('renders real-PDF preview pages via pdfjs-dist and cleans up pdfDoc', async () => {
    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Resume PDF Page 1')).toBeInTheDocument();
      expect(screen.getByAltText('Resume PDF Page 2')).toBeInTheDocument();
    });
    expect(screen.getByText('2 Pages')).toBeInTheDocument();
    expect(mockDestroy).toHaveBeenCalled();

    const downloadButton = screen.getByRole('button', { name: /download resume/i });
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).not.toBeDisabled();
  });

  it('shows retryable error state when real-PDF preview fails', async () => {
    mockGetOrRenderPdf.mockRejectedValueOnce(new Error('PDF render timeout'));

    render(
      <ExportResumeDialog
        isOpen={true}
        onClose={jest.fn()}
        document={SAMPLE_STAFF_RESUME}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('PDF render timeout')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry preview/i })).toBeInTheDocument();
    });
  });

  it('renders ResumePDFDocument in structured layout without crashing', () => {
    const { container } = render(
      <ResumePDFDocument
        document={SAMPLE_STAFF_RESUME}
        config={{ ...DEFAULT_EXPORT_CONFIG, template: 'structured' }}
      />
    );

    expect(container).toHaveTextContent(SAMPLE_STAFF_RESUME.contact.fullName);
    expect(container).toHaveTextContent('Technical Skills');
    expect(container).toHaveTextContent('Education');
    expect(container).toHaveTextContent(SAMPLE_STAFF_RESUME.education[0].institution);
  });
});

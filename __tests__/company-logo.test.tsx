import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanyLogo, getCompanyDomain, getGoogleFaviconUrl } from '@/components/jobs/company-logo';

describe('CompanyLogo & Favicon Engine', () => {
  it('correctly maps prominent tech companies to their primary domains', () => {
    expect(getCompanyDomain('Oracle')).toBe('oracle.com');
    expect(getCompanyDomain('Google')).toBe('google.com');
    expect(getCompanyDomain('Stripe')).toBe('stripe.com');
    expect(getCompanyDomain('Figma')).toBe('figma.com');
    expect(getCompanyDomain('Audible')).toBe('audible.com');
    expect(getCompanyDomain('Johnson & Johnson')).toBe('jnj.com');
  });

  it('constructs Google Favicon service URL conforming to requested spec', () => {
    const url = getGoogleFaviconUrl('oracle.com', 64);
    expect(url).toBe(
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://oracle.com&size=64'
    );
  });

  it('renders Google favicon image for known company', () => {
    render(<CompanyLogo companyName="Oracle" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://oracle.com&size=64'
    );
  });

  it('gracefully falls back to initials when image loading fails', () => {
    render(<CompanyLogo companyName="Oracle" />);
    const img = screen.getByRole('img');
    // Simulate image load error
    fireEvent.error(img);

    // Initial OR should be displayed
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders company initials for unknown or empty domain', () => {
    render(<CompanyLogo companyName="Acme Corp" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });
});


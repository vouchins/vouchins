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
    expect(getCompanyDomain('Accenture')).toBe('accenture.com');
    expect(getCompanyDomain('Deloitte')).toBe('deloitte.com');
    expect(getCompanyDomain('Synchrony Financial')).toBe('synchrony.com');
    expect(getCompanyDomain('Quantela')).toBe('quantela.com');
    expect(getCompanyDomain('Qvantel')).toBe('qvantel.com');
  });

  it('constructs Google Favicon service URL conforming to requested spec with HTTPS protocol', () => {
    const url = getGoogleFaviconUrl('oracle.com', 64);
    expect(url).toBe(
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://oracle.com&size=64'
    );

    const quantelaUrl = getGoogleFaviconUrl('quantela.com', 64);
    expect(quantelaUrl).toBe(
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://quantela.com&size=64'
    );

    const focusSoftnetHttpUrl = getGoogleFaviconUrl('focussoftnet.com', 64, 'http');
    expect(focusSoftnetHttpUrl).toBe(
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://focussoftnet.com&size=64'
    );
  });

  it('ignores generic job board and ATS aggregators when resolving externalUrl', () => {
    // Should NOT return linkedin.com, wellfound.com, naukri.com, adzuna.com, etc.
    const domainFromLinkedIn = getCompanyDomain(
      'Accenture',
      'https://www.linkedin.com/jobs/view/4476305695/'
    );
    expect(domainFromLinkedIn).toBe('accenture.com');

    const domainFromWellfound = getCompanyDomain(
      'Abovo',
      'https://wellfound.com/jobs/4791997-technical-co-founder'
    );
    expect(domainFromWellfound).not.toBe('wellfound.com');

    const domainFromSmartRecruiters = getCompanyDomain(
      'Abovo',
      'https://jobs.smartrecruiters.com/AbOvoInc/12345'
    );
    expect(domainFromSmartRecruiters).not.toBe('smartrecruiters.com');
  });

  it('extracts canonical domain from logoUrl if available', () => {
    const domain = getCompanyDomain(
      'Abovo',
      'https://wellfound.com/jobs/123',
      'https://www.google.com/s2/favicons?domain=abovo.co.in&sz=128'
    );
    expect(domain).toBe('abovo.co.in');
  });

  it('renders Google favicon image for known company', () => {
    render(<CompanyLogo companyName="Oracle" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://oracle.com&size=64'
    );
  });

  it('renders direct custom logoUrl when it is a direct image asset', () => {
    render(
      <CompanyLogo
        companyName="Custom Corp"
        logoUrl="https://res.cloudinary.com/demo/image/upload/sample.png"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/image/upload/sample.png'
    );
  });

  it('gracefully falls back to initials when both HTTPS and HTTP image loading fails', () => {
    render(<CompanyLogo companyName="Oracle" />);
    let img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('url=https://oracle.com'));

    // First error: falls back to HTTP protocol
    fireEvent.error(img);
    img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('url=http://oracle.com'));

    // Second error: falls back to initials OR
    fireEvent.error(img);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders company initials for unknown or empty domain after fallback', () => {
    render(<CompanyLogo companyName="Acme Corp" />);
    let img = screen.getByRole('img');
    // First error: retries with http
    fireEvent.error(img);
    img = screen.getByRole('img');
    // Second error: shows initials
    fireEvent.error(img);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });
});

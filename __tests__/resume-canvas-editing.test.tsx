/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumeCanvas } from '@/components/jobs/resume-canvas';
import { ResumeDocument } from '@/lib/jobs/types';

const SAMPLE_DOC: ResumeDocument = {
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
      items: ['TypeScript', 'Python'],
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
      bullets: ['Built scalable microservices handling high traffic.'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.S. in Computer Science',
      institution: 'NYU',
      startDate: '2018',
      endDate: '2022',
    },
  ],
  projects: [],
  certifications: [],
};

describe('Resume Canvas Manual Skills & Section Editing', () => {
  it('allows typing commas and spaces in skills without stripping them immediately', () => {
    let currentDoc = { ...SAMPLE_DOC };
    const onChange = jest.fn((updated: ResumeDocument) => {
      currentDoc = updated;
    });

    const { rerender } = render(<ResumeCanvas document={currentDoc} onChange={onChange} />);

    // Find the textarea containing the skills
    const textarea = screen.getByPlaceholderText('Type skills separated by commas...') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('TypeScript, Python');

    // Simulate typing a comma and a space at the end: 'TypeScript, Python, '
    fireEvent.change(textarea, { target: { value: 'TypeScript, Python, ' } });

    // The textarea value MUST retain the trailing comma and space
    expect(textarea.value).toBe('TypeScript, Python, ');

    // Type a new skill: 'TypeScript, Python, Go'
    fireEvent.change(textarea, { target: { value: 'TypeScript, Python, Go' } });
    expect(textarea.value).toBe('TypeScript, Python, Go');

    // On change, onChange was notified with parsed skills including Go
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [
          expect.objectContaining({
            category: 'Languages',
            items: ['TypeScript', 'Python', 'Go'],
          }),
        ],
      })
    );
  });

  it('allows adding a new skill category via button click', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    // Click "+ Add Category" button in skills section or toolbar
    const addCatBtn = screen.getAllByRole('button', { name: /add category|skill category/i })[0];
    expect(addCatBtn).toBeInTheDocument();
    fireEvent.click(addCatBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringMatching(/skills/i),
          }),
        ]),
      })
    );
  });

  it('allows adding a new project via Add Section toolbar', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    const addProjBtn = screen.getByRole('button', { name: /project/i });
    expect(addProjBtn).toBeInTheDocument();
    fireEvent.click(addProjBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        projects: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            bullets: expect.any(Array),
          }),
        ]),
      })
    );
  });

  it('allows adding a new certification via Add Section toolbar', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    const addCertBtn = screen.getByRole('button', { name: /certification/i });
    expect(addCertBtn).toBeInTheDocument();
    fireEvent.click(addCertBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        certifications: expect.arrayContaining([expect.any(String)]),
      })
    );
  });

  it('allows adding a new education entry via Add Section toolbar', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    const addEduBtn = screen.getAllByRole('button', { name: /education/i })[0];
    expect(addEduBtn).toBeInTheDocument();
    fireEvent.click(addEduBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        education: expect.arrayContaining([
          expect.objectContaining({
            institution: expect.any(String),
            degree: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('allows deleting an experience role even when only 1 role exists', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    // In SAMPLE_DOC, document.experience has exactly 1 role
    expect(SAMPLE_DOC.experience.length).toBe(1);

    const deleteRoleBtn = screen.getByTitle('Delete Role');
    expect(deleteRoleBtn).toBeInTheDocument();
    fireEvent.click(deleteRoleBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: [],
      })
    );
  });

  it('allows deleting an education entry even when only 1 education entry exists', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    // In SAMPLE_DOC, document.education has exactly 1 entry
    expect(SAMPLE_DOC.education.length).toBe(1);

    const deleteEduBtn = screen.getByTitle('Delete Education');
    expect(deleteEduBtn).toBeInTheDocument();
    fireEvent.click(deleteEduBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        education: [],
      })
    );
  });

  it('allows deleting a skill category even when only 1 category exists', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    // In SAMPLE_DOC, document.skills has exactly 1 category
    expect(SAMPLE_DOC.skills.length).toBe(1);

    const deleteCatBtn = screen.getByTitle('Delete Category');
    expect(deleteCatBtn).toBeInTheDocument();
    fireEvent.click(deleteCatBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [],
      })
    );
  });

  it('allows clearing misparsed role location with 1 click', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_DOC} onChange={onChange} />);

    // In SAMPLE_DOC, role 0 has location 'New York, NY'
    const clearLocBtn = screen.getByTitle('Clear location');
    expect(clearLocBtn).toBeInTheDocument();
    fireEvent.click(clearLocBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: expect.arrayContaining([
          expect.objectContaining({
            location: '',
          }),
        ]),
      })
    );
  });
});

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ResumeDocument,
  WorkExperienceItem,
  EducationItem,
  ProjectItem,
  SkillCategory,
} from '@/lib/jobs/types';
import { partitionResumePages, PaginatedResumePage } from '@/lib/jobs/pagination';
import { EditableBullet } from './editable-bullet';
import {
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Code2,
  X,
} from 'lucide-react';
import { detectResumeDomain } from '@/lib/jobs/xyz-evaluator';

interface EditableSkillRowProps {
  category: string;
  items: string[];
  onChangeCategory: (newCategory: string) => void;
  onChangeItems: (newItems: string[]) => void;
  onDeleteCategory?: () => void;
  canDelete?: boolean;
}

export function EditableSkillRow({
  category,
  items,
  onChangeCategory,
  onChangeItems,
  onDeleteCategory,
  canDelete = false,
}: EditableSkillRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(() => items.join(', '));
  const [categoryName, setCategoryName] = useState(category);

  // Auto-resize textarea to fit content
  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [draft]);

  // Keep draft in sync if external items array changed (e.g. keywords ingested or suggestions applied)
  // but only when the user is not actively typing into this element
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement !== textareaRef.current) {
      setDraft(items.join(', '));
    }
  }, [items]);

  useEffect(() => {
    setCategoryName(category);
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);

    // Parse tokens and push to parent state without stripping commas/spaces in local draft
    const tokens = val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length > 0) {
      onChangeItems(tokens);
    }
  };

  const handleBlur = () => {
    const tokens = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChangeItems(tokens);
    setDraft(tokens.join(', '));
  };

  return (
    <div className="group/skill flex items-start gap-1.5 w-full">
      <input
        type="text"
        value={categoryName}
        onChange={(e) => {
          setCategoryName(e.target.value);
          onChangeCategory(e.target.value);
        }}
        placeholder="Category"
        className="font-bold text-neutral-900 shrink-0 pt-0.5 w-auto max-w-[220px] bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#0A1B5C] focus:outline-none text-xs"
      />
      <span className="font-bold text-neutral-900 shrink-0 pt-0.5 select-none">:</span>
      <textarea
        ref={textareaRef}
        rows={1}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Type skills separated by commas..."
        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#0A1B5C] focus:outline-none p-0 text-xs leading-snug resize-none overflow-hidden text-neutral-700"
      />
      {canDelete && onDeleteCategory && (
        <button
          type="button"
          onClick={onDeleteCategory}
          title="Delete Category"
          className="opacity-0 group-hover/skill:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 shrink-0 print:hidden cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface ResumeCanvasProps {
  document: ResumeDocument;
  highlightedCoordinate?: { roleIndex: number; bulletIndex: number } | null;
  onChange: (updated: ResumeDocument) => void;
}

export function ResumeCanvas({
  document,
  highlightedCoordinate,
  onChange,
}: ResumeCanvasProps) {
  const isHealthcare = detectResumeDomain('', document) === 'healthcare';
  const skillsTitle = isHealthcare ? 'Core Skills' : 'Technical Skills';
  const projectsTitle = isHealthcare ? 'Key Projects & Research' : 'Key Technical Projects';

  // Update Contact Info
  const updateContact = (field: keyof ResumeDocument['contact'], value: string) => {
    onChange({
      ...document,
      contact: {
        ...document.contact,
        [field]: value,
      },
    });
  };

  // Update Summary
  const updateSummary = (summary: string) => {
    onChange({ ...document, summary });
  };

  const addSummary = () => {
    const defaultSummary = isHealthcare
      ? 'Detail-oriented and analytical Doctor of Pharmacy graduate with practical experience in clinical pharmacy, pharmacology, and drug safety. Experienced in reviewing prescriptions, evaluating drug interactions, maintaining clinical documentation, and upholding patient confidentiality.'
      : 'Executive engineering leader and full-stack software engineer with deep expertise in scalable distributed systems, modern web architectures, and high-impact delivery.';
    onChange({ ...document, summary: defaultSummary });
  };

  // Skills Management
  const updateSkillCategoryName = (index: number, newCategory: string) => {
    const newSkills = [...document.skills];
    newSkills[index] = { ...newSkills[index], category: newCategory };
    onChange({ ...document, skills: newSkills });
  };

  const updateSkillGroupItems = (index: number, newItems: string[]) => {
    const newSkills = [...document.skills];
    newSkills[index] = { ...newSkills[index], items: newItems };
    onChange({ ...document, skills: newSkills });
  };

  const addSkillCategory = () => {
    const newCategory: SkillCategory = {
      category: isHealthcare ? 'Additional Clinical Skills' : 'Additional Skills',
      items: isHealthcare ? ['Clinical Protocols', 'Patient Care'] : ['New Skill'],
    };
    onChange({
      ...document,
      skills: [...(document.skills || []), newCategory],
    });
  };

  const deleteSkillCategory = (index: number) => {
    const newSkills = [...document.skills];
    newSkills.splice(index, 1);
    onChange({ ...document, skills: newSkills });
  };

  // Update Bullet Point
  const updateBullet = (roleIndex: number, bulletIndex: number, newText: string) => {
    const newExperience = [...document.experience];
    newExperience[roleIndex].bullets[bulletIndex] = newText;
    onChange({ ...document, experience: newExperience });
  };

  // Add Bullet Point
  const addBullet = (roleIndex: number, afterIndex: number) => {
    const newExperience = [...document.experience];
    newExperience[roleIndex].bullets.splice(
      afterIndex + 1,
      0,
      isHealthcare
        ? 'Reviewed medication orders and evaluated therapeutic appropriateness to ensure safe pharmaceutical care.'
        : 'Accomplished [X], measured by [Y], by doing [Z].'
    );
    onChange({ ...document, experience: newExperience });
  };

  // Delete Bullet Point
  const deleteBullet = (roleIndex: number, bulletIndex: number) => {
    const newExperience = [...document.experience];
    if (newExperience[roleIndex].bullets.length <= 1) return;
    newExperience[roleIndex].bullets.splice(bulletIndex, 1);
    onChange({ ...document, experience: newExperience });
  };

  // Update Role Fields
  const updateRole = (
    roleIndex: number,
    field: keyof WorkExperienceItem,
    value: any
  ) => {
    const newExperience = [...document.experience];
    newExperience[roleIndex] = {
      ...newExperience[roleIndex],
      [field]: value,
    };
    onChange({ ...document, experience: newExperience });
  };

  // Add New Role
  const addRole = () => {
    const newRole: WorkExperienceItem = {
      id: `exp-${Date.now()}`,
      company: isHealthcare ? 'Hospital / Healthcare Network' : 'Company Name',
      roleTitle: isHealthcare ? 'Clinical Pharmacist' : 'Software Engineer',
      location: 'Location / Remote',
      startDate: '2023',
      endDate: 'Present',
      isCurrent: true,
      bullets: [
        isHealthcare
          ? 'Reviewed medication orders and evaluated therapeutic appropriateness to ensure safe pharmaceutical care.'
          : 'Accomplished [X], measured by [Y], by doing [Z].',
      ],
    };
    onChange({
      ...document,
      experience: [newRole, ...document.experience],
    });
  };

  // Delete Role
  const deleteRole = (roleIndex: number) => {
    if (document.experience.length <= 1) return;
    const newExperience = [...document.experience];
    newExperience.splice(roleIndex, 1);
    onChange({ ...document, experience: newExperience });
  };

  // Education Management
  const updateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    const newEdu = [...document.education];
    newEdu[index] = {
      ...newEdu[index],
      [field]: value,
    };
    onChange({ ...document, education: newEdu });
  };

  const addEducation = () => {
    const newEdu: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: isHealthcare ? 'College of Pharmacy' : 'University Name',
      degree: isHealthcare ? 'Doctor of Pharmacy (Pharm-D)' : 'B.S. in Computer Science',
      fieldOfStudy: isHealthcare ? 'Pharmacy' : 'Computer Science',
      startDate: '2019',
      endDate: '2024',
    };
    onChange({
      ...document,
      education: [...(document.education || []), newEdu],
    });
  };

  const deleteEducation = (index: number) => {
    if (document.education.length <= 1) return;
    const newEdu = [...document.education];
    newEdu.splice(index, 1);
    onChange({ ...document, education: newEdu });
  };

  // Projects Management
  const updateProjectField = (
    index: number,
    field: keyof ProjectItem,
    value: any
  ) => {
    const newProjects = [...(document.projects || [])];
    newProjects[index] = {
      ...newProjects[index],
      [field]: value,
    };
    onChange({ ...document, projects: newProjects });
  };

  const updateProjectBullet = (projIndex: number, bulletIndex: number, newText: string) => {
    const newProjects = [...(document.projects || [])];
    const newBullets = [...(newProjects[projIndex].bullets || [])];
    newBullets[bulletIndex] = newText;
    newProjects[projIndex] = { ...newProjects[projIndex], bullets: newBullets };
    onChange({ ...document, projects: newProjects });
  };

  const addProjectBullet = (projIndex: number, afterIndex: number) => {
    const newProjects = [...(document.projects || [])];
    const newBullets = [...(newProjects[projIndex].bullets || [])];
    newBullets.splice(
      afterIndex + 1,
      0,
      isHealthcare
        ? 'Documented key clinical observations and therapeutic outcomes.'
        : 'Accomplished [X], measured by [Y], by doing [Z].'
    );
    newProjects[projIndex] = { ...newProjects[projIndex], bullets: newBullets };
    onChange({ ...document, projects: newProjects });
  };

  const deleteProjectBullet = (projIndex: number, bulletIndex: number) => {
    const newProjects = [...(document.projects || [])];
    const newBullets = [...(newProjects[projIndex].bullets || [])];
    if (newBullets.length <= 1) return;
    newBullets.splice(bulletIndex, 1);
    newProjects[projIndex] = { ...newProjects[projIndex], bullets: newBullets };
    onChange({ ...document, projects: newProjects });
  };

  const addProject = () => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: isHealthcare
        ? 'Observational Clinical Study on Drug Therapy Safety & Patient Outcomes'
        : 'Enterprise Distributed Architecture Platform',
      techStack: isHealthcare ? ['Clinical Pharmacology', 'GCP Compliance'] : ['Next.js', 'PostgreSQL'],
      bullets: [
        isHealthcare
          ? 'Conducted prospective research study on therapeutic effectiveness and patient treatment outcomes.'
          : 'Architected scalable microservices processing 10k+ requests per second.',
      ],
    };
    onChange({
      ...document,
      projects: [...(document.projects || []), newProj],
    });
  };

  const deleteProject = (index: number) => {
    const newProjects = [...(document.projects || [])];
    newProjects.splice(index, 1);
    onChange({ ...document, projects: newProjects });
  };

  // Certifications Management
  const updateCertification = (index: number, value: string) => {
    const newCerts = [...(document.certifications || [])];
    newCerts[index] = value;
    onChange({ ...document, certifications: newCerts });
  };

  const addCertification = () => {
    const newCerts = [
      ...(document.certifications || []),
      isHealthcare
        ? 'Good Clinical Practice (GCP) Certification'
        : 'AWS Certified Solutions Architect',
    ];
    onChange({ ...document, certifications: newCerts });
  };

  const deleteCertification = (index: number) => {
    const newCerts = [...(document.certifications || [])];
    newCerts.splice(index, 1);
    onChange({ ...document, certifications: newCerts });
  };

  // Deterministically partition pages matching Export Dialog and PDF Download
  const pages = partitionResumePages(document, 'LETTER');

  return (
    <div className="flex-1 h-full overflow-y-auto bg-neutral-200/60 p-4 sm:p-8 flex flex-col items-center gap-8 print:p-0 print:bg-white print:gap-0 scroll-py-8">
      {/* Render Individual Paginated Paper Sheets */}
      {pages.map((page, pageIdx) => (
        <div
          key={pageIdx}
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
          className="relative w-full max-w-[850px] bg-white rounded-xl shadow-md border border-neutral-300 min-h-[1056px] p-6 sm:p-8 text-neutral-900 flex flex-col justify-between shrink-0 print:min-h-0 print:shadow-none print:border-none print:p-0 print:break-after-page"
        >
          {/* Sheet Body */}
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {/* Page Continuation Banner (Pages 2+) */}
            {pageIdx > 0 && (
              <div className="border-b border-neutral-200 pb-2 mb-1 flex items-center justify-between text-xs text-neutral-500 select-none">
                <span className="font-bold text-[#0A1B5C] uppercase tracking-wider text-[11px]">
                  {document.contact.fullName || 'Candidate'} -{' '}
                  {page.roles.length > 0 && page.showEducation
                    ? 'Professional Experience & Education (Continued)'
                    : page.roles.length > 0
                    ? 'Professional Experience (Continued)'
                    : page.showEducation && page.showProjects
                    ? isHealthcare
                      ? 'Education & Clinical Projects'
                      : 'Education & Technical Projects'
                    : page.showProjects
                    ? projectsTitle
                    : page.showCertifications
                    ? 'Certifications & Credentials'
                    : 'Education (Continued)'}
                </span>
                <span className="text-[11px] text-neutral-400">Page {pageIdx + 1}</span>
              </div>
            )}

            {/* 1. Header & Contact Information (Page 1) */}
            {page.showContact && (
              <header className="border-b border-neutral-300 pb-5">
                <input
                  type="text"
                  value={document.contact.fullName}
                  onChange={(e) => updateContact('fullName', e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full text-3xl font-extrabold tracking-tight text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#0A1B5C] focus:outline-none transition-colors mb-2"
                />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3.5 text-xs text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="email"
                      value={document.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      placeholder="email@example.com"
                      className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="tel"
                      value={document.contact.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      value={document.contact.location}
                      onChange={(e) => updateContact('location', e.target.value)}
                      placeholder="City, State"
                      className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                    />
                  </div>

                  {/* LinkedIn */}
                  {document.contact.linkedinUrl && (
                    <div className="group/link flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/80">
                      <Linkedin className="h-3.5 w-3.5 text-[#0A1B5C] shrink-0" />
                      <input
                        type="text"
                        value={document.contact.linkedinUrl}
                        onChange={(e) => updateContact('linkedinUrl', e.target.value)}
                        placeholder="linkedin.com/in/username"
                        className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none text-xs w-36"
                      />
                      <button
                        type="button"
                        onClick={() => updateContact('linkedinUrl', '')}
                        title="Remove LinkedIn"
                        className="opacity-0 group-hover/link:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* GitHub */}
                  {document.contact.githubUrl && (
                    <div className="group/link flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/80">
                      <Github className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <input
                        type="text"
                        value={document.contact.githubUrl}
                        onChange={(e) => updateContact('githubUrl', e.target.value)}
                        placeholder="github.com/username"
                        className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none text-xs w-36"
                      />
                      <button
                        type="button"
                        onClick={() => updateContact('githubUrl', '')}
                        title="Remove GitHub"
                        className="opacity-0 group-hover/link:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* LeetCode */}
                  {document.contact.leetcodeUrl && (
                    <div className="group/link flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/80">
                      <Code2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        value={document.contact.leetcodeUrl}
                        onChange={(e) => updateContact('leetcodeUrl', e.target.value)}
                        placeholder="leetcode.com/u/username"
                        className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none text-xs w-36"
                      />
                      <button
                        type="button"
                        onClick={() => updateContact('leetcodeUrl', '')}
                        title="Remove LeetCode"
                        className="opacity-0 group-hover/link:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Portfolio */}
                  {document.contact.portfolioUrl && (
                    <div className="group/link flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/80">
                      <Globe className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <input
                        type="text"
                        value={document.contact.portfolioUrl}
                        onChange={(e) => updateContact('portfolioUrl', e.target.value)}
                        placeholder="yourportfolio.com"
                        className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none text-xs w-36"
                      />
                      <button
                        type="button"
                        onClick={() => updateContact('portfolioUrl', '')}
                        title="Remove Portfolio"
                        className="opacity-0 group-hover/link:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Add Social Links (Page 1) */}
                {(!document.contact.linkedinUrl ||
                  !document.contact.githubUrl ||
                  !document.contact.leetcodeUrl ||
                  !document.contact.portfolioUrl) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-neutral-100 print:hidden text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-500">Add Link:</span>
                    {!document.contact.linkedinUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateContact('linkedinUrl', 'linkedin.com/in/')
                        }
                        className="text-[#0A1B5C] hover:text-[#0A1B5C]/80 bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        + LinkedIn
                      </button>
                    )}
                    {!document.contact.githubUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateContact('githubUrl', 'github.com/')
                        }
                        className="text-[#0A1B5C] hover:text-[#0A1B5C]/80 bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        + GitHub
                      </button>
                    )}
                    {!document.contact.leetcodeUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateContact('leetcodeUrl', 'leetcode.com/u/')
                        }
                        className="text-[#0A1B5C] hover:text-[#0A1B5C]/80 bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        + LeetCode
                      </button>
                    )}
                    {!document.contact.portfolioUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateContact('portfolioUrl', 'https://')
                        }
                        className="text-[#0A1B5C] hover:text-[#0A1B5C]/80 bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        + Portfolio / Site
                      </button>
                    )}
                  </div>
                )}
              </header>
            )}

            {/* 2. Professional Summary */}
            {page.showSummary && (
              <section className="group/sec flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    Professional Summary
                  </h2>
                  <button
                    type="button"
                    onClick={() => onChange({ ...document, summary: '' })}
                    title="Remove Summary Section"
                    className="opacity-0 group-hover/sec:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={document.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  placeholder="Executive summary of your background, leadership scope, and core strengths..."
                  className="w-full text-[13px] leading-snug text-neutral-800 bg-transparent resize-none p-1 rounded hover:bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] transition-all"
                />
              </section>
            )}

            {/* 3. Core / Technical Skills */}
            {page.showSkills && (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    {skillsTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={addSkillCategory}
                    className="text-[11px] font-semibold text-[#0A1B5C] hover:text-[#0A1B5C]/80 flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-[#4FD1C5]" />
                    Add Category
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 text-xs text-neutral-800">
                  {document.skills.map((skillGroup, idx) => (
                    <EditableSkillRow
                      key={idx}
                      category={skillGroup.category}
                      items={skillGroup.items}
                      onChangeCategory={(newCat) => updateSkillCategoryName(idx, newCat)}
                      onChangeItems={(newItems) => updateSkillGroupItems(idx, newItems)}
                      onDeleteCategory={() => deleteSkillCategory(idx)}
                      canDelete={document.skills.length > 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Professional Experience */}
            {page.roles.length > 0 && (
              <section className="flex flex-col gap-3 sm:gap-3.5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    Work Experience {pageIdx > 0 ? '(Continued)' : ''}
                  </h2>
                  {pageIdx === 0 && (
                    <button
                      type="button"
                      onClick={addRole}
                      className="text-[11px] font-semibold text-[#0A1B5C] hover:text-[#0A1B5C]/80 flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-[#4FD1C5]" />
                      Add Position
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3.5 sm:gap-4">
                  {page.roles.map(({ role, globalIdx, bulletStartIndex = 0, bulletEndIndex, isContinuation }) => {
                    const bulletsToRender = role.bullets.slice(
                      bulletStartIndex,
                      bulletEndIndex !== undefined ? bulletEndIndex : role.bullets.length
                    );

                    return (
                      <div key={`${role.id || globalIdx}-${bulletStartIndex}`} className="group/role flex flex-col gap-1.5">
                        {/* Role Header */}
                        {!isContinuation ? (
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <input
                                type="text"
                                value={role.roleTitle}
                                onChange={(e) => updateRole(globalIdx, 'roleTitle', e.target.value)}
                                placeholder="Role Title"
                                className="text-[13.5px] font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                              />
                              <span className="text-neutral-400 font-bold select-none">•</span>
                              <input
                                type="text"
                                value={role.company}
                                onChange={(e) => updateRole(globalIdx, 'company', e.target.value)}
                                placeholder="Company"
                                className="text-[13.5px] font-semibold text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                              <input
                                type="text"
                                value={`${role.startDate} - ${role.endDate}`}
                                onChange={(e) => {
                                  const parts = e.target.value.split('-').map((s) => s.trim());
                                  updateRole(globalIdx, 'startDate', parts[0] || '');
                                  updateRole(globalIdx, 'endDate', parts[1] || 'Present');
                                }}
                                className="w-36 min-w-[140px] text-right bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                              />
                              {role.location && (
                                <>
                                  <span className="text-neutral-300 select-none">|</span>
                                  <input
                                    type="text"
                                    value={role.location}
                                    onChange={(e) => updateRole(globalIdx, 'location', e.target.value)}
                                    placeholder="Location"
                                    className="w-24 sm:w-28 text-right bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                                  />
                                </>
                              )}
                              {document.experience.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => deleteRole(globalIdx)}
                                  title="Delete Role"
                                  className="opacity-0 group-hover/role:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-between gap-1 text-xs text-neutral-500 border-b border-neutral-100 pb-1 mb-0.5">
                            <span className="font-semibold text-neutral-800">
                              {role.roleTitle} • {role.company} (Continued)
                            </span>
                          </div>
                        )}

                        {/* Bullets List */}
                        <div className="flex flex-col gap-0.5 pl-0.5">
                          {bulletsToRender.map((bullet, localIdx) => {
                            const actualBulletIdx = bulletStartIndex + localIdx;
                            const isTargetHighlighted =
                              highlightedCoordinate?.roleIndex === globalIdx &&
                              highlightedCoordinate?.bulletIndex === actualBulletIdx;

                            return (
                              <EditableBullet
                                key={actualBulletIdx}
                                bullet={bullet}
                                isHighlighted={isTargetHighlighted}
                                onChange={(newText) => updateBullet(globalIdx, actualBulletIdx, newText)}
                                onAddBelow={() => addBullet(globalIdx, actualBulletIdx)}
                                onDelete={() => deleteBullet(globalIdx, actualBulletIdx)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 5. Education */}
            {page.showEducation && (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    Education {pageIdx > 0 && (page.educationIndices?.[0] ?? 0) > 0 ? '(Continued)' : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="text-[11px] font-semibold text-[#0A1B5C] hover:text-[#0A1B5C]/80 flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-[#4FD1C5]" />
                    Add Education
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {(page.educationIndices
                    ? page.educationIndices.map((idx) => ({ edu: document.education[idx], eduIdx: idx })).filter((x) => x.edu)
                    : document.education.map((edu, eduIdx) => ({ edu, eduIdx }))
                  ).map(({ edu, eduIdx }) => (
                    <div key={edu.id || eduIdx} className="group/edu flex justify-between items-baseline text-xs gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateEducation(eduIdx, 'institution', e.currentTarget.textContent || '')}
                          className="font-bold text-neutral-900 break-words hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                        >
                          {edu.institution}
                        </span>
                        <span className="text-neutral-700 break-words">
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateEducation(eduIdx, 'degree', e.currentTarget.textContent || '')}
                            className="hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                          >
                            {edu.degree}
                          </span>
                          {edu.fieldOfStudy &&
                          !edu.degree.toLowerCase().includes(edu.fieldOfStudy.toLowerCase())
                            ? ` in ${edu.fieldOfStudy}`
                            : ''}
                          {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-500 font-medium shrink-0">
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateEducation(eduIdx, 'endDate', e.currentTarget.textContent || '')}
                          className="hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] text-right"
                        >
                          {edu.endDate}
                        </span>
                        {document.education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteEducation(eduIdx)}
                            title="Delete Education"
                            className="opacity-0 group-hover/edu:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Projects */}
            {page.showProjects && document.projects && document.projects.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    {projectsTitle} {pageIdx > 0 && (page.projectIndices?.[0] ?? 0) > 0 ? '(Continued)' : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={addProject}
                    className="text-[11px] font-semibold text-[#0A1B5C] hover:text-[#0A1B5C]/80 flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-[#4FD1C5]" />
                    Add Project
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {(page.projectIndices
                    ? page.projectIndices.map((idx) => ({ proj: document.projects![idx], projIdx: idx })).filter((x) => x.proj)
                    : document.projects.map((proj, projIdx) => ({ proj, projIdx }))
                  ).map(({ proj, projIdx }) => (
                    <div key={proj.id || projIdx} className="group/proj flex flex-col gap-1 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateProjectField(projIdx, 'title', e.currentTarget.textContent || '')}
                          className="font-bold text-neutral-900 break-words flex-1 pr-2 hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                        >
                          {proj.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(proj.repoUrl || proj.liveUrl) && (
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {proj.repoUrl || proj.liveUrl}
                            </span>
                          )}
                          {proj.techStack && proj.techStack.length > 0 && (
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const parts = (e.currentTarget.textContent || '')
                                  .split(/[•,]/)
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                updateProjectField(projIdx, 'techStack', parts);
                              }}
                              className="text-[11px] text-neutral-500 font-medium whitespace-nowrap hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                            >
                              {proj.techStack.join(' • ')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteProject(projIdx)}
                            title="Delete Project"
                            className="opacity-0 group-hover/proj:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pl-0.5">
                        {proj.bullets.map((b, bIdx) => (
                          <EditableBullet
                            key={bIdx}
                            bullet={b}
                            isHighlighted={false}
                            onChange={(newText) => updateProjectBullet(projIdx, bIdx, newText)}
                            onAddBelow={() => addProjectBullet(projIdx, bIdx)}
                            onDelete={() => deleteProjectBullet(projIdx, bIdx)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Certifications */}
            {page.showCertifications && document.certifications && document.certifications.length > 0 && (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C]">
                    Certifications & Credentials {pageIdx > 0 && (page.certificationIndices?.[0] ?? 0) > 0 ? '(Continued)' : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={addCertification}
                    className="text-[11px] font-semibold text-[#0A1B5C] hover:text-[#0A1B5C]/80 flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-[#4FD1C5]" />
                    Add Certification
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {(page.certificationIndices
                    ? page.certificationIndices.map((idx) => ({ cert: document.certifications![idx], certIdx: idx })).filter((x) => x.cert)
                    : document.certifications.map((cert, certIdx) => ({ cert, certIdx }))
                  ).map(({ cert, certIdx }) => (
                    <div key={certIdx} className="group/cert flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-neutral-400 select-none">•</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateCertification(certIdx, e.currentTarget.textContent || '')}
                          className="hover:bg-neutral-50 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] flex-1 text-neutral-800 leading-snug"
                        >
                          {cert}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteCertification(certIdx)}
                        title="Delete Certification"
                        className="opacity-0 group-hover/cert:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Authentic Document Page Footer */}
          <footer className="mt-auto pt-3 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-400 select-none print:text-neutral-500">
            <span className="font-medium text-neutral-500">
              {document.contact.fullName || 'Candidate'} - Resume
            </span>
            <span className="font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200/80">
              Page {pageIdx + 1} of {pages.length}
            </span>
          </footer>
        </div>
      ))}

      {/* Quick Add Content & Section Toolbar */}
      <div className="w-full max-w-[850px] bg-white border border-neutral-300 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
          <Plus className="h-4 w-4 text-[#0A1B5C]" />
          <span>Add Section:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRole}
            className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[#4FD1C5]" />
            Position
          </button>
          <button
            type="button"
            onClick={addSkillCategory}
            className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[#4FD1C5]" />
            Skill Category
          </button>
          <button
            type="button"
            onClick={addEducation}
            className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[#4FD1C5]" />
            Education
          </button>
          <button
            type="button"
            onClick={addProject}
            className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[#4FD1C5]" />
            Project
          </button>
          <button
            type="button"
            onClick={addCertification}
            className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[#4FD1C5]" />
            Certification
          </button>
          {!document.summary && (
            <button
              type="button"
              onClick={addSummary}
              className="px-2.5 py-1 text-xs font-semibold text-[#0A1B5C] bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3 text-[#4FD1C5]" />
              Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

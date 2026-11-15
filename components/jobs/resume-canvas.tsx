'use client';

import React from 'react';
import {
  ResumeDocument,
  WorkExperienceItem,
} from '@/lib/jobs/types';
import { partitionResumePages, PaginatedResumePage } from '@/lib/jobs/pagination';
import { EditableBullet } from './editable-bullet';
import { Plus, Trash2, Mail, Phone, MapPin, Linkedin, Github, Globe, Code2, X } from 'lucide-react';

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
      'Accomplished [X], measured by [Y], by doing [Z].'
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
      company: 'Company Name',
      roleTitle: 'Software Engineer',
      location: 'Location / Remote',
      startDate: '2023',
      endDate: 'Present',
      isCurrent: true,
      bullets: ['Accomplished [X], measured by [Y], by doing [Z].'],
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

  // Deterministically partition pages matching Export Dialog and PDF Download
  const pages = partitionResumePages(document, 'LETTER');

  return (
    <div className="flex-1 h-full overflow-y-auto bg-neutral-200/60 p-4 sm:p-8 flex flex-col items-center gap-8 print:p-0 print:bg-white print:gap-0 scroll-py-8">
      {/* Render Individual Paginated Paper Sheets */}
      {pages.map((page, pageIdx) => (
        <div
          key={pageIdx}
          className="relative w-full max-w-[850px] bg-white rounded-xl shadow-md border border-neutral-300 min-h-[1056px] p-6 sm:p-8 text-neutral-900 font-sans flex flex-col justify-between print:min-h-0 print:shadow-none print:border-none print:p-0 print:break-after-page"
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
                    ? 'Education & Technical Projects'
                    : page.showProjects
                    ? 'Key Technical Projects & Research'
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
                      type="text"
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
                      placeholder="City, State / Remote"
                      className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                    />
                  </div>

                  {/* LinkedIn */}
                  {document.contact.linkedinUrl && (
                    <div className="group/link flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/80">
                      <Linkedin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
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
                      <Globe className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <input
                        type="text"
                        value={document.contact.portfolioUrl}
                        onChange={(e) => updateContact('portfolioUrl', e.target.value)}
                        placeholder="portfolio.dev"
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

                {/* Quick Add Social & Technical Links */}
                {(!document.contact.linkedinUrl ||
                  !document.contact.githubUrl ||
                  !document.contact.leetcodeUrl ||
                  !document.contact.portfolioUrl) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-dashed border-neutral-200 print:hidden text-[11px]">
                    <span className="text-neutral-500 font-medium mr-1">Add Profile Link:</span>
                    {!document.contact.linkedinUrl && (
                      <button
                        type="button"
                        onClick={() => updateContact('linkedinUrl', 'linkedin.com/in/')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20 font-medium transition-colors cursor-pointer"
                      >
                        <Linkedin className="h-3 w-3" />
                        + LinkedIn
                      </button>
                    )}
                    {!document.contact.githubUrl && (
                      <button
                        type="button"
                        onClick={() => updateContact('githubUrl', 'github.com/')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20 font-medium transition-colors cursor-pointer"
                      >
                        <Github className="h-3 w-3" />
                        + GitHub
                      </button>
                    )}
                    {!document.contact.leetcodeUrl && (
                      <button
                        type="button"
                        onClick={() => updateContact('leetcodeUrl', 'leetcode.com/u/')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20 font-medium transition-colors cursor-pointer"
                      >
                        <Code2 className="h-3 w-3" />
                        + LeetCode
                      </button>
                    )}
                    {!document.contact.portfolioUrl && (
                      <button
                        type="button"
                        onClick={() => updateContact('portfolioUrl', 'portfolio.dev')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A1B5C]/5 hover:bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20 font-medium transition-colors cursor-pointer"
                      >
                        <Globe className="h-3 w-3" />
                        + Portfolio / Site
                      </button>
                    )}
                  </div>
                )}
              </header>
            )}

            {/* 2. Executive Summary */}
            {page.showSummary && (
              <section className="flex flex-col gap-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-200 pb-1">
                  Professional Summary
                </h2>
                <textarea
                  rows={3}
                  value={document.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  placeholder="Executive summary of your technical background, leadership scope, and core strengths..."
                  className="w-full text-[13px] leading-snug text-neutral-800 bg-transparent resize-none p-1 rounded hover:bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] transition-all"
                />
              </section>
            )}

            {/* 3. Core Technical Skills */}
            {page.showSkills && (
              <section className="flex flex-col gap-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-200 pb-1">
                  Technical Skills
                </h2>
                <div className="flex flex-col gap-1 text-xs text-neutral-800">
                  {document.skills.map((skillGroup, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold text-neutral-900 shrink-0 pt-0.5 select-none">
                        {skillGroup.category}:
                      </span>
                      <textarea
                        rows={1}
                        value={skillGroup.items.join(', ')}
                        onChange={(e) => {
                          const newSkills = [...document.skills];
                          newSkills[idx].items = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          onChange({ ...document, skills: newSkills });
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#0A1B5C] focus:outline-none p-0 text-xs leading-snug resize-none overflow-hidden text-neutral-700"
                      />
                    </div>
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
                      className="text-[11px] font-semibold text-[#0A1B5C] hover:text-blue-800 flex items-center gap-1 transition-colors print:hidden"
                    >
                      <Plus className="h-3 w-3" />
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
                                className="w-28 text-right bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                              />
                              {role.location && (
                                <>
                                  <span className="text-neutral-300 select-none">|</span>
                                  <input
                                    type="text"
                                    value={role.location}
                                    onChange={(e) => updateRole(globalIdx, 'location', e.target.value)}
                                    placeholder="Location"
                                    className="w-28 text-right bg-transparent border-b border-transparent hover:border-neutral-300 focus:outline-none"
                                  />
                                </>
                              )}
                              {document.experience.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => deleteRole(globalIdx)}
                                  title="Delete Role"
                                  className="opacity-0 group-hover/role:opacity-100 text-neutral-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden"
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
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-200 pb-1">
                  Education
                </h2>

                <div className="flex flex-col gap-2">
                  {document.education.map((edu, eduIdx) => (
                    <div key={edu.id || eduIdx} className="flex justify-between items-baseline text-xs gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-neutral-900 break-words">
                          {edu.institution}
                        </span>
                        <span className="text-neutral-700 break-words">
                          {edu.degree}
                          {edu.fieldOfStudy &&
                          !edu.degree.toLowerCase().includes(edu.fieldOfStudy.toLowerCase())
                            ? ` in ${edu.fieldOfStudy}`
                            : ''}
                          {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                        </span>
                      </div>
                      <span className="text-neutral-500 font-medium shrink-0 text-right">
                        {edu.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Featured Projects */}
            {page.showProjects && document.projects && document.projects.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-200 pb-1">
                  Key Technical Projects
                </h2>

                <div className="flex flex-col gap-2.5">
                  {document.projects.map((proj, projIdx) => (
                    <div key={proj.id || projIdx} className="flex flex-col gap-1 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <span className="font-bold text-neutral-900 break-words flex-1 pr-2">
                          {proj.title}
                        </span>
                        {proj.techStack && proj.techStack.length > 0 && (
                          <span className="text-[11px] text-neutral-500 font-medium shrink-0 whitespace-nowrap">
                            {proj.techStack.join(' • ')}
                          </span>
                        )}
                      </div>
                      {proj.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-1.5 text-neutral-700 pl-2">
                          <span className="select-none shrink-0">•</span>
                          <span className="break-words flex-1 leading-snug text-[13px]">{b}</span>
                        </div>
                      ))}
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
    </div>
  );
}

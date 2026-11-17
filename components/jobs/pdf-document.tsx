import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  ResumeDocument,
  ResumeExportConfig,
  DEFAULT_EXPORT_CONFIG,
  ResumeDateFormat,
} from '@/lib/jobs/types';
import { partitionResumePages, PaginatedRoleSegment } from '@/lib/jobs/pagination';
import { detectResumeDomain } from '@/lib/jobs/xyz-evaluator';

/**
 * Format resume date strings based on selected user preference.
 */
function formatResumeDate(dateStr: string, format: ResumeDateFormat): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.toLowerCase() === 'present' || trimmed.toLowerCase() === 'current') {
    return 'Present';
  }

  // If already like "2021" or "2021 - 2023"
  const dateMatch = trimmed.match(/^([A-Za-z]+|\d{1,2})?[/-]?\s*(\d{4})$/);
  if (!dateMatch) return trimmed;

  const rawMonth = dateMatch[1];
  const year = dateMatch[2];

  if (!rawMonth) return year;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  let monthIndex = -1;
  const numMonth = parseInt(rawMonth, 10);
  if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) {
    monthIndex = numMonth - 1;
  } else {
    monthIndex = shortMonths.findIndex(
      (m) => m.toLowerCase() === rawMonth.toLowerCase().slice(0, 3)
    );
  }

  if (monthIndex === -1) return trimmed;

  switch (format) {
    case 'short':
      return `${shortMonths[monthIndex]} ${year}`;
    case 'full':
      return `${monthNames[monthIndex]} ${year}`;
    case 'numeric':
      return `${String(monthIndex + 1).padStart(2, '0')}/${year}`;
    case 'year':
      return year;
    default:
      return `${shortMonths[monthIndex]} ${year}`;
  }
}

function formatDateRange(start?: string, end?: string, format: ResumeDateFormat = 'short'): string {
  const formattedStart = start ? formatResumeDate(start, format) : '';
  const formattedEnd = end ? formatResumeDate(end, format) : 'Present';
  if (formattedStart && formattedEnd) return `${formattedStart} - ${formattedEnd}`;
  return formattedStart || formattedEnd || '';
}

export interface ResumePDFDocumentProps {
  document: ResumeDocument;
  config?: ResumeExportConfig;
}

export function ResumePDFDocument({
  document,
  config = DEFAULT_EXPORT_CONFIG,
}: ResumePDFDocumentProps) {
  const {
    pageSize = 'LETTER',
    template = 'standard',
    accentColor = '#0A1B5C',
    accentScope = 'all',
    fontFamily = 'Times-Roman',
    fontSizes = DEFAULT_EXPORT_CONFIG.fontSizes,
    dateFormat = 'short',
    bulletStyle = '•',
  } = config;

  // Resolve ATS-safe standard PostScript fonts for @react-pdf
  const isSerif =
    fontFamily === 'Times-Roman' ||
    fontFamily === 'Georgia' ||
    fontFamily === 'Garamond' ||
    fontFamily === 'Cambria';
  const isMonospace = fontFamily === 'Courier';

  const fontRegular = isSerif
    ? 'Times-Roman'
    : isMonospace
    ? 'Courier'
    : 'Helvetica';

  const fontBold = isSerif
    ? 'Times-Bold'
    : isMonospace
    ? 'Courier-Bold'
    : 'Helvetica-Bold';

  const isCompact = template === 'compact';
  const isCentered = template === 'centered';
  const isStructured = template === 'structured';

  const nameColor =
    accentScope === 'all' || accentScope === 'name' ? accentColor : '#111827';
  const headingColor =
    accentScope === 'all' || accentScope === 'titles' ? accentColor : '#111827';

  // Dynamic Stylesheet based on user configuration
  const dynamicStyles = StyleSheet.create({
    page: {
      paddingTop: isCompact ? 20 : isStructured ? 22 : 24,
      paddingBottom: isCompact ? 22 : isStructured ? 24 : 24,
      paddingLeft: isCompact ? 26 : isStructured ? 28 : 28,
      paddingRight: isCompact ? 26 : isStructured ? 28 : 28,
      fontFamily: fontRegular,
      fontSize: fontSizes.bodyText,
      lineHeight: isCompact || isStructured ? 1.22 : 1.25,
      color: '#111827',
      position: 'relative',
    },
    pageContinuationHeader: {
      borderBottomWidth: 0.75,
      borderBottomColor: '#E5E7EB',
      paddingBottom: isCompact ? 2 : 2.5,
      marginBottom: isCompact ? 5 : 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pageContinuationTitle: {
      fontSize: fontSizes.bodyText * 0.75,
      fontFamily: fontBold,
      color: headingColor,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pageContinuationNumber: {
      fontSize: fontSizes.bodyText * 0.75,
      color: '#9CA3AF',
    },
    continuedRoleHeader: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#F3F4F6',
      paddingBottom: 2,
      marginBottom: 2.5,
    },
    continuedRoleTitle: {
      fontSize: fontSizes.bodyText * 0.9,
      fontFamily: fontBold,
      color: '#374151',
    },
    footer: {
      position: 'absolute',
      bottom: isCompact ? 10 : 12,
      left: isCompact ? 26 : isStructured ? 28 : 28,
      right: isCompact ? 26 : isStructured ? 28 : 28,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 0.5,
      borderTopColor: '#E5E7EB',
      paddingTop: 2.5,
    },
    footerText: {
      fontSize: 8,
      color: '#9CA3AF',
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: isCentered ? 'transparent' : '#E5E7EB',
      paddingBottom: isCompact ? 6 : isStructured ? 6 : 7,
      marginBottom: isCompact ? 7 : isStructured ? 7 : 8,
      alignItems: isCentered ? 'center' : 'flex-start',
    },
    fullName: {
      fontSize: fontSizes.name,
      fontFamily: fontBold,
      color: nameColor,
      lineHeight: 1.15,
      marginBottom: isCompact ? 3 : isStructured ? 3 : 4,
      textAlign: isCentered ? 'center' : 'left',
      letterSpacing: -0.5,
    },
    contactLine: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: isCentered ? 'center' : 'flex-start',
      marginTop: 1.5,
    },
    contactSeparator: {
      color: '#9CA3AF',
      marginHorizontal: 3.5,
      fontSize: fontSizes.bodyText * 0.8,
    },
    contactItem: {
      fontSize: fontSizes.bodyText * 0.88,
      color: '#6B7280',
    },
    section: {
      marginBottom: isCompact ? 5 : isStructured ? 5 : 6,
    },
    sectionTitle: {
      fontSize: fontSizes.sectionHeaders,
      fontFamily: fontBold,
      color: headingColor,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      borderBottomWidth: 0.75,
      borderBottomColor: '#E5E7EB',
      paddingBottom: isCompact ? 1 : isStructured ? 1 : 1.5,
      marginBottom: isCompact ? 3 : isStructured ? 3 : 3.5,
      textAlign: isCentered && !isStructured ? 'center' : 'left',
    },
    summaryText: {
      fontSize: fontSizes.bodyText * 0.92,
      lineHeight: isCompact || isStructured ? 1.22 : 1.26,
      color: '#374151',
      textAlign: isCentered ? 'center' : 'left',
    },
    roleContainer: {
      marginBottom: isCompact ? 3.5 : isStructured ? 4 : 4.5,
    },
    roleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 1.5,
    },
    roleTitleContainer: {
      flex: 1,
      marginRight: 6,
    },
    roleTitle: {
      fontSize: fontSizes.subHeaders,
      fontFamily: fontBold,
      color: '#111827',
      textAlign: isCentered && !isStructured ? 'center' : 'left',
    },
    companyName: {
      fontSize: fontSizes.bodyText * 0.95,
      fontFamily: fontRegular,
      color: '#6B7280',
    },
    dateLocation: {
      fontSize: fontSizes.bodyText * 0.85,
      color: '#6B7280',
      flexShrink: 0,
      textAlign: 'right',
    },
    projectTechStack: {
      fontSize: fontSizes.bodyText * 0.85,
      color: '#6B7280',
      flexShrink: 0,
      textAlign: 'right',
      maxWidth: '45%',
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: isCompact ? 1 : isStructured ? 1 : 1.5,
      paddingLeft: 3,
    },
    bulletPoint: {
      width: 9,
      fontSize: fontSizes.bodyText * 0.9,
      color: headingColor,
    },
    bulletText: {
      flex: 1,
      fontSize: fontSizes.bodyText * 0.9,
      lineHeight: isCompact || isStructured ? 1.22 : 1.25,
      color: '#1F2937',
    },
    skillLine: {
      fontSize: fontSizes.bodyText * 0.9,
      lineHeight: isCompact || isStructured ? 1.18 : 1.22,
      marginBottom: isCompact ? 1 : 1.5,
      textAlign: isCentered ? 'center' : 'left',
    },
    skillCategory: {
      fontSize: fontSizes.bodyText * 0.9,
      fontFamily: fontBold,
      color: '#111827',
    },
    skillItems: {
      fontSize: fontSizes.bodyText * 0.88,
      fontFamily: fontRegular,
      color: '#374151',
    },
    structuredSkillGroup: {
      marginBottom: isCompact ? 3 : 4,
    },
    structuredSkillCategory: {
      fontSize: fontSizes.bodyText * 0.9,
      fontFamily: fontBold,
      color: '#111827',
      marginBottom: 1,
    },
    structuredSkillItems: {
      fontSize: fontSizes.bodyText * 0.85,
      lineHeight: 1.22,
      color: '#374151',
    },
    eduContainer: {
      marginBottom: isCompact ? 2.5 : 3.5,
    },
    eduHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    eduInstitution: {
      fontSize: fontSizes.subHeaders * 0.95,
      fontFamily: fontBold,
      color: '#111827',
      textAlign: isCentered && !isStructured ? 'center' : 'left',
    },
    eduDegree: {
      fontSize: fontSizes.bodyText * 0.9,
      color: '#4B5563',
      marginTop: 1,
      textAlign: isCentered && !isStructured ? 'center' : 'left',
    },
    structuredEduGroup: {
      marginBottom: isCompact ? 3 : 4,
    },
    structuredEduInstitution: {
      fontSize: fontSizes.bodyText * 0.9,
      fontFamily: fontBold,
      color: '#111827',
      marginBottom: 1,
    },
    structuredEduDegree: {
      fontSize: fontSizes.bodyText * 0.85,
      color: '#4B5563',
      lineHeight: 1.22,
    },
    structuredEduDate: {
      fontSize: fontSizes.bodyText * 0.8,
      color: '#9CA3AF',
      marginTop: 1,
    },
    structuredColumns: {
      flexDirection: 'row',
    },
    structuredMainCol: {
      width: '65%',
      paddingRight: 12,
    },
    structuredSideCol: {
      width: '35%',
      paddingLeft: 12,
      borderLeftWidth: 0.75,
      borderLeftColor: '#E5E7EB',
    },
  });

  const contactParts = [
    document.contact.email,
    document.contact.phone,
    document.contact.location,
    document.contact.linkedinUrl
      ? document.contact.linkedinUrl.replace(/^https?:\/\//, '')
      : '',
    document.contact.githubUrl
      ? document.contact.githubUrl.replace(/^https?:\/\//, '')
      : '',
    document.contact.leetcodeUrl
      ? document.contact.leetcodeUrl.replace(/^https?:\/\//, '')
      : '',
    document.contact.portfolioUrl
      ? document.contact.portfolioUrl.replace(/^https?:\/\//, '')
      : '',
  ].filter(Boolean);

  // Common Sections: Summary, Experience, Skills, Education, Projects
  const isHealthcare = detectResumeDomain('', document) === 'healthcare';
  const skillsTitle = isHealthcare ? 'Core Skills' : 'Technical Skills';
  const projectsTitle = isHealthcare ? 'Key Projects & Research' : 'Key Technical Projects';

  const renderSummarySection = () =>
    document.summary ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Professional Summary</Text>
        <Text style={dynamicStyles.summaryText}>{document.summary}</Text>
      </View>
    ) : null;

  const renderSkillsSection = () =>
    document.skills && document.skills.length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{skillsTitle}</Text>
        {isStructured
          ? document.skills.map((skillGroup, idx) => (
              <View key={idx} style={dynamicStyles.structuredSkillGroup} wrap={false}>
                <Text style={dynamicStyles.structuredSkillCategory}>{skillGroup.category}</Text>
                <Text style={dynamicStyles.structuredSkillItems}>{skillGroup.items.join(', ')}</Text>
              </View>
            ))
          : document.skills.map((skillGroup, idx) => (
              <Text key={idx} style={dynamicStyles.skillLine}>
                <Text style={dynamicStyles.skillCategory}>{skillGroup.category}: </Text>
                <Text style={dynamicStyles.skillItems}>{skillGroup.items.join(', ')}</Text>
              </Text>
            ))}
      </View>
    ) : null;

  const renderExperienceSection = (roles: PaginatedRoleSegment[], isContinuationPage = false) =>
    roles && roles.length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>
          Work Experience {isContinuationPage ? '(Continued)' : ''}
        </Text>
        {roles.map((roleSegment, idx) => {
          const { role, bulletStartIndex = 0, bulletEndIndex, isContinuation } = roleSegment;
          const bulletsToRender = role.bullets.slice(
            bulletStartIndex,
            bulletEndIndex !== undefined ? bulletEndIndex : role.bullets.length
          );

          return (
            <View key={idx} style={dynamicStyles.roleContainer}>
              {isContinuation ? (
                <View style={dynamicStyles.continuedRoleHeader}>
                  <Text style={dynamicStyles.continuedRoleTitle}>
                    {role.roleTitle} • {role.company} (Continued)
                  </Text>
                </View>
              ) : (
                <View style={dynamicStyles.roleHeader} wrap={false}>
                  <View style={dynamicStyles.roleTitleContainer}>
                    <Text style={dynamicStyles.roleTitle}>
                      {role.roleTitle}{' '}
                      <Text style={dynamicStyles.companyName}>• {role.company}</Text>
                    </Text>
                  </View>
                  <Text style={dynamicStyles.dateLocation}>
                    {formatDateRange(role.startDate, role.endDate, dateFormat)}{' '}
                    {role.location ? `| ${role.location}` : ''}
                  </Text>
                </View>
              )}
              {bulletsToRender.map((bullet, bulletIdx) => (
                <View key={bulletIdx} style={dynamicStyles.bulletRow} wrap={false}>
                  <Text style={dynamicStyles.bulletPoint}>{bulletStyle}</Text>
                  <Text style={dynamicStyles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    ) : null;

  const renderEducationSection = (indices?: number[], isContinuation = false) => {
    if (!document.education || document.education.length === 0) return null;
    const itemsToRender = indices
      ? indices.map((idx) => ({ edu: document.education[idx], idx })).filter((x) => x.edu)
      : document.education.map((edu, idx) => ({ edu, idx }));

    if (itemsToRender.length === 0) return null;

    return (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>
          Education {isContinuation ? '(Continued)' : ''}
        </Text>
        {itemsToRender.map(({ edu, idx: eduIdx }) => (
          <View
            key={eduIdx}
            style={isStructured ? dynamicStyles.structuredEduGroup : dynamicStyles.eduContainer}
            wrap={false}
          >
            {isStructured ? (
              <>
                <Text style={dynamicStyles.structuredEduInstitution}>{edu.institution}</Text>
                <Text style={dynamicStyles.structuredEduDegree}>
                  {edu.degree}
                  {edu.fieldOfStudy &&
                  !edu.degree.toLowerCase().includes(edu.fieldOfStudy.toLowerCase())
                    ? ` in ${edu.fieldOfStudy}`
                    : ''}
                  {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                </Text>
                {edu.endDate ? (
                  <Text style={dynamicStyles.structuredEduDate}>
                    {formatResumeDate(edu.endDate, dateFormat)}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <View style={dynamicStyles.eduHeader}>
                  <Text style={dynamicStyles.eduInstitution}>{edu.institution}</Text>
                  <Text style={dynamicStyles.dateLocation}>
                    {edu.endDate ? formatResumeDate(edu.endDate, dateFormat) : ''}
                  </Text>
                </View>
                <Text style={dynamicStyles.eduDegree}>
                  {edu.degree}
                  {edu.fieldOfStudy &&
                  !edu.degree.toLowerCase().includes(edu.fieldOfStudy.toLowerCase())
                    ? ` in ${edu.fieldOfStudy}`
                    : ''}
                  {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderProjectsSection = (indices?: number[], isContinuation = false) => {
    if (!document.projects || document.projects.length === 0) return null;
    const itemsToRender = indices
      ? indices.map((idx) => ({ proj: document.projects![idx], idx })).filter((x) => x.proj)
      : document.projects.map((proj, idx) => ({ proj, idx }));

    if (itemsToRender.length === 0) return null;

    return (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>
          {projectsTitle} {isContinuation ? '(Continued)' : ''}
        </Text>
        {itemsToRender.map(({ proj, idx: projIdx }) => (
          <View key={projIdx} style={dynamicStyles.roleContainer}>
            <View
              style={dynamicStyles.roleHeader}
              wrap={Boolean(proj.bullets && proj.bullets.length > 0 ? false : true)}
            >
              <View style={dynamicStyles.roleTitleContainer}>
                <Text style={dynamicStyles.roleTitle}>{proj.title}</Text>
              </View>
              {(proj.repoUrl || proj.liveUrl) && (
                <Text style={dynamicStyles.projectTechStack}>
                  {proj.repoUrl || proj.liveUrl}
                </Text>
              )}
              {proj.techStack && proj.techStack.length > 0 && (
                <Text style={dynamicStyles.projectTechStack}>
                  {proj.techStack.join(' • ')}
                </Text>
              )}
            </View>
            {proj.bullets.map((b, bIdx) => (
              <View key={bIdx} style={dynamicStyles.bulletRow} wrap={false}>
                <Text style={dynamicStyles.bulletPoint}>{bulletStyle}</Text>
                <Text style={dynamicStyles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderCertificationsSection = (indices?: number[], isContinuation = false) => {
    if (!document.certifications || document.certifications.length === 0) return null;
    const itemsToRender = indices
      ? indices.map((idx) => ({ cert: document.certifications![idx], idx })).filter((x) => x.cert)
      : document.certifications.map((cert, idx) => ({ cert, idx }));

    if (itemsToRender.length === 0) return null;

    return (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>
          Certifications & Credentials {isContinuation ? '(Continued)' : ''}
        </Text>
        {itemsToRender.map(({ cert, idx: certIdx }) => (
          <View key={certIdx} style={dynamicStyles.bulletRow} wrap={false}>
            <Text style={dynamicStyles.bulletPoint}>{bulletStyle}</Text>
            <Text style={dynamicStyles.bulletText}>{cert}</Text>
          </View>
        ))}
      </View>
    );
  };

  const pages = partitionResumePages(document, pageSize, template);

  return (
    <Document title={`${document.contact.fullName || 'Candidate'} - Resume`}>
      {pages.map((page, pageIdx) => (
        <Page key={pageIdx} size={pageSize} style={dynamicStyles.page}>
          {/* Page Continuation Header (Page 2+) */}
          {pageIdx > 0 && (
            <View style={dynamicStyles.pageContinuationHeader}>
              <Text style={dynamicStyles.pageContinuationTitle}>
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
              </Text>
              <Text style={dynamicStyles.pageContinuationNumber}>
                Page {pageIdx + 1}
              </Text>
            </View>
          )}

          {/* Header Block (Page 1) */}
          {page.showContact && (
            <View style={dynamicStyles.header}>
              <Text style={dynamicStyles.fullName}>
                {document.contact.fullName || 'Candidate Profile'}
              </Text>
              <View style={dynamicStyles.contactLine}>
                {contactParts.map((part, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {idx > 0 && <Text style={dynamicStyles.contactSeparator}>•</Text>}
                    <Text style={dynamicStyles.contactItem}>{part}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Structured (2-Column) vs Linear Templates */}
          {isStructured ? (
            <View style={dynamicStyles.structuredColumns}>
              <View style={dynamicStyles.structuredMainCol}>
                {page.showSummary && renderSummarySection()}
                {page.roles.length > 0 && renderExperienceSection(page.roles, pageIdx > 0)}
                {page.showProjects && renderProjectsSection(page.projectIndices, pageIdx > 0 && !page.isFirstPage)}
                {page.showCertifications && renderCertificationsSection(page.certificationIndices, pageIdx > 0 && !page.isFirstPage)}
              </View>
              <View style={dynamicStyles.structuredSideCol}>
                {page.showSkills && renderSkillsSection()}
                {page.showEducation && renderEducationSection(page.educationIndices, pageIdx > 0 && !page.isFirstPage)}
              </View>
            </View>
          ) : (
            <>
              {page.showSummary && renderSummarySection()}
              {page.showSkills && renderSkillsSection()}
              {page.roles.length > 0 && renderExperienceSection(page.roles, pageIdx > 0)}
              {page.showEducation && renderEducationSection(page.educationIndices, pageIdx > 0 && !page.isFirstPage && (page.educationIndices?.[0] ?? 0) > 0)}
              {page.showProjects && renderProjectsSection(page.projectIndices, pageIdx > 0 && !page.isFirstPage && (page.projectIndices?.[0] ?? 0) > 0)}
              {page.showCertifications && renderCertificationsSection(page.certificationIndices, pageIdx > 0 && !page.isFirstPage && (page.certificationIndices?.[0] ?? 0) > 0)}
            </>
          )}

          {/* Authentic Document Page Footer */}
          <View style={dynamicStyles.footer} fixed>
            <Text style={dynamicStyles.footerText}>
              {document.contact.fullName || 'Candidate'} - Resume
            </Text>
            <Text style={dynamicStyles.footerText}>
              Page {pageIdx + 1} of {pages.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

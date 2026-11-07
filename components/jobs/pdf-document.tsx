import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  ResumeDocument,
  ResumeExportConfig,
  DEFAULT_EXPORT_CONFIG,
  ResumeDateFormat,
} from '@/lib/jobs/types';

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
    fontFamily = 'Helvetica',
    fontSizes = DEFAULT_EXPORT_CONFIG.fontSizes,
    dateFormat = 'short',
    bulletStyle = '•',
  } = config;

  // Resolve ATS-safe standard PostScript fonts for @react-pdf
  const fontRegular =
    fontFamily === 'Times-Roman'
      ? 'Times-Roman'
      : fontFamily === 'Courier'
      ? 'Courier'
      : 'Helvetica';

  const fontBold =
    fontFamily === 'Times-Roman'
      ? 'Times-Bold'
      : fontFamily === 'Courier'
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
      paddingTop: isCompact ? 24 : 36,
      paddingBottom: isCompact ? 24 : 36,
      paddingLeft: isCompact ? 28 : 36,
      paddingRight: isCompact ? 28 : 36,
      fontFamily: fontRegular,
      fontSize: fontSizes.bodyText,
      lineHeight: isCompact ? 1.25 : 1.35,
      color: '#111827',
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: isCentered ? 'transparent' : '#E5E7EB',
      paddingBottom: isCompact ? 6 : 10,
      marginBottom: isCompact ? 8 : 12,
      alignItems: isCentered ? 'center' : 'flex-start',
    },
    fullName: {
      fontSize: fontSizes.name,
      fontFamily: fontBold,
      color: nameColor,
      marginBottom: isCompact ? 4 : 6,
      textAlign: isCentered ? 'center' : 'left',
      letterSpacing: -0.5,
    },
    contactLine: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      fontSize: fontSizes.bodyText * 0.85,
      color: '#4B5563',
      justifyContent: isCentered ? 'center' : 'flex-start',
      marginTop: 2,
    },
    section: {
      marginBottom: isCompact ? 7 : 10,
    },
    sectionTitle: {
      fontSize: fontSizes.sectionHeaders,
      fontFamily: fontBold,
      color: headingColor,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      borderBottomWidth: 0.75,
      borderBottomColor: '#E5E7EB',
      paddingBottom: isCompact ? 1.5 : 2.5,
      marginBottom: isCompact ? 4 : 6,
      textAlign: isCentered ? 'center' : 'left',
    },
    summaryText: {
      fontSize: fontSizes.bodyText * 0.92,
      lineHeight: isCompact ? 1.25 : 1.35,
      color: '#374151',
    },
    roleContainer: {
      marginBottom: isCompact ? 5 : 7,
    },
    roleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 2,
    },
    roleTitle: {
      fontSize: fontSizes.subHeaders,
      fontFamily: fontBold,
      color: '#111827',
    },
    companyName: {
      fontSize: fontSizes.bodyText * 0.95,
      fontFamily: fontRegular,
      color: '#4B5563',
    },
    dateLocation: {
      fontSize: fontSizes.bodyText * 0.85,
      color: '#6B7280',
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: isCompact ? 1.5 : 2,
      paddingLeft: 4,
    },
    bulletPoint: {
      width: 10,
      fontSize: fontSizes.bodyText * 0.9,
      color: headingColor,
    },
    bulletText: {
      flex: 1,
      fontSize: fontSizes.bodyText * 0.9,
      lineHeight: isCompact ? 1.25 : 1.32,
      color: '#1F2937',
    },
    skillRow: {
      flexDirection: 'row',
      marginBottom: isCompact ? 1.5 : 2.5,
    },
    skillCategory: {
      width: isStructured ? 85 : 125,
      fontSize: fontSizes.bodyText * 0.9,
      fontFamily: fontBold,
      color: '#111827',
    },
    skillItems: {
      flex: 1,
      fontSize: fontSizes.bodyText * 0.88,
      color: '#374151',
    },
    eduContainer: {
      marginBottom: isCompact ? 3 : 5,
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
    },
    eduDegree: {
      fontSize: fontSizes.bodyText * 0.9,
      color: '#4B5563',
      marginTop: 1,
    },
    structuredColumns: {
      flexDirection: 'row',
      gap: 12,
    },
    structuredMainCol: {
      flex: 65,
    },
    structuredSideCol: {
      flex: 35,
      paddingLeft: 10,
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
  ].filter(Boolean);

  // Common Sections: Summary, Experience, Skills, Education, Projects
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
        <Text style={dynamicStyles.sectionTitle}>Technical Skills</Text>
        {document.skills.map((skillGroup, idx) => (
          <View key={idx} style={dynamicStyles.skillRow}>
            <Text style={dynamicStyles.skillCategory}>{skillGroup.category}:</Text>
            <Text style={dynamicStyles.skillItems}>{skillGroup.items.join(', ')}</Text>
          </View>
        ))}
      </View>
    ) : null;

  const renderExperienceSection = () =>
    document.experience && document.experience.length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Work Experience</Text>
        {document.experience.map((role, roleIdx) => (
          <View key={roleIdx} style={dynamicStyles.roleContainer} wrap={false}>
            <View style={dynamicStyles.roleHeader}>
              <Text style={dynamicStyles.roleTitle}>
                {role.roleTitle}{' '}
                <Text style={dynamicStyles.companyName}>• {role.company}</Text>
              </Text>
              <Text style={dynamicStyles.dateLocation}>
                {formatDateRange(role.startDate, role.endDate, dateFormat)}{' '}
                {role.location ? `| ${role.location}` : ''}
              </Text>
            </View>
            {role.bullets.map((bullet, bulletIdx) => (
              <View key={bulletIdx} style={dynamicStyles.bulletRow}>
                <Text style={dynamicStyles.bulletPoint}>{bulletStyle}</Text>
                <Text style={dynamicStyles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    ) : null;

  const renderEducationSection = () =>
    document.education && document.education.length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Education</Text>
        {document.education.map((edu, eduIdx) => (
          <View key={eduIdx} style={dynamicStyles.eduContainer}>
            <View style={dynamicStyles.eduHeader}>
              <Text style={dynamicStyles.eduInstitution}>{edu.institution}</Text>
              <Text style={dynamicStyles.dateLocation}>
                {edu.endDate ? formatResumeDate(edu.endDate, dateFormat) : ''}
              </Text>
            </View>
            <Text style={dynamicStyles.eduDegree}>
              {edu.degree}
              {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
              {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  const renderProjectsSection = () =>
    document.projects && document.projects.length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Key Technical Projects</Text>
        {document.projects.map((proj, projIdx) => (
          <View key={projIdx} style={dynamicStyles.roleContainer} wrap={false}>
            <View style={dynamicStyles.roleHeader}>
              <Text style={dynamicStyles.roleTitle}>{proj.title}</Text>
              {proj.techStack && proj.techStack.length > 0 && (
                <Text style={dynamicStyles.dateLocation}>
                  {proj.techStack.join(' • ')}
                </Text>
              )}
            </View>
            {proj.bullets.map((b, bIdx) => (
              <View key={bIdx} style={dynamicStyles.bulletRow}>
                <Text style={dynamicStyles.bulletPoint}>{bulletStyle}</Text>
                <Text style={dynamicStyles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    ) : null;

  return (
    <Document title={`${document.contact.fullName || 'Candidate'} - Resume`}>
      <Page size={pageSize} style={dynamicStyles.page}>
        {/* Header Block */}
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.fullName}>
            {document.contact.fullName || 'Candidate Profile'}
          </Text>
          <View style={dynamicStyles.contactLine}>
            {contactParts.map((part, idx) => (
              <Text key={idx}>{idx > 0 ? `•  ${part}` : part}</Text>
            ))}
          </View>
        </View>

        {/* Structured (2-Column) vs Linear Templates */}
        {isStructured ? (
          <View style={dynamicStyles.structuredColumns}>
            <View style={dynamicStyles.structuredMainCol}>
              {renderSummarySection()}
              {renderExperienceSection()}
              {renderProjectsSection()}
            </View>
            <View style={dynamicStyles.structuredSideCol}>
              {renderSkillsSection()}
              {renderEducationSection()}
            </View>
          </View>
        ) : (
          <>
            {renderSummarySection()}
            {renderSkillsSection()}
            {renderExperienceSection()}
            {renderEducationSection()}
            {renderProjectsSection()}
          </>
        )}
      </Page>
    </Document>
  );
}

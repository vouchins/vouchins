import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import {
  ResumeDocument,
  ResumeExportConfig,
  DEFAULT_EXPORT_CONFIG,
  ResumeDateFormat,
} from '@/lib/jobs/types';
import {
  getPdfLayoutTokens,
  MAX_UNBREAKABLE_CHARS,
  sanitizePdfText,
  splitPathologicalToken,
} from '@/lib/jobs/pdf-layout-tokens';
import { detectResumeDomain } from '@/lib/jobs/xyz-evaluator';
import { isValidGeographicLocation } from '@/lib/jobs/ats-client';

// Disable mid-word hyphenation globally for react-pdf; only break pathological >45-char tokens
let hyphenationRegistered = false;
export function ensurePdfHyphenationDisabled() {
  if (!hyphenationRegistered) {
    try {
      Font.registerHyphenationCallback((word: string) => splitPathologicalToken(word));
      hyphenationRegistered = true;
    } catch {
      // Ignore if mocked in tests
    }
  }
}
ensurePdfHyphenationDisabled();

function formatResumeDate(dateStr: string, format: ResumeDateFormat): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.toLowerCase() === 'present' || trimmed.toLowerCase() === 'current') {
    return 'Present';
  }

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
  ensurePdfHyphenationDisabled();

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

  const tokens = getPdfLayoutTokens(config);

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

  const dynamicStyles = StyleSheet.create({
    page: {
      paddingTop: tokens.paddingTop,
      paddingBottom: tokens.paddingBottom,
      paddingLeft: tokens.paddingLeft,
      paddingRight: tokens.paddingRight,
      fontFamily: fontRegular,
      fontSize: fontSizes.bodyText,
      lineHeight: tokens.lineHeight,
      color: '#111827',
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: isCentered ? 'transparent' : '#E5E7EB',
      paddingBottom: isCompact ? 6 : 7,
      marginBottom: isCompact ? 6 : 8,
      alignItems: isCentered ? 'center' : 'flex-start',
    },
    structuredHeaderBand: {
      borderBottomWidth: 1.5,
      borderBottomColor: headingColor,
      paddingBottom: 7,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    structuredHeaderLeft: {
      flex: 1,
    },
    structuredHeaderRight: {
      maxWidth: '45%',
      alignItems: 'flex-end',
    },
    fullName: {
      fontSize: fontSizes.name,
      fontFamily: fontBold,
      color: nameColor,
      lineHeight: 1.15,
      marginBottom: isCompact ? 3 : 4,
      textAlign: isCentered ? 'center' : 'left',
      letterSpacing: -0.4,
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
      color: '#4B5563',
    },
    section: {
      marginBottom: tokens.sectionMarginBottom,
    },
    sectionTitle: {
      fontSize: fontSizes.sectionHeaders,
      fontFamily: fontBold,
      color: headingColor,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      borderBottomWidth: 0.75,
      borderBottomColor: '#E5E7EB',
      paddingBottom: isCompact ? 1 : 1.5,
      marginBottom: isCompact ? 3 : 3.5,
      textAlign: isCentered && !isStructured ? 'center' : 'left',
    },
    summaryText: {
      fontSize: fontSizes.bodyText * 0.92,
      lineHeight: tokens.summaryLineHeight,
      color: '#374151',
      textAlign: isCentered ? 'center' : 'left',
    },
    roleContainer: {
      marginBottom: tokens.roleMarginBottom,
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
      marginBottom: tokens.bulletMarginBottom,
      paddingLeft: 3,
    },
    bulletPoint: {
      width: tokens.bulletIndent,
      fontSize: fontSizes.bodyText * 0.9,
      color: headingColor,
    },
    bulletText: {
      flex: 1,
      fontSize: fontSizes.bodyText * 0.9,
      lineHeight: tokens.lineHeight,
      color: '#1F2937',
    },
    skillLine: {
      fontSize: fontSizes.bodyText * 0.9,
      lineHeight: tokens.lineHeight,
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
    },
    eduDegree: {
      fontSize: fontSizes.bodyText * 0.9,
      color: '#374151',
    },
  });

  const cleanContactUrl = (url?: string) => {
    if (!url) return '';
    return sanitizePdfText(
      url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
    );
  };

  const contactParts: string[] = [];
  if (document.contact.email) contactParts.push(sanitizePdfText(document.contact.email));
  if (document.contact.phone) contactParts.push(sanitizePdfText(document.contact.phone));
  if (document.contact.location && isValidGeographicLocation(document.contact.location)) {
    contactParts.push(sanitizePdfText(document.contact.location));
  }
  if (document.contact.linkedinUrl) contactParts.push(cleanContactUrl(document.contact.linkedinUrl));
  if (document.contact.githubUrl) contactParts.push(cleanContactUrl(document.contact.githubUrl));
  if (document.contact.portfolioUrl) contactParts.push(cleanContactUrl(document.contact.portfolioUrl));
  if (document.contact.leetcodeUrl) contactParts.push(cleanContactUrl(document.contact.leetcodeUrl));

  const isHealthcare = detectResumeDomain('', document) === 'healthcare';
  const skillsTitle = isHealthcare ? 'Core Skills' : 'Technical Skills';
  const projectsTitle = isHealthcare ? 'Key Projects & Research' : 'Key Technical Projects';
  const safeBulletStyle = sanitizePdfText(bulletStyle) || '*';

  const renderHeaderBlock = () => {
    if (isStructured) {
      return (
        <View style={dynamicStyles.structuredHeaderBand} wrap={false}>
          <View style={dynamicStyles.structuredHeaderLeft}>
            <Text style={dynamicStyles.fullName}>
              {sanitizePdfText(document.contact.fullName || 'Candidate Profile')}
            </Text>
          </View>
          <View style={dynamicStyles.structuredHeaderRight}>
            {contactParts.map((part, idx) => (
              <Text key={idx} style={dynamicStyles.contactItem}>
                {part}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={dynamicStyles.header} wrap={false}>
        <Text style={dynamicStyles.fullName}>
          {sanitizePdfText(document.contact.fullName || 'Candidate Profile')}
        </Text>
        <View style={dynamicStyles.contactLine}>
          {contactParts.map((part, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }} wrap={false}>
              {idx > 0 && <Text style={dynamicStyles.contactSeparator}>•</Text>}
              <Text style={dynamicStyles.contactItem}>{part}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSummarySection = () =>
    document.summary && document.summary.trim().length > 0 ? (
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
          Professional Summary
        </Text>
        <Text style={dynamicStyles.summaryText}>{sanitizePdfText(document.summary)}</Text>
      </View>
    ) : null;

  const renderSkillsSection = () => {
    if (!document.skills || document.skills.length === 0) return null;
    const firstSkill = document.skills[0];
    const firstSkillText = `${firstSkill.category}: ${(firstSkill.items || []).join(', ')}`;
    const canKeepHeadingWithFirst = firstSkillText.length <= MAX_UNBREAKABLE_CHARS;

    return (
      <View style={dynamicStyles.section}>
        {canKeepHeadingWithFirst ? (
          <View wrap={false}>
            <Text style={dynamicStyles.sectionTitle}>{skillsTitle}</Text>
            <Text style={dynamicStyles.skillLine}>
              <Text style={dynamicStyles.skillCategory}>{sanitizePdfText(firstSkill.category)}: </Text>
              <Text style={dynamicStyles.skillItems}>
                {sanitizePdfText((firstSkill.items || []).join(', '))}
              </Text>
            </Text>
          </View>
        ) : (
          <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
            {skillsTitle}
          </Text>
        )}
        {document.skills.slice(canKeepHeadingWithFirst ? 1 : 0).map((skillGroup, idx) => {
          const groupText = `${skillGroup.category}: ${(skillGroup.items || []).join(', ')}`;
          return (
            <Text
              key={idx}
              style={dynamicStyles.skillLine}
              wrap={groupText.length > MAX_UNBREAKABLE_CHARS}
            >
              <Text style={dynamicStyles.skillCategory}>{sanitizePdfText(skillGroup.category)}: </Text>
              <Text style={dynamicStyles.skillItems}>
                {sanitizePdfText((skillGroup.items || []).join(', '))}
              </Text>
            </Text>
          );
        })}
      </View>
    );
  };

  const renderRoleHeader = (role: ResumeDocument['experience'][number]) => (
    <View style={dynamicStyles.roleHeader} wrap={false}>
      <View style={dynamicStyles.roleTitleContainer}>
        <Text style={dynamicStyles.roleTitle}>
          {sanitizePdfText(role.roleTitle)}{' '}
          <Text style={dynamicStyles.companyName}>• {sanitizePdfText(role.company)}</Text>
        </Text>
      </View>
      <Text style={dynamicStyles.dateLocation}>
        {sanitizePdfText(formatDateRange(role.startDate, role.endDate, dateFormat))}
        {role.location ? sanitizePdfText(` | ${role.location}`) : ''}
      </Text>
    </View>
  );

  const renderBulletRow = (bullet: string, key: number) => (
    <View
      key={key}
      style={dynamicStyles.bulletRow}
      wrap={bullet.length > MAX_UNBREAKABLE_CHARS}
    >
      <Text style={dynamicStyles.bulletPoint}>{safeBulletStyle}</Text>
      <Text style={dynamicStyles.bulletText}>{sanitizePdfText(bullet)}</Text>
    </View>
  );

  const renderExperienceSection = () => {
    if (!document.experience || document.experience.length === 0) return null;
    const firstRole = document.experience[0];
    const firstRoleBullet = firstRole.bullets?.[0] || '';
    const firstRoleHeaderPlusFirstBulletLen =
      (firstRole.roleTitle?.length || 0) +
      (firstRole.company?.length || 0) +
      firstRoleBullet.length;
    const keepSectionTitleWithFirstRole =
      firstRoleHeaderPlusFirstBulletLen <= MAX_UNBREAKABLE_CHARS;

    return (
      <View style={dynamicStyles.section}>
        {keepSectionTitleWithFirstRole ? (
          <View style={dynamicStyles.roleContainer} wrap={false}>
            <Text style={dynamicStyles.sectionTitle}>Work Experience</Text>
            {renderRoleHeader(firstRole)}
            {firstRoleBullet ? renderBulletRow(firstRoleBullet, 0) : null}
          </View>
        ) : (
          <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
            Work Experience
          </Text>
        )}

        {document.experience.map((role, roleIdx) => {
          if (roleIdx === 0 && keepSectionTitleWithFirstRole) {
            return (
              <View key={roleIdx} style={dynamicStyles.roleContainer}>
                {(role.bullets || []).slice(firstRoleBullet ? 1 : 0).map((b, bIdx) =>
                  renderBulletRow(b, bIdx + 1)
                )}
              </View>
            );
          }

          const b0 = role.bullets?.[0] || '';
          const groupLen =
            (role.roleTitle?.length || 0) + (role.company?.length || 0) + b0.length;
          const keepHeaderWithFirstBullet = Boolean(b0) && groupLen <= MAX_UNBREAKABLE_CHARS;

          return (
            <View key={roleIdx} style={dynamicStyles.roleContainer}>
              {keepHeaderWithFirstBullet ? (
                <View wrap={false}>
                  {renderRoleHeader(role)}
                  {renderBulletRow(b0, 0)}
                </View>
              ) : (
                <>
                  <View wrap={false} minPresenceAhead={45}>
                    {renderRoleHeader(role)}
                  </View>
                  {b0 ? renderBulletRow(b0, 0) : null}
                </>
              )}
              {(role.bullets || []).slice(1).map((b, bIdx) => renderBulletRow(b, bIdx + 1))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderEducationSection = () => {
    if (!document.education || document.education.length === 0) return null;
    const firstEdu = document.education[0];
    const firstEduText = `${firstEdu.institution} ${firstEdu.degree} ${firstEdu.fieldOfStudy || ''}`;
    const keepHeadingWithFirst = firstEduText.length <= MAX_UNBREAKABLE_CHARS;

    const renderEduItem = (edu: ResumeDocument['education'][number], idx: number) => {
      const combined = `${edu.institution} ${edu.degree} ${edu.fieldOfStudy || ''} ${edu.gpaOrHonors || ''}`;
      return (
        <View
          key={idx}
          style={dynamicStyles.eduContainer}
          wrap={combined.length > MAX_UNBREAKABLE_CHARS}
        >
          <View style={dynamicStyles.eduHeader}>
            <Text style={dynamicStyles.eduInstitution}>{sanitizePdfText(edu.institution)}</Text>
            <Text style={dynamicStyles.dateLocation}>
              {edu.endDate ? sanitizePdfText(formatResumeDate(edu.endDate, dateFormat)) : ''}
            </Text>
          </View>
          <Text style={dynamicStyles.eduDegree}>
            {sanitizePdfText(edu.degree)}
            {edu.fieldOfStudy &&
            !edu.degree.toLowerCase().includes(edu.fieldOfStudy.toLowerCase())
              ? sanitizePdfText(` in ${edu.fieldOfStudy}`)
              : ''}
            {edu.gpaOrHonors ? sanitizePdfText(` - ${edu.gpaOrHonors}`) : ''}
          </Text>
        </View>
      );
    };

    return (
      <View style={dynamicStyles.section}>
        {keepHeadingWithFirst ? (
          <View wrap={false}>
            <Text style={dynamicStyles.sectionTitle}>Education</Text>
            {renderEduItem(firstEdu, 0)}
          </View>
        ) : (
          <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
            Education
          </Text>
        )}
        {document.education.slice(keepHeadingWithFirst ? 1 : 0).map((edu, idx) =>
          renderEduItem(edu, keepHeadingWithFirst ? idx + 1 : idx)
        )}
      </View>
    );
  };

  const renderProjectsSection = () => {
    if (!document.projects || document.projects.length === 0) return null;
    const firstProj = document.projects[0];
    const firstBullet = firstProj.bullets?.[0] || '';
    const keepHeadingWithFirst =
      (firstProj.title?.length || 0) + firstBullet.length <= MAX_UNBREAKABLE_CHARS;

    const renderProjectHeader = (proj: NonNullable<ResumeDocument['projects']>[number]) => (
      <View style={dynamicStyles.roleHeader} wrap={false}>
        <View style={dynamicStyles.roleTitleContainer}>
          <Text style={dynamicStyles.roleTitle}>{sanitizePdfText(proj.title)}</Text>
        </View>
        {(proj.repoUrl || proj.liveUrl) && (
          <Text style={dynamicStyles.projectTechStack}>
            {sanitizePdfText(proj.repoUrl || proj.liveUrl)}
          </Text>
        )}
        {proj.techStack && proj.techStack.length > 0 && (
          <Text style={dynamicStyles.projectTechStack}>
            {sanitizePdfText(proj.techStack.join(' • '))}
          </Text>
        )}
      </View>
    );

    return (
      <View style={dynamicStyles.section}>
        {keepHeadingWithFirst ? (
          <View style={dynamicStyles.roleContainer} wrap={false}>
            <Text style={dynamicStyles.sectionTitle}>{projectsTitle}</Text>
            {renderProjectHeader(firstProj)}
            {firstBullet ? renderBulletRow(firstBullet, 0) : null}
          </View>
        ) : (
          <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
            {projectsTitle}
          </Text>
        )}
        {document.projects.map((proj, projIdx) => {
          if (projIdx === 0 && keepHeadingWithFirst) {
            return (
              <View key={projIdx} style={dynamicStyles.roleContainer}>
                {(proj.bullets || []).slice(firstBullet ? 1 : 0).map((b, bIdx) =>
                  renderBulletRow(b, bIdx + 1)
                )}
              </View>
            );
          }
          const b0 = proj.bullets?.[0] || '';
          const keepHeader = Boolean(b0) && (proj.title?.length || 0) + b0.length <= MAX_UNBREAKABLE_CHARS;
          return (
            <View key={projIdx} style={dynamicStyles.roleContainer}>
              {keepHeader ? (
                <View wrap={false}>
                  {renderProjectHeader(proj)}
                  {renderBulletRow(b0, 0)}
                </View>
              ) : (
                <>
                  <View wrap={false} minPresenceAhead={45}>
                    {renderProjectHeader(proj)}
                  </View>
                  {b0 ? renderBulletRow(b0, 0) : null}
                </>
              )}
              {(proj.bullets || []).slice(1).map((b, bIdx) => renderBulletRow(b, bIdx + 1))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderCertificationsSection = () => {
    if (!document.certifications || document.certifications.length === 0) return null;
    const firstCert = document.certifications[0];
    const keepHeadingWithFirst = (firstCert?.length || 0) <= MAX_UNBREAKABLE_CHARS;

    return (
      <View style={dynamicStyles.section}>
        {keepHeadingWithFirst ? (
          <View wrap={false}>
            <Text style={dynamicStyles.sectionTitle}>Certifications & Credentials</Text>
            {renderBulletRow(firstCert, 0)}
          </View>
        ) : (
          <Text style={dynamicStyles.sectionTitle} minPresenceAhead={45}>
            Certifications & Credentials
          </Text>
        )}
        {document.certifications
          .slice(keepHeadingWithFirst ? 1 : 0)
          .map((cert, idx) => renderBulletRow(cert, keepHeadingWithFirst ? idx + 1 : idx))}
      </View>
    );
  };

  return (
    <Document title={`${sanitizePdfText(document.contact.fullName || 'Candidate')} - Resume`}>
      <Page size={pageSize} style={dynamicStyles.page}>
        {renderHeaderBlock()}
        {renderSummarySection()}
        {renderSkillsSection()}
        {renderExperienceSection()}
        {renderEducationSection()}
        {renderProjectsSection()}
        {renderCertificationsSection()}
      </Page>
    </Document>
  );
}

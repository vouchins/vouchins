import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ResumeDocument } from '@/lib/jobs/types';

const styles = StyleSheet.create({
  page: {
    padding: 36, // 0.5 in margins
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.35,
    color: '#111827',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 10,
    marginBottom: 12,
  },
  fullName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1B5C',
    marginBottom: 8,
  },
  contactLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 8,
    color: '#4B5563',
    marginTop: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1B5C',
    textTransform: 'uppercase',
    borderBottomWidth: 0.75,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 2,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: '#374151',
  },
  roleContainer: {
    marginBottom: 8,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  companyName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#4B5563',
  },
  dateLocation: {
    fontSize: 8,
    color: '#6B7280',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletPoint: {
    width: 10,
    fontSize: 8,
    color: '#4B5563',
  },
  bulletText: {
    flex: 1,
    fontSize: 8.2,
    lineHeight: 1.3,
    color: '#1F2937',
  },
  skillRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  skillCategory: {
    width: 130,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  skillItems: {
    flex: 1,
    fontSize: 8.2,
    color: '#374151',
  },
  eduContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  eduInstitution: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  eduDegree: {
    fontSize: 8.2,
    color: '#4B5563',
  },
});

interface ResumePDFDocumentProps {
  document: ResumeDocument;
}

export function ResumePDFDocument({ document }: ResumePDFDocumentProps) {
  const contactParts = [
    document.contact.email,
    document.contact.phone,
    document.contact.location,
    document.contact.linkedinUrl ? document.contact.linkedinUrl.replace(/^https?:\/\//, '') : '',
    document.contact.githubUrl ? document.contact.githubUrl.replace(/^https?:\/\//, '') : '',
  ].filter(Boolean);

  return (
    <Document title={`${document.contact.fullName || 'Candidate'} - Resume`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.fullName}>{document.contact.fullName || 'Candidate Profile'}</Text>
          <View style={styles.contactLine}>
            {contactParts.map((part, idx) => (
              <Text key={idx}>{idx > 0 ? `•  ${part}` : part}</Text>
            ))}
          </View>
        </View>

        {/* Professional Summary */}
        {document.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{document.summary}</Text>
          </View>
        ) : null}

        {/* Technical Skills */}
        {document.skills && document.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {document.skills.map((skillGroup, idx) => (
              <View key={idx} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{skillGroup.category}:</Text>
                <Text style={styles.skillItems}>{skillGroup.items.join(', ')}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Experience */}
        {document.experience && document.experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {document.experience.map((role, roleIdx) => (
              <View key={roleIdx} style={styles.roleContainer} wrap={false}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>
                    {role.roleTitle} <Text style={styles.companyName}>• {role.company}</Text>
                  </Text>
                  <Text style={styles.dateLocation}>
                    {role.startDate} - {role.endDate} {role.location ? `| ${role.location}` : ''}
                  </Text>
                </View>
                {role.bullets.map((bullet, bulletIdx) => (
                  <View key={bulletIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Education */}
        {document.education && document.education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {document.education.map((edu, eduIdx) => (
              <View key={eduIdx} style={styles.eduContainer}>
                <View>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                  <Text style={styles.eduDegree}>
                    {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                  </Text>
                </View>
                <Text style={styles.dateLocation}>{edu.endDate}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Key Projects */}
        {document.projects && document.projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Technical Projects</Text>
            {document.projects.map((proj, projIdx) => (
              <View key={projIdx} style={styles.roleContainer}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{proj.title}</Text>
                  {proj.techStack && proj.techStack.length > 0 && (
                    <Text style={styles.dateLocation}>{proj.techStack.join(' • ')}</Text>
                  )}
                </View>
                {proj.bullets.map((b, bIdx) => (
                  <View key={bIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

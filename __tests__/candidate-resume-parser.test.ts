/**
 * @jest-environment node
 */
import { parseRawTextToDocument, evaluateResumeHeuristically } from '@/lib/jobs/xyz-evaluator';

const UMMU_FARWAH_RESUME_TEXT = `
Ummu Farwah
+1   ( 347 )   686 - 2993   |   U mmufarwah .fm @gmail.com   |   Jersey City ,   NJ
PROFESSIONAL SUMMARY
Doctor of Pharmacy graduate   and master's candidate in Drug Regulatory Affairs (Long Island University, expected 2026) with
approximately   1 year of hands - on clinical pharmacy and clinical pharmacology experience   in a hospital setting. Combines a strong
foundation in drug therapy, pharmacokinetics, pharmacodynamics, and drug safety with graduate - level training in regulatory affairs.
Experienced in reviewing prescriptions against safety standards, evaluating drug i nteractions, maintaining clinical documentation, and
upholding patient confidentiality. Detail - oriented and analytical, with a clear focus on supporting compliant, safe, and effective use of
medicines and the preparation of accurate regulatory documentatio n.
CORE SKILLS
▪   Regulatory Affairs
▪   Drug Safety &
Pharmacovigilance
Awareness
▪   Regulatory
Documentation
Support
▪   Compliance Review
▪   Research Analysis
▪   Microsoft Office
▪   Confidentiality &
Data Integrity
▪   Clinical
Pharmacology
▪   Pharmacokinetics
▪   Pharmacodynamics
▪   Drug Therapy
Knowledge
▪   Healthcare
Operations
▪   Medication Therapy
Management
▪   Drug Interaction
Evaluation
▪   Research & Data
Analysis
▪   Clinical
Documentation
▪   Cross - Functional
Collaboration
▪   Written & Verbal
Communication
▪   Attention to Detail
▪   Multitasking
▪   Microsoft Office
▪   Drug Therapy
Knowledge
▪   Pharmacokinetics
▪   Pharmacodynamics
▪   Clinical Documentation
EXPERIENCE
Clinical Pharmacis t
Tuffah Hospital | Hyderabad, India   Mar 2023   –   Aug 2023
▪   Reviewed and evaluated physician - prescribed medications to ensure appropriate drug selection, dosage, frequency, and
administration based on patients' clinical conditions and established treatment guidelines.
▪   Assessed medication regimens for potential drug - drug interactions, contraindications, adverse effects, and medication - related
risks, supporting safe and effective pharmaceutical care.
▪   Collaborated with physicians, nurses, and other healthcare professionals to review treatment plans, identify medication -
related concerns, and provide evidence - based recommendations for optimizing therapeutic outcomes.
▪   Monitored patients' medication therapy and evaluated treatment effectiveness, identifying potential safety concerns and
communicating relevant observations to the healthcare team.
▪   Provided patient counseling on prescription medications, including dosage instructions, administration methods, potential
side effects, precautions, and medication adherence.
▪   Maintained accurate and organized clinical documentation, including medication - related information and patient records,
while ensuring confidentiality and adherence to hospital documentation standards.
▪   Applied clinical pharmacology and drug therapy knowledge to support appropriate medication use and contribute to patient
safety initiatives.
▪   Supported medication - related decision - making by reviewing clinical information, interpreting drug therapy requirements, and
communicating findings clearly to healthcare professionals.
Clinical Pharmacology Intern
Tuffah Hospital | Hyderabad, India   Sept 2022   –   Feb 2023
▪   Developed practical knowledge of clinical pharmacology through exposure to patient treatment plans, medication reviews,
and therapeutic decision - making in a hospital environment.
▪   Studied drug mechanisms of action, pharmacokinetics, pharmacodynamics, therapeutic indications, contraindications, and
potential adverse drug reactions to understand medication safety and effectiveness.
▪   Assisted in evaluating prescribed medications for potential drug interactions, dosage - related concerns, contraindications, and
possible medication - related complications.
▪   Reviewed relevant patient information and clinical data to support the assessment of medication effectiveness and identify
potential drug therapy concerns.
▪   Worked alongside clinical pharmacists and healthcare professionals to understand evidence - based treatment approaches and
contribute to medication - related clinical discussions.
▪   Educated patients on appropriate medication administration, treatment adherence, possible side effects, and precautions
associated with prescribed therapies.
▪   Participated in clinical research - related activities, including reviewing medical information, collecting relevant data, and
supporting the analysis of treatment outcomes.
▪   Strengthened understanding of drug safety principles, therapeutic monitoring, and the importance of accurate clinical
documentation in supporting safe pharmaceutical practices.
▪   Applied foundational knowledge of pharmacology and therapeutics to support clinical assessments and improve
understanding of patient - centered medication management.
PROJECTS
A Prospective Observational Study on Hepatoprotective Agents Used in Alcoholic Liver Disease at a Tertiary Care Teaching
Hospital   | Osmania University
▪   Conducted a prospective research study on hepatoprotective agents used in the treatment of alcoholic liver disease.
▪   Collected and analyzed patient data to assess treatment outcomes and therapeutic effectiveness.
▪   Prepared and submitted a formal dissertation to Osmania University as partial fulfillment of the Pharm - D degree.
EDUCATION
▪   Masters   in Drug Regulatory Affairs
Long Island University, Brooklyn, New York   |   2024   –   2026
▪   Doctor of Pharmacy ( Pharm - D )
MESCO College of Pharmacy, affiliated with Osmania University, Hyderabad, India   |   2017   –   2023
`;

describe('Heuristic Evaluation for Specialized Healthcare Resume', () => {
  it('correctly parses structured candidate details from extracted text', () => {
    let rawText = UMMU_FARWAH_RESUME_TEXT;

    // Apply the text healing from parser.ts
    rawText = rawText
      .replace(/\b([a-zA-Z0-9._%+-]+(?:\s+[a-zA-Z0-9._%+-]+)*)\s*@\s*([a-zA-Z0-9.\s-]+)\s*\.\s*([a-zA-Z]{2,})\b/g, (match, local, domain, tld) => {
        return `${local.replace(/\s+/g, '')}@${domain.replace(/\s+/g, '')}.${tld}`;
      })
      .replace(/(\+\d{1,3})\s*\(\s*(\d{3})\s*\)\s*(\d{3})\s*-\s*(\d{4})/g, '$1 ($2) $3-$4')
      .replace(/,\s*,+/g, ', ')
      .replace(/([A-Za-z]+)\s*,\s*([A-Za-z]{2,})/g, '$1, $2')
      .replace(/Pharmacis\s+t/gi, 'Pharmacist');

    const doc = parseRawTextToDocument(rawText);

    expect(doc.contact.fullName).toBe('Ummu Farwah');
    expect(doc.contact.email).toBe('Ummufarwah.fm@gmail.com');
    expect(doc.contact.phone).toBe('+1 (347) 686-2993');
    expect(doc.contact.location).toBe('Jersey City, NJ');

    // Experience parsing
    expect(doc.experience.length).toBe(2);
    expect(doc.experience[0].roleTitle).toBe('Clinical Pharmacist');
    expect(doc.experience[0].company).toBe('Tuffah Hospital');
    expect(doc.experience[0].location).toBe('Hyderabad, India');
    expect(doc.experience[0].startDate).toBe('Mar 2023');
    expect(doc.experience[0].endDate).toBe('Aug 2023');

    expect(doc.experience[1].roleTitle).toBe('Clinical Pharmacology Intern');
    expect(doc.experience[1].company).toBe('Tuffah Hospital');
    expect(doc.experience[1].location).toBe('Hyderabad, India');
    expect(doc.experience[1].startDate).toBe('Sept 2022');
    expect(doc.experience[1].endDate).toBe('Feb 2023');

    // Education parsing
    expect(doc.education.length).toBe(2);
    expect(doc.education[0].degree).toContain('Masters   in Drug Regulatory Affairs');
    expect(doc.education[0].institution).toBe('Long Island University, Brooklyn, New York');
    expect(doc.education[0].startDate).toBe('2024');
    expect(doc.education[0].endDate).toBe('2026');

    expect(doc.education[1].degree).toContain('Doctor of Pharmacy');
    expect(doc.education[1].institution).toBe('MESCO College of Pharmacy, affiliated with Osmania University, Hyderabad, India');
    expect(doc.education[1].startDate).toBe('2017');
    expect(doc.education[1].endDate).toBe('2023');

    // Skills parsing
    const totalSkills = doc.skills.flatMap((s) => s.items);
    expect(totalSkills.length).toBeGreaterThanOrEqual(20);
    expect(totalSkills).toContain('Clinical Pharmacology');
    expect(totalSkills).toContain('Regulatory Affairs');

    // Projects parsing
    expect(doc.projects?.length).toBe(1);
    expect(doc.projects?.[0].title).toContain('A Prospective Observational Study');
    expect(doc.projects?.[0].bullets.length).toBe(3);

    // Target role identification (healthcare/clinical rather than defaulting to tech)
    const evaluation = evaluateResumeHeuristically(doc, rawText);
    expect(evaluation.targetRole).toBe('Clinical Pharmacist');
  });

  it('extracts real resume buffer from Ummu Farwah.pdf with accurate text alignment', async () => {
    const fs = await import('fs');
    const path = '/Users/shaiktaher/Downloads/Ummu Farwah.pdf';
    if (!fs.existsSync(path)) return;

    const buffer = fs.readFileSync(path);
    const { extractResumeText } = await import('@/lib/jobs/parser');
    const extraction = await extractResumeText(buffer, 'application/pdf', 'Ummu Farwah.pdf');

    expect(extraction.rawText).toContain('Ummu Farwah');
    expect(extraction.rawText).toContain('Regulatory Affairs');
    expect(extraction.rawText).toContain('Clinical Pharmacist');
    expect(extraction.rawText).toContain('Tuffah Hospital');

    const doc = parseRawTextToDocument(extraction.rawText);
    expect(doc.contact.fullName).toBe('Ummu Farwah');
    expect(doc.contact.email).toBe('Ummufarwah.fm@gmail.com');
    expect(doc.contact.location).toBe('Jersey City, NJ');
    expect(doc.experience.length).toBeGreaterThanOrEqual(1);
    expect(doc.education.length).toBeGreaterThanOrEqual(1);

    const { partitionResumePages } = await import('@/lib/jobs/pagination');
    const docWithRewrites = parseRawTextToDocument(extraction.rawText);
    const pages = partitionResumePages(docWithRewrites, 'LETTER', 'standard');
    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages[0].roles.length).toBeGreaterThanOrEqual(1);
  });

  it('correctly extracts and parses Ahmed_Java_Backend_developer_2_experience (2).pdf without empty sections or false name match', async () => {
    const fs = await import('fs');
    const path = '/Users/shaiktaher/Downloads/Ahmed_Java_Backend_developer_2_experience (2).pdf';
    if (!fs.existsSync(path)) return;

    const buffer = fs.readFileSync(path);
    const { extractResumeText } = await import('@/lib/jobs/parser');
    const extraction = await extractResumeText(buffer, 'application/pdf', 'Ahmed_Java_Backend_developer_2_experience (2).pdf');

    expect(extraction.rawText.length).toBeGreaterThan(1000);
    expect(extraction.rawText).toContain('Shaik Ahmed');
    expect(extraction.rawText).toContain('Spring Boot');

    const doc = parseRawTextToDocument(extraction.rawText);
    expect(doc.contact.fullName).toBe('Shaik Ahmed');
    expect(doc.contact.email).toBe('shaikahmed807454@gmail.com');
    expect(doc.contact.phone).toContain('8074548500');
    expect(doc.contact.location).toBe('Hyderabad, Telangana');

    expect(doc.summary).toBeTruthy();
    expect(doc.summary.length).toBeGreaterThan(50);

    expect(doc.skills.length).toBeGreaterThanOrEqual(5);
    const allSkills = doc.skills.flatMap((s) => s.items);
    expect(allSkills).toContain('Java');
    expect(allSkills).toContain('Spring Boot');
    expect(allSkills).toContain('MySQL');

    expect(doc.experience.length).toBeGreaterThanOrEqual(1);
    expect(doc.experience[0].company).toContain('Evergent');
    expect(doc.experience[0].bullets.length).toBeGreaterThanOrEqual(3);

    expect(doc.education.length).toBeGreaterThanOrEqual(1);
    expect(doc.education[0].institution).toContain('MLR Institute of Technology');

    expect(doc.projects?.length).toBeGreaterThanOrEqual(3);

    const evaluation = evaluateResumeHeuristically(doc, extraction.rawText);
    expect(evaluation.overallScore).toBeGreaterThan(60);
    expect(evaluation.detectedSeniority).toContain('Software Engineer');
  });

  it('parses and evaluates SQL Server / Azure DBA resume with KEY SKILLS, TOOLS, and KEY ACHIEVEMENTS heuristically', () => {
    const janyRawText = `PATHAN JANY BASHA
Hyderabad | +91-9100821703 | janybasha1709@gmail.com

PROFESSIONAL SUMMARY
SQL Server DBA with 7+ years of experience in On-Premise and Microsoft Azure environments, specializing in Performance Tuning, High Availability (HA/DR) and Database Administration.

KEY SKILLS
SQL Server, Azure SQL Database, Azure Infra Services, HA/DR, Performance Tuning, Query Optimization, Indexing, PowerShell, T-SQL

TOOLS
SSMS, SQL Profiler, Query Analyzer, PSSDIAG, SQL Nexus, SQL Idera, ServiceNow, Commvault, Zabbix

PROFESSIONAL EXPERIENCE
Accenture – Database Admin Analyst (Aug 2021 – Present)
• Managed SQL Server environments (On-Premise & Azure) for 130+ global clients.
• Performed performance tuning, query optimization and improving execution time by up to 30%.

Mindtree – Senior Engineer (Feb 2020 – Jul 2021)
• Administered production SQL Server clusters and automated backups via PowerShell.

KEY ACHIEVEMENTS
• Managed 1100+ SQL Servers and databases ranging from 2GB to 20TB.

EDUCATION
B.E – Osmania University (2016) – 80%

CERTIFICATIONS
Azure Administrator Associate (AZ-104)
Azure Database Administrator Associate (DP-300)`;

    const doc = parseRawTextToDocument(janyRawText);
    expect(doc.contact.fullName).toBe('PATHAN JANY BASHA');
    expect(doc.contact.fullName).not.toBe('KEY ACHIEVEMENTS');
    expect(doc.contact.email).toBe('janybasha1709@gmail.com');
    expect(doc.experience.length).toBeGreaterThanOrEqual(2);
    expect(doc.experience[0].company).toContain('Accenture');
    expect(doc.skills.flatMap((s) => s.items)).toEqual(expect.arrayContaining(['SQL Server', 'SSMS']));
    expect(doc.certifications).toContain('Azure Administrator Associate (AZ-104)');

    const evaluation = evaluateResumeHeuristically(doc, janyRawText);
    expect(evaluation.targetRole).not.toContain('Junior Cloud');
  });
});

import { partitionResumePages } from '@/lib/jobs/pagination';
import { ResumeDocument } from '@/lib/jobs/types';

const SAMPLE_DOC: ResumeDocument = {
  contact: {
    fullName: 'Ummu Farwah',
    email: 'Ummufarwah.fm@gmail.com',
    phone: '+1 (347) 686-2993',
    location: 'Jersey City, NJ',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  },
  summary:
    "Doctor of Pharmacy graduate and master's candidate in Drug Regulatory Affairs with extensive clinical experience.",
  skills: [
    {
      category: 'Core Skills',
      items: ['Regulatory Affairs', 'Drug Safety', 'Clinical Pharmacology'],
    },
  ],
  experience: [
    {
      id: 'exp-1',
      roleTitle: 'Clinical Pharmacist',
      company: 'Tuffah Hospital',
      location: 'Hyderabad, India',
      startDate: 'Mar 2023',
      endDate: 'Aug 2023',
      isCurrent: false,
      bullets: [
        'Evaluated 150+ weekly physician-prescribed medications against safety standards.',
        'Identified and mitigated 45+ critical drug-drug interactions per month.',
        'Partnered with cross-functional care teams to optimize patient outcomes.',
        'Monitored medication therapy for 50+ daily acute-care patients.',
        'Delivered tailored medication counseling to 300+ patients.',
        'Maintained 100% compliance in clinical documentation and patient records.',
        'Spearheaded 2 departmental patient safety initiatives.',
        'Accelerated clinical decision-making workflows by 20%.',
      ],
    },
    {
      id: 'exp-2',
      roleTitle: 'Clinical Pharmacology Intern',
      company: 'Tuffah Hospital',
      location: 'Hyderabad, India',
      startDate: 'Sep 2022',
      endDate: 'Feb 2023',
      isCurrent: false,
      bullets: [
        'Optimized therapeutic workflows across 100+ patient case reviews.',
        'Evaluated 80+ drug safety profiles and pharmacokinetic parameters.',
        'Assisted in screening 200+ medication regimens for interactions.',
        'Reviewed relevant patient information and clinical data to support assessment.',
        'Worked alongside clinical pharmacists to understand evidence-based treatment.',
        'Educated patients on appropriate medication administration and adherence.',
        'Participated in clinical research-related activities and data collection.',
        'Strengthened understanding of drug safety principles and monitoring.',
        'Applied foundational knowledge of pharmacology to support clinical assessments.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Long Island University, Brooklyn, New York',
      degree: 'Masters in Drug Regulatory Affairs',
      endDate: '2026',
    },
    {
      id: 'edu-2',
      institution: 'MESCO College of Pharmacy, affiliated with Osmania University, Hyderabad, India',
      degree: 'Doctor of Pharmacy (Pharm-D)',
      endDate: '2023',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'A Prospective Observational Study on Hepatoprotective Agents Used in Alcoholic Liver Disease',
      techStack: ['Osmania University'],
      bullets: [
        'Conducted prospective research study on hepatoprotective agents.',
        'Collected and analyzed patient data to assess treatment outcomes.',
        'Prepared and submitted formal dissertation to Osmania University.',
      ],
    },
  ],
  certifications: [],
};

describe('partitionResumePages shared pagination engine', () => {
  it('partitions resume into balanced 2-page document', () => {
    const pages = partitionResumePages(SAMPLE_DOC, 'LETTER');
    expect(pages.length).toBe(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].totalPages).toBe(2);
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[1].totalPages).toBe(2);
  });
});

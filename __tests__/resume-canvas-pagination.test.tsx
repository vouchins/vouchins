/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResumeCanvas } from '@/components/jobs/resume-canvas';
import { ResumeDocument } from '@/lib/jobs/types';

const SAMPLE_LARGE_DOC: ResumeDocument = {
  "contact": {
    "fullName": "Ummu Farwah",
    "email": "Ummufarwah.fm@gmail.com",
    "phone": "+1 (347) 686-2993",
    "location": "Jersey City, NJ",
    "linkedinUrl": "",
    "githubUrl": "",
    "portfolioUrl": ""
  },
  "summary": "Doctor of Pharmacy graduate and master's candidate in Drug Regulatory Affairs (Long Island University, expected 2026) with approximately 1 year of hands-on clinical pharmacy and clinical pharmacology experience in a hospital setting. Combines a strong foundation in drug therapy, pharmacokinetics, pharmacodynamics, and drug safety with graduate-level training in regulatory affairs. Experienced in reviewing prescriptions against safety standards, evaluating drug interactions, maintaining clinical documentation, and upholding patient confidentiality. Detail-oriented and analytical, with a clear focus on supporting compliant, safe, and effective use of medicines and the preparation of accurate regulatory documentation.",
  "skills": [
    {
      "category": "Core Skills",
      "items": [
        "Regulatory Affairs",
        "Drug Safety & Pharmacovigilance Awareness",
        "Regulatory Documentation Support",
        "Compliance Review",
        "Research Analysis",
        "Microsoft Office",
        "Confidentiality & Data Integrity",
        "Clinical Pharmacology",
        "Pharmacokinetics",
        "Pharmacodynamics",
        "Drug Therapy Knowledge",
        "Healthcare Operations",
        "Medication Therapy Management",
        "Drug Interaction Evaluation",
        "Research & Data Analysis",
        "Clinical Documentation",
        "Cross-Functional Collaboration",
        "Written & Verbal Communication",
        "Attention to Detail",
        "Multitasking"
      ]
    }
  ],
  "experience": [
    {
      "id": "exp-1",
      "roleTitle": "Clinical Pharmacist",
      "company": "Tuffah Hospital",
      "location": "Hyderabad, India",
      "startDate": "Mar 2023",
      "endDate": "Aug 2023",
      "isCurrent": false,
      "bullets": [
        "Reviewed and evaluated physician-prescribed medications to ensure appropriate drug selection, dosage, frequency, and administration based on patients clinical conditions and established treatment guidelines, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Assessed medication regimens for potential drug-drug interactions, contraindications, adverse effects, and medication-related risks, supporting safe and effective pharmaceutical care, identifying and mitigating 40+ drug interaction risks to achieve 100% patient safety compliance.",
        "Collaborated with physicians, nurses, and other healthcare professionals to review treatment plans, identify medication-related concerns, and provide evidence-based recommendations for optimizing therapeutic outcomes, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Monitored patients medication therapy and evaluated treatment effectiveness, identifying potential safety concerns and communicating relevant observations to the healthcare team, identifying and mitigating 40+ drug interaction risks to achieve 100% patient safety compliance.",
        "Provided patient counseling on prescription medications, including dosage instructions, administration methods, potential side effects, precautions, and medication adherence",
        "Maintained accurate and organized clinical documentation, including medication-related information and patient records, while ensuring confidentiality and adherence to hospital documentation standards, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Applied clinical pharmacology and drug therapy knowledge to support appropriate medication use and contribute to patient safety initiatives.",
        "Supported medication-related decision-making by reviewing clinical information, interpreting drug therapy requirements, and communicating findings clearly to healthcare professionals, optimizing medication counseling protocols and improving patient therapy adherence rates by 28% across 350+ consultations."
      ]
    },
    {
      "id": "exp-2",
      "roleTitle": "Clinical Pharmacology Intern",
      "company": "Tuffah Hospital",
      "location": "Hyderabad, India",
      "startDate": "Sep 2022",
      "endDate": "Feb 2023",
      "isCurrent": false,
      "bullets": [
        "Developed practical knowledge of clinical pharmacology through exposure to patient treatment plans, medication reviews, and therapeutic decision-making in a hospital environment, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Studied drug mechanisms of action, pharmacokinetics, pharmacodynamics, therapeutic indications, contraindications, and potential adverse drug reactions to understand medication safety and effectiveness, identifying and mitigating 40+ drug interaction risks to achieve 100% patient safety compliance.",
        "Assisted in evaluating prescribed medications for potential drug interactions, dosage-related concerns, contraindications, and possible medication-related complications, optimizing medication counseling protocols and improving patient therapy adherence rates by 28% across 350+ consultations.",
        "Reviewed relevant patient information and clinical data to support the assessment of medication effectiveness and identify potential drug therapy concerns, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Worked alongside clinical pharmacists and healthcare professionals to understand evidence-based treatment approaches and contribute to medication-related clinical discussions, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "Educated patients on appropriate medication administration, treatment adherence, possible side effects, and precautions associated with prescribed therapies, supporting 250+ patient therapy regimens and elevating medication adherence by 26%.",
        "clinical research-related activities, including reviewing medical information, collecting relevant data, and supporting the analysis of treatment outcomes, analyzing clinical outcome metrics across 300+ patient data records with 99.4% data integrity and audit readiness.",
        "Strengthened understanding of drug safety principles, therapeutic monitoring, and the importance of accurate clinical documentation in supporting safe pharmaceutical practices, identifying and mitigating 40+ drug interaction risks to achieve 100% patient safety compliance.",
        "Applied foundational knowledge of pharmacology and therapeutics to support clinical assessments and improve understanding of patient-centered medication management, supporting 250+ patient therapy regimens and elevating medication adherence by 26%."
      ]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "degree": "Masters in Drug Regulatory Affairs",
      "fieldOfStudy": "Masters in Drug Regulatory Affairs",
      "institution": "Long Island University, Brooklyn, New York",
      "startDate": "2024",
      "endDate": "2026"
    },
    {
      "id": "edu-2",
      "degree": "Doctor of Pharmacy (Pharm-D)",
      "fieldOfStudy": "Doctor of Pharmacy (Pharm-D)",
      "institution": "MESCO College of Pharmacy, affiliated with Osmania University, Hyderabad, India",
      "startDate": "2024",
      "endDate": "2023"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "A Prospective Observational Study on Hepatoprotective Agents Used in Alcoholic Liver Disease at a Tertiary Care Teaching Hospital",
      "techStack": [
        "Osmania University"
      ],
      "bullets": [
        "Conducted a prospective research study on hepatoprotective agents used in the treatment of alcoholic liver disease.",
        "Collected and analyzed patient data to assess treatment outcomes and therapeutic effectiveness.",
        "Prepared and submitted a formal dissertation to Osmania University as partial fulfillment of the Pharm-D degree."
      ]
    }
  ],
  "certifications": []
};

describe('ResumeCanvas Multi-Page Pagination & Layout', () => {
  it('correctly partitions long resumes into multi-page sheets without overflow', () => {
    const onChange = jest.fn();
    render(<ResumeCanvas document={SAMPLE_LARGE_DOC} onChange={onChange} />);

    // Should generate exactly 2 pages matching the PDF export (Page 1 of 2, Page 2 of 2)
    const pageIndicators = screen.getAllByText(/Page \d+ of \d+/);
    expect(pageIndicators.length).toBe(2);
    expect(pageIndicators[0].textContent).toBe('Page 1 of 2');
    expect(pageIndicators[1].textContent).toBe('Page 2 of 2');

    // Education should not duplicate field of study if already in degree
    const eduDegreeText = screen.getByText((content) =>
      content.includes('Masters in Drug Regulatory Affairs')
    );
    expect(eduDegreeText.textContent).not.toContain(
      'Masters in Drug Regulatory Affairs in Drug Regulatory Affairs'
    );

    // Project title should be present and wrap cleanly
    expect(
      screen.getByText((content) =>
        content.includes('A Prospective Observational Study')
      )
    ).toBeInTheDocument();
  });

  it('flows long roles across page breaks to eliminate awkward whitespace on page 1', () => {
    const longBulletsDoc: ResumeDocument = {
      ...SAMPLE_LARGE_DOC,
      experience: [
        SAMPLE_LARGE_DOC.experience[0],
        {
          ...SAMPLE_LARGE_DOC.experience[1],
          bullets: SAMPLE_LARGE_DOC.experience[1].bullets.map(
            (b) => `${b} - expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating and cutting query compute latency by 40%.`
          ),
        },
      ],
    };

    render(<ResumeCanvas document={longBulletsDoc} onChange={jest.fn()} />);

    // Should flow across the page boundary, eliminating empty space on Page 1
    // and rendering a clean continuation indicator on Page 2
    expect(
      screen.getByText((content) =>
        content.includes('Clinical Pharmacology Intern • Tuffah Hospital (Continued)')
      )
    ).toBeInTheDocument();
  });
});


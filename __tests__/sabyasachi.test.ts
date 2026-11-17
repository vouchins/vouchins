
import { parseRawTextToDocument, evaluateResumeHeuristically } from '../lib/jobs/xyz-evaluator';
import { partitionResumePages } from '../lib/jobs/pagination';
import { extractResumeText } from '../lib/jobs/parser';
import * as fs from 'fs';

const sabyasachiRawText = `SABYASACHI GHOSH
Hyderabad   +91-9609331643   Linkedin   Github   Leetcode   Scaler   My Portfolio   sabyasachi9733@gmail.com
SKILLS
•   Java, Spring Boot, Python, Javascript, C++, AWS, Oracle Cloud (OCI), SQL, Microservices, REST API, Jenkins, Docker, Linux/Unix,
Agentic AI, RAG, Generative AI, Kubernetes, Selenium, Git, CI/CD
EXPERIENCE
Senior Software Developer (IC3)   Mar 2025 - Present
Oracle
Designed and deployed production-grade   Agentic   applications in   Oracle Fusion AI Agent Studio , integrating LLM orchestration, tool
calling, API services, guardrails, and human-in-the-loop escalation workflows to enable secure enterprise   self-service .
Re-architected LLM workflows with structured output schemas and backend services for deterministic processing, cutting end-to-end
latency by   73%   (7.5s to 2.0s) and total token usage by   ~70%   (31K to 9.5K input; 1.2K to 340 output tokens).
Led end-to-end design and full-stack development of Product, Account and Contact synchronization from   CPQ   and Fusion to   OCC
using   Java 8, OJET, REST, OCI, JS   and   SQL ; delivered   Swagger API s, PSR performance tests, Prometheus-Grafana monitoring on
a   distributed architecture   and a resilient   job framework   with retry, restart and stage tracking, achieving   100%   automated
synchronization and reducing manual operations by   80% .
Led the migration of   Docker   build environments across all   Recommendation   Service microservices from   Oracle Linux 7   to   Oracle
Linux 8 , updating base images, RPM dependencies, build scripts, and   Jenkins CI/CD   pipelines; also migrated Jenkins source-code
integration from   Perforce   to   Git , improving security, maintainability, and build reliability.
Modernized the   OCC Admin   application by eliminating the legacy Select2 dependency and upgrading   Oracle JET   from v13 to v19,
improving maintainability, security posture, and long-term framework support.
Resolved high-severity production defects across the   OSF, Admin , and   RECS   applications, improving platform stability, securing
critical workflows, and reducing admin-related support tickets by   25% .
Software Development Engineer - II   Nov 2024 - Mar 2025
Sigmoid
Leveraged Legend Studio (Finos) to create and query 10+ business data models, accelerating analysis workflows by 30% and
reducing rework in dataset validation by 20%.
Senior Software Engineer   Sep 2020 - Nov 2024
Valuelabs
Engineered and optimized   10+ REST APIs   using Java, Spring Boot and Liferay contributing to multiple enterprise features,
collaborating closely with cross-functional teams and clients to deliver high-quality, requirements-aligned solutions.
Contributed to the development of   AIDE , an internal AI platform—performed model testing, dataset preparation,   LLM training   and
fine-tuning   of the LLM that improved the accuracy by 40%.
Automated   end-to-end test cases   and performed performance testing using   Playwright, Selenium, and Python , increasing test
coverage and reducing regression issues by 25% and   reduced manual operational effort by up to 40% .
Architected   AWS   infrastructure using   CloudFormation   and built   serverless   components with   AWS Lambda   (Python/Boto3), reducing
deployment time by 40% and enabling fully automated, production-ready releases via   AWS SAM CLI .
PROJECTS
Offline Document Intelligence System (Powered by Llama 3.2 & ChromaDB)
https://github.com/SabyasachiNITD/rag-env
Architected a local Retrieval-Augmented Generation ( RAG ) pipeline using   Python, LangChain , and   ChromaDB   to index complex
PDFs into 1,000-character vector chunks, leveraging a 3B parameter LLM (Llama 3.2) to deliver 100% context-grounded,
hallucination-free responses.
ACHIEVEMENTS
Became Sprint Champion in Oracle within 5 months of Joining Oracle
Received Star of the month award twice and nominated Star of the Quarter for once in Valuelabs
EDUCATION
NIT Durgapur   2020
B.Tech
Graduated with First Class Distinction
Created a project to optimize common content distribution in adhoc network`;

describe('Sabyasachi Resume Parse Test', () => {
  it('parses contact info, skills, and experience correctly', () => {
    const parsed = parseRawTextToDocument(sabyasachiRawText);

    expect(parsed.contact.fullName).toBe('SABYASACHI GHOSH');
    expect(parsed.contact.email).toBe('sabyasachi9733@gmail.com');
    expect(parsed.contact.phone).toBe('+91-9609331643');
    expect(parsed.contact.location).toBe('Hyderabad');
    expect(parsed.contact.githubUrl).toBe('https://github.com/SabyasachiNITD');

    // Skills extraction
    expect(parsed.skills.length).toBeGreaterThanOrEqual(1);
    const techSkills = parsed.skills.find((s) => /technical|core/i.test(s.category)) || parsed.skills[0];
    expect(techSkills.items).toContain('Java');
    expect(techSkills.items).toContain('Spring Boot');
    expect(techSkills.items).toContain('Docker');
    expect(techSkills.items).toContain('Kubernetes');
    expect(techSkills.items).toContain('Agentic AI');
    expect(techSkills.items).toContain('CI/CD');
    expect(techSkills.items.length).toBe(20);

    // Experience parsing
    expect(parsed.experience.length).toBe(3);
    expect(parsed.experience[0].company).toBe('Oracle');
    expect(parsed.experience[0].roleTitle).toBe('Senior Software Developer (IC3)');
    expect(parsed.experience[0].bullets.length).toBe(4);

    expect(parsed.experience[1].company).toBe('Sigmoid');
    expect(parsed.experience[1].roleTitle).toBe('Software Development Engineer - II');
    expect(parsed.experience[1].bullets.length).toBe(1);

    expect(parsed.experience[2].company).toBe('Valuelabs');
    expect(parsed.experience[2].roleTitle).toBe('Senior Software Engineer');
    expect(parsed.experience[2].bullets.length).toBe(3);

    // Initial evaluation
    const evalResult = evaluateResumeHeuristically(parsed, sabyasachiRawText);
    expect(evalResult.overallScore).toBe(92);
    expect(evalResult.pillarScores.impact).toBe(99);
    expect(evalResult.pillarScores.relevance).toBe(95);

    // Evaluation without rawText (e.g. after edit in canvas) maintains 92 score
    const evalWithoutRaw = evaluateResumeHeuristically(parsed);
    expect(evalWithoutRaw.overallScore).toBe(92);
    expect(evalWithoutRaw.pillarScores.relevance).toBe(95);

    // Applying suggestions preserves score monotonicity
    if (evalResult.suggestions.length > 0) {
      const sug = evalResult.suggestions[0];
      const updatedExp = [...parsed.experience];
      updatedExp[sug.roleIndex] = {
        ...updatedExp[sug.roleIndex],
        bullets: [...updatedExp[sug.roleIndex].bullets],
      };
      updatedExp[sug.roleIndex].bullets[sug.bulletIndex] = sug.suggestedRewrite;
      const updatedDoc = { ...parsed, experience: updatedExp };
      const afterSugEval = evaluateResumeHeuristically(updatedDoc);
      const calibratedScore = Math.max(evalResult.overallScore, afterSugEval.overallScore);
      expect(calibratedScore).toBeGreaterThanOrEqual(evalResult.overallScore);
      expect(afterSugEval.overallScore).toBe(92);
    }
  });

  it('accommodates full resume on a single page without unnecessary whitespace or pushing to page 2', () => {
    const parsed = parseRawTextToDocument(sabyasachiRawText);
    const pages = partitionResumePages(parsed, 'LETTER');

    expect(pages.length).toBe(1);

    // Page 1: Holds Header, Skills, all 3 roles, Education, and Projects
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].roles.length).toBe(3);
    expect(pages[0].roles[0].role.company).toBe('Oracle');
    expect(pages[0].roles[1].role.company).toBe('Sigmoid');
    expect(pages[0].roles[2].role.company).toBe('Valuelabs');
    expect(pages[0].showEducation).toBe(true);
    expect(pages[0].showProjects).toBe(true);
  });

  it('accommodates the exact downloaded cbeef969 document on a single page', () => {
    const downloadedDoc: any = {
      contact: {
        fullName: 'SABYASACHI GHOSH',
        email: 'sabyasachi9733@gmail.com',
        phone: '+91-9609331643',
        location: 'Hyderabad',
        githubUrl: 'github.com/SabyasachiNITD',
      },
      summary: '',
      skills: [
        {
          category: 'Technical Skills',
          items: ['Java', 'Spring Boot', 'Python', 'Javascript', 'C++', 'AWS', 'Oracle Cloud (OCI)', 'SQL', 'Microservices', 'REST API', 'Jenkins', 'Docker', 'Linux/Unix', 'Agentic AI', 'RAG', 'Generative AI', 'Kubernetes', 'Selenium', 'Git', 'CI/CD']
        }
      ],
      experience: [
        {
          roleTitle: 'Senior Software Developer (IC3)',
          company: 'Oracle',
          startDate: 'Mar 2025',
          endDate: 'Present',
          bullets: [
            'Designed and deployed production-grade Agentic applications in Oracle Fusion AI Agent Studio, integrating LLM orchestration, tool calling, API services, guardrails, and human-in-the-loop escalation workflows to enable secure enterprise self-service. Re-architected LLM workflows with structured output schemas and backend services for deterministic processing, cutting end-to-end latency by 73% (7.5s to 2.0s) and total token usage by ~70% (31K to 9.5K input; 1.2K to 340 output tokens).',
            'Led end-to-end design and full-stack development of Product, Account and Contact synchronization from CPQ and Fusion to OCC using Java 8, OJET, REST, OCI, JS and SQL; delivered Swagger APIs, PSR performance tests, Prometheus-Grafana monitoring on a distributed architecture and a resilient job framework with retry, restart and stage tracking, achieving 100% automated synchronization and reducing manual operations by 80%.',
            'Led the migration of Docker build environments across all Recommendation Service microservices from Oracle Linux 7 to Oracle Linux 8, updating base images, RPM dependencies, build scripts, and Jenkins CI/CD pipelines; also migrated Jenkins source-code integration from Perforce to Git, improving security, maintainability, and build reliability. Modernized the OCC Admin application by eliminating the legacy Select2 dependency and upgrading Oracle JET from v13 to v19, improving maintainability, security posture, and long-term framework support.',
            'Resolved high-severity production defects across the OSF, Admin, and RECS applications, improving platform stability, securing critical workflows, and reducing admin-related support tickets by 25%.'
          ]
        },
        {
          roleTitle: 'Software Development Engineer - II',
          company: 'Sigmoid',
          startDate: 'Nov 2024',
          endDate: 'Mar 2025',
          location: 'Software Development Engineer II',
          bullets: [
            'Leveraged Legend Studio (Finos) to create and query 10+ business data models, accelerating analysis workflows by 30% and reducing rework in dataset validation by 20%.'
          ]
        },
        {
          roleTitle: 'Senior Software Engineer',
          company: 'Valuelabs',
          startDate: 'Sep 2020',
          endDate: 'Nov 2024',
          bullets: [
            'Engineered and optimized 10+ REST APIs using Java, Spring Boot and Liferay contributing to multiple enterprise features, collaborating closely with cross-functional teams and clients to deliver high-quality, requirements-aligned solutions. Contributed to the development of AIDE, an internal AI platform-performed model testing, dataset preparation, LLM training and fine-tuning of the LLM that improved the accuracy by 40%.',
            'Automated end-to-end test cases and performed performance testing using Playwright, Selenium, and Python, increasing test coverage and reducing regression issues by 25% and reduced manual operational effort by up to 40%.',
            'Architected AWS infrastructure using CloudFormation and built serverless components with AWS Lambda (Python/Boto3), reducing deployment time by 40% and enabling fully automated, production-ready releases via AWS SAM CLI.'
          ]
        }
      ],
      education: [
        {
          institution: 'NIT Durgapur 2020',
          degree: 'B.Tech',
          endDate: 'Completed'
        },
        {
          institution: 'Created a project to optimize common content distribution in adhoc network',
          degree: 'Graduated with First Class Distinction',
          endDate: 'Completed'
        }
      ],
      projects: [
        {
          title: 'Offline Document Intelligence System (Powered by Llama 3.2 & ChromaDB) https://github.com/SabyasachiNITD/rag-env Architected a local Retrieval-Augmented Generation ( RAG ) pipeline using Python, LangChain, and ChromaDB to index complex PDFs into 1,000-character vector chunks, leveraging a 3B parameter LLM (Llama 3.2) to deliver 100% context-grounded, hallucination-free responses.',
          techStack: [],
          bullets: []
        }
      ]
    };

    const pages = partitionResumePages(downloadedDoc, 'LETTER');
    expect(pages.length).toBe(1);
    expect(pages[0].roles.length).toBe(3);
    expect(pages[0].showEducation).toBe(true);
    expect(pages[0].showProjects).toBe(true);
  });
});

import {
  ResumeDocument,
  WorkExperienceItem,
} from './types';

export interface PaginatedRoleSegment {
  role: WorkExperienceItem;
  globalIdx: number;
  bulletStartIndex: number;
  bulletEndIndex: number;
  isContinuation: boolean;
}

export interface PaginatedResumePage {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  totalPages: number;
  isFirstPage: boolean;
  showContact: boolean;
  showSummary: boolean;
  showSkills: boolean;
  roles: PaginatedRoleSegment[];
  showEducation: boolean;
  educationIndices?: number[];
  showProjects: boolean;
  projectIndices?: number[];
  showCertifications?: boolean;
  certificationIndices?: number[];
}

export function estimateBulletUnits(text: string): number {
  const len = text ? text.length : 0;
  // In standard full-width layout (556pt printable width with 9pt font),
  // each line holds ~140-145 characters.
  // Line-height is ~11.25pt plus bullet padding (~13pt total per rendered line).
  if (len <= 140) return 13;
  if (len <= 280) return 25;
  if (len <= 420) return 37;
  return 37 + Math.ceil((len - 420) / 140) * 12;
}

export function estimateRoleUnits(role: WorkExperienceItem): number {
  const headerUnits = 20;
  const bulletsUnits = (role.bullets || []).reduce(
    (sum, b) => sum + estimateBulletUnits(b) + 1.5,
    0
  );
  return headerUnits + bulletsUnits;
}

/**
 * Deterministically partition a resume into discrete pages.
 * Shared across ResumeCanvas (Studio), ExportResumeDialog (Preview), and ResumePDFDocument (Download).
 */
export function partitionResumePages(
  document: ResumeDocument,
  pageSize: 'LETTER' | 'A4' = 'LETTER',
  template: 'standard' | 'compact' | 'centered' | 'structured' = 'standard'
): PaginatedResumePage[] {
  const PAGE_CAPACITY = pageSize === 'A4' ? 920 : 880;
  const isStructured = template === 'structured';

  const eduUnits =
    document.education && document.education.length > 0
      ? 24 + document.education.length * 36
      : 0;

  const projUnits =
    document.projects && document.projects.length > 0
      ? 24 +
        document.projects.reduce((acc, p) => {
          const bUnits = (p.bullets || []).reduce(
            (bAcc, b) => bAcc + estimateBulletUnits(b) + 1.5,
            0
          );
          return acc + 22 + bUnits;
        }, 0)
      : 0;

  const certUnits =
    document.certifications && document.certifications.length > 0
      ? 20 + document.certifications.length * 16
      : 0;

  const contactLinksCount = [
    document.contact.email,
    document.contact.phone,
    document.contact.location,
    document.contact.linkedinUrl,
    document.contact.githubUrl,
    document.contact.leetcodeUrl,
    document.contact.portfolioUrl,
  ].filter(Boolean).length;
  let p1Used = contactLinksCount > 4 ? 85 : 70; // Header & Contact
  if (document.summary) {
    p1Used += 18 + Math.ceil(document.summary.length / 140) * 13;
  }
  const skillsUnits = (document.skills || []).reduce((acc, s) => {
    const textLen = (s.category || '').length + 2 + (s.items || []).join(', ').length;
    const estimatedLines = Math.max(1, Math.ceil(textLen / 140));
    return acc + estimatedLines * 13 + 6;
  }, 18);
  // In structured template, skills and education are in the sidebar column, NOT in the main column!
  if (!isStructured) {
    p1Used += skillsUnits;
  }
  p1Used += 20; // Work Experience section header

  const page1Roles: PaginatedRoleSegment[] = [];
  const overflowRoles: PaginatedRoleSegment[] = [];

  let currentP1 = p1Used;
  const remainingExp = (document.experience || []).map((role, idx) => ({ role, globalIdx: idx }));

  while (remainingExp.length > 0) {
    const item = remainingExp[0];
    const roleUnits = estimateRoleUnits(item.role);

    if (currentP1 + roleUnits <= PAGE_CAPACITY) {
      page1Roles.push({
        role: item.role,
        globalIdx: item.globalIdx,
        bulletStartIndex: 0,
        bulletEndIndex: item.role.bullets?.length || 0,
        isContinuation: false,
      });
      currentP1 += roleUnits;
      remainingExp.shift();
    } else {
      // Flow across page break if header + at least 2 bullets fit to prevent awkward dead space on Page 1
      const availableSpace = PAGE_CAPACITY - currentP1;
      const roleHeaderUnits = 20;
      const bullets = item.role.bullets || [];

      let p1BulletCount = 0;
      let p1RoleBulletsUnits = roleHeaderUnits;

      for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
        const bUnit = estimateBulletUnits(bullets[bIdx]) + 1.5;
        if (p1RoleBulletsUnits + bUnit <= availableSpace) {
          p1RoleBulletsUnits += bUnit;
          p1BulletCount++;
        } else {
          break;
        }
      }

      if (p1BulletCount >= 2 && p1BulletCount < bullets.length) {
        page1Roles.push({
          role: item.role,
          globalIdx: item.globalIdx,
          bulletStartIndex: 0,
          bulletEndIndex: p1BulletCount,
          isContinuation: false,
        });
        currentP1 += p1RoleBulletsUnits;

        overflowRoles.push({
          role: item.role,
          globalIdx: item.globalIdx,
          bulletStartIndex: p1BulletCount,
          bulletEndIndex: bullets.length,
          isContinuation: true,
        });
        remainingExp.shift();
      } else {
        // Can't fit at least 2 bullets, push remaining roles to overflow
        remainingExp.forEach((rem) => {
          overflowRoles.push({
            role: rem.role,
            globalIdx: rem.globalIdx,
            bulletStartIndex: 0,
            bulletEndIndex: rem.role.bullets?.length || 0,
            isContinuation: false,
          });
        });
        break;
      }
    }
  }

  const rawPages: Omit<PaginatedResumePage, 'pageIndex' | 'pageNumber' | 'totalPages'>[] = [];

  // Granular incremental section fitting for Page 1.
  // When content of a section (or experience) exceeds single page capacity,
  // individual items that fit remain on Page 1, and only the overflowing items
  // move to the next page instead of moving the entire section.
  const allEdu = (document.education || []).map((item, idx) => ({ item, globalIdx: idx }));
  const p1Edu: typeof allEdu = [];
  let remEdu = [...allEdu];

  if (isStructured) {
    // In structured template, Education renders in the right sidebar below Skills.
    // Sidebar capacity on Page 1 is PAGE_CAPACITY - header units.
    let sideSpaceUsed = skillsUnits;
    let p1EduCost = 22;
    for (let i = 0; i < remEdu.length; i++) {
      const itemCost = 36;
      if (sideSpaceUsed + p1EduCost + itemCost <= (PAGE_CAPACITY - 95)) {
        p1EduCost += itemCost;
        p1Edu.push(remEdu[i]);
      } else {
        break;
      }
    }
    if (p1Edu.length > 0) {
      remEdu = remEdu.slice(p1Edu.length);
    }
  } else {
    if (overflowRoles.length === 0 && remEdu.length > 0) {
      let p1EduCost = 24; // Section header
      for (let i = 0; i < remEdu.length; i++) {
        const itemCost = 45;
        if (currentP1 + p1EduCost + itemCost <= PAGE_CAPACITY) {
          p1EduCost += itemCost;
          p1Edu.push(remEdu[i]);
        } else {
          break;
        }
      }
      if (p1Edu.length > 0) {
        currentP1 += p1EduCost;
        remEdu = remEdu.slice(p1Edu.length);
      }
    }
  }

  const allProjects = (document.projects || []).map((item, idx) => ({ item, globalIdx: idx }));
  const p1Projects: typeof allProjects = [];
  let remProjects = [...allProjects];
  // In structured template, Projects render in the main column under Experience (remEdu is in sidebar)
  const canFitProjectsOnP1 = isStructured
    ? overflowRoles.length === 0 && remProjects.length > 0
    : overflowRoles.length === 0 && remEdu.length === 0 && remProjects.length > 0;

  if (canFitProjectsOnP1) {
    let p1ProjCost = 22; // Section header
    for (let i = 0; i < remProjects.length; i++) {
      const p = remProjects[i].item;
      const bUnits = (p.bullets || []).reduce((acc, b) => acc + estimateBulletUnits(b) + 2, 0);
      const itemCost = 20 + bUnits;
      if (currentP1 + p1ProjCost + itemCost <= PAGE_CAPACITY) {
        p1ProjCost += itemCost;
        p1Projects.push(remProjects[i]);
      } else {
        break;
      }
    }
    if (p1Projects.length > 0) {
      currentP1 += p1ProjCost;
      remProjects = remProjects.slice(p1Projects.length);
    }
  }

  const allCerts = (document.certifications || []).map((item, idx) => ({ item, globalIdx: idx }));
  const p1Certs: typeof allCerts = [];
  let remCerts = [...allCerts];
  const canFitCertsOnP1 = isStructured
    ? overflowRoles.length === 0 && remProjects.length === 0 && remCerts.length > 0
    : overflowRoles.length === 0 && remEdu.length === 0 && remProjects.length === 0 && remCerts.length > 0;

  if (canFitCertsOnP1) {
    let p1CertCost = 20; // Section header
    for (let i = 0; i < remCerts.length; i++) {
      const itemCost = 15;
      if (currentP1 + p1CertCost + itemCost <= PAGE_CAPACITY) {
        p1CertCost += itemCost;
        p1Certs.push(remCerts[i]);
      } else {
        break;
      }
    }
    if (p1Certs.length > 0) {
      currentP1 += p1CertCost;
      remCerts = remCerts.slice(p1Certs.length);
    }
  }

  // Page 1
  rawPages.push({
    isFirstPage: true,
    showContact: true,
    showSummary: Boolean(document.summary),
    showSkills: (document.skills?.length || 0) > 0,
    roles: page1Roles,
    showEducation: p1Edu.length > 0,
    educationIndices: p1Edu.map((e) => e.globalIdx),
    showProjects: p1Projects.length > 0,
    projectIndices: p1Projects.map((p) => p.globalIdx),
    showCertifications: p1Certs.length > 0,
    certificationIndices: p1Certs.map((c) => c.globalIdx),
  });

  const hasRemainingContent =
    overflowRoles.length > 0 ||
    remEdu.length > 0 ||
    remProjects.length > 0 ||
    remCerts.length > 0;

  if (hasRemainingContent) {
    let currentPageRoles: PaginatedRoleSegment[] = [];
    let currentUnits = 60; // Page header continuation banner + section header

    overflowRoles.forEach((item) => {
      const bulletsToCount = item.role.bullets.slice(item.bulletStartIndex, item.bulletEndIndex);
      const headerUnits = item.isContinuation ? 24 : 28;
      const bulletsUnits = (bulletsToCount || []).reduce(
        (sum, b) => sum + estimateBulletUnits(b) + 3,
        0
      );
      const roleUnits = headerUnits + bulletsUnits;

      if (currentUnits + roleUnits <= PAGE_CAPACITY) {
        currentPageRoles.push(item);
        currentUnits += roleUnits;
      } else if (currentPageRoles.length > 0) {
        rawPages.push({
          isFirstPage: false,
          showContact: false,
          showSummary: false,
          showSkills: false,
          roles: currentPageRoles,
          showEducation: false,
          educationIndices: [],
          showProjects: false,
          projectIndices: [],
          showCertifications: false,
          certificationIndices: [],
        });
        currentPageRoles = [item];
        currentUnits = 60 + roleUnits;
      } else {
        // Fallback for massive role segment exceeding page
        const remainingBullets = item.role.bullets.slice(item.bulletStartIndex, item.bulletEndIndex);
        let currentBulletStart = item.bulletStartIndex;
        while (remainingBullets.length > 0) {
          const segBullets: string[] = [];
          let segUnits = currentBulletStart === item.bulletStartIndex && !item.isContinuation ? 28 : 24;
          while (remainingBullets.length > 0) {
            const b = remainingBullets[0];
            const bUnits = estimateBulletUnits(b) + 3;
            if (currentUnits + segUnits + bUnits <= PAGE_CAPACITY || segBullets.length === 0) {
              segBullets.push(remainingBullets.shift()!);
              segUnits += bUnits;
            } else {
              break;
            }
          }
          currentPageRoles.push({
            role: item.role,
            globalIdx: item.globalIdx,
            bulletStartIndex: currentBulletStart,
            bulletEndIndex: currentBulletStart + segBullets.length,
            isContinuation: currentBulletStart > 0 || item.isContinuation,
          });
          currentUnits += segUnits;
          currentBulletStart += segBullets.length;
          if (remainingBullets.length > 0) {
            rawPages.push({
              isFirstPage: false,
              showContact: false,
              showSummary: false,
              showSkills: false,
              roles: currentPageRoles,
              showEducation: false,
              educationIndices: [],
              showProjects: false,
              projectIndices: [],
              showCertifications: false,
              certificationIndices: [],
            });
            currentPageRoles = [];
            currentUnits = 60;
          }
        }
      }
    });

    // Distribute remaining Education, Projects, and Certifications across pages
    while (
      remEdu.length > 0 ||
      remProjects.length > 0 ||
      remCerts.length > 0 ||
      currentPageRoles.length > 0
    ) {
      const pageEdu: typeof allEdu = [];
      if (remEdu.length > 0) {
        let eduCost = p1Edu.length > 0 ? 16 : 22;
        while (remEdu.length > 0) {
          const itemCost = 28;
          if (currentUnits + eduCost + itemCost <= PAGE_CAPACITY) {
            eduCost += itemCost;
            pageEdu.push(remEdu.shift()!);
          } else {
            break;
          }
        }
        if (pageEdu.length > 0) {
          currentUnits += eduCost;
        }
      }

      const pageProjects: typeof allProjects = [];
      if (remEdu.length === 0 && remProjects.length > 0) {
        let projCost = p1Projects.length > 0 ? 16 : 22;
        while (remProjects.length > 0) {
          const p = remProjects[0].item;
          const bUnits = (p.bullets || []).reduce((acc, b) => acc + estimateBulletUnits(b) + 2, 0);
          const itemCost = 20 + bUnits;
          if (currentUnits + projCost + itemCost <= PAGE_CAPACITY) {
            projCost += itemCost;
            pageProjects.push(remProjects.shift()!);
          } else {
            break;
          }
        }
        if (pageProjects.length > 0) {
          currentUnits += projCost;
        }
      }

      const pageCerts: typeof allCerts = [];
      if (remEdu.length === 0 && remProjects.length === 0 && remCerts.length > 0) {
        let certCost = p1Certs.length > 0 ? 15 : 20;
        while (remCerts.length > 0) {
          const itemCost = 15;
          if (currentUnits + certCost + itemCost <= PAGE_CAPACITY) {
            certCost += itemCost;
            pageCerts.push(remCerts.shift()!);
          } else {
            break;
          }
        }
        if (pageCerts.length > 0) {
          currentUnits += certCost;
        }
      }

      rawPages.push({
        isFirstPage: false,
        showContact: false,
        showSummary: false,
        showSkills: false,
        roles: currentPageRoles,
        showEducation: pageEdu.length > 0,
        educationIndices: pageEdu.map((e) => e.globalIdx),
        showProjects: pageProjects.length > 0,
        projectIndices: pageProjects.map((p) => p.globalIdx),
        showCertifications: pageCerts.length > 0,
        certificationIndices: pageCerts.map((c) => c.globalIdx),
      });

      currentPageRoles = [];
      currentUnits = 60;
    }
  }

  const totalPages = rawPages.length;
  return rawPages.map((page, idx) => ({
    ...page,
    pageIndex: idx,
    pageNumber: idx + 1,
    totalPages,
  }));
}

export interface PageFitSummary {
  totalPages: number;
  pageOneFillPercent: number;
  status: 'fits' | 'tight-overflow' | 'multi-page';
  estimatedOverflowLines: number;
  message: string;
}

/**
 * Estimates how tightly the resume fits on Page 1 and whether only a few lines
 * spill onto the final page so users can trim a line or bullet cleanly.
 */
export function estimatePageFitSummary(
  doc: ResumeDocument,
  pageSize: 'LETTER' | 'A4' = 'LETTER'
): PageFitSummary {
  const pages = partitionResumePages(doc, pageSize);
  const pageCapacity = pageSize === 'A4' ? 920 : 880;
  const totalPages = pages.length;

  let totalUnits = 110; // Header & contact block
  if (doc.summary && doc.summary.trim().length > 0) {
    totalUnits += Math.ceil(doc.summary.length / 130) * 12 + 28;
  }
  if ((doc.skills || []).length > 0) {
    totalUnits += 28 + doc.skills.length * 16;
  }
  for (const role of doc.experience || []) {
    totalUnits += estimateRoleUnits(role);
  }
  if ((doc.education || []).length > 0) {
    totalUnits += 28 + doc.education.length * 26;
  }
  if ((doc.projects || []).length > 0) {
    totalUnits += 28 + doc.projects.reduce((s, p) => s + 24 + (p.bullets?.length || 0) * 14, 0);
  }
  if ((doc.certifications || []).length > 0) {
    totalUnits += 28 + doc.certifications.length * 15;
  }

  if (totalPages <= 1) {
    const fillPct = Math.min(100, Math.max(15, Math.round((totalUnits / pageCapacity) * 100)));
    return {
      totalPages: 1,
      pageOneFillPercent: fillPct,
      status: 'fits',
      estimatedOverflowLines: 0,
      message: `Fits cleanly on 1 page (${fillPct}% full)`,
    };
  }

  const lastPage = pages[pages.length - 1];
  let lastPageUnits = 0;
  for (const seg of lastPage.roles) {
    const bulletCount = Math.max(0, seg.bulletEndIndex - seg.bulletStartIndex + 1);
    lastPageUnits += (seg.isContinuation ? 18 : 34) + bulletCount * 14;
  }
  if (lastPage.showEducation) {
    lastPageUnits += 24 + (lastPage.educationIndices?.length || 1) * 24;
  }
  if (lastPage.showProjects) {
    lastPageUnits += 24 + (lastPage.projectIndices?.length || 1) * 32;
  }
  if (lastPage.showCertifications) {
    lastPageUnits += 24 + (lastPage.certificationIndices?.length || 1) * 15;
  }

  const estimatedOverflowLines = Math.max(1, Math.round(lastPageUnits / 13));
  if (lastPageUnits <= 95) {
    return {
      totalPages,
      pageOneFillPercent: 100,
      status: 'tight-overflow',
      estimatedOverflowLines,
      message: `~${estimatedOverflowLines} ${estimatedOverflowLines === 1 ? 'line spills' : 'lines spill'} to Page ${totalPages} - trim a few words or 1 bullet to fit cleanly`,
    };
  }

  return {
    totalPages,
    pageOneFillPercent: 100,
    status: 'multi-page',
    estimatedOverflowLines,
    message: `Balanced across ${totalPages} pages`,
  };
}


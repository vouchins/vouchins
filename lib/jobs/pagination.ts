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
  showProjects: boolean;
}

export function estimateBulletUnits(text: string): number {
  const len = text ? text.length : 0;
  if (len > 220) return 50;
  if (len > 120) return 36;
  if (len > 60) return 24;
  return 18;
}

export function estimateRoleUnits(role: WorkExperienceItem): number {
  const headerUnits = 32;
  const bulletsUnits = (role.bullets || []).reduce(
    (sum, b) => sum + estimateBulletUnits(b) + 3,
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
  pageSize: 'LETTER' | 'A4' = 'LETTER'
): PaginatedResumePage[] {
  const PAGE_CAPACITY = pageSize === 'A4' ? 920 : 880;

  const eduUnits =
    document.education && document.education.length > 0
      ? 26 + document.education.length * 30
      : 0;

  const projUnits =
    document.projects && document.projects.length > 0
      ? 26 +
        document.projects.reduce((acc, p) => {
          const bUnits = (p.bullets || []).reduce(
            (bAcc, b) => bAcc + estimateBulletUnits(b) + 3,
            0
          );
          return acc + 22 + bUnits;
        }, 0)
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
  let p1Used = contactLinksCount > 4 ? 120 : 105; // Header & Contact
  if (document.summary) {
    p1Used += document.summary.length > 250 ? 70 : 50;
  }
  const skillsUnits = (document.skills || []).reduce((acc, s) => {
    const textLen = (s.category || '').length + 2 + (s.items || []).join(', ').length;
    const estimatedLines = Math.max(1, Math.ceil(textLen / 95));
    return acc + estimatedLines * 16 + 4;
  }, 28);
  p1Used += skillsUnits;
  p1Used += 28; // Work Experience section header

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
      const roleHeaderUnits = 32;
      const bullets = item.role.bullets || [];

      let p1BulletCount = 0;
      let p1RoleBulletsUnits = roleHeaderUnits;

      for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
        const bUnit = estimateBulletUnits(bullets[bIdx]) + 3;
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

  const fitsSinglePage =
    overflowRoles.length === 0 &&
    currentP1 + eduUnits + projUnits <= PAGE_CAPACITY;

  // Page 1
  rawPages.push({
    isFirstPage: true,
    showContact: true,
    showSummary: Boolean(document.summary),
    showSkills: (document.skills?.length || 0) > 0,
    roles: page1Roles,
    showEducation: fitsSinglePage,
    showProjects: fitsSinglePage,
  });

  if (!fitsSinglePage) {
    let currentPageRoles: PaginatedRoleSegment[] = [];
    let currentUnits = 60; // Page header continuation banner + section header

    overflowRoles.forEach((item) => {
      const bulletsToCount = item.role.bullets.slice(item.bulletStartIndex, item.bulletEndIndex);
      const headerUnits = item.isContinuation ? 24 : 32;
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
          showProjects: false,
        });
        currentPageRoles = [item];
        currentUnits = 60 + roleUnits;
      } else {
        // Fallback for massive role segment exceeding page
        const remainingBullets = item.role.bullets.slice(item.bulletStartIndex, item.bulletEndIndex);
        let currentBulletStart = item.bulletStartIndex;
        while (remainingBullets.length > 0) {
          const segBullets: string[] = [];
          let segUnits = currentBulletStart === item.bulletStartIndex && !item.isContinuation ? 32 : 24;
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
              showProjects: false,
            });
            currentPageRoles = [];
            currentUnits = 60;
          }
        }
      }
    });

    const canFitEduAndProj = currentUnits + eduUnits + projUnits <= PAGE_CAPACITY;
    const canFitEduOnly = currentUnits + eduUnits <= PAGE_CAPACITY;

    if (canFitEduAndProj) {
      rawPages.push({
        isFirstPage: false,
        showContact: false,
        showSummary: false,
        showSkills: false,
        roles: currentPageRoles,
        showEducation: eduUnits > 0,
        showProjects: projUnits > 0,
      });
    } else if (canFitEduOnly && eduUnits > 0) {
      rawPages.push({
        isFirstPage: false,
        showContact: false,
        showSummary: false,
        showSkills: false,
        roles: currentPageRoles,
        showEducation: true,
        showProjects: false,
      });
      if (projUnits > 0) {
        rawPages.push({
          isFirstPage: false,
          showContact: false,
          showSummary: false,
          showSkills: false,
          roles: [],
          showEducation: false,
          showProjects: true,
        });
      }
    } else {
      if (currentPageRoles.length > 0) {
        rawPages.push({
          isFirstPage: false,
          showContact: false,
          showSummary: false,
          showSkills: false,
          roles: currentPageRoles,
          showEducation: false,
          showProjects: false,
        });
      }

      const freshPageBannerUnits = 55;
      if (freshPageBannerUnits + eduUnits + projUnits <= PAGE_CAPACITY) {
        rawPages.push({
          isFirstPage: false,
          showContact: false,
          showSummary: false,
          showSkills: false,
          roles: [],
          showEducation: eduUnits > 0,
          showProjects: projUnits > 0,
        });
      } else {
        if (eduUnits > 0) {
          rawPages.push({
            isFirstPage: false,
            showContact: false,
            showSummary: false,
            showSkills: false,
            roles: [],
            showEducation: true,
            showProjects: false,
          });
        }
        if (projUnits > 0) {
          rawPages.push({
            isFirstPage: false,
            showContact: false,
            showSummary: false,
            showSkills: false,
            roles: [],
            showEducation: false,
            showProjects: true,
          });
        }
      }
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


import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import {
  getAllSkillResources,
  createSkillResource,
  resetToDefaultSkillResources,
} from '@/lib/skills/service';
import { CreateSkillResourceInput } from '@/lib/skills/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query') || searchParams.get('search') || undefined;

    const courses = await getAllSkillResources({ category, query });
    return NextResponse.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error: any) {
    console.error('[API /api/skills-courses GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve skill courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));

    // Support resetting/re-seeding defaults if requested by admin
    if (body.action === 'reset-defaults') {
      const resetList = await resetToDefaultSkillResources();
      return NextResponse.json({
        success: true,
        message: 'Successfully re-seeded default skill resources.',
        count: resetList.length,
        courses: resetList,
      });
    }

    const {
      title,
      description,
      category,
      url,
      secondaryUrl,
      secondaryUrlLabel,
      type,
      difficulty,
      isFree,
      featured,
      tags,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!url || !url.trim()) {
      return NextResponse.json(
        { success: false, error: 'Valid resource URL is required' },
        { status: 400 }
      );
    }

    if (!category || !category.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    const input: CreateSkillResourceInput = {
      title: title.trim(),
      description: (description || '').trim(),
      category: category.trim(),
      url: url.trim(),
      secondaryUrl: secondaryUrl ? secondaryUrl.trim() : null,
      secondaryUrlLabel: secondaryUrlLabel ? secondaryUrlLabel.trim() : null,
      type: type || 'guide',
      difficulty: difficulty || 'All Levels',
      isFree: isFree !== false,
      featured: Boolean(featured),
      tags: Array.isArray(tags) ? tags : [],
    };

    const newCourse = await createSkillResource(input);
    return NextResponse.json({
      success: true,
      course: newCourse,
    });
  } catch (error: any) {
    console.error('[API /api/skills-courses POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create skill course' },
      { status: 500 }
    );
  }
}


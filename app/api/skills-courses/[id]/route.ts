import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import {
  getSkillResourceById,
  updateSkillResource,
  deleteSkillResource,
} from '@/lib/skills/service';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const course = await getSkillResourceById(params.id);
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  try {
    const params = await context.params;
    const body = await request.json().catch(() => ({}));

    const updatedCourse = await updateSkillResource({
      id: params.id,
      ...body,
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse,
    });
  } catch (error: any) {
    console.error('[API /api/skills-courses/[id] PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update resource' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  try {
    const params = await context.params;
    await deleteSkillResource(params.id);

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error: any) {
    console.error('[API /api/skills-courses/[id] DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete resource' },
      { status: 500 }
    );
  }
}


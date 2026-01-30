import { NextRequest, NextResponse } from 'next/server';
import { calculateERSForUser } from '@/lib/cron/weekly-ers';
import { runWeeklyERSCalculation } from '@/lib/cron/weekly-ers';

/**
 * POST /api/ers/recalculate
 *
 * Recalculate ERS for a single user (immediate) or all users (batch)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, batch } = body;

    // Batch mode: calculate for all users
    if (batch === true) {
      const result = await runWeeklyERSCalculation();
      return NextResponse.json({
        success: true,
        type: 'batch',
        result,
      });
    }

    // Single user mode
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await calculateERSForUser(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      type: 'single',
      ersScore: result.ersScore,
      ersStage: result.ersStage,
    });
  } catch (error) {
    console.error('ERS recalculation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

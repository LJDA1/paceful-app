import { NextRequest, NextResponse } from 'next/server';
import { calculateAndStoreERSScore } from '@/lib/ers-calculator';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await calculateAndStoreERSScore(userId);

    return NextResponse.json({
      success: true,
      result: {
        userId: result.userId,
        ersScore: result.ersScore,
        ersStage: result.ersStage,
        ersConfidence: result.ersConfidence,
        ersDelta: result.ersDelta,
        components: {
          // New mood-focused components
          moodStability: result.components.moodStability?.toFixed(3) ?? null,
          engagementConsistency: result.components.engagementConsistency?.toFixed(3) ?? null,
          // Map to old column names for backwards compatibility
          emotionalStability: result.components.moodStability?.toFixed(3) ?? null,
          selfReflection: null,
          trustOpenness: null,
          recoveryBehavior: null,
          socialReadiness: null,
        },
        moodEntriesCount: result.moodEntriesCount,
        weekOf: result.weekOf,
        calculatedAt: result.calculatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('ERS calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

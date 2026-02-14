import { NextRequest, NextResponse } from 'next/server';
import { calculateAndStoreERSScore } from '@/lib/ers-calculator';
import { createClient } from '@supabase/supabase-js';
import { captureTrajectorySnapshotAsync } from '@/lib/trajectory-snapshot';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Create service role client for elevated permissions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = await calculateAndStoreERSScore(userId, supabase);

    // Fire-and-forget: Capture trajectory snapshot for training data
    try {
      captureTrajectorySnapshotAsync(userId, supabase);
    } catch {
      // Silent failure
    }

    return NextResponse.json({
      success: true,
      result: {
        userId: result.userId,
        ersScore: result.ersScore,
        ersStage: result.ersStage,
        ersConfidence: result.ersConfidence,
        ersDelta: result.ersDelta,
        components: {
          // 5-dimension ERS components
          emotionalStability: result.components.emotionalStability?.toFixed(3) ?? null,
          selfReflection: result.components.selfReflection?.toFixed(3) ?? null,
          behavioralEngagement: result.components.behavioralEngagement?.toFixed(3) ?? null,
          copingCapacity: result.components.copingCapacity?.toFixed(3) ?? null,
          socialReadiness: result.components.socialReadiness?.toFixed(3) ?? null,
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

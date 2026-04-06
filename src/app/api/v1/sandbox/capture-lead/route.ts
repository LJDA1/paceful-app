/**
 * POST /api/v1/sandbox/capture-lead
 *
 * Captures or updates lead info from sandbox usage.
 * Links to their sandbox assessments via email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAndSendDripEmails } from '@/lib/sandbox-emails';

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_VERTICALS = [
  'dating',
  'mental_health',
  'workplace',
  'gambling',
  'insurance',
  'coaching',
  'education',
] as const;

type Vertical = typeof VALID_VERTICALS[number];

interface CaptureLeadRequest {
  email: string;
  company_name?: string;
  vertical?: string;
  session_id?: string; // To link with sandbox_usage
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: CaptureLeadRequest = await request.json();
    const { email, company_name, vertical, session_id } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'email is required', code: 'BAD_REQUEST' } },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid email format', code: 'BAD_REQUEST' } },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate vertical if provided
    const validatedVertical: Vertical | null = vertical && VALID_VERTICALS.includes(vertical as Vertical)
      ? (vertical as Vertical)
      : null;

    // Get assessment stats from sandbox_usage by email
    const { data: usageData } = await supabaseAdmin
      .from('sandbox_usage')
      .select('id, assessment_count')
      .eq('email', email.toLowerCase());

    // Get assessment scores to calculate average
    let assessmentsRun = 0;
    let avgErsScore: number | null = null;

    if (usageData && usageData.length > 0) {
      // Sum up all assessments for this email
      assessmentsRun = usageData.reduce((sum, u) => sum + (u.assessment_count || 0), 0);

      // Get all assessment scores for this email
      const usageIds = usageData.map(u => u.id);
      const { data: assessments } = await supabaseAdmin
        .from('sandbox_assessments')
        .select('ers_score')
        .in('sandbox_usage_id', usageIds);

      if (assessments && assessments.length > 0) {
        const totalScore = assessments.reduce((sum, a) => sum + a.ers_score, 0);
        avgErsScore = Math.round((totalScore / assessments.length) * 100) / 100;
      }
    }

    // If session_id provided, also check that session
    if (session_id) {
      const { data: sessionUsage } = await supabaseAdmin
        .from('sandbox_usage')
        .select('id, assessment_count')
        .eq('session_id', session_id)
        .single();

      if (sessionUsage) {
        // Update that session's email
        await supabaseAdmin
          .from('sandbox_usage')
          .update({ email: email.toLowerCase(), updated_at: new Date().toISOString() })
          .eq('session_id', session_id);

        // Add to count if not already included
        if (!usageData?.some(u => u.id === sessionUsage.id)) {
          assessmentsRun += sessionUsage.assessment_count || 0;

          // Get scores from this session
          const { data: sessionAssessments } = await supabaseAdmin
            .from('sandbox_assessments')
            .select('ers_score')
            .eq('sandbox_usage_id', sessionUsage.id);

          if (sessionAssessments && sessionAssessments.length > 0) {
            const allScores = avgErsScore !== null
              ? [avgErsScore, ...sessionAssessments.map(a => a.ers_score)]
              : sessionAssessments.map(a => a.ers_score);
            avgErsScore = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100;
          }
        }
      }
    }

    // Check if lead already exists
    const { data: existingLead } = await supabaseAdmin
      .from('sandbox_leads')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    const timestamp = new Date().toISOString();

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('sandbox_leads')
        .update({
          company_name: company_name || existingLead.company_name,
          vertical: validatedVertical || existingLead.vertical,
          assessments_run: Math.max(assessmentsRun, existingLead.assessments_run || 0),
          avg_ers_score: avgErsScore ?? existingLead.avg_ers_score,
          last_active: timestamp,
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lead:', updateError);
        return NextResponse.json(
          { success: false, error: { message: 'Failed to update lead', code: 'INTERNAL_ERROR' } },
          { status: 500, headers: corsHeaders() }
        );
      }

      // Check and send drip emails (async, don't block response)
      checkAndSendDripEmails(updatedLead.id).catch(err => {
        console.error('[Capture Lead] Error sending drip emails:', err);
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            lead_id: updatedLead.id,
            email: updatedLead.email,
            company_name: updatedLead.company_name,
            vertical: updatedLead.vertical,
            assessments_run: updatedLead.assessments_run,
            avg_ers_score: updatedLead.avg_ers_score,
            created_at: updatedLead.created_at,
            last_active: updatedLead.last_active,
            is_new: false,
          },
        },
        { status: 200, headers: corsHeaders() }
      );
    }

    // Create new lead
    const { data: newLead, error: insertError } = await supabaseAdmin
      .from('sandbox_leads')
      .insert({
        email: email.toLowerCase(),
        company_name: company_name || null,
        vertical: validatedVertical,
        assessments_run: assessmentsRun,
        avg_ers_score: avgErsScore,
        created_at: timestamp,
        last_active: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      return NextResponse.json(
        { success: false, error: { message: 'Failed to create lead', code: 'INTERNAL_ERROR' } },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Check and send drip emails (async, don't block response)
    checkAndSendDripEmails(newLead.id).catch(err => {
      console.error('[Capture Lead] Error sending drip emails:', err);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          lead_id: newLead.id,
          email: newLead.email,
          company_name: newLead.company_name,
          vertical: newLead.vertical,
          assessments_run: newLead.assessments_run,
          avg_ers_score: newLead.avg_ers_score,
          created_at: newLead.created_at,
          last_active: newLead.last_active,
          is_new: true,
        },
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Capture lead error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET /api/v1/admin/sandbox-leads
 *
 * Admin endpoint to retrieve all sandbox leads.
 * Returns leads sorted by recency with assessment stats.
 * Requires admin authentication via X-Admin-Key header or ?key= param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin key - required in production, fallback only in development
const ADMIN_KEY = process.env.ADMIN_API_KEY || (process.env.NODE_ENV === 'development' ? 'paceful_admin_dev' : '');

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LeadFilters {
  vertical?: string;
  status?: string;
  min_assessments?: number;
  since?: string;
  limit?: number;
  offset?: number;
}

export async function GET(request: NextRequest) {
  // Check admin key
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('key') || request.headers.get('X-Admin-Key');

  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  try {
    // Parse filters from query params
    const filters: LeadFilters = {
      vertical: searchParams.get('vertical') || undefined,
      status: searchParams.get('status') || undefined,
      min_assessments: searchParams.get('min_assessments')
        ? parseInt(searchParams.get('min_assessments')!, 10)
        : undefined,
      since: searchParams.get('since') || undefined,
      limit: searchParams.get('limit')
        ? Math.min(parseInt(searchParams.get('limit')!, 10), 500)
        : 100,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
    };

    // Build query
    let query = supabaseAdmin
      .from('sandbox_leads')
      .select('*', { count: 'exact' })
      .order('last_active', { ascending: false });

    // Apply filters
    if (filters.vertical) {
      query = query.eq('vertical', filters.vertical);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.min_assessments) {
      query = query.gte('assessments_run', filters.min_assessments);
    }
    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    // Apply pagination
    query = query.range(filters.offset!, filters.offset! + filters.limit! - 1);

    const { data: leads, error: leadsError, count } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { success: false, error: { message: 'Failed to fetch leads', code: 'INTERNAL_ERROR' } },
        { status: 500 }
      );
    }

    // Get aggregate stats
    const { data: allLeadsForStats } = await supabaseAdmin
      .from('sandbox_leads')
      .select('vertical, status, assessments_run, avg_ers_score');

    const verticalCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalAssessments = 0;
    let totalWithScore = 0;
    let scoreSum = 0;

    allLeadsForStats?.forEach((lead) => {
      if (lead.vertical) {
        verticalCounts[lead.vertical] = (verticalCounts[lead.vertical] || 0) + 1;
      }
      if (lead.status) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      }
      totalAssessments += lead.assessments_run || 0;
      if (lead.avg_ers_score !== null) {
        totalWithScore++;
        scoreSum += lead.avg_ers_score;
      }
    });

    const stats = {
      total_leads: allLeadsForStats?.length || 0,
      by_vertical: verticalCounts,
      by_status: statusCounts,
      total_assessments: totalAssessments,
      avg_ers_score: totalWithScore > 0 ? Math.round((scoreSum / totalWithScore) * 100) / 100 : null,
    };

    // Format response
    const formattedLeads = leads?.map((lead) => ({
      id: lead.id,
      email: lead.email,
      company_name: lead.company_name,
      vertical: lead.vertical,
      status: lead.status,
      assessments_run: lead.assessments_run,
      avg_ers_score: lead.avg_ers_score,
      created_at: lead.created_at,
      last_active: lead.last_active,
      notes: lead.notes,
      source: lead.source,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leads: formattedLeads,
        pagination: {
          total: count || 0,
          limit: filters.limit,
          offset: filters.offset,
          has_more: (filters.offset! + (leads?.length || 0)) < (count || 0),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('Admin sandbox leads error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/admin/sandbox-leads
 *
 * Update a lead's status or notes.
 */
export async function PATCH(request: NextRequest) {
  // Check admin key
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('key') || request.headers.get('X-Admin-Key');

  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { lead_id, status, notes } = body;

    if (!lead_id) {
      return NextResponse.json(
        { success: false, error: { message: 'lead_id is required', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'No updates provided', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('sandbox_leads')
      .update(updates)
      .eq('id', lead_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return NextResponse.json(
        { success: false, error: { message: 'Failed to update lead', code: 'INTERNAL_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLead.id,
        email: updatedLead.email,
        status: updatedLead.status,
        notes: updatedLead.notes,
        updated: true,
      },
    });
  } catch (error) {
    console.error('Admin update lead error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type MemoryType = 'fact' | 'pattern' | 'preference' | 'milestone' | 'concern';

export interface Memory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface NewMemory {
  type: MemoryType;
  content: string;
  importance: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_MEMORIES_PER_USER = 50;

// ============================================================================
// Memory Retrieval
// ============================================================================

/**
 * Fetch memories for a user, ordered by importance and recency
 */
export async function getMemories(
  userId: string,
  supabase: SupabaseClient,
  limit = 20
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('ai_memory')
    .select('*')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all memories for a user (for settings view)
 */
export async function getAllMemories(
  userId: string,
  supabase: SupabaseClient
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('ai_memory')
    .select('*')
    .eq('user_id', userId)
    .order('memory_type')
    .order('importance', { ascending: false });

  if (error) {
    console.error('Error fetching all memories:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Memory Storage
// ============================================================================

/**
 * Add a new memory, pruning old low-importance ones if over limit
 */
export async function addMemory(
  userId: string,
  supabase: SupabaseClient,
  memory: NewMemory
): Promise<void> {
  // Check current memory count
  const { count, error: countError } = await supabase
    .from('ai_memory')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    console.error('Error counting memories:', countError);
    return;
  }

  // If at or over limit, delete lowest importance oldest memories
  if (count && count >= MAX_MEMORIES_PER_USER) {
    const memoriesToDelete = count - MAX_MEMORIES_PER_USER + 1;

    // Get IDs of memories to delete (lowest importance, oldest first)
    const { data: oldMemories } = await supabase
      .from('ai_memory')
      .select('id')
      .eq('user_id', userId)
      .order('importance', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(memoriesToDelete);

    if (oldMemories && oldMemories.length > 0) {
      const idsToDelete = oldMemories.map(m => m.id);
      await supabase
        .from('ai_memory')
        .delete()
        .in('id', idsToDelete);
    }
  }

  // Insert new memory
  const { error: insertError } = await supabase
    .from('ai_memory')
    .insert({
      user_id: userId,
      memory_type: memory.type,
      content: memory.content,
      importance: memory.importance,
    });

  if (insertError) {
    console.error('Error inserting memory:', insertError);
  }
}

/**
 * Add multiple memories at once
 */
export async function addMemories(
  userId: string,
  supabase: SupabaseClient,
  memories: NewMemory[]
): Promise<void> {
  for (const memory of memories) {
    await addMemory(userId, supabase, memory);
  }
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(
  userId: string,
  supabase: SupabaseClient,
  memoryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_memory')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting memory:', error);
    return false;
  }

  return true;
}

/**
 * Delete all memories for a user
 */
export async function clearAllMemories(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_memory')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing memories:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Memory Formatting
// ============================================================================

/**
 * Format memories into natural language for the system prompt
 */
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (!memories || memories.length === 0) {
    return '';
  }

  const grouped: Record<MemoryType, string[]> = {
    fact: [],
    pattern: [],
    preference: [],
    milestone: [],
    concern: [],
  };

  // Group memories by type
  for (const memory of memories) {
    grouped[memory.memory_type]?.push(memory.content);
  }

  const lines: string[] = [];

  // Facts about the person
  if (grouped.fact.length > 0) {
    grouped.fact.forEach(f => lines.push(`- ${f}`));
  }

  // Patterns observed
  if (grouped.pattern.length > 0) {
    grouped.pattern.forEach(p => lines.push(`- ${p}`));
  }

  // Milestones reached
  if (grouped.milestone.length > 0) {
    grouped.milestone.forEach(m => lines.push(`- ${m}`));
  }

  // Communication preferences
  if (grouped.preference.length > 0) {
    grouped.preference.forEach(p => lines.push(`- ${p}`));
  }

  // Concerns to be aware of
  if (grouped.concern.length > 0) {
    grouped.concern.forEach(c => lines.push(`- Be mindful: ${c}`));
  }

  if (lines.length === 0) {
    return '';
  }

  return `What you know about this person:\n${lines.join('\n')}`;
}

/**
 * Get the most recent significant memory for greeting context
 */
export function getGreetingContext(memories: Memory[]): string | null {
  if (!memories || memories.length === 0) {
    return null;
  }

  // Prioritize recent milestones or high-importance patterns
  const milestones = memories.filter(m => m.memory_type === 'milestone');
  if (milestones.length > 0) {
    // Return most recent milestone
    return milestones[0].content;
  }

  // Fall back to recent high-importance memory
  const highImportance = memories.filter(m => m.importance >= 7);
  if (highImportance.length > 0) {
    return highImportance[0].content;
  }

  return null;
}

/**
 * Check if user has memories (is returning user)
 */
export function hasMemories(memories: Memory[]): boolean {
  return memories && memories.length > 0;
}

// ============================================================================
// Memory Type Labels
// ============================================================================

export function getMemoryTypeLabel(type: MemoryType): string {
  const labels: Record<MemoryType, string> = {
    fact: 'Personal fact',
    pattern: 'Pattern',
    preference: 'Preference',
    milestone: 'Milestone',
    concern: 'Sensitive',
  };
  return labels[type] || type;
}

export function getMemoryTypeColor(type: MemoryType): { bg: string; text: string } {
  const colors: Record<MemoryType, { bg: string; text: string }> = {
    fact: { bg: 'rgba(94,141,176,0.15)', text: '#5E8DB0' },
    pattern: { bg: 'rgba(126,113,181,0.15)', text: '#7E71B5' },
    preference: { bg: 'rgba(212,151,59,0.15)', text: '#D4973B' },
    milestone: { bg: 'rgba(91,138,114,0.15)', text: '#5B8A72' },
    concern: { bg: 'rgba(184,107,100,0.15)', text: '#B86B64' },
  };
  return colors[type] || { bg: 'rgba(0,0,0,0.1)', text: '#666' };
}

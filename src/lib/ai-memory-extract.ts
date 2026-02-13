import Anthropic from '@anthropic-ai/sdk';
import { Memory, NewMemory, MemoryType } from './ai-memory';

// ============================================================================
// Memory Extraction
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You analyze conversations to extract memorable information about the user. Given a chat exchange and existing memories, identify NEW facts, patterns, preferences, milestones, or concerns worth remembering.

Respond with ONLY a JSON array. Each item: { "type": "fact|pattern|preference|milestone|concern", "content": "brief statement", "importance": 1-10 }

Memory types:
- fact: something the user shared about themselves (has kids, works nights, ex's name)
- pattern: observed behavioral pattern (tends to feel worse on Sundays, journaling helps when anxious)
- preference: communication preference (prefers direct talk, doesn't like being told to breathe)
- milestone: significant moments (first good day, moved out, started dating again)
- concern: things to be careful about (triggered by certain topics, history of anxiety)

Rules:
- Only extract genuinely new information not already in existing memories
- Importance 8-10: critical personal facts, safety concerns, major milestones
- Importance 5-7: preferences, patterns, relationships
- Importance 1-4: minor details, passing mentions
- Return empty array [] if nothing new worth remembering
- Keep each content statement under 100 characters
- Never store harmful or identifying information like addresses, passwords, phone numbers, full names of others
- Focus on emotionally relevant information that helps provide better support`;

/**
 * Extract new memories from a chat exchange
 * This should be called fire-and-forget after each chat
 */
export async function extractMemories(
  userMessage: string,
  aiResponse: string,
  existingMemories: Memory[]
): Promise<NewMemory[]> {
  try {
    // Skip extraction for very short messages
    if (userMessage.trim().length < 20) {
      return [];
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Format existing memories for context
    const existingContext = existingMemories.length > 0
      ? `Existing memories (do not duplicate these):\n${existingMemories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`
      : 'No existing memories yet.';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${existingContext}

Chat exchange to analyze:
User: "${userMessage}"
AI: "${aiResponse}"

Extract any new memories as a JSON array:`,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    // Parse JSON response
    const jsonText = textContent.text.trim();

    // Handle empty array case
    if (jsonText === '[]') {
      return [];
    }

    // Try to extract JSON from response (in case there's extra text)
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and filter memories
    const validMemories: NewMemory[] = [];
    const validTypes: MemoryType[] = ['fact', 'pattern', 'preference', 'milestone', 'concern'];

    for (const item of parsed) {
      // Validate structure
      if (
        typeof item !== 'object' ||
        !item.type ||
        !item.content ||
        typeof item.importance !== 'number'
      ) {
        continue;
      }

      // Validate type
      if (!validTypes.includes(item.type as MemoryType)) {
        continue;
      }

      // Validate content length
      if (item.content.length > 150 || item.content.length < 5) {
        continue;
      }

      // Validate importance range
      const importance = Math.max(1, Math.min(10, Math.round(item.importance)));

      // Filter out potentially harmful content
      if (containsSensitiveInfo(item.content)) {
        continue;
      }

      // Check for duplicates with existing memories
      const isDuplicate = existingMemories.some(
        m => m.content.toLowerCase() === item.content.toLowerCase() ||
             similarContent(m.content, item.content)
      );

      if (isDuplicate) {
        continue;
      }

      validMemories.push({
        type: item.type as MemoryType,
        content: item.content.trim(),
        importance,
      });
    }

    return validMemories;
  } catch (error) {
    console.error('Error extracting memories:', error);
    return [];
  }
}

/**
 * Check if content contains sensitive information that shouldn't be stored
 */
function containsSensitiveInfo(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Phone number patterns
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(content)) {
    return true;
  }

  // Email patterns
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
    return true;
  }

  // Address patterns (street numbers)
  if (/\d+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard)/i.test(content)) {
    return true;
  }

  // Financial info
  if (/\b(credit card|bank account|social security|ssn|password|pin)\b/i.test(content)) {
    return true;
  }

  // Very specific identifying info
  if (/\b(full name is|last name is|surname is)\b/i.test(content)) {
    return true;
  }

  return false;
}

/**
 * Check if two memory contents are similar enough to be duplicates
 */
function similarContent(existing: string, newContent: string): boolean {
  const e = existing.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const n = newContent.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // Check if one contains the other
  if (e.includes(n) || n.includes(e)) {
    return true;
  }

  // Simple word overlap check
  const eWords = new Set(e.split(/\s+/).filter(w => w.length > 3));
  const nWords = new Set(n.split(/\s+/).filter(w => w.length > 3));

  let overlap = 0;
  for (const word of nWords) {
    if (eWords.has(word)) overlap++;
  }

  // If more than 70% of significant words overlap, consider it similar
  if (nWords.size > 0 && overlap / nWords.size > 0.7) {
    return true;
  }

  return false;
}

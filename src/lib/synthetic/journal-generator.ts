// ============================================================================
// Synthetic Journal Entry Generator
// Uses Claude API to generate realistic journal entries
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { SyntheticUserProfile } from './user-archetypes';
import { SyntheticMoodEntry } from './mood-generator';

export interface SyntheticJournalEntry {
  content: string;
  createdAt: Date;
  title: string | null;
  dayNumber: number;
}

// Seeded random for picking journal days
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function getJournalFrequency(engagementLevel: SyntheticUserProfile['engagementLevel']): number {
  switch (engagementLevel) {
    case 'daily': return 4; // 4 per week
    case 'regular': return 2.5;
    case 'sporadic': return 1.5;
    case 'binge_ghost': return 3; // High when active
    default: return 2;
  }
}

function selectJournalDays(
  profile: SyntheticUserProfile,
  moodTimeline: SyntheticMoodEntry[]
): number[] {
  const seed = parseInt(profile.syntheticId.replace('syn_', '')) * 54321;
  const rng = new SeededRandom(seed);

  const frequency = getJournalFrequency(profile.engagementLevel);
  const weeks = Math.ceil(profile.journeyLengthDays / 7);
  const targetEntries = Math.round(weeks * frequency);

  // Get days that have mood entries
  const availableDays = moodTimeline.map((entry, idx) => {
    const startDate = new Date(moodTimeline[0].loggedAt);
    const entryDate = new Date(entry.loggedAt);
    const dayNum = Math.floor((entryDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    return { dayNum, moodScore: entry.moodScore };
  });

  // Prioritize days with extreme moods (more likely to journal)
  const scoredDays = availableDays.map(d => ({
    ...d,
    score: Math.abs(d.moodScore - 3) + rng.next() * 2 // Extreme moods + randomness
  }));

  scoredDays.sort((a, b) => b.score - a.score);

  // Pick top days, spread somewhat evenly
  const selectedDays: number[] = [];
  const minGap = Math.floor(profile.journeyLengthDays / targetEntries / 2);

  for (const day of scoredDays) {
    if (selectedDays.length >= targetEntries) break;

    // Check if too close to already selected days
    const tooClose = selectedDays.some(d => Math.abs(d - day.dayNum) < minGap);
    if (!tooClose) {
      selectedDays.push(day.dayNum);
    }
  }

  return selectedDays.sort((a, b) => a - b);
}

function getRecoveryPhaseContext(
  dayNumber: number,
  totalDays: number,
  profile: SyntheticUserProfile
): string {
  const progress = dayNumber / totalDays;

  // Support seekers have different context
  if (profile.userType === 'support_seeker') {
    if (progress < 0.3) return 'early in their emotional journey, still processing what happened';
    if (progress < 0.7) return 'in the middle of working through difficult feelings';
    return 'starting to see some progress and clarity';
  }

  // Ready to match users
  if (profile.userType === 'ready_to_match') {
    if (progress < 0.3) return 'processing the end of the relationship but feeling determined';
    if (progress < 0.6) return 'making good progress, starting to think about the future';
    return 'feeling ready to move forward, curious about meeting someone new';
  }

  // Already matched users
  if (profile.userType === 'already_matched') {
    if (progress < 0.3) return 'working through the breakup, focused on healing';
    if (progress < 0.6) return 'feeling stronger, open to new connections';
    return 'has started connecting with someone new, cautiously optimistic';
  }

  // Classic recovery phases
  if (progress < 0.15) return 'in the acute phase, everything feels raw and overwhelming';
  if (progress < 0.35) return 'past the initial shock but still struggling daily';
  if (progress < 0.55) return 'starting to have occasional better days but still grieving';
  if (progress < 0.75) return 'noticing real progress, more good days than bad';
  return 'in late recovery, building a new normal';
}

function buildJournalPrompt(
  profile: SyntheticUserProfile,
  entries: { dayNumber: number; moodScore: number }[]
): string {
  const genderPronoun = profile.gender === 'female' ? 'she/her' :
                        profile.gender === 'male' ? 'he/him' : 'they/them';

  let contextDetails = '';

  if (profile.userType === 'support_seeker') {
    const contextMap: Record<string, string> = {
      grief: 'dealing with a significant loss (not a romantic breakup)',
      life_transition: 'going through a major life transition (career change, move, etc.)',
      general_wellness: 'working on general emotional wellness and self-improvement',
      breakup: 'going through emotional difficulty',
      divorce: 'going through emotional difficulty',
    };
    contextDetails = contextMap[profile.recoveryContext] || 'going through emotional difficulty';
  } else {
    contextDetails = `ended a ${Math.round(profile.relationshipLengthMonths / 12 * 10) / 10} year relationship. `;
    contextDetails += `They were ${profile.breakupType.replace(/_/g, ' ')}. `;

    if (profile.complicatingFactors[0] !== 'none') {
      contextDetails += `Complicating factors: ${profile.complicatingFactors.join(', ')}. `;
    }
  }

  const attachmentContext = {
    anxious: 'They tend to worry about abandonment and seek reassurance.',
    avoidant: 'They tend to suppress emotions and value independence.',
    secure: 'They have a relatively healthy approach to emotions.',
    disorganized: 'They have conflicting feelings about closeness and independence.',
  };

  let prompt = `You are generating synthetic journal entries for a wellness app testing dataset.

Write ${entries.length} journal entries from the perspective of ${profile.firstName}, a ${profile.age} year old ${profile.gender} (${genderPronoun}).

Context:
- ${contextDetails}
- ${attachmentContext[profile.attachmentStyle]}
- Recovery pattern: ${profile.recoverySpeed}

Generate entries for these specific days and moods:
${entries.map(e => {
  const phase = getRecoveryPhaseContext(e.dayNumber, profile.journeyLengthDays, profile);
  return `- Day ${e.dayNumber}: Mood ${e.moodScore}/5 (${phase})`;
}).join('\n')}

Guidelines:
- Each entry should be 50-200 words
- Vary the style: some are short vents, some are reflective, some are hopeful
- Be emotionally authentic and specific
- Include sensory details and specific situations
- Low mood entries might mention triggers (social media, reminders, loneliness)
- Higher mood entries might mention progress, friends, new activities
- NEVER mention being synthetic, an AI, or this being an exercise
- NEVER use the exact phrases "I'm doing okay" or "one day at a time"
- Match the mood score - 1-2 is raw pain, 3 is struggling but coping, 4-5 is genuine progress
${profile.userType === 'ready_to_match' ? '- Later entries can mention feeling ready to meet someone new' : ''}
${profile.userType === 'already_matched' ? '- Later entries should reference cautiously connecting with a new person' : ''}

Respond with JSON array:
[
  {"day": 5, "title": "Optional Title or null", "content": "Entry content here..."},
  ...
]

Only output valid JSON, no other text.`;

  return prompt;
}

export async function generateJournalEntries(
  profile: SyntheticUserProfile,
  moodTimeline: SyntheticMoodEntry[],
  anthropicClient?: Anthropic
): Promise<SyntheticJournalEntry[]> {
  // Create client if not provided
  const client = anthropicClient || new Anthropic();

  // Select which days get journal entries
  const journalDays = selectJournalDays(profile, moodTimeline);

  if (journalDays.length === 0) {
    return [];
  }

  // Get start date
  const startDate = new Date(moodTimeline[0].loggedAt);
  startDate.setHours(0, 0, 0, 0);

  // Map days to mood scores
  const moodByDay = new Map<number, number>();
  for (const entry of moodTimeline) {
    const entryDate = new Date(entry.loggedAt);
    const dayNum = Math.floor((entryDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    moodByDay.set(dayNum, entry.moodScore);
  }

  const entries: SyntheticJournalEntry[] = [];

  // Batch journal generation (5 entries per API call)
  const batchSize = 5;
  for (let i = 0; i < journalDays.length; i += batchSize) {
    const batchDays = journalDays.slice(i, i + batchSize);
    const batchEntries = batchDays.map(day => ({
      dayNumber: day,
      moodScore: moodByDay.get(day) || 3,
    }));

    const prompt = buildJournalPrompt(profile, batchEntries);

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Parse JSON response
      const parsed = JSON.parse(responseText);

      for (const item of parsed) {
        const dayNum = item.day;
        const entryDate = new Date(startDate);
        entryDate.setDate(entryDate.getDate() + dayNum);
        // Add some time variation
        entryDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

        entries.push({
          content: item.content,
          createdAt: entryDate,
          title: item.title || null,
          dayNumber: dayNum,
        });
      }
    } catch (error) {
      console.error(`Error generating journal batch for ${profile.syntheticId}:`, error);
      // Continue with other batches
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < journalDays.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Lightweight version that generates placeholder entries without API calls
export function generatePlaceholderJournalEntries(
  profile: SyntheticUserProfile,
  moodTimeline: SyntheticMoodEntry[]
): SyntheticJournalEntry[] {
  const journalDays = selectJournalDays(profile, moodTimeline);
  const startDate = new Date(moodTimeline[0]?.loggedAt || new Date());
  startDate.setHours(0, 0, 0, 0);

  const moodByDay = new Map<number, number>();
  for (const entry of moodTimeline) {
    const entryDate = new Date(entry.loggedAt);
    const dayNum = Math.floor((entryDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    moodByDay.set(dayNum, entry.moodScore);
  }

  const placeholders: Record<number, string[]> = {
    1: ['Everything hurts.', 'Can\'t stop thinking about it.', 'Why did this happen?'],
    2: ['Another hard day.', 'Trying to get through.', 'Missing what we had.'],
    3: ['Mixed feelings today.', 'Some moments were okay.', 'Processing.'],
    4: ['Feeling a bit better.', 'Had a good moment today.', 'Progress.'],
    5: ['Good day today.', 'Feeling hopeful.', 'Starting to see the light.'],
  };

  return journalDays.map(dayNum => {
    const mood = moodByDay.get(dayNum) || 3;
    const options = placeholders[mood] || placeholders[3];
    const content = options[Math.floor(Math.random() * options.length)];

    const entryDate = new Date(startDate);
    entryDate.setDate(entryDate.getDate() + dayNum);
    entryDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

    return {
      content,
      createdAt: entryDate,
      title: null,
      dayNumber: dayNum,
    };
  });
}

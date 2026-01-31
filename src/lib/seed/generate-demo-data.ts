/**
 * Demo Data Generator for Paceful
 *
 * Generates 50 realistic test users with mood data matching their ERS stage.
 * Run via API endpoint or directly with ts-node.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// User distribution
const USER_DISTRIBUTION = {
  healing: 20,    // 0-49 ERS
  rebuilding: 20, // 50-74 ERS
  ready: 10,      // 75-100 ERS
};

// Mood patterns by stage
const MOOD_PATTERNS = {
  healing: {
    minMood: 2,
    maxMood: 6,
    avgMood: 4,
    variance: 2.5,    // High variance = volatile
    trendDirection: 0.02, // Slight upward trend
  },
  rebuilding: {
    minMood: 4,
    maxMood: 8,
    avgMood: 6,
    variance: 1.5,    // Medium variance = stabilizing
    trendDirection: 0.05, // Moderate upward trend
  },
  ready: {
    minMood: 6,
    maxMood: 10,
    avgMood: 7.5,
    variance: 0.8,    // Low variance = stable
    trendDirection: 0.02, // Maintaining
  },
};

// Emotion sets by mood level
const EMOTIONS_BY_MOOD = {
  low: ['sad', 'anxious', 'lonely', 'frustrated', 'angry', 'hopeless'],
  medium: ['anxious', 'hopeful', 'confused', 'calm', 'grateful', 'peaceful'],
  high: ['happy', 'hopeful', 'grateful', 'peaceful', 'calm', 'excited'],
};

// Names for generating realistic profiles
const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael',
  'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery',
  'Sebastian', 'Ella', 'David', 'Scarlett', 'Joseph', 'Grace', 'Samuel',
  'Chloe', 'Owen', 'Victoria', 'Ryan', 'Riley', 'Jack', 'Aria', 'Luke',
  'Lily', 'Gabriel', 'Aurora', 'Anthony', 'Zoey', 'Dylan'
];

const GENDERS = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
const COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'NZ'];

// ============================================================================
// Helper Functions
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateDateOfBirth(): string {
  // Ages 22-45
  const age = randomInt(22, 45);
  const year = new Date().getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateBreakupDate(stage: 'healing' | 'rebuilding' | 'ready'): string {
  // Healing: 15-60 days ago (recent)
  // Rebuilding: 45-120 days ago
  // Ready: 90-180 days ago
  const ranges = {
    healing: { min: 15, max: 60 },
    rebuilding: { min: 45, max: 120 },
    ready: { min: 90, max: 180 },
  };

  const daysAgo = randomInt(ranges[stage].min, ranges[stage].max);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function generateMoodValue(
  stage: 'healing' | 'rebuilding' | 'ready',
  dayIndex: number,
  totalDays: number
): number {
  const pattern = MOOD_PATTERNS[stage];

  // Base mood with trend
  const trendBonus = dayIndex * pattern.trendDirection;
  const baseMood = pattern.avgMood + trendBonus;

  // Add variance (random noise)
  const noise = (Math.random() - 0.5) * pattern.variance * 2;
  let mood = baseMood + noise;

  // Clamp to pattern range
  mood = Math.max(pattern.minMood, Math.min(pattern.maxMood, mood));

  // Round to integer
  return Math.round(mood);
}

function getEmotionsForMood(moodValue: number): string[] {
  let emotionSet: string[];
  if (moodValue <= 4) {
    emotionSet = EMOTIONS_BY_MOOD.low;
  } else if (moodValue <= 7) {
    emotionSet = EMOTIONS_BY_MOOD.medium;
  } else {
    emotionSet = EMOTIONS_BY_MOOD.high;
  }

  return randomChoices(emotionSet, randomInt(1, 3));
}

function getMoodLabel(moodValue: number): string {
  if (moodValue <= 3) return 'low';
  if (moodValue <= 6) return 'moderate';
  return 'high';
}

// ============================================================================
// Data Generation Functions
// ============================================================================

interface GeneratedUser {
  id: string;
  email: string;
  firstName: string;
  stage: 'healing' | 'rebuilding' | 'ready';
}

async function createUser(
  index: number,
  stage: 'healing' | 'rebuilding' | 'ready'
): Promise<GeneratedUser> {
  const userId = generateUUID();
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const email = `demo_${stage}_${index}@paceful.test`;

  // Create profile
  const profile = {
    user_id: userId,
    first_name: firstName,
    date_of_birth: generateDateOfBirth(),
    gender: randomChoice(GENDERS),
    country: randomChoice(COUNTRIES),
    relationship_ended_at: generateBreakupDate(stage),
    relationship_duration_months: randomInt(6, 60),
    breakup_initiated_by: randomChoice(['me', 'them', 'mutual']),
    ers_tracking_consent: true,
    research_consent: Math.random() > 0.3, // 70% consent to research
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').insert(profile);

  if (error) {
    console.error(`Failed to create profile for ${email}:`, error.message);
  }

  return { id: userId, email, firstName, stage };
}

async function generateMoodEntries(user: GeneratedUser): Promise<number> {
  const pattern = MOOD_PATTERNS[user.stage];

  // Generate 2-4 weeks of data
  const weeksOfData = randomInt(2, 4);
  const totalDays = weeksOfData * 7;

  const entries: Array<{
    user_id: string;
    mood_value: number;
    mood_label: string;
    emotions: string[];
    time_of_day: string;
    logged_at: string;
    created_at: string;
  }> = [];

  for (let day = 0; day < totalDays; day++) {
    // 3-5 entries per day
    const entriesPerDay = randomInt(3, 5);
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - day));

    for (let entry = 0; entry < entriesPerDay; entry++) {
      const moodValue = generateMoodValue(user.stage, day, totalDays);
      const emotions = getEmotionsForMood(moodValue);

      // Distribute entries throughout the day
      const hour = 7 + Math.floor((entry / entriesPerDay) * 14); // 7am - 9pm
      const minute = randomInt(0, 59);
      date.setHours(hour, minute, 0, 0);

      const timeOfDay =
        hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      entries.push({
        user_id: user.id,
        mood_value: moodValue,
        mood_label: getMoodLabel(moodValue),
        emotions,
        time_of_day: timeOfDay,
        logged_at: date.toISOString(),
        created_at: date.toISOString(),
      });
    }
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const { error } = await supabase.from('mood_entries').insert(batch);
    if (error) {
      console.error(`Failed to insert mood entries for ${user.email}:`, error.message);
    }
  }

  return entries.length;
}

async function calculateERSForUser(userId: string): Promise<{
  score: number;
  stage: string;
} | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ers/recalculate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }
    );

    const data = await response.json();
    if (data.success) {
      return { score: data.ersScore, stage: data.ersStage };
    }
    return null;
  } catch (error) {
    console.error('ERS calculation failed:', error);
    return null;
  }
}

// ============================================================================
// Main Generator
// ============================================================================

export interface GenerationResult {
  success: boolean;
  usersCreated: number;
  moodEntriesCreated: number;
  ersCalculated: number;
  stageDistribution: {
    healing: number;
    rebuilding: number;
    ready: number;
  };
  errors: string[];
  duration: number;
}

export async function generateDemoData(): Promise<GenerationResult> {
  const startTime = Date.now();
  const result: GenerationResult = {
    success: false,
    usersCreated: 0,
    moodEntriesCreated: 0,
    ersCalculated: 0,
    stageDistribution: { healing: 0, rebuilding: 0, ready: 0 },
    errors: [],
    duration: 0,
  };

  console.log('Starting demo data generation...');
  console.log(`Target: ${USER_DISTRIBUTION.healing} Healing, ${USER_DISTRIBUTION.rebuilding} Rebuilding, ${USER_DISTRIBUTION.ready} Ready`);

  const users: GeneratedUser[] = [];
  let userIndex = 0;

  // Create users for each stage
  for (const [stage, count] of Object.entries(USER_DISTRIBUTION) as [
    'healing' | 'rebuilding' | 'ready',
    number
  ][]) {
    console.log(`\nCreating ${count} ${stage} users...`);

    for (let i = 0; i < count; i++) {
      try {
        const user = await createUser(userIndex++, stage);
        users.push(user);
        result.usersCreated++;
        process.stdout.write(`  Created user ${result.usersCreated}/50\r`);
      } catch (error) {
        result.errors.push(`Failed to create user ${userIndex}: ${error}`);
      }
    }
  }

  console.log(`\n\nCreated ${result.usersCreated} users`);

  // Generate mood entries for each user
  console.log('\nGenerating mood entries...');
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const entriesCount = await generateMoodEntries(user);
      result.moodEntriesCreated += entriesCount;
      process.stdout.write(`  Processed ${i + 1}/${users.length} users (${result.moodEntriesCreated} entries)\r`);
    } catch (error) {
      result.errors.push(`Failed to generate moods for ${user.email}: ${error}`);
    }
  }

  console.log(`\n\nGenerated ${result.moodEntriesCreated} mood entries`);

  // Calculate ERS for each user
  console.log('\nCalculating ERS scores...');
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const ers = await calculateERSForUser(user.id);
      if (ers) {
        result.ersCalculated++;
        result.stageDistribution[ers.stage as keyof typeof result.stageDistribution]++;
      }
      process.stdout.write(`  Calculated ${i + 1}/${users.length} ERS scores\r`);
    } catch (error) {
      result.errors.push(`Failed to calculate ERS for ${user.email}: ${error}`);
    }
  }

  console.log(`\n\nCalculated ${result.ersCalculated} ERS scores`);

  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;

  console.log('\n=== Generation Complete ===');
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Users: ${result.usersCreated}`);
  console.log(`Mood Entries: ${result.moodEntriesCreated}`);
  console.log(`ERS Scores: ${result.ersCalculated}`);
  console.log(`Stage Distribution:`, result.stageDistribution);
  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`);
  }

  return result;
}

// ============================================================================
// Cleanup Function
// ============================================================================

export async function cleanupDemoData(): Promise<{ deleted: number }> {
  console.log('Cleaning up demo data...');

  // Delete demo mood entries
  const { error: moodError } = await supabase
    .from('mood_entries')
    .delete()
    .like('user_id', '%-%-%-%-%'); // UUID pattern

  if (moodError) {
    console.error('Failed to delete mood entries:', moodError);
  }

  // Delete demo ERS scores
  const { error: ersError } = await supabase
    .from('ers_scores')
    .delete()
    .like('user_id', '%-%-%-%-%');

  if (ersError) {
    console.error('Failed to delete ERS scores:', ersError);
  }

  // Delete demo profiles (only test emails)
  const { data: deleted, error: profileError } = await supabase
    .from('profiles')
    .delete()
    .like('user_id', '%-%-%-%-%')
    .select('user_id');

  if (profileError) {
    console.error('Failed to delete profiles:', profileError);
  }

  const count = deleted?.length || 0;
  console.log(`Deleted ${count} demo profiles and associated data`);

  return { deleted: count };
}

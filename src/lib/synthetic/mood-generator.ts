// ============================================================================
// Synthetic Mood Timeline Generator
// Generates realistic daily mood data based on user archetype
// ============================================================================

import { SyntheticUserProfile } from './user-archetypes';

export interface SyntheticMoodEntry {
  moodScore: number; // 1-5
  loggedAt: Date;
  emotions: string[];
  notes: string | null;
}

// Seeded random for reproducibility within a user's timeline
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

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  pickMultiple<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }

  gaussian(mean: number, stdDev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z;
  }
}

// Emotion tags by mood level
const EMOTIONS_BY_MOOD: Record<number, string[]> = {
  1: ['devastated', 'heartbroken', 'hopeless', 'numb', 'empty', 'lost', 'rejected', 'abandoned'],
  2: ['sad', 'anxious', 'lonely', 'confused', 'hurt', 'angry', 'frustrated', 'exhausted'],
  3: ['okay', 'uncertain', 'reflective', 'tired', 'neutral', 'processing', 'pensive'],
  4: ['hopeful', 'calm', 'stable', 'grateful', 'relieved', 'accepting', 'growing'],
  5: ['happy', 'optimistic', 'peaceful', 'confident', 'free', 'excited', 'content', 'strong'],
};

// Trigger notes by context
const TRIGGER_NOTES = {
  negative: [
    'Saw ex on social media',
    'Mutual friend mentioned them',
    'Song came on that reminded me of us',
    'Found old photos',
    'Dreamed about them',
    'Lonely weekend',
    'Their birthday coming up',
    'Drove past our place',
    'Couldn\'t sleep',
    'Missing the routine',
    'Feeling isolated',
    'Work stress making everything harder',
  ],
  positive: [
    'Good time with friends',
    'Productive day',
    'Exercise helped',
    'Therapy session',
    'Journaling breakthrough',
    'Slept well',
    'Nice walk outside',
    'Reconnected with old friend',
    'Tried something new',
    'Feeling stronger',
    'Moment of clarity',
    'Grateful for support system',
  ],
  neutral: [
    'Just another day',
    'Taking it one step at a time',
    'Keeping busy',
    'Going through the motions',
    'Trying to stay present',
    null,
    null,
    null,
  ],
};

export function generateMoodTimeline(
  profile: SyntheticUserProfile,
  startDate: Date = new Date(Date.now() - profile.journeyLengthDays * 24 * 60 * 60 * 1000)
): SyntheticMoodEntry[] {
  // Create seed from synthetic ID for reproducibility
  const seed = parseInt(profile.syntheticId.replace('syn_', '')) * 12345;
  const rng = new SeededRandom(seed);

  const entries: SyntheticMoodEntry[] = [];
  const totalDays = profile.journeyLengthDays;

  // Determine logging frequency based on engagement level
  const loggingProbability = getLoggingProbability(profile.engagementLevel);

  // Generate base mood curve
  const moodCurve = generateMoodCurve(profile, totalDays, rng);

  // Track binge/ghost pattern
  let inBingePhase = true;
  let phaseCounter = 0;
  const bingeLength = rng.nextInt(10, 14);
  const ghostLength = rng.nextInt(5, 10);

  for (let day = 0; day < totalDays; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // Handle binge_ghost pattern
    if (profile.engagementLevel === 'binge_ghost') {
      phaseCounter++;
      if (inBingePhase && phaseCounter > bingeLength) {
        inBingePhase = false;
        phaseCounter = 0;
      } else if (!inBingePhase && phaseCounter > ghostLength) {
        inBingePhase = true;
        phaseCounter = 0;
      }

      if (!inBingePhase) continue; // Skip logging during ghost phase
    }

    // Determine if user logs this day
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let logChance = loggingProbability;

    // Slight weekend dip in logging for some engagement types
    if (isWeekend && profile.engagementLevel !== 'daily') {
      logChance *= 0.85;
    }

    if (rng.next() > logChance) continue;

    // Get base mood from curve
    let baseMood = moodCurve[day];

    // Apply attachment style modifiers
    baseMood = applyAttachmentModifier(baseMood, profile.attachmentStyle, day, isWeekend, rng);

    // Apply weekend loneliness dip (especially for anxious attachment)
    if (isWeekend && profile.attachmentStyle === 'anxious') {
      baseMood -= rng.next() * 0.8;
    }

    // Add daily noise
    const noise = rng.gaussian(0, 0.3);
    baseMood += noise;

    // Clamp to 1-5
    const finalMood = Math.max(1, Math.min(5, Math.round(baseMood)));

    // Generate emotions based on mood
    const emotionPool = EMOTIONS_BY_MOOD[finalMood] || EMOTIONS_BY_MOOD[3];
    const emotions = rng.pickMultiple(emotionPool, rng.nextInt(1, 3));

    // Generate notes based on mood
    let notes: string | null = null;
    if (rng.next() > 0.4) { // 60% chance of notes
      if (finalMood <= 2) {
        notes = rng.pick(TRIGGER_NOTES.negative);
      } else if (finalMood >= 4) {
        notes = rng.pick(TRIGGER_NOTES.positive);
      } else {
        notes = rng.pick(TRIGGER_NOTES.neutral);
      }
    }

    // Randomize time of day
    const hour = rng.nextInt(7, 22);
    const minute = rng.nextInt(0, 59);
    date.setHours(hour, minute, 0, 0);

    entries.push({
      moodScore: finalMood,
      loggedAt: new Date(date),
      emotions,
      notes,
    });
  }

  return entries;
}

function getLoggingProbability(engagementLevel: SyntheticUserProfile['engagementLevel']): number {
  switch (engagementLevel) {
    case 'daily': return 0.90;
    case 'regular': return 0.65;
    case 'sporadic': return 0.40;
    case 'binge_ghost': return 0.85; // High when active
    default: return 0.60;
  }
}

function generateMoodCurve(
  profile: SyntheticUserProfile,
  totalDays: number,
  rng: SeededRandom
): number[] {
  const curve: number[] = [];

  // Handle support seekers differently (not breakup recovery)
  if (profile.userType === 'support_seeker') {
    return generateSupportSeekerCurve(totalDays, rng);
  }

  // Handle curious browsers (short engagement)
  if (profile.userType === 'curious_browser') {
    return generateBrowserCurve(totalDays, rng);
  }

  // Starting mood based on breakup type
  let startMood = 1.5;
  if (profile.breakupType === 'initiated') startMood = 2.2;
  if (profile.breakupType === 'mutual') startMood = 2.0;
  if (profile.breakupType === 'cheating_perpetrator') startMood = 2.5; // Guilt but less devastation

  // Ready to match users start higher
  if (profile.userType === 'ready_to_match') startMood = 2.8;
  if (profile.userType === 'already_matched') startMood = 3.0;

  // End mood based on outcome
  let endMood = 3.5;
  switch (profile.outcome) {
    case 'full_recovery': endMood = 4.5; break;
    case 'partial_recovery': endMood = 3.8; break;
    case 'stalled': endMood = 2.8; break;
    case 'relapse': endMood = 2.5; break;
    case 'premature_rebound': endMood = 3.2; break;
  }

  // Generate curve based on recovery speed
  switch (profile.recoverySpeed) {
    case 'fast':
      curve.push(...generateFastRecoveryCurve(startMood, endMood, totalDays, rng));
      break;
    case 'moderate':
      curve.push(...generateModerateCurve(startMood, endMood, totalDays, rng));
      break;
    case 'slow':
      curve.push(...generateSlowCurve(startMood, endMood, totalDays, rng));
      break;
    case 'non_linear':
      curve.push(...generateNonLinearCurve(startMood, endMood, totalDays, rng));
      break;
  }

  return curve;
}

function generateFastRecoveryCurve(
  start: number,
  end: number,
  days: number,
  rng: SeededRandom
): number[] {
  const curve: number[] = [];
  const inflectionPoint = Math.floor(days * 0.3); // Quick turn-around

  for (let d = 0; d < days; d++) {
    const progress = d / days;
    let mood: number;

    if (d < inflectionPoint) {
      // Initial dip then rapid climb
      const dipProgress = d / inflectionPoint;
      mood = start + (end - start) * Math.pow(dipProgress, 0.5);
    } else {
      // Steady improvement
      const remainingProgress = (d - inflectionPoint) / (days - inflectionPoint);
      const midMood = start + (end - start) * 0.6;
      mood = midMood + (end - midMood) * Math.pow(remainingProgress, 0.7);
    }

    curve.push(mood);
  }

  return curve;
}

function generateModerateCurve(
  start: number,
  end: number,
  days: number,
  rng: SeededRandom
): number[] {
  const curve: number[] = [];

  for (let d = 0; d < days; d++) {
    const progress = d / days;
    // S-curve with some oscillation
    const baseMood = start + (end - start) * (1 / (1 + Math.exp(-6 * (progress - 0.5))));
    // Add wave pattern
    const oscillation = Math.sin(progress * Math.PI * 4) * 0.3 * (1 - progress);
    curve.push(baseMood + oscillation);
  }

  return curve;
}

function generateSlowCurve(
  start: number,
  end: number,
  days: number,
  rng: SeededRandom
): number[] {
  const curve: number[] = [];
  const plateauEnd = Math.floor(days * 0.6); // Long plateau

  for (let d = 0; d < days; d++) {
    let mood: number;

    if (d < plateauEnd) {
      // Long plateau at low mood
      const plateauProgress = d / plateauEnd;
      const plateauMood = start + 0.5; // Slightly above start
      mood = start + (plateauMood - start) * Math.pow(plateauProgress, 0.3);
    } else {
      // Finally start improving
      const recoveryProgress = (d - plateauEnd) / (days - plateauEnd);
      const plateauMood = start + 0.5;
      mood = plateauMood + (end - plateauMood) * Math.pow(recoveryProgress, 0.8);
    }

    curve.push(mood);
  }

  return curve;
}

function generateNonLinearCurve(
  start: number,
  end: number,
  days: number,
  rng: SeededRandom
): number[] {
  const curve: number[] = [];
  const relapseDay = Math.floor(days * (0.4 + rng.next() * 0.2)); // Relapse between 40-60%
  const relapseDuration = Math.floor(days * 0.15);

  for (let d = 0; d < days; d++) {
    const progress = d / days;
    let mood: number;

    if (d < relapseDay) {
      // Initial improvement
      const preRelapseProgress = d / relapseDay;
      mood = start + (3.5 - start) * Math.pow(preRelapseProgress, 0.6);
    } else if (d < relapseDay + relapseDuration) {
      // Relapse crash
      const relapseProgress = (d - relapseDay) / relapseDuration;
      const preCrashMood = start + (3.5 - start) * 0.8;
      const crashMood = start + 0.3;
      mood = preCrashMood - (preCrashMood - crashMood) * Math.sin(relapseProgress * Math.PI / 2);
    } else {
      // Recovery after relapse
      const postRelapseProgress = (d - relapseDay - relapseDuration) / (days - relapseDay - relapseDuration);
      const crashMood = start + 0.3;
      mood = crashMood + (end - crashMood) * Math.pow(postRelapseProgress, 0.5);
    }

    curve.push(mood);
  }

  return curve;
}

function generateSupportSeekerCurve(days: number, rng: SeededRandom): number[] {
  const curve: number[] = [];
  const start = 2.0 + rng.next() * 0.5;
  const end = 3.2 + rng.next() * 0.8;

  for (let d = 0; d < days; d++) {
    const progress = d / days;
    // Gentle, uneven improvement
    const baseMood = start + (end - start) * Math.pow(progress, 0.8);
    const variation = Math.sin(progress * Math.PI * 3) * 0.4;
    curve.push(baseMood + variation);
  }

  return curve;
}

function generateBrowserCurve(days: number, rng: SeededRandom): number[] {
  const curve: number[] = [];
  const mood = 2.5 + rng.next() * 1.0; // Mostly flat, middling mood

  for (let d = 0; d < days; d++) {
    curve.push(mood + rng.gaussian(0, 0.3));
  }

  return curve;
}

function applyAttachmentModifier(
  baseMood: number,
  attachmentStyle: SyntheticUserProfile['attachmentStyle'],
  day: number,
  isWeekend: boolean,
  rng: SeededRandom
): number {
  switch (attachmentStyle) {
    case 'anxious':
      // More extreme swings
      const anxiousSwing = (rng.next() - 0.5) * 0.8;
      return baseMood + anxiousSwing;

    case 'avoidant':
      // Artificially stable early, delayed crash around day 20-30
      if (day < 15) {
        return Math.max(baseMood, 3.0); // Mask low moods
      } else if (day >= 20 && day <= 35) {
        return baseMood - 0.5; // Delayed crash
      }
      return baseMood;

    case 'secure':
      // Steadier, less extreme
      return baseMood * 0.9 + 2.5 * 0.1; // Regression toward mean

    case 'disorganized':
      // Highly variable, no pattern
      const chaosSwing = (rng.next() - 0.5) * 1.2;
      return baseMood + chaosSwing;

    default:
      return baseMood;
  }
}

export function getMoodTimelineStats(entries: SyntheticMoodEntry[]): {
  avgMood: number;
  minMood: number;
  maxMood: number;
  volatility: number;
  trend: 'improving' | 'stable' | 'declining';
} {
  if (entries.length === 0) {
    return { avgMood: 0, minMood: 0, maxMood: 0, volatility: 0, trend: 'stable' };
  }

  const moods = entries.map(e => e.moodScore);
  const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
  const minMood = Math.min(...moods);
  const maxMood = Math.max(...moods);

  // Volatility (standard deviation)
  const variance = moods.reduce((sum, m) => sum + Math.pow(m - avgMood, 2), 0) / moods.length;
  const volatility = Math.sqrt(variance);

  // Trend (compare first third to last third)
  const thirdLength = Math.floor(moods.length / 3);
  const firstThirdAvg = moods.slice(0, thirdLength).reduce((a, b) => a + b, 0) / thirdLength;
  const lastThirdAvg = moods.slice(-thirdLength).reduce((a, b) => a + b, 0) / thirdLength;
  const trendDiff = lastThirdAvg - firstThirdAvg;

  let trend: 'improving' | 'stable' | 'declining';
  if (trendDiff > 0.5) trend = 'improving';
  else if (trendDiff < -0.5) trend = 'declining';
  else trend = 'stable';

  return { avgMood, minMood, maxMood, volatility, trend };
}

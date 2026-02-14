// ============================================================================
// Synthetic User Archetype Generator
// Generates 250 realistic recovery journey profiles for calibration
// ============================================================================

export interface SyntheticUserProfile {
  syntheticId: string;
  firstName: string;
  age: number;
  gender: string;
  breakupType: 'initiated' | 'was_dumped' | 'mutual' | 'divorce' | 'cheating_victim' | 'cheating_perpetrator' | 'long_distance_fade' | 'ghosted';
  relationshipLengthMonths: number;
  attachmentStyle: 'anxious' | 'avoidant' | 'secure' | 'disorganized';
  recoverySpeed: 'fast' | 'moderate' | 'slow' | 'non_linear';
  engagementLevel: 'daily' | 'regular' | 'sporadic' | 'binge_ghost';
  journeyLengthDays: number;
  outcome: 'full_recovery' | 'partial_recovery' | 'stalled' | 'relapse' | 'premature_rebound';
  complicatingFactors: string[];
  userType: 'classic_recovery' | 'ready_to_match' | 'already_matched' | 'support_seeker' | 'curious_browser';
  recoveryContext: 'breakup' | 'divorce' | 'grief' | 'life_transition' | 'general_wellness';
  seekingMatch: boolean;
  matchPreferences: {
    age_range: [number, number];
    preferred_ers_stage: string;
    shared_experience_preference: boolean;
  } | null;
}

// Seeded random number generator for reproducibility
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

  pickWeighted<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  normalDist(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z;
  }
}

const FIRST_NAMES = [
  // Female names
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Ella', 'Madison',
  'Scarlett', 'Victoria', 'Aria', 'Grace', 'Chloe', 'Camila', 'Penelope', 'Riley',
  'Layla', 'Lillian', 'Nora', 'Zoey', 'Mila', 'Aubrey', 'Hannah', 'Lily',
  'Addison', 'Eleanor', 'Natalie', 'Luna', 'Savannah', 'Brooklyn', 'Leah', 'Zoe',
  'Stella', 'Hazel', 'Ellie', 'Paisley', 'Audrey', 'Skylar', 'Violet', 'Claire',
  'Bella', 'Aurora',
  // Male names
  'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas',
  'Henry', 'Theodore', 'Jack', 'Levi', 'Alexander', 'Mason', 'Ethan', 'Jacob',
  'Michael', 'Daniel', 'Logan', 'Jackson', 'Sebastian', 'Aiden', 'Matthew', 'Samuel',
  'David', 'Joseph', 'Carter', 'Owen', 'Wyatt', 'John', 'Luke', 'Gabriel',
  'Anthony', 'Isaac', 'Dylan', 'Leo', 'Lincoln', 'Jaxon', 'Asher', 'Christopher',
  'Josiah', 'Andrew', 'Thomas', 'Joshua', 'Ezra', 'Hudson', 'Charles', 'Caleb',
  'Ryan', 'Nathan'
];

const COMPLICATING_FACTORS = [
  'children',
  'shared_friend_group',
  'coworker',
  'financial_entanglement',
  'live_together',
  'long_distance',
  'family_pressure',
  'social_media_presence',
  'rebound_attempt',
  'none'
];

export function generateArchetypes(seed: number = 42): SyntheticUserProfile[] {
  const rng = new SeededRandom(seed);
  const profiles: SyntheticUserProfile[] = [];

  // User type distribution: 150 classic, 40 ready, 30 matched, 20 support, 10 browser
  const userTypeDistribution = [
    { type: 'classic_recovery' as const, count: 150 },
    { type: 'ready_to_match' as const, count: 40 },
    { type: 'already_matched' as const, count: 30 },
    { type: 'support_seeker' as const, count: 20 },
    { type: 'curious_browser' as const, count: 10 },
  ];

  let userIndex = 0;

  for (const { type, count } of userTypeDistribution) {
    for (let i = 0; i < count; i++) {
      userIndex++;
      const profile = generateSingleProfile(rng, userIndex, type);
      profiles.push(profile);
    }
  }

  return profiles;
}

function generateSingleProfile(
  rng: SeededRandom,
  index: number,
  userType: SyntheticUserProfile['userType']
): SyntheticUserProfile {
  const syntheticId = `syn_${String(index).padStart(3, '0')}`;
  const firstName = rng.pick(FIRST_NAMES);

  // Age: normal distribution centered on 30, range 20-55
  let age = Math.round(rng.normalDist(30, 8));
  age = Math.max(20, Math.min(55, age));

  // Gender distribution: 55% female, 40% male, 5% non-binary
  const gender = rng.pickWeighted(
    ['female', 'male', 'non-binary'],
    [55, 40, 5]
  );

  // Handle support seekers and curious browsers differently
  if (userType === 'support_seeker') {
    return generateSupportSeekerProfile(rng, syntheticId, firstName, age, gender);
  }

  if (userType === 'curious_browser') {
    return generateCuriousBrowserProfile(rng, syntheticId, firstName, age, gender);
  }

  // Breakup type: 40% was_dumped, 20% initiated, 15% mutual, 10% divorce, 15% other
  const breakupType = rng.pickWeighted(
    ['was_dumped', 'initiated', 'mutual', 'divorce', 'cheating_victim', 'cheating_perpetrator', 'long_distance_fade', 'ghosted'] as const,
    [40, 20, 15, 10, 5, 3, 4, 3]
  );

  // Relationship length: skewed distribution, most 1-5 years
  let relationshipLengthMonths: number;
  const lengthCategory = rng.pickWeighted(
    ['short', 'medium', 'long', 'very_long'],
    [20, 40, 30, 10]
  );
  switch (lengthCategory) {
    case 'short': relationshipLengthMonths = rng.nextInt(3, 12); break;
    case 'medium': relationshipLengthMonths = rng.nextInt(12, 36); break;
    case 'long': relationshipLengthMonths = rng.nextInt(36, 72); break;
    case 'very_long': relationshipLengthMonths = rng.nextInt(72, 180); break;
    default: relationshipLengthMonths = rng.nextInt(12, 36);
  }

  // Attachment style: 25% anxious, 20% avoidant, 40% secure, 15% disorganized
  const attachmentStyle = rng.pickWeighted(
    ['anxious', 'avoidant', 'secure', 'disorganized'] as const,
    [25, 20, 40, 15]
  );

  // Recovery speed and outcome based on user type
  let recoverySpeed: SyntheticUserProfile['recoverySpeed'];
  let outcome: SyntheticUserProfile['outcome'];
  let journeyLengthDays: number;
  let seekingMatch = false;
  let matchPreferences: SyntheticUserProfile['matchPreferences'] = null;

  if (userType === 'ready_to_match') {
    // These users have faster recovery and are match-ready
    recoverySpeed = rng.pickWeighted(['fast', 'moderate'] as const, [60, 40]);
    outcome = rng.pickWeighted(['full_recovery', 'partial_recovery'] as const, [70, 30]);
    journeyLengthDays = rng.nextInt(45, 90);
    seekingMatch = true;
    matchPreferences = {
      age_range: [Math.max(20, age - 8), Math.min(55, age + 8)],
      preferred_ers_stage: 'rebuilding_or_above',
      shared_experience_preference: rng.next() > 0.3
    };
  } else if (userType === 'already_matched') {
    // These users have progressed further
    recoverySpeed = rng.pickWeighted(['fast', 'moderate'] as const, [50, 50]);
    outcome = 'full_recovery';
    journeyLengthDays = rng.nextInt(90, 150);
    seekingMatch = true;
    matchPreferences = {
      age_range: [Math.max(20, age - 10), Math.min(55, age + 10)],
      preferred_ers_stage: 'rebuilding_or_above',
      shared_experience_preference: rng.next() > 0.4
    };
  } else {
    // Classic recovery users: varied outcomes
    recoverySpeed = rng.pickWeighted(
      ['fast', 'moderate', 'slow', 'non_linear'] as const,
      [20, 40, 25, 15]
    );
    outcome = rng.pickWeighted(
      ['full_recovery', 'partial_recovery', 'stalled', 'relapse', 'premature_rebound'] as const,
      [35, 30, 15, 10, 10]
    );
    journeyLengthDays = rng.nextInt(60, 180);
  }

  // Engagement level: Daily 20%, Regular 40%, Sporadic 25%, Binge 15%
  const engagementLevel = rng.pickWeighted(
    ['daily', 'regular', 'sporadic', 'binge_ghost'] as const,
    [20, 40, 25, 15]
  );

  // Complicating factors: 60% have at least one
  const complicatingFactors: string[] = [];
  if (rng.next() > 0.4) {
    const numFactors = rng.nextInt(1, 3);
    const availableFactors = [...COMPLICATING_FACTORS.filter(f => f !== 'none')];
    for (let f = 0; f < numFactors && availableFactors.length > 0; f++) {
      const idx = rng.nextInt(0, availableFactors.length - 1);
      complicatingFactors.push(availableFactors[idx]);
      availableFactors.splice(idx, 1);
    }
  }
  if (complicatingFactors.length === 0) {
    complicatingFactors.push('none');
  }

  // Recovery context
  let recoveryContext: SyntheticUserProfile['recoveryContext'] = 'breakup';
  if (breakupType === 'divorce') {
    recoveryContext = 'divorce';
  }

  return {
    syntheticId,
    firstName,
    age,
    gender,
    breakupType,
    relationshipLengthMonths,
    attachmentStyle,
    recoverySpeed,
    engagementLevel,
    journeyLengthDays,
    outcome,
    complicatingFactors,
    userType,
    recoveryContext,
    seekingMatch,
    matchPreferences,
  };
}

function generateSupportSeekerProfile(
  rng: SeededRandom,
  syntheticId: string,
  firstName: string,
  age: number,
  gender: string
): SyntheticUserProfile {
  const recoveryContext = rng.pickWeighted(
    ['grief', 'life_transition', 'general_wellness'] as const,
    [40, 35, 25]
  );

  return {
    syntheticId,
    firstName,
    age,
    gender,
    breakupType: 'mutual', // Placeholder, not relevant
    relationshipLengthMonths: 0,
    attachmentStyle: rng.pick(['anxious', 'avoidant', 'secure', 'disorganized'] as const),
    recoverySpeed: rng.pickWeighted(['moderate', 'slow'] as const, [60, 40]),
    engagementLevel: rng.pickWeighted(['regular', 'sporadic'] as const, [50, 50]),
    journeyLengthDays: rng.nextInt(30, 120),
    outcome: rng.pickWeighted(['partial_recovery', 'stalled'] as const, [70, 30]),
    complicatingFactors: ['none'],
    userType: 'support_seeker',
    recoveryContext,
    seekingMatch: false,
    matchPreferences: null,
  };
}

function generateCuriousBrowserProfile(
  rng: SeededRandom,
  syntheticId: string,
  firstName: string,
  age: number,
  gender: string
): SyntheticUserProfile {
  return {
    syntheticId,
    firstName,
    age,
    gender,
    breakupType: rng.pick(['was_dumped', 'initiated', 'mutual'] as const),
    relationshipLengthMonths: rng.nextInt(6, 36),
    attachmentStyle: rng.pick(['anxious', 'avoidant', 'secure', 'disorganized'] as const),
    recoverySpeed: 'moderate',
    engagementLevel: 'sporadic',
    journeyLengthDays: rng.nextInt(5, 10), // Very short engagement
    outcome: 'stalled', // Never completed
    complicatingFactors: ['none'],
    userType: 'curious_browser',
    recoveryContext: 'breakup',
    seekingMatch: false,
    matchPreferences: null,
  };
}

export function getArchetypeDescription(profile: SyntheticUserProfile): string {
  const parts = [
    `${profile.firstName}, ${profile.age}`,
    profile.gender,
    profile.userType.replace(/_/g, ' '),
  ];

  if (profile.userType !== 'support_seeker' && profile.userType !== 'curious_browser') {
    parts.push(`${profile.breakupType.replace(/_/g, ' ')}`);
    parts.push(`${Math.round(profile.relationshipLengthMonths / 12 * 10) / 10}y relationship`);
  }

  parts.push(`${profile.attachmentStyle} attachment`);
  parts.push(`${profile.recoverySpeed} recovery`);
  parts.push(`${profile.journeyLengthDays} days`);

  return parts.join(' | ');
}

// Streak calculation and milestone utilities

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  lastLoggedDate: string | null;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedDate?: string;
  icon: 'star' | 'flame' | 'pen' | 'heart' | 'sparkle' | 'shield' | 'trophy' | 'check' | 'target' | 'book';
  threshold: number;
  category: 'streak' | 'journal' | 'exercise' | 'ers';
  color: string;
}

/**
 * Calculate current and longest streak from an array of mood log dates
 * @param moodDates - Array of ISO date strings (can include time)
 * @returns Object with current and longest streak counts
 */
export function calculateStreak(moodDates: string[]): { current: number; longest: number } {
  if (!moodDates || moodDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Normalize to unique dates (YYYY-MM-DD) and sort descending (most recent first)
  const uniqueDates = [...new Set(
    moodDates.map(d => new Date(d).toISOString().split('T')[0])
  )].sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Calculate current streak (must include today or yesterday)
  let currentStreak = 0;
  const mostRecentDate = uniqueDates[0];

  if (mostRecentDate === today || mostRecentDate === yesterday) {
    currentStreak = 1;
    let checkDate = new Date(mostRecentDate);

    for (let i = 1; i < uniqueDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (uniqueDates[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak ever
  let longestStreak = 0;
  let tempStreak = 1;

  // Sort ascending for longest streak calculation
  const sortedAsc = [...uniqueDates].sort((a, b) => a.localeCompare(b));

  for (let i = 1; i < sortedAsc.length; i++) {
    const prevDate = new Date(sortedAsc[i - 1]);
    const currDate = new Date(sortedAsc[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: Math.max(longestStreak, currentStreak)
  };
}

/**
 * Get all milestones with their achieved status
 */
export function getMilestones(
  totalDays: number,
  totalJournalEntries: number,
  totalExercises: number,
  currentStreak: number,
  ersScore: number
): Milestone[] {
  const milestones: Milestone[] = [
    // Streak milestones
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Logged your first mood',
      achieved: totalDays >= 1,
      icon: 'star',
      threshold: 1,
      category: 'streak',
      color: '#D4973B' // accent
    },
    {
      id: 'building-habit',
      title: 'Building a Habit',
      description: '3 day streak',
      achieved: currentStreak >= 3,
      icon: 'flame',
      threshold: 3,
      category: 'streak',
      color: '#B86B64' // rose
    },
    {
      id: 'one-week-strong',
      title: 'One Week Strong',
      description: '7 day streak',
      achieved: currentStreak >= 7,
      icon: 'flame',
      threshold: 7,
      category: 'streak',
      color: '#D4973B' // accent
    },
    {
      id: 'consistent-healer',
      title: 'Consistent Healer',
      description: '14 day streak',
      achieved: currentStreak >= 14,
      icon: 'trophy',
      threshold: 14,
      category: 'streak',
      color: '#5B8A72' // primary
    },
    {
      id: 'monthly-dedication',
      title: 'Monthly Dedication',
      description: '30 day streak',
      achieved: currentStreak >= 30,
      icon: 'trophy',
      threshold: 30,
      category: 'streak',
      color: '#7E71B5' // lavender
    },
    // Journal milestones
    {
      id: 'deep-reflector',
      title: 'Deep Reflector',
      description: '10 journal entries',
      achieved: totalJournalEntries >= 10,
      icon: 'pen',
      threshold: 10,
      category: 'journal',
      color: '#5E8DB0' // calm
    },
    {
      id: 'word-smith',
      title: 'Word Smith',
      description: '50 journal entries',
      achieved: totalJournalEntries >= 50,
      icon: 'book',
      threshold: 50,
      category: 'journal',
      color: '#7E71B5' // lavender
    },
    // Exercise milestone
    {
      id: 'active-healer',
      title: 'Active Healer',
      description: '10 exercises completed',
      achieved: totalExercises >= 10,
      icon: 'heart',
      threshold: 10,
      category: 'exercise',
      color: '#B86B64' // rose
    },
    // ERS milestones
    {
      id: 'rebuilding',
      title: 'Rebuilding',
      description: 'Reached ERS 50',
      achieved: ersScore >= 50,
      icon: 'shield',
      threshold: 50,
      category: 'ers',
      color: '#5E8DB0' // calm
    },
    {
      id: 'ready',
      title: 'Ready',
      description: 'Reached ERS 75',
      achieved: ersScore >= 75,
      icon: 'sparkle',
      threshold: 75,
      category: 'ers',
      color: '#5B8A72' // primary
    }
  ];

  return milestones;
}

/**
 * Get the 7-day logging status for the current week
 * @param moodDates - Array of ISO date strings
 * @returns Array of 7 booleans (Mon-Sun), true if logged
 */
export function getWeekLoggingStatus(moodDates: string[]): boolean[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const uniqueDates = new Set(
    moodDates.map(d => new Date(d).toISOString().split('T')[0])
  );

  const weekStatus: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(monday);
    checkDate.setDate(monday.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];
    weekStatus.push(uniqueDates.has(dateStr));
  }

  return weekStatus;
}

/**
 * Check which milestones are newly achieved (not yet celebrated)
 */
export function getNewlyAchievedMilestones(
  currentMilestones: Milestone[],
  celebratedIds: string[]
): Milestone[] {
  return currentMilestones.filter(
    m => m.achieved && !celebratedIds.includes(m.id)
  );
}

/**
 * Get progress toward next milestone in a category
 */
export function getNextMilestoneProgress(
  milestones: Milestone[],
  category: 'streak' | 'journal' | 'exercise' | 'ers',
  currentValue: number
): { milestone: Milestone | null; progress: number } {
  const categoryMilestones = milestones
    .filter(m => m.category === category && !m.achieved)
    .sort((a, b) => a.threshold - b.threshold);

  if (categoryMilestones.length === 0) {
    return { milestone: null, progress: 100 };
  }

  const next = categoryMilestones[0];
  const progress = Math.min(100, Math.round((currentValue / next.threshold) * 100));

  return { milestone: next, progress };
}

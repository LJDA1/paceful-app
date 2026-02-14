/**
 * Mood Calculator for Paceful
 *
 * Calculates mood statistics, trends, and variance for ERS integration.
 */

import { supabase as defaultSupabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Backwards compatibility - functions can be updated to accept supabaseClient parameter
const supabase = defaultSupabase;

// ============================================================================
// Types
// ============================================================================

export interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number; // Mapped from mood_value in DB
  emotions: string[];
  note: string | null;
  logged_at: string;
}

// Raw database entry type
interface DBMoodEntry {
  id: string;
  user_id: string;
  mood_value: number;
  mood_label: string | null;
  emotions: string[] | null;
  trigger_description: string | null;
  time_of_day: string | null;
  logged_at: string;
}

export interface MoodStats {
  averageMood: number;
  moodVariance: number;
  entryCount: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  highestMood: number;
  lowestMood: number;
  mostCommonEmotion: string | null;
}

export interface WeeklyMoodSummary {
  weekStart: string;
  weekEnd: string;
  averageMood: number;
  variance: number;
  entryCount: number;
  dominantEmotions: string[];
}

export interface DailyMoodSummary {
  date: string;
  averageMood: number;
  entryCount: number;
  emotions: string[];
}

// ============================================================================
// Core Calculations
// ============================================================================

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = calculateAverage(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  return calculateAverage(squaredDiffs);
}

/**
 * Detect trend from mood scores (comparing first half to second half)
 */
function detectTrend(scores: number[]): { trend: 'improving' | 'stable' | 'declining'; percentage: number } {
  if (scores.length < 4) {
    return { trend: 'stable', percentage: 0 };
  }

  const midpoint = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);

  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);

  const change = secondAvg - firstAvg;
  const percentage = firstAvg > 0 ? (change / firstAvg) * 100 : 0;

  // Threshold for determining trend (5% change)
  if (percentage > 5) {
    return { trend: 'improving', percentage };
  } else if (percentage < -5) {
    return { trend: 'declining', percentage };
  }
  return { trend: 'stable', percentage };
}

/**
 * Get most common emotion from entries
 */
function getMostCommonEmotion(entries: MoodEntry[]): string | null {
  const emotionCounts: Record<string, number> = {};

  entries.forEach(entry => {
    if (entry.emotions) {
      entry.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

/**
 * Map database entry to our MoodEntry type
 */
function mapDBEntry(dbEntry: DBMoodEntry): MoodEntry {
  return {
    id: dbEntry.id,
    user_id: dbEntry.user_id,
    mood_score: dbEntry.mood_value,
    emotions: dbEntry.emotions || [],
    note: dbEntry.trigger_description,
    logged_at: dbEntry.logged_at,
  };
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Calculate comprehensive mood statistics for a user
 */
export function calculateMoodStats(entries: MoodEntry[]): MoodStats {
  if (entries.length === 0) {
    return {
      averageMood: 0,
      moodVariance: 0,
      entryCount: 0,
      trend: 'stable',
      trendPercentage: 0,
      highestMood: 0,
      lowestMood: 0,
      mostCommonEmotion: null,
    };
  }

  const scores = entries.map(e => e.mood_score);
  const { trend, percentage } = detectTrend(scores);

  return {
    averageMood: Math.round(calculateAverage(scores) * 10) / 10,
    moodVariance: Math.round(calculateVariance(scores) * 100) / 100,
    entryCount: entries.length,
    trend,
    trendPercentage: Math.round(percentage * 10) / 10,
    highestMood: Math.max(...scores),
    lowestMood: Math.min(...scores),
    mostCommonEmotion: getMostCommonEmotion(entries),
  };
}

/**
 * Calculate weekly mood summary
 */
export function calculateWeeklySummary(entries: MoodEntry[], weekStart: Date): WeeklyMoodSummary {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekEntries = entries.filter(entry => {
    const entryDate = new Date(entry.logged_at);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });

  const scores = weekEntries.map(e => e.mood_score);
  const allEmotions = weekEntries.flatMap(e => e.emotions || []);

  // Get top 3 emotions
  const emotionCounts: Record<string, number> = {};
  allEmotions.forEach(emotion => {
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });
  const dominantEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    averageMood: Math.round(calculateAverage(scores) * 10) / 10,
    variance: Math.round(calculateVariance(scores) * 100) / 100,
    entryCount: weekEntries.length,
    dominantEmotions,
  };
}

/**
 * Calculate daily mood summaries for a date range
 */
export function calculateDailySummaries(entries: MoodEntry[], days: number = 30): DailyMoodSummary[] {
  const summaries: DailyMoodSummary[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.logged_at).toISOString().split('T')[0];
      return entryDate === dateStr;
    });

    if (dayEntries.length > 0) {
      const scores = dayEntries.map(e => e.mood_score);
      const allEmotions = [...new Set(dayEntries.flatMap(e => e.emotions || []))];

      summaries.push({
        date: dateStr,
        averageMood: Math.round(calculateAverage(scores) * 10) / 10,
        entryCount: dayEntries.length,
        emotions: allEmotions,
      });
    }
  }

  return summaries.reverse(); // Oldest to newest
}

/**
 * Get mood color based on score
 */
export function getMoodColor(score: number): { bg: string; text: string; border: string } {
  if (score <= 3) {
    return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' };
  } else if (score <= 6) {
    return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' };
  }
  return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' };
}

/**
 * Get mood label based on score
 */
export function getMoodLabel(score: number): string {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Moderate';
  return 'High';
}

/**
 * Get hex color for charts
 */
export function getMoodHexColor(score: number): string {
  if (score <= 3) return '#f43f5e'; // rose-500
  if (score <= 6) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Fetch mood entries for a user within a date range
 */
export async function fetchMoodEntries(
  userId: string,
  days: number = 30
): Promise<MoodEntry[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('mood_entries')
    .select('id, user_id, mood_value, mood_label, emotions, trigger_description, time_of_day, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString())
    .order('logged_at', { ascending: true });

  if (error) {
    console.error('Error fetching mood entries:', error);
    return [];
  }

  return (data || []).map(mapDBEntry);
}

/**
 * Save a mood entry
 */
export async function saveMoodEntry(
  userId: string,
  moodScore: number,
  emotions: string[],
  note?: string
): Promise<MoodEntry | null> {
  const { data, error } = await supabase
    .from('mood_entries')
    .insert({
      user_id: userId,
      mood_value: moodScore,
      mood_label: getMoodLabel(moodScore).toLowerCase(),
      emotions,
      trigger_description: note || null,
      logged_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving mood entry:', error);
    return null;
  }

  return data ? mapDBEntry(data as DBMoodEntry) : null;
}

/**
 * Calculate and store mood variance stats for ERS
 */
export async function calculateAndStoreMoodVariance(userId: string): Promise<number> {
  const entries = await fetchMoodEntries(userId, 14); // 2 weeks
  const stats = calculateMoodStats(entries);

  // Normalize variance to 0-1 scale for ERS
  // Lower variance = more stable = higher score
  // Typical variance range: 0-5
  const normalizedStability = Math.max(0, 1 - (stats.moodVariance / 5));

  // Store in profile or stats table if needed
  // For now, just return the stability score
  return Math.round(normalizedStability * 100) / 100;
}

/**
 * Get entries for a specific date
 */
export async function getEntriesForDate(userId: string, date: string): Promise<MoodEntry[]> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('mood_entries')
    .select('id, user_id, mood_value, mood_label, emotions, trigger_description, time_of_day, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)
    .order('logged_at', { ascending: false });

  if (error) {
    console.error('Error fetching entries for date:', error);
    return [];
  }

  return (data || []).map(mapDBEntry);
}

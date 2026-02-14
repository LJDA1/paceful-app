// Demo mode utilities for Paceful

const DEMO_MODE_KEY = 'paceful_demo_mode';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_KEY, 'true');
}

export function disableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_MODE_KEY);
}

// Demo data constants
export const DEMO_USER = {
  id: 'demo-user-001',
  name: 'Alex Demo',
  email: 'demo@paceful.app',
  stage: 'rebuilding' as const,
  daysInApp: 28,
};

export const DEMO_ERS = {
  current: 62,
  previous: 54,
  stage: 'rebuilding' as const,
  history: [
    { week: 1, score: 28 },
    { week: 2, score: 41 },
    { week: 3, score: 54 },
    { week: 4, score: 62 },
  ],
};

export const DEMO_PREDICTIONS = {
  timeline: {
    rebuildingWeeks: { week_4: 0.85, week_8: 0.95, week_12: 0.99 },
    readyWeeks: { week_12: 0.42, week_16: 0.68, week_20: 0.84 },
    medianRebuildingWeeks: 2.1,
    medianReadyWeeks: 14.2,
    confidence: 0.87,
  },
  outcomes: [
    { outcome: 'stopped_daily_thoughts', probability: 0.89, timing: '8.3 weeks' },
    { outcome: 'ready_to_date', probability: 0.72, timing: '14.2 weeks' },
    { outcome: 'reconnected_with_friends', probability: 0.94, timing: '5.1 weeks' },
  ],
  risks: [
    { type: 'anniversary_approaching', date: '2026-03-15', probability: 0.65 },
    { type: 'holiday_setback', date: '2026-02-14', probability: 0.78 },
  ],
};

export const DEMO_MOOD_ENTRIES = [
  { date: '2026-02-07', score: 6, notes: 'Feeling better today' },
  { date: '2026-02-06', score: 5, notes: 'Up and down' },
  { date: '2026-02-05', score: 4, notes: 'Tough morning' },
  { date: '2026-02-04', score: 6, notes: 'Good day overall' },
  { date: '2026-02-03', score: 7, notes: 'Made progress!' },
];

export const DEMO_METRICS = {
  totalUsers: 50,
  totalPredictions: 1200,
  avgAccuracy: 0, // No validated accuracy data yet
  avgERS: 58,
  stageDistribution: { healing: 16, rebuilding: 20, ready: 14 },
  moodEntries: 2100,
  journalEntries: 850,
  apiClients: 3,
};

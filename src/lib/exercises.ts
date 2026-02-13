/**
 * Static Exercise Library
 *
 * Pre-built exercises for emotional recovery, used as fallbacks
 * when AI generation is unavailable or for quick access.
 */

export type ExerciseType = 'breathing' | 'reframe' | 'gratitude' | 'letting-go' | 'grounding' | 'self-compassion';

export interface ExerciseStep {
  instruction: string;
  duration_seconds: number | null;
}

export interface Exercise {
  id: string;
  title: string;
  type: ExerciseType;
  duration: string;
  description: string;
  introduction: string;
  steps: ExerciseStep[];
  closing: string;
  icon: ExerciseType;
}

export const exerciseColors: Record<ExerciseType, { bg: string; text: string; accent: string }> = {
  'breathing': { bg: 'rgba(94,141,176,0.08)', text: '#5E8DB0', accent: '#5E8DB0' },
  'reframe': { bg: 'rgba(212,151,59,0.08)', text: '#D4973B', accent: '#D4973B' },
  'gratitude': { bg: 'rgba(91,138,114,0.08)', text: '#5B8A72', accent: '#5B8A72' },
  'letting-go': { bg: 'rgba(126,113,181,0.08)', text: '#7E71B5', accent: '#7E71B5' },
  'grounding': { bg: 'rgba(184,107,100,0.08)', text: '#B86B64', accent: '#B86B64' },
  'self-compassion': { bg: 'rgba(123,168,150,0.08)', text: '#7BA896', accent: '#7BA896' },
};

export const staticExercises: Exercise[] = [
  {
    id: 'breathing-478',
    title: '4-7-8 Calm Breathing',
    type: 'breathing',
    duration: '4 min',
    description: 'A calming breath pattern to activate your relaxation response',
    introduction: 'This breathing technique helps calm your nervous system and bring you back to center. Find a comfortable position and let your shoulders drop.',
    steps: [
      { instruction: 'Close your eyes and take a moment to notice how you feel right now. Let go of any judgment.', duration_seconds: 10 },
      { instruction: 'Breathe in slowly through your nose for 4 counts. Feel your belly expand.', duration_seconds: 4 },
      { instruction: 'Hold your breath gently for 7 counts. Stay relaxed, no tension.', duration_seconds: 7 },
      { instruction: 'Exhale slowly through your mouth for 8 counts, letting everything go.', duration_seconds: 8 },
      { instruction: 'Repeat this cycle 3 more times. With each breath, feel yourself becoming more grounded.', duration_seconds: 60 },
    ],
    closing: 'Notice how your body feels now. This calm is always available to you.',
    icon: 'breathing',
  },
  {
    id: 'reframe-thoughts',
    title: 'Thought Reframing',
    type: 'reframe',
    duration: '5 min',
    description: 'Shift your perspective on difficult thoughts',
    introduction: 'Our thoughts aren\'t always accurate reflections of reality. This exercise helps you examine a thought and find a more balanced perspective.',
    steps: [
      { instruction: 'Identify one thought that\'s been weighing on you today. Write it down or hold it clearly in your mind.', duration_seconds: 30 },
      { instruction: 'Ask yourself: What evidence supports this thought? Be specific and factual.', duration_seconds: 45 },
      { instruction: 'Now ask: What evidence contradicts this thought? What would a friend say about it?', duration_seconds: 45 },
      { instruction: 'Create a more balanced thought that acknowledges both perspectives. It doesn\'t have to be positive, just more complete.', duration_seconds: 45 },
      { instruction: 'Take a deep breath and repeat your balanced thought to yourself. Notice how it feels different.', duration_seconds: 20 },
    ],
    closing: 'You have the power to examine your thoughts and choose which ones to hold onto.',
    icon: 'reframe',
  },
  {
    id: 'gratitude-three',
    title: 'Three Good Things',
    type: 'gratitude',
    duration: '3 min',
    description: 'Notice positive moments from your day',
    introduction: 'Even on difficult days, there are small moments worth acknowledging. This practice trains your mind to notice what\'s going well.',
    steps: [
      { instruction: 'Think of one good thing that happened today, no matter how small. It could be a warm cup of coffee or a kind word.', duration_seconds: 30 },
      { instruction: 'Recall a second good thing. Perhaps something you accomplished or a moment of peace.', duration_seconds: 30 },
      { instruction: 'Find a third good thing. Maybe something beautiful you noticed or a connection you had.', duration_seconds: 30 },
      { instruction: 'For each one, pause and ask: Why did this good thing happen? What does it say about your life right now?', duration_seconds: 45 },
    ],
    closing: 'These moments are part of your story too. They exist alongside the hard parts.',
    icon: 'gratitude',
  },
  {
    id: 'letting-go-release',
    title: 'Release Writing',
    type: 'letting-go',
    duration: '6 min',
    description: 'Write and symbolically release what weighs on you',
    introduction: 'Sometimes we hold onto thoughts, feelings, or memories that no longer serve us. This exercise creates space for release.',
    steps: [
      { instruction: 'Take a moment to identify something you\'re holding onto. A hurt, a regret, an expectation. Name it clearly.', duration_seconds: 30 },
      { instruction: 'Imagine writing this down on a piece of paper. Describe it fully — how it makes you feel, why it\'s hard to let go.', duration_seconds: 60 },
      { instruction: 'Read what you\'ve written (in your mind or aloud). Acknowledge that this has been part of your experience.', duration_seconds: 30 },
      { instruction: 'Now visualize folding this paper and placing it in a stream, watching it float away. Or burning it safely, transforming it to ash.', duration_seconds: 30 },
      { instruction: 'Take three deep breaths. With each exhale, feel yourself becoming lighter. You don\'t have to carry this anymore.', duration_seconds: 30 },
    ],
    closing: 'Letting go isn\'t forgetting. It\'s choosing to no longer let something control your present.',
    icon: 'letting-go',
  },
  {
    id: 'grounding-54321',
    title: '5-4-3-2-1 Senses',
    type: 'grounding',
    duration: '4 min',
    description: 'Ground yourself using sensory awareness',
    introduction: 'When emotions feel overwhelming, this technique brings you back to the present moment through your senses.',
    steps: [
      { instruction: 'Look around and name 5 things you can see. Notice colors, shapes, light and shadow.', duration_seconds: 30 },
      { instruction: 'Listen carefully and identify 4 things you can hear. Near sounds, far sounds, subtle sounds.', duration_seconds: 30 },
      { instruction: 'Notice 3 things you can physically feel right now. The chair beneath you, air on your skin, your feet on the floor.', duration_seconds: 30 },
      { instruction: 'Identify 2 things you can smell. If nothing is obvious, notice the neutral smell of the air.', duration_seconds: 20 },
      { instruction: 'Notice 1 thing you can taste. The inside of your mouth, a recent drink, or take a sip of water.', duration_seconds: 15 },
    ],
    closing: 'You are here, in this moment. This is where your life is happening.',
    icon: 'grounding',
  },
  {
    id: 'self-compassion-letter',
    title: 'Letter to Yourself',
    type: 'self-compassion',
    duration: '5 min',
    description: 'Write to yourself with the kindness you\'d offer a friend',
    introduction: 'We often speak to ourselves more harshly than we would to anyone we care about. This exercise helps you practice self-compassion.',
    steps: [
      { instruction: 'Think of what you\'re struggling with right now. The pain, the difficulty, the challenge you\'re facing.', duration_seconds: 20 },
      { instruction: 'Imagine a close friend is going through this exact same thing. How would you feel toward them?', duration_seconds: 20 },
      { instruction: 'Begin writing (or thinking) a letter to yourself, as if you were that caring friend. Start with "Dear..."', duration_seconds: 30 },
      { instruction: 'Acknowledge the difficulty without minimizing it. "I see how hard this is for you..."', duration_seconds: 45 },
      { instruction: 'Offer words of comfort and encouragement. What do you need to hear right now?', duration_seconds: 45 },
    ],
    closing: 'You deserve the same compassion you so freely give to others.',
    icon: 'self-compassion',
  },
];

/**
 * Get a static exercise by type
 */
export function getStaticExercise(type: ExerciseType): Exercise {
  const exercise = staticExercises.find(e => e.type === type);
  if (!exercise) {
    return staticExercises[0]; // Fallback to breathing
  }
  return exercise;
}

/**
 * Get a recommended exercise based on mood score
 */
export function getRecommendedExercise(moodScore: number): Exercise {
  if (moodScore <= 4) {
    // Low mood: grounding or breathing
    return staticExercises.find(e => e.type === 'grounding') || staticExercises[0];
  } else if (moodScore <= 6) {
    // Moderate mood: reframe or gratitude
    return staticExercises.find(e => e.type === 'reframe') || staticExercises[1];
  } else {
    // Higher mood: letting go or self-compassion
    return staticExercises.find(e => e.type === 'letting-go') || staticExercises[3];
  }
}

/**
 * Get all exercises
 */
export function getAllExercises(): Exercise[] {
  return staticExercises;
}

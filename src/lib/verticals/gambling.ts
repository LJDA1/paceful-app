/**
 * Gambling Vertical Configuration
 *
 * Responsible gambling - player protection and harm detection signals.
 */

import { VerticalConfig } from './types';

export const gamblingVertical: VerticalConfig = {
  slug: 'gambling',
  name: 'Responsible Gambling',
  description: 'Player protection and harm detection for gambling platforms',

  signals: [
    {
      id: 'loss_chasing',
      name: 'Loss Chasing Language',
      description: 'Patterns indicating pursuit of losses through continued gambling',
      examples: [
        'I just need one more win',
        "I'll win it back",
        'I have to keep playing to recover',
        'One more bet and I can break even',
      ],
      risk_weight: 0.8,
    },
    {
      id: 'desperation_urgency',
      name: 'Desperation and Urgency',
      description: 'Language expressing desperate need to gamble or win immediately',
      examples: [
        'I need this to work out',
        'This is my last chance',
        "I can't stop now",
        'I have to win tonight',
      ],
      risk_weight: 0.9,
    },
    {
      id: 'financial_distress',
      name: 'Financial Distress Indicators',
      description: 'Signs of financial problems related to gambling',
      examples: [
        "I can't pay my bills",
        'I borrowed money to play',
        "I'm behind on rent because of this",
        'I maxed out my credit cards',
      ],
      risk_weight: 0.85,
    },
    {
      id: 'sleep_disruption',
      name: 'Sleep Disruption',
      description: 'Gambling affecting sleep patterns',
      examples: [
        "I stayed up all night playing",
        "I can't sleep thinking about it",
        'I wake up and immediately start gambling',
        "I've been gambling instead of sleeping",
      ],
      risk_weight: 0.5,
    },
    {
      id: 'social_isolation',
      name: 'Social Isolation',
      description: 'Withdrawal from social connections due to gambling',
      examples: [
        "I don't see my friends anymore",
        "I'd rather gamble than go out",
        "I've been avoiding my family",
        'I cancelled plans to keep playing',
      ],
      risk_weight: 0.7,
    },
    {
      id: 'denial_minimization',
      name: 'Denial and Minimization',
      description: 'Downplaying gambling behavior or its consequences',
      examples: [
        "It's not that bad",
        'I can stop whenever I want',
        "I'm in control",
        "It's just for fun, not a problem",
      ],
      risk_weight: 0.75,
    },
    {
      id: 'emotional_volatility',
      name: 'Emotional Volatility',
      description: 'Extreme emotional swings related to gambling outcomes',
      examples: [
        "I feel amazing when I win",
        "I'm devastated after losing",
        'My mood depends on how the games go',
        "I can't handle the losses emotionally",
      ],
      risk_weight: 0.65,
    },
    {
      id: 'impulse_patterns',
      name: 'Impulse Control Issues',
      description: 'Inability to control gambling urges',
      examples: [
        "I can't resist the urge",
        'I gamble without thinking',
        "I told myself I wouldn't but I did",
        'I deposit money before I realize what I am doing',
      ],
      risk_weight: 0.7,
    },
    {
      id: 'relationship_conflict',
      name: 'Relationship Conflict',
      description: 'Gambling causing problems in relationships',
      examples: [
        'My partner is upset about my gambling',
        "I've been lying to my family about it",
        'We fight about money all the time',
        'My gambling is hurting my marriage',
      ],
      risk_weight: 0.6,
    },
    {
      id: 'work_productivity_decline',
      name: 'Work/Productivity Decline',
      description: 'Gambling affecting work performance or responsibilities',
      examples: [
        "I gamble at work",
        "I've missed work because of gambling",
        "I can't focus because I'm thinking about betting",
        'My performance has dropped',
      ],
      risk_weight: 0.55,
    },
    {
      id: 'substance_co_use',
      name: 'Substance Co-Use',
      description: 'Concurrent substance use with gambling',
      examples: [
        'I drink while I gamble',
        'I need a few drinks to play',
        "I've been using more since I started gambling heavily",
        'Gambling and drinking go together for me',
      ],
      risk_weight: 0.8,
    },
    {
      id: 'self_harm_hopelessness',
      name: 'Self-Harm or Hopelessness',
      description: 'Expressions of hopelessness, self-harm, or suicidal ideation related to gambling',
      examples: [
        "I don't see a way out",
        "I've thought about ending it",
        'What is the point anymore',
        "I can't live with this debt",
      ],
      risk_weight: 1.0,
    },
    {
      id: 'withdrawal_symptoms',
      name: 'Withdrawal Symptoms',
      description: 'Signs of distress when not gambling',
      examples: [
        'I feel restless when I am not playing',
        'I get irritable if I go too long without gambling',
        "I can't relax unless I'm betting",
        'I feel empty when I am not gambling',
      ],
      risk_weight: 0.7,
    },
    {
      id: 'recovery_help_seeking',
      name: 'Recovery and Help-Seeking',
      description: 'Expressions of wanting help or acknowledging the problem (protective factor)',
      examples: [
        'I think I need help',
        "I want to stop but don't know how",
        "I'm looking into support groups",
        'I know I have a problem',
      ],
      risk_weight: -0.5, // Negative = protective factor
    },
  ],

  risk_levels: [
    {
      level: 'low',
      range: [0, 25],
      action: 'Continue monitoring',
    },
    {
      level: 'moderate',
      range: [26, 50],
      action: 'Trigger soft intervention',
    },
    {
      level: 'high',
      range: [51, 75],
      action: 'Flag for manual review',
    },
    {
      level: 'critical',
      range: [76, 100],
      action: 'Immediate intervention required',
    },
  ],

  prompt_context: `You are an expert analyst detecting signs of problematic gambling behavior in text. Your role is to identify specific behavioral and linguistic patterns that may indicate gambling harm.

Analyze the text for each signal in the provided catalog. For each signal:
- Determine if it is present (detected: true/false)
- If detected, assess confidence (low/medium/high)
- Provide brief evidence (quote or paraphrase from the text)

Be thorough but avoid false positives. Only mark a signal as detected if there is clear evidence in the text.

Important considerations:
- "recovery_help_seeking" is a PROTECTIVE factor (reduces risk)
- "self_harm_hopelessness" is the most critical signal and requires careful attention
- Context matters: casual mention differs from repeated patterns
- Consider the overall tone and severity of expressions`,
};

export default gamblingVertical;

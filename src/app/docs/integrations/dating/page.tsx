import IntegrationPage, { IntegrationPageConfig } from '@/components/IntegrationPage';

const config: IntegrationPageConfig = {
  title: 'Add Emotional Readiness to Your Dating App',
  subtitle: 'Score user-submitted bios and prompts to surface emotionally ready matches, gate features by readiness tier, and reduce post-breakup churn.',
  endpoint: '/api/v1/assess/analyze',

  archFlow: [
    { label: 'User writes bio & prompts', detail: 'Profile setup or daily prompt' },
    { label: 'Your backend', detail: 'Collects and forwards text' },
    { label: 'POST /assess/analyze', detail: 'Paceful scores the text' },
    { label: 'Score returned', detail: '0–100 Emotional Readiness Score + dimension breakdown' },
    { label: 'Gate matching / badge', detail: 'Filter, rank, or annotate profiles' },
  ],

  codeExample: `async function scoreProfile(userId, bio, prompts) {
  const text = [bio, ...prompts].join('\\n\\n');
  const res = await fetch('https://api.paceful.com/v1/assess/analyze', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PACEFUL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, text, source_type: 'free_text' }),
  });
  const { data } = await res.json();
  const canMatch = data.ers_snapshot >= 65;
  return { score: data.ers_snapshot, canMatch, label: data.readiness_label };
}`,

  apiResponse: `{
  "success": true,
  "data": {
    "ers_snapshot": 72,
    "readiness_label": "Ready",
    "confidence": "high",
    "dimensions": {
      "emotional_stability":   { "score": 74, "label": "high",     "confidence": "high"   },
      "self_reflection":       { "score": 68, "label": "moderate", "confidence": "medium" },
      "coping_capacity":       { "score": 71, "label": "high",     "confidence": "high"   },
      "behavioral_engagement": { "score": 75, "label": "high",     "confidence": "medium" },
      "social_readiness":      { "score": 73, "label": "high",     "confidence": "high"   }
    },
    "assessment_id": "anlz_m9x3k_ab12cd",
    "timestamp": "2026-04-08T10:23:41Z",
    "source_type": "free_text",
    "text_length": 342
  }
}`,

  useCases: [
    {
      title: 'Readiness-gated matching',
      description: "Only surface matches once a user's Emotional Readiness Score clears a threshold — reducing low-intent interactions.",
    },
    {
      title: 'Recovery badges',
      description: 'Show a "Healing" or "Ready" tier on profiles to set expectations and attract compatible partners.',
    },
    {
      title: 'Post-breakup cooldown',
      description: 'Detect freshly-hurt users from their writing and prompt them to pause, protecting both sides of a match.',
    },
  ],

  expectedResults: 'Partners integrating readiness score filters report measurable improvement in reported match quality and a reduction in early unmatches, as users are better aligned on emotional availability before connecting.',
};

export default function DatingIntegrationPage() {
  return <IntegrationPage config={config} />;
}

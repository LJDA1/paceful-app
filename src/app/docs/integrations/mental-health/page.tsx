import IntegrationPage, { IntegrationPageConfig } from '@/components/IntegrationPage';

const config: IntegrationPageConfig = {
  title: 'Between-Session Monitoring for Therapy Platforms',
  subtitle: 'Analyze patient journal entries between sessions to surface Emotional Readiness Score trends, flag score drops, and give therapists a real-time window into progress.',
  endpoint: '/api/v1/assess/analyze',

  archFlow: [
    { label: 'Patient journals between sessions', detail: 'In-app journal entry' },
    { label: 'Your backend', detail: 'Stores and forwards entry' },
    { label: 'POST /assess/analyze', detail: 'Paceful scores the text' },
    { label: 'Score trend updated', detail: 'Score stored against user history' },
    { label: 'Therapist dashboard', detail: 'Score chart + alert on decline' },
  ],

  codeExample: `async function analyzeJournal(patientId, journalText) {
  const res = await fetch('https://api.paceful.com/v1/assess/analyze', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.PACEFUL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: patientId, text: journalText, source_type: 'journal' }),
  });
  const { data } = await res.json();
  await saveErsHistory(patientId, data.ers_snapshot, data.timestamp);
  if (data.ers_snapshot < 45) await flagForTherapist(patientId, data);
  return data;
}`,

  apiResponse: `{
  "success": true,
  "data": {
    "ers_snapshot": 41,
    "readiness_label": "Healing",
    "confidence": "medium",
    "dimensions": {
      "emotional_stability":   { "score": 38, "label": "low",      "confidence": "high"   },
      "self_reflection":       { "score": 62, "label": "moderate", "confidence": "high"   },
      "coping_capacity":       { "score": 44, "label": "moderate", "confidence": "medium" },
      "behavioral_engagement": { "score": 35, "label": "low",      "confidence": "medium" },
      "social_readiness":      { "score": 39, "label": "low",      "confidence": "medium" }
    },
    "assessment_id": "anlz_p7r2k_cd34ef",
    "timestamp": "2026-04-08T08:14:22Z",
    "source_type": "journal",
    "text_length": 518
  }
}`,

  useCases: [
    {
      title: 'Session prep for therapists',
      description: "Therapists open the session with a view of the patient's score trend since the last appointment — no cold starts.",
    },
    {
      title: 'Early warning on declining scores',
      description: "Automatically alert clinicians when a patient's score drops more than 15 points between entries.",
    },
    {
      title: 'Treatment efficacy tracking',
      description: 'Show rising score curves over weeks to validate therapeutic approaches and motivate patients.',
    },
  ],

  expectedResults: 'Therapy platforms using between-session score monitoring report earlier identification of crisis risk, improved therapist preparedness, and higher patient retention as users see measurable progress reflected in their trend line.',
};

export default function MentalHealthIntegrationPage() {
  return <IntegrationPage config={config} />;
}

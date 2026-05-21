import IntegrationPage, { IntegrationPageConfig } from '@/components/IntegrationPage';

const config: IntegrationPageConfig = {
  title: 'Employee Wellbeing Signals for HR Platforms',
  subtitle: 'Turn pulse survey responses and weekly check-in notes into aggregate Emotional Readiness Scores — giving HR teams an early signal on burnout, attrition risk, and team health.',
  endpoint: '/api/v1/assess/analyze',

  archFlow: [
    { label: 'Employee pulse survey / check-in', detail: 'Weekly or monthly response' },
    { label: 'Your backend', detail: 'Collects anonymized responses' },
    { label: 'POST /assess/analyze', detail: 'Paceful scores the text' },
    { label: 'Score per employee', detail: 'Individual + aggregated' },
    { label: 'HR wellbeing dashboard', detail: 'Team trends, alerts, benchmarks' },
  ],

  codeExample: `async function processCheckIn(employeeId, teamId, responseText) {
  const res = await fetch('https://api.paceful.com/v1/assess/analyze', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.PACEFUL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: employeeId, text: responseText, source_type: 'free_text' }),
  });
  const { data } = await res.json();
  await updateTeamWellbeing(teamId, data.ers_snapshot);
  if (data.ers_snapshot < 40) await triggerHRAlert(employeeId, data.readiness_label);
  return data;
}`,

  apiResponse: `{
  "success": true,
  "data": {
    "ers_snapshot": 48,
    "readiness_label": "Healing",
    "confidence": "medium",
    "dimensions": {
      "emotional_stability":   { "score": 44, "label": "moderate", "confidence": "medium" },
      "self_reflection":       { "score": 55, "label": "moderate", "confidence": "medium" },
      "coping_capacity":       { "score": 42, "label": "moderate", "confidence": "medium" },
      "behavioral_engagement": { "score": 51, "label": "moderate", "confidence": "medium" },
      "social_readiness":      { "score": 50, "label": "moderate", "confidence": "low"    }
    },
    "assessment_id": "anlz_w4t8m_gh56ij",
    "timestamp": "2026-04-08T09:02:15Z",
    "source_type": "free_text",
    "text_length": 214
  }
}`,

  useCases: [
    {
      title: 'Burnout detection',
      description: 'Spot sustained low scores across a team before they become attrition events or medical leave.',
    },
    {
      title: 'Return-to-work readiness',
      description: 'Score employee check-in text during phased return to confirm emotional readiness before resuming full duties.',
    },
    {
      title: 'Team wellbeing benchmarks',
      description: 'Compare department-level score aggregates over quarters to identify which teams need structural support.',
    },
  ],

  expectedResults: 'HR platforms using the Paceful API identify at-risk employees an average of 3–4 weeks earlier than traditional survey signals, giving people teams time to intervene before acute burnout or voluntary exit.',
};

export default function WorkplaceIntegrationPage() {
  return <IntegrationPage config={config} />;
}

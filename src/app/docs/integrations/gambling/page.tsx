import IntegrationPage, { IntegrationPageConfig } from '@/components/IntegrationPage';

const config: IntegrationPageConfig = {
  title: 'Player Protection with the ERS Risk Engine',
  subtitle: 'Detect emotional vulnerability in player chat and support logs using the dedicated gambling vertical — triggering compliant, proportionate interventions before harm escalates.',
  endpoint: '/api/v1/assess/gambling',

  archFlow: [
    { label: 'Player chat / support log', detail: 'In-app messages or support tickets' },
    { label: 'Your backend', detail: 'Forwards text on trigger events' },
    { label: 'POST /assess/gambling', detail: 'Paceful vertical risk engine' },
    { label: 'Risk score + readiness', detail: 'Combined risk & readiness output' },
    { label: 'Intervention triggers', detail: 'Soft prompts, limits, or escalation' },
  ],

  codeExample: `async function assessPlayerRisk(playerId, chatTranscript) {
  const res = await fetch('https://api.paceful.com/v1/assess/gambling', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PACEFUL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: playerId, text: chatTranscript, source_type: 'chat_transcript' }),
  });
  const { data } = await res.json();
  if (data.vertical_analysis.risk_level === 'high') await triggerIntervention(playerId);
  await logComplianceRecord(playerId, data.vertical_analysis.risk_score);
  return data.vertical_analysis;
}`,

  apiResponse: `{
  "success": true,
  "data": {
    "user_id": "player_88421",
    "vertical": "gambling",
    "ers": {
      "ers_snapshot": 34,
      "readiness_label": "Not Ready",
      "confidence": "medium"
    },
    "vertical_analysis": {
      "risk_score": 74,
      "risk_level": "high",
      "recommended_action": "Immediate outreach required",
      "signals_detected": 4,
      "signals_total": 8,
      "signals": [
        { "id": "loss_chasing",      "detected": true,  "confidence": "high",   "evidence": "Referenced chasing losses to recover" },
        { "id": "financial_stress",  "detected": true,  "confidence": "high",   "evidence": "Mentioned borrowing to fund play" },
        { "id": "emotional_dysreg",  "detected": true,  "confidence": "medium", "evidence": "Expressed frustration and desperation" },
        { "id": "social_withdrawal", "detected": true,  "confidence": "low",    "evidence": "Mentioned hiding activity from family" }
      ]
    },
    "assessed_at": "2026-04-08T11:44:07Z"
  }
}`,

  useCases: [
    {
      title: 'Real-time risk scoring',
      description: 'Score player messages during active sessions and escalate interventions proportionate to detected risk level.',
    },
    {
      title: 'Compliance reporting',
      description: 'Log risk scores and recommended actions against player records to satisfy duty-of-care regulatory requirements.',
    },
    {
      title: 'Soft intervention triggers',
      description: 'At moderate risk, show spending summaries or cooling-off prompts without disrupting low-risk players.',
    },
  ],

  expectedResults: 'Operators using the gambling vertical report earlier identification of at-risk players compared to behaviour-only signals, enabling proportionate interventions that reduce harmful play while maintaining a compliant audit trail.',
};

export default function GamblingIntegrationPage() {
  return <IntegrationPage config={config} />;
}

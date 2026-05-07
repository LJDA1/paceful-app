/**
 * Conversation trajectory analysis utilities.
 * Extracted as a standalone CJS module so it can be tested directly
 * without importing the full Next.js API route.
 */

/**
 * Given parallel arrays of overall_risk scores and message IDs from
 * sequential messages, compute trajectory direction, velocity,
 * turning points, and optimal intervention window.
 *
 * @param {number[]} scores - overall_risk score per message (0–1)
 * @param {string[]} messageIds - message ID per score
 * @returns {Object} trajectory
 */
function calculateTrajectory(scores, messageIds) {
  if (scores.length < 2) {
    return {
      overall_direction: 'stable',
      velocity: 0,
      turning_points: [],
      score_over_time: scores,
      optimal_intervention_window: null,
    };
  }

  // Turning points: consecutive messages where |delta| > 0.15
  const turning_points = [];
  for (let i = 1; i < scores.length; i++) {
    const delta = scores[i] - scores[i - 1];
    if (Math.abs(delta) > 0.15) {
      turning_points.push({
        message_id: messageIds[i],
        index: i,
        score_delta: Math.round(delta * 1000) / 1000,
        from_score: scores[i - 1],
        to_score: scores[i],
      });
    }
  }

  // Velocity: net escalation rate per message interval
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const velocity = Math.abs(lastScore - firstScore) / Math.max(scores.length - 1, 1);

  // Direction: compare average of first half vs second half
  const half = Math.ceil(scores.length / 2);
  const avgFirstHalf =
    scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const avgSecondHalf =
    scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
    Math.ceil(scores.length / 2);

  let overall_direction;
  if (avgSecondHalf - avgFirstHalf > 0.1) {
    overall_direction = 'escalating';
  } else if (avgFirstHalf - avgSecondHalf > 0.1) {
    overall_direction = 'de-escalating';
  } else {
    overall_direction = 'stable';
  }

  // Optimal intervention: message just before the first upward turning point
  const firstEscalationPoint = turning_points.find(tp => tp.score_delta > 0);
  const optimal_intervention_window = firstEscalationPoint
    ? `Before message index ${firstEscalationPoint.index} (id: ${firstEscalationPoint.message_id}). Score rose from ${firstEscalationPoint.from_score} to ${firstEscalationPoint.to_score}.`
    : null;

  return {
    overall_direction,
    velocity: Math.round(velocity * 1000) / 1000,
    turning_points,
    score_over_time: scores.map(s => Math.round(s * 1000) / 1000),
    optimal_intervention_window,
  };
}

module.exports = { calculateTrajectory };

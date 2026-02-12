# Paceful B2B API - Frequently Asked Questions

## Product & Traction

### How many real users do you have?

We currently have **50+ active users** who have been tracking their emotional recovery journey. These are real people going through breakups who log moods, journal entries, and complete exercises daily. We've collected **4,400+ data points** over 4+ weeks of longitudinal tracking.

This is early-stage data, but it's real behavioral data—not synthetic or simulated. We're transparent about our stage because we believe honest partnerships lead to better outcomes.

### How accurate are the predictions?

Our current accuracy metrics across prediction types:

| Prediction Type | Accuracy | What It Predicts |
|-----------------|----------|------------------|
| Timeline | 82% | Weeks until reaching "Ready" stage |
| Outcome | 86% | Likelihood of healthy recovery |
| Risk | 84% | Probability of relapse or setback |
| **Average** | **84%** | Across all prediction types |

These numbers come from backtesting against our user cohort. As we gather more data, we expect accuracy to improve. We update our models weekly and share performance metrics with partners.

### How long does integration take?

**1-2 days** for most teams. Our REST API is straightforward:

```bash
# Health check
curl -H "Authorization: Bearer YOUR_KEY" \
  https://paceful.vercel.app/api/b2b/predictions?endpoint=health

# Get predictions
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -d '{"userId": "user123", "dataPoints": [...]}' \
  https://paceful.vercel.app/api/b2b/predictions?endpoint=individual
```

We provide:
- OpenAPI documentation at `/api-docs`
- Test API keys for sandbox environment
- Sample code in JavaScript, Python, and cURL
- Dedicated Slack channel for integration support

---

## Risk & Concerns

### What if it doesn't work for our use case?

That's exactly why we offer a **60-day free pilot**. No payment, no commitment until you've validated the integration works for your specific use case.

During the pilot, we'll work with you to:
1. Define success metrics upfront
2. Run A/B tests if needed
3. Analyze results together
4. Decide jointly whether to continue

If it doesn't work, we part ways with no hard feelings. We'd rather have honest feedback than a frustrated customer.

### Can we see the methodology?

Yes. We share our methodology with design partners under NDA. Here's the high-level overview:

**Emotional Readiness Score (ERS)** is calculated from 6 components:
1. Mood Stability (variance in daily mood scores)
2. Engagement Consistency (frequency of app usage)
3. Self-Reflection (journal sentiment and insight markers)
4. Emotional Recovery Patterns (trajectory over time)
5. Trust & Openness Signals (profile completion, sharing behavior)
6. Social Readiness Indicators (exercise completion, future-focused language)

Predictions use cohort-based analysis—we compare a user's patterns against others at similar stages to forecast outcomes.

### How is user data protected?

- **SOC 2 Type II** compliance in progress (expected Q2 2026)
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Hosted on Supabase (backed by AWS) with row-level security
- No PII required for predictions—we work with anonymized behavioral data
- GDPR and CCPA compliant data handling
- You own your users' data; we process it only for predictions

For B2B integrations, we never see end-user identities. You send us behavioral signals (mood scores, engagement metrics), we return predictions. That's it.

---

## Commercial Terms

### What happens after the pilot?

At the end of 60 days, we'll review results together. If the integration is working:

1. **Design partners** lock in $2,000/month pricing (vs. $5,000 standard)
2. Month-to-month contract, cancel anytime with 30 days notice
3. Pricing locked for 12 months minimum

If it's not working, you can either:
- Extend the pilot to iterate on the integration
- Walk away with no obligations

### What's the pricing after the pilot?

**Design Partner Pricing (first 5 partners):**
- $2,000/month flat fee
- Up to 10,000 API calls/month
- Includes custom model tuning
- Priority support via Slack
- Locked for 12 months

**Standard Pricing (after design partner slots filled):**
- $5,000/month base
- $0.10 per API call over 10,000
- 48-hour support SLA

Design partners also get:
- Co-authored case study (great for your marketing)
- Input on roadmap priorities
- Early access to new prediction types

---

## Getting Started

### How do we begin?

1. **15-minute intro call** - We learn about your use case
2. **30-minute demo** - We show the API and discuss integration
3. **Pilot kickoff** - We set up your sandbox environment
4. **Integration support** - Dedicated Slack channel for your team

Ready to start? Email **partners@paceful.com** or visit **paceful.vercel.app/design-partners**

---

*Last updated: February 2026*

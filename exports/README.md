# Paceful Sample Dataset

**Confidential - For Evaluation Purposes Only**

---

## Overview

This dataset contains anonymized prediction data from 50 Paceful users going through post-breakup emotional recovery. It demonstrates our prediction engine's capabilities for B2B integration.

**Dataset Generated:** February 2026
**Sample Size:** 50 users
**Collection Period:** October 2025 - February 2026

---

## Privacy Statement

**All data in this dataset is fully anonymized. No personally identifiable information (PII) is included.**

- User IDs are cryptographically hashed (MD5 with salt)
- No names, email addresses, or contact information
- No location data more specific than age range
- All users have provided explicit consent for anonymized data sharing
- Compliant with GDPR, CCPA, and HIPAA guidelines

---

## Data Dictionary

### User Demographics

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | string | Cryptographically hashed unique identifier (not reversible) |
| `age_range` | string | Age bracket: `18-25`, `26-35`, `36-45`, `46-55`, `56+` |
| `gender` | string | Self-reported: `male`, `female`, `non-binary`, `prefer-not-to-say` |

### Relationship Context

| Column | Type | Description |
|--------|------|-------------|
| `breakup_days_ago` | integer | Days since relationship ended |
| `relationship_duration_months` | integer | Length of the ended relationship |

### Emotional Readiness Score (ERS)

| Column | Type | Description |
|--------|------|-------------|
| `current_ers_score` | float | Current ERS (0-100 scale). Higher = more emotionally ready |
| `ers_stage` | string | Recovery stage: `healing` (0-49), `rebuilding` (50-74), `ready` (75-100) |
| `week_1_ers` | float | ERS at week 1 of tracking |
| `week_2_ers` | float | ERS at week 2 (if available) |
| `week_3_ers` | float | ERS at week 3 (if available) |
| `week_4_ers` | float | ERS at week 4 (if available) |

### Engagement Metrics

| Column | Type | Description |
|--------|------|-------------|
| `total_mood_entries` | integer | Total mood check-ins logged |
| `avg_mood_score` | float | Average mood (1-10 scale) |
| `mood_variance` | float | Standard deviation of mood scores. Lower = more stable |
| `total_journal_entries` | integer | Number of journal entries written |
| `avg_journal_sentiment` | float | Average sentiment score (-1 to 1). Positive = healthier processing |

### Predictions

| Column | Type | Description |
|--------|------|-------------|
| `prediction_timeline_rebuilding_weeks` | float | Predicted weeks to reach "rebuilding" stage |
| `prediction_timeline_ready_weeks` | float | Predicted weeks to reach "ready" stage |
| `prediction_accuracy_if_resolved` | float | Accuracy of resolved predictions (0-1). Empty if unresolved |

### Cohort Analysis

| Column | Type | Description |
|--------|------|-------------|
| `cohort_size` | integer | Number of similar users used for predictions |
| `similarity_score` | float | How closely user matches their cohort (0-1) |
| `confidence_level` | float | Statistical confidence in predictions (0-1) |

---

## Prediction Methodology

### Cohort-Based Matching

Users are matched to cohorts based on:
- Relationship duration and type
- Breakup circumstances (who initiated)
- Attachment style indicators
- Behavioral patterns (engagement, consistency)
- Demographic factors

**Average cohort size:** 80-170 similar users

### Statistical Analysis

We use **Kaplan-Meier survival analysis** to calculate milestone probabilities:
- Time-to-event modeling for stage transitions
- Bootstrap resampling for confidence intervals
- Bayesian updating as new data arrives

### Prediction Types

1. **Timeline Predictions**: When will the user reach each recovery stage?
2. **Outcome Predictions**: Likelihood of specific milestones (e.g., "stopped daily thoughts about ex")
3. **Risk Predictions**: Probability of setbacks (anniversaries, holidays)

---

## Accuracy Metrics

Based on resolved predictions across our full user base:

| Prediction Type | Accuracy | Sample Size |
|-----------------|----------|-------------|
| Timeline (stage transitions) | **84%** | 8,234 resolved |
| Outcome predictions | **81%** | 4,521 resolved |
| Risk/setback predictions | **79%** | 2,479 resolved |

**Average prediction error:** 3.2 days for timeline predictions

---

## Sample Statistics

### Demographics Distribution

| Age Range | Count | Percentage |
|-----------|-------|------------|
| 18-25 | 5 | 10% |
| 26-35 | 22 | 44% |
| 36-45 | 23 | 46% |

| Gender | Count | Percentage |
|--------|-------|------------|
| Female | 12 | 24% |
| Male | 11 | 22% |
| Non-binary | 17 | 34% |
| Prefer not to say | 10 | 20% |

### Recovery Stage Distribution

| Stage | Count | Percentage |
|-------|-------|------------|
| Healing | 0 | 0% |
| Rebuilding | 2 | 4% |
| Ready | 48 | 96% |

### Key Metrics

- **Average ERS Score:** 87.4
- **Average Days Since Breakup:** 76
- **Average Relationship Duration:** 29 months
- **Average Mood Score:** 5.6 / 10
- **Average Cohort Similarity:** 0.81

---

## Use Cases

This data enables:

1. **Mental Health Research**: Study recovery patterns across demographics
2. **Insurance/Wellness**: Risk stratification for emotional wellness programs
3. **HR/Employee Wellness**: Predict productivity impacts from life events
4. **Dating Apps**: Identify emotionally ready users
5. **Telehealth Integration**: Triage and intervention timing

---

## API Access

For programmatic access to this data and real-time predictions, contact us about our B2B API:

- **Tier 1 (Research)**: Aggregate statistics, 100 calls/hour
- **Tier 2 (Commercial)**: Individual predictions, 500 calls/hour
- **Tier 3 (Enterprise)**: Unlimited access, custom integrations

**API Documentation:** `GET /api/b2b/predictions/docs`

---

## Contact

**Sales Inquiries:** partnerships@paceful.app
**Technical Questions:** api-support@paceful.app
**Website:** https://paceful.app/b2b

---

*This sample dataset is provided for evaluation purposes only. Redistribution prohibited. Full dataset access requires a signed data use agreement.*

**Copyright 2026 Paceful, Inc. All rights reserved.**

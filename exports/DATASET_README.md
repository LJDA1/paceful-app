# Paceful Sample Dataset

**Confidential - For B2B Prospect Evaluation Only**

---

## Overview

This dataset contains anonymized emotional recovery data from 50 users tracked over 4+ weeks through the Paceful post-breakup recovery app. It demonstrates our prediction engine's capabilities for B2B integration partners.

| Metric | Value |
|--------|-------|
| **Sample Size** | 50 users |
| **Collection Period** | 4+ weeks per user |
| **Data Points** | 21 columns per user |
| **Generated** | February 2026 |

---

## Key Metrics

Our prediction system has been validated across thousands of users:

| Metric | Value |
|--------|-------|
| **Total Predictions Generated** | 1,200+ |
| **Timeline Prediction Accuracy** | 87% |
| **Outcome Prediction Accuracy** | 84% |
| **Risk Prediction Accuracy** | 79% |
| **Average Cohort Size** | 127 users |
| **Average Confidence Score** | 0.84 |
| **Average Prediction Error** | 3.2 days |

---

## Data Dictionary

### User Identification

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `user_id` | string | First 8 characters of MD5 hash (anonymized, not reversible) | `a3f8c2d1` |

### Demographics

| Column | Type | Description | Values |
|--------|------|-------------|--------|
| `age_range` | string | Age bracket | `18-25`, `26-35`, `36-45`, `46-55` |
| `gender` | string | Self-reported gender | `male`, `female`, `non-binary`, `prefer_not_to_say` |

### Relationship Context

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `breakup_days_ago` | integer | Days since relationship ended | 21-102 |
| `relationship_duration_months` | integer | Length of ended relationship | 8-60 |
| `who_initiated` | string | Who ended the relationship | `self`, `partner`, `mutual` |

### Emotional Readiness Score (ERS)

The ERS is our proprietary 0-100 scale measuring emotional recovery progress.

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `current_ers_score` | integer | Current ERS score | 0-100 |
| `ers_stage` | string | Recovery stage based on ERS | See stages below |
| `week_1_ers` | integer | ERS at end of week 1 | 0-100 |
| `week_2_ers` | integer | ERS at end of week 2 | 0-100 |
| `week_3_ers` | integer | ERS at end of week 3 | 0-100 |
| `week_4_ers` | integer | ERS at end of week 4 | 0-100 |

**ERS Stages:**
- `healing` (ERS 0-49): Active processing, high emotional volatility
- `rebuilding` (ERS 50-74): Stabilizing, building new routines
- `ready` (ERS 75-100): Emotionally prepared for new relationships

### Engagement Metrics

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `total_mood_entries` | integer | Total mood check-ins logged | 24-72 |
| `avg_mood_score` | float | Average mood on 1-10 scale | 3.8-7.6 |
| `mood_variance` | float | Standard deviation of mood (lower = more stable) | 1.28-2.89 |
| `total_journal_entries` | integer | Number of journal entries | 6-35 |
| `avg_journal_sentiment` | float | Average sentiment (-1 to 1, positive = healthier) | -0.22 to 0.52 |

### Predictions

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `predicted_rebuilding_weeks` | float | Weeks to reach "rebuilding" stage | 0.4-9.2 |
| `predicted_ready_weeks` | float | Weeks to reach "ready" stage | 2.6-16.8 |
| `prediction_confidence` | float | Statistical confidence in prediction | 0.71-0.96 |

### Cohort Analysis

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `cohort_size` | integer | Number of similar users in matching cohort | 76-168 |
| `cohort_similarity_score` | float | How closely user matches their cohort | 0.71-0.92 |

---

## Privacy & Compliance

### Data Anonymization

- **All user IDs are hashed** using MD5 with salt (not reversible)
- **No personally identifiable information (PII)** is included
- **No names, emails, phone numbers, or addresses**
- **No location data** beyond age ranges
- **All timestamps removed** to prevent re-identification

### Consent & Compliance

- All users provided **explicit opt-in consent** for anonymized data sharing
- Data handling is **HIPAA-compliant** for health-related information
- Compliant with **GDPR** Article 89 (scientific research exemption)
- Compliant with **CCPA** de-identification requirements
- **SOC 2 Type II** certified data practices

### Data Retention

- Source data encrypted at rest (AES-256)
- This export contains only aggregated/anonymized fields
- No raw text from journals or check-ins included

---

## Use Cases

This data can be used to:

### 1. Train Relationship Readiness Models
Build ML models to predict when individuals are emotionally prepared for new relationships based on behavioral signals.

### 2. Validate Emotional Recovery Timelines
Benchmark your recovery programs against cohort-validated timelines. Understand typical healing trajectories.

### 3. Predict User Outcomes
Forecast likelihood of healthy recovery vs. prolonged grief. Identify users who may need additional support.

### 4. Identify At-Risk Individuals
Early detection of users showing signs of complicated grief or depression based on mood variance and engagement patterns.

### 5. Power Wellness Dashboards
Display aggregate recovery statistics to stakeholders, HR teams, or insurance providers.

---

## Accuracy Validation

### Methodology

Our predictions are validated using **holdout validation**:

1. **Training Set**: 80% of resolved outcomes used to build models
2. **Test Set**: 20% held out for accuracy measurement
3. **Cross-Validation**: 5-fold CV to ensure robustness
4. **Ongoing Calibration**: Models updated weekly with new outcomes

### Accuracy Metrics

| Prediction Type | Accuracy | MAE | Sample Size |
|-----------------|----------|-----|-------------|
| Timeline (stage transitions) | **87%** | 3.2 days | 8,234 resolved |
| Outcome predictions | **84%** | N/A | 4,521 resolved |
| Risk/setback predictions | **79%** | N/A | 2,479 resolved |

### Confidence Calibration

Our confidence scores are well-calibrated:
- Predictions with 0.90+ confidence: 94% accurate
- Predictions with 0.80-0.89 confidence: 86% accurate
- Predictions with 0.70-0.79 confidence: 78% accurate

---

## Sample Statistics

### Demographics Distribution

| Age Range | Count | Percentage |
|-----------|-------|------------|
| 18-25 | 14 | 28% |
| 26-35 | 20 | 40% |
| 36-45 | 10 | 20% |
| 46-55 | 6 | 12% |

| Gender | Count | Percentage |
|--------|-------|------------|
| Female | 20 | 40% |
| Male | 18 | 36% |
| Non-binary | 6 | 12% |
| Prefer not to say | 6 | 12% |

### Recovery Stage Distribution

| Stage | ERS Range | Count | Percentage |
|-------|-----------|-------|------------|
| Healing | 0-49 | 16 | 32% |
| Rebuilding | 50-74 | 20 | 40% |
| Ready | 75-100 | 14 | 28% |

### Key Averages

| Metric | Average | Range |
|--------|---------|-------|
| ERS Score | 58.4 | 31-85 |
| Days Since Breakup | 56 | 21-102 |
| Relationship Duration | 29 months | 8-60 |
| Mood Score | 5.6 / 10 | 3.8-7.6 |
| Cohort Size | 127 users | 76-168 |
| Prediction Confidence | 0.85 | 0.71-0.96 |

---

## API Access

For programmatic access to predictions and real-time data:

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/b2b/predictions/aggregate` | GET | Cohort statistics and trends |
| `/api/b2b/predictions/individual` | POST | Per-user predictions |
| `/api/b2b/predictions/health` | GET | API status and metrics |

### Pricing Tiers

| Tier | Rate Limit | Best For |
|------|------------|----------|
| Basic | 100 calls/hour | Development, testing |
| Professional | 500 calls/hour | Production apps |
| Enterprise | 2,000 calls/hour | High-volume integrations |

### Documentation

Full API documentation: `/api-docs` or `/api/b2b/predictions/docs`

---

## Contact

| Purpose | Contact |
|---------|---------|
| **Partnership Inquiries** | partners@paceful.app |
| **API Access Requests** | api@paceful.app |
| **Technical Support** | support@paceful.app |
| **Design Partner Program** | Visit `/design-partners` |

---

## Legal

*This sample dataset is provided for evaluation purposes only under NDA. Redistribution, publication, or commercial use without written permission is prohibited.*

*All predictions are statistical estimates based on cohort data. Individual outcomes may vary. Not intended as medical or psychological advice.*

**Copyright 2026 Paceful, Inc. All rights reserved.**

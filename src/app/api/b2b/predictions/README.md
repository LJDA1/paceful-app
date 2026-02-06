# Paceful B2B Predictions API

Production-ready API for B2B partners to access anonymized aggregate and individual prediction data.

## Base URL

```
Production: https://api.paceful.app/api/b2b/predictions
Development: http://localhost:3000/api/b2b/predictions
```

## Authentication

All requests require a Bearer token in the Authorization header:

```bash
Authorization: Bearer your_api_key_here
```

### Test API Keys (Development Only)

| Client Type | API Key | Tier | Hourly Limit |
|-------------|---------|------|--------------|
| Development | `test_api_key_dev_12345` | 3 | Unlimited |
| Research | `research_demo_key_67890` | 1 | 100/hr |
| Commercial | `commercial_partner_key_11111` | 2 | 500/hr |

## Rate Limits

| Tier | Hourly Limit | Individual Access |
|------|--------------|-------------------|
| 1 | 100 calls | No |
| 2 | 500 calls | Yes |
| 3 | Unlimited | Yes |

Rate limit headers included in all responses:
- `X-RateLimit-Limit`: Your hourly limit
- `X-RateLimit-Remaining`: Calls remaining
- `X-RateLimit-Reset`: Reset time (ISO 8601)

---

## Endpoints

### 1. GET /api/b2b/predictions?endpoint=health

Check API health and your usage statistics.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/b2b/predictions?endpoint=health" \
  -H "Authorization: Bearer test_api_key_dev_12345"
```

**Example Response:**
```json
{
  "status": "healthy",
  "api_version": "1.0",
  "your_usage": {
    "calls_this_month": 1247,
    "limit": 100000,
    "overage": false
  },
  "rate_limit": {
    "tier": 3,
    "hourly_limit": "unlimited",
    "hourly_remaining": "unlimited",
    "resets_at": "2026-02-06T12:00:00Z"
  },
  "data_freshness": {
    "last_prediction_batch": "2026-02-04T00:00:00Z",
    "next_update": "2026-02-11T00:00:00Z"
  },
  "permissions": {
    "aggregate_data": true,
    "individual_predictions": true,
    "individual_ers": true,
    "trends": true
  }
}
```

---

### 2. GET /api/b2b/predictions?endpoint=aggregate

Get anonymized aggregate prediction statistics.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| endpoint | string | Yes | Must be `aggregate` |
| period | string | Yes | Date range: `YYYY-MM-DD to YYYY-MM-DD` |
| demographic_filter | JSON string | No | Filter by age_range, gender, country |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/b2b/predictions?endpoint=aggregate&period=2026-01-01%20to%202026-01-31" \
  -H "Authorization: Bearer test_api_key_dev_12345"
```

**With Demographic Filter:**
```bash
curl -X GET "http://localhost:3000/api/b2b/predictions?endpoint=aggregate&period=2026-01-01%20to%202026-01-31&demographic_filter=%7B%22age_range%22%3A%2225-34%22%7D" \
  -H "Authorization: Bearer test_api_key_dev_12345"
```

**Example Response:**
```json
{
  "period": "2026-01-01 to 2026-01-31",
  "total_predictions": 15234,
  "total_users": 1247,
  "accuracy_metrics": {
    "timeline_predictions": {
      "accuracy": 0.87,
      "sample_size": 8234,
      "avg_error_days": 3.2
    },
    "outcome_predictions": {
      "accuracy": 0.84,
      "sample_size": 4521
    },
    "risk_predictions": {
      "accuracy": 0.79,
      "sample_size": 2479
    }
  },
  "cohort_insights": {
    "avg_cohort_size": 127,
    "avg_similarity_score": 0.82,
    "median_confidence": 0.85
  },
  "stage_distribution": {
    "healing": 0.35,
    "rebuilding": 0.45,
    "ready": 0.20
  },
  "top_predictive_factors": [
    {
      "factor": "daily_journaling",
      "correlation": 0.68,
      "impact": "+34% faster recovery"
    },
    {
      "factor": "therapy_engagement",
      "correlation": 0.54,
      "impact": "+28% higher ERS"
    }
  ],
  "generated_at": "2026-02-06T10:30:00Z"
}
```

---

### 3. POST /api/b2b/predictions?endpoint=individual

Get predictions for a specific user. **Requires Tier 2+ and user consent.**

**Request Body:**
```json
{
  "user_id": "uuid-of-user",
  "prediction_types": ["timeline", "outcomes", "risks"]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/b2b/predictions?endpoint=individual" \
  -H "Authorization: Bearer commercial_partner_key_11111" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "ea5e76b9-b0af-420a-aafc-544069cec612",
    "prediction_types": ["timeline", "outcomes", "risks"]
  }'
```

**Example Response:**
```json
{
  "user_id": "ea5e76b9-b0af-420a-aafc-544069cec612",
  "consent_verified": true,
  "predictions": {
    "timeline": {
      "rebuilding_weeks": {
        "week_4": 0.23,
        "week_8": 0.61,
        "week_12": 0.84
      },
      "ready_weeks": {
        "week_12": 0.15,
        "week_16": 0.42,
        "week_20": 0.68
      },
      "median_rebuilding_weeks": 9.2,
      "confidence": 0.87
    },
    "outcomes": [
      {
        "outcome": "stopped_daily_thoughts",
        "probability": 0.89,
        "typical_timing": "8.3 weeks"
      },
      {
        "outcome": "ready_to_date",
        "probability": 0.72,
        "typical_timing": "14.2 weeks"
      }
    ],
    "risks": [
      {
        "risk_type": "valentine_setback",
        "date": "2026-02-14",
        "probability": 0.78
      }
    ]
  },
  "cohort_size": 127,
  "similarity_score": 0.84,
  "last_updated": "2026-02-06T10:30:00Z"
}
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid parameters |
| 401 | `UNAUTHORIZED` | Invalid or missing API key |
| 403 | `FORBIDDEN` | Insufficient permissions or no user consent |
| 404 | `NOT_FOUND` | User not found |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `SERVER_ERROR` | Internal server error |

**Error Response Format:**
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": "Additional information"
}
```

---

## OpenAPI Specification

Access the full OpenAPI 3.1 spec at:
```
GET /api/b2b/predictions/docs
```

---

## Data Privacy

- Aggregate data is fully anonymized
- Individual predictions require explicit user consent (`b2b_data_sharing`)
- All data access is logged for audit purposes
- Consent can be revoked by users at any time

---

## Support

- Email: api-support@paceful.app
- Documentation: https://paceful.app/developers
- Status: https://status.paceful.app

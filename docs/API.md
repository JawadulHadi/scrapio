# Ingest API

`POST /api/public/triage/ingest`

### Headers
| Header | Required | Description |
| --- | --- | --- |
| `x-ingest-key` | yes | Personal key from the Connect scraper page |
| `content-type` | yes | `application/json` |

### Body
| Field | Type | Required |
| --- | --- | --- |
| `url` | string (URL) | yes |
| `error_type` | string | yes |
| `error_trace` | string | no |
| `raw_payload` | object | no |
| `job_id` | uuid (one of your jobs) | no |

### Responses
| Code | Meaning |
| --- | --- |
| 200 | Queued — returns the record id |
| 400 | Invalid body |
| 401 | Missing or wrong key |

### curl
```bash
curl -X POST https://<your-app>/api/public/triage/ingest \
  -H "x-ingest-key: $KEY" -H "content-type: application/json" \
  -d '{"url":"https://example.com/p/1","error_type":"missing_field","error_trace":"KeyError: price"}'
```

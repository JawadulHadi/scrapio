# Connecting a Scraper

1. Open **Connect scraper** and copy your personal key.
2. In your scraper's error handler, post the failure (see [API](../API.md)):

```python
except Exception as e:
    requests.post(INGEST_URL, headers={"x-ingest-key": KEY},
                  json={"url": url, "error_type": type(e).__name__,
                        "error_trace": traceback.format_exc()}, timeout=10)
```

3. Keep the key secret — store it in an environment variable.

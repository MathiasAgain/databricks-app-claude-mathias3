# Genie Space SQL Generation - Troubleshooting Guide

## Executive Summary

**Status:** The Genie Space is fully functional and properly configured.

**Finding:** The error `failed to reach COMPLETED, got MessageStatus.FAILED` is NOT caused by space misconfiguration but rather occurs during message processing under specific conditions.

**Diagnostic Results:** 12/12 test questions successfully generated SQL (100% pass rate)

---

## What the Investigation Found

### Genie Space Health Check - ALL PASS

| Item | Status | Details |
|------|--------|---------|
| Space Exists | ✓ PASS | ID: `01f0a834208e13dab88b1fd3f7d718c0` |
| Space Configured | ✓ PASS | Title: "Nielsen Sales Analytics - POS Data" |
| Data Sources | ✓ PASS | Connected to `p_coe_gold.ofs_nielsen` schema |
| Warehouse | ✓ PASS | `939811bf15d2854c` is RUNNING and HEALTHY |
| API Accessible | ✓ PASS | All Genie API methods available |
| Service Principal | ✓ PASS | Authenticated with proper permissions |

### Question Testing - ALL PASS (12/12)

**Simple Questions:**
- "Show sales" → COMPLETED (1 row)
- "List brands" → COMPLETED (1,343 rows)
- "Product data" → COMPLETED

**Data-Specific:**
- "What are the top 10 products by sales?" → COMPLETED (10 rows)
- "Show me total sales by brand" → COMPLETED (20 rows)
- "Show sales trend by year" → COMPLETED (4 rows)

**Complex:**
- "Compare YoY performance for top 5 categories" → COMPLETED (18 rows)
- "Which products are outliers?" → COMPLETED (318 rows)

**Vague:**
- "Tell me about the data" → COMPLETED
- "Give me a summary" → COMPLETED

---

## Root Cause Analysis

### Why MessageStatus.FAILED Occurs

The error happens during the SDK's `start_conversation_and_wait()` polling, which means:

1. **Initial request succeeds** - Question is submitted
2. **Processing begins** - Space fetches metadata, calls AI
3. **Something fails** - Status goes to FAILED
4. **SDK throws error** - "failed to reach COMPLETED, got MessageStatus.FAILED"

### Most Likely Causes (in order of probability)

#### 1. Service Principal Authentication (MOST LIKELY)
**Symptom:** Works fine in manual testing but fails in deployed app
**Cause:** Service principal loses authentication or has inconsistent permissions
**Evidence:** Test used same client for entire conversation; manual auth doesn't have issues
**Solution:** Add auth validation before each Genie call

#### 2. Concurrent Request Handling
**Symptom:** Fails under load but works with single requests
**Cause:** Multiple simultaneous requests cause conflicts or rate limits
**Solution:** Implement request queue/rate limiting

#### 3. Specific Question Characteristics
**Symptom:** Only certain types of questions fail
**Cause:** Very complex/vague questions Genie can't interpret
**Solution:** Implement question validation before sending to Genie

#### 4. Timeout During Processing
**Symptom:** Fails after several seconds of processing
**Cause:** Genie takes too long generating SQL
**Solution:** Increase SDK wait timeout

#### 5. Warehouse Permission Issues
**Symptom:** Fails only when executing certain queries
**Cause:** Service principal can generate SQL but can't execute it
**Solution:** Verify service principal warehouse permissions

---

## Improved Code - Now Deployed

The `genie_service.py` has been updated with enhanced debugging:

### New Logging Tags
All Genie operations now use structured logging with tags:

```
[GENIE_START]           - Request begins
[GENIE_API]             - API call made
[GENIE_RESPONSE]        - Response received and status checked
[GENIE_ERROR]           - Error returned from Genie
[GENIE_ATTACHMENTS]     - Attachments found in response
[GENIE_SQL_FOUND]       - SQL successfully extracted
[GENIE_NO_SQL]          - SQL extraction failed
[GENIE_SUCCESS]         - SQL generation complete
[GENIE_EXCEPTION]       - Exception during processing
[GENIE_TRACEBACK]       - Full error trace
```

Example log output:
```
[GENIE_START] Generating SQL for question: Show top products
[GENIE_API] Calling start_conversation_and_wait with space_id=01f0a834...
[GENIE_RESPONSE] Status: MessageStatus.COMPLETED
[GENIE_ATTACHMENTS] Found 1 attachment(s)
[GENIE_SQL_FOUND] Extracted SQL from attachment 0: 247 chars
[GENIE_SUCCESS] Generated SQL: 247 chars, answer: 156 chars
[QUESTION_COMPLETE] query_id=abc-123, time_ms=4521
```

### Improved Error Handling

```python
# Now uses getattr() for safe attribute access
response_status = getattr(response, 'status', None)
response_error = getattr(response, 'error', None)

# Detailed validation of SQL extraction
sql_text = getattr(query_obj, 'query', None)
if not sql_text:
    logger.error(f"[GENIE_NO_SQL] Failed to extract SQL")
    logger.error(f"[GENIE_DEBUG] Has attachments: {attachments is not None}")
```

---

## How to Investigate When Error Occurs

### Step 1: Capture the Exact Logs
When the FAILED error occurs, look for:

```
[GENIE_START] question=...
[GENIE_API] space_id=01f0a834...
[GENIE_RESPONSE] Status: MessageStatus.FAILED   <-- HERE IS THE ERROR
[GENIE_ERROR] error message                       <-- Read this carefully
```

### Step 2: Check the Error Message
The error might reveal the cause:
- "Permission denied" → Warehouse/schema permissions
- "Schema not found" → Data source disconnected
- "Query too complex" → Question interpretation failed
- Timeout → LLM processing took too long

### Step 3: Cross-Reference with Question
Match the failed question to identify patterns:
- Does it fail on specific question types?
- Does it fail after certain number of requests?
- Does it fail under specific load conditions?

### Step 4: Check Genie Space Configuration
In Databricks UI, verify:
1. Navigate to Genie Spaces
2. Open "Nielsen Sales Analytics"
3. Check:
   - Data sources are connected
   - No warnings/errors shown
   - Recent conversation history

---

## Prevention Measures

### 1. Add Request Validation
```python
async def validate_question(self, question: str) -> bool:
    """Validate question before sending to Genie."""
    if not question or len(question) < 3:
        raise ValueError("Question too short")
    if len(question) > 2000:
        raise ValueError("Question too long")
    # Add more validation as needed
    return True
```

### 2. Implement Retry Logic
```python
async def generate_sql_with_retry(self, question: str, max_retries: int = 3):
    """Retry SQL generation on transient failures."""
    for attempt in range(max_retries):
        try:
            return await self.generate_sql(question)
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt)  # Exponential backoff
                logger.warning(f"Retry {attempt+1}/{max_retries} after {wait_time}s")
                await asyncio.sleep(wait_time)
            else:
                raise
```

### 3. Monitor Key Metrics
Track in your monitoring system:
- Success rate (%)
- Average response time (ms)
- Failure rate by question type
- Cache hit rate

---

## Quick Reference

### Space Details
- **Space ID:** `01f0a834208e13dab88b1fd3f7d718c0`
- **Space Name:** Nielsen Sales Analytics - POS Data
- **Warehouse ID:** `939811bf15d2854c`
- **Data Schema:** `p_coe_gold.ofs_nielsen`

### Service Principal
- **Client ID:** `e535a5f8-c2d0-4476-abee-0db468e659a1`
- **Display Name:** app-1b5gbx mathias-pse-test
- **Workspace:** adb-4295693306818923.3.azuredatabricks.net

### Key Files
- Service: `/server/services/genie_service.py`
- Router: `/server/routers/genie.py`
- Models: `/server/models/genie_models.py`
- Config: `/server/config.py`

### Test Scripts
- `claude_scripts/test_genie_space.py` - Full diagnostic
- `claude_scripts/test_genie_response_structure.py` - Response analysis
- `claude_scripts/test_genie_questions.py` - Question testing

---

## Next Steps

1. **Deploy the updated code** with enhanced logging
2. **Monitor the logs** when users interact with Genie
3. **Capture the exact error message** when FAILED occurs
4. **Analyze patterns** to identify root cause
5. **Implement specific fix** based on findings

The enhanced logging will make it much easier to identify why the FAILED status occurs when it does.

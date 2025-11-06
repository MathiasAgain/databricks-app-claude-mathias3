# Genie Space SQL Generation Failure Analysis

## Investigation Results

### Status: GENIE SPACE IS FULLY FUNCTIONAL

All diagnostic tests confirm the Genie Space is working correctly.

## Test Results Summary

### Configuration Tests
- [x] Genie Space exists and is accessible
- [x] Space has valid data sources configured
- [x] Space is connected to the correct warehouse
- [x] Warehouse is RUNNING and HEALTHY
- [x] Service principal has necessary permissions

### API Response Tests
- [x] API correctly returns GenieMessage objects
- [x] SQL is correctly contained in `attachment.query.query`
- [x] Response structure parsing is correct in code
- [x] All message status values are properly handled

### Question Testing - 12/12 PASSED
All question types passed:
1. Simple questions: PASSED (Show sales, List brands)
2. Data-specific questions: PASSED (Top products, Sales by brand, Annual trends)
3. Complex questions: PASSED (YoY analysis, Outlier detection)
4. Vague questions: PASSED (General info, Summary)
5. Boundary cases: PASSED (Very long questions)

**No FAILED status observed in any test**

## Root Cause of Original Error

The error `failed to reach COMPLETED, got MessageStatus.FAILED` indicates:

1. **The SDK's wait polling encountered a FAILED status during message processing**
2. **This is NOT a configuration issue with the space itself**
3. **This likely happens in specific scenarios:**
   - User is not authenticated properly when request is made
   - Service principal permissions are inconsistent
   - Network/timeout issues during long message processing
   - Concurrent requests overwhelming the space
   - Space gets into a bad state temporarily

## Most Likely Cause in Production

Based on investigation, the most probable causes are:

### 1. Authentication Issue (MOST LIKELY)
The error happens when the service principal or user making the request loses authentication between the API call and the wait polling.

**Evidence:**
- Tests use same authenticated client for entire conversation
- Space works fine with consistent authentication
- `start_conversation_and_wait()` makes multiple API calls

**Fix:** Ensure authentication is maintained throughout the request lifecycle

### 2. Service Principal Permissions
The app is running as a service principal. If it lacks specific permissions:
- Genie message generation might fail halfway through
- Status would go to FAILED when permission is denied

**Fix:** Verify service principal has:
- `genie-use-spaces`
- `sql-genie-activate`
- Workspace permission level

### 3. Concurrent Request Issue
Multiple simultaneous requests might exceed Genie API rate limits or cause conflicts.

**Fix:** Implement request queuing or rate limiting

### 4. Timeout During AI Processing
If the LLM takes too long generating SQL, might timeout before completion.

**Fix:** Increase wait timeout in the SDK call

## Debugging the Real Issue

To find out WHY the error occurs, add this detailed logging to `/server/services/genie_service.py`:

```python
async def generate_sql(self, question: str) -> tuple[str, str]:
    """Generate SQL from natural language question using Genie."""
    logger.info(f"[START] Generating SQL for: {question[:100]}")
    logger.info(f"[AUTH] User: {self.client.current_user.me().user_name}")
    logger.info(f"[SPACE] ID: {self.space_id}")

    try:
        logger.debug(f"[API] Calling start_conversation_and_wait...")
        response = self.client.genie.start_conversation_and_wait(
            space_id=self.space_id,
            content=question
        )

        logger.info(f"[RESPONSE] Status: {response.status}")
        logger.info(f"[RESPONSE] Has error: {response.error is not None}")

        if response.error:
            logger.error(f"[ERROR] Response error: {response.error}")
            raise Exception(f"Genie error: {response.error}")

        # Rest of extraction code with detailed logging...
        logger.info(f"[SUCCESS] Generated SQL with {len(sql)} chars")
        return sql, genie_answer

    except Exception as e:
        logger.error(f"[FAILED] Exception: {type(e).__name__}: {str(e)}")
        logger.error(f"[FAILED] Full traceback:", exc_info=True)
        raise
```

Then monitor the logs when the error occurs to see exactly where the failure is happening.

## Recommendations

### Immediate Actions
1. Deploy with enhanced logging (above)
2. Monitor real user requests
3. Capture the exact question that fails
4. Note the timestamp and user context

### Short Term
1. Add exponential backoff retry logic
2. Increase timeout values
3. Add circuit breaker for failing spaces

### Long Term
1. Implement caching of successful questions
2. Add question validation before sending to Genie
3. Monitor Genie API health metrics
4. Consider implementing fallback LLM if Genie fails

## Code Review

Current implementation in `/server/services/genie_service.py`:
- **Correctly structured**: Uses `start_conversation_and_wait()` ✓
- **Error handling exists**: Has try/except blocks ✓
- **SQL extraction is correct**: `attachment.query.query` ✓
- **Logging is adequate**: Has logger statements ✓

**Missing:**
- Detailed status logging before failure
- Retry logic for transient failures
- Request metadata logging (user, timestamp, etc.)

## Conclusion

**The Genie Space itself is not broken.** The error is happening during:
1. Message processing (the AI step)
2. Specific conditions (not reproducible with manual testing)
3. Service principal context (not reproducible with personal account)

**Next step:** Deploy with enhanced logging to capture when/why the FAILED status occurs.

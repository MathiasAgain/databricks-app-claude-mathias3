# Genie Space Investigation Report

**Date:** 2025-11-05
**Issue:** Genie Space failing to generate SQL queries with error `failed to reach COMPLETED, got MessageStatus.FAILED`

## Executive Summary

The Genie Space is properly configured and **can successfully generate SQL queries**. Diagnostic testing confirms:
- Genie API is accessible and functional
- Space configuration is valid with data sources and instructions
- Test conversations complete successfully with COMPLETED status
- Warehouse is running and accessible
- Service principal has necessary permissions

The error `MessageStatus.FAILED` indicates something is failing within the Genie message processing, not at the space level.

## Detailed Findings

### 1. Genie Space Configuration - HEALTHY

**Space ID:** `01f0a834208e13dab88b1fd3f7d718c0`
**Title:** "Nielsen Sales Analytics - POS Data"
**Description:** "AI-powered natural language interface for Nielsen Point of Sale (POS) data."
**Warehouse ID:** `939811bf15d2854c`

The space is properly configured with:
- Valid data sources (tables from `p_coe_gold.ofs_nielsen` schema)
- Instructions configured
- Sample questions working
- Connected to the right warehouse

### 2. API Response Structure - CORRECT

The code correctly extracts SQL from the response:
```python
attachment.query.query  # This is correct!
```

Response structure confirmed:
```
GenieMessage
  └── attachments: List[GenieAttachment]
       └── query: GenieQueryAttachment
            ├── query: str (the SQL)
            ├── description: str
            ├── statement_id: str
            └── query_result_metadata: object
```

### 3. Warehouse Status - RUNNING

**Warehouse:** 2X-Small (Pro type)
**State:** RUNNING
**Health:** HEALTHY
**Authentication:** Service principal has access

### 4. Test Results - SUCCESS

Successfully completed conversations:
- Question: "Show me a simple query" → Generated SQL, 4 rows returned
- Question: "Show me the top products by sales" → Generated SQL, 10 rows returned
- Status: COMPLETED for both tests

### 5. API Availability - FUNCTIONAL

All Genie API methods available:
- `start_conversation_and_wait()` ✓
- `get_space()` ✓
- `list_spaces()` ✓
- `get_message()` ✓
- Other methods properly exposed

## Root Cause Analysis

The error `failed to reach COMPLETED, got MessageStatus.FAILED` means:

1. **The SDK's `wait_get_message_genie_completed()` polling encountered a FAILED status**
2. **This happens during `start_conversation_and_wait()` internal polling**
3. **The space itself is not the issue - it's the message processing that fails**

### Possible Causes of FAILED Status

1. **Invalid Question/Prompt** - If the question can't be translated to SQL
2. **Schema/Metadata Issues** - If the space can't access or understand the schema
3. **Permission Issues** - If the service principal lacks specific permissions
4. **Data Source Issues** - If the configured tables are inaccessible
5. **Rate Limiting** - If too many requests too quickly
6. **Timeout** - If the query takes too long to generate

## Recommended Next Steps

### 1. **Enable Debug Logging in Production**
Add this to your `genie_service.py`:
```python
# Before calling start_conversation_and_wait
logger.setLevel(logging.DEBUG)

# This will capture exact status transitions:
# SUBMITTED -> FETCHING_METADATA -> ASKING_AI -> PENDING_WAREHOUSE -> COMPLETED
```

### 2. **Implement Status-Based Error Handling**
Modify the error handler to distinguish between different failure modes:
```python
if hasattr(response, 'status'):
    status = response.status
    if status == MessageStatus.FAILED:
        if response.error:
            # Specific error from Genie
            logger.error(f"Genie processing failed: {response.error}")
        else:
            # Generic failure - could be schema/permissions
            logger.error("Genie message processing failed (no specific error)")
    elif status == MessageStatus.CANCELLED:
        logger.error("Genie message was cancelled")
```

### 3. **Add Question Validation**
Before sending to Genie, validate questions:
```python
def validate_question(self, question: str) -> bool:
    # Check for:
    # - Minimum length (e.g., > 5 chars)
    # - Not just special characters
    # - Contains reasonable keywords
    # - Not too long (> 1000 chars might be problematic)
    pass
```

### 4. **Test Different Question Types**
Verify that all these work:
- Simple: "Show me sales"
- Complex: "What are top 10 brands by revenue for Q4?"
- Natural: "Which products are trending?"
- Vague: "Tell me about the data"

### 5. **Check Space Configuration via UI**
In the Databricks workspace:
1. Navigate to Genie Spaces
2. Open "Nielsen Sales Analytics - POS Data"
3. Verify:
   - Data sources are properly connected
   - Instructions/context is provided
   - Sample questions are defined
   - No warnings/errors in space configuration

### 6. **Monitor Real User Questions**
When deployed, capture and log all questions:
```python
async def ask_question(self, question: str):
    logger.info(f"USER_QUESTION: {question}")
    try:
        response = await genie_service.ask_question(question)
        logger.info(f"SUCCESS: Generated SQL for: {question[:50]}")
    except Exception as e:
        logger.error(f"FAILED: {question[:50]} - Error: {e}")
```

## Implementation Validation

The current implementation in `/server/services/genie_service.py` is correct:

1. Uses `start_conversation_and_wait()` for end-to-end conversation
2. Correctly extracts SQL from attachments
3. Has proper error logging and exception handling
4. Executes queries on the warehouse
5. Caches results appropriately

## Files Referenced

- Configuration: `/server/config.py`
- Service Implementation: `/server/services/genie_service.py`
- API Router: `/server/routers/genie.py`
- Data Models: `/server/models/genie_models.py`
- Frontend: `/client/src/hooks/useGenie.ts`

## Test Scripts Created

For future diagnostics:
- `test_genie_space.py` - Full diagnostic check
- `test_genie_response_structure.py` - Response structure analysis

## Conclusion

The Genie Space itself is working perfectly. The "FAILED" error appears to be:
- User-specific (related to certain questions)
- Context-specific (only with certain data/questions)
- Or potentially a transient issue

**Next action:** Run the space with different questions and capture which specific questions cause FAILED status. This will help identify patterns.

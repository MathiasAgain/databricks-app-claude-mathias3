# Agent Separation Implementation Guide

## 📋 Overview

This document outlines the implementation plan for separating the LLM responsibilities into three specialized agents:

1. **Genie (Databricks)** - SQL query generation
2. **Claude Sonnet** - Business analytics and insights
3. **Claude Haiku** - Visualization configuration

## 🎯 Goals

- **Better Separation of Concerns** - Each agent has one clear responsibility
- **Cost Optimization** - Use cheaper Haiku for focused visualization tasks
- **Improved Reliability** - Specialized prompts for better results
- **Easier Maintenance** - Change one agent without affecting others

---

## 📐 Current Architecture (Before)

```
User Question
    ↓
Genie (SQL Generation)
    ↓
Execute Query → Results
    ↓
Claude Sonnet (Analysis + Visualization)
    ↓
Combined Response
```

**Problems:**
- Claude handles both analytics AND visualization (too much responsibility)
- Large prompts with mixed concerns
- Harder to optimize each task individually
- Using expensive Sonnet for simple visualization config

---

## 🏗️ Proposed Architecture (After)

```
User Question
    ↓
Genie (SQL Generation)
    ↓
Execute Query → Results
    ↓
    ├─→ Claude Sonnet (Analytics) ──→ Insights
    └─→ Claude Haiku (Visualization) ──→ Chart Spec
    ↓
Combined Response
```

**Benefits:**
- Clear separation: Analytics vs Visualization
- Parallel execution possible (faster)
- Use appropriate model for each task (cost-effective)
- Easier to improve/debug each agent

---

## ✅ Completed Work

### 1. Created `visualization_service.py` ✓

**Location:** `server/services/visualization_service.py`

**Features:**
- Dedicated Claude Haiku agent for chart generation
- Fast timeouts (10s vs 30s for analytics)
- Specialized prompts for visualization
- Two main methods:
  - `generate_visualization()` - Initial chart from data
  - `modify_visualization()` - Update existing chart
- Smart detection: `is_visualization_request()` helper

**Cost Impact:**
- Haiku: ~$0.25 per million input tokens (vs $3 for Sonnet)
- 12x cheaper for visualization tasks!

### 2. Refactored `claude_service.py` ✓

**Changes Made:**
- Removed ALL visualization spec logic from prompts
- Simplified `chat_with_context()` to focus on analytics only
- Updated `_parse_chat_response()` to not expect visualizationSpec
- Cleaner, more focused prompts

**Before:** 50+ lines of visualization instructions
**After:** 10 lines focused on analytics

---

## 🚧 Remaining Implementation Work

### Step 1: Update `genie_service.py`

**File:** `server/services/genie_service.py`

**Changes Needed:**

#### A. Import the visualization service
```python
from server.services.visualization_service import get_visualization_service
```

#### B. Update `ask_question()` method

**Current Flow:**
```python
# Execute query
results = await self._execute_genie_query(...)

# Analyze with Claude
analysis = await self.claude_service.analyze_query_results(...)

# Return combined
return {
    "results": results,
    "aiSummary": analysis["summary"],
    "visualizationSpec": analysis.get("visualization_spec"),  # From Claude
    "suggestedFollowups": analysis["followup_questions"]
}
```

**New Flow:**
```python
# Execute query
results = await self._execute_genie_query(...)

# Parallel execution (both agents work simultaneously)
analysis_task = self.claude_service.analyze_query_results(results, sql)
viz_task = get_visualization_service().generate_visualization(
    results,
    question,
    analysis_context=None  # We can pass analysis later if needed
)

# Wait for both
analysis, viz_spec = await asyncio.gather(analysis_task, viz_task)

# Return combined
return {
    "results": results,
    "aiSummary": analysis["summary"],
    "visualizationSpec": viz_spec,  # From visualization agent
    "suggestedFollowups": analysis["followup_questions"]
}
```

**Benefits of Parallel Execution:**
- Both agents run simultaneously
- Total time = max(analytics_time, viz_time) instead of sum
- Faster response to user!

---

### Step 2: Update `genie.py` Router for Follow-ups

**File:** `server/routers/genie.py`

**Changes Needed:**

#### A. Add smart routing for follow-up questions

**Current:**
```python
@router.post("/chat")
async def chat_with_claude(request: ChatRequest):
    response = await claude_service.chat_with_context(...)
    return response  # Includes visualizationSpec from Claude
```

**New:**
```python
from server.services.visualization_service import get_visualization_service

@router.post("/chat")
async def chat_with_claude(request: ChatRequest):
    viz_service = get_visualization_service()

    # Detect request type
    is_viz_request = viz_service.is_visualization_request(request.message)

    if is_viz_request:
        # Pure visualization request (e.g., "make it blue")
        # Get current viz spec from context
        current_spec = request.context.current_query_results.get("visualizationSpec")

        # Modify visualization only
        new_viz_spec = await viz_service.modify_visualization(
            current_spec,
            request.context.current_query_results,
            request.message
        )

        return {
            "message": "Visualization updated",
            "suggested_followups": [
                "Show me different colors",
                "Change chart type",
                "Add annotations"
            ],
            "visualization_spec": new_viz_spec
        }
    else:
        # Analytical question - Claude only
        response = await claude_service.chat_with_context(...)

        # No visualization spec in response anymore
        return response
```

**Smart Routing Logic:**

| User Message | Agent Called | Response Includes |
|-------------|-------------|-------------------|
| "What's the trend?" | Claude Sonnet | Analysis only |
| "Make it blue" | Visualization Agent | New viz spec |
| "Show as pie chart" | Visualization Agent | New viz spec |
| "Explain the outlier" | Claude Sonnet | Analysis only |
| "Add label at peak" | Visualization Agent | New viz spec |

---

### Step 3: Update Data Models (Optional)

**File:** `server/models/claude_models.py`

**Current ChatResponse:**
```python
class ChatResponse(BaseModel):
    message: str
    suggested_followups: List[str]
    visualization_spec: Optional[VisualizationSpec]  # Still here
```

**Option 1: Keep as-is (Backward Compatible)**
- ChatResponse can still include visualization_spec
- Router adds it when visualization agent is called
- No breaking changes

**Option 2: Remove (Cleaner)**
- Remove visualization_spec from ChatResponse
- Router handles all visualization logic
- Cleaner separation

**Recommendation:** Keep as-is for now (less risky)

---

### Step 4: Update Frontend (If Needed)

**Current Frontend Flow:**
```typescript
// AnalyticsPage.tsx - handleFollowupClick
chatWithClaude(request, {
  onSuccess: (chatResponse) => {
    // Updates both message AND visualization
    const updatedQuery = {
      ...currentQuery,
      aiSummary: chatResponse.message,
      visualizationSpec: chatResponse.visualizationSpec  // May or may not be present
    }
    setCurrentQuery(updatedQuery)
  }
})
```

**No Changes Needed!**
- Frontend already handles optional visualizationSpec
- Backend router will include it when visualization agent is called
- Backward compatible

---

## 🧪 Testing Plan

### Phase 1: Unit Testing (Backend)

**Test Visualization Service:**
```bash
# Create test file: server/tests/test_visualization_service.py

1. Test generate_visualization() with different data types
   - Categorical data → Bar chart
   - Time series → Line chart
   - Part-to-whole → Pie chart

2. Test modify_visualization() with different requests
   - "make it blue" → Updates colors
   - "show as pie chart" → Changes chartType
   - "add label at peak" → Adds annotations

3. Test is_visualization_request() detection
   - "make it blue" → True
   - "what's the trend?" → False
```

**Test Smart Routing:**
```bash
# Test genie router

1. Analytical follow-up
   Input: "What's driving this trend?"
   Expected: Claude Sonnet called, no viz spec

2. Visualization follow-up
   Input: "Make the chart blue"
   Expected: Viz agent called, viz spec returned

3. Mixed follow-up
   Input: "Explain the data and show as pie chart"
   Expected: Both agents called (future enhancement)
```

### Phase 2: Integration Testing

**Test Complete Flow:**
```bash
1. Ask initial question
   → Genie generates SQL
   → Execute query
   → Claude analyzes
   → Viz agent generates chart
   → Combined response

2. Follow-up: Analytical
   → Claude provides insights
   → No viz change

3. Follow-up: Visualization
   → Viz agent modifies chart
   → New viz spec returned

4. Verify state persistence
   → Switch tabs
   → State preserved
```

### Phase 3: Manual Testing (Frontend)

**Test Scenarios:**

1. **Initial Query Flow**
   - Ask: "Top 5 products by sales"
   - Verify: Results, AI summary, AND chart appear
   - Check: Chart type makes sense for data

2. **Analytical Follow-up**
   - Ask: "What's the trend?"
   - Verify: AI provides insights
   - Check: Chart remains unchanged

3. **Visualization Follow-up**
   - Ask: "Make it blue"
   - Verify: Chart color changes
   - Check: AI acknowledges change

4. **State Persistence**
   - Ask question → Get results
   - Switch to Visualizations tab
   - Switch back to Analytics
   - Verify: Everything persists

---

## 🚀 Deployment Strategy

### Option A: Full Deployment (Recommended)

**Steps:**
1. Complete remaining implementation (Steps 1-3 above)
2. Test thoroughly locally with `./watch.sh`
3. Build client: `cd client && bun run build`
4. Commit all changes
5. Push to GitHub and Azure DevOps
6. Deploy to Databricks: `./deploy.sh`
7. Monitor logs for 60s: `uv run python dba_logz.py <url> --duration 60`
8. Test in production

**Timeline:** ~2-3 hours

### Option B: Phased Deployment (Safer)

**Phase 1: Backend Only**
1. Deploy visualization service (inactive)
2. Keep current flow working
3. Test that nothing breaks

**Phase 2: Enable for Initial Queries**
4. Update genie_service.py to call viz agent
5. Keep follow-ups using Claude (old way)
6. Test initial query flow

**Phase 3: Smart Routing**
7. Add smart routing for follow-ups
8. Full separation complete

**Timeline:** ~4-5 hours (more testing between phases)

---

## 🔄 Rollback Strategy

### If Issues After Deployment:

**Quick Fix - Revert Genie Service:**
```python
# In genie_service.py, comment out new code:

# NEW (comment out if issues)
# viz_spec = await get_visualization_service().generate_visualization(...)

# OLD (uncomment to rollback)
viz_spec = analysis.get("visualization_spec")  # From Claude as before
```

**Full Rollback:**
```bash
# Revert to previous commit
git revert HEAD
git push origin main && git push azure main
./deploy.sh
```

---

## 💰 Cost Analysis

### Current Cost (Per 1000 Requests):

| Agent | Requests | Cost per Million Tokens | Avg Tokens | Cost |
|-------|----------|------------------------|------------|------|
| Genie | 1000 | (Databricks included) | - | $0 |
| Claude (Analysis + Viz) | 1000 | $3.00 | 1500 | $4.50 |
| **Total** | | | | **$4.50** |

### New Cost (Per 1000 Requests):

| Agent | Requests | Cost per Million Tokens | Avg Tokens | Cost |
|-------|----------|------------------------|------------|------|
| Genie | 1000 | (Databricks included) | - | $0 |
| Claude Sonnet (Analysis) | 1000 | $3.00 | 1000 | $3.00 |
| Claude Haiku (Viz) | 1000 | $0.25 | 500 | $0.13 |
| **Total** | | | | **$3.13** |

**Savings:** ~30% cost reduction!

**Why?**
- Smaller analytics prompts (removed viz instructions)
- Haiku 12x cheaper than Sonnet for simple viz tasks
- Less total token usage

---

## 📊 Performance Comparison

### Sequential (Current):

```
User Question (0s)
  ↓
Genie SQL (2s)
  ↓
Execute Query (3s)
  ↓
Claude Analysis + Viz (5s)
  ↓
Response (10s total)
```

### Parallel (New):

```
User Question (0s)
  ↓
Genie SQL (2s)
  ↓
Execute Query (3s)
  ↓
  ├─→ Claude Analysis (5s) ─┐
  └─→ Haiku Viz (2s) ───────┤
  ↓                         ↓
Response (7s total - 30% faster!)
```

**Performance Gain:** ~30% faster response times

---

## 🎓 Key Learnings & Best Practices

### 1. Agent Specialization
- One agent = one clear responsibility
- Easier to optimize and debug
- Better prompt engineering

### 2. Cost-Effective Model Selection
- Use expensive models (Sonnet) for complex reasoning
- Use cheap models (Haiku) for structured tasks
- Match model capability to task complexity

### 3. Parallel Execution
- Independent tasks should run in parallel
- Use `asyncio.gather()` for concurrent operations
- Faster user experience

### 4. Smart Routing
- Detect intent to route to appropriate agent
- Avoid unnecessary LLM calls
- Better resource utilization

---

## 🤔 Decision Points

### Decision 1: Sequential vs Parallel Execution

**Options:**
- **A) Sequential:** Claude first, then pass summary to viz agent
- **B) Parallel:** Both agents run simultaneously

**Recommendation:** Parallel (B)
- **Why:** Faster (30% improvement), viz agent doesn't strictly need Claude's summary
- **Tradeoff:** Viz agent can't use Claude's insights (minor issue)

### Decision 2: Keep visualizationSpec in ChatResponse?

**Options:**
- **A) Keep:** Backward compatible, easier migration
- **B) Remove:** Cleaner separation, more correct architecture

**Recommendation:** Keep (A) for now
- **Why:** Less risky, easier rollback, frontend already handles it
- **Future:** Remove in v2 after testing

### Decision 3: Deployment Strategy

**Options:**
- **A) Full:** Deploy everything at once
- **B) Phased:** Deploy in stages with testing

**Recommendation:** Full (A)
- **Why:** Changes are well-contained, easy rollback available
- **Tradeoff:** Slightly riskier but saves time

---

## ✅ Implementation Checklist

### Before Starting
- [ ] Review this guide thoroughly
- [ ] Confirm approach with team
- [ ] Set aside 2-3 hours for implementation
- [ ] Backup current deployment (git tag)

### Implementation
- [x] Create visualization_service.py
- [x] Refactor claude_service.py
- [ ] Update genie_service.py (parallel execution)
- [ ] Add smart routing in genie.py router
- [ ] Test locally with watch.sh
- [ ] Test all scenarios manually

### Deployment
- [ ] Build client: `cd client && bun run build`
- [ ] Commit changes with clear message
- [ ] Push to GitHub and Azure DevOps
- [ ] Deploy: `./deploy.sh`
- [ ] Monitor logs: `uv run python dba_logz.py <url> --duration 60`
- [ ] Verify uvicorn startup
- [ ] Test in production

### Post-Deployment
- [ ] Test initial query → verify chart appears
- [ ] Test analytical follow-up → verify no viz change
- [ ] Test visualization follow-up → verify chart updates
- [ ] Test state persistence → switch tabs
- [ ] Monitor error logs for 24 hours
- [ ] Gather user feedback

---

## 📞 Support & Questions

**If you encounter issues:**

1. **Check logs:** `tail -f /tmp/databricks-app-watch.log`
2. **Check deployment logs:** `uv run python dba_logz.py <url> --duration 30`
3. **Test locally first:** `./watch.sh` then test at http://localhost:5173
4. **Rollback if needed:** See "Rollback Strategy" section above

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Import error for visualization_service | Python can't find new file | Restart uvicorn, check PYTHONPATH |
| Haiku not responding | API key or endpoint issue | Check Anthropic API key in config |
| Visualization not updating | Smart routing not working | Check is_visualization_request() logic |
| State loss persists | Different issue | Not related to agent separation |

---

## 🎯 Next Steps

1. **Review this guide** - Make sure you understand the architecture
2. **Confirm approach** - Any changes or concerns?
3. **Schedule implementation** - Set aside 2-3 hours
4. **Begin implementation** - Start with Step 1 (genie_service.py)
5. **Test thoroughly** - Don't skip testing!
6. **Deploy with confidence** - Monitor closely

**Ready to proceed?** Just say "implement it" and I'll complete Steps 1-3 above!

---

**Document Version:** 1.0
**Created:** 2025-11-19
**Author:** Claude (Sonnet 4.5)
**Status:** Ready for Review

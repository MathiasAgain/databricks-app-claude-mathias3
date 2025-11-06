# Product Requirements Document: Nielsen Sales Analytics Assistant

## Executive Summary

### Problem Statement
Business analysts need a unified, intuitive interface to explore Nielsen sales data, ask natural language questions, and receive AI-powered insights without requiring SQL expertise. Currently, analysts must navigate multiple tools (Databricks dashboards, SQL editors, documentation) to get answers, slowing down decision-making.

### Solution
A Databricks App that combines dashboard visualization, AI-powered SQL generation via Genie, and an intelligent Claude assistant into a single, cohesive interface. Analysts can browse dashboards first, then ask questions in natural language to generate dynamic queries and visualizations, with proactive AI insights guiding their analysis.

### Success Criteria
- **Faster Time to Insights:** Reduce time from question to answer by 50%
- **Self-Service Analytics:** 80% of common queries answered without data team support
- **User Adoption:** 90% of target business analysts actively using the app weekly
- **Query Success Rate:** 95% of natural language queries produce valid, useful results

---

## Target Users

### Primary User: Business Analyst
**Profile:**
- Role: Business Analyst in Sales/Marketing teams
- Technical Skills: Basic SQL understanding, strong business acumen
- Goals: Monitor sales performance, identify trends, prepare reports, answer ad-hoc business questions
- Pain Points:
  - Switching between multiple tools disrupts workflow
  - Writing SQL queries is time-consuming and error-prone
  - Difficult to know what questions to ask next
  - No guidance on data interpretation

**Key Use Cases:**
1. **Weekly Performance Review:** Check dashboard for trends, drill down into anomalies with natural language questions
2. **Ad-hoc Investigation:** "Why did sales drop 15% in Region X?" → Get instant query + AI analysis
3. **Report Preparation:** Export data and insights for stakeholder presentations
4. **Exploratory Analysis:** Ask follow-up questions to discover root causes

---

## Core Features

### Feature 1: Interactive Dashboard (Priority 1)

**Description:** Embedded Databricks dashboard as the primary entry point for data exploration.

**Requirements:**
- Embed existing Databricks dashboard: `https://adb-4295693306818923.3.azuredatabricks.net/dashboardsv3/01f0a8ea42f5124ba8182d499c5c292f/published?o=4295693306818923`
- Dashboard must be fully interactive (filters, drill-downs)
- Responsive layout that works on desktop browsers
- Load time < 3 seconds
- Dashboard occupies main content area (70% of screen width)

**User Stories:**
- As a business analyst, I want to see key sales metrics at a glance when I open the app
- As a business analyst, I want to interact with dashboard filters to explore different time periods and regions
- As a business analyst, I want dashboard interactions to persist during my session

---

### Feature 2: Natural Language SQL Generation with Genie (Priority 2)

**Description:** AI-powered SQL generation from natural language questions using Databricks Genie.

**Technical Details:**
- **Genie Space ID:** `01f0a834208e13dab88b1fd3f7d718c0`
- **Data Source:** `p_coe_gold.ofs_nielsen.nielsen_sales_metrics`
- **Warehouse ID:** `939811bf15d2854c`

**Requirements:**
- Text input field for natural language questions
- Predefined question suggestions (clickable buttons):
  - "Show top 10 products by sales this quarter"
  - "What regions have declining sales trends?"
  - "Compare year-over-year performance for top categories"
  - "Show weekly sales trends for the last 6 months"
  - "Which products have the highest growth rate?"
- Query execution happens automatically (no manual SQL editing)
- Results displayed in two formats:
  1. **Data Table:** Clean, sortable table view
  2. **AI Summary:** LLM-generated business interpretation
- If query fails: Show business-friendly error message with suggestions
- Query history preserved in session
- Follow-up questions maintain context

**User Stories:**
- As a business analyst, I want to ask questions in plain English without knowing SQL
- As a business analyst, I want to see both raw data and AI interpretation of results
- As a business analyst, I want to ask follow-up questions based on previous results
- As a business analyst, I want helpful error messages if my question can't be answered

**Interaction Flow:**
1. User types or selects predefined question
2. Genie generates SQL from natural language
3. SQL executes against data warehouse
4. Results displayed as table + AI summary
5. User can ask follow-up questions with full context
6. Dashboard optionally updates/filters based on query results (nice-to-have)

---

### Feature 3: Intelligent AI Assistant with Claude (Priority 3)

**Description:** Proactive AI assistant powered by Claude Sonnet 4.5 that provides analysis, recommendations, and answers questions about queries and data.

**Technical Details:**
- **Model Endpoint:** `https://adb-4295693306818923.3.azuredatabricks.net/serving-endpoints/databricks-claude-sonnet-4-5/invocations`
- **Context Awareness:** Dashboard state, query history, data schema, previous conversation

**Requirements:**
- Persistent sidebar chat interface (30% of screen width)
- Chat history preserved during session
- AI capabilities:
  - **Proactive Insights:** "I notice sales dropped 20% in Region X - would you like to investigate?"
  - **Recommendations:** "Based on this trend, consider analyzing product mix changes"
  - **Follow-up Questions:** Suggest relevant next questions
  - **Query Explanations:** Explain what the generated SQL does in business terms
  - **Data Interpretation:** Provide context and business meaning to results
  - **Strategic Guidance:** "What metrics should I track for X?"
- Message types:
  - User-initiated questions
  - System-triggered insights (when anomalies detected)
  - Query result summaries
- Typing indicator while AI is thinking
- Copy message text functionality

**User Stories:**
- As a business analyst, I want the AI to proactively point out interesting patterns in the data
- As a business analyst, I want to ask the AI why certain trends are happening
- As a business analyst, I want recommendations on what to investigate next
- As a business analyst, I want the AI to remember our conversation context
- As a business analyst, I want explanations of queries in business terms

**AI Personality:**
- Professional but approachable
- Focused on actionable business insights
- Acknowledges uncertainty when appropriate
- Provides specific, data-driven recommendations

---

## Feature Specifications

### Layout Design

**Recommended Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Nielsen Sales Analytics Assistant                   │
│  [User Info] [Refresh] [Export]                              │
├──────────────────────┬────────────────────────────────────────┤
│                      │                                        │
│  AI Assistant        │   Embedded Dashboard                   │
│  Sidebar (30%)       │   (Main Content - 70%)                 │
│                      │                                        │
│  ┌────────────────┐  │                                        │
│  │ Chat History   │  │   [Dashboard iframe/embed]             │
│  │                │  │                                        │
│  │ - Message 1    │  │                                        │
│  │ - Message 2    │  │                                        │
│  │ ...            │  │                                        │
│  └────────────────┘  │                                        │
│                      │                                        │
│  ┌────────────────┐  │                                        │
│  │ Ask a Question │  │                                        │
│  │ [Text Input]   │  │                                        │
│  └────────────────┘  │                                        │
│                      │                                        │
│  Suggested Questions:│                                        │
│  [Top 10 Products]   │                                        │
│  [Sales Trends]      │                                        │
│  [Regional Analysis] │                                        │
│                      │                                        │
├──────────────────────┴────────────────────────────────────────┤
│  Query Results Panel (Expandable)                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Results Table    │  AI Summary                           │ │
│  │ [Data Grid]      │  "Sales show 15% growth in Q3..."     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop (primary): Full layout as shown
- Mobile (future): Stack vertically, collapsible sidebar

---

## Data Architecture

### Data Source
- **Schema:** `p_coe_gold.ofs_nielsen.nielsen_sales_metrics`
- **Access:** All business analysts see the same data (no row-level security for v1)
- **Warehouse:** `939811bf15d2854c`

### Query Processing Flow
1. User asks natural language question
2. FastAPI backend calls Genie API (Space ID: `01f0a834208e13dab88b1fd3f7d718c0`)
3. Genie generates SQL
4. SQL executed against warehouse
5. Results returned to frontend
6. Claude processes results for AI summary
7. Display table + AI insights

---

## Non-Functional Requirements

### Performance
- Dashboard load: < 3 seconds
- Query execution: < 10 seconds for 95% of queries
- AI response: < 5 seconds for summaries
- Concurrent users: Support 50+ simultaneous users

### Security
- OAuth authentication via Databricks
- No data caching (always fresh from warehouse)
- All queries logged for audit

### Reliability
- 99% uptime during business hours
- Graceful error handling with business-friendly messages
- Automatic retry for transient failures

### Usability
- Zero SQL knowledge required
- Intuitive natural language interface
- Clear visual hierarchy
- Consistent with Databricks design patterns

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Dashboard viewing + basic Q&A

**Deliverables:**
- Embedded Databricks dashboard
- Basic layout with sidebar
- Text input for questions
- Genie API integration
- Display query results as table

**Success Criteria:**
- Dashboard loads successfully
- Users can ask predefined questions
- Query results display correctly

---

### Phase 2: Intelligence (Week 3-4)
**Goal:** Add AI assistant and enhanced Q&A

**Deliverables:**
- Claude AI integration
- AI-generated result summaries
- Chat history and context
- Proactive insights
- Follow-up question support
- Error handling improvements

**Success Criteria:**
- AI provides meaningful summaries
- Follow-up questions maintain context
- Proactive insights appear when relevant

---

### Phase 3: Polish & Optimization (Week 5-6)
**Goal:** Production-ready with enhanced UX

**Deliverables:**
- Query result visualization (charts)
- Export functionality
- Performance optimization
- User feedback collection
- Documentation and training materials

**Success Criteria:**
- < 3 second load times
- Positive user feedback
- 90% query success rate

---

## Success Metrics

### Usage Metrics
- Daily active users
- Questions asked per session
- Follow-up question rate
- Average session duration

### Quality Metrics
- Query success rate (target: 95%)
- AI response relevance (user ratings)
- Time to insight (target: 50% reduction)
- Error rate (target: < 5%)

### Business Impact
- Reduction in data team support requests
- Increase in self-service analytics
- Faster decision-making cycles
- User satisfaction scores

---

## Open Questions / Future Enhancements

### V2 Features (Future Consideration)
- Multi-dashboard support
- Custom dashboard creation
- Data export to Excel/CSV
- Scheduled reports
- Collaborative features (share queries/insights)
- Mobile app
- Advanced visualizations (auto-generated charts)
- Row-level security for different user groups
- Integration with Microsoft Teams for alerts

### Technical Decisions Deferred
- Caching strategy for frequently asked questions
- Real-time dashboard updates vs. manual refresh
- Chart generation from query results (on-the-fly visualizations)

---

## Dependencies

### External Systems
- Databricks Workspace: `https://adb-4295693306818923.3.azuredatabricks.net`
- Genie API (Space ID: `01f0a834208e13dab88b1fd3f7d718c0`)
- SQL Warehouse: `939811bf15d2854c`
- Claude Model Endpoint: `/serving-endpoints/databricks-claude-sonnet-4-5/invocations`
- Dashboard: `01f0a8ea42f5124ba8182d499c5c292f`

### Access Requirements
- Databricks workspace access with Apps permissions
- Read access to `p_coe_gold.ofs_nielsen.nielsen_sales_metrics`
- Genie API access
- Model serving endpoint access

---

## Appendix

### Predefined Questions (Initial Set)
1. "Show top 10 products by sales this quarter"
2. "What regions have declining sales trends?"
3. "Compare year-over-year performance for top categories"
4. "Show weekly sales trends for the last 6 months"
5. "Which products have the highest growth rate?"
6. "What are the top performing brands?"
7. "Show sales breakdown by channel"
8. "Identify underperforming product categories"

### Technical Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React + TypeScript + shadcn/ui
- **AI/ML:** Databricks Genie + Claude Sonnet 4.5
- **Data:** Databricks SQL Warehouse
- **Deployment:** Databricks Apps

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Author:** Product Requirements (Generated via /dba workflow)

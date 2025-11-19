-- ============================================================================
-- TIME INTELLIGENCE LOGIC TESTING - ISO Week-Based Calculations
-- ============================================================================
-- This script tests the date logic for L4W, L12W, L52W, and YTD measures
-- Run this in Databricks SQL to validate calculations before deploying
-- ============================================================================

-- Test Configuration: Simulate different "current" dates to test edge cases
WITH test_scenarios AS (
  SELECT 'Normal Week' AS scenario, DATE '2024-10-05' AS max_date, 'Week 40 2024 (Saturday)' AS description
  UNION ALL SELECT 'Week 1 Spanning Years', DATE '2025-01-05', 'Week 1 2025 (Sunday) - Week starts Dec 30 2024'
  UNION ALL SELECT 'Week 53', DATE '2020-12-27', 'Week 53 2020 (Sunday)'
  UNION ALL SELECT 'Leap Year', DATE '2024-02-29', 'Leap year Feb 29 (Thursday)'
  UNION ALL SELECT 'Year Start Monday', DATE '2024-01-01', 'Week 1 2024 starts Jan 1 (Monday)'
  UNION ALL SELECT 'Year End Sunday', DATE '2024-12-29', 'Week 52 2024 ends Dec 29 (Sunday)'
),

-- Calculate time intelligence boundaries for each scenario
time_intelligence AS (
  SELECT
    scenario,
    max_date,
    description,

    -- Week information for max_date
    DATE_TRUNC('week', max_date) AS current_week_start,
    DATE_ADD(DATE_TRUNC('week', max_date), 6) AS current_week_end,
    WEEKOFYEAR(max_date) AS current_week_number,
    YEAR(max_date) AS current_year,

    -- L4W (Last 4 Weeks) - 4 complete weeks ending with current week
    DATE_ADD(DATE_TRUNC('week', max_date), -21) AS l4w_start,  -- 3 weeks back (7*3 = 21 days)
    DATE_ADD(DATE_TRUNC('week', max_date), 6) AS l4w_end,      -- End of current week

    -- L4W PY (Same 4 weeks prior year) - Offset by 52 weeks (364 days)
    DATE_ADD(DATE_TRUNC('week', max_date), -385) AS l4w_py_start,  -- 21 + 364 = 385
    DATE_ADD(DATE_TRUNC('week', max_date), -358) AS l4w_py_end,    -- 6 - 364 = -358

    -- L12W (Last 12 Weeks) - 12 complete weeks ending with current week
    DATE_ADD(DATE_TRUNC('week', max_date), -77) AS l12w_start,  -- 11 weeks back (7*11 = 77 days)
    DATE_ADD(DATE_TRUNC('week', max_date), 6) AS l12w_end,

    -- L12W PY (Same 12 weeks prior year)
    DATE_ADD(DATE_TRUNC('week', max_date), -441) AS l12w_py_start,  -- 77 + 364 = 441
    DATE_ADD(DATE_TRUNC('week', max_date), -358) AS l12w_py_end,

    -- L52W (Last 52 Weeks) - 52 complete weeks ending with current week
    DATE_ADD(DATE_TRUNC('week', max_date), -357) AS l52w_start,  -- 51 weeks back (7*51 = 357 days)
    DATE_ADD(DATE_TRUNC('week', max_date), 6) AS l52w_end,

    -- L52W PY (Prior 52 weeks) - Weeks 105-54 before current week
    DATE_ADD(DATE_TRUNC('week', max_date), -721) AS l52w_py_start,  -- 357 + 364 = 721 days
    DATE_ADD(DATE_TRUNC('week', max_date), -358) AS l52w_py_end,    -- 6 - 364 = -358

    -- YTD (Year to Date) - Week 1 to current week
    YEAR(max_date) AS ytd_year,
    YEAR(max_date) - 1 AS ytd_py_year

  FROM test_scenarios
)

-- Display test results with validation
SELECT
  scenario,
  max_date,
  description,
  '---' AS separator1,

  -- Current week info
  current_week_start,
  current_week_end,
  current_week_number,
  DAYOFWEEK(current_week_start) AS week_start_day_of_week,  -- Should be 2 (Monday)
  DAYOFWEEK(current_week_end) AS week_end_day_of_week,      -- Should be 1 (Sunday)
  '---' AS separator2,

  -- L4W validation
  l4w_start,
  l4w_end,
  DATEDIFF(l4w_end, l4w_start) + 1 AS l4w_days,  -- Should be 28 (4 weeks)
  WEEKOFYEAR(l4w_start) AS l4w_start_week,
  WEEKOFYEAR(l4w_end) AS l4w_end_week,
  '---' AS separator3,

  -- L4W PY validation
  l4w_py_start,
  l4w_py_end,
  DATEDIFF(l4w_py_end, l4w_py_start) + 1 AS l4w_py_days,  -- Should be 28
  DATEDIFF(l4w_start, l4w_py_start) AS l4w_py_offset,     -- Should be 364 (52 weeks)
  WEEKOFYEAR(l4w_py_start) AS l4w_py_start_week,
  WEEKOFYEAR(l4w_py_end) AS l4w_py_end_week,
  '---' AS separator4,

  -- L12W validation
  l12w_start,
  l12w_end,
  DATEDIFF(l12w_end, l12w_start) + 1 AS l12w_days,  -- Should be 84 (12 weeks)
  WEEKOFYEAR(l12w_start) AS l12w_start_week,
  '---' AS separator5,

  -- L12W PY validation
  l12w_py_start,
  l12w_py_end,
  DATEDIFF(l12w_py_end, l12w_py_start) + 1 AS l12w_py_days,  -- Should be 84
  DATEDIFF(l12w_start, l12w_py_start) AS l12w_py_offset,     -- Should be 364
  '---' AS separator6,

  -- L52W validation
  l52w_start,
  l52w_end,
  DATEDIFF(l52w_end, l52w_start) + 1 AS l52w_days,  -- Should be 364 (52 weeks)
  WEEKOFYEAR(l52w_start) AS l52w_start_week,
  '---' AS separator7,

  -- L52W PY validation
  l52w_py_start,
  l52w_py_end,
  DATEDIFF(l52w_py_end, l52w_py_start) + 1 AS l52w_py_days,  -- Should be 364
  DATEDIFF(l52w_start, l52w_py_start) AS l52w_py_offset,     -- Should be 364
  '---' AS separator8,

  -- YTD validation
  ytd_year,
  ytd_py_year,
  current_week_number AS ytd_weeks_included,

  -- Validation flags (all should be TRUE)
  CASE
    WHEN DAYOFWEEK(current_week_start) = 2 THEN '✓ PASS'
    ELSE '✗ FAIL: Week should start on Monday'
  END AS validation_week_start,

  CASE
    WHEN DAYOFWEEK(current_week_end) = 1 THEN '✓ PASS'
    ELSE '✗ FAIL: Week should end on Sunday'
  END AS validation_week_end,

  CASE
    WHEN DATEDIFF(l4w_end, l4w_start) + 1 = 28 THEN '✓ PASS'
    ELSE '✗ FAIL: L4W should be 28 days'
  END AS validation_l4w_days,

  CASE
    WHEN DATEDIFF(l4w_start, l4w_py_start) = 364 THEN '✓ PASS'
    ELSE '✗ FAIL: L4W PY offset should be 364 days'
  END AS validation_l4w_py_offset,

  CASE
    WHEN DATEDIFF(l12w_end, l12w_start) + 1 = 84 THEN '✓ PASS'
    ELSE '✗ FAIL: L12W should be 84 days'
  END AS validation_l12w_days,

  CASE
    WHEN DATEDIFF(l52w_end, l52w_start) + 1 = 364 THEN '✓ PASS'
    ELSE '✗ FAIL: L52W should be 364 days'
  END AS validation_l52w_days

FROM time_intelligence
ORDER BY max_date;

-- ============================================================================
-- EDGE CASE: Week 1 Spanning Years
-- ============================================================================
-- Test that Week 1 2025 correctly includes Dec 30, 2024
SELECT
  'Week 1 2025 Test' AS test_name,
  DATE '2024-12-30' AS date_to_test,
  WEEKOFYEAR(DATE '2024-12-30') AS week_number,  -- Should be 1
  YEAR(DATE '2024-12-30') AS calendar_year,      -- 2024
  DATE_TRUNC('week', DATE '2024-12-30') AS week_start,  -- Should be Dec 30, 2024 (Monday)
  DATE_ADD(DATE_TRUNC('week', DATE '2024-12-30'), 6) AS week_end,  -- Should be Jan 5, 2025 (Sunday)
  CASE
    WHEN WEEKOFYEAR(DATE '2024-12-30') = 1 THEN '✓ PASS: Dec 30 2024 is Week 1'
    ELSE '✗ FAIL: Week number incorrect'
  END AS validation;

-- ============================================================================
-- EDGE CASE: Week 53
-- ============================================================================
-- Test years with 53 weeks (like 2020)
SELECT
  'Week 53 2020 Test' AS test_name,
  DATE '2020-12-31' AS date_to_test,
  WEEKOFYEAR(DATE '2020-12-31') AS week_number,  -- Should be 53
  YEAR(DATE '2020-12-31') AS calendar_year,
  DATE_TRUNC('week', DATE '2020-12-31') AS week_start,
  CASE
    WHEN WEEKOFYEAR(DATE '2020-12-31') = 53 THEN '✓ PASS: 2020 has 53 weeks'
    ELSE '✗ FAIL: Week 53 not detected'
  END AS validation;

-- ============================================================================
-- ACTUAL DATA TEST: Run against real fact table
-- ============================================================================
-- This uses your actual max date from the fact table
WITH actual_max AS (
  SELECT MAX(`Calendar Day`) AS max_date
  FROM p_coe_gold.ofs_nielsen.vw_fact_sales
)
SELECT
  'ACTUAL DATA TEST' AS test_type,
  m.max_date AS actual_max_date,
  DATE_TRUNC('week', m.max_date) AS actual_week_start,
  DATE_ADD(DATE_TRUNC('week', m.max_date), 6) AS actual_week_end,
  WEEKOFYEAR(m.max_date) AS actual_week_number,
  YEAR(m.max_date) AS actual_year,

  -- L4W range for actual data
  DATE_ADD(DATE_TRUNC('week', m.max_date), -21) AS actual_l4w_start,
  DATE_ADD(DATE_TRUNC('week', m.max_date), 6) AS actual_l4w_end,

  -- L4W PY range for actual data
  DATE_ADD(DATE_TRUNC('week', m.max_date), -385) AS actual_l4w_py_start,
  DATE_ADD(DATE_TRUNC('week', m.max_date), -358) AS actual_l4w_py_end,

  -- Sample row count for L4W
  SUM(CASE
    WHEN f.`Calendar Day` >= DATE_ADD(DATE_TRUNC('week', m.max_date), -21)
    AND f.`Calendar Day` <= DATE_ADD(DATE_TRUNC('week', m.max_date), 6)
    THEN 1 ELSE 0
  END) AS l4w_row_count,

  -- Sample row count for L4W PY
  SUM(CASE
    WHEN f.`Calendar Day` >= DATE_ADD(DATE_TRUNC('week', m.max_date), -385)
    AND f.`Calendar Day` <= DATE_ADD(DATE_TRUNC('week', m.max_date), -358)
    THEN 1 ELSE 0
  END) AS l4w_py_row_count

FROM p_coe_gold.ofs_nielsen.vw_fact_sales f
CROSS JOIN actual_max m
GROUP BY m.max_date;

# AI-Powered Visualization Feature

## Overview

The application now includes a **4th tab - "Visualizations"** that displays AI-recommended interactive charts based on your Genie queries. Claude AI automatically selects the best chart type for your data.

## How It Works

### 1. Ask a Question (Analytics Tab)
Ask any natural language question in the Analytics tab, for example:
- "Show top 5 products by value sales for 2024"
- "What are the sales trends by month?"
- "Compare sales across different banners"

### 2. AI Analyzes & Recommends
Claude AI analyzes:
- **Data structure**: Columns, types, cardinality
- **Analytical context**: What you're trying to learn
- **Best practices**: Optimal chart type for the insight

### 3. View Interactive Visualization
Switch to the **Visualizations** tab to see:
- Interactive Plotly chart (zoom, pan, hover, export)
- AI reasoning explaining chart type choice
- Query metadata and SQL

## Supported Chart Types

The AI can recommend:

| Chart Type | Best For | Example Query |
|------------|----------|---------------|
| **Bar** | Comparing categories | "Top 5 products by sales" |
| **Line** | Time series trends | "Sales by month for 2024" |
| **Scatter** | Correlations | "Sales vs profit relationship" |
| **Pie** | Parts of whole | "Market share by banner" |
| **Heatmap** | 2D patterns | "Sales by product and region" |
| **Histogram** | Distributions | "Distribution of order values" |
| **Box** | Statistical spread | "Sales distribution with outliers" |
| **Area** | Cumulative trends | "Cumulative sales over time" |
| **Bubble** | 3D relationships | "Sales, profit, and volume" |

## Features

### Interactive Charts
- **Zoom**: Click and drag to zoom into specific areas
- **Pan**: Shift+drag to move around
- **Hover**: See detailed values on hover
- **Export**: Download as PNG
- **Reset**: Double-click to reset view

### AI Reasoning
Each chart includes an explanation like:
> "Line chart selected because data contains time-series information, ideal for showing trends over monthly periods."

### Fallback Logic
If AI doesn't provide a recommendation, the system:
1. Analyzes your data automatically
2. Detects time series, categorical, or numeric patterns
3. Recommends appropriate chart type

## Example Workflows

### Trend Analysis
```
1. Analytics Tab: "Show value sales by quarter for 2024"
2. Visualizations Tab: See line chart with quarterly trend
3. AI explains: "Line chart for time-series data showing quarterly progression"
```

### Comparison
```
1. Analytics Tab: "Top 10 categories by sales"
2. Visualizations Tab: See bar chart comparing categories
3. AI explains: "Bar chart selected for comparing discrete categorical values"
```

### Distribution
```
1. Analytics Tab: "Show distribution of transaction values"
2. Visualizations Tab: See histogram showing value distribution
3. AI explains: "Histogram selected to show frequency distribution of numeric values"
```

## Data Flow

```
User Question → Genie SQL → Execute Query → Claude Analysis
                                                    ↓
                                          Recommend Chart Type
                                                    ↓
                              Analytics Page ← Store Results → Visualization Page
                                                    ↓
                                          Interactive Plotly Chart
```

## Technical Details

### State Management
- Uses **Zustand** to share query results between tabs
- Stores current query + last 10 queries in history
- Automatic sync when new questions are asked

### Backend Integration
- Enhanced Claude prompt includes visualization guidelines
- Returns `visualizationSpec` in API response
- Validates column names and data types

### Frontend Components
- **PlotlyChart**: Renders 9+ chart types
- **VisualizationPage**: Main page layout
- **chartRecommendations**: Fallback logic utility

## Troubleshooting

### No Visualization Showing
- Ensure you've asked a question in Analytics tab first
- Check that query returned results (>0 rows)
- Verify at least 2 columns in results

### Chart Doesn't Match Data
- The AI selects based on question intent + data structure
- Fallback logic kicks in if AI recommendation missing
- All column names are validated against actual data

### Build Errors
See [BUILD_FIX.md](client/BUILD_FIX.md) for dependency installation issues.

## Future Enhancements

Potential additions:
- [ ] Multiple chart views for same data
- [ ] Chart customization controls
- [ ] Download data with chart
- [ ] Share/embed visualizations
- [ ] Chart history browser
- [ ] Custom chart templates

## Support

For issues or questions:
1. Check [BUILD_FIX.md](client/BUILD_FIX.md) for installation issues
2. Review example queries above
3. Ensure Claude AI endpoint is configured in Databricks
4. Contact your system administrator

---

**Powered by Databricks Genie AI & Claude Sonnet 4.5**

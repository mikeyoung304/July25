# Claude Lessons Analytics Guide

## Overview

The lessons system includes automated analytics to track effectiveness, measure ROI, and identify improvement opportunities. This guide explains how to use the analytics tools.

## Quick Start

### Generate Current Month Report
```bash
cd claude-lessons3
npm run report
```

### Generate Specific Month Report
```bash
npm run report:month 2025-11
```

## How It Works

### 1. Data Collection (SIGN_IN_SHEET.md)

Every time you use the lessons system:

**ENTRY** (when starting):
```markdown
| 003 | 2025-11-19 16:45 | Claude Code | JWT validation bug | IN_PROGRESS | | | | |
```

**EXIT** (when finishing):
```markdown
| 003 | 2025-11-19 16:45 | Claude Code | JWT validation bug | 01, 03 | auth.ts | ✅ Fixed using CL-AUTH-003 | ⭐⭐⭐⭐⭐ | 1.5hrs |
```

### 2. Monthly Report Generation

The script (`scripts/lessons-monthly-report.cjs`) processes all sessions and generates:

#### Markdown Report (`reports/YYYY-MM-analytics.md`)
- Executive summary with key metrics
- ROI analysis showing cost savings
- Category usage charts
- Effectiveness distribution
- Duration analysis
- Most/least helpful lessons
- Problem pattern analysis
- Recommendations for improvement

#### CSV Export (`reports/YYYY-MM-sessions.csv`)
- Raw session data
- Importable into spreadsheets/databases
- Enables custom analysis and trending

## Key Metrics

### Completion Rate
**Formula**: `(Completed Sessions / Total Sessions) × 100`

**Target**: >80%

**Interpretation**:
- High (>90%): System is highly usable
- Medium (70-90%): Some gaps or usability issues
- Low (<70%): Major gaps or unclear documentation

### Effectiveness Rating
**Scale**: ⭐ (1) to ⭐⭐⭐⭐⭐ (5)

**Average Target**: >4.0

**Interpretation**:
- 5.0: Lessons provide exact solutions
- 4.0-4.9: Lessons are very helpful with minor adaptation
- 3.0-3.9: Lessons provide guidance but need work
- <3.0: Lessons need major improvement

### Time Saved
**Formula**: `(Baseline Hours - Actual Hours) × Session Count`

**Baseline**: 4 hours per debugging session without lessons

**Example**:
```
10 sessions × 4 hours baseline = 40 hours
Actual time: 25 hours
Time saved: 15 hours
```

### Cost Saved
**Formula**: `Time Saved × Hourly Rate ($125)`

**Example**:
```
15 hours saved × $125/hr = $1,875 saved
```

### ROI (Return on Investment)
**Formula**: `(Cost Saved / Investment) × 100`

**Investment Estimate**:
- Initial system creation: ~40 hours ($5,000)
- Monthly maintenance: ~4 hours ($500)

**Example**:
```
Monthly savings: $1,875
Monthly investment: $500
ROI: 275%
```

## Report Sections Explained

### 📊 Executive Summary
High-level overview of the month:
- Total sessions attempted
- Percentage completed vs abandoned
- Average effectiveness rating
- Average time spent per session
- Total time/cost saved

### 💰 ROI Analysis
Financial impact breakdown:
- Baseline vs actual time comparison
- Cost savings calculation
- Estimated ROI percentage

### 📚 Category Usage
Which lesson categories were most/least used:
- Visual bar chart of usage frequency
- Identifies popular topics
- Highlights unused categories (candidates for removal/consolidation)

### ⭐ Effectiveness Distribution
Breakdown of star ratings:
- Count of 5-star, 4-star, etc. sessions
- Shows overall satisfaction trend
- Highlights if system is improving or declining

### ⏱️ Duration Distribution
Time spent in buckets:
- 0-1 hour (quick fixes)
- 1-2 hours (standard debugging)
- 2-4 hours (complex issues)
- 4-8 hours (major investigations)
- 8+ hours (exceptional cases)

### 🏆 Most Helpful Lessons
Sessions rated 5 stars:
- What problem was solved
- Which lessons were used
- Validates lesson quality

### ⚠️ Areas for Improvement
Sessions rated 1-2 stars:
- Identifies lesson gaps
- Shows where documentation needs work
- Prioritizes updates

### 🔍 Common Problem Patterns
Keyword frequency analysis:
- Most common terms in issue summaries
- Identifies recurring problems
- Suggests new lesson topics

### 🚧 Unresolved Issues
Abandoned sessions:
- Problems that couldn't be solved with current lessons
- Gaps in coverage
- Highest priority for new lessons

### 💡 Recommendations
Automated suggestions based on metrics:
- Low effectiveness → Review lessons
- Low completion rate → Investigate usability
- Unresolved issues → Create new lessons
- Unused categories → Consider consolidation
- High duration → Simplify lessons

## Best Practices

### 1. Track Sessions Promptly
Log entries immediately when starting and finishing work. Don't batch entries later - you'll forget details.

### 2. Be Specific in Summaries
❌ Bad: "Auth bug"
✅ Good: "JWT missing restaurant_id causing 401s in /api/orders"

### 3. Rate Honestly
Low ratings are valuable feedback. They show where the system needs improvement.

### 4. Track Time Accurately
Use actual time spent, not estimates. This ensures ROI calculations are accurate.

### 5. Reference Specific Lessons
In the Resolution field, mention which lessons helped:
- ✅ "Fixed using CL-AUTH-003 and CL-API-001"
- ❌ "Fixed the auth issue"

### 6. Note What's Missing
If a lesson doesn't exist for your problem, note that in the Resolution field:
- "No lesson found for WebSocket reconnection with rate limiting. Solved by experimenting."

## Monthly Review Process

### Step 1: Generate Report (Last Day of Month)
```bash
npm run report
```

### Step 2: Review Metrics
Open `reports/YYYY-MM-analytics.md` and check:
- Is completion rate >80%?
- Is avg effectiveness >4.0?
- Are we saving time (positive ROI)?

### Step 3: Act on Recommendations
Follow the automated suggestions:
- Update low-rated lessons
- Create lessons for unresolved issues
- Remove/consolidate unused categories

### Step 4: Archive Old Entries
Move sessions >3 months old from SIGN_IN_SHEET.md to archive:
```bash
# Create archive file if needed
touch SIGN_IN_SHEET_ARCHIVE_2025_Q3.md

# Move old entries manually
# Keep current month + 2 previous months in main sheet
```

### Step 5: Share Insights
Discuss findings with team:
- What problems are recurring?
- Which lessons are most valuable?
- Where are the biggest gaps?

## Trend Analysis

### Comparing Months
1. Generate reports for multiple months
2. Import CSV files into spreadsheet
3. Create pivot tables or charts
4. Look for trends:
   - Effectiveness improving or declining?
   - Time saved increasing?
   - New problem patterns emerging?

### Example Analysis
```
Month     Sessions  Completion  Avg Eff  Time Saved  Cost Saved
--------------------------------------------------------------
2025-09      8         100%      4.5      12 hrs     $1,500
2025-10     12          92%      4.2      18 hrs     $2,250
2025-11     15          87%      4.8      25 hrs     $3,125

Trend: Growing usage, high effectiveness, increasing ROI
Action: Continue current approach, expand to more categories
```

## Troubleshooting

### Report Shows Zero Sessions
**Cause**: No sessions in SIGN_IN_SHEET.md for target month

**Solution**: Check date format in sign-in sheet (must be YYYY-MM-DD)

### Effectiveness Shows 0.0
**Cause**: Star ratings not entered or incorrect format

**Solution**: Use ⭐ emoji in Effectiveness column (not text like "5 stars")

### Duration Not Parsing
**Cause**: Incorrect format in Duration column

**Solution**: Use formats like "2hrs", "45min", "1.5h", "90m"

### Categories Not Showing
**Cause**: Categories not in format "01, 02, 03"

**Solution**: Use two-digit category numbers (01-10), comma-separated

## Advanced Usage

### Custom Time Periods
Edit the script to analyze specific date ranges:
```javascript
// In lessons-monthly-report.cjs
const completed = sessions.completed.filter(s => {
  const date = parseDate(s.datetime);
  return date >= '2025-09-01' && date <= '2025-11-30';
});
```

### Export to Database
The CSV format is ready for import into PostgreSQL, MySQL, etc:
```sql
CREATE TABLE lesson_sessions (
  id TEXT,
  datetime TIMESTAMP,
  agent TEXT,
  summary TEXT,
  categories TEXT,
  status TEXT,
  effectiveness INTEGER,
  duration_hours NUMERIC,
  month TEXT
);

COPY lesson_sessions FROM 'reports/2025-11-sessions.csv' CSV HEADER;
```

### Automated Monthly Reports
Add to cron/scheduled tasks:
```bash
# Run on last day of month at 11:59 PM
59 23 28-31 * * cd /path/to/claude-lessons3 && npm run report
```

## Support

Questions or issues with analytics?

1. Check SIGN_IN_SHEET.md format matches templates
2. Review this guide's troubleshooting section
3. Run `node scripts/lessons-monthly-report.cjs --help` for usage
4. Check generated reports in `reports/` directory

---

**Last Updated**: 2025-11-19
**System Version**: 3.1.0

# Claude Lessons Analytics Reports

This directory contains monthly analytics reports generated from the SIGN_IN_SHEET.md tracking system.

## Files Generated

Each month produces two files:

### 1. Markdown Report (`YYYY-MM-analytics.md`)
Comprehensive analytics including:
- **Executive Summary**: Key metrics at a glance
- **ROI Analysis**: Cost savings calculation
- **Category Usage**: Which lesson categories are most/least used
- **Effectiveness Distribution**: Star rating breakdown
- **Duration Distribution**: Time spent histogram
- **Most Helpful Lessons**: 5-star rated sessions
- **Areas for Improvement**: Low-rated sessions needing attention
- **Common Problem Patterns**: Keyword frequency analysis
- **Unresolved Issues**: Abandoned sessions requiring new lessons
- **Recommendations**: Actionable insights for system improvement

### 2. CSV Export (`YYYY-MM-sessions.csv`)
Raw session data for further analysis:
- Session ID, DateTime, Agent
- Issue summary and categories
- Status (completed/abandoned)
- Effectiveness rating (0-5)
- Duration in hours
- Month identifier

## Generating Reports

### Current Month
```bash
node scripts/lessons-monthly-report.cjs
```

### Specific Month
```bash
node scripts/lessons-monthly-report.cjs 2025-11
```

## Metrics Explained

### Completion Rate
Percentage of sessions completed vs abandoned. Target: >80%

### Effectiveness Rating
Average star rating from completed sessions:
- ⭐ (1) = Not helpful, solved differently
- ⭐⭐ (2) = Some context, needed more
- ⭐⭐⭐ (3) = Pointed in right direction
- ⭐⭐⭐⭐ (4) = Most of solution, minor adaptation
- ⭐⭐⭐⭐⭐ (5) = Exact solution, significant time saved

Target: >4.0 average

### Time Saved
Calculated as:
```
Baseline (4 hrs) × Total Sessions - Actual Time Spent
```

### Cost Saved
```
Time Saved × Hourly Rate ($125)
```

### ROI
```
(Cost Saved / Estimated Investment) × 100
```

## Using the Data

### Monthly Review Process
1. Generate report at end of each month
2. Review recommendations section
3. Update lessons for low-rated or unresolved issues
4. Archive old sessions from SIGN_IN_SHEET.md
5. Share insights with team

### Trend Analysis
Compare reports across months to identify:
- Improving/declining effectiveness
- Emerging problem patterns
- Category usage shifts
- ROI trends

### CSV Analysis
Import CSV into spreadsheet/database for:
- Cross-month comparisons
- Custom visualizations
- Statistical analysis
- Team performance tracking

## Report Schedule

- **Generated**: Last day of each month
- **Retention**: Keep all reports indefinitely
- **Archive**: Sign-in sheet entries >3 months old

## Questions?

See `/Users/mikeyoung/CODING/rebuild-6.0/claude-lessons3/README.md` for system overview.

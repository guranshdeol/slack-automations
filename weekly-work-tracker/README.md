# Weekly Work Tracker → Slack Automation

![Status](https://img.shields.io/badge/status-active-2ea44f)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-1f6feb)
![Views](https://komarev.com/ghpvc/?username=guranshdeol&repo=weekly-work-tracker-slack-automation&color=1f6feb)

Automates weekly status updates by converting structured entries in **Google Sheets** into a formatted **Slack summary**. Designed to eliminate manual reporting overhead while ensuring consistent, structured communication.

---

## Overview

A lightweight system to track and report work without friction:

- Log work incrementally (~2 minutes/day)
- Automatically generate a weekly summary
- Deliver it to Slack every Friday

Output includes:
- ✅ Accomplishments
- 🚧 Blockers
- 🔭 Planned work for next week

---

## Architecture

```
Google Sheets  →  Apps Script  →  Slack Webhook
```

1. Work is logged daily in Google Sheets
2. Apps Script processes current week data
3. A structured summary is generated
4. Sent to Slack via webhook
5. Trigger runs automatically every Friday

---

## Folder structure

```
weekly-work-tracker/
├── README.md
├── WeeklySlackSummary.gs              ← Apps Script (paste into Google Apps Script)
└── Individual_Contribution_Tracker.xlsx  ← Upload to Google Drive, open as Sheets
```

---

## Example Output

> Structured Slack message with categorized updates (Accomplishments, Blockers, Next Steps)

<img width="437" height="342" alt="image" src="https://github.com/user-attachments/assets/8609a3ac-8a71-4f50-b1d0-3c032ebeb5ee" />

---

## Setup

### 1. Google Sheet

Create monthly tabs:

```
Mar 2025
Apr 2025
```

Add weekly dividers:

```
WEEK 1  ·  Mar 3 – Mar 7
WEEK 2  ·  Mar 10 – Mar 14
```

Row structure:

| Date | Task | Category | Status | Notes |
|---|---|---|---|---|

Categories:
- `accomplishment`
- `blocker`
- `next week`

---

### 2. Apps Script

1. In your Google Sheet → **Extensions → Apps Script**
2. Delete all default code
3. Paste the entire contents of `WeeklySlackSummary.gs`
4. Update the config at the top of the file:

```javascript
const CONFIG = {
  SLACK_WEBHOOK_URL : "YOUR_WEBHOOK_URL",
  YOUR_NAME         : "Your Name",
  SEND_HOUR         : 17
};
```

---

### 3. Slack Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Left sidebar → **Incoming Webhooks** → toggle on → **Add New Webhook to Workspace**
3. Select your channel → **Allow**
4. Copy the webhook URL and paste it into `SLACK_WEBHOOK_URL` in the script config

---

### 4. Schedule Automation

Run this once to set up the weekly Friday trigger:

```javascript
createFridayTrigger();
```

---

### 5. Test

```javascript
testSendNow();
```

Verify the message appears in your Slack channel before the first real Friday run.

---

## Design Principles

- Low daily effort — logging takes ~2 minutes
- Structured output — consistent format every week
- Automation-first — zero manual steps once set up
- Clear communication — no ambiguity in updates

---

## Use Cases

- Weekly manager updates
- Consulting progress reports
- Personal work tracking
- Team reporting with minor extensions

---

## Limitations

- Requires consistent sheet tab and row structure
- Single-user setup out of the box
- Depends on Slack incoming webhook availability

---

## Future Improvements

- Multi-user support
- Notion integration
- Email delivery fallback
- Dashboard visualization via Google Looker Studio

---

## Author

**Guransh Deol** — focused on building lightweight systems that reduce operational overhead and improve clarity.

---

## License

MIT

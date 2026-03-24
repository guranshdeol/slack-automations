# Weekly Work Tracker → Slack Automation

![Status](https://img.shields.io/badge/status-active-success)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Automates weekly status updates by converting structured entries in
**Google Sheets** into a formatted **Slack summary**.

Designed to eliminate manual reporting overhead while ensuring
consistent, structured communication.

------------------------------------------------------------------------

## ✨ Overview

A lightweight system to track and report work without friction:

-   Log work incrementally (\~2 minutes/day)
-   Automatically generate a weekly summary
-   Deliver it to Slack every Friday

Output includes: - ✅ Accomplishments\
- 🚧 Blockers\
- 🔭 Planned work

------------------------------------------------------------------------

## 🏗️ Architecture

    Google Sheets  →  Apps Script  →  Slack Webhook

1.  Work is logged in Google Sheets\
2.  Apps Script processes current week data\
3.  Structured summary is generated\
4.  Sent to Slack via webhook\
5.  Trigger runs automatically every Friday

------------------------------------------------------------------------

## 📸 Example Output

> Structured Slack message with categorized updates (Accomplishments,
> Blockers, Next Steps)
<img width="437" height="342" alt="image" src="https://github.com/user-attachments/assets/8609a3ac-8a71-4f50-b1d0-3c032ebeb5ee" />


------------------------------------------------------------------------

## ⚙️ Setup

### 1. Google Sheet

Create monthly tabs:

    Mar 2025
    Apr 2025

Add weekly dividers:

    WEEK 1  ·  Mar 3 – Mar 7
    WEEK 2  ·  Mar 10 – Mar 14

Structure:

  Date   Task   Category   Status   Notes
  ------ ------ ---------- -------- -------

Categories: - accomplishment\
- blocker\
- next week

------------------------------------------------------------------------

### 2. Apps Script

Open: **Extensions → Apps Script**

Paste the script and update:

``` javascript
const CONFIG = {
  SLACK_WEBHOOK_URL : "YOUR_WEBHOOK_URL",
  YOUR_NAME         : "Your Name",
  SEND_HOUR         : 17
};
```

------------------------------------------------------------------------

### 3. Slack Webhook

-   Create Incoming Webhook in Slack\
-   Select channel\
-   Copy URL → paste in config

------------------------------------------------------------------------

### 4. Schedule Automation

Run once:

``` javascript
createFridayTrigger();
```

------------------------------------------------------------------------

### 5. Test

``` javascript
testSendNow();
```

------------------------------------------------------------------------

## 🎯 Design Principles

-   Low daily effort\
-   Structured output\
-   Automation-first\
-   Clear communication

------------------------------------------------------------------------

## 🧩 Use Cases

-   Weekly manager updates\
-   Consulting reports\
-   Personal tracking\
-   Team reporting extensions

------------------------------------------------------------------------

## ⚠️ Limitations

-   Requires consistent sheet structure\
-   Single-user setup\
-   Slack webhook dependency

------------------------------------------------------------------------

## 🚀 Future Improvements

-   Multi-user support\
-   Notion integration\
-   Email delivery\
-   Dashboard visualization

------------------------------------------------------------------------

## 👤 Author

**Guransh Deol**

Focused on building lightweight systems that reduce operational overhead
and improve clarity.

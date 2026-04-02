// ============================================================
//  CONFIGURATION — update these before first run
// ============================================================
const CONFIG = {
  SLACK_WEBHOOK_URL : "https://hooks.slack.com/services/XXXX/XXXX/XXXX",
  YOUR_NAME         : "Guransh Singh",
  SEND_HOUR         : 17,   // 5 PM — change to your preferred hour (24h format)
};
// ============================================================


// ── Date helpers ──────────────────────────────────────────────────────────

function getMonday(d) {
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getFriday(monday) {
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  fri.setHours(23, 59, 59, 0);
  return fri;
}

function fmt(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "MMM d");
}

function fmtShort(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "d MMM");
}

// Returns tab name for current month e.g. "Mar 2025"
function currentMonthTabName() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM yyyy");
}

// Returns the week number within a month (1-indexed) for a given Monday
function weekNumberInMonth(monday) {
  return Math.ceil(monday.getDate() / 7);
}


// ── Sheet reader ──────────────────────────────────────────────────────────

/**
 * Reads the correct month tab and extracts rows that belong to the
 * current week (between the matching week divider and the next one).
 *
 * Week divider rows are identified by having content only in column A
 * and starting with "WEEK" (case-insensitive).
 *
 * Returns: { accomplishments[], blockers[], nextWeek[], weekLabel }
 */
function getWeekData() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const tabName = currentMonthTabName();
  const sheet   = ss.getSheetByName(tabName);

  if (!sheet) {
    throw new Error(
      `Sheet "${tabName}" not found. Please create a tab named exactly "${tabName}".`
    );
  }

  const today  = new Date();
  const monday = getMonday(today);
  const friday = getFriday(monday);
  const weekNo = weekNumberInMonth(monday);

  const allData = sheet.getDataRange().getValues();

  // ── Find the row range for the current week ───────────────────────────
  // Divider rows: col A starts with "WEEK", cols B-E are empty
  let weekStartRow = -1;
  let weekEndRow   = allData.length; // default to end of data

  for (let i = 0; i < allData.length; i++) {
    const colA = String(allData[i][0]).trim().toUpperCase();
    const isDivider = colA.startsWith("WEEK") &&
                      !allData[i][1] && !allData[i][2] &&
                      !allData[i][3] && !allData[i][4];

    if (isDivider) {
      // Extract week number from divider text e.g. "WEEK 2  ·  10 Mar – 14 Mar"
      const match = colA.match(/WEEK\s+(\d)/);
      const divWeekNo = match ? parseInt(match[1]) : -1;

      if (divWeekNo === weekNo) {
        weekStartRow = i + 1; // data starts on the row after the divider
      } else if (weekStartRow !== -1) {
        // This is the NEXT divider — stop here
        weekEndRow = i;
        break;
      }
    }
  }

  if (weekStartRow === -1) {
    throw new Error(
      `Could not find a "WEEK ${weekNo}" divider in sheet "${tabName}". ` +
      `Please make sure the divider row starts with "WEEK ${weekNo}".`
    );
  }

  // ── Bucket rows ───────────────────────────────────────────────────────
  const accomplishments = [];
  const blockers        = [];
  const nextWeek        = [];

  for (let i = weekStartRow; i < weekEndRow; i++) {
    const row      = allData[i];
    const task     = String(row[1]).trim();
    const category = String(row[2]).trim().toLowerCase();
    const status   = String(row[3]).trim();
    const notes    = String(row[4]).trim();

    if (!task) continue; // skip empty rows

    const statusIcon = {
      "Done"        : "✅",
      "In Progress" : "🔄",
      "Blocked"     : "🚧",
      "Cancelled"   : "❌",
    }[status] || "•";

    const line = notes
      ? `${statusIcon} *${task}* _(${status})_\n   ↳ ${notes}`
      : `${statusIcon} *${task}* _(${status})_`;

    if (category === "accomplishment") accomplishments.push(line);
    else if (category === "blocker")   blockers.push(line);
    else if (category === "next week") nextWeek.push(line);
  }

  const weekLabel = `${fmt(monday)} – ${fmt(friday)}`;
  return { accomplishments, blockers, nextWeek, weekLabel };
}


// ── Slack message builder ─────────────────────────────────────────────────

function buildSlackBlocks(data) {
  const { accomplishments, blockers, nextWeek, weekLabel } = data;
  const today = new Date();

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 Weekly Update — ${CONFIG.YOUR_NAME}`,
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `*Week of ${weekLabel}*  ·  Sent ${fmtShort(today)}`
      }]
    },
    { type: "divider" }
  ];

  function addSection(emoji, title, lines, emptyMsg) {
    if (lines.length === 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${emoji} ${title}*\n_${emptyMsg}_`
        }
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${emoji} ${title}*\n\n${lines.join("\n\n")}`
        }
      });
    }
  }

  addSection("✅", "Accomplishments",      accomplishments, "Nothing logged yet.");
  blocks.push({ type: "divider" });
  addSection("🚧", "Issues & Blockers",    blockers,        "No blockers this week 🎉");
  blocks.push({ type: "divider" });
  addSection("🔭", "Planned for Next Week", nextWeek,       "Nothing planned yet.");

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [{
      type: "mrkdwn",
      text: `_Auto-generated from Individual Contribution Tracker · ${currentMonthTabName()}_`
    }]
  });

  return blocks;
}


// ── Slack sender ──────────────────────────────────────────────────────────

function postToSlack(blocks) {
  const payload = JSON.stringify({ blocks });
  const options = {
    method      : "post",
    contentType : "application/json",
    payload     : payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
  const code     = response.getResponseCode();
  const body     = response.getContentText();

  if (code !== 200) {
    throw new Error(`Slack returned HTTP ${code}: ${body}`);
  }

  Logger.log("✅ Slack message sent successfully.");
}


// ── Main entry point (runs every Friday automatically) ───────────────────

function sendWeeklySlackSummary() {
  try {
    const data   = getWeekData();
    const blocks = buildSlackBlocks(data);
    postToSlack(blocks);
  } catch (e) {
    Logger.log("❌ Error: " + e.message);
    // Optionally email yourself on failure:
    // MailApp.sendEmail(Session.getActiveUser().getEmail(),
    //   "Weekly Slack Summary Failed", e.message);
  }
}


// ── Manual trigger: run this ONCE to schedule every Friday ───────────────

function createFridayTrigger() {
  // Remove any existing triggers for this function to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "sendWeeklySlackSummary") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("sendWeeklySlackSummary")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(CONFIG.SEND_HOUR)
    .create();

  Logger.log(`✅ Trigger set: sendWeeklySlackSummary will run every Friday at ${CONFIG.SEND_HOUR}:00.`);
}


// ── Optional: test without waiting for Friday ─────────────────────────────

function testSendNow() {
  Logger.log("Running test send...");
  sendWeeklySlackSummary();
}

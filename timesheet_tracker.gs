// ═══════════════════════════════════════════════════════════════════════
// Timesheet Compliance Tracker — Apps Script
// -----------------------------------------------------------------------
// Timezone:   ALL timestamps UTC (Slack writes UTC to the sheet)
//             Adjust trigger hours to match your local timezone
//
// Workflow fires:  Friday (configured in Slack Workflow Builder)
// Weekly window:   Fri 11:30 AM UTC → Sun 3:30 AM UTC
//                  (= Fri 5 PM IST → Sun 9 AM IST)
//
// Triggers (set via installTriggers — uses your account timezone):
//   Friday  10 PM local → firstAlertCheck()   nudge non-responders
//   Sunday   9 AM local → escalationCheck()   escalate + update sheets
//
// Sheet structure:
//   MasterList  col A = @handle (matches Workflow Builder output exactly)
//               col B = @handle (for alert messages)
//               col C = Slack Member ID (for <@U...> pings)
//               col D = Active? (Yes/No)
//   Responses   col A = @handle, col B = UTC timestamp, col C = week start UTC
//   WeeklyLog   pre-populated — script fills col D (responded at) + col E (DONE/MISSED)
//   DefaulterTracker, MonthlySnapshot — fully written by script
//   Config      all thresholds and webhook URL stored here
// ═══════════════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();
const TZ = "UTC";

// ── Config ───────────────────────────────────────────────────────────────
function getConfig() {
  const cfg = SS.getSheetByName("Config");
  return {
    webhookUrl:              cfg.getRange("B4").getValue(),
    managerSlackId:          cfg.getRange("B5").getValue(),
    defaulterMonthThreshold: parseInt(cfg.getRange("B13").getValue()),
    streakRed:               parseInt(cfg.getRange("B14").getValue()),
    streakAmber:             parseInt(cfg.getRange("B15").getValue()),
    missRateCritical:        parseInt(cfg.getRange("B16").getValue()),
    missRedYear:             parseInt(cfg.getRange("B17").getValue()),
    missAmberYear:           parseInt(cfg.getRange("B18").getValue()),
  };
}

// ── Active members from MasterList ───────────────────────────────────────
function getActiveMembers() {
  const data = SS.getSheetByName("MasterList").getRange("A4:E20").getValues();
  return data
    .filter(row => row[0] && row[3].toString().trim().toLowerCase() === "yes")
    .map(row => ({
      wbHandle:    row[0].toString().trim(),  // matches Workflow Builder
      alertHandle: row[1].toString().trim(),  // readable in messages
      memberId:    row[2].toString().trim(),  // for <@U...> pings
    }));
}

// ── Slack mention formatter ───────────────────────────────────────────────
function mention(member) {
  return member.memberId && member.memberId.startsWith("U")
    ? `<@${member.memberId}>`
    : member.alertHandle;
}

// ── Last Friday 11:30 AM UTC cutoff ──────────────────────────────────────
function getWeekCutoffUTC() {
  const now      = new Date();
  const daysBack = (now.getUTCDay() + 2) % 7; // days since last Friday
  const cutoff   = new Date(now);
  cutoff.setUTCDate(now.getUTCDate() - daysBack);
  cutoff.setUTCHours(11, 30, 0, 0);
  return cutoff;
}

// ── Who responded this week ───────────────────────────────────────────────
// Reads Responses sheet from row 2 (row 1 = header)
// Matches by @handle case-insensitively, only counts responses after cutoff
function getRespondedThisWeek() {
  const sheet   = SS.getSheetByName("Responses");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();

  const data    = sheet.getRange("A2:B" + lastRow).getValues();
  const cutoff  = getWeekCutoffUTC();
  const responded = new Set();

  data.forEach(([name, timestamp]) => {
    if (!name || !timestamp) return;
    const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (ts >= cutoff) responded.add(name.toString().trim().toLowerCase());
  });
  return responded;
}

// ── Friday 10 PM — nudge non-responders ──────────────────────────────────
function firstAlertCheck() {
  const cfg       = getConfig();
  const members   = getActiveMembers();
  const responded = getRespondedThisWeek();
  const missing   = members.filter(m => !responded.has(m.wbHandle.toLowerCase()));

  if (missing.length === 0) {
    postToSlack(cfg.webhookUrl,
      "✅ All team members have confirmed their timesheet entries this week. Great work!");
    return;
  }

  const lines = missing.map(m => `• ${mention(m)}`).join("\n");
  postToSlack(cfg.webhookUrl,
    `🔔 *Timesheet entries — Friday reminder*\n\n` +
    `The following people haven't confirmed yet:\n\n${lines}\n\n` +
    `Please fill your entries before Sunday morning!`);
}

// ── Sunday 9 AM — escalate + update all tracker sheets ───────────────────
function escalationCheck() {
  const cfg       = getConfig();
  const members   = getActiveMembers();
  const responded = getRespondedThisWeek();
  const missing   = members.filter(m => !responded.has(m.wbHandle.toLowerCase()));
  const cutoff    = getWeekCutoffUTC();

  writeWeeklyLog(members, responded, cutoff);
  updateDefaulterTracker(cfg);
  updateMonthlySnapshot();

  if (missing.length === 0) return;

  const lines      = missing.map(m => `• ${mention(m)}`).join("\n");
  const managerTag = `<@${cfg.managerSlackId}>`;
  postToSlack(cfg.webhookUrl,
    `⚠️ *Timesheet entries — Sunday escalation*\n\n` +
    `${managerTag} the following team members have *still not* filled their entries:\n\n` +
    `${lines}\n\nPlease follow up with them.`);
}

// ── Write DONE / MISSED into WeeklyLog ───────────────────────────────────
function writeWeeklyLog(members, responded, cutoffDate) {
  const sheet   = SS.getSheetByName("WeeklyLog");
  const lastRow = sheet.getLastRow();
  if (lastRow < 5) return;

  const allData   = sheet.getRange("A5:E" + lastRow).getValues();
  const cutoffStr = Utilities.formatDate(cutoffDate, TZ, "dd MMM yyyy");

  for (let i = 0; i < allData.length; i++) {
    const rowDate = allData[i][1];
    const rowName = allData[i][2];
    if (!rowName) continue;

    const rowDateStr = rowDate instanceof Date
      ? Utilities.formatDate(rowDate, TZ, "dd MMM yyyy")
      : rowDate.toString();

    if (rowDateStr === cutoffStr) {
      const sheetRow = i + 5;
      const isDone   = responded.has(rowName.toString().trim().toLowerCase());
      sheet.getRange(sheetRow, 4).setValue(isDone ? getRespondedAt(rowName) : "—");
      sheet.getRange(sheetRow, 5).setValue(isDone ? "DONE" : "MISSED");
    }
  }
}

function getRespondedAt(wbHandle) {
  const sheet   = SS.getSheetByName("Responses");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "—";
  const data    = sheet.getRange("A2:B" + lastRow).getValues();
  const cutoff  = getWeekCutoffUTC();
  for (const [name, ts] of data) {
    if (!name || !ts) continue;
    const tsDate = ts instanceof Date ? ts : new Date(ts);
    if (name.toString().trim().toLowerCase() === wbHandle.toLowerCase() && tsDate >= cutoff) {
      return Utilities.formatDate(tsDate, TZ, "dd MMM yyyy HH:mm") + " UTC";
    }
  }
  return "—";
}

// ── Update DefaulterTracker ───────────────────────────────────────────────
function updateDefaulterTracker(cfg) {
  const sheet   = SS.getSheetByName("DefaulterTracker");
  const members = getActiveMembers();
  const wl      = SS.getSheetByName("WeeklyLog");
  const logData = wl.getRange("A5:E" + wl.getLastRow()).getValues()
    .filter(r => r[2] && r[4]);

  const elapsedWeeks = new Set(
    logData
      .filter(r => r[4] === "DONE" || r[4] === "MISSED")
      .map(r => r[1] instanceof Date
        ? Utilities.formatDate(r[1], TZ, "dd MMM yyyy") : r[1].toString())
  ).size;

  members.forEach((member, idx) => {
    const row        = idx + 5;
    const memberRows = logData.filter(r =>
      r[2].toString().trim().toLowerCase() === member.wbHandle.toLowerCase());
    const missed     = memberRows.filter(r => r[4] === "MISSED");
    const totalMiss  = missed.length;
    const missRate   = elapsedWeeks > 0
      ? ((totalMiss / elapsedWeeks) * 100).toFixed(1) : "0.0";

    let streak = 0, maxStreak = 0, lastMissed = "—";
    memberRows.forEach(r => {
      if (r[4] === "MISSED") {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
        lastMissed = r[1] instanceof Date
          ? Utilities.formatDate(r[1], TZ, "dd MMM yyyy") : r[1].toString();
      } else { streak = 0; }
    });

    const monthCounts = {};
    missed.forEach(r => {
      const d   = r[1] instanceof Date ? r[1] : new Date(r[1]);
      const key = Utilities.formatDate(d, TZ, "MMM yyyy");
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const worstCount = Object.values(monthCounts).length
      ? Math.max(...Object.values(monthCounts)) : 0;
    const worstKey   = Object.entries(monthCounts)
      .find(([, v]) => v === worstCount)?.[0] || "—";
    const worstStr   = worstCount > 0 ? `${worstKey} (${worstCount})` : "—";

    let band = "GREEN";
    if (worstCount >= cfg.defaulterMonthThreshold)          band = "RED";
    else if (parseFloat(missRate) >= cfg.missRateCritical)  band = "CRITICAL";
    else if (totalMiss >= cfg.missRedYear || maxStreak >= cfg.streakRed)     band = "RED";
    else if (totalMiss >= cfg.missAmberYear || maxStreak >= cfg.streakAmber) band = "AMBER";

    sheet.getRange(row, 1).setValue(member.wbHandle);
    sheet.getRange(row, 2).setValue(totalMiss);
    sheet.getRange(row, 3).setValue(elapsedWeeks);
    sheet.getRange(row, 4).setValue(missRate + "%");
    sheet.getRange(row, 5).setValue(maxStreak);
    sheet.getRange(row, 6).setValue(lastMissed);
    sheet.getRange(row, 7).setValue(band);
    sheet.getRange(row, 8).setValue(worstStr);
    sheet.getRange(row, 9).setValue(band === "RED" || band === "CRITICAL" ? "Yes" : "No");
  });
}

// ── Update MonthlySnapshot heat map ──────────────────────────────────────
function updateMonthlySnapshot() {
  const sheet   = SS.getSheetByName("MonthlySnapshot");
  const members = getActiveMembers();
  const wl      = SS.getSheetByName("WeeklyLog");
  const logData = wl.getRange("A5:E" + wl.getLastRow()).getValues()
    .filter(r => r[2] && r[4] === "MISSED");

  const monthCols = {
    Jan:2,Feb:3,Mar:4,Apr:5,May:6,Jun:7,
    Jul:8,Aug:9,Sep:10,Oct:11,Nov:12,Dec:13
  };

  members.forEach((member, idx) => {
    const row        = idx + 4;
    const memberRows = logData.filter(r =>
      r[2].toString().trim().toLowerCase() === member.wbHandle.toLowerCase());

    Object.values(monthCols).forEach(col => sheet.getRange(row, col).setValue(0));
    memberRows.forEach(r => {
      const d   = r[1] instanceof Date ? r[1] : new Date(r[1]);
      const mon = Utilities.formatDate(d, TZ, "MMM");
      if (monthCols[mon]) {
        const cell = sheet.getRange(row, monthCols[mon]);
        cell.setValue((cell.getValue() || 0) + 1);
      }
    });
  });
}

// ── Slack POST ────────────────────────────────────────────────────────────
function postToSlack(webhookUrl, text) {
  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ text })
  });
}

// ── Reset test data (run once before go-live, then delete) ───────────────
function resetTestData() {
  const wl = SS.getSheetByName("WeeklyLog");
  if (wl.getLastRow() >= 5) wl.getRange("D5:E" + wl.getLastRow()).clearContent();
  const dt = SS.getSheetByName("DefaulterTracker");
  if (dt.getLastRow() >= 5) dt.getRange("B5:I" + dt.getLastRow()).clearContent();
  const ms = SS.getSheetByName("MonthlySnapshot");
  if (ms.getLastRow() >= 4) ms.getRange("B4:M" + ms.getLastRow()).setValue(0);
  Logger.log("✅ Test data cleared.");
}

// ── Install triggers — run once manually ─────────────────────────────────
// atHour() uses your Google account timezone — set hours in YOUR local time
// Example below uses IST (UTC+5:30). Adjust if your team is in a different timezone.
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("firstAlertCheck")
    .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(22).create();

  ScriptApp.newTrigger("escalationCheck")
    .timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(9).create();

  Logger.log("✅ Triggers installed: Friday 10 PM · Sunday 9 AM (local time).");
}

/**
 * CrashCourse — Google Sheet backend (Apps Script Web App)
 *
 * HOW TO USE (see SETUP.md for the full walkthrough):
 *   1. Open your Google Sheet → Extensions → Apps Script.
 *   2. Delete any default code, paste this whole file.
 *   3. Change SECRET below to your own long random string.
 *   4. Deploy → New deployment → type "Web app"
 *        • Execute as: Me
 *        • Who has access: Anyone
 *      Deploy, authorize when prompted, and copy the Web app URL.
 *   5. In the app's .env.local set:
 *        APPS_SCRIPT_URL   = <the Web app URL>
 *        APPS_SCRIPT_SECRET = <the same SECRET you set below>
 */

// ⚠️ Change this and keep it in sync with APPS_SCRIPT_SECRET in .env.local
var SECRET = 'CHANGE_ME_to_a_long_random_string';

var SHEET_NAME = 'Students';
var HEADERS = [
  'userId', 'password', 'name', 'status', 'sessionToken', 'sessionExpiresAt',
  'lastLoginAt', 'lastDevice', 'loginCount', 'progress', 'createdAt'
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  var firstRow = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (firstRow.join('') === '') {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

// Tab that stores admin-renamed video titles, keyed by YouTube id.
var VIDEO_TITLES_TAB = 'VideoTitles';

function getTitlesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(VIDEO_TITLES_TAB);
  if (!sh) {
    sh = ss.insertSheet(VIDEO_TITLES_TAB);
    sh.getRange(1, 1, 1, 2).setValues([['key', 'title']]);
  } else {
    var h = sh.getRange(1, 1, 1, 2).getValues()[0];
    if (h.join('') === '') sh.getRange(1, 1, 1, 2).setValues([['key', 'title']]);
  }
  return sh;
}

function rowToObj_(row) {
  var progress = [];
  try { if (row[9]) progress = JSON.parse(row[9]); } catch (e) { progress = []; }
  return {
    userId: String(row[0] || ''),
    password: String(row[1] || ''),
    name: String(row[2] || ''),
    status: String(row[3] || '') || 'active',
    sessionToken: String(row[4] || ''),
    sessionExpiresAt: String(row[5] || ''),
    lastLoginAt: String(row[6] || ''),
    lastDevice: String(row[7] || ''),
    loginCount: Number(row[8] || 0) || 0,
    progress: progress,
    createdAt: String(row[10] || '')
  };
}

function objToRow_(s) {
  return [
    s.userId || '', s.password || '', s.name || '', s.status || 'active',
    s.sessionToken || '', s.sessionExpiresAt || '', s.lastLoginAt || '',
    s.lastDevice || '', Number(s.loginCount || 0),
    JSON.stringify(s.progress || []), s.createdAt || ''
  ];
}

function listStudents_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') !== '') out.push(rowToObj_(values[i]));
  }
  return out;
}

function findRowIndex_(sh, userId) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var target = String(userId || '').toLowerCase();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').toLowerCase() === target) return i + 2;
  }
  return -1;
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // serialize writes so the single-device rule is safe
  } catch (lockErr) {
    return out_({ error: 'busy, try again' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return out_({ error: 'unauthorized' });

    var sh = getSheet_();
    var action = body.action;

    if (action === 'list') {
      return out_({ students: listStudents_(sh) });
    }
    if (action === 'get') {
      var idx = findRowIndex_(sh, body.userId);
      if (idx === -1) return out_({ student: null });
      return out_({ student: rowToObj_(sh.getRange(idx, 1, 1, HEADERS.length).getValues()[0]) });
    }
    if (action === 'append') {
      sh.appendRow(objToRow_(body.student));
      return out_({ ok: true });
    }
    if (action === 'update') {
      var uIdx = findRowIndex_(sh, body.student.userId);
      if (uIdx === -1) return out_({ error: 'not found' });
      sh.getRange(uIdx, 1, 1, HEADERS.length).setValues([objToRow_(body.student)]);
      return out_({ ok: true });
    }
    if (action === 'delete') {
      var dIdx = findRowIndex_(sh, body.userId);
      if (dIdx !== -1) sh.deleteRow(dIdx);
      return out_({ ok: true });
    }
    if (action === 'videoTitles') {
      var ts = getTitlesSheet_();
      var tlast = ts.getLastRow();
      var map = {};
      if (tlast >= 2) {
        var tv = ts.getRange(2, 1, tlast - 1, 2).getValues();
        for (var ti = 0; ti < tv.length; ti++) {
          if (String(tv[ti][0]) !== '') map[String(tv[ti][0])] = String(tv[ti][1] || '');
        }
      }
      return out_({ titles: map });
    }
    if (action === 'setVideoTitle') {
      var ts2 = getTitlesSheet_();
      var key = String(body.key || '');
      if (!key) return out_({ error: 'key required' });
      var title = String(body.title || '');
      var tlast2 = ts2.getLastRow();
      var found = -1;
      if (tlast2 >= 2) {
        var keys = ts2.getRange(2, 1, tlast2 - 1, 1).getValues();
        for (var ki = 0; ki < keys.length; ki++) {
          if (String(keys[ki][0]) === key) { found = ki + 2; break; }
        }
      }
      if (found === -1) ts2.appendRow([key, title]);
      else ts2.getRange(found, 2).setValue(title);
      return out_({ ok: true });
    }
    return out_({ error: 'unknown action' });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you sanity-check the deployment in a browser (should say it's alive).
function doGet() {
  return out_({ ok: true, service: 'crashcourse', tab: SHEET_NAME });
}

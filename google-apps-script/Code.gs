/**
 * Google Apps Script for Expense Tracker bank-email imports.
 * Project Settings → Script properties:
 *   BANK_IMPORT_URL      https://YOUR-DOMAIN/api/import/email
 *   BANK_IMPORT_SECRET   token from Expense Tracker Settings
 * Do not put secrets in this code or in GitHub.
 */
const BANK_SOURCES = [
  {
    from: "canarabank@canarabank.com",
    subject: "UPI/IMPS/MB Transaction Alert",
    query: 'from:canarabank@canarabank.com subject:"UPI/IMPS/MB Transaction Alert" newer_than:7d',
  },
  {
    from: "noreplyubi-txn@ubi.bank.in",
    subject: "DEBIT TRANSACTION ALERT",
    query: 'from:noreplyubi-txn@ubi.bank.in subject:"DEBIT TRANSACTION ALERT" newer_than:7d',
  },
];

function bankEmailAddress_(value) {
  const match = value.trim().match(/<([^<>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

function bankEmailExcerpt_(from, body) {
  if (from === "canarabank@canarabank.com") {
    const match = body.match(/An amount of[\s\S]{0,650}?with\s+UPI\s+Ref\s+No\.?\s*:\s*\d{6,20}/i);
    return match ? match[0].replace(/\bX{2,8}\d{2,12}\b/gi, "XXX****") : "";
  }
  if (from === "noreplyubi-txn@ubi.bank.in") {
    const start = body.search(/Your fund transfer request through UPI/i);
    if (start < 0) return "";
    const part = body.slice(start);
    const end = part.search(/^\s*7\.\s*Debit Account Number/im);
    const fraud = part.search(/If you have not initiated this transaction/i);
    return part.slice(0, end >= 0 ? end : fraud >= 0 ? fraud : 1300).trim();
  }
  return "";
}

/**
 * Run once after setting the two Script properties. This starts importing
 * only bank alerts arriving AFTER installation.
 */
function setupBankEmailImport() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("BANK_IMPORT_URL");
  const token = props.getProperty("BANK_IMPORT_SECRET");
  if (!/^https:\/\/[^/?#]+\.[^/?#]+\/api\/import\/email$/.test(url || "") ||
      !token || token.length < 20) {
    throw new Error("Set BANK_IMPORT_URL and BANK_IMPORT_SECRET in Script properties first.");
  }
  if (!props.getProperty("BANK_IMPORT_START_AT")) {
    props.setProperty("BANK_IMPORT_START_AT", new Date().toISOString());
  }
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "runBankEmailImport")) {
    ScriptApp.newTrigger("runBankEmailImport").timeBased().everyMinutes(5).create();
  }
  Logger.log("Bank email importer is installed, starting from now.");
}

function runBankEmailImport() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const url = props.getProperty("BANK_IMPORT_URL");
    const token = props.getProperty("BANK_IMPORT_SECRET");
    const startMs = Date.parse(props.getProperty("BANK_IMPORT_START_AT") || "");
    if (!url || !token || !Number.isFinite(startMs)) throw new Error("Run setupBankEmailImport first.");

    const now = Date.now(), oldest = now - 8 * 86400000;
    const prev = JSON.parse(props.getProperty("BANK_IMPORT_PROCESSED") || "{}");
    const seen = {};
    Object.keys(prev).forEach(id => { if (prev[id] > oldest) seen[id] = prev[id]; });
    let queued = 0, duplicate = 0, ignored = 0, retries = 0, attempts = 0;

    for (const source of BANK_SOURCES) {
      for (let offset = 0; offset < 300 && attempts < 40; offset += 100) {
        const threads = GmailApp.search(source.query, offset, 100);
        if (!threads.length) break;
        for (const thread of threads) {
          for (const message of thread.getMessages()) {
            const id = message.getId();
            if (seen[id] || message.getDate().getTime() < Math.max(startMs, oldest)) continue;
            if (bankEmailAddress_(message.getFrom()) !== source.from ||
                message.getSubject().trim() !== source.subject) continue;
            const excerpt = bankEmailExcerpt_(source.from, message.getPlainBody());
            if (!excerpt) continue;
            if (attempts >= 40) break;
            attempts++;
            try {
              const res = UrlFetchApp.fetch(url, {
                method: "post",
                contentType: "application/json",
                headers: { "X-Import-Secret": token },
                payload: JSON.stringify({
                  messageId: id, from: source.from,
                  subject: source.subject, body: excerpt,
                }),
                muteHttpExceptions: true,
                followRedirects: false,
              });
              if (res.getResponseCode() !== 200) {
                retries++;
                Logger.log("Bank email import HTTP " + res.getResponseCode() + ", retrying next run.");
                continue;
              }
              const response = JSON.parse(res.getContentText() || "{}");
              if (response.reason === "duplicate") duplicate++;
              else if (response.queued === true) queued++;
              else ignored++;
              seen[id] = now;
            } catch (_err) {
              retries++;
              Logger.log("Bank email transport error; retrying next run.");
            }
          }
          if (attempts >= 40) break;
        }
        if (threads.length < 100) break;
      }
    }
    const bounded = Object.entries(seen).sort((a,b) => b[1] - a[1]).slice(0,1200);
    props.setProperty("BANK_IMPORT_PROCESSED", JSON.stringify(Object.fromEntries(bounded)));
    Logger.log("Bank email import: queued=" + queued + ", duplicate=" + duplicate +
      ", ignored=" + ignored + ", retry=" + retries + ". No email content logged.");
  } finally {
    lock.releaseLock();
  }
}

function stopBankEmailImport() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "runBankEmailImport") ScriptApp.deleteTrigger(trigger);
  });
}

# Gmail bank-email import — Canara Bank and Union Bank

This feature supplements your working SMS Forwarder. It reads only selected
transaction messages through a Google Apps Script that **you own**.
No Gmail password or OAuth token is sent to Expense Tracker.

## Scope and privacy

Observed in the connected Gmail account (November 2026):

| Bank | Exact sender | Exact subject |
| --- | --- | --- |
| Canara Bank | canarabank@canarabank.com | UPI/IMPS/MB Transaction Alert |
| Union Bank | noreplyubi-txn@ubi.bank.in | DEBIT TRANSACTION ALERT |

Canara emails include debit/credit, amount, date, counterparty, and UPI Ref No.
Union Bank emails include numbered payee, amount, channel, transaction ID/RRN,
transaction success and date/time fields. The two formats are parsed separately.

Every matched bank email is **queued for manual review**, even if SMS
auto-record mode is enabled. The sender address alone is not cryptographic proof
of genuine bank origin; approve only real transactions.

The Apps Script sends **only a bank transaction excerpt** (not your inbox,
email attachments, bank balance, fraud hotline, or account number).
The server stores only structured transaction details and a compact summary
rather than the full email. Never paste banking credentials into scripts.

## 1. Merge and deploy

Review the draft PR, run tests, merge into main and let Vercel deploy.
Existing SMS forwarding and its endpoint remain unchanged.
No Prisma schema change or database migration is required.

The new endpoint is:

    https://expense-tracker-app-mu-mocha.vercel.app/api/import/email

Opening this in a browser will normally return 405: it accepts POST, not GET.

## 2. Create your own Google Apps Script

1. Visit https://script.google.com while signed into the Gmail account that
   receives the Canara and Union Bank transaction alerts.
2. Click New project. Name it Expense Tracker Bank Email Import.
3. Open Code.gs. Replace the initial sample code with the full contents of
   google-apps-script/Code.gs from this feature branch. Save.
4. Open Project Settings (gear) > Script properties and add:
   - BANK_IMPORT_URL =
     https://expense-tracker-app-mu-mocha.vercel.app/api/import/email
   - BANK_IMPORT_SECRET = the Secret Token from your deployed Expense Tracker,
     under Settings > UPI Auto-Import > Secret Token.
5. Do not put the token directly into Code.gs, a public repository, a screenshot,
   or a chat. This is the same token your SMS Forwarder uses.
6. Select setupBankEmailImport from the Apps Script function dropdown and
   click Run once. Accept the Google authorization requests for your own script.
7. The setup function sets a start timestamp NOW and installs a 5-minute
   time-driven trigger. Review Apps Script > Triggers to verify it exists.
8. You can run runBankEmailImport manually, and check Executions for counts.

The script will not send older messages by default. It scans a rolling 7-day
window for the two exact senders/subjects, but honors the installation time.
It limits deliveries per run, tracks already-processed Gmail message IDs, and
retries HTTP failures on subsequent runs.

**Do not make an extra real payment just to test.** Wait for the next normal
bank email, or test the API independently with synthetic (fake) data.

## 3. Check the Expense Tracker

Once a new matching alert arrives, after a scheduled run:
- Open your deployed Expense Tracker > Import Review.
- The email-imported row has an **Email** source badge.
- Check amount, date, payee, and category, then approve or reject.
- The script's Executions log reports queued, duplicate, ignored and retry counts.
- SMS Forwarder remains the fallback for the same transaction.

To stop the schedule, run stopBankEmailImport from Apps Script.

## Cross-source duplicate prevention

For transactions with a reference number, SMS and email use precisely the
same SHA-256 key based on user, bank, direction, and UPI reference. A unique
database index prevents duplicate queued or approved transactions even when
webhooks race. A different Gmail message ID with the same reference is also
considered duplicate.

Reference-free emails are held for review and deduplicated by Gmail message ID;
they cannot be reliably matched to an SMS with no reference. Manual dashboard
entries do not contain the bank reference and are not cross-deduplicated.

Existing SMS-only auto-record logic is unchanged; Gmail never auto-approves.

## Troubleshooting

| Status | Interpretation |
| --- | --- |
| HTTP 200 queued | New row is in Import Review |
| HTTP 200 duplicate | Already seen via SMS or email; nothing new to add |
| HTTP 200 unrecognized | Email format did not match; parser needs updating |
| HTTP 401 | Wrong or expired import token |
| HTTP 400 | Invalid request body or Gmail ID |
| HTTP 404 | Wrong deployed endpoint or not yet deployed |
| HTTP 503 | Server/database error; scheduled script retries |
| No new alerts | Check sender, subject, Gmail account, start timestamp, trigger |

If you regenerate the import token in Expense Tracker, update BANK_IMPORT_SECRET
in Apps Script AND the X-Import-Secret header in SMS Forwarder.

The Apps Script authorization grants the script access to Gmail; use a script
project you own, review the code, and do not share script-editor access.
Google Apps Script time-driven triggers can run a little later than the
nominal interval; this is not real-time push.

# Automatic UPI SMS import

## Modes

Settings → UPI Auto-Import → Automatic recording:

- **Trusted (default)**: A known-bank sender (Canara Bank or Union Bank), outgoing UPI debit, explicit transaction date, UPI reference, VPA, confident parser and deterministic categorizer result, with no failure/reversal indicators, is recorded automatically.
- **Review**: Every parsed alert is placed in Import Review for manual approval.
- Incoming credits, unknown senders, unrecognized merchants, low-confidence alerts, and other non-trusted messages stay in Import Review even in Trusted mode.

SMS alerts are not cryptographic proof of payment. This integration is designed for personal expense journaling, not settlement or reconciliation.

## Database migration

The updated Prisma schema adds \`User.importMode\` and an atomic uniqueness constraint on \`ImportQueue(userId, dedupeKey)\`.
Before deploying, check whether existing ImportQueue rows have duplicate non-null \`dedupeKey\` values, resolve duplicates manually, then run:

\`\`\`sh
npx prisma generate
npx prisma migrate dev --name trusted_sms_auto_import
\`\`\`

Deploy the corresponding migration with \`npx prisma migrate deploy\`. Do not run \`db push\` against production without reviewing its effects.

## Android SMS Forwarder

Use an Android SMS-forwarding app that supports a filtered HTTP POST with custom headers and JSON templating. Limit sender filters to your actual bank alert sender IDs.

- URL: \`https://YOUR_HTTPS_HOST/api/import/sms\`
- Method: \`POST\`
- Header: \`Content-Type: application/json\`
- Header: \`X-Import-Secret: <token from Settings>\`
- Body (map placeholders to the forwarding app's actual variable syntax):

\`\`\`json
{
  "from": "CANBNK",
  "body": "Rs.450.00 debited from A/c XX1234 on 04-Nov-26 for UPI/234567890123/zomato@okaxis.",
  "timestamp": "2026-11-04T20:30:00+05:30"
}
\`\`\`

These values are illustrative. Never forward OTP messages. Avoid query-parameter secrets, which can be captured in access logs. The receiver responds with HTTP 503 on transient processing failures so a forwarder with retries can replay safely. HTTP 200 for duplicates is intentional. Raw SMS content is sensitive; keep logs scrubbed, and periodically purge retained import records.

## Verification

1. Select "Review all SMS transactions first" and send a **synthetic** SMS via the HTTP webhook. Confirm Import Review receives it.
2. Switch to Trusted mode, send a new synthetic valid bank debit alert. Confirm the expense appears in the appropriate month.
3. Retry the exact same payload and verify no new row or expense is created.
4. Send a missing-reference message, unknown merchant, credit, and reversed alert. Confirm all stay queued.
5. Use new UPI references for each test; a previously queued reference will remain deduplicated even after changing the mode.
6. Run \`npm run test:sms\` and \`npm run build\` on your machine/CI before merging.

Actual forwarder payload format, sender IDs and production DB connection must be verified on the phone and hosting provider. This PR does not create a bank integration or direct UPI API connection.

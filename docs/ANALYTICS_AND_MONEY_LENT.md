# Expense analytics and Money Lent

## What's new

Analytics now counts **expenses only** in spend totals, category charts, cumulative trends and daily trends. Credits are incoming money, not spending.
New charts use Recharts already in this repository: category pie/doughnut, daily spending bars, income versus spending, top five merchants.

Money Lent creates **receivables**, separate from Expense. It tracks borrower, original lending date, principal, optional return date and note, partial repayments, and the outstanding amount. Amounts are stored as integer paise, so repayment arithmetic is exact.

Dashboard's remaining cash figure reflects monthly income + credits - expenses - new money lent + repayments received.
Money Lent also shows the total outstanding debt across all lending dates.

## Historical money lent

You can enter loans from previous months using their original lending dates. They change outstanding receivables today, while their cash-flow effect appears in the original month.

If you previously entered that payment as a regular expense, remove/reclassify the old expense first. Otherwise, adding the loan separately double counts the outflow.

If an SMS or bank-email transaction is still pending in Import Review, choose **Mark as Money Lent** (hand/coins icon) instead of the normal Approve action. Enter the borrower's name. The import is claimed and becomes a loan, not an expense.

When someone repays you, record the partial/full repayment in Money Lent. If the same repayment appears as a bank credit in Import Review, dismiss it rather than approving it as salary/income.

## Production deployment warning

This feature adds two PostgreSQL tables: Loan and LoanRepayment. The existing production Neon database does NOT gain them automatically through Vercel build.

1. Review the PR and GitHub Actions.
2. Create a backup / staging Neon branch before changing production data.
3. Inspect docs/migrations/20261116_loans.sql. It contains an additive SQL migration that does not update existing records.
4. Run the SQL against **staging** first. Test the preview deployment with the staging database.
5. Only after successful tests, apply the same reviewed SQL to production Neon, and merge/redeploy the app. Arrange rollout so the application does not query missing tables.
6. Build with npx prisma generate and npm run build. No destructive data-loss flag.

This project does not yet have an established Prisma migrations baseline. Do not blindly run prisma migrate deploy against the existing production schema. No live Neon database changes are made in this PR.

## Limitations

- Older manually approved expenses are not automatically converted to loans; you must reconcile them.
- Imported repayment credits are not auto-matched to a loan. Record the repayment manually and dismiss the duplicate credit.
- Bank statements / own-account transfers still need separate reconciliation.
- Imported loans cannot be deleted from the page, to avoid invalidating the linked bank import; manual loans can be deleted with confirmation.
- The Remaining Balance view is the cash flow of entries you recorded for a selected month, not an actual linked bank balance or an all-time carryforward.
- Repaid loans are interest-free in this initial model. Debt write-offs and loan editing are not yet included.

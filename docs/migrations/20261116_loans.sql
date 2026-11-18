-- Additive migration for established production database.
-- Take a Neon backup/snapshot and test in staging before running.
-- Does not modify existing Expense, User or ImportQueue records.

CREATE TABLE IF NOT EXISTS "Loan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "borrower" TEXT NOT NULL,
  "principalPaisa" INTEGER NOT NULL,
  "lentDate" TEXT NOT NULL,
  "dueDate" TEXT,
  "note" TEXT,
  "sourceImportId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_sourceImportId_key" ON "Loan"("sourceImportId");
CREATE INDEX IF NOT EXISTS "Loan_userId_lentDate_idx" ON "Loan"("userId", "lentDate");

CREATE TABLE IF NOT EXISTS "LoanRepayment" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "amountPaisa" INTEGER NOT NULL,
  "repaidDate" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LoanRepayment_loanId_repaidDate_idx" ON "LoanRepayment"("loanId","repaidDate");

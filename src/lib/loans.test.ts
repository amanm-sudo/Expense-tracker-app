import { describe, expect, it } from 'vitest';
import { isValidIsoDate, loanMonthSummary, toLoanView, toPaise, type FullLoan } from './loans';

function exampleLoan(): FullLoan {
  return {
    id: 'loan-1', userId: 'user-1', borrower: 'Friend', principalPaisa: 200000,
    lentDate: '2026-10-25', dueDate: null, note: null, sourceImportId: null,
    createdAt: new Date('2026-10-25T09:00:00Z'),
    repayments: [{ id: 'repay-1', loanId: 'loan-1', amountPaisa: 80000,
      repaidDate: '2026-11-16', note: null, createdAt: new Date('2026-11-16T09:00:00Z') }],
  };
}

describe('money lent math and validation', () => {
  it('uses integer paise, rejecting fractional paise and invalid amounts', () => {
    expect(toPaise(2000)).toBe(200000);
    expect(toPaise('800.50')).toBe(80050);
    expect(toPaise('0.01')).toBe(1);
    expect(toPaise('0.001')).toBeNull();
    expect(toPaise(-100)).toBeNull();
    expect(toPaise(0)).toBeNull();
    expect(toPaise('NaN')).toBeNull();
  });
  it('rejects impossible dates', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-11-16')).toBe(true);
  });
  it('tracks outstanding principal after partial repayment', () => {
    const loan = exampleLoan();
    expect(toLoanView(loan)).toMatchObject({principal:2000,repaid:800,outstanding:1200,status:'open'});
    loan.repayments.push({
      id:'repay-2',loanId:'loan-1',amountPaisa:120000,repaidDate:'2026-11-18',
      note:null,createdAt:new Date('2026-11-18T09:00:00Z'),
    });
    expect(toLoanView(loan)).toMatchObject({outstanding:0,status:'repaid'});
  });
  it('tracks lending and repayment in their original months', () => {
    const loans = [exampleLoan()];
    expect(loanMonthSummary(loans,'2026-10')).toMatchObject({lent:2000,repaid:0,outstanding:1200});
    expect(loanMonthSummary(loans,'2026-11')).toMatchObject({lent:0,repaid:800,outstanding:1200});
  });
});

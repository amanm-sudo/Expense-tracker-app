'use client';

import { useEffect, useState } from 'react';
import { ArrowDownLeft, HandCoins, Plus, Trash2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useStore } from '@/store/useStore';
import type { LoanView } from '@/lib/loans';

interface LoanResponse {
  items: LoanView[];
  totalOutstanding: number;
  totalLent: number;
}
const currency = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function localToday(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function LoansPage() {
  const { refreshAll, addToast } = useStore();
  const [data, setData] = useState<LoanResponse>({ items: [], totalOutstanding: 0, totalLent: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [lentDate, setLentDate] = useState(localToday);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [repayTarget, setRepayTarget] = useState<string | null>(null);
  const [repaidAmount, setRepaidAmount] = useState('');
  const [repaidDate, setRepaidDate] = useState(localToday);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/loans', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load Money Lent.');
      setData(await res.json() as LoanResponse);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Money Lent is unavailable.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submitLoan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/loans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrower, amount, lentDate, dueDate, note }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to save the loan.');
      setBorrower(''); setAmount(''); setNote(''); setDueDate('');
      addToast('Money lent recorded separately from expenses.', 'success');
      await load(); await refreshAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to save the loan.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function submitRepayment(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/loans/' + encodeURIComponent(id) + '/repay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: repaidAmount, repaidDate }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to save repayment.');
      setRepayTarget(null); setRepaidAmount('');
      addToast('Repayment recorded. Outstanding amount updated.', 'success');
      await load(); await refreshAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to record repayment.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeLoan(loan: LoanView) {
    if (saving || loan.sourceImportId) return;
    if (!window.confirm('Delete the money lent to ' + loan.borrower + ' and all its repayments? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/loans/' + encodeURIComponent(loan.id), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete.');
      addToast('Loan removed.', 'success');
      await load(); await refreshAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to delete.', 'error');
    } finally { setSaving(false); }
  }

  const totalRepaid = data.totalLent - data.totalOutstanding;
  const fieldStyle = 'w-full border border-gray-border rounded bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-sage-dark';

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />
      <div className="px-4 md:px-8 pb-10 flex-1">
        <div className="mb-7">
          <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">Receivables tracker</div>
          <h1 className="font-serif-display text-2xl md:text-[28px] text-text-primary">Money Lent</h1>
          <p className="text-text-secondary text-sm mt-1 max-w-xl">
            Track people who owe you money and partial repayments. Lending is a temporary cash outflow, not permanent spending.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-sage-dark rounded p-5 text-white">
            <div className="text-white/70 text-xs mb-2">Outstanding — owed to you</div>
            <div className="font-serif-display text-2xl">{currency(data.totalOutstanding)}</div>
          </div>
          <div className="bg-white border border-gray-border rounded p-5">
            <div className="text-text-muted text-xs mb-2">Total lent</div>
            <div className="font-serif-display text-2xl text-text-primary">{currency(data.totalLent)}</div>
          </div>
          <div className="bg-white border border-gray-border rounded p-5">
            <div className="text-text-muted text-xs mb-2">Total repaid</div>
            <div className="font-serif-display text-2xl text-emerald-700">{currency(totalRepaid)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="bg-white border border-gray-border rounded p-5 xl:col-span-1 h-fit">
            <div className="flex gap-2 items-center mb-4">
              <HandCoins size={20} className="text-sage-dark" />
              <h2 className="font-serif-display text-xl text-text-primary">Record money lent</h2>
            </div>
            <form onSubmit={submitLoan} className="space-y-3">
              <label className="block text-xs text-text-muted">Person / borrower
                <input className={fieldStyle + ' mt-1'} required maxLength={120}
                  value={borrower} onChange={e => setBorrower(e.target.value)} placeholder="Who owes you money?" />
              </label>
              <label className="block text-xs text-text-muted">Amount (₹)
                <input className={fieldStyle + ' mt-1'} required inputMode="decimal" type="number" min="0.01" step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
              </label>
              <label className="block text-xs text-text-muted">Date lent
                <input className={fieldStyle + ' mt-1'} required type="date" value={lentDate} onChange={e => setLentDate(e.target.value)} />
              </label>
              <label className="block text-xs text-text-muted">Expected return date (optional)
                <input className={fieldStyle + ' mt-1'} type="date" min={lentDate} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>
              <label className="block text-xs text-text-muted">Note (optional)
                <textarea className={fieldStyle + ' mt-1'} maxLength={500} rows={2}
                  value={note} onChange={e => setNote(e.target.value)} placeholder="Reason or reminder" />
              </label>
              <button type="submit" disabled={saving}
                className="w-full flex justify-center items-center gap-2 bg-sage-dark text-white rounded px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <Plus size={16} /> Add loan
              </button>
            </form>
            <p className="text-xs text-text-muted mt-4">
              For old loans, enter the original lending date. Don't also add the same payment as a normal expense.
            </p>
          </section>

          <section className="xl:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-serif-display text-xl text-text-primary">People who owe you</h2>
              <button onClick={() => void load()} className="text-xs text-sage-dark hover:underline">Refresh</button>
            </div>
            {loading ? <div className="p-8 bg-white border border-gray-border rounded text-text-muted">Loading loans…</div>
              : data.items.length === 0 ? (
                <div className="p-8 bg-white border border-gray-border rounded text-text-secondary text-sm">
                  No money lent recorded yet. Add a borrower on the left or classify a pending UPI debit as Money Lent.
                </div>
              ) : data.items.map(loan => (
                <div key={loan.id} className="bg-white border border-gray-border rounded p-4 md:p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary text-base">{loan.borrower}</h3>
                      <div className="text-xs text-text-muted mt-1">
                        Lent {loan.lentDate}{loan.dueDate ? ' · Due ' + loan.dueDate : ''}
                        {loan.sourceImportId ? ' · Bank import' : ''}
                      </div>
                      {loan.note && <p className="text-xs text-text-secondary mt-1">{loan.note}</p>}
                    </div>
                    <div className="text-right">
                      <div className="font-serif-display text-xl text-text-primary">{currency(loan.outstanding)}</div>
                      <div className="text-[11px] text-text-muted">remaining of {currency(loan.principal)}</div>
                      <div className={loan.status === 'repaid'
                        ? 'text-xs font-semibold mt-1 text-emerald-700'
                        : 'text-xs font-semibold mt-1 text-terracotta'}>
                        {loan.status === 'repaid' ? 'Fully repaid' : 'Awaiting repayment'}
                      </div>
                    </div>
                  </div>
                  {loan.repayments.length > 0 && (
                    <div className="mt-3 text-xs text-text-muted">
                      {loan.repayments.length} repayment(s) · {currency(loan.repaid)} received
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    {loan.outstanding > 0 && (
                      <button className="inline-flex gap-1.5 items-center text-xs font-semibold text-sage-dark hover:underline"
                        onClick={() => { setRepayTarget(loan.id === repayTarget ? null : loan.id); setRepaidAmount(''); }}>
                        <ArrowDownLeft size={15} /> Record repayment
                      </button>
                    )}
                    {!loan.sourceImportId && (
                      <button disabled={saving} className="inline-flex gap-1 items-center text-xs text-text-muted hover:text-red-600 disabled:opacity-50"
                        onClick={() => void removeLoan(loan)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                  {repayTarget === loan.id && (
                    <form onSubmit={event => void submitRepayment(event, loan.id)} className="mt-4 border-t border-gray-border pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs text-text-muted">Received (₹)
                        <input className={fieldStyle + ' mt-1'} type="number" step="0.01" min="0.01"
                          max={loan.outstanding} required value={repaidAmount}
                          onChange={e => setRepaidAmount(e.target.value)} />
                      </label>
                      <label className="text-xs text-text-muted">Received on
                        <input className={fieldStyle + ' mt-1'} type="date" required min={loan.lentDate}
                          value={repaidDate} onChange={e => setRepaidDate(e.target.value)} />
                      </label>
                      <button disabled={saving} type="submit" className="bg-sage-dark text-white rounded px-3 py-2 mt-4 text-xs font-semibold disabled:opacity-50">
                        Save repayment
                      </button>
                    </form>
                  )}
                </div>
              ))}
          </section>
        </div>
        <p className="text-xs text-text-muted mt-6">
          If a repayment is also imported from your bank as an incoming credit, dismiss that bank credit from Import Review to avoid counting it twice.
        </p>
      </div>
    </div>
  );
}

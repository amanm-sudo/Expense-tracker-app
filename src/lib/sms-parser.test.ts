import { describe, it, expect } from "vitest";
import { parseSms } from "./sms-parser";

/**
 * Real Canara / Union Bank wording variants. Account tails are redacted.
 * If a bank changes its SMS format, add the new wording here before adjusting
 * the parser — these fixtures are the regression net.
 */
const FIXTURES = {
  canaraDebit:
    "Dear Customer, Rs.450.00 debited from A/C No. XXXXXX on 04-Nov-26 for UPI/234567890123/zomato@okaxis. Avl Bal: Rs.12,340.50 -Canara Bank",
  canaraInfo:
    "INR 1800.00 Debited from Canara Bank Acct XX1234 on 04-NOV-2026. UPI Ref No: 613456789012. Info: MERCHANT NAME/abc@ybl.",
  canaraP2M:
    "Rs.250.00 debited from A/c XX1234 on 05-11-2026 for UPI/P2M/555123456789/merchant@okhdfcbank. Avl Bal: Rs.1,000.00",
  canaraOlder:
    "Your A/c XX1234 has been debited with Rs.500.00 on 04-11-2026 15:32:11 by UPI txn to VPA zomato@okaxis. UPI Ref No 412345678901.",
  ubiDebit:
    "Rs.230 debited from your Union Bank A/c XX5678 on 04-11-2026 for UPI transfer to VPA uber@okicici. UPI Ref: 406789012345.",
  ubiCredit:
    "Dear UBI Customer, INR 15000.00 has been credited to your account XX5678 on 04/11/2026 via UPI. Txn ID: 406789012345.",
  ubiShort:
    "Union Bank: Rs 850.00 debited from A/c XX5678 on 04/11/2026. UPI Ref 406123456789. Payee: bigbasket@hdfcbank",
  ubiHasBeenDebited:
    "Rs.500 has been debited from A/c XX1234 on 04-11-2026. UPI Ref No 412345678901.",
  genericUnknownBank:
    "Rs.99.00 debited from A/c XX0000 on 06-11-2026 to VPA chai@okaxis. Ref 999888777666",
  promo:
    "Get Rs.500 cashback on your next UPI payment! Offer valid till 30-11-2026.",
};

describe("parseSms — Canara Bank", () => {
  it("parses the classic UPI/<ref>/<vpa> debit alert and ignores the balance", () => {
    const parsed = parseSms(FIXTURES.canaraDebit, "CANBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(450);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.vpa).toBe("zomato@okaxis");
    expect(parsed!.merchant).toBe("Zomato");
    expect(parsed!.upiRef).toBe("234567890123");
    expect(parsed!.date).toBe("2026-11-04");
    expect(parsed!.bank).toBe("canara");
    expect(parsed!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("parses the INR ... Info: MERCHANT/vpa format", () => {
    const parsed = parseSms(FIXTURES.canaraInfo, "CANBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(1800);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.vpa).toBe("abc@ybl");
    expect(parsed!.upiRef).toBe("613456789012");
    expect(parsed!.date).toBe("2026-11-04");
  });

  it("parses UPI/P2M/<ref>/<vpa> references", () => {
    const parsed = parseSms(FIXTURES.canaraP2M, "CANBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(250);
    expect(parsed!.vpa).toBe("merchant@okhdfcbank");
    expect(parsed!.upiRef).toBe("555123456789");
    expect(parsed!.date).toBe("2026-11-05");
  });

  it("parses the older 'has been debited with' wording and strips the time", () => {
    const parsed = parseSms(FIXTURES.canaraOlder, "CANBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(500);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.vpa).toBe("zomato@okaxis");
    expect(parsed!.upiRef).toBe("412345678901");
    expect(parsed!.date).toBe("2026-11-04");
  });
});

describe("parseSms — Union Bank of India", () => {
  it("parses a UPI transfer with an explicit VPA", () => {
    const parsed = parseSms(FIXTURES.ubiDebit, "UBIBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(230);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.vpa).toBe("uber@okicici");
    expect(parsed!.merchant).toBe("Uber");
    expect(parsed!.upiRef).toBe("406789012345");
    expect(parsed!.date).toBe("2026-11-04");
  });

  it("detects a credit and its transaction id", () => {
    const parsed = parseSms(FIXTURES.ubiCredit, "UBIBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(15000);
    expect(parsed!.txnType).toBe("credit");
    expect(parsed!.vpa).toBeNull();
    expect(parsed!.upiRef).toBe("406789012345");
    expect(parsed!.date).toBe("2026-11-04");
  });

  it("parses the short 'Union Bank:' alert with a Payee VPA", () => {
    const parsed = parseSms(FIXTURES.ubiShort, "");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(850);
    expect(parsed!.vpa).toBe("bigbasket@hdfcbank");
    expect(parsed!.merchant).toBe("BigBasket");
    expect(parsed!.upiRef).toBe("406123456789");
    expect(parsed!.bank).toBe("ubi");
  });

  it("parses 'Rs.X has been debited from' wording", () => {
    const parsed = parseSms(FIXTURES.ubiHasBeenDebited, "UBIBNK");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(500);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.upiRef).toBe("412345678901");
    expect(parsed!.date).toBe("2026-11-04");
  });
});

describe("parseSms — generic fallback and rejection", () => {
  it("falls back to generic parsing for an unknown sender/format", () => {
    const parsed = parseSms(FIXTURES.genericUnknownBank, "UNKNOWN");
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(99);
    expect(parsed!.txnType).toBe("expense");
    expect(parsed!.vpa).toBe("chai@okaxis");
    expect(parsed!.date).toBe("2026-11-06");
    expect(parsed!.bank).toBe("generic");
    expect(parsed!.confidence).toBeLessThan(0.9);
  });

  it("ignores promotional messages that are not transactions", () => {
    expect(parseSms(FIXTURES.promo, "CANBNK")).toBeNull();
  });

  it("returns null for an empty body", () => {
    expect(parseSms("   ", "CANBNK")).toBeNull();
  });
});

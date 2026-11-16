import { describe, expect, it } from "vitest";
import { parseBankEmail } from "./email-parser";
import { parseSms } from "./sms-parser";
import { buildBankReferenceDedupeKey, buildEmailMessageDedupeKey, buildImportDedupeKey } from "./import-dedupe";

const canaraFrom = "canarabank@canarabank.com";
const canaraSubject = "UPI/IMPS/MB Transaction Alert";
const ubiFrom = "noreplyubi-txn@ubi.bank.in";
const ubiSubject = "DEBIT TRANSACTION ALERT";

const canaraDebit = "An amount of INR 450.00 has been DEBITED on 16/11/26 from your account XXX000 to Zomato with UPI Ref No.:123456789012. Total Available Balance INR 9999.00";
const canaraCredit = "An amount of INR 500.00 has been CREDITED on 16/11/26 to your account XXX000 from SAMPLE PERSON with UPI Ref No.:123456789013.";

const ubiDebit = [
  "Your fund transfer request through UPI has been processed successfully.",
  "Transaction Details",
  "1. Payee Name : SAMPLE STORE",
  "2. Amount : Rs.1,250.50",
  "3. Channel : UPI",
  "4. Transaction ID/RRN : 234567890123",
  "5. Transaction Status : Success",
  "6. Transaction Date and Time : 16-11-2026 01:17:41",
  "7. Debit Account Number : *0000",
].join("\n");

describe("Gmail bank email parser", () => {
  it("parses Canara debit, not available balance", () => {
    expect(parseBankEmail(canaraFrom,canaraSubject,canaraDebit)).toMatchObject({
      bank:"canara",txnType:"expense",amount:450,date:"2026-11-16",merchant:"Zomato",upiRef:"123456789012"
    });
  });
  it("parses Canara incoming credit", () => {
    expect(parseBankEmail(canaraFrom,canaraSubject,canaraCredit)).toMatchObject({
      bank:"canara",txnType:"credit",amount:500,merchant:"SAMPLE PERSON",upiRef:"123456789013"
    });
  });
  it("parses Union Bank successful UPI debit", () => {
    expect(parseBankEmail("Union Bank <" + ubiFrom + ">",ubiSubject,ubiDebit)).toMatchObject({
      bank:"ubi",txnType:"expense",amount:1250.5,date:"2026-11-16",merchant:"SAMPLE STORE",upiRef:"234567890123"
    });
  });
  it("rejects wrong sender, channel, status, subject and invalid dates", () => {
    expect(parseBankEmail(ubiFrom,ubiSubject,ubiDebit.replace("Success","Failed"))).toBeNull();
    expect(parseBankEmail(ubiFrom,ubiSubject,ubiDebit.replace("3. Channel : UPI","3. Channel : NEFT"))).toBeNull();
    expect(parseBankEmail("fraud@" + canaraFrom,canaraSubject,canaraDebit)).toBeNull();
    expect(parseBankEmail(canaraFrom,"Account Balance Alert",canaraDebit)).toBeNull();
    expect(parseBankEmail(canaraFrom,canaraSubject,canaraDebit.replace("16/11/26","31/02/26"))).toBeNull();
    expect(parseBankEmail(ubiFrom,ubiSubject,ubiDebit.replace("16-11-2026","31-02-2026"))).toBeNull();
    expect(parseBankEmail(ubiFrom,ubiSubject,ubiDebit.replace("4. Transaction ID/RRN : 234567890123","4. Transaction ID/RRN : invalid"))).toBeNull();
  });
});

describe("cross-source transaction identity", () => {
  it("matches SMS and email by bank/direction/UPI reference", () => {
    const smsText = "Rs.450.00 debited from A/c XX1234 on 16-11-2026 for UPI/123456789012/zomato@okaxis.";
    const sms = parseSms(smsText,"CANBNK")!;
    const email = parseBankEmail(canaraFrom,canaraSubject,canaraDebit)!;
    expect(sms?.upiRef).toBe("123456789012");
    expect(buildImportDedupeKey("u1",sms,"CANBNK",smsText)).toBe(
      buildBankReferenceDedupeKey("u1",email.bank,email.txnType,email.upiRef!)
    );
  });
  it("isolates users, banks, direction and Gmail message IDs", () => {
    const key = buildBankReferenceDedupeKey("u1","canara","expense","123456789012");
    expect(key).not.toBe(buildBankReferenceDedupeKey("u2","canara","expense","123456789012"));
    expect(key).not.toBe(buildBankReferenceDedupeKey("u1","ubi","expense","123456789012"));
    expect(key).not.toBe(buildBankReferenceDedupeKey("u1","canara","credit","123456789012"));
    expect(buildEmailMessageDedupeKey("u1","abc12345")).toBe(buildEmailMessageDedupeKey("u1","abc12345"));
  });
});

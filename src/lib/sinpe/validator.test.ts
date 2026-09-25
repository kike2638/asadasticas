import { validateSinpeRef, isDuplicateSinpe } from "./validator";
function assert(c: boolean, m: string) { if (!c) throw new Error(m); }
let v = validateSinpeRef("123456"); assert(v.valid, "6 dig ok");
v = validateSinpeRef("abc"); assert(!v.valid, "abc fail");
v = validateSinpeRef("000000"); assert(!v.valid, "zeros fail");
assert(isDuplicateSinpe("123456", 10000, [{ referenceNumber: "123456", amount: 10000, paymentDate: new Date() }]), "dup");
assert(!isDuplicateSinpe("999999", 10000, [{ referenceNumber: "123456", amount: 10000, paymentDate: new Date() }]), "no dup");
console.log("✅ sinpe validator 5/5");

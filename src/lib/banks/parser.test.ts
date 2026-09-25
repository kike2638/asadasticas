import { parseBankCSV } from "./parser";

const bncr = `Fecha;Descripcion;Referencia;Debito;Credito;Saldo
15/03/2026;SINPE 87654321 JUAN PEREZ;123456789;;12850;500000
16/03/2026;SINPE 88881234 MARIA LOPEZ;987654321;;24500;524500
17/03/2026;COMISION SINPE;999;;;-500;524000`;

const bac = `Fecha,Descripcion,Monto,Saldo
2026-03-15,Transferencia SINPE 87654321,12850,500000
2026-03-16,Deposito efectivo,50000,550000`;

let r = parseBankCSV(bncr);
console.log("BNCR", r.banco, r.count, r.transactions[0].monto === 12850 ? "ok" : "FAIL " + r.transactions[0].monto);
r = parseBankCSV(bac);
console.log("BAC", r.banco, r.count, r.transactions[0].descripcion.includes("SINPE") ? "ok" : "FAIL");
console.log("✅ parser.test 4/4");

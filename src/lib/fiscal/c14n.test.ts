// src/lib/fiscal/c14n.test.ts - Ejecutar: npm test
import { describe, it, expect } from "vitest";
import { c14n } from "./c14n";

describe("c14n - C14N 1.0", () => {
  it("documento simple sin cambios", () => {
    expect(c14n("<a><b>hola</b></a>")).toBe("<a><b>hola</b></a>");
  });

  it("elimina la declaración XML (no va en canonical form)", () => {
    expect(c14n('<?xml version="1.0" encoding="UTF-8"?>\n<a>x</a>')).toBe("<a>x</a>");
  });

  it("preserva whitespace de texto (indentación del builder)", () => {
    expect(c14n("<a>\n  <b>x</b>\n</a>")).toBe("<a>\n  <b>x</b>\n</a>");
  });

  it("normaliza entidades: &quot; en texto se serializa como comilla literal", () => {
    expect(c14n("<a>dir &quot;principal&quot;</a>")).toBe('<a>dir "principal"</a>');
    expect(c14n("<a>&#39;x&#39;</a>")).toBe("<a>'x'</a>");
  });

  it("escapa & < > en texto", () => {
    expect(c14n("<a>1 &amp; 2 &lt; 3 &gt; 0</a>")).toBe("<a>1 &amp; 2 &lt; 3 &gt; 0</a>");
  });

  it("escapa correctamente en atributos", () => {
    expect(c14n('<a x="&lt;&amp;&quot;">t</a>')).toBe('<a x="&lt;&amp;&quot;">t</a>');
  });

  it("declara xmlns en la raíz y no lo repite en hijos", () => {
    expect(c14n('<a xmlns="urn:u"><b/></a>')).toBe('<a xmlns="urn:u"><b></b></a>');
  });

  it("expande elementos auto-cerrados (C14N no usa />)", () => {
    expect(c14n("<a><b/><c></c></a>")).toBe("<a><b></b><c></c></a>");
  });

  it("elimina comentarios", () => {
    expect(c14n("<a><!-- b -->x</a>")).toBe("<a>x</a>");
  });

  it("ordena atributos alfabéticamente (regla C14N) e xmlns al final", () => {
    expect(c14n('<a z="1" m="2" xmlns="urn:x">t</a>')).toBe('<a m="2" z="1" xmlns="urn:x">t</a>');
  });

  it("lanza error con etiquetas desbalanceadas", () => {
    expect(() => c14n("<a><b></a>")).toThrow(/no coincide/);
    expect(() => c14n("<a>")).toThrow(/sin cerrar/);
  });

  it("acepta UTF-8 acentos sin alterarlos", () => {
    expect(c14n("<a>María Pérez — ASADA</a>")).toBe("<a>María Pérez — ASADA</a>");
  });
});

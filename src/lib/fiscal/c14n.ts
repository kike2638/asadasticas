// src/lib/fiscal/c14n.ts - XML Canonicalization (C14N) 1.0 sin comentarios
// Suficiente para documentos generados por xml-builder.ts: sin CDATA/DOCTYPE/PI
// (la decl <?xml ...?> se elimina), sin comentarios, atributos simples y texto.
// Producción y verificación de Hacienda usan la misma c14n => el digest coincide.

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
};

function decodeEntidades(s: string): string {
  return s.replace(/&(#[0-9]+|#x[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTIDADES[e];
  });
}

function escTexto(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAtributo(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
    .replace(/\t/g, "&#x9;").replace(/\n/g, "&#xA;").replace(/\r/g, "&#xD;");
}

interface Atributo { ns: string; nombre: string; valor: string }

// Orden C14N de atributos: por namespace URI, luego local name
function ordenarAtributos(attrs: Atributo[]): Atributo[] {
  return [...attrs].sort((a, b) => (a.ns === b.ns ? a.nombre.localeCompare(b.nombre) : a.ns.localeCompare(b.ns)));
}

export function c14n(xml: string): string {
  let s = xml.replace(/^\s*<\?xml[^?]*\?>\s*/, ""); // la decl XML no va en canonical form
  let out = "";
  const pila: { activos: Map<string, string>; emitidos: Map<string, string> }[] = [];
  let activos = new Map<string, string>(); // prefix ("" = default) -> uri en scope
  let emitidos = new Map<string, string>(); // prefix -> uri ya escritos en la salida
  const esperados: string[] = [];
  let i = 0;

  while (i < s.length) {
    if (s[i] === "<") {
      if (s.startsWith("<!--", i)) {
        const fin = s.indexOf("-->", i);
        if (fin < 0) throw new Error("c14n: comentario sin cerrar");
        i = fin + 3; // C14N sin comentarios: se eliminan
        continue;
      }
      if (s.startsWith("<![CDATA[", i)) throw new Error("c14n: CDATA no soportado");
      if (s.startsWith("<!", i)) throw new Error("c14n: DOCTYPE/otras decls no soportadas");
      if (s.startsWith("<?", i)) {
        const fin = s.indexOf("?>", i);
        if (fin < 0) throw new Error("c14n: PI sin cerrar");
        i = fin + 2; // PI (además de la decl inicial) eliminadas por simplificación
        continue;
      }

      if (s.startsWith("</", i)) {
        const fin = s.indexOf(">", i);
        if (fin < 0) throw new Error("c14n: etiqueta de cierre inválida");
        const nombre = s.slice(i + 2, fin);
        const esperado = esperados.pop();
        if (esperado !== nombre) throw new Error(`c14n: cierre </${nombre}> no coincide con <${esperado}>`);
        out += `</${nombre}>`;
        const snap = pila.pop();
        if (snap) { activos = snap.activos; emitidos = snap.emitidos; }
        i = fin + 1;
        continue;
      }

      // Apertura de elemento: nombre + atributos
      i++;
      const mNombre = /^[A-Za-z_][\w.\-:]*/.exec(s.slice(i));
      if (!mNombre) throw new Error("c14n: nombre de elemento inválido");
      const nombre = mNombre[0];
      i += nombre.length;

      const attrs: Atributo[] = [];
      const nsLocales: { prefix: string; uri: string }[] = [];
      for (;;) {
        const mm = /^\s+/.exec(s.slice(i));
        if (mm) i += mm[0].length;
        if (s[i] === ">" || s[i] === "/") break;
        const mAttr = /^[A-Za-z_][\w.\-:]*/.exec(s.slice(i));
        if (!mAttr) throw new Error(`c14n: atributo inválido en <${nombre}>`);
        const attrName = mAttr[0];
        i += attrName.length;
        if (s[i] !== "=") throw new Error(`c14n: atributo ${attrName} sin valor`);
        i++;
        const comilla = s[i];
        if (comilla !== '"' && comilla !== "'") throw new Error(`c14n: valor de ${attrName} sin comillas`);
        i++;
        const finVal = s.indexOf(comilla, i);
        if (finVal < 0) throw new Error(`c14n: valor de ${attrName} sin cerrar`);
        const valor = decodeEntidades(s.slice(i, finVal));
        i = finVal + 1;

        if (attrName === "xmlns") nsLocales.push({ prefix: "", uri: valor });
        else if (attrName.startsWith("xmlns:")) nsLocales.push({ prefix: attrName.slice(6), uri: valor });
        else {
          const dosPuntos = attrName.indexOf(":");
          const ns = dosPuntos >= 0 && !attrName.startsWith("xmlns") ? "(prefijo no resuelto)" : "";
          attrs.push({ ns, nombre: dosPuntos >= 0 ? attrName.slice(dosPuntos + 1) : attrName, valor });
        }
      }
      const selfClose = s[i] === "/";
      i += selfClose ? 2 : 1; // consume "/>" o ">"

      // Scope de namespaces del elemento
      pila.push({ activos, emitidos });
      const scope = new Map(activos);
      for (const n of nsLocales) scope.set(n.prefix, n.uri);

      // Emitir namespaces visibles aún no escritos (o cambiados)
      let nsOut = "";
      const nuevos = new Map(emitidos);
      for (const [prefix, uri] of scope) {
        if (emitidos.get(prefix) !== uri) {
          nsOut += prefix === "" ? ` xmlns="${escAtributo(uri)}"` : ` xmlns:${prefix}="${escAtributo(uri)}"`;
          nuevos.set(prefix, uri);
        }
      }
      emitidos = nuevos;
      activos = scope;

      const attrsOut = ordenarAtributos(attrs)
        .map(a => ` ${a.ns === "" ? a.nombre : a.nombre}="${escAtributo(a.valor)}"`)
        .join("");
      out += `<${nombre}${attrsOut}${nsOut}>`;
      if (selfClose) {
        out += `</${nombre}>`;
        const snap = pila.pop();
        if (snap) { activos = snap.activos; emitidos = snap.emitidos; }
      } else {
        esperados.push(nombre);
      }
      continue;
    }

    // Texto
    const fin = s.indexOf("<", i);
    const trozo = fin < 0 ? s.slice(i) : s.slice(i, fin);
    out += escTexto(decodeEntidades(trozo));
    i = fin < 0 ? s.length : fin;
  }

  if (esperados.length > 0) throw new Error(`c14n: elementos sin cerrar: ${esperados.join(", ")}`);
  return out;
}

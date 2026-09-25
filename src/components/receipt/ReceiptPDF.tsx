"use client";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 8, fontFamily: "Helvetica", width: 226 }, // 80mm
  header: { textAlign: "center", marginBottom: 8, borderBottom: "1 solid #ccc", paddingBottom: 8 },
  title: { fontSize: 10, fontWeight: "bold" },
  subtitle: { fontSize: 7, color: "#666" },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 1 },
  label: { color: "#666" },
  value: { fontWeight: "bold" },
  divider: { borderBottom: "1 dashed #999", marginVertical: 6 },
  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f0f0f0", padding: 6, marginTop: 6 },
  footer: { textAlign: "center", marginTop: 8, fontSize: 6, color: "#888" },
  badge: { backgroundColor: "#22d3ee", color: "#042635", padding: 2, fontSize: 6, textAlign: "center", marginTop: 4 },
});

export function ReceiptDoc({ data }: { data: any }) {
  return (
    <Document>
      <Page size={[226, 600]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.asadaNombre}</Text>
          <Text style={styles.subtitle}>ASADA • Céd. Jur. {data.cedulaJuridica ?? "—"}</Text>
          <Text style={styles.subtitle}>Tel: {data.telefono ?? "—"} • {data.email ?? ""}</Text>
          <Text style={styles.badge}>TIQUETE ELECTRÓNICO • Clave {String(data.clave).slice(0, 22)}...</Text>
        </View>

        <View style={styles.row}><Text style={styles.label}>Recibo:</Text><Text style={styles.value}>{data.consecutivo}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text>{new Date(data.fecha).toLocaleString("es-CR")}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Abonado:</Text><Text style={styles.value}>{data.abonado}</Text></View>
        <View style={styles.row}><Text style={styles.label}>NIS:</Text><Text>{data.nis}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Periodo:</Text><Text>{data.periodo}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Medidor:</Text><Text>{data.medidor}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Consumo:</Text><Text style={styles.value}>{data.consumo} m³ ({data.prev} → {data.curr})</Text></View>

        <View style={styles.divider} />

        {data.detalle.map((d: any, i: number) => (
          <View key={i} style={styles.row}><Text style={styles.label}>{d.label}</Text><Text>{d.value}</Text></View>
        ))}

        <View style={styles.divider} />
        <View style={styles.row}><Text>Subtotal exento</Text><Text>{data.subtotalExento}</Text></View>
        <View style={styles.row}><Text>Subtotal gravado</Text><Text>{data.subtotalGravado}</Text></View>
        <View style={styles.row}><Text>IVA 13%</Text><Text>{data.iva}</Text></View>
        <View style={styles.total}><Text style={{ fontWeight: "bold" }}>TOTAL</Text><Text style={{ fontWeight: "bold" }}>{data.total}</Text></View>

        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Método:</Text><Text style={styles.value}>{data.metodoPago}</Text></View>
        {data.referencia && <View style={styles.row}><Text style={styles.label}>Ref:</Text><Text>{data.referencia}</Text></View>}
        <View style={styles.row}><Text style={styles.label}>Saldo pendiente:</Text><Text>{data.saldoPendiente}</Text></View>

        <Text style={styles.footer}>¡Gracias por su pago! Conserve este recibo.{"\n"}Consultas: WhatsApp {data.telefono} • Hacienda: ver clave completa en factura electrónica{"\n"}— AquaLectura CR v2 —</Text>
      </Page>
    </Document>
  );
}

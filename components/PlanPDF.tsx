// PDF del plan semanal: tipografía grande, pensado para leer en una tablet sobre la encimera.
// Se genera en el servidor (Route Handler /plan/pdf) con renderToBuffer.
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

export interface ComidaPDF {
  tipo: string; nombre: string; tiempo: number; kcal: number; proteina: number; foto?: string;
  ingredientes: string[]; pasos: string[]; notas: string[];
}
export interface DiaPDF { dia: number; comidas: ComidaPDF[] }

const s = StyleSheet.create({
  page: { padding: 34, backgroundColor: '#F0FDF4', fontFamily: 'Helvetica' },
  portada: { fontSize: 38, color: '#064E3B', fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  sub: { fontSize: 17, color: '#059669', marginBottom: 18 },
  dia: { fontSize: 24, color: '#FFFFFF', backgroundColor: '#064E3B', padding: 10, borderRadius: 10, marginBottom: 14, fontFamily: 'Helvetica-Bold' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14 },
  tipo: { fontSize: 12, color: '#059669', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  titulo: { fontSize: 22, color: '#064E3B', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 14, color: '#047857', marginBottom: 8 },
  foto: { width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 10 },
  h: { fontSize: 16, color: '#064E3B', marginTop: 8, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  txt: { fontSize: 13.5, lineHeight: 1.5, color: '#1F2937', marginBottom: 2 },
  nota: { fontSize: 12.5, lineHeight: 1.45, color: '#064E3B', backgroundColor: '#ECFDF5', padding: 6, borderRadius: 6, marginTop: 4 },
  pie: { position: 'absolute', bottom: 16, left: 34, right: 34, fontSize: 10, color: '#6B7280', textAlign: 'center' },
});

export function PlanPDF({ alias, semana, calorias, dias }: { alias: string; semana: number; calorias: number; dias: DiaPDF[] }) {
  return (
    <Document title={`NutriPlot · ${alias} · Semana ${semana}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.portada}>NutriPlot</Text>
        <Text style={s.sub}>Plan de {alias} · Semana {semana} · {calorias} kcal al día</Text>
        <Text style={s.txt}>Tu semana, día por día. Las cantidades están calculadas para tu porción. Paso a paso se llega lejos.</Text>
      </Page>
      {dias.map((d) => (
        <Page key={d.dia} size="A4" style={s.page} wrap>
          <Text style={s.dia}>Día {d.dia}</Text>
          {d.comidas.map((c, i) => (
            <View key={i} style={s.card}>
              <Text style={s.tipo} minPresenceAhead={80}>{c.tipo}</Text>
              <Text style={s.titulo}>{c.nombre}</Text>
              <Text style={s.meta}>{c.tiempo} min · {c.kcal} kcal · {c.proteina} g de proteína</Text>
              {c.foto ? <Image src={c.foto} style={s.foto} /> : null}
              <Text style={s.h}>Ingredientes</Text>
              {c.ingredientes.map((x, j) => <Text key={j} style={s.txt}>• {x}</Text>)}
              <Text style={s.h}>Preparación</Text>
              {c.pasos.map((x, j) => <Text key={j} style={s.txt}>{j + 1}. {x}</Text>)}
              {c.notas.map((x, j) => <Text key={j} style={s.nota}>{x}</Text>)}
            </View>
          ))}
          <Text style={s.pie} fixed>Foto referencial generada con IA. Calorías estimadas; no reemplazan la guía de un nutricionista.</Text>
        </Page>
      ))}
    </Document>
  );
}

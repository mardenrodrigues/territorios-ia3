import { TERRITORIES, counts, pairs, voices } from './data';

export type Island = { name: string; x: number; y: number; r: number; bottom: number; path: string; dots: { x: number; y: number; id: string }[] };

/* Espaço reservado abaixo de cada ilha para a etiqueta com o nome (fica fora da costa). */
const LABEL_H = 34;
export type Trail = { a: string; b: string; n: number; d: string };

/* Raio com piso e teto: a área sugere volume sem virar régua. */
const radius = (n: number) => 44 + Math.sqrt(n) * 7;

/* Posição por vizinhança: quem compartilha vozes fica perto (força-dirigida, determinística). */
function positions(W: number, H: number) {
  const names = TERRITORIES.map((t) => t.name);
  const idx = new Map(names.map((n, i) => [n, i]));
  const r = names.map((n) => radius(counts[n] ?? 0));
  // ponto de partida: círculo, na ordem da lista
  const p = names.map((_, i) => { const a = (i / names.length) * Math.PI * 2 - Math.PI / 2; return { x: W / 2 + Math.cos(a) * W * 0.33, y: H / 2 + Math.sin(a) * H * 0.33 }; });
  const maxN = pairs[0]?.n ?? 1;
  for (let it = 0; it < 400; it++) {
    const f = p.map(() => ({ x: 0, y: 0 }));
    // atração por vozes compartilhadas
    for (const { a, b, n } of pairs) {
      const i = idx.get(a)!, j = idx.get(b)!; const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y; const d = Math.hypot(dx, dy) || 1;
      const want = r[i] + r[j] + 40 + (1 - n / maxN) * 160; const k = 0.02 * (n / maxN + 0.15);
      const s = (d - want) * k; f[i].x += (dx / d) * s; f[i].y += (dy / d) * s; f[j].x -= (dx / d) * s; f[j].y -= (dy / d) * s;
    }
    // repulsão: ninguém encosta
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y; const d = Math.hypot(dx, dy) || 1; const min = r[i] + r[j] + 34 + LABEL_H;
      if (d < min) { const s = (min - d) * 0.5; f[i].x -= (dx / d) * s; f[i].y -= (dy / d) * s; f[j].x += (dx / d) * s; f[j].y += (dy / d) * s; }
    }
    // gravidade leve para o centro e paredes
    for (let i = 0; i < p.length; i++) {
      f[i].x += (W / 2 - p[i].x) * 0.004; f[i].y += (H / 2 - p[i].y) * 0.004;
      p[i].x = Math.min(W - r[i] - 10, Math.max(r[i] + 10, p[i].x + f[i].x)); p[i].y = Math.min(H - r[i] - 10 - LABEL_H, Math.max(r[i] + 10, p[i].y + f[i].y));
    }
  }
  return names.map((n, i) => ({ name: n, x: p[i].x, y: p[i].y, r: r[i] }));
}

/* Contorno derivado dos dados: quanto mais vozes do território atravessam outros,
   mais irregular a costa. Harmônicos com fase fixa por território (mesma ilha a cada visita). */
function coast(cx: number, cy: number, r: number, name: string, i: number) {
  const total = counts[name] ?? 1;
  const crossing = voices.filter((v) => v.territory === name && v.related.length > 0).length / total; // 0..1
  const amp = 0.06 + crossing * 0.16;
  const pts: [number, number][] = [];
  const N = 48;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const w = 1 + amp * (Math.sin(3 * a + i * 1.7) * 0.6 + Math.sin(5 * a + i * 0.9) * 0.3 + Math.sin(2 * a + i * 2.3) * 0.5);
    pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w * 0.92]);
  }
  // curva suave (Catmull-Rom → Bézier)
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 0; k < N; k++) {
    const p0 = pts[(k - 1 + N) % N], p1 = pts[k], p2 = pts[(k + 1) % N], p3 = pts[(k + 2) % N];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return { d: d + ' Z', bottom: Math.max(...pts.map((p) => p[1])) };
}

/* Pontos = vozes, em espiral de girassol dentro da ilha. */
function dots(cx: number, cy: number, r: number, name: string) {
  const vs = voices.filter((v) => v.territory === name);
  const golden = Math.PI * (3 - Math.sqrt(5));
  return vs.map((v, k) => { const t = (k + 0.5) / vs.length; const rr = Math.sqrt(t) * r * 0.5; const a = k * golden; return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.92, id: v.id }; });
}

export function buildLandscape(W = 1100, H = 720): { islands: Island[]; trails: Trail[] } {
  const pos = positions(W, H);
  const islands = pos.map((p, i) => { const c = coast(p.x, p.y, p.r, p.name, i); return { ...p, path: c.d, bottom: c.bottom, dots: dots(p.x, p.y, p.r, p.name) }; });
  const byName = new Map(islands.map((i) => [i.name, i]));
  const trails = pairs.filter((p) => p.n >= 5).map((p) => {
    const a = byName.get(p.a)!, b = byName.get(p.b)!;
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
    return { a: p.a, b: p.b, n: p.n, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}` };
  });
  return { islands, trails };
}

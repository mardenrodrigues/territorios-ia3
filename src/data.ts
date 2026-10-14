import voicesData from './voices.json';

export type Voice = {
  id: string; date: string; process: string; current: string; opportunity: string;
  territory: string; related: string[]; operations: string[]; contributions: string[]; excerpt: string;
};
export const voices = voicesData as Voice[];

export type Territory = { name: string; short: string; bg: string; fg: string };
export const TERRITORIES: Territory[] = [
  { name: 'Gestão de dados e conhecimento', short: 'Dados e conhecimento', bg: '#9300FF', fg: '#fff' },
  { name: 'Projetos, programas e operação', short: 'Projetos e operação', bg: '#353A8E', fg: '#fff' },
  { name: 'Comunicação e mobilização', short: 'Comunicação e mobilização', bg: '#E03A62', fg: '#fff' },
  { name: 'Monitoramento, avaliação e impacto', short: 'Monitoramento e impacto', bg: '#28E2D4', fg: '#1a1a1a' },
  { name: 'Captação de recursos e parcerias', short: 'Captação e parcerias', bg: '#252D65', fg: '#fff' },
  { name: 'Atendimento, cuidado e proteção', short: 'Atendimento e cuidado', bg: '#EFA1A1', fg: '#1a1a1a' },
  { name: 'Gestão administrativa e financeira', short: 'Administrativo e financeiro', bg: '#7C7FBD', fg: '#fff' },
  { name: 'Educação e formação', short: 'Educação e formação', bg: '#C9B8FF', fg: '#1a1a1a' },
  { name: 'Governança, estratégia e decisão', short: 'Governança e estratégia', bg: '#B8C4F2', fg: '#1a1a1a' },
  { name: 'Gestão de pessoas e desenvolvimento', short: 'Pessoas e equipe', bg: '#FBD1D1', fg: '#1a1a1a' },
];
export const territoryByName = (n: string) => TERRITORIES.find((t) => t.name === n);

/* Tela 2: frases em primeira pessoa → rótulo da classificação. A planilha continua intocada. */
export const PHRASES: { phrase: string; label: string }[] = [
  { phrase: 'Parar de fazer na mão o que se repete toda semana', label: 'Automatizar tarefas repetitivas' },
  { phrase: 'Entender o que os nossos dados estão dizendo', label: 'Analisar e cruzar dados' },
  { phrase: 'Escrever melhor e mais rápido: relatórios, posts, projetos', label: 'Produzir ou revisar conteúdo' },
  { phrase: 'Colocar ordem em informações espalhadas', label: 'Organizar e padronizar informações' },
  { phrase: 'Encontrar o que importa no meio de muita coisa', label: 'Buscar e triar informações' },
  { phrase: 'Decidir e planejar com mais segurança', label: 'Apoiar decisões e planejamento' },
  { phrase: 'Transformar áudios, fotos e papéis em informação útil', label: 'Processar áudios, imagens ou documentos' },
  { phrase: 'Atender ou ensinar cada pessoa do seu jeito', label: 'Personalizar atendimento ou aprendizagem' },
  { phrase: 'Ser avisado a tempo e acompanhar o andamento', label: 'Gerar alertas e acompanhar fluxos' },
  { phrase: 'Fazer sistemas diferentes conversarem', label: 'Integrar sistemas e fontes' },
];
export const phraseFor = (label: string) => PHRASES.find((p) => p.label === label)?.phrase;

/* Trecho literal: sempre um recorte contínuo do campo "onde imagina a IA" (substring por construção).
   Pula cabeçalhos de lista ("2) Análise crítica:", "Etapa 1 – Coleta") e mostra o campo inteiro quando é curto. */
const MAX = 420;
const isHeading = (l: string) => /:\s*$/.test(l) || l.length <= 40 || (/^(etapa|passo|fase|item|\d+[\).\-]|[a-z]\))/i.test(l) && l.length <= 70);
export function excerptOf(v: Voice): string {
  const src = (v.opportunity || v.process || v.current || '').replace(/\r/g, '');
  if (src.trim().length <= MAX) return src.trim();
  const lines = src.split('\n');
  let pos = 0, start = -1;
  for (const l of lines) {
    const t = l.trim();
    if (t && !isHeading(t)) { start = pos + l.indexOf(t); break; }
    pos += l.length + 1;
  }
  if (start < 0) start = 0;
  let end = Math.min(src.length, start + MAX);
  if (end < src.length) {
    const win = src.slice(start, end);
    const cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('.\n'), win.lastIndexOf('\n\n'), win.lastIndexOf('; '));
    if (cut > MAX * 0.45) end = start + cut + 1;
  }
  return src.slice(start, end).trim();
}
export const isCut = (v: Voice) => excerptOf(v).length < (v.opportunity || v.process || v.current || '').trim().length;

export const counts: Record<string, number> = {};
for (const v of voices) counts[v.territory] = (counts[v.territory] ?? 0) + 1;

/* Trilhas: vozes que vivem em dois territórios (principal + relacionado). */
export const pairs: { a: string; b: string; n: number }[] = (() => {
  const m = new Map<string, number>();
  for (const v of voices) for (const r of v.related) if (r !== v.territory) { const k = [v.territory, r].sort().join('|'); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([k, n]) => { const [a, b] = k.split('|'); return { a, b, n }; }).sort((x, y) => y.n - x.n);
})();
export const crossingOf = (t: string) => pairs.filter((p) => p.a === t || p.b === t).map((p) => ({ other: p.a === t ? p.b : p.a, n: p.n }));

/* Ordem estável mas não "a primeira é sempre a mesma": embaralha por sessão. */
const seed = (() => { try { const s = sessionStorage.getItem('seed'); if (s) return +s; const n = Math.floor(Math.random() * 1e9); sessionStorage.setItem('seed', String(n)); return n; } catch { return 42; } })();
function rnd(i: number) { let x = (seed + i * 2654435761) >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }
export function shuffled<T>(arr: T[]): T[] { return arr.map((v, i) => ({ v, k: rnd(i) })).sort((a, b) => a.k - b.k).map((x) => x.v); }

export function findVoices(territory: string | null, label: string | null): Voice[] {
  const inT = (v: Voice) => !territory || v.territory === territory || v.related.includes(territory);
  const inL = (v: Voice) => !label || v.contributions.includes(label);
  const main = voices.filter((v) => inT(v) && inL(v) && (!territory || v.territory === territory));
  const rel = voices.filter((v) => inT(v) && inL(v) && territory && v.territory !== territory);
  return [...shuffled(main), ...shuffled(rel)];
}

export const norm = (s: string) => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

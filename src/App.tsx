import { useEffect, useMemo, useState } from 'react';
import { TERRITORIES, PHRASES, counts, crossingOf, excerptOf, findVoices, isCut, phraseFor, territoryByName, voices, type Voice } from './data';
import Landscape from './Landscape';

/* ---------- roteamento por hash (links compartilháveis, sem dependência) ---------- */
type Route =
  | { v: 'home' } | { v: 'atua' } | { v: 'espera'; t: string | null }
  | { v: 'vozes'; t: string | null; c: string | null; i: number }
  | { v: 'voz'; id: string; back?: string } | { v: 'mapa'; t: string | null; voz: string | null } | { v: 'atlas'; t: string | null };
const q = (s: string | null) => (s ? decodeURIComponent(s) : null);
function parse(h: string): Route {
  const [path, qs = ''] = h.replace(/^#\/?/, '').split('?'); const p = new URLSearchParams(qs);
  switch (path.split('/')[0]) {
    case 'atua': return { v: 'atua' };
    case 'espera': return { v: 'espera', t: q(p.get('t')) };
    case 'vozes': return { v: 'vozes', t: q(p.get('t')), c: q(p.get('c')), i: Math.max(0, +(p.get('i') ?? 0) || 0) };
    case 'voz': return { v: 'voz', id: path.split('/')[1] ?? '', back: p.get('back') ?? undefined };
    case 'mapa': return { v: 'mapa', t: q(p.get('t')), voz: q(p.get('voz')) };
    case 'atlas': return { v: 'atlas', t: q(p.get('t')) };
    default: return { v: 'home' };
  }
}
const enc = (o: Record<string, string | number | null | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== '') p.set(k, String(v)); const s = p.toString(); return s ? '?' + s : ''; };
const go = (h: string) => { location.hash = h; };
const H = {
  home: '#/', atua: '#/atua', espera: (t: string | null) => '#/espera' + enc({ t }),
  vozes: (t: string | null, c: string | null, i = 0) => '#/vozes' + enc({ t, c, i: i || null }),
  voz: (id: string, back?: string) => `#/voz/${id}` + enc({ back }), mapa: (t?: string | null, voz?: string | null) => '#/mapa' + enc({ t, voz }), atlas: (t?: string | null) => '#/atlas' + enc({ t }),
};

/* ---------- marca ---------- */
const Arrow = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="4" cy="20" r="2.4" fill={color} /><path d="M8.5 15.5 L18 6" stroke={color} strokeWidth="3.4" /><path d="M9 5 H19 V15" stroke={color} strokeWidth="3.4" fill="none" /></svg>
);
const Logo = ({ color = '#353A8E', arrow = '#28E2D4', size = 26 }: { color?: string; arrow?: string; size?: number }) => (
  <a href="#/" className="inline-flex items-end gap-px font-bold no-underline" style={{ color, fontSize: size, letterSpacing: '-.04em', lineHeight: 0.8 }} aria-label="IA.3, início"><span>ia</span><Arrow color={arrow} size={Math.round(size * 0.85)} /><span>3</span></a>
);
const Cluster = () => (
  <svg viewBox="0 0 420 300" fill="none" aria-hidden="true" className="w-full max-w-[420px] h-auto">
    <path d="M60 240 L200 100" stroke="#fff" strokeWidth="34" /><path d="M120 92 H208 V180" stroke="#fff" strokeWidth="34" fill="none" /><circle cx="40" cy="262" r="20" fill="#fff" />
    <path d="M230 250 L330 150" stroke="#28E2D4" strokeWidth="22" /><path d="M268 142 H338 V212" stroke="#28E2D4" strokeWidth="22" fill="none" /><circle cx="216" cy="266" r="13" fill="#28E2D4" />
    <path d="M300 90 L370 20" stroke="#252D65" strokeWidth="16" /><path d="M326 14 H376 V64" stroke="#252D65" strokeWidth="16" fill="none" /><circle cx="290" cy="102" r="9" fill="#252D65" />
    <path d="M40 130 L90 80" stroke="#EFA1A1" strokeWidth="10" /><path d="M60 76 H94 V110" stroke="#EFA1A1" strokeWidth="10" fill="none" /><circle cx="32" cy="140" r="6" fill="#EFA1A1" />
    <circle cx="370" cy="250" r="34" fill="#EFA1A1" /><circle cx="150" cy="74" r="46" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
  </svg>
);
const Cobrand = ({ light = false }: { light?: boolean }) => {
  const h = light ? 'h-[18px]' : 'h-[22px]';
  const item = (label: string, src: string, alt: string, href: string, extra = '') => (
    <div className="flex flex-col gap-1.5 items-start">
      <span className={`text-[10px] tracking-[.12em] uppercase font-semibold ${light ? 'text-white/70' : 'text-grafite/60'}`}>{label}</span>
      <a href={href} target="_blank" rel="noopener" className="inline-flex no-underline"><img src={src} alt={alt} className={`${h} w-auto ${light ? 'opacity-95' : ''} ${extra}`} /></a>
    </div>
  );
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
        {item('Realização', light ? '/idis-branco.png' : '/idis.png', 'IDIS', 'https://www.idis.org.br/ia-ponto3/')}
        {item('Com apoio de', light ? '/google-org-branco.png' : '/google-org.png', 'Google.org', 'https://www.google.org/')}
        {item('Parceiro técnico', light ? '/sabiar-branco.svg' : '/sabiar-claro.svg', 'Canal Sabiar', 'https://www.canalsabiar.com.br/', 'relative top-[1px]')}
      </div>
      <span className={`text-[10px] tracking-[.02em] ${light ? 'text-white/60' : 'text-grafite/45'}`}>Feito com 💚 por <a href="https://www.linkedin.com/in/mardenrodrigues/" target="_blank" rel="noopener" className="underline underline-offset-2 decoration-[0.5px]" style={{ color: 'inherit' }}>Marden Rodrigues</a>, consultor associado <a href="https://www.canalsabiar.com.br/" target="_blank" rel="noopener" className="underline underline-offset-2 decoration-[0.5px]" style={{ color: 'inherit' }}>Canal SabIAr</a></span>
    </div>
  );
};
const Back = ({ to, label = 'voltar' }: { to: string; label?: string }) => (
  <a href={to} className="inline-flex items-center gap-1.5 text-sm font-medium no-underline"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" fill="none"><path d="M15 5 L8 12 L15 19" /></svg>{label}</a>
);
const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6" fill="none" aria-hidden="true" className="shrink-0"><path d={dir === 'left' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'} /></svg>
);
const Progress = ({ n, i }: { n: number; i: number }) => (
  <div className="flex gap-[3px]" aria-hidden="true">{Array.from({ length: Math.min(n, 60) }, (_, k) => <span key={k} className="flex-1 h-[3px]" style={{ background: k <= Math.floor((i / n) * Math.min(n, 60)) ? '#E03A62' : 'rgba(53,58,142,.18)' }} />)}</div>
);
const Origin = ({ v }: { v: Voice }) => (
  <span className="text-[13px] leading-snug text-grafite">Escrito em março de 2026 por alguém de uma organização que atua em {v.territory.toLocaleLowerCase('pt-BR')}.</span>
);

/* ---------- header ---------- */
function Header({ active, onAbout, right }: { active?: 'Vozes' | 'Mapa' | 'Atlas'; onAbout: () => void; right?: React.ReactNode }) {
  return (
    <header className="flex justify-between items-center gap-3 px-5 md:px-12 py-4 border-b border-hair">
      <Logo />
      <div className="flex items-center gap-4 md:gap-7 text-[15px] font-medium">
        <nav className="hidden md:flex gap-7" aria-label="Vistas">
          {([['Vozes', H.atua], ['Mapa', H.mapa()], ['Atlas', H.atlas()]] as const).map(([t, h]) => <a key={t} href={h} className="no-underline pb-[3px]" style={{ borderBottom: active === t ? '2px solid #E03A62' : '2px solid transparent' }}>{t}</a>)}
        </nav>
        {right}
        <button onClick={onAbout} className={`pill ${right ? 'hidden md:inline-flex' : ''}`} style={{ minHeight: 40, padding: '0 16px', fontSize: 12 }}>Como ler</button>
      </div>
    </header>
  );
}

/* ---------- telas ---------- */
function Home({ onAbout }: { onAbout: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="md:hidden bg-coral text-white flex-1 flex flex-col px-5 pt-4 pb-6 gap-4">
        <div className="flex justify-between items-center pb-3 border-b border-white/25"><Logo color="#fff" /><button onClick={onAbout} className="pill" style={{ minHeight: 36, padding: '0 14px', fontSize: 11, borderColor: '#fff', color: '#fff', background: 'transparent' }}>Como ler</button></div>
        <div className="flex-1 flex flex-col justify-center gap-4">
          <span className="label opacity-85">Primeira turma do IA.3 · março de 2026</span>
          <h1 className="m-0 text-[40px] font-light leading-[1.02] uppercase">Um mapa feito de intenções reais</h1>
          <p className="m-0 text-[17px] leading-[1.45]">{voices.length} pessoas de cerca de 100 organizações sociais contaram, com suas próprias palavras, como imaginam usar inteligência artificial no que fazem. Aqui essas vozes estão organizadas em territórios, para você se reconhecer nelas.</p>
          <div className="self-end w-[62%]"><Cluster /></div>
        </div>
        <div className="flex flex-col gap-2.5">
          <a href={H.atua} className="pill pill-turq no-underline" style={{ minHeight: 54 }}>Encontrar vozes parecidas com a minha</a>
          <div className="flex gap-2.5"><a href={H.mapa()} className="pill flex-1 no-underline" style={{ borderColor: '#fff', color: '#fff', background: 'transparent' }}>Explorar o mapa</a><a href={H.atlas()} className="pill flex-1 no-underline" style={{ borderColor: '#fff', color: '#fff', background: 'transparent' }}>Ler o atlas</a></div>
        </div>
        <Cobrand light />
      </div>
      <div className="hidden md:flex flex-col flex-1">
        <Header onAbout={onAbout} />
        <div className="flex-1 grid grid-cols-[500px_minmax(0,1fr)] gap-14 px-12 py-8 items-center">
          <div className="flex flex-col gap-5">
            <span className="label text-coral">Primeira turma do IA.3 · março de 2026</span>
            <h1 className="m-0 text-[52px] font-light leading-[1.02] uppercase">Um mapa feito de intenções reais</h1>
            <p className="m-0 text-lg leading-[1.45] text-grafite">{voices.length} pessoas de cerca de 100 organizações sociais contaram, com suas próprias palavras, como imaginam usar inteligência artificial no que fazem. Aqui essas vozes estão organizadas em territórios, para você se reconhecer nelas.</p>
            <div className="inline-flex flex-col gap-2.5 self-start">
              <a href={H.atua} className="pill pill-turq no-underline" style={{ minHeight: 54, padding: '0 26px' }}>Encontrar vozes parecidas com a minha</a>
              <div className="grid grid-cols-2 gap-2.5 w-full"><a href={H.mapa()} className="pill no-underline">Explorar o mapa</a><a href={H.atlas()} className="pill no-underline">Ler o atlas</a></div>
            </div>
            <div className="mt-2"><Cobrand /></div>
          </div>
          <Landscape labels={false} interactive={false} className="cursor-pointer" onPickTerritory={(t) => go(H.mapa(t))} />
        </div>
      </div>
    </div>
  );
}

function Atua({ onAbout }: { onAbout: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Vozes" onAbout={onAbout} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 px-5 md:px-12 py-6 md:py-8">
        <div className="flex flex-col gap-4 max-w-[640px]">
          <Progress n={2} i={0} /><span className="label text-coral">Passo 1 de 2</span>
          <h1 className="m-0 text-[32px] md:text-[44px] font-light leading-[1.05]">Onde você atua?</h1>
          <div className="grid grid-cols-2 gap-2 md:gap-2.5" role="list">
            {TERRITORIES.map((t) => <a key={t.name} href={H.espera(t.name)} onMouseEnter={() => setHover(t.name)} onMouseLeave={() => setHover(null)} className="card no-underline font-medium text-[15px] md:text-base leading-tight min-h-[66px]" style={{ borderLeft: `5px solid ${t.bg}` }}>{t.short}</a>)}
          </div>
          <a href={H.espera(null)} className="card no-underline font-medium text-[15px] border-dashed">Em vários lugares, ou nenhum desses</a>
        </div>
        <div className="hidden lg:flex flex-col gap-3 pt-[70px]">
          <div className="bg-pale"><Landscape active={hover} labels={false} interactive={false} /></div>
          <span className="text-[13px] text-grafite min-h-[20px]">{hover ? `${hover} · ${counts[hover]} vozes` : 'Passe o mouse sobre um cartão para ver o território no mapa.'}</span>
        </div>
      </div>
    </div>
  );
}

function Espera({ t, onAbout }: { t: string | null; onAbout: () => void }) {
  const opts = useMemo(() => PHRASES.map((p) => ({ ...p, n: findVoices(t, p.label).length })).sort((a, b) => (a.phrase.length % 7) - (b.phrase.length % 7)), [t]);
  const all = findVoices(t, null).length;
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Vozes" onAbout={onAbout} right={<Back to={H.atua} />} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 px-5 md:px-12 py-6 md:py-8">
        <div className="flex flex-col gap-4 max-w-[640px]">
          <Progress n={2} i={1} /><span className="label text-coral">Passo 2 de 2{t ? ` · ${t}` : ''}</span>
          <h1 className="m-0 text-[28px] md:text-[40px] font-light leading-[1.08]">O que você gostaria que a IA fizesse por vocês?</h1>
          <div className="flex flex-col gap-2" role="list">
            {opts.map((o) => <a key={o.label} href={H.vozes(t, o.label)} className={`card no-underline text-[15px] md:text-base leading-snug min-h-[52px] justify-between gap-3 ${o.n === 0 ? 'opacity-40 pointer-events-none' : ''}`}><span>{o.phrase}</span><span className="text-xs text-grafite shrink-0">{o.n} {o.n === 1 ? 'voz' : 'vozes'}</span></a>)}
          </div>
          <a href={H.vozes(t, null)} className="card no-underline text-[15px] md:text-base leading-snug border-dashed justify-between gap-3"><span>Ainda não sei, quero ver o que as pessoas estão imaginando</span><span className="text-xs text-grafite shrink-0">{all} vozes</span></a>
        </div>
        <div className="hidden lg:flex flex-col gap-3 pt-[70px]">
          <div className="bg-pale"><Landscape active={t} labels={false} interactive={false} /></div>
          <span className="text-[13px] text-grafite">{t ? `${t} · ${counts[t]} vozes; ${findVoices(t, null).length - counts[t]} chegam de outros territórios` : 'Todos os territórios'}</span>
        </div>
      </div>
    </div>
  );
}

function Vozes({ t, c, i, onAbout }: { t: string | null; c: string | null; i: number; onAbout: () => void }) {
  const list = useMemo(() => findVoices(t, c), [t, c]);
  const idx = Math.min(i, Math.max(0, list.length - 1));
  const v = list[idx];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' && idx < list.length - 1) go(H.vozes(t, c, idx + 1)); if (e.key === 'ArrowLeft' && idx > 0) go(H.vozes(t, c, idx - 1)); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [idx, list.length, t, c]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [idx]);
  const self = H.vozes(t, c, idx);
  if (!v) return (
    <div className="min-h-screen flex flex-col"><Header active="Vozes" onAbout={onAbout} right={<Back to={H.espera(t)} />} /><div className="p-8 text-grafite">Nenhuma voz combina com essa escolha. <a href={H.espera(t)}>Escolher outra</a>.</div></div>
  );
  const heading = t ? `${list.length} vozes parecidas com a sua` : `${list.length} vozes`;
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Vozes" onAbout={onAbout} right={<><Back to={H.espera(t)} label="voltar à pergunta" /><a href={H.mapa(v.territory, v.id)} className="pill no-underline md:hidden" style={{ minHeight: 36, padding: '0 14px', fontSize: 11 }}>Ver no mapa</a></>} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:gap-14 px-5 md:px-12 py-5 md:py-8">
        <div className="flex flex-col justify-center gap-5 md:px-10">
          <div className="flex justify-between items-center gap-3"><span className="label text-coral">{heading} · {idx + 1} de {list.length}</span><Back to={H.espera(t)} label="voltar à pergunta" /></div><Progress n={list.length} i={idx} />
          <div className="pt-2"><Arrow color="#E03A62" size={34} /></div>
          {excerptOf(v).length < 90 && v.process && (
            <div className="flex flex-col gap-1.5 max-w-[760px]"><span className="label text-grafite/60">O que a organização faz</span><p className="m-0 text-[16px] md:text-[18px] leading-[1.5] text-grafite whitespace-pre-wrap">{v.process.length > 420 ? v.process.slice(0, v.process.lastIndexOf('. ', 420) + 1 || 420) : v.process}</p><span className="label text-grafite/60 mt-2">Onde imagina a IA</span></div>
          )}
          <p className="m-0 text-[23px] md:text-[32px] font-light leading-[1.32] max-w-[760px] whitespace-pre-wrap">{excerptOf(v)}</p>
          <span className="label text-grafite/70">{isCut(v) ? 'Trecho literal da resposta · continua na resposta completa' : 'Resposta literal'}</span>
          <Origin v={v} />
          <div className="flex flex-col md:flex-row gap-2.5 md:items-center pt-2">
            <a href={H.voz(v.id, self)} className="pill pill-dark no-underline">Ler a resposta completa</a>
            <span className="flex-1" />
            <div className="flex gap-2">
              <a href={idx > 0 ? H.vozes(t, c, idx - 1) : undefined} aria-disabled={idx === 0} className={`pill flex-1 no-underline ${idx === 0 ? 'opacity-40 pointer-events-none' : ''}`}><Chevron dir="left" />anterior</a>
              <a href={idx < list.length - 1 ? H.vozes(t, c, idx + 1) : undefined} aria-disabled={idx >= list.length - 1} className={`pill pill-turq flex-1 no-underline ${idx >= list.length - 1 ? 'opacity-40 pointer-events-none' : ''}`}>próxima<Chevron dir="right" /></a>
            </div>
          </div>
        </div>
        <aside className="hidden lg:flex flex-col gap-3 border-l border-hair pl-8">
          <span className="label opacity-70">Você entrou por</span>
          <a href={H.atua} className="card card-sel no-underline text-sm justify-between" style={{ borderLeft: `5px solid ${t ? territoryByName(t)?.bg : '#B8C4F2'}` }}>{t ? territoryByName(t)?.short : 'Todos os territórios'} <span className="text-xs opacity-70">alterar</span></a>
          <a href={H.espera(t)} className="card card-sel no-underline text-sm justify-between">{c ? phraseFor(c) : 'Tudo o que as pessoas imaginam'} <span className="text-xs opacity-70">alterar</span></a>
          <span className="label opacity-70 mt-3">Onde esta voz está</span>
          <a href={H.mapa(v.territory, v.id)} className="bg-pale block" aria-label="Abrir a paisagem inteira com esta voz destacada"><Landscape active={v.territory} highlightVoice={v.id} labels={false} interactive={false} /></a>
          <span className="text-xs text-grafite">Toque no mapa para abrir a paisagem inteira.</span>
        </aside>
      </div>
    </div>
  );
}

function VozCompleta({ id, back, onAbout }: { id: string; back?: string; onAbout: () => void }) {
  const v = voices.find((x) => x.id === id);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);
  if (!v) return <div className="p-8">Voz não encontrada. <a href="#/">Início</a></div>;
  const blocks: [string, string, string][] = [['01', 'O que a organização faz', v.process], ['02', 'Como funciona hoje', v.current], ['03', 'Onde imagina a IA', v.opportunity]];
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Vozes" onAbout={onAbout} right={<Back to={back ?? H.mapa(v.territory, v.id)} label="voltar à voz" />} />
      <div className="px-5 md:px-12 py-6 max-w-[760px] w-full mx-auto flex flex-col gap-2">
        <span className="label opacity-70">Resposta completa · texto original, anonimizado · Voz {v.id.replace('R-', '')}</span>
        {blocks.map(([n, t, txt]) => <div key={n} className="flex flex-col gap-2 py-5 border-t border-hair"><span className="label text-coral">{n} · {t}</span><p className="m-0 text-[16px] md:text-[17px] leading-[1.6] text-grafite whitespace-pre-wrap">{txt || '(sem resposta neste campo)'}</p></div>)}
        <div className="border-t border-hair pt-4 flex flex-col gap-2.5">
          <span className="label opacity-70">Camada de navegação · não faz parte da fala</span>
          <div className="flex flex-wrap gap-1.5">{[v.territory, ...v.related].map((x, k) => <a key={x} href={H.vozes(x, null)} className={`pill no-underline ${k === 0 ? 'pill-dark' : ''}`} style={{ minHeight: 34, padding: '0 12px', fontSize: 10 }}>{x}</a>)}</div>
          {v.contributions.filter((x) => x !== 'Contribuição a detalhar').length > 0 && <p className="m-0 text-sm text-grafite">O que espera da IA: {v.contributions.filter((x) => x !== 'Contribuição a detalhar').map((l) => phraseFor(l) ?? l).join(' · ')}</p>}
        </div>
      </div>
    </div>
  );
}

function Mapa({ t, voz, onAbout }: { t: string | null; voz: string | null; onAbout: () => void }) {
  const [sel, setSel] = useState<string | null>(t);
  const [picked, setPicked] = useState<string | null>(voz);
  useEffect(() => { setSel(t); setPicked(voz); }, [t, voz]);
  const pv = picked ? voices.find((x) => x.id === picked) : null;
  const cross = sel ? crossingOf(sel).slice(0, 2) : [];
  const info = sel ? territoryByName(sel) : null;
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Mapa" onAbout={onAbout} right={<Back to={pv ? H.vozes(pv.territory, null) : H.home} label="voltar" />} />
      <div className="px-5 md:px-12 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
          <h1 className="m-0 text-[26px] md:text-[32px] font-light">Paisagem de territórios</h1>
          <span className="text-[13px] text-grafite md:max-w-[520px] md:text-right">Cada ponto é uma voz. As trilhas são vozes que vivem em dois territórios; quanto mais grossa, mais vozes atravessam. Toque numa ilha para entrar; arraste e aproxime.</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          <div className="bg-pale overflow-hidden"><Landscape active={sel} highlightVoice={picked} onPickTerritory={(n) => { setSel(sel === n ? null : n); setPicked(null); }} onPickVoice={(id) => { const v = voices.find((x) => x.id === id)!; setSel(v.territory); setPicked(id); }} /></div>
          <div className="flex flex-col gap-3 pt-3 lg:pt-10" style={{ borderTop: `3px solid ${info?.bg ?? 'rgba(53,58,142,.18)'}` }}>
            {sel ? (<>
              <span className="label text-coral">{sel}</span>
              <span className="text-[30px] font-light leading-none">{counts[sel]} vozes</span>
              {cross.length > 0 && <span className="text-sm text-grafite">Trilhas mais fortes: {cross.map((x) => `${x.n} com ${territoryByName(x.other)?.short}`).join(', ')}.</span>}
              {pv && <div className="border-t border-hair pt-3 flex flex-col gap-2"><span className="label text-coral">Voz {pv.id.replace('R-', '')}</span><p className="m-0 text-[15px] leading-relaxed text-grafite">{excerptOf(pv)}</p><a href={H.voz(pv.id, H.mapa(sel, pv.id))} className="text-sm font-semibold">Ler a resposta completa</a></div>}
              <a href={H.vozes(sel, null)} className="pill pill-dark no-underline self-start">Ler as {counts[sel]} vozes</a>
            </>) : (<>
              <span className="label text-coral">Todo o mapa</span>
              <span className="text-[30px] font-light leading-none">{voices.length} vozes</span>
              <span className="text-sm text-grafite">Dez territórios. A área sugere quantas vozes moram em cada um; o contorno é mais irregular quanto mais vozes de lá também atravessam outros territórios.</span>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Atlas({ t, onAbout }: { t: string | null; onAbout: () => void }) {
  const cur = t ?? TERRITORIES[0].name; const idx = TERRITORIES.findIndex((x) => x.name === cur);
  const list = useMemo(() => voices.filter((v) => v.territory === cur), [cur]);
  const cross = crossingOf(cur).slice(0, 2);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [cur]);
  return (
    <div className="min-h-screen flex flex-col">
      <Header active="Atlas" onAbout={onAbout} />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12 px-5 md:px-12 py-6">
        <div className="flex flex-col gap-1 print:hidden">
          <span className="label opacity-70 mb-1.5">Capítulos</span>
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {TERRITORIES.map((x, k) => <a key={x.name} href={H.atlas(x.name)} className="no-underline text-[13px] whitespace-nowrap lg:whitespace-normal py-1.5 pl-3 pr-2" style={{ borderLeft: `4px solid ${k === idx ? x.bg : 'rgba(53,58,142,.18)'}`, fontWeight: k === idx ? 600 : 400 }}>{x.name}</a>)}
          </div>
          <a href={H.mapa(cur)} className="bg-pale block mt-2 hidden lg:block"><Landscape active={cur} labels={false} interactive={false} /></a>
          <button onClick={() => window.print()} className="pill mt-2" style={{ minHeight: 40, fontSize: 11 }}>Baixar em PDF</button>
        </div>
        <div className="flex flex-col gap-5 max-w-[760px]">
          <div><span className="label text-coral">Capítulo {idx + 1} · {list.length} vozes</span><h2 className="m-0 mt-1.5 text-[32px] md:text-[40px] font-light leading-[1.05]">{cur}</h2></div>
          {cross.length > 0 && <p className="m-0 text-[15px] leading-relaxed text-grafite"><span className="label opacity-60">Nota de navegação · </span>Conversa mais com {cross.map((x) => `${territoryByName(x.other)?.short} (${x.n} vozes)`).join(' e ')}.</p>}
          {list.map((v) => <div key={v.id} className="border-t border-hair py-4 flex flex-col gap-2"><span className="label text-coral">Voz {v.id.replace('R-', '')}</span><p className="m-0 text-[19px] md:text-[21px] font-light leading-[1.35] whitespace-pre-wrap">{excerptOf(v)}</p><span className="text-[13px] text-grafite">Escrito em março de 2026 · <a href={H.voz(v.id, H.atlas(cur))}>ler a resposta completa</a></span></div>)}
          {idx < TERRITORIES.length - 1 && <a href={H.atlas(TERRITORIES[idx + 1].name)} className="pill pill-dark no-underline self-start print:hidden">Próximo capítulo: {TERRITORIES[idx + 1].short}<Chevron dir="right" /></a>}
        </div>
      </div>
    </div>
  );
}

function About({ onClose }: { onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; }; }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-indigo/60 p-4 flex items-center justify-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article role="dialog" aria-modal="true" aria-label="Como ler este mapa" className="relative bg-white w-full max-w-[640px] max-h-[90vh] overflow-y-auto p-7 md:p-10 flex flex-col gap-4">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-5 top-5 w-10 h-10 border-[1.5px] border-indigo rounded-full bg-transparent flex items-center justify-center text-indigo"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" fill="none"><path d="M5 5 L19 19 M19 5 L5 19" /></svg></button>
        <span className="label text-coral">Como ler este mapa</span>
        <h2 className="m-0 text-[28px] md:text-[32px] font-light leading-[1.1] pr-12">A IA organiza o território. As pessoas ocupam o mapa.</h2>
        <div className="flex flex-col gap-3 leading-relaxed text-grafite text-[15px]">
          <p className="m-0">Esta cartografia reúne intenções de uso de IA compartilhadas por {voices.length} pessoas de cerca de 100 organizações da primeira turma do IA.3 (uma organização pode ter mais de uma pessoa participante), em atividade realizada em março de 2026. É um insumo para reflexão e inspiração, e não uma representação científica ou definitiva do campo social.</p>
          <p className="m-0">As falas são apresentadas em sua redação original, com alterações apenas para remover identificadores diretos. Nada mostrado como fala foi resumido ou parafraseado. Os trechos em destaque são recortes contínuos da resposta.</p>
          <p className="m-0">Os dez territórios, os territórios relacionados e as frases de entrada são uma camada de navegação criada com apoio de IA. Suas fronteiras são porosas: uma resposta pode pertencer a vários lugares. No mapa, a área sugere quantas vozes moram em cada território, o contorno é mais irregular quanto mais vozes de lá também atravessam outros, e as trilhas são vozes que vivem em dois territórios.</p>
        </div>
      </article>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash));
  const [about, setAbout] = useState(false);
  useEffect(() => { const on = () => setRoute(parse(location.hash)); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  const onAbout = () => setAbout(true);
  let view: React.ReactNode;
  switch (route.v) {
    case 'atua': view = <Atua onAbout={onAbout} />; break;
    case 'espera': view = <Espera t={route.t} onAbout={onAbout} />; break;
    case 'vozes': view = <Vozes t={route.t} c={route.c} i={route.i} onAbout={onAbout} />; break;
    case 'voz': view = <VozCompleta id={route.id} back={route.back} onAbout={onAbout} />; break;
    case 'mapa': view = <Mapa t={route.t} voz={route.voz} onAbout={onAbout} />; break;
    case 'atlas': view = <Atlas t={route.t} onAbout={onAbout} />; break;
    default: view = <Home onAbout={onAbout} />;
  }
  return <>{view}{about && <About onClose={() => setAbout(false)} />}</>;
}

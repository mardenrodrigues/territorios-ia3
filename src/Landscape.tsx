import { useMemo, useRef, useState } from 'react';
import { TERRITORIES, counts, territoryByName } from './data';
import { buildLandscape } from './layout';

type Props = {
  active?: string | null;
  highlightVoice?: string | null;
  labels?: boolean;
  interactive?: boolean;
  onPickTerritory?: (t: string) => void;
  onPickVoice?: (id: string) => void;
  className?: string;
};

const W = 1100, H = 720;
const INDIGO = '#353A8E';

export default function Landscape({ active = null, highlightVoice = null, labels = true, interactive = true, onPickTerritory, onPickVoice, className = '' }: Props) {
  const { islands, trails } = useMemo(() => buildLandscape(W, H), []);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pinch = useRef<{ d: number; k: number } | null>(null);

  const zoom = (f: number) => setView((v) => ({ ...v, k: Math.min(3, Math.max(0.8, v.k * f)) }));
  const onPointerDown = (e: React.PointerEvent) => { if (!interactive) return; (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; };
  const onPointerMove = (e: React.PointerEvent) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; if (Math.hypot(dx, dy) > 2) setView((v) => ({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy })); };
  const onPointerUp = () => { drag.current = null; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (!pinch.current) pinch.current = { d, k: view.k }; else setView((v) => ({ ...v, k: Math.min(3, Math.max(0.8, pinch.current!.k * (d / pinch.current!.d))) })); }
  };
  const onTouchEnd = () => { pinch.current = null; };

  return (
    <div className={`relative ${className}`} style={{ touchAction: interactive ? 'none' : 'auto' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block select-none" role={interactive ? 'group' : 'img'} aria-label="Paisagem de territórios"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}>
          {trails.map((t) => {
            const dim = active && t.a !== active && t.b !== active;
            return <path key={t.a + t.b} d={t.d} fill="none" stroke={INDIGO} strokeOpacity={dim ? 0.08 : 0.28} strokeWidth={Math.max(1.5, t.n / 7)} strokeLinecap="round" />;
          })}
          {islands.map((isl, i) => {
            const t = territoryByName(isl.name)!; const isA = active === isl.name; const dim = active !== null && !isA;
            return (
              <g key={isl.name} style={{ opacity: dim ? 0.45 : 1, transition: 'opacity .2s' }}>
                <path d={isl.path} fill={t.bg} stroke={isA ? INDIGO : 'none'} strokeWidth={isA ? 4 : 0}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                  onClick={() => interactive && onPickTerritory?.(isl.name)} role={interactive ? 'button' : undefined} aria-label={`${isl.name}: ${counts[isl.name]} vozes`} tabIndex={interactive ? 0 : -1}
                  onKeyDown={(e) => { if (interactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPickTerritory?.(isl.name); } }} />
                {isl.dots.map((d) => {
                  const hl = highlightVoice === d.id;
                  return <circle key={d.id} cx={d.x} cy={d.y} r={hl ? 7 : 3.4} fill={hl ? '#fff' : t.fg} stroke={hl ? INDIGO : 'none'} strokeWidth={hl ? 3 : 0} opacity={hl ? 1 : 0.72}
                    style={{ cursor: interactive && onPickVoice ? 'pointer' : 'default' }}
                    onClick={(e) => { if (interactive && onPickVoice) { e.stopPropagation(); onPickVoice(d.id); } }}>
                    <title>Voz {d.id.replace('R-', '')}</title>
                  </circle>;
                })}
                {labels && (() => {
                  /* Etiqueta fora da ilha, presa à costa inferior: nunca cobre pontos nem rompe a margem.
                     Largura estimada por caractere (Jost bold, caixa alta, tracking .05em); quebra em 2 linhas
                     quando não cabe em ~2,3 raios. */
                  const fs = 10.5, cw = fs * 0.74, lh = 13, padX = 12, padY = 5;
                  const maxW = Math.max(130, isl.r * 2.3);
                  const lines: string[] = []; let cur = '';
                  for (const w of TERRITORIES[i].short.toUpperCase().split(' ')) { const cand = cur ? `${cur} ${w}` : w; if (cur && cand.length * cw > maxW) { lines.push(cur); cur = w; } else cur = cand; }
                  if (cur) lines.push(cur);
                  const wP = Math.max(...lines.map((l) => l.length)) * cw + padX * 2, hP = lines.length * lh + padY * 2;
                  const top = isl.bottom + 4;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={isl.x - wP / 2} y={top} width={wP} height={hP} rx={hP / 2} fill={t.bg} stroke="#fff" strokeWidth={2} />
                      <text x={isl.x} y={top + padY + fs} textAnchor="middle" fill={t.fg} fontSize={fs} fontWeight={700} letterSpacing=".05em">
                        {lines.map((l, k) => <tspan key={k} x={isl.x} dy={k === 0 ? 0 : lh}>{l}</tspan>)}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>
      {interactive && (
        <div className="flex justify-end gap-2 px-3 pb-3">
          <button onClick={() => zoom(1.25)} aria-label="Aproximar" className="w-10 h-10 rounded-full border-[1.5px] border-indigo bg-white text-indigo font-bold">+</button>
          <button onClick={() => zoom(0.8)} aria-label="Afastar" className="w-10 h-10 rounded-full border-[1.5px] border-indigo bg-white text-indigo font-bold">−</button>
          <button onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Recentrar" className="h-10 px-3 rounded-full border-[1.5px] border-indigo bg-white text-indigo text-[10px] font-bold uppercase tracking-wide">centro</button>
        </div>
      )}
    </div>
  );
}

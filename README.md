# Territórios da IA no campo social

Cartografia navegável de como 279 pessoas de cerca de 100 organizações sociais, participantes da primeira turma do IA.3 (Google.org / IDIS / Canal Sabiar), imaginam usar inteligência artificial no que fazem. As falas aparecem sempre com as palavras de quem respondeu; a classificação em territórios é uma camada de organização.

Site: https://territorios.canalsabiar.com.br

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ (estático)
```

Stack: Vite + React 19 + TypeScript + Tailwind v4. Sem backend.

## Estrutura

- `src/App.tsx`: telas e roteamento por hash (#/, #/atua, #/espera, #/vozes, #/voz/R-xxx, #/mapa, #/atlas).
- `src/Landscape.tsx`: a paisagem (SVG) com pan, zoom, toque e destaque de voz.
- `src/layout.ts`: posições por vizinhança (força-dirigida), contornos, pontos e trilhas.
- `src/data.ts`: territórios, frases da segunda pergunta, trecho literal (sempre um recorte contíguo da resposta), filtros e embaralhamento por sessão.
- `src/voices.json`: as 279 respostas anonimizadas, com metadados.
- `src/index.css`: tokens da identidade visual do IA.3 e estilos base.

## Publicação

Site estático publicado pelo GitHub Pages: a Action em `.github/workflows/deploy.yml` roda o build a cada push na `main` e publica a pasta `dist/`. O arquivo `public/CNAME` define o domínio.

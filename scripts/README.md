# scripts/

Esta pasta existe por causa de um erro cometido neste repo e descoberto em
30/jul/2026: o cabeçalho de `src/lib/fingerprints.ts` afirmava que o script que
gerou o arquivo estava "no commit da Fase 4". **Nunca foi commitado.** O catálogo
de 23 fingerprints virou um arquivo que ninguém sabe regerar, mantido à mão, com
um comentário mandando não editar à mão.

Regra que sai daí: **script que produz artefato versionado é versionado junto.**
Se o artefato está no repo e o gerador não, o artefato vira fóssil.

## `gerar-seed-chips.cjs`

Gera `supabase/migrations/20260730180000_farol_seed_chips.sql` a partir de
`seed-chips.json`.

```bash
cd scripts && node gerar-seed-chips.cjs
```

## `seed-chips.json`

Os dados coletados para os oito chips: `enrichment` da Brasil API e `stack` do
detector deste repo, por empresa. Coletado em 30/jul/2026.

**Não é fonte de verdade, é retrato.** A fonte é a Brasil API mais o site de cada
empresa; isto é o que elas devolveram naquele dia. Para atualizar, recolete —
a coleta usa `fetchCnpj` e `fetchTargetSite` do próprio `src/lib/`, para o dado
sair pelo mesmo caminho que o produto usa (inclusive o mesmo user-agent, que a
Brasil API cobra: requisição sem UA leva 429).

A procedência de cada par CNPJ↔site está no cabeçalho da migration.

## `paridade-tier.py` + `paridade-tier.compare.test.ts`

Confere a porta `src/lib/tier.ts` contra o `compute_pre_tier` do Python que ela
espelha. São **um par**: o `.py` gera os casos a partir da esteira, o
`.compare.test.ts` roda os mesmos pelo TS e compara score e tier.

```bash
python3 scripts/paridade-tier.py > /tmp/py.json
PARIDADE_JSON=/tmp/py.json npx pnpm@10 vitest run --config scripts/vitest.paridade.config.ts
```

O `--config` não é enfeite: o `vite.config.ts` do projeto **exclui `scripts/**`**
da suíte, e sem um config próprio o comparador não roda nem à mão. É o mesmo
padrão do `test:rls` do Lente.

**Nenhum dos dois roda no CI**, e isso é deliberado. O `.py` depende do
`fechar_ciclo.py` da esteira, que vive fora deste repo
(`~/Documents/Trabalho/Clientes/Leads/`); o comparador depende do JSON que ele
gera. Sem o exclude, o comparador entrava na suíte e o CI quebraria por falta do
arquivo — descoberto em 04/ago/2026, quando o placar saltou de 190 para 191. São ferramenta manual, para quando a rubrica mudar
de qualquer um dos dois lados. O alarme do dia a dia é outro e está no repo: o
espelho das constantes de urgência em `src/lib/tier.test.ts`.

É esse par que sustenta o "2268 casos, 100% de paridade" do ROADMAP. O `.py`
chegou versionado em 04/ago/2026 e o comparador **não** — a afirmação ficou
reproduzível pela metade por algumas horas, que é exatamente o fóssil descrito no
topo deste arquivo.

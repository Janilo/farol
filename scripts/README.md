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

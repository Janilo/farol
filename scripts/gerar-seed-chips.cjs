const fs = require("fs");
const d = require("./seed-chips.json");
// Caminho relativo a scripts/ — rode com `cd scripts && node gerar-seed-chips.cjs`.

const DELIM = "$json$";
const linhas = d
  .map((x) => {
    const e = JSON.stringify(x.enrichment);
    const s = JSON.stringify(x.stack);
    if (e.includes(DELIM) || s.includes(DELIM)) throw new Error("delimitador colide com o dado");
    return [
      `-- ${x.nome} · ${x.enrichment.legalName}`,
      `insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (`,
      `  '${x.cnpj}',`,
      `  ${DELIM}${e}${DELIM}::jsonb,`,
      `  ${DELIM}${s}${DELIM}::jsonb,`,
      `  '${x.domain}',`,
      `  now()`,
      `) on conflict (cnpj) do update set`,
      `  enrichment     = excluded.enrichment,`,
      `  technographics = excluded.technographics,`,
      `  domain         = excluded.domain,`,
      `  fetched_at     = excluded.fetched_at;`,
    ].join("\n");
  })
  .join("\n\n");

const cabecalho = `-- Seed dos oito chips de exemplo da demo (item 1 da Fase 6).
--
-- Por que existe: chip clicado não pode custar consulta a ninguém. Com a linha já
-- no cache, o clique vira cache hit — não bate na Brasil API, não lê o site e não
-- consome quota (armadilha 7 do GLOSSARIO).
--
-- Procedência de cada par CNPJ<->site, apurada em 30/jul/2026 e não suposta:
--   1. o CNPJ foi lido do RODAPÉ DO PRÓPRIO SITE da empresa. Loja virtual é
--      obrigada a publicá-lo (Decreto 7.962/2013), então o par se autovalida;
--   2. conferido na Brasil API, checando a razão social contra a marca;
--   3. a stack saiu do detector deste repo rodando contra o site de verdade.
--
-- Três marcas têm razão social que não parece com o nome fantasia (Farm ->
-- Cidade Maravilhosa, Telhanorte -> Saint-Gobain, Duloren -> Moni 2001). Isso é
-- achado, não erro: quem prospecta por nome fantasia não acha a empresa.
--
-- A Ambev entra com status "empty" DE PROPÓSITO. O site foi lido e nenhuma das 23
-- ferramentas apareceu, o que é verdade e diz algo: o catálogo é de mercado médio
-- brasileiro, e empresa daquele porte roda SAP e Adobe. Vitrine que só mostra
-- vitória convence menos que a que admite o limite.
--
-- fetched_at = now(): a janela de 30 dias começa no seed. Passada ela, a primeira
-- consulta de cada empresa revalida pelo caminho normal, com quota.
--
-- "on conflict do update" para a migration poder rodar de novo sem sujar nada.
--
-- Nota honesta sobre COMO este ambiente foi semeado, para ninguém supor o que não
-- aconteceu: quatro linhas (Farm, Drogaria São Paulo, Duloren, Malwee) entraram
-- por estes INSERT; as outras quatro (Telhanorte, Hering, C&A, Ambev) entraram
-- pelo caminho normal do produto, com consulta de verdade na demo gravando via
-- writeCachedFicha. As duas rotas produzem a mesma forma de linha — é o mesmo
-- conjunto de campos e o mesmo dado de origem. Esta migration é o artefato
-- reproduzível para um ambiente novo.
--
-- GERADO por scripts/gerar-seed-chips.cjs a partir de scripts/seed-chips.json.
-- Editar aqui à mão é perder a edição na próxima geração — foi o que aconteceu
-- com esta própria nota, em 30/jul/2026, minutos depois de eu criticar o gerador
-- de fingerprints por não ter sido versionado.

`;

fs.writeFileSync(
  require("path").join(__dirname, "../supabase/migrations/20260730180000_farol_seed_chips.sql"),
  cabecalho + linhas + "\n",
);
console.log("linhas:", d.length);

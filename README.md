# Farol

**O que as ferramentas globais não veem no Brasil.** Ficha instantânea de empresa brasileira a partir do CNPJ.

Ferramentas globais inferem a identidade de uma empresa brasileira por scraping. O Farol lê a fonte primária: CNPJ na Receita Federal, CNAE, capital, quadro societário. Some a isso a stack que roda no site, incluindo as ferramentas brasileiras que scanner global não reconhece, e uma prioridade calculada por rubrica com os quatro eixos do cálculo abertos.

**Ao vivo:** [farol.pereirasaraiva.com](https://farol.pereirasaraiva.com) · demo sem cadastro.

## O problema

Levantar uma empresa brasileira à mão é uma aba por fonte: a consulta da Receita com captcha, o código do site para descobrir o que roda, o LinkedIn para um headcount aproximado sem CNPJ, e uma planilha onde o dado envelhece. Ferramentas globais de prospecção não resolvem porque leem o Brasil por inferência — nenhuma delas trata o CNPJ como fonte primária, e nenhuma reconhece RD Station, Totvs, VTEX ou Pagar.me.

## Como funciona

1. **Digite o CNPJ.** Os dígitos verificadores são validados antes de sair do navegador, então CNPJ errado não consome consulta à fonte pública.
2. **O Farol lê as fontes.** Cadastro na Receita Federal via Brasil API. Informando o site, a stack sai da própria página: scripts, cabeçalhos, cookies, e o que uma ferramenta implica sobre a outra.
3. **A rubrica calcula a prioridade.** Setor, porte, gatilho e alcance do comprador, com o placar aberto. Porte e gatilho você informa, porque nenhum dos dois está em cadastro público.

## O que a máquina não decide

A ficha entrega um **pré-tier**, não um veredito. Dois limites são estruturais e aparecem na tela em vez de serem escondidos:

O `porte` da Receita não serve para dimensionar. A escala tem três faixas — micro, pequeno porte e "demais" — e `DEMAIS` cobre tanto uma empresa de cinquenta pessoas quanto a Ambev. Por isso o porte da rubrica vem de um seletor, nunca derivado do cadastro.

O eixo de alcance do comprador **subtrai** quando a empresa é grande e não há caminho quente. Essa é premissa do operador, não atributo da empresa: a rubrica foi calibrada para um consultor solo, e para um time de vendas a regra seria falsa. O texto ao lado do score diz isso.

## Documentação

- [`GLOSSARIO.md`](GLOSSARIO.md) — linguagem ubíqua: um termo, um conceito, do schema ao botão
- [`docs/`](docs/) — spec do design system, conteúdo das telas e copy aprovada
- [`SEGURANCA.md`](SEGURANCA.md) — as fronteiras impostas por RLS e o que não é fronteira

## Stack

React · TanStack Start · Tailwind · shadcn · Supabase · Cloudflare Workers.

Testes em `pnpm test` (núcleo puro, sem I/O). Tipos em `pnpm typecheck`. A versão do pnpm vem do campo `packageManager` — não declare em outro lugar.

---
Construído por [J P Saraiva](https://pereirasaraiva.com) · Engenharia de Go-to-Market.

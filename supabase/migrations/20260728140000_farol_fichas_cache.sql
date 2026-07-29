-- Cache de ficha (Fase 3).
--
-- O que esta tabela é: memória do que o servidor já leu da fonte pública,
-- para não bater na Brasil API duas vezes pelo mesmo CNPJ em 30 dias.
-- O que ela NÃO é: dado de usuário. Nenhuma linha tem dono, e o conteúdo é
-- cadastro público da Receita Federal — o mesmo que qualquer pessoa obtém
-- direto na fonte. Por isso não há coluna de usuário e não há política de RLS
-- por dono: não existe fronteira de leitura a impor aqui.

create table public.fichas (
  -- 14 dígitos, sempre limpo. A máscara é da tela (GLOSSARIO, `cnpj`).
  -- O check é defesa em profundidade: `isValidCnpj` já barra antes, mas o
  -- banco não deve aceitar lixo porque alguém esqueceu de validar.
  cnpj           text primary key check (cnpj ~ '^[0-9]{14}$'),

  -- O payload já interpretado pelo núcleo puro, não o bruto da fonte.
  -- Guardar o interpretado significa que mudança em `extractEnrichment` não
  -- se reflete no cache — é o preço de não reprocessar a cada leitura, e o
  -- conserto é invalidar por data, que já existe.
  enrichment     jsonb not null,

  -- Fase 4 preenche. Nulo aqui significa "ainda não lido", nunca "vazio":
  -- o estado `empty` da tecnografia é um array vazio, não null.
  technographics jsonb,
  domain         text,

  -- O momento em que a FONTE foi lida, não em que a linha foi escrita. É o
  -- que a frescura mede, e é o que a ficha mostra como procedência.
  fetched_at     timestamptz not null default now()
);

comment on table public.fichas is
  'Cache servidor-lado do cadastro público da Receita. Sem dono, sem dado privado. Ver docs/ROADMAP.md Fase 3 e SEGURANCA.md.';

alter table public.fichas enable row level security;

-- Nenhuma policy, de propósito: com RLS ligada e zero políticas, `anon` e
-- `authenticated` não leem nem escrevem nada, e `service_role` passa por cima
-- da RLS por definição. É exatamente "só service_role", sem policy para
-- alguém afrouxar sem perceber.
--
-- O revoke abaixo é redundante com a RLS e existe para o caso explícito valer
-- mais que o implícito: quem ler este arquivo não precisa saber que RLS sem
-- política nega tudo.
revoke all on public.fichas from anon, authenticated;

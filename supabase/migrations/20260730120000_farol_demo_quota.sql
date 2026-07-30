-- Quota da demo (Fase 6).
--
-- O que esta migration protege: a demo é pública e anônima, e desde a Fase 4 cada
-- consulta pode gerar DUAS saídas de rede — a Brasil API e a leitura do site que o
-- visitante escolheu. Os portões de SSRF limitam PARA ONDE; nada limitava QUANTAS.
-- Sem isto, o Farol é um varredor de terceiros a partir do IP da Cloudflare.
--
-- Duas decisões de forma que valem explicar:
--
-- 1. Contador, não log. A alternativa era uma linha append-only por consulta e
--    `count(*)` na hora de decidir. Isso tem duas falhas: cresce sem teto (e guardar
--    hash de visitante além do dia que se conta não tem propósito, o que a LGPD
--    cobra) e conta com corrida — duas requisições paralelas leem 4 e ambas passam.
--    Aqui o incremento é atômico e devolve o valor pós-incremento, então a decisão
--    usa o número que ela mesma produziu.
--
-- 2. O teto global mora na MESMA tabela, na linha sentinela `__global__`. Um hash
--    real tem 64 caracteres hexadecimais, então a sentinela não colide com visitante
--    nenhum — e a função recusa explicitamente quem tentar passá-la de fora.
--
-- O IP nunca é gravado. O que entra é sha256(IP + salt), com o salt vivendo só como
-- secret do Worker. Sem o salt o hash de um IPv4 é enumerável em minutos (2^32),
-- que é a razão de o salt existir e de a aplicação recusar consulta sem ele.

create table public.demo_lookups (
  visitor_hash text    not null,
  dia          date    not null,
  n            integer not null default 0,
  primary key (visitor_hash, dia)
);

comment on table public.demo_lookups is
  'Contador de consultas não-cacheadas por visitante por dia. `visitor_hash` é sha256(IP + salt) — nunca IP cru. A linha `__global__` é o teto da casa. Ver SEGURANCA.md.';

-- Zero políticas, de propósito, como em `fichas`: `anon` e `authenticated` não leem
-- nem escrevem, `service_role` passa por definição. Sem política não há política
-- para alguém afrouxar por engano.
alter table public.demo_lookups enable row level security;
revoke all on public.demo_lookups from anon, authenticated;

/**
 * Incrementa os dois contadores do dia e devolve os valores JÁ incrementados.
 *
 * Uma chamada, uma transação: é o que torna a decisão imune à corrida. O preço é
 * que a tentativa negada também consome — e isso é intencional. Negação de graça
 * é convite a insistir.
 */
create or replace function public.bump_demo_quota(p_visitor text, p_dia date)
returns table (n_visitante integer, n_global integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
  g integer;
begin
  -- A sentinela é da casa. Se ela chegar por parâmetro, alguém está tentando
  -- escrever no teto global fingindo ser visitante.
  if p_visitor = '__global__' or p_visitor is null or length(p_visitor) <> 64 then
    raise exception 'visitor_hash inválido: esperado sha256 em hex de 64 caracteres';
  end if;

  insert into demo_lookups (visitor_hash, dia, n)
  values (p_visitor, p_dia, 1)
  on conflict (visitor_hash, dia) do update set n = demo_lookups.n + 1
  returning demo_lookups.n into v;

  insert into demo_lookups (visitor_hash, dia, n)
  values ('__global__', p_dia, 1)
  on conflict (visitor_hash, dia) do update set n = demo_lookups.n + 1
  returning demo_lookups.n into g;

  return query select v, g;
end;
$$;

-- `REVOKE ... FROM PUBLIC` NÃO tira a permissão do `anon` no Supabase: ele a tem por
-- concessão nominal do `ALTER DEFAULT PRIVILEGES` do schema. Nomear `anon` é
-- obrigatório — foi exatamente isso que deixou `is_approved` exposta até 28/jul/2026
-- enquanto o SEGURANCA.md afirmava o contrário.
revoke execute on function public.bump_demo_quota(text, date) from public, anon, authenticated;
grant  execute on function public.bump_demo_quota(text, date) to service_role;

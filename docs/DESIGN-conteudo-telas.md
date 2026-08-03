# JPS DS — Farol · respostas de conteúdo para as 5 telas

Respostas às 15 perguntas. Tudo abaixo veio do código e dos arquivos de método, não de suposição. Onde há escolha de escopo, a decisão está tomada.

**Três das perguntas partem de premissa errada. Começo por elas.**

---

## 1. Os quatro eixos — a suposição do exemplo está errada

O exemplo da pergunta (`Porte 0–3 · Stack 0–3 · Gatilho 0–2 · Setor 0–2`) não é a rubrica. **Stack não é eixo.** A tecnografia entra na ficha como informação, e não pontua — nenhuma ferramenta detectada muda o tier.

A rubrica real, portada de `fechar_ciclo.py`, tem **placar máximo de 5**:

| Eixo                     | Pontos      | Regra                                                                                                                                       |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Setor                | **+1**      | Setor no alvo: Fintech, Healthtech, DTC, CPG, SaaS, Govtech. Setor fora da lista não soma e não subtrai.                                    |
| 2 · Porte                | **+1**      | Scale-up ou Grande somam. Early não soma (o tíquete de consultoria não cabe).                                                               |
| 3 · Gatilho              | **+2 / +1** | Urgente vale 2: G1, G4, G7, G12, G13, G15, G19. Médio vale 1: G2, G3, G5, G6, G11, G14, G16, G17, G18. Os demais (G8, G9, G10) não pontuam. |
| 4 · Alcance do comprador | **+1 / −1** | Caminho quente (G12 ou G13) soma 1. **Porte Grande sem caminho quente subtrai 1 e trava o tier em C.**                                      |

O eixo 4 é o único que pode subtrair, e é o que mais estranha quem vê. A razão precisa aparecer na tela: a rubrica foi calibrada para consultor solo, e o centro de compra de uma empresa grande está fora do alcance dele sem porta de entrada. Para um time de vendas essa regra seria falsa. **É premissa do operador, não atributo da empresa** — o texto ao lado do score diz isso.

## 4. Seletor de porte — não são as faixas da Receita

As opções são **Early · Scale-up · Grande**. Não use `micro/pequena/média/grande`: essa é a escala da Receita, e ela é outra coisa.

Esse é o ponto mais fácil de errar em todo o produto, e está travado como decisão. A Receita só tem três faixas úteis (`01` micro, `03` pequeno porte, `05` demais) e **não existe faixa "grande"** — Banco do Brasil, Petrobras e Ambev voltam todas `DEMAIS`. Verificado na Brasil API em 27/jul/2026.

Consequência para as telas: a ficha mostra **as duas coisas, separadas e com rótulos diferentes**. O cadastro exibe `Porte (Receita) · Demais · nem micro, nem pequeno porte`, como informação. O seletor exibe `Porte (rubrica) · Early / Scale-up / Grande`, como entrada. Se as duas aparecerem com o mesmo rótulo "porte", o produto ensina o erro.

Microcópia sob os seletores: _"Porte e gatilho não estão em cadastro público. Escolha e veja o tier recalcular."_

## 6. Rigor dos dados — reais e exatos, com uma exceção honesta

**Cadastro: real e exato.** Sem plausível, sem "dados de demonstração". Um número inventado numa peça pública destrói a credibilidade do resto, e essa é regra da casa. Os valores exatos estão na resposta 5.

**Stack: é a exceção, e precisa de marcador.** O detector de tecnografia ainda não existe (é a próxima fase), então nenhuma stack pode ser apresentada como detectada de verdade. Marque a seção como exemplo — algo discreto: `stack de exemplo · detector em construção`. Preferível a inventar detecção e ter que desmentir depois.

---

## 2. Corte dos tiers e o que é "parcial"

- **A** — score ≥ 4
- **B** — score ≥ 2
- **C** — abaixo disso

O teto do eixo 4 rebaixa depois do corte: **teto limita, nunca promove.** Uma empresa Grande sem caminho quente pode somar 4 e ainda sair C.

**"Parcial" = nenhum gatilho informado.** É o estado padrão de toda consulta nova, porque gatilho vem de notícia e de conversa, não de cadastro. Na tela: `B · 3 de 5` com o sufixo `parcial`. Quando o usuário escolhe um gatilho no seletor, o sufixo sai.

## 3. Os 19 gatilhos — lista completa

Mostre 6 e resuma o resto, mas use estes rótulos e mantenha o código visível (`G4`, não "troca de C-level" solto):

|     | Gatilho                                                      | Peso             |
| --- | ------------------------------------------------------------ | ---------------- |
| G1  | Captou rodada / aporte recente                               | urgente          |
| G2  | M&A / aquisição                                              | médio            |
| G3  | Aquisição desacelerando / churn / MAU em queda               | médio            |
| G4  | Troca de C-level (novo CEO/CFO/CMO)                          | urgente          |
| G5  | Lançamento de produto / novo mercado                         | médio            |
| G6  | Internacionalização / entrada em mercado novo                | médio            |
| G7  | Evento de governança (JV, IPO, earn-out, prazo regulatório)  | urgente          |
| G8  | Boutique de dados querendo escalar método                    | —                |
| G9  | Tema externo (regulatório, eleitoral, macro) vira prioridade | —                |
| G10 | Vaga de Head/VP aberta há tempo                              | —                |
| G11 | Contratou líder de growth/dados                              | médio            |
| G12 | Ex-cliente mudou de empresa                                  | urgente + quente |
| G13 | Intenção declarada                                           | urgente + quente |
| G14 | Travado em piloto de IA sem valor                            | médio            |
| G15 | Legal adverso                                                | urgente          |
| G16 | Intenção de pesquisa                                         | médio            |
| G17 | Produto e operação                                           | médio            |
| G18 | Ecossistema e rede                                           | médio            |
| G19 | Receita pública contratada                                   | urgente          |

Para a tela, os 6 que contam melhor a história: **G1, G4, G12, G13, G14, G7**. G12 e G13 são os únicos "quentes" e por isso os únicos que ativam o bônus do eixo 4 — vale deixar isso visível quando um deles é escolhido.

Selecione o estado inicial como **"nenhum gatilho observado"**, que é o caso real.

## 5. Empresa canônica das telas 3 e 4

Use **Ambev**. É real, o setor CPG está na lista core, e eu consultei a Brasil API agora — os valores abaixo são exatos:

| Campo               | Valor                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Razão social        | AMBEV S.A.                                                               |
| Nome fantasia       | _(vazio na Receita — a tela deve omitir a linha, não mostrar em branco)_ |
| CNPJ                | 07.526.557/0001-00                                                       |
| CNAE principal      | 1113-5/02 · Fabricação de cervejas e chopes                              |
| Porte (Receita)     | Demais · nem micro, nem pequeno porte                                    |
| Capital social      | R$ 58.308.215.000                                                        |
| Natureza jurídica   | Sociedade Anônima Aberta                                                 |
| Situação cadastral  | ATIVA                                                                    |
| Município           | SÃO PAULO · SP                                                           |
| Início de atividade | 19/07/2005                                                               |
| Quadro societário   | 7 sócios · 7 administradores                                             |

Nomes reais do QSA, se precisar preencher a lista: CARLA SMITH DE VASCONCELLOS CRIPPA PRADO, CARLOS EDUARDO KLUTZENSCHELL LISBOA, GUILHERME FLEURY DE FIGUEIREDO FERRAZ PAROLARI — todos com qualificação **Diretor**. São dados públicos da Receita por força de lei.

Duas coisas que a Ambev exercita bem, e por isso ela é boa escolha: o **nome fantasia vazio** (a tela precisa omitir a linha em vez de mostrar rótulo sem valor) e o **teto do eixo 4** (Grande sem caminho quente → travada em C, mesmo com setor core somando).

Se quiser uma de porte médio menos óbvia, me diga o nome e eu consulto para trazer os valores exatos. Não invente CNPJ.

## 7. Chips do estado vazio

Quatro nomes: **Nubank · Magazine Luiza · Totvs · Ambev**.

Cobrem fintech, varejo, SaaS/ERP e CPG. Totvs e VTEX têm a vantagem de serem elas próprias fingerprints do detector, então quando a tecnografia existir a stack aparece no primeiro clique em vez de sair vazia.

## 8. Stack de exemplo, com procedência

As categorias são as reais do `tecnografias_br.json` (**23 ferramentas desde 28/jul/2026** — PIX saiu, ver ROADMAP Fase 4; nas telas o número vem da prop `catalogo`, não literal). Sugestão para a tela:

**Procedência forte** (evidência direta no site)

- `RD Station Marketing` — Marketing Automation — via **script**
- `VTEX` — E-commerce — via **header**
- `Jivochat` — Live Chat — via **cookie**
- `Sankhya` — ERP — via **cname**

**Procedência inferida** (`implies`, visualmente mais fraca)

- `Pagar.me` — Payment Processor — **inferido de Stone**

Detalhe que importa: **`Stone → Pagar.me` é o único `implies` que existe** entre os fingerprints do catálogo. Se a tela precisar de um segundo exemplo de inferência, ele seria inventado — melhor mostrar um só e deixar a assimetria visível, porque ela é verdadeira.

O marcador de procedência não é decoração. Ele existe para o usuário saber o que foi visto e o que foi deduzido.

## 9. Quota da demo

**5 consultas por dia, por visitante.** Não é limite fixo de 3 ou 5 no total: reseta diariamente, porque a demo é vitrine e não teste.

Consulta que vem do cache **não conta**. O contador é por visitante, identificado por hash do IP com salt secreto — nunca o IP.

O que vem depois: mensagem sem punição, convidando ao cadastro. _"Você usou as consultas da demo de hoje. Criar conta libera mais."_ Conta aprovada tem 50/dia.

CTA é **cadastro com e-mail e senha**, com aprovação manual depois. A tela de espera diz o motivo: _"Aprovo manualmente porque o Farol consulta fontes públicas com limite, e o limite é finito."_

## 10. Quanto deve funcionar

Nesta ordem de valor:

1. **Seletores de porte e gatilho recalculando o tier ao vivo — obrigatório.** É a peça que demonstra a rubrica. Sem interação, a tela mostra um número sem mostrar de onde ele vem, que é o oposto do argumento do produto.
2. **Navegação entre as 5 telas — sim.**
3. **A varredura de 900ms ao buscar — sim**, é barata e caracteriza a marca.
4. **Digitar CNPJ e ver a ficha — não.** Deixe os chips clicáveis levando à ficha da Ambev, e o campo livre inerte. Consulta de verdade exige a fonte, e isso já funciona em produção.

## 11. Como entregar

**Os dois, e nesta ordem:** primeiro o canvas com as 5 telas lado a lado, que é como se revisa consistência de sistema; depois o app navegável com os seletores funcionando.

Se tiver que ser um só, o canvas — a interação vale mais na revisão de conjunto que a navegação.

## 12. Página de tokens e contraste

**Faça a folha de especificação completa**, com os 14 pares e os ratios.

O motivo não é documentação: é que dois tokens já foram corrigidos por falharem AA (`--farol-fog` dava 3,64 dentro de campo, `--farol-tier-c` dava 4,47), e a tabela visível é o que impede alguém — inclusive eu, em sessão futura — de "melhorar" a paleta e desfazer a correção em silêncio. Os números estão na §2.1 da spec.

## 13. Seções da landing

Só as quatro da spec: **hero, mock da ficha, antes/depois, método**.

**Não** inclua "os quatro irmãos da família JPS" como seção. O rodapé já lista os produtos irmãos — é a solução que os outros três usam, e uma seção inteira sobre a família na landing tira o foco do produto para falar do portfólio.

**Rodapé com assinatura J P Saraiva: sim**, no padrão dos irmãos. Descritor curto do Farol: `Cadastro da Receita · tecnografia brasileira · priorização por rubrica`.

## 14. Idioma

**PT-BR na interface, nome de ferramenta e categoria de stack em inglês.**

Nome de produto não se traduz (RD Station Marketing, VTEX, Pagar.me), e categoria de tecnografia é jargão de ofício que o comprador usa em inglês (CRM, ERP, E-commerce, Payment Processor). Traduzir "Payment Processor" para "processador de pagamento" soaria amador para quem trabalha com isso.

A régua da casa: jargão do métier fica; anglicismo de preguiça sai. "Marketing Automation" fica; "insights acionáveis" não existiria aqui.

## 15. Wordmark e favicon

**Os dois.** Arquivos SVG e favicon no projeto, e a prancha de escala dentro das telas.

A prancha importa mais que de costume porque o ponto de luz no "o" é o detalhe que decide se a marca funciona: em 16px ele precisa continuar legível como luz, e não virar um borrão. Se não sobreviver, o glifo simplifica — o wordmark é que manda, não o conceito.

---

## O que não mudar

A spec tem uma tabela de **onze decisões travadas** no topo, com o portão para reabrir: fato novo, não preferência. Vale para paleta, tipografia, ausência de tema claro, uso do facho e a palavra "ficha" no lugar de "dossiê".

Se algo do que respondi aqui exigir mudar cor de texto, recalcule o contraste e mostre o número. O padrão é não mexer.

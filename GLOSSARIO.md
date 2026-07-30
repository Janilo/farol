# Farol — linguagem ubíqua

**Aprovado em 27/jul/2026.** No molde do `GLOSSARIO.md` do repo irmão `Janilo/lente`.

⛔ **As sete armadilhas do fim deste arquivo são decisões travadas, não sugestões.** Cada uma existe porque um defeito real aconteceu ou porque a fonte foi testada e não entrega o que se supunha. Reabrir exige fato novo — fonte que mudou, medição que contradiz. Ver a tabela de decisões travadas em [`docs/DESIGN.md`](docs/DESIGN.md).

Este arquivo existe por um motivo prático: quando eu e você (e a IA que escreve o código) usamos a mesma palavra para coisas diferentes, o bug não aparece no compilador — aparece na tela, meses depois. No Cascata isso já aconteceu: "Pocket Margin" significava reais em três telas e percentual numa quarta. Um termo, um conceito, do schema até o botão.

## Regra de idioma

**Código e schema em inglês. UI e prompts em PT-BR. A fronteira é a tela.**

Exceção, nova em relação ao Lente: **termos jurídico-fiscais brasileiros sem tradução fiel são substantivos próprios do domínio** e ficam em português no código e no schema. `cnpj` não vira `taxId`, `cnae` não vira `activityCode`, `porte` não vira `size`. Traduzir aqui perde precisão: `porte` da Receita é uma classificação legal com valores fixos, não um adjetivo de tamanho.

## Termos

| Termo (código/schema) | Grão | O que é | Idioma |
|---|---|---|---|
| `dossier` | empresa (CNPJ) | O resultado de uma consulta: cadastro + stack + pré-tier, montado na hora. É a unidade que o produto entrega. **Na UI é sempre "ficha"**, nunca "dossiê": em português do Brasil a palavra carrega halo de investigação, e o produto lê registro público. | EN código / PT UI |
| `enrichment` | ficha | O bloco de dados cadastrais vindo da Brasil API: razão social, CNAE, porte, capital, sócios. | EN |
| `technographic` | ficha × ferramenta | Uma ferramenta detectada no site da empresa. O plural `technographics` é o bloco inteiro da ficha. | EN |
| `detection` | technographic | Uma ocorrência: a ferramenta **e por qual via** foi encontrada (`script`, `header`, `meta`, `dom`, `cookie`, `implied`). A via importa e aparece na UI. | EN |
| `fingerprint` | ferramenta | A assinatura que permite detectar uma ferramenta. São 23, todas brasileiras — o número vem de `CATALOGO` em `fingerprints.ts`, nunca digitado. Fingerprint é a *regra*; detection é o *achado*. | EN |
| `tier` | ficha | A saída da rubrica: `A`, `B` ou `C`. **Na v1 é sempre pré-tier** — ver abaixo. Rótulos fixos na UI: **A · abordar agora**, **B · nutrir**, **C · revisitar**. | EN código / PT UI |
| `preTier` | ficha | O tier calculado só com o que a máquina consegue ver. O tier definitivo exige julgamento humano e não existe neste produto. Todo `tier` da v1 é `preTier`; o tipo carrega `partial: true` quando falta gatilho. | EN |
| `trigger` | evento | O gatilho de timing da rubrica (`G1`…`G19`). Na UI é sempre **"gatilho"**. | EN código / PT UI |
| `signal` | — | **Reservado. Não existe na v1.** No motor completo, um `signal` é a notícia bruta que *aponta* para um gatilho. Está aqui para impedir que alguém use `signal` como sinônimo de `trigger` e feche a porta para a v2. | EN, reservado |
| `axis` | pré-tier | Um dos 4 eixos que somam pontos: setor, porte, gatilho, winnability. A ficha mostra cada eixo com seu ponto — o score nunca aparece sem a razão. | EN |
| `cap` | pré-tier | Um teto que **rebaixa** o tier independentemente do score. Só existe um na v1 (porte grande sem caminho quente). Teto nunca promove. | EN |
| `cnpj` | empresa | Os 14 dígitos. No schema e no código, sempre limpo (só dígitos); a máscara é da tela. | PT (próprio) |
| `cnae` | empresa | Código de atividade econômica da RFB. `cnae` é o principal; `secondaryCnaes` os demais. | PT (próprio) |
| `porte` | empresa | A classificação da RFB, que tem só três faixas úteis: `01` micro, `03` pequeno porte, `05` demais (mais `00` não informado). **Não existe faixa "grande"**: Banco do Brasil, Petrobras e Ambev voltam todas `DEMAIS`. **Não é o porte da rubrica** — ver armadilha 2. | PT (próprio) |
| `legalName` | empresa | Razão social. Traduz sem perda. | EN |
| `tradeName` | empresa | Nome fantasia. | EN |
| `legalNature` | empresa | Natureza jurídica (`213-5` MEI, `206-2` LTDA…). | EN |
| `partner` | empresa | Um sócio do QSA: nome e qualificação textual. **Sem percentual** — ver armadilha 3. | EN |
| `rubricPorte` | empresa | O porte na linguagem da rubrica: `Early`, `Scale-up`, `Grande`. Nome híbrido de propósito: deixa explícito que é *o porte da rubrica*, não o da Receita. | híbrido |
| `visitorHash` | visitante × dia | `sha256(IP + salt)`. **Nunca IP** — o nome diz "hash" para que ninguém escreva `visitorIp` num log achando que é a mesma coisa. | EN |
| `plano` | visitante | `anonimo` ou `aprovado`. Define o limite diário. Não é assinatura nem produto pago: o Farol não é monetizado. | PT (próprio) |
| `quota` | visitante × dia | O teto de **consultas que saem para a rede** por dia. Consulta servida do cache não é quota — ver armadilha 7. | EN |

## Armadilhas nomeadas

**1. `signal` não é `trigger`.** O gatilho é a *categoria* de evento ("captou rodada"); o sinal é a *ocorrência* ("a Medipreço captou R$ 2,5 mi em 25/jul, segundo o Panorama Farmacêutico"). A v1 só tem gatilho. Se alguém escrever `signal` no código da v1, está errado.

**2. `porte` da RFB ≠ `rubricPorte`, e o mapa entre eles não existe.** São escalas diferentes com nomes parecidos, o que é a receita completa do bug do Cascata. Pior: elas **não são conversíveis**. A RFB tem três faixas (micro, pequeno, demais) e a rubrica tem três outras (Early, Scale-up, Grande), e `DEMAIS` cobre tanto Scale-up quanto Grande — verificado na Brasil API em 27/jul/2026 com Banco do Brasil, Petrobras e Ambev, todas `DEMAIS`. Portanto `rubricPorte` **não pode ser derivado** de `porte`: ele vem do usuário ou não vem. Qualquer função que tente inferir um do outro está errada por construção.

**3. `partner` não tem percentual.** A Brasil API devolve o quadro societário sem participação acionária. O motor Python tentava inferir o "sócio relevante" lendo percentual de um campo que é texto ("Sócio-Administrador") — e a função quebrava antes de chegar lá. O produto não infere: mostra os sócios e destaca os administradores. Se um dia houver fonte com percentual, aí sim existe `ownership`.

**4. `tier` não é etapa.** Tier é prioridade (A/B/C). Etapa de funil (identificada, aquecida, dormente…) é outra coisa e **não existe neste produto** — o Farol classifica, não acompanha relacionamento. Se aparecer `stage` no código da v1, é escopo vazando.

Por isso o tier C é **"revisitar"** e não "observar" (28/jul/2026): `scoring.md` chama o C de "Watch / adjacente", e `watch` no método do Janilo é um valor de `Estagio_pipeline` — uma das subpastas de `Leads/`. Traduzir o rótulo do tier com a palavra do estágio importa a confusão que esta armadilha existe para impedir. "Revisitar" vem da mesma linha da fonte ("Fit parcial; revisitar no refresh") e não colide com nada. Os outros dois saem literais de `scoring.md`: A "Abordar agora", B "Nutrir / aquecer" → **abordar agora**, **nutrir**.

**5. `empty` na stack é achado, não ausência.** Site lido e nenhuma das 23 encontradas **não** é o mesmo que "não informou site". O primeiro diz algo sobre a empresa — ela não roda nada do catálogo brasileiro; o segundo diz que ninguém tentou. Por isso `StackResult` é união `ok | empty | error` e a ficha carrega `stack: StackResult | null`, onde `null` é o "nem tentou". Na tela, `empty` **desenha** a seção com uma linha e `error` **não desenha** — se as duas escondessem, o achado viraria indistinguível de omissão.

**6. Winnability é premissa, não atributo.** O eixo 4 rebaixa empresa grande sem caminho quente porque a rubrica foi calibrada para um consultor solo — o centro de compra de uma empresa grande está fora do alcance dele. Para um SDR de um SaaS com time, essa regra seria falsa. A UI diz isso em texto, ao lado do score. É a diferença entre demonstrar um método e vender uma verdade.

**7. `quota` conta saída de rede, não requisição.** Consulta servida do cache não
consome nada — ela não custa a ninguém, e cobrar por ela puniria justamente o caminho
que queremos que as pessoas usem. Por isso o portão fica depois das duas decisões de
cache e antes de qualquer `fetch`, e não na borda do serverFn: só ali se sabe se a
consulta vai custar. Se alguém mover a checagem para a entrada, o limite passa a
contar recarga de página.

E o contador é **pós-incremento**: `bump_demo_quota` reserva e devolve o valor já
somado, porque `count(*)` antes de decidir tem corrida — duas requisições paralelas
leem 4 e ambas passam. Consequência aceita: tentativa negada também consome.

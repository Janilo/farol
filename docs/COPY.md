# Farol — copy v1 (para aprovação)

Escrita para os containers que já existem no repo. Cada bloco abaixo aponta o arquivo e o slot; nada vai pra tela antes do seu OK.

Registro calibrado nos irmãos: eyebrow é a categoria do método (Lente: "Pesquisa qualitativa com IA"; Prisma: "Marketing Mix Modeling"), H1 é a transformação ("Da entrevista bruta ao insight", "Do chute ao número"), e o antes/depois usa dado de exemplo concreto.

---

## 1. Landing — `src/routes/index.tsx`

### 1.1 Meta e SEO

**Title** (também og:title e twitter:title)

> Farol · Ficha instantânea de empresas brasileiras

**Description** (também og e twitter)

> Digite um nome ou um CNPJ. O Farol lê o cadastro público da Receita Federal, detecta a stack do site e devolve razão social, CNAE, porte, quadro societário e ferramentas em uso, com uma prioridade calculada e a conta aberta de como chegou nela.

**JSON-LD, WebSite.description**

> Ficha de empresa brasileira a partir de CNPJ ou nome: cadastro da Receita, tecnografia do site e priorização por rubrica.

### 1.2 Hero

**Eyebrow**

> Ficha de empresa brasileira

**H1** (a parte em destaque vai em `--farol-beam`)

> O que as ferramentas globais **não veem** no Brasil.

**Lede**

> Ferramentas globais inferem a identidade de uma empresa brasileira por scraping. O Farol lê a fonte primária: CNPJ na Receita, CNAE, capital, quadro societário. Some a isso a stack que roda no site, incluindo as ferramentas brasileiras que scanner global não reconhece, e uma prioridade calculada com a rubrica que eu uso na consultoria.

**CTAs** (mantêm os labels do container)

- Primário: `Criar conta`
- Secundário: `Ver demo` + microcópia `Não precisa de cadastro`
- Terciário: `Entrar`

### 1.3 Seção "O que você recebe"

**Eyebrow**

> O que você recebe

**H2** (destaque em `--farol-beam`)

> Uma ficha **por empresa**, da Receita à stack.

**Nota lateral**

> Cadastro da fonte primária, {CATALOGO} fingerprints de ferramentas brasileiras e a rubrica de priorização com os quatro eixos abertos.

_(`{CATALOGO}` é interpolado de `fingerprints.ts`, hoje 23. Não escrever o número: ele muda e a prosa não avisa.)_

**Mock da ficha** (substitui `PREVIEW_LINES`; empresa fictícia, como a "Acme Distribuidora" do Cascata)

| Campo             | Valor                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Razão social      | ACME SAÚDE DIGITAL LTDA                                              |
| CNPJ              | 12.345.678/0001-90                                                   |
| CNAE principal    | 6201-5/01 · Desenvolvimento de programas de computador sob encomenda |
| Porte (Receita)   | Demais · nem micro, nem pequeno porte                                |
| Capital social    | R$ 4.200.000                                                         |
| Quadro societário | 3 sócios · 1 administrador                                           |
| Stack detectada   | RD Station Marketing · Pagar.me · VTEX                               |
| Pré-tier          | **B** · 3 de 5 · parcial                                             |

Cabeçalho da janela do mock:

> Acme Saúde Digital · consulta de 27/jul/2026 · fonte: Receita Federal

Linha do drill-down (o equivalente ao "33 sublinhas" do Cascata):

> ↳ os quatro eixos que formaram o score…

**Seletores ao lado do score** (as duas entradas que não vêm de cadastro público):

- `Porte` · early · **scale-up** · grande
- `Gatilho` · nenhum observado · G1 rodada · G4 troca de C-level · … (19 opções)

Microcópia sob os dois:

> Porte e gatilho não estão em cadastro público. Escolha e veja o tier recalcular.

### 1.4 Seção "Antes / depois"

**Eyebrow**

> Antes / depois

**H2** (destaque em `--farol-beam`)

> De quatro abas abertas a **uma consulta**.

**Card "Antes"**

Label: `Antes — pesquisa manual`

```
receita.economia.gov.br — captcha, uma consulta por vez
site da empresa — abrir o código pra ver o que roda
linkedin.com/company — headcount aproximado, sem CNPJ
planilha_prospects_v4.xlsx — copiar e colar campo por campo
… + uma aba por fonte, e o dado envelhece na planilha
```

> Sem número aqui de propósito. O Cascata tem "+ 3 dias de reconciliação manual" no slot equivalente, mas ali o número vem de projeto real. Aqui não existe medição, então o custo aparece pela imagem das quatro abas que as linhas de cima já provaram.

**Card "Depois"**

Label: `Depois — ficha montada`

- `CADASTRO` — CNPJ resolvido na Receita Federal: razão social, CNAE, porte, capital, sócios e situação cadastral.
- `TECNOGRAFIA` — a stack do site contra `{CATALOGO}` fingerprints brasileiros. RD Station, Totvs, VTEX e Pagar.me não aparecem em scanner global.
- `PRIORIDADE` — pré-tier A, B ou C com os quatro eixos abertos. Você vê o que somou ponto e o que rebaixou.

### 1.5 Seção "Método"

**Eyebrow**

> Método

**01 — Digite o CNPJ** _(corrigido em 03/ago/2026)_

> Os dígitos verificadores são conferidos no navegador, então CNPJ errado não gasta consulta. Busca por nome não existe: as fontes públicas gratuitas não têm índice textual, e eu prefiro dizer isso a te devolver resultado ruim.

O texto anterior prometia "até cinco candidatos com razão social" para busca por
nome. **Essa busca nunca existiu:** `searchCnpjByName` devolve `unavailable` por
desenho, porque a rota herdada do script Python não existe na fonte (Fase 3 do
roadmap). A `/demo` já dizia a verdade — a home contradizia a demo do mesmo
produto, e este arquivo, que é a copy de referência, sustentava a versão falsa.

**02 — O Farol lê as fontes**

> Cadastro na Receita Federal via Brasil API. Se você informar o site, a stack sai da própria página: scripts, cabeçalhos, cookies e o que uma ferramenta implica sobre a outra.

**03 — A rubrica calcula a prioridade**

> Setor, porte, gatilho e alcance do comprador. Porte e gatilho você informa, porque nenhum dos dois está em cadastro público. O score aparece com a conta na frente, e o eixo de alcance está calibrado para consultor solo, não para time de vendas. Isso é premissa, e a tela diz isso.

---

## 2. Demo — `src/routes/demo.tsx`

**Faixa de topo**

> Demo pública · dados reais da Receita Federal

**Botão da faixa**

> Criar conta

**Eyebrow do resultado**

> Ficha gerada pelo Farol

**H1 da demo**

> Aponte o farol para uma empresa.

**Lede**

> Digite o CNPJ ou o nome. Se souber o site, informe também: é dele que sai a stack.

**Campos**

- `Nome da empresa ou CNPJ` · placeholder: `12.345.678/0001-90 ou Acme Saúde Digital`
- `Site (opcional)` · placeholder: `acme.com.br` · ajuda: `Sem o site, a ficha sai sem a seção de stack.`

**Chips de exemplo**

> Experimente com:

**Estado vazio**

> Nenhuma consulta ainda. Escolha um exemplo acima ou digite um CNPJ.

**Mensagens de erro** (uma por código de `error-codes.ts`)

| Código                | Texto na tela                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `INVALID_CNPJ`        | Esse CNPJ não fecha nos dígitos verificadores. Confira e tente de novo.                                                                    |
| `COMPANY_NOT_FOUND`   | CNPJ válido, mas sem registro na Receita. Pode ser baixa cadastral ou erro de digitação.                                                   |
| `NAME_NO_MATCH`       | Não achei empresa com esse nome. Tente a razão social ou o CNPJ direto.                                                                    |
| `SOURCE_RATE_LIMITED` | A fonte pública limitou as consultas por agora. Tente em alguns minutos.                                                                   |
| `SOURCE_UNAVAILABLE`  | A fonte da Receita está fora do ar. Não é você, é ela.                                                                                     |
| `SITE_UNREACHABLE`    | O site não respondeu, então a stack não entrou. O cadastro está completo.                                                                  |
| `QUOTA_VISITANTE`     | Você usou as 5 consultas novas de hoje. Empresa que já está em cache continua liberada, como os exemplos acima.                            |
| `QUOTA_GLOBAL`        | A demo bateu o teto de consultas do dia. O limite é da casa, não seu: o Farol lê fontes públicas de graça e não repassa a conta para elas. |
| `QUOTA_INDISPONIVEL`  | Não consegui apurar o limite de consultas agora, e prefiro recusar a consultar sem contar. Tente em alguns minutos.                        |

**Rodapé da demo**

> Dados públicos da Receita Federal, consultados via Brasil API. O Farol não guarda nada além da consulta feita.

---

## 3. Metodologia — `src/routes/metodologia.tsx`

**Eyebrow**: `METODOLOGIA`

**H1**

> Como o Farol decide o que é prioridade.

**01 — Por que quatro eixos**

> A rubrica saiu de doze projetos de consultoria, não de um framework de prateleira. Cada eixo existe porque separou, na prática, conta que fechou de conta que consumiu tempo: setor no alvo, porte com orçamento, gatilho ativo e comprador alcançável. Sem gatilho identificável e sem caminho quente, não é prioridade máxima, por melhor que seja o setor.

**02 — O que cada eixo pesa**

- `Setor` (+1) — fintech, healthtech, e-commerce, SaaS B2B, govtech e boutique de pesquisa somam. Setor fora da lista não zera a conta, sinaliza que a leitura é sua.
- `Porte` (+1) — scale-up e grande somam, porque têm orçamento. Early não soma, e a razão aparece na tela: o tíquete de consultoria não cabe. **O porte é você que informa**, porque o cadastro da Receita não separa scale-up de grande: a faixa `DEMAIS` vale tanto para uma empresa de cinquenta pessoas quanto para a Ambev.
- `Gatilho` (+2 ou +1) — o evento que cria urgência. Rodada, troca de C-level, governança, ex-cliente que mudou de empresa e intenção declarada valem dois. Aquisição, churn, lançamento e piloto de IA travado valem um.
- `Alcance do comprador` (+1 ou −1) — caminho quente soma. Empresa grande sem caminho quente subtrai, e trava o tier em C.

**03 — Por que o eixo de alcance pode subtrair**

> Esse é o eixo que mais gente estranha. Uma empresa de mil funcionários é ótima cliente para quem tem time comercial, e é praticamente inalcançável para um consultor solo sem porta de entrada: o centro de compra está a três camadas de distância. A rubrica foi calibrada para o segundo caso. Se você vende com time, esse eixo deveria somar, não subtrair, e o Farol mostra o cálculo justamente para você poder discordar dele.

**04 — O que a máquina não decide**

> O tier final. O Farol devolve um pré-tier, com "parcial" estampado quando não há gatilho observado, porque gatilho vem de notícia e de conversa, não de cadastro. Casar nome com CNPJ quando a empresa tem holding e três razões sociais também continua sendo trabalho humano. A ferramenta reduz a pesquisa, não substitui o julgamento.

**Fecho / link**

> Voltar para a página inicial

---

## 4. Termos de Uso — `src/routes/termos.tsx`

**1. Aceitação**

> Ao criar uma conta ou usar o Farol, você concorda com estes Termos. Se não concordar, não use o serviço.

**2. Descrição do serviço**

> O Farol é uma ferramenta de consulta que reúne, numa única ficha, dados cadastrais públicos de empresas brasileiras, tecnologias detectáveis em sites públicos e uma classificação de prioridade calculada. É uma demonstração técnica de J P Saraiva Consultoria, oferecida sem cobrança e sem garantia de continuidade.

**3. Uso aceitável**

> Você não pode: automatizar consultas além dos limites da interface; revender ou redistribuir as fichas como base de dados; usar o serviço para constranger, fraudar ou fazer engenharia social contra as empresas consultadas; tentar acessar dados de outros usuários ou contornar mecanismos de segurança.

**4. Precisão dos dados**

> Os dados cadastrais vêm da Receita Federal por intermediários públicos e podem estar desatualizados na fonte. A detecção de tecnologia é inferência a partir do que o site expõe, e erra nos dois sentidos: aponta ferramenta que saiu e deixa de apontar ferramenta que está lá. O pré-tier é o resultado de uma rubrica opinativa, explicada em Metodologia. Nenhuma dessas três coisas é aconselhamento comercial, e a decisão continua sendo sua.

**5. Propriedade**

> Os dados cadastrais são públicos e não pertencem a ninguém aqui. A rubrica, os fingerprints e o código são nossos.

**6. Disponibilidade**

> Buscamos disponibilidade contínua, sem garantir uptime. O serviço depende de fontes públicas de terceiros, que podem sair do ar ou mudar as regras a qualquer momento.

**7. Encerramento**

> Podemos suspender contas que violem estes Termos. Você pode encerrar a sua a qualquer momento.

**8. Lei aplicável**

> Estes Termos são regidos pelas leis brasileiras.

---

## 5. Política de Privacidade — `src/routes/privacidade.tsx`

**1. Quem somos**

> O Farol é um produto de J P Saraiva Consultoria Ltda., com sede no Brasil. Somos o controlador dos dados pessoais tratados aqui.

**2. Dados que coletamos**

> De quem cria conta: e-mail, nome e senha (armazenada com hash pelo Supabase Auth). De quem usa a demo sem conta: um identificador derivado do endereço IP por hash com salt secreto, mais a data e a hora da consulta.

**3. Sobre o hash do IP**

> Não guardamos endereço IP. Guardamos o resultado de um hash com salt, que serve só para contar quantas consultas vieram do mesmo visitante no dia e aplicar o limite da demo. O salt fica no servidor e nunca sai dele. Sem o salt, o hash não volta a ser IP.

**4. Dados das empresas consultadas**

> A ficha usa dados cadastrais públicos da Receita Federal, incluindo nomes de sócios, que são públicos por força de lei. Guardamos o resultado da consulta em cache por até 30 dias, para não repetir a chamada à fonte pública. Se você é sócio de uma empresa e quer que o cache dela seja apagado, escreva para o e-mail abaixo.

**5. Finalidade e base legal**

> Autenticação e operação da conta: execução de contrato (art. 7º, V, LGPD). Limite da demo e prevenção de abuso: legítimo interesse (art. 7º, IX, LGPD). Comunicação transacional, como confirmação de conta: legítimo interesse (art. 7º, IX, LGPD).

**6. Compartilhamento**

> Não vendemos dados pessoais. Usamos Supabase (banco e autenticação) e Cloudflare (hospedagem) como operadores, e consultamos Brasil API e cnpj.ws como fontes de dado cadastral.

**7. Retenção**

> Conta: enquanto ela existir. Registros do limite da demo: 30 dias. Cache de ficha: 30 dias.

**8. Seus direitos**

> Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade ou eliminação dos seus dados, e revogar consentimento. Escreva para janilo@pereirasaraiva.com.

**9. Alterações**

> Mudanças relevantes serão avisadas por e-mail ou por aviso na plataforma.

---

## 6. Telas de conta

**`login.tsx`**

- Title: `Entrar — Farol`
- Description: `Acesse sua conta Farol para consultar fichas de empresas brasileiras com quota ampliada.`
- H1: `Entrar`
- Link: `Não tem conta? Criar conta`

**`signup.tsx`**

- Title: `Criar conta — Farol`
- Description: `Crie sua conta Farol em um minuto. Consultas com quota ampliada e histórico das suas buscas.`
- H1: `Criar conta`
- Microcópia sob o botão: `A conta passa por aprovação manual. Você recebe um e-mail quando liberar.`

**`aguardando-aprovacao.tsx`**

- H1: `Conta em análise`
- Corpo: `Sua conta foi criada e está aguardando liberação. Aprovo manualmente porque o Farol consulta fontes públicas com limite, e o limite é finito. Você recebe um e-mail assim que liberar.`
- Ação: `Ver a demo enquanto isso`

**`forgot-password.tsx`**

- H1: `Esqueci a senha`
- Corpo: `Informe o e-mail da conta e enviamos um link para redefinir.`

**`reset-password.tsx`**

- H1: `Nova senha`
- Corpo: `Escolha uma senha nova para a sua conta.`

**Área logada — `_authenticated/app.tsx`** (substitui o placeholder)

- Eyebrow: `Consulta`
- H1: `Aponte o farol para uma empresa.`
- Nota de quota: `Você tem N consultas hoje.`

---

## 7. Rodapé e header

**`SiteHeader.tsx`** — links: `Metodologia` · `Entrar` · `Criar conta`

**`BrandFooter.tsx`** — linha de assinatura:

> Farol · 2026 · um produto de J P Saraiva

Descritor curto (onde o Cascata dizia "Price waterfall · IA · P&L por cliente"):

> Cadastro da Receita · tecnografia brasileira · priorização por rubrica

---

## Pontos que precisam da sua decisão

1. **O H1 da landing é a tagline aprovada** ("O que as ferramentas globais não veem no Brasil"). Ela nomeia concorrente na lede logo abaixo (Clay, Apollo, ZoomInfo). É afirmação factual e defensável (nenhum deles lê CNPJ como fonte primária), e ainda assim é nomear concorrente numa página pública sua. Se preferir, a lede sai sem os nomes: "Ferramentas globais inferem a identidade de uma empresa brasileira por scraping."

2. **A empresa do mock é fictícia** (Acme Saúde Digital), no mesmo padrão da "Acme Distribuidora" do Cascata. Alternativa: usar uma empresa real com dado real consultado ao vivo, o que é mais impressionante e me obriga a checar cada campo antes de publicar.

**As 8 empresas dos chips estão definidas** (27/jul): Nubank, Magazine Luiza, Totvs, VTEX, Hospital Care, Dr. Consulta, Loggi e Wine. Entram como cache pré-computado, então clicar num chip não gasta chamada à fonte pública.

Critério da escolha, para quem revisitar: cobrem os quatro setores core do ICP (fintech, e-commerce/varejo, SaaS/ERP, healthtech), variam de porte, e todas rodam stack detectável pelos fingerprints brasileiros — VTEX e Totvs são as próprias ferramentas do JSON, o que faz a tecnografia aparecer no primeiro clique em vez de sair vazia.

⚠️ Antes de virar seed, cada uma precisa de uma consulta real: confirmar CNPJ e que a Receita devolve situação ativa. Empresa de exemplo com dado errado na landing é pior que não ter exemplo.

## Decisões travadas (27/jul/2026)

**Lede sem nomear concorrente.** "Ferramentas globais inferem a identidade..." em vez de citar Clay, Apollo e ZoomInfo. Mesmo argumento, sem apontar dedo em página pública.

**Porte vem de seletor na tela.** O `porte` da Receita não serve para os eixos 2 e 4 da rubrica. Consultei a Brasil API ao vivo em 27/jul/2026: Banco do Brasil, Petrobras e Ambev voltam todas `porte: "DEMAIS"`, `codigo_porte: 5`. A escala real é `01` micro, `03` pequeno porte, `05` demais (e `00` não informado); **não existe faixa "grande"**. [Certo quanto a `05 = DEMAIS`, observado em três empresas; Provável quanto aos rótulos de `01` e `03`, que não consultei.]

Sem isso, o eixo 4 rebaixaria qualquer empresa que não fosse micro ou pequena, incluindo o scale-up que é o sweet spot. Então: **`rubricPorte` vem de um seletor de três opções** (early, scale-up, grande) ao lado do seletor de gatilho, os dois alimentando o mesmo cálculo ao vivo. O cadastro da Receita continua aparecendo na ficha como informação (`Demais · nem micro, nem pequeno porte`), sem virar entrada do score.

Consequência de implementação: `Enrichment.rubricPorte` sai do tipo derivado e vira entrada de UI. Nenhuma função infere um do outro — está registrado como armadilha 2 no glossário.

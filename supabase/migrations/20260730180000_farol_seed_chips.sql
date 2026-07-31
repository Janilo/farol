-- Seed dos oito chips de exemplo da demo (item 1 da Fase 6).
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

-- Farm · CIDADE MARAVILHOSA INDUSTRIA E COMERCIO DE ROUPAS SA
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '09611669000518',
  $json${"cnpj":"09611669000518","cnpjFormatted":"09.611.669/0005-18","legalName":"CIDADE MARAVILHOSA INDUSTRIA E COMERCIO DE ROUPAS SA","tradeName":null,"cnae":{"code":"4642-7/01","description":"Comércio atacadista de artigos do vestuário e acessórios, exceto profissionais e de segurança"},"secondaryCnaes":[{"code":"4713-0/02","description":"Lojas de variedades, exceto lojas de departamentos ou magazines"},{"code":"4781-4/00","description":"Comércio varejista de artigos do vestuário e acessórios"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":4951299000,"legalNature":"Sociedade Anônima Fechada","isMei":false,"registrationStatus":"ATIVA","foundedAt":"2008-10-30","location":"RIO DE JANEIRO · RJ","partners":[{"name":"ALEXANDRE CAFE BIRMAN","role":"Diretor","isAdmin":true},{"name":"ERIC ALEXANDRE ALENCAR","role":"Diretor","isAdmin":true},{"name":"RAFAEL SACHETE DA SILVA","role":"Diretor","isAdmin":true},{"name":"ROBERTO LUIZ JATAHY GONCALVES","role":"Diretor","isAdmin":true}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://lojafarm.vtexassets.com/arquivos/let.png?v=637949560347830000"}]}$json$::jsonb,
  'farmrio.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Telhanorte · SAINT-GOBAIN DISTRIBUICAO BRASIL LTDA
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '03840986005670',
  $json${"cnpj":"03840986005670","cnpjFormatted":"03.840.986/0056-70","legalName":"SAINT-GOBAIN DISTRIBUICAO BRASIL LTDA","tradeName":null,"cnae":{"code":"4744-0/05","description":"Comércio varejista de materiais de construção não especificados anteriormente"},"secondaryCnaes":[],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":1294909200,"legalNature":"Sociedade Empresária Limitada","isMei":false,"registrationStatus":"ATIVA","foundedAt":"2013-08-16","location":"SAO PAULO · SP","partners":[{"name":"ARMANDO CARLETO FILHO","role":"Administrador","isAdmin":true},{"name":"CRISTINA DO NASCIMENTO CARVALHO","role":"Administrador","isAdmin":true},{"name":"MANUEL DE REZENDE SIMOES CORREA NETO","role":"Administrador","isAdmin":true},{"name":"PARTIDIS S.A.S","role":"Sócio Pessoa Jurídica Domiciliado no Exterior","isAdmin":false},{"name":"SAINT-GOBAIN DO BRASIL PRODUTOS INDUSTRIAIS E PARA CONSTRUCAO LTDA","role":"Sócio","isAdmin":false}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://telhanorte.vtexassets.com/_v/public/assets/v1/bundle/css/asset.min.css?v=3&files=theme,telhanorte.telha-store-theme@5.7.7$style.common,telhanorte.telha-store-theme@5.7.7$style.small,telhanorte.telha-store-theme@5.7.7$style.notsmall,telhanorte.telha-store-theme@5.7.7$style.large,telhanorte.telha-store-theme@5.7.7$style.xlarge&files=fonts,989db2448f309bfdd99b513f37c84b8f5794d2b5&files=npm,animate.css@3.7.0/animate.min.css&files=react~vtex.render-runtime@8.136.2,common&files=react~vtex.store-components@3.178.5,Container,4,SearchBar,3,DiscountBadge&files=react~vtex.styleguide@9.146.16,0,1,Spinner,Tooltip,NumericStepper&files=react~vtex.rich-text@0.16.1,index&files=react~telhanorte.telha-store-app@1.27.6,SliderTelha,Menu&files=react~vtex.flex-layout@0.21.6,0&files=react~vtex.admin-pages@4.59.2,HighlightOverlay&files=react~vtex.minicart@2.68.0,Minicart&files=react~telhanorte.wish-list@2.0.0,AddProductBtn&files=react~vtex.search@2.18.9,Autocomplete&files=react~vtex.product-summary@2.92.0,ProductSummaryLegacy&files=overrides,vtex.product-list@0.37.5$overrides,vtex.minicart@2.68.0$overrides,telhanorte.telha-store-theme@5.7.7$overrides,telhanorte.telha-store-theme@5.7.7$fonts&workspace=master"}]}$json$::jsonb,
  'telhanorte.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Drogaria São Paulo · DROGARIA SAO PAULO S.A.
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '61412110056533',
  $json${"cnpj":"61412110056533","cnpjFormatted":"61.412.110/0565-33","legalName":"DROGARIA SAO PAULO S.A.","tradeName":"DROGARIA SAO PAULO","cnae":{"code":"4771-7/01","description":"Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas"},"secondaryCnaes":[{"code":"5320-2/02","description":"Serviços de entrega rápida"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":720261100,"legalNature":"Sociedade Anônima Fechada","isMei":false,"registrationStatus":"ATIVA","foundedAt":"2013-12-20","location":"SAO PAULO · SP","partners":[{"name":"ANDERSON ANTONIO MOREIRA","role":"Diretor","isAdmin":true},{"name":"LUCAS XAVIER DE MENEZES","role":"Diretor","isAdmin":true},{"name":"LUIS ANTONIO JANSSEN","role":"Diretor","isAdmin":true},{"name":"MARCOS RICARDO COLARES","role":"Presidente","isAdmin":true},{"name":"SERGIO LUIZ DE TOLEDO PIZA","role":"Diretor","isAdmin":true},{"name":"SERGIO SILVESTRE SOARES DE SOUZA","role":"Diretor","isAdmin":true},{"name":"WALTER LUIZ MONTMORENCY BORGHI","role":"Diretor","isAdmin":true}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://io.vtex.com.br/front-libs/jquery/1.8.3/jquery-1.8.3.min.js?v=1.0.0.0"}]}$json$::jsonb,
  'drogariasaopaulo.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Malwee · MALWEE MALHAS LTDA
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '84429737000114',
  $json${"cnpj":"84429737000114","cnpjFormatted":"84.429.737/0001-14","legalName":"MALWEE MALHAS LTDA","tradeName":"MALWEE","cnae":{"code":"1412-6/01","description":"Confecção de peças de vestuário, exceto roupas íntimas e as confeccionadas sob medida"},"secondaryCnaes":[{"code":"1330-8/00","description":"Fabricação de tecidos de malha"},{"code":"1411-8/01","description":"Confecção de roupas íntimas"},{"code":"1412-6/03","description":"Facção de peças do vestuário, exceto roupas íntimas"},{"code":"1414-2/00","description":"Fabricação de acessórios do vestuário, exceto para segurança e proteção"},{"code":"4641-9/01","description":"Comércio atacadista de tecidos"},{"code":"4642-7/01","description":"Comércio atacadista de artigos do vestuário e acessórios, exceto profissionais e de segurança"},{"code":"4755-5/01","description":"Comércio varejista de tecidos"},{"code":"4759-8/99","description":"Comércio varejista de outros artigos de uso pessoal e doméstico não especificados anteriormente"},{"code":"4761-0/03","description":"Comércio varejista de artigos de papelaria"},{"code":"4763-6/01","description":"Comércio varejista de brinquedos e artigos recreativos"},{"code":"4772-5/00","description":"Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal"},{"code":"4781-4/00","description":"Comércio varejista de artigos do vestuário e acessórios"},{"code":"4782-2/01","description":"Comércio varejista de calçados"},{"code":"4782-2/02","description":"Comércio varejista de artigos de viagem"},{"code":"6462-0/00","description":"Holdings de instituições não-financeiras"},{"code":"6499-9/99","description":"Outras atividades de serviços financeiros não especificadas anteriormente"},{"code":"7020-4/00","description":"Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica"},{"code":"7740-3/00","description":"Gestão de ativos intangíveis não-financeiros"},{"code":"8211-3/00","description":"Serviços combinados de escritório e apoio administrativo"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":667085900,"legalNature":"Sociedade Empresária Limitada","isMei":false,"registrationStatus":"ATIVA","foundedAt":"1966-01-28","location":"JARAGUA DO SUL · SC","partners":[{"name":"AMILCAR MARCELO NAGEL","role":"Administrador","isAdmin":true},{"name":"AUGUSTO PASSMANN RIBEIRO DA COSTA","role":"Administrador","isAdmin":true},{"name":"DANIEL HADDAD PERDAO","role":"Administrador","isAdmin":true},{"name":"DOBREVE PARTICIPACOES S.A.","role":"Sócio","isAdmin":false},{"name":"GABRIELA RIZZO CIRNE LIMA","role":"Administrador","isAdmin":true},{"name":"GREGORIO MARTINS ROSA VASCONCELOS REIS","role":"Administrador","isAdmin":true},{"name":"LUCIANO ANDRE BARAMARCHI","role":"Administrador","isAdmin":true},{"name":"MARCELY KAMCHEN GORGES","role":"Administrador","isAdmin":true},{"name":"RAFAEL PIMENTEL FRAZAO IGREJAS LOPES","role":"Administrador","isAdmin":true},{"name":"WF FRANCHISING LTDA.","role":"Sócio","isAdmin":false}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://malwee.vtexassets.com/_v/public/vtex.styles-graphql/v1/style/malwee.mz-builder-theme@11.3.16$style.common.min.css?v=1&workspace=master"}]}$json$::jsonb,
  'malwee.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Duloren · MONI 2001 EMPREENDIMENTOS S/A
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '04591133000130',
  $json${"cnpj":"04591133000130","cnpjFormatted":"04.591.133/0001-30","legalName":"MONI 2001 EMPREENDIMENTOS S/A","tradeName":null,"cnae":{"code":"7020-4/00","description":"Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica"},"secondaryCnaes":[{"code":"6462-0/00","description":"Holdings de instituições não-financeiras"},{"code":"6499-9/02","description":"Sociedades de investimento"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":30000,"legalNature":"Sociedade Anônima Fechada","isMei":false,"registrationStatus":"ATIVA","foundedAt":"2001-07-25","location":"RIO DE JANEIRO · RJ","partners":[{"name":"RONI ARGALJI","role":"Presidente","isAdmin":true}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://io.vtex.com.br/v3/polyfill.min.js?version=3.89.4&features=Object.keys,document.currentScript,CustomEvent&flags=gated,always"}]}$json$::jsonb,
  'duloren.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Hering · CIA. HERING
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '78876950000171',
  $json${"cnpj":"78876950000171","cnpjFormatted":"78.876.950/0001-71","legalName":"CIA. HERING","tradeName":null,"cnae":{"code":"1422-3/00","description":"Fabricação de artigos do vestuário, produzidos em malharias e tricotagens, exceto meias"},"secondaryCnaes":[{"code":"1321-9/00","description":"Tecelagem de fios de algodão"},{"code":"1330-8/00","description":"Fabricação de tecidos de malha"},{"code":"1340-5/01","description":"Estamparia e texturização em fios, tecidos, artefatos têxteis e peças do vestuário"},{"code":"1340-5/99","description":"Outros serviços de acabamento em fios, tecidos, artefatos têxteis e peças do vestuário"},{"code":"1412-6/01","description":"Confecção de peças de vestuário, exceto roupas íntimas e as confeccionadas sob medida"},{"code":"3292-2/02","description":"Fabricação de equipamentos e acessórios para segurança pessoal e profissional"},{"code":"4642-7/01","description":"Comércio atacadista de artigos do vestuário e acessórios, exceto profissionais e de segurança"},{"code":"4642-7/02","description":"Comércio atacadista de roupas e acessórios para uso profissional e de segurança do trabalho"},{"code":"4643-5/01","description":"Comércio atacadista de calçados"},{"code":"4646-0/01","description":"Comércio atacadista de cosméticos e produtos de perfumaria"},{"code":"4647-8/01","description":"Comércio atacadista de artigos de escritório e de papelaria"},{"code":"4649-4/99","description":"Comércio atacadista de outros equipamentos e artigos de uso pessoal e doméstico não especificados anteriormente"},{"code":"4651-6/01","description":"Comércio atacadista de equipamentos de informática"},{"code":"4652-4/00","description":"Comércio atacadista de componentes eletrônicos e equipamentos de telefonia e comunicação"},{"code":"4689-3/99","description":"Comércio atacadista especializado em outros produtos intermediários não especificados anteriormente"},{"code":"4713-0/04","description":"Lojas de departamentos ou magazines, exceto lojas francas (Duty free)"},{"code":"4751-2/01","description":"Comércio varejista especializado de equipamentos e suprimentos de informática"},{"code":"4752-1/00","description":"Comércio varejista especializado de equipamentos de telefonia e comunicação"},{"code":"4761-0/03","description":"Comércio varejista de artigos de papelaria"},{"code":"4763-6/01","description":"Comércio varejista de brinquedos e artigos recreativos"},{"code":"4772-5/00","description":"Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal"},{"code":"4781-4/00","description":"Comércio varejista de artigos do vestuário e acessórios"},{"code":"4782-2/01","description":"Comércio varejista de calçados"},{"code":"4789-0/01","description":"Comércio varejista de suvenires, bijuterias e artesanatos"},{"code":"6202-3/00","description":"Desenvolvimento e licenciamento de programas de computador customizáveis"},{"code":"6203-1/00","description":"Desenvolvimento e licenciamento de programas de computador não-customizáveis"},{"code":"6209-1/00","description":"Suporte técnico, manutenção e outros serviços em tecnologia da informação"},{"code":"6462-0/00","description":"Holdings de instituições não-financeiras"},{"code":"6463-8/00","description":"Outras sociedades de participação, exceto holdings"},{"code":"7490-1/04","description":"Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários"},{"code":"7740-3/00","description":"Gestão de ativos intangíveis não-financeiros"},{"code":"8211-3/00","description":"Serviços combinados de escritório e apoio administrativo"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":1767594000,"legalNature":"Sociedade Anônima Aberta","isMei":false,"registrationStatus":"ATIVA","foundedAt":"1985-08-22","location":"BLUMENAU · SC","partners":[{"name":"ALEXANDRE CAFE BIRMAN","role":"Diretor","isAdmin":true},{"name":"DAVID NERY PYTHON","role":"Diretor","isAdmin":true},{"name":"ERIC ALEXANDRE ALENCAR","role":"Diretor","isAdmin":true}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://io.vtex.com.br/rc/rc.js"}]}$json$::jsonb,
  'hering.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- C&A · C&A MODAS S.A.
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '45242914000105',
  $json${"cnpj":"45242914000105","cnpjFormatted":"45.242.914/0001-05","legalName":"C&A MODAS S.A.","tradeName":"C E A","cnae":{"code":"4781-4/00","description":"Comércio varejista de artigos do vestuário e acessórios"},"secondaryCnaes":[{"code":"4752-1/00","description":"Comércio varejista especializado de equipamentos de telefonia e comunicação"},{"code":"4753-9/00","description":"Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo"},{"code":"4755-5/01","description":"Comércio varejista de tecidos"},{"code":"4755-5/02","description":"Comercio varejista de artigos de armarinho"},{"code":"4755-5/03","description":"Comercio varejista de artigos de cama, mesa e banho"},{"code":"4761-0/01","description":"Comércio varejista de livros"},{"code":"4761-0/03","description":"Comércio varejista de artigos de papelaria"},{"code":"4762-8/00","description":"Comércio varejista de discos, CDs, DVDs e fitas"},{"code":"4763-6/01","description":"Comércio varejista de brinquedos e artigos recreativos"},{"code":"4763-6/02","description":"Comércio varejista de artigos esportivos"},{"code":"4772-5/00","description":"Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal"},{"code":"4774-1/00","description":"Comércio varejista de artigos de óptica"},{"code":"4782-2/01","description":"Comércio varejista de calçados"},{"code":"4782-2/02","description":"Comércio varejista de artigos de viagem"},{"code":"4783-1/01","description":"Comércio varejista de artigos de joalheria"},{"code":"4783-1/02","description":"Comércio varejista de artigos de relojoaria"},{"code":"4789-0/01","description":"Comércio varejista de suvenires, bijuterias e artesanatos"},{"code":"4789-0/08","description":"Comércio varejista de artigos fotográficos e para filmagem"},{"code":"5211-7/99","description":"Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis"},{"code":"5212-5/00","description":"Carga e descarga"},{"code":"5250-8/04","description":"Organização logística do transporte de carga"},{"code":"6463-8/00","description":"Outras sociedades de participação, exceto holdings"},{"code":"7490-1/04","description":"Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":1849418600,"legalNature":"Sociedade Anônima Aberta","isMei":false,"registrationStatus":"ATIVA","foundedAt":"1981-01-12","location":"BARUERI · SP","partners":[{"name":"FERNANDO GARCIA BROSSI","role":"Diretor","isAdmin":true},{"name":"JOAO REYNALDO SANCHEZ RAMOS DE SOUZA","role":"Administrador","isAdmin":true},{"name":"LAURENCE BELTRAO GOMES","role":"Diretor","isAdmin":true},{"name":"MARIA CAROLINA BRASIL BORGHESI","role":"Diretor","isAdmin":true},{"name":"PAULO CORREA JUNIOR","role":"Presidente","isAdmin":true}]}$json$::jsonb,
  $json${"status":"ok","technologies":[{"tool":"VTEX","category":"E-commerce","via":"script","evidence":"https://cea.vtexassets.com/_v/public/assets/v1/bundle/css/asset.min.css?v=3&files=theme,cea.cea-store-theme@2.83.0$style.common,cea.cea-store-theme@2.83.0$style.small,cea.cea-store-theme@2.83.0$style.notsmall,cea.cea-store-theme@2.83.0$style.large,cea.cea-store-theme@2.83.0$style.xlarge&files=fonts,989db2448f309bfdd99b513f37c84b8f5794d2b5&files=npm,animate.css@3.7.0/animate.min.css&files=react~vtex.render-runtime@8.136.2,common&files=react~vtex.store-components@3.178.5,Container&files=react~vtex.styleguide@9.146.16,0,Spinner&files=react~cea.cea-wishlist@0.11.0,0,2,MyWishlistAccount&files=react~cea.store-ds@0.47.0,Footer,16,PersonalShopper,SocialMedia,FooterMenu,FooterMenuMobile,Glossary,FooterNotes,FlexBanner,3,8,9,MainBanner,SEOTextModuleHome,BackToTopButton,Breadcrumb,SEOTextModule,InformationBar,InspirationalBanner,BracketsBanner,CeaTooltip,DSCeaNewsLetter,ProgressiveBubbles,19,LabelStamps,17,DesktopMenu,MobileMenu,WishlistHeader,12,DesktopSearch,MobileSearch,SearchbarForm,SearchbarResults,SearchbarSuggestion,Login&files=react~vtex.flex-layout@0.21.6,0&files=react~cea.minha-cea-novo-modelo@0.3.1,0,2,TabbarConsultora&files=react~vtex.admin-pages@4.59.2,HighlightOverlay&files=react~cea.cea-store-theme@2.83.0,SkipToContent,HeaderWrapper,CeaSliderLayout,MinicartTitle,IconCart,HeadingTagH1,8,RedirectButton,CeaEvcMenuServices&files=react~cea.store-modules@0.25.0,0&files=react~cea.store-components@0.22.0,Topbar&files=react~vtex.minicart@2.68.0,Minicart&files=react~cea.header-components@0.12.1,SearchBar&files=react~vtex.rich-text@0.16.1,index&files=react~cea.mdm-login@0.4.0,LogoutButton&files=overrides,cea.app-first-booster@0.0.7$overrides,vtex.product-list@0.37.5$overrides,vtex.minicart@2.68.0$overrides,cea.cea-store-theme@2.83.0$overrides,cea.cea-store-theme@2.83.0$fonts&workspace=master"}]}$json$::jsonb,
  'cea.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

-- Ambev · AMBEV S.A.
insert into public.fichas (cnpj, enrichment, technographics, domain, fetched_at) values (
  '07526557000100',
  $json${"cnpj":"07526557000100","cnpjFormatted":"07.526.557/0001-00","legalName":"AMBEV S.A.","tradeName":null,"cnae":{"code":"1113-5/02","description":"Fabricação de cervejas e chopes"},"secondaryCnaes":[{"code":"0111-3/99","description":"Cultivo de outros cereais não especificados anteriormente"},{"code":"0141-5/01","description":"Produção de sementes certificadas, exceto de forrageiras para pasto"},{"code":"0141-5/02","description":"Produção de sementes certificadas de forrageiras para formação de pasto"},{"code":"1064-3/00","description":"Fabricação de farinha de milho e derivados, exceto óleos de milho"},{"code":"1099-6/04","description":"Fabricação de gelo comum"},{"code":"1099-6/99","description":"Fabricação de outros produtos alimentícios não especificados anteriormente"},{"code":"1122-4/01","description":"Fabricação de refrigerantes"},{"code":"1731-1/00","description":"Fabricação de embalagens de papel"},{"code":"1813-0/01","description":"Impressão de material para uso publicitário"},{"code":"1813-0/99","description":"Impressão de material para outros usos"},{"code":"2014-2/00","description":"Fabricação de gases industriais"},{"code":"2222-6/00","description":"Fabricação de embalagens de material plástico"},{"code":"2312-5/00","description":"Fabricação de embalagens de vidro"},{"code":"2591-8/00","description":"Fabricação de embalagens metálicas"},{"code":"4623-1/99","description":"Comércio atacadista de matérias-primas agrícolas não especificadas anteriormente"},{"code":"4635-4/02","description":"Comércio atacadista de cerveja, chope e refrigerante"},{"code":"4637-1/99","description":"Comércio atacadista especializado em outros produtos alimentícios não especificados anteriormente"},{"code":"4646-0/01","description":"Comércio atacadista de cosméticos e produtos de perfumaria"},{"code":"4646-0/02","description":"Comércio atacadista de produtos de higiene pessoal"},{"code":"4649-4/08","description":"Comércio atacadista de produtos de higiene, limpeza e conservação domiciliar"},{"code":"4686-9/02","description":"Comércio atacadista de embalagens"},{"code":"4692-3/00","description":"Comércio atacadista de mercadorias em geral, com predominância de insumos agropecuários"},{"code":"6203-1/00","description":"Desenvolvimento e licenciamento de programas de computador não-customizáveis"},{"code":"6319-4/00","description":"Portais, provedores de conteúdo e outros serviços de informação na internet"},{"code":"7020-4/00","description":"Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica"},{"code":"7311-4/00","description":"Agências de publicidade"},{"code":"7312-2/00","description":"Agenciamento de espaços para publicidade, exceto em veículos de comunicação"},{"code":"7490-1/04","description":"Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários"},{"code":"7740-3/00","description":"Gestão de ativos intangíveis não-financeiros"}],"porte":"Demais","porteNote":"nem micro, nem pequeno porte","shareCapital":58308215000,"legalNature":"Sociedade Anônima Aberta","isMei":false,"registrationStatus":"ATIVA","foundedAt":"2005-07-19","location":"SAO PAULO · SP","partners":[{"name":"CARLA SMITH DE VASCONCELLOS CRIPPA PRADO","role":"Diretor","isAdmin":true},{"name":"CARLOS EDUARDO KLUTZENSCHELL LISBOA","role":"Diretor","isAdmin":true},{"name":"GUILHERME FLEURY DE FIGUEIREDO FERRAZ PAROLARI","role":"Diretor","isAdmin":true},{"name":"GUILHERME MALIK PARENTE","role":"Diretor","isAdmin":true},{"name":"JOAO COELHO RUA DERBLI DE CARVALHO","role":"Diretor","isAdmin":true},{"name":"PAULO ANDRE ZAGMAN","role":"Diretor","isAdmin":true},{"name":"VALDECIR DUARTE","role":"Diretor","isAdmin":true}]}$json$::jsonb,
  $json${"status":"empty"}$json$::jsonb,
  'ambev.com.br',
  now()
) on conflict (cnpj) do update set
  enrichment     = excluded.enrichment,
  technographics = excluded.technographics,
  domain         = excluded.domain,
  fetched_at     = excluded.fetched_at;

# Proposta de conteúdo editorial inicial — AgroTab

> **Status: proposta (não publicado).** Este documento é um plano para resolver o
> _cold-start_ do feed (ninguém volta a um feed vazio). Nenhum conteúdo foi publicado,
> nenhum usuário fictício foi criado e nenhum dado de produção foi alterado.
> Antes de publicar, o mantenedor (ou convidados reais) deve revisar, validar as fontes
> e decidir a autoria. Última atualização: 2026-10-17.

## Objetivo

Preparar ~8–12 publicações-semente, de autoria real (mantenedor/convidados), para que os
primeiros usuários encontrem conteúdo útil já no primeiro acesso. O feed (T6) deve permitir
testar o produto com **poucos usuários reais** — não depende de volume.

## Princípios editoriais

- **Utilidade prática primeiro:** cada post responde a uma dúvida real de quem vive o campo.
- **Fonte verificável:** toda afirmação técnica referencia uma instituição reconhecida
  (ver lista abaixo). O link exato do artigo deve ser conferido no momento da publicação.
- **Sem promessa falsa:** não publicar conteúdo sobre funcionalidades que o AgroTab ainda
  não tem (ex.: cotações).
- **Tom de comunidade:** convida à discussão (termina com uma pergunta aberta).
- **Direitos autorais:** resumir e **citar** a fonte; não copiar textos protegidos.

## Fontes institucionais verificáveis (domínios oficiais)

> Instituições de referência do agro brasileiro. Os domínios são verificáveis; o artigo
> específico de cada post deve ser localizado e conferido antes de publicar.

- **Embrapa** — pesquisa agropecuária (embrapa.br).
- **CONAB** — safras, estoques e abastecimento (conab.gov.br).
- **MAPA** — Ministério da Agricultura e Pecuária (gov.br/agricultura).
- **CEPEA/ESALQ-USP** — indicadores e economia agrícola (cepea.esalq.usp.br).
- **IBGE** — censo agropecuário e produção (ibge.gov.br).
- **INMET** — meteorologia, relevante a plantio/colheita (inmet.gov.br).
- **IAC / institutos estaduais de pesquisa** — recomendações regionais.

## Temas propostos (pauta inicial)

Cada item vira uma publicação (título + resumo prático + fonte + pergunta de discussão).

1. **Manejo integrado de pragas (MIP): o básico que reduz custo** — princípios de MIP e
   monitoramento. _Fonte: Embrapa._
2. **Plantio direto e cobertura do solo** — benefícios de matéria orgânica e retenção de
   água. _Fonte: Embrapa._
3. **Janela de plantio e o papel da previsão climática** — como usar dados meteorológicos
   para decidir o plantio. _Fonte: INMET / Embrapa._
4. **Calagem e análise de solo: por onde começar** — interpretar uma análise de solo.
   _Fonte: Embrapa / IAC._
5. **Boas práticas no uso de defensivos (segurança + receituário)** — EPI, carência,
   descarte de embalagens. _Fonte: MAPA / Embrapa._
6. **Panorama da safra atual (como ler os dados da CONAB)** — entender estimativas de
   produção sem "achismo". _Fonte: CONAB._ (Dados, não cotação de preço.)
7. **Irrigação eficiente: quando e quanto** — manejo de irrigação e economia de água.
   _Fonte: Embrapa._
8. **Agtech no campo: sensores e agricultura de precisão sem complicar** — introdução
   acessível a dados e automação. _Fonte: Embrapa / institutos._
9. **Rotação de culturas e saúde do solo** — montar uma rotação simples. _Fonte: Embrapa._
10. **Pastagem: recuperação e lotação** — evitar degradação e aumentar produtividade.
    _Fonte: Embrapa Pecuária._
11. **Crédito rural e seguro agrícola: o essencial** — tipos de crédito e por que o seguro
    importa. _Fonte: MAPA / instituições financeiras oficiais._
12. **Sucessão familiar no campo** — tema humano/organizacional que gera discussão real.

## Modelo de post-semente (template)

```
Título: <objetivo e específico>
Resumo: 2–4 parágrafos práticos, em linguagem acessível.
Fonte: <instituição + link conferido>
Pergunta para a comunidade: <uma pergunta aberta que convide respostas>
```

## Decisões que dependem do mantenedor

1. **Autoria:** os posts serão publicados por você e/ou por convidados reais do setor?
   (Requisito: **não** criar usuários fictícios.)
2. **Quantidade inicial:** começar com quantos? (Sugestão: 8–10 para o lançamento.)
3. **Categorias/tags:** adotar tags por tema (solo, pragas, clima, gestão, agtech, pecuária)
   já no lançamento, ou deixar para depois? (Impacta o modelo de dados do T6.)
4. **Validação barata (antes de escalar pauta):** incluir uma pergunta no e-mail de
   ativação ("que tema você mais quer ver?") para priorizar a pauta com dado real.

## Relação com o T6 (conteúdo e feed)

O T6 deve entregar o mínimo para publicar e listar esses posts e permitir comentários
(discussão). O schema de conteúdo precisa suportar, no mínimo: título, corpo, autor
(usuário real), data de publicação e status (rascunho/publicado). Tags são opcionais no
lançamento (ver decisão 3). A proposta de schema será detalhada na análise do T6.

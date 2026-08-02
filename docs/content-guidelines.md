# Diretrizes de conteúdo

## Regra principal

Nunca inferir, completar ou aproximar valores mecânicos da Honda NX200. Se uma informação não
estiver confirmada em documentação confiável e aplicável, publique `A confirmar`.

## Fonte, citação e claim

Uma fonte registra metadados do documento: tipo, título, editor ou fabricante, edição, ano,
idioma, mercado e disponibilidade. Ela não contém o arquivo integral nem autoriza sua
redistribuição.

Uma citação precisa apontar para uma fonte cadastrada e para uma localização verificável:
página positiva, página rotulada, seção, tabela ou figura. “Manual da moto” não é citação
suficiente. Notas de trecho devem resumir o contexto, sem reproduzir extensamente conteúdo
protegido.

Uma claim representa uma única afirmação técnica e possui ID estável, tópico, valor estruturado,
aplicabilidade, citações, revisões e estado editorial. Valores podem ser escalares, faixas,
listas ou texto. Nunca transforme `A confirmar` em número, intervalo ou unidade por inferência.

Fontes preferidas, em ordem:

1. manual de serviço oficial aplicável;
2. manual do proprietário oficial aplicável;
3. boletim técnico oficial;
4. catálogo técnico do fabricante do componente, quando pertinente.

Fóruns, vídeos, lojas e conteúdo sem autoria técnica podem inspirar tópicos, mas não confirmam
valores.

## Estados editoriais

- `demonstrative`: ilustra a interface; nunca é operacional;
- `transcribed`: veio de fonte identificada, mas ainda não foi revisado;
- `under-review`: interpretação, aplicabilidade ou segurança em análise;
- `confirmed`: possui citação localizada, aplicabilidade confirmada e revisão aprovada vigente;
- `conflicting`: fontes ou interpretações divergem e bloqueiam uso operacional;
- `deprecated`: foi substituído ou invalidado;
- `not-applicable`: não corresponde à configuração selecionada.

Não use “oficial”, “seguro” ou “garantido” como badge. Uma transcrição não é confirmação. Uma
mudança em valor, unidade, condição ou aplicabilidade exige nova revisão; a aprovação antiga não
é reutilizada silenciosamente.

## Aplicabilidade e conflito

Registre fabricante e modelo, confirmação do escopo e, quando conhecidos, ano inicial/final,
mercado, variante e código do motor. Campo ausente significa desconhecido ou escopo ainda não
delimitado conforme o estado; não significa compatibilidade automática.

Não reutilize valores de XR200, CBX200, NX150 ou qualquer outro modelo sem claim específica,
fonte localizada e revisão. Claims confirmadas do mesmo tópico com valores diferentes e escopo
sobreposto formam conflito. O conteúdo permanece visível para análise, mas não pode habilitar
alerta, recomendação ou conclusão operacional.

## Revisão

Revisões são dados editoriais versionados no repositório, não ações do usuário local. Cada uma
registra ID, data, revisor, decisão e notas. A decisão vigente deve ser `approved` para confirmar
uma claim. `changes-requested` e `rejected` impedem confirmação. Consulte
`technical-review-policy.md`.

## Estrutura de procedimentos

Todo procedimento deve conter:

1. título, categoria, dificuldade e risco;
2. descrição e tempo estimado editorial;
3. ferramentas e materiais;
4. alertas de segurança;
5. etapas curtas, em ordem;
6. imagens opcionais com direitos de uso;
7. referências a claims técnicas;
8. erros comuns e verificações finais;
9. aplicabilidade e revisão editorial.

Etapas, alertas, verificações, ferramentas e materiais possuem IDs estáveis usados pelo estado
persistido. Alterar texto ou tradução não deve alterar o ID. Remover ou trocar um ID exige
migração capaz de preservar execuções existentes.

Use verbos de ação e uma tarefa por etapa. Explique quando parar e procurar um profissional.
Dificuldade descreve complexidade; `riskLevel` descreve a consequência potencial de erro.
Conteúdo de risco alto ou crítico com claims pendentes exige advertência reforçada. Conflito
técnico bloqueia uso operacional.

A conclusão registra apenas que o usuário percorreu o checklist. Ela não cria serviço, não
confirma a execução mecânica e não substitui avaliação profissional. Para sistemas críticos, use
linguagem de inspeção e nunca “moto segura”, “freio aprovado” ou equivalentes.

## Linguagem, imagens e marcas

- escreva em português do Brasil, com frases diretas;
- diferencie inspeção, ajuste, substituição e confirmação;
- não transforme observação visual em diagnóstico definitivo;
- mostre unidades junto dos valores e preserve o sistema da fonte;
- não use logotipos Honda, páginas escaneadas ou imagens sem licença;
- imagens próprias devem mostrar equipamento de proteção e riscos relevantes.

## Publicação

Siga `technical-source-ingestion.md` para incorporar uma fonte. Antes de publicar, execute
`npm run validate:content`, testes, lint e build. O validador não substitui revisão humana.
Alterações editoriais relevantes incrementam a versão do procedimento.

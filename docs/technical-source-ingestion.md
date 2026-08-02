# Incorporação de fontes técnicas

Este fluxo transforma um documento obtido legalmente em pequenas afirmações rastreáveis. O
Garage não recebe upload de PDF pelo usuário e não redistribui manuais.

## 1. Identificar o documento

Registre título, editor ou fabricante, código, edição, nome do arquivo, URL oficial, data de
acesso, idioma, mercado e tipo. Confirme que o documento é realmente aplicável à Honda NX200 em
análise; sem identificação suficiente, use `availability: partial` ou `unavailable` e não
transcreva valores como confirmados.

## 2. Verificar direitos e uso

Determine se o documento pode ser consultado e se pequenos dados factuais podem ser
transcritos. Não inclua o arquivo, páginas escaneadas, links não autorizados ou trechos extensos
no repositório. Registre apenas metadados e o contexto mínimo necessário.

## 3. Cadastrar a fonte

Adicione um `TechnicalDocumentSource` com ID estável em `src/app/data/nx200/sources`. IDs não
dependem do título traduzido. Atualize disponibilidade e notas sem substituir silenciosamente o
registro de outra edição.

## 4. Localizar a evidência

Encontre a página e a seção. Tabela ou figura podem complementar a localização, mas não substituem
esses dois campos para conteúdo derivado de fonte. Uma referência genérica ao manual não é
suficiente. Registre `TechnicalCitation` e uma nota curta apenas quando ela ajudar a explicar a
condição do valor.

## 5. Transcrever somente o necessário

Crie ou atualize uma `TechnicalClaim`. Preserve valor e unidade como publicados. Não converta,
complete intervalos ou combine tabelas sem registrar a interpretação. Use `transcribed` após a
transcrição inicial.

## 6. Definir aplicabilidade

Registre Honda NX200 e, quando documentados, intervalo de anos, mercado, variante e código do
motor. Uma confirmação do proprietário sobre a aplicabilidade do documento deve ser registrada em
`TechnicalSourceApplicabilityDecision`; ela não é uma `TechnicalReview`. Compatibilidade com
XR200, CBX200, NX150 ou outro modelo exige claim própria e evidência; sem isso, mantenha
`needs-confirmation`.

Para o manual `D2203-MAN-0181`, a aplicabilidade à NX200 brasileira de 1997 foi confirmada pelo
proprietário. O ano `1994` no nome do arquivo não é conflito automático.

## 7. Revisar

Um revisor identificável compara a claim com a localização citada, unidades, contexto,
aplicabilidade e riscos. Registre a decisão em código conforme
`technical-review-policy.md`. O usuário local não pode aprovar conteúdo.

Não extrapole o manual do proprietário para desmontagens ou reparos ausentes. Torques,
tolerâncias internas, diagramas completos e desmontagem avançada continuam dependendo do manual
de serviço, mesmo quando o manual do proprietário fornece orientação básica relacionada.

## 8. Resolver conflitos

Execute `npm run validate:content`. Se houver valor diferente com aplicabilidade sobreposta,
registre o estado `conflicting`, identifique as fontes e investigue edição, variante e
supersessão. O validador não escolhe uma fonte vencedora.

## 9. Publicar

Uma claim só pode virar `confirmed` com citação localizada, aplicabilidade confirmada, revisão
vigente aprovada e nenhum conflito aberto. Atualize a versão editorial dos procedimentos
afetados e execute formatação, lint, testes, validação de conteúdo e builds.

## Checklist de entrada

- documento e licença verificados;
- metadados e ID estável registrados;
- página e seção localizadas;
- transcrição curta e fiel;
- valor e unidade preservados;
- decisão de aplicabilidade registrada separadamente da revisão;
- revisão registrada;
- conflitos resolvidos;
- testes e versão editorial atualizados.

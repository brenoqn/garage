# Aplicabilidade e variantes da Honda NX200

## Estado atual

O Garage suporta somente o produto Honda NX200, mas ainda não possui uma configuração técnica
confirmada de ano, mercado, variante ou código do motor. O ano `1997` presente no seed é dado
demonstrativo editável e não prova a identidade da motocicleta real.

Nenhuma variante está tecnicamente confirmada. Todas as claims usam aplicabilidade
`needs-confirmation`; portanto, o filtro “somente confirmadas para a moto cadastrada” retorna
vazio até que a documentação e a configuração alvo sejam verificadas.

## Dimensões modeladas

O catálogo pode delimitar:

- ano específico ou intervalo de anos;
- mercado, incluindo Brasil quando comprovado;
- variante comercial;
- código do motor;
- observações de aplicabilidade.

Campo ausente não autoriza assumir compatibilidade. Conteúdo de outro modelo, incluindo XR200,
CBX200 ou NX150, não se aplica automaticamente à NX200, mesmo quando componentes pareçam
semelhantes.

## Dados necessários da motocicleta alvo

- ano de fabricação e ano-modelo;
- país ou mercado de comercialização;
- denominação da variante;
- código do motor, quando disponível;
- identificação compatível com catálogo de peças;
- manual do proprietário correspondente;
- manual de serviço aplicável.

## Critério para adicionar uma variante

Uma variante só entra como escopo confirmado depois que a identificação da moto e ao menos uma
fonte aplicável forem auditadas. Claims compartilhadas entre variantes precisam declarar o
escopo e manter citações. Diferenças devem gerar claims separadas, não condicionais implícitas.

Até essa etapa, o Garage deve exibir “A confirmar”, não gerar alertas técnicos e não publicar
procedimento como integralmente validado.

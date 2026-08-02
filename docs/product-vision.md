# Visão do produto

## Proposta

Garage é um aplicativo pessoal para proprietários de motocicletas que desejam realizar e
acompanhar manutenções básicas em casa. Ele orienta serviços simples e seguros, lembra prazos e
registra quilometragem, abastecimentos, consumo, custos e histórico sem transformar a experiência
em painel corporativo ou enciclopédia mecânica.

## Público inicial

Proprietários hobbistas de Honda NX200 que desejam organizar os cuidados da motocicleta e aprender
com instruções diretas e ferramentas acessíveis. O Garage não substitui um mecânico qualificado,
diagnóstico profissional nem documentação técnica oficial.

## Recorte do MVP atual

- uma única motocicleta ativa;
- somente Honda NX200;
- configuração inicial antes de ativar alertas;
- dados armazenados no dispositivo, com migração e backup;
- histórico de serviços e leituras do odômetro;
- abastecimentos, consumo calculado entre tanques completos e custos básicos;
- ocorrências e checklist de inspeção antes do uso;
- histórico unificado dos registros cotidianos;
- plano preventivo com intervalos não confirmados inativos;
- seis procedimentos básicos transcritos, com preparação e execução interativa;
- progresso local, retomada, modo oficina e histórico de atividades;
- registro opcional de manutenção depois da conclusão;
- alertas dentro do aplicativo;
- tema escuro padrão, alternativas claro/sistema e instalação como PWA;
- transparência editorial de fontes, aplicabilidade, revisão e conflitos;
- especificações e procedimentos versionados sem publicar valores não verificados.

Não fazem parte desta etapa: outras motos, backend, autenticação, sincronização, colaboração,
notificações push, compra de peças, diagnósticos automatizados ou conteúdo mecânico sem revisão.

## Princípios de experiência

- **Próxima ação evidente:** uma prioridade confirmada deve ser compreendida em segundos.
- **Dados honestos:** demonstrações são identificadas e não viram alertas antes da configuração.
- **Aprendizado seguro:** cada procedimento começa por riscos e termina por verificações.
- **Honestidade técnica:** um valor desconhecido é mostrado como `A confirmar`, nunca estimado.
- **Controle do usuário:** importações e reduções do odômetro exigem confirmação explícita.
- **Histórico imutável:** correções atuais não reescrevem serviços ou leituras antigas.
- **Uso na oficina:** controles grandes, contraste e leitura rápida em telas pequenas.
- **Parada explícita:** diante de anormalidade, dúvida ou limite do conteúdo, orientar o usuário a
  interromper o procedimento e procurar um profissional.
- **Progresso sob controle:** pausar preserva a execução; cancelar ou reiniciar exige confirmação.
- **Separação de intenções:** concluir um guia não registra manutenção nem atesta segurança.
- **Evidência antes da autoridade:** aparência, transcrição ou conhecimento geral não tornam um
  valor confirmado; a interface deve revelar documento, localização, aplicabilidade e revisão.
- **Conflito visível:** fontes divergentes bloqueiam uso operacional e permanecem disponíveis
  para resolução editorial, sem decisão automática.

## Métricas futuras

Quando houver telemetria consentida, avaliar: conclusão da configuração, atualizações de
quilometragem, procedimentos iniciados e concluídos, serviços registrados, backups concluídos e
instalações da PWA. Não há coleta de telemetria neste MVP.

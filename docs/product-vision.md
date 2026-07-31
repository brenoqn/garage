# Visão do produto

## Proposta

Garage ajuda proprietários de motocicletas a compreender, planejar e registrar manutenção sem
transformar a experiência em um painel corporativo ou em um manual técnico opaco. A interface
deve conduzir a próxima ação: confirmar os dados da moto, aprender um procedimento ou registrar
o que foi feito.

## Público inicial

Proprietários de Honda NX200 que desejam organizar os cuidados da motocicleta e aprender com
orientações progressivas. O Garage não substitui um mecânico qualificado nem documentação
técnica oficial.

## Recorte do MVP atual

- uma única motocicleta ativa;
- somente Honda NX200;
- configuração inicial antes de ativar alertas;
- dados armazenados no dispositivo, com migração e backup;
- histórico de serviços e leituras do odômetro;
- plano preventivo com intervalos não confirmados inativos;
- seis procedimentos demonstrativos;
- alertas dentro do aplicativo;
- modo claro e instalação como PWA.

Não fazem parte desta etapa: outras motos, backend, autenticação, sincronização, colaboração,
notificações push, checklists de execução, compra de peças ou diagnósticos automatizados.

## Princípios de experiência

- **Próxima ação evidente:** uma prioridade confirmada deve ser compreendida em segundos.
- **Dados honestos:** demonstrações são identificadas e não viram alertas antes da configuração.
- **Aprendizado seguro:** cada procedimento começa por riscos e termina por verificações.
- **Honestidade técnica:** um valor desconhecido é mostrado como `A confirmar`, nunca estimado.
- **Controle do usuário:** importações e reduções do odômetro exigem confirmação explícita.
- **Histórico imutável:** correções atuais não reescrevem serviços ou leituras antigas.
- **Uso na oficina:** controles grandes, contraste e leitura rápida em telas pequenas.

## Métricas futuras

Quando houver telemetria consentida, avaliar: conclusão da configuração, atualizações de
quilometragem, serviços registrados, backups concluídos e instalações da PWA. Não há coleta de
telemetria neste MVP.

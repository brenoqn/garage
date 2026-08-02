import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/shell/app-shell').then((component) => component.AppShell),
    children: [
      {
        path: 'dashboard',
        title: 'Visão geral | Garage',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then(
            (component) => component.DashboardPage,
          ),
      },
      {
        path: 'motorcycle',
        title: 'Minha motocicleta | Garage',
        loadComponent: () =>
          import('./features/motorcycle/motorcycle-page').then(
            (component) => component.MotorcyclePage,
          ),
      },
      {
        path: 'maintenance',
        title: 'Plano de manutenção | Garage',
        loadComponent: () =>
          import('./features/maintenance/maintenance-page').then(
            (component) => component.MaintenancePage,
          ),
      },
      {
        path: 'maintenance/history',
        title: 'Histórico de serviços | Garage',
        loadComponent: () =>
          import('./features/maintenance/history-page').then((component) => component.HistoryPage),
      },
      {
        path: 'maintenance/upcoming',
        title: 'Próximas manutenções | Garage',
        loadComponent: () =>
          import('./features/maintenance/upcoming-maintenance-page').then(
            (component) => component.UpcomingMaintenancePage,
          ),
      },
      {
        path: 'maintenance/new',
        title: 'Registrar manutenção | Garage',
        loadComponent: () =>
          import('./features/maintenance/new-service-page').then(
            (component) => component.NewServicePage,
          ),
      },
      {
        path: 'procedures',
        title: 'Procedimentos | Garage',
        loadComponent: () =>
          import('./features/procedures/procedures-page').then(
            (component) => component.ProceduresPage,
          ),
      },
      {
        path: 'fuel',
        title: 'Abastecimentos | Garage',
        loadComponent: () =>
          import('./features/fuel/fuel-page').then((component) => component.FuelPage),
      },
      {
        path: 'fuel/new',
        title: 'Registrar abastecimento | Garage',
        loadComponent: () =>
          import('./features/fuel/new-fuel-page').then((component) => component.NewFuelPage),
      },
      {
        path: 'expenses',
        title: 'Gastos da motocicleta | Garage',
        loadComponent: () =>
          import('./features/expenses/expenses-page').then((component) => component.ExpensesPage),
      },
      {
        path: 'occurrences/new',
        title: 'Registrar ocorrência | Garage',
        loadComponent: () =>
          import('./features/occurrences/new-occurrence-page').then(
            (component) => component.NewOccurrencePage,
          ),
      },
      {
        path: 'safety-check',
        title: 'Checklist de segurança | Garage',
        loadComponent: () =>
          import('./features/safety/safety-check-page').then(
            (component) => component.SafetyCheckPage,
          ),
      },
      {
        path: 'history',
        title: 'Histórico | Garage',
        loadComponent: () =>
          import('./features/history/activity-history-page').then(
            (component) => component.ActivityHistoryPage,
          ),
      },
      {
        path: 'procedures/:slug/prepare',
        title: 'Preparar procedimento | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-prepare-page').then(
            (component) => component.ProcedurePreparePage,
          ),
      },
      {
        path: 'procedures/:slug/run/:executionId',
        title: 'Executar procedimento | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-run-page').then(
            (component) => component.ProcedureRunPage,
          ),
      },
      {
        path: 'procedures/:slug',
        title: 'Procedimento | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-detail-page').then(
            (component) => component.ProcedureDetailPage,
          ),
      },
      {
        path: 'procedure-executions',
        title: 'Atividades de procedimentos | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-executions-page').then(
            (component) => component.ProcedureExecutionsPage,
          ),
      },
      {
        path: 'procedure-executions/:executionId',
        title: 'Detalhes da atividade | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-execution-detail-page').then(
            (component) => component.ProcedureExecutionDetailPage,
          ),
      },
      {
        path: 'specifications',
        title: 'Especificações | Garage',
        loadComponent: () =>
          import('./features/specifications/specifications-page').then(
            (component) => component.SpecificationsPage,
          ),
      },
      {
        path: 'technical-sources',
        title: 'Fontes técnicas | Garage',
        loadComponent: () =>
          import('./features/technical-sources/technical-sources-page').then(
            (component) => component.TechnicalSourcesPage,
          ),
      },
      {
        path: 'settings',
        title: 'Ajustes | Garage',
        loadComponent: () =>
          import('./features/settings/settings-page').then((component) => component.SettingsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];

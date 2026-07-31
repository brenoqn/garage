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
        path: 'procedures/:slug',
        title: 'Procedimento | Garage',
        loadComponent: () =>
          import('./features/procedures/procedure-detail-page').then(
            (component) => component.ProcedureDetailPage,
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

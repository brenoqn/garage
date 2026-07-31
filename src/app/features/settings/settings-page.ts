import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-settings-page',
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Preferências</p>
          <h1>Ajustes</h1>
          <p>Controle alertas e os dados guardados pelo Garage.</p>
        </div>
      </header>

      <section class="card settings-section">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">!</span>
          <div>
            <h2>Alertas internos</h2>
            <p>Exiba no dashboard as manutenções próximas e vencidas.</p>
          </div>
          <label class="switch">
            <span class="sr-only">Ativar alertas internos</span>
            <input
              type="checkbox"
              [checked]="store.settings().maintenanceAlertsEnabled"
              (change)="toggleAlerts($event)"
            />
            <span aria-hidden="true"></span>
          </label>
        </div>
        <p class="settings-footnote">
          Notificações push não fazem parte desta versão. A interface de serviço está preparada para
          uma implementação futura.
        </p>
      </section>

      <section class="card settings-section">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">▣</span>
          <div>
            <h2>Dados neste dispositivo</h2>
            <p>Motocicleta, plano e histórico ficam no armazenamento local do navegador.</p>
          </div>
        </div>
        <div class="settings-actions">
          <button class="button button-secondary" type="button" (click)="exportData()">
            Exportar cópia JSON
          </button>
          <button class="text-button danger" type="button" (click)="showReset.set(true)">
            Restaurar demonstração
          </button>
        </div>

        @if (exported()) {
          <p class="success-message" role="status">Cópia exportada com sucesso.</p>
        }

        @if (showReset()) {
          <div class="confirm-box" role="alert">
            <strong>Substituir seus dados?</strong>
            <p>O plano e o histórico atuais serão trocados pelos dados demonstrativos.</p>
            <div>
              <button class="button button-secondary" type="button" (click)="showReset.set(false)">
                Cancelar
              </button>
              <button class="button button-danger" type="button" (click)="reset()">
                Restaurar
              </button>
            </div>
          </div>
        }
      </section>

      <section class="card about-card">
        <span class="brand-mark large" aria-hidden="true">G</span>
        <div>
          <h2>Garage</h2>
          <p>Base funcional do MVP · Honda NX200</p>
          <small>Aplicativo web progressivo · modo claro</small>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly store = inject(GarageStore);
  protected readonly showReset = signal(false);
  protected readonly exported = signal(false);

  protected toggleAlerts(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateSettings(input.checked);
  }

  protected exportData(): void {
    const blob = new Blob([this.store.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `garage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.exported.set(true);
  }

  protected reset(): void {
    this.store.resetDemoData();
    this.showReset.set(false);
  }
}

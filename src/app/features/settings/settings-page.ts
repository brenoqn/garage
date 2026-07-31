import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { parseGarageBackup } from '../../core/domain/backup';
import { GarageBackup, GarageBackupSummary } from '../../core/models/backup.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-settings-page',
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Preferências</p>
          <h1>Ajustes</h1>
          <p>Controle alertas, backups e os dados guardados pelo Garage.</p>
        </div>
      </header>

      @if (store.recovery(); as recovery) {
        <section class="recovery-banner" role="alert">
          <div>
            <strong>Os dados locais precisam de atenção</strong>
            <p>{{ recovery.message }}</p>
            <p>
              O valor original não foi substituído. Exporte-o antes de importar um backup ou
              restaurar a demonstração.
            </p>
          </div>
          <button class="button button-secondary" type="button" (click)="exportRecoveryData()">
            Exportar conteúdo original
          </button>
        </section>
      }

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
              [disabled]="!!store.recovery()"
              (change)="toggleAlerts($event)"
            />
            <span aria-hidden="true"></span>
          </label>
        </div>
        <p class="settings-footnote">
          Alertas só ficam operacionais depois da configuração inicial e para intervalos com fonte
          técnica confirmada. Notificações push não fazem parte desta versão.
        </p>
      </section>

      <section class="card settings-section" aria-labelledby="backup-title">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">▣</span>
          <div>
            <h2 id="backup-title">Backup neste dispositivo</h2>
            <p>Exporte todos os seus registros ou confira um arquivo antes de importá-lo.</p>
          </div>
        </div>

        <div class="settings-actions">
          <button class="button button-secondary" type="button" (click)="exportData()">
            Exportar backup JSON
          </button>
          <label class="button button-secondary file-button">
            Selecionar backup
            <input type="file" accept=".json,application/json" (change)="selectBackup($event)" />
          </label>
        </div>

        @if (exported()) {
          <p class="success-message" role="status">Backup exportado com sucesso.</p>
        }
        @if (importError()) {
          <p class="field-error import-message" role="alert">{{ importError() }}</p>
        }
        @if (imported()) {
          <p class="success-message" role="status">Backup importado com sucesso.</p>
        }

        @if (backupSummary(); as summary) {
          <div class="import-preview" aria-labelledby="import-preview-title">
            <div class="inline-between">
              <div>
                <p class="eyebrow">Arquivo validado</p>
                <h3 id="import-preview-title">Revisar antes de substituir</h3>
              </div>
              <button class="text-button" type="button" (click)="cancelImport()">Cancelar</button>
            </div>
            <p>
              <strong>{{ selectedFilename() }}</strong>
            </p>
            <dl class="backup-summary">
              <div>
                <dt>Motocicleta</dt>
                <dd>{{ summary.motorcycle }} · {{ summary.year }}</dd>
              </div>
              <div>
                <dt>Quilometragem</dt>
                <dd>{{ summary.currentMileage.toLocaleString('pt-BR') }} km</dd>
              </div>
              <div>
                <dt>Serviços</dt>
                <dd>{{ summary.serviceRecords }}</dd>
              </div>
              <div>
                <dt>Leituras do odômetro</dt>
                <dd>{{ summary.odometerRecords }}</dd>
              </div>
              <div>
                <dt>Itens do plano</dt>
                <dd>{{ summary.maintenanceItems }}</dd>
              </div>
            </dl>
            <div class="confirm-box" role="alert">
              <strong>Substituir todos os dados atuais?</strong>
              <p>
                Esta ação troca a motocicleta, o plano e os históricos deste dispositivo pelos dados
                resumidos acima. O arquivo selecionado não causou nenhuma alteração até aqui.
              </p>
              <div>
                <button class="button button-secondary" type="button" (click)="cancelImport()">
                  Manter dados atuais
                </button>
                <button class="button button-danger" type="button" (click)="confirmImport()">
                  Confirmar substituição
                </button>
              </div>
            </div>
          </div>
        }
      </section>

      <section class="card settings-section">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">↺</span>
          <div>
            <h2>Restaurar demonstração</h2>
            <p>Reinicie o Garage com dados demonstrativos e refaça a configuração inicial.</p>
          </div>
        </div>
        <div class="settings-actions">
          <button class="text-button danger" type="button" (click)="showReset.set(true)">
            Restaurar demonstração
          </button>
        </div>

        @if (showReset()) {
          <div class="confirm-box" role="alert">
            <strong>Substituir seus dados?</strong>
            <p>O plano e os históricos atuais serão trocados pelos dados demonstrativos.</p>
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
  protected readonly imported = signal(false);
  protected readonly importError = signal('');
  protected readonly backupSummary = signal<GarageBackupSummary | null>(null);
  protected readonly selectedFilename = signal('');
  private readonly pendingBackup = signal<GarageBackup | null>(null);

  protected toggleAlerts(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.store.updateSettings(target.checked);
    }
  }

  protected exportData(): void {
    this.download(
      this.store.exportData(),
      `garage-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    this.exported.set(true);
  }

  protected exportRecoveryData(): void {
    const content = this.store.exportRecoveryData();
    if (content !== null) {
      this.download(
        content,
        `garage-recuperacao-${new Date().toISOString().slice(0, 10)}.txt`,
        'text/plain',
      );
    }
  }

  protected async selectBackup(event: Event): Promise<void> {
    this.cancelImport();
    this.imported.set(false);
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const file = target.files?.[0];
    target.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.importError.set('Selecione um arquivo com extensão .json.');
      return;
    }
    if (file.size > 5_000_000) {
      this.importError.set('O arquivo excede o limite de 5 MB para backups locais.');
      return;
    }

    let content: string;
    try {
      content = await file.text();
    } catch {
      this.importError.set('Não foi possível ler o arquivo selecionado.');
      return;
    }
    const result = parseGarageBackup(content);
    if (!result.ok) {
      this.importError.set(result.error);
      return;
    }
    this.pendingBackup.set(result.backup);
    this.backupSummary.set(result.summary);
    this.selectedFilename.set(file.name);
  }

  protected cancelImport(): void {
    this.pendingBackup.set(null);
    this.backupSummary.set(null);
    this.selectedFilename.set('');
    this.importError.set('');
  }

  protected confirmImport(): void {
    const backup = this.pendingBackup();
    if (!backup) {
      return;
    }
    if (!this.store.importState(backup.state)) {
      this.importError.set('Não foi possível gravar o backup neste dispositivo.');
      return;
    }
    this.cancelImport();
    this.imported.set(true);
  }

  protected reset(): void {
    if (!this.store.resetDemoData()) {
      this.importError.set('Não foi possível restaurar os dados neste dispositivo.');
      return;
    }
    this.showReset.set(false);
    this.cancelImport();
  }

  private download(content: string, filename: string, type = 'application/json'): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

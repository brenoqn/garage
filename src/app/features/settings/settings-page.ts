import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ImportPreview } from '../../../../shared/garage';
import { parseGarageBackup } from '../../core/domain/backup';
import { GarageBackup, GarageBackupSummary } from '../../core/models/backup.model';
import { GarageTheme } from '../../core/models/garage-state.model';
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
              recomeçar do zero.
            </p>
          </div>
          <button class="button button-secondary" type="button" (click)="exportRecoveryData()">
            Exportar conteúdo original
          </button>
        </section>
      }

      <section class="card settings-section" aria-labelledby="server-title">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">⇅</span>
          <div>
            <h2 id="server-title">Onde ficam seus dados</h2>
            @if (store.mode() === 'server') {
              <p>
                Modo servidor: os dados ficam no servidor do Garage e aparecem em qualquer
                dispositivo com acesso liberado.
              </p>
            } @else {
              <p>
                Modo local: os dados ficam só neste navegador. Exporte backups para não perdê-los.
              </p>
            }
          </div>
        </div>

        @if (store.mode() === 'server') {
          @switch (store.remote().status) {
            @case ('loading') {
              <p class="settings-footnote" role="status">Carregando dados do servidor…</p>
            }
            @case ('ready') {
              <p class="success-message" role="status">Conectado ao servidor.</p>
            }
            @case ('error') {
              <p class="field-error import-message" role="alert">{{ remoteErrorMessage() }}</p>
              <div class="settings-actions">
                <button class="button button-secondary" type="button" (click)="retryServer()">
                  Tentar de novo
                </button>
              </div>
            }
          }

          @if (store.remote().status === 'ready' && serverIsEmpty()) {
            <div class="import-preview" aria-labelledby="server-import-title">
              <p class="eyebrow">Servidor vazio</p>
              <h3 id="server-import-title">Importar dados para o servidor</h3>
              <p>
                Envie os dados deste navegador ou um backup JSON. Você revisa o resumo antes de
                confirmar; nada é gravado até lá.
              </p>
              <div class="settings-actions">
                <button
                  class="button button-secondary"
                  type="button"
                  [disabled]="store.busy()"
                  (click)="previewLocalData()"
                >
                  Usar dados deste navegador
                </button>
                <label class="button button-secondary file-button">
                  Selecionar backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    (change)="previewServerFile($event)"
                  />
                </label>
              </div>
            </div>
          }

          @if (serverPreview(); as pending) {
            <div class="import-preview" aria-labelledby="server-preview-title">
              <div class="inline-between">
                <div>
                  <p class="eyebrow">Validado pelo servidor</p>
                  <h3 id="server-preview-title">Revisar importação</h3>
                </div>
                <button class="text-button" type="button" (click)="cancelServerImport()">
                  Cancelar
                </button>
              </div>
              <p>
                <strong>{{ pending.label }}</strong>
              </p>
              <dl class="backup-summary">
                <div>
                  <dt>Motocicleta</dt>
                  <dd>
                    {{ pending.preview.summary.motorcycle }} · {{ pending.preview.summary.year }}
                  </dd>
                </div>
                <div>
                  <dt>Quilometragem</dt>
                  <dd>{{ pending.preview.summary.currentMileage.toLocaleString('pt-BR') }} km</dd>
                </div>
                <div>
                  <dt>Serviços</dt>
                  <dd>{{ pending.preview.summary.serviceRecords }}</dd>
                </div>
                <div>
                  <dt>Abastecimentos</dt>
                  <dd>{{ pending.preview.summary.fuelRecords }}</dd>
                </div>
                <div>
                  <dt>Leituras do odômetro</dt>
                  <dd>{{ pending.preview.summary.odometerRecords }}</dd>
                </div>
                <div>
                  <dt>Itens do plano</dt>
                  <dd>{{ pending.preview.summary.maintenanceItems }}</dd>
                </div>
              </dl>
              @if (pending.preview.excludedDemoServices > 0) {
                <p class="settings-footnote">
                  {{ pending.preview.excludedDemoServices }} serviço(s) de demonstração ficam de
                  fora.
                </p>
              }
              <p class="settings-footnote">
                {{
                  pending.preview.settings === 'keep-remote'
                    ? 'O tema e os alertas atuais do servidor serão mantidos.'
                    : 'O tema e os alertas do backup serão usados.'
                }}
              </p>
              @if (pending.preview.target === 'occupied') {
                <p class="field-error import-message" role="alert">
                  O servidor já tem dados. A importação só é feita em um servidor vazio.
                </p>
              } @else {
                <div class="confirm-box" role="alert">
                  <strong>Importar para o servidor?</strong>
                  <p>
                    Os dados acima são gravados no servidor de uma vez. Os dados deste navegador
                    continuam guardados aqui.
                  </p>
                  <div>
                    <button
                      class="button button-secondary"
                      type="button"
                      (click)="cancelServerImport()"
                    >
                      Cancelar
                    </button>
                    <button
                      class="button button-primary"
                      type="button"
                      [disabled]="store.busy()"
                      (click)="confirmServerImport()"
                    >
                      Confirmar importação
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <div class="settings-actions">
            <button class="text-button" type="button" (click)="useLocal()">
              Usar somente este navegador
            </button>
          </div>
        } @else {
          <div class="settings-actions">
            <button
              class="button button-secondary"
              type="button"
              [disabled]="connecting()"
              (click)="connectServer()"
            >
              {{ connecting() ? 'Conectando…' : 'Conectar ao servidor do Garage' }}
            </button>
          </div>
          <p class="settings-footnote">
            Requer acesso liberado ao servidor. Os dados deste navegador não são apagados; depois de
            conectar você pode importá-los.
          </p>
        }
        @if (serverMessage()) {
          <p
            [class]="
              serverMessageKind() === 'error' ? 'field-error import-message' : 'success-message'
            "
            [attr.role]="serverMessageKind() === 'error' ? 'alert' : 'status'"
          >
            {{ serverMessage() }}
          </p>
        }
      </section>

      <section class="card settings-section">
        <div class="settings-heading">
          <span class="settings-icon" aria-hidden="true">◐</span>
          <div>
            <h2>Aparência</h2>
            <p>
              O tema escuro é o padrão para uso na garagem. Você pode escolher claro ou seguir o
              dispositivo.
            </p>
          </div>
        </div>
        <div class="form-field settings-select">
          <label for="theme-preference">Tema</label>
          <select
            id="theme-preference"
            [value]="store.settings().theme"
            [disabled]="!!store.recovery()"
            (change)="changeTheme($event)"
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Seguir o sistema</option>
          </select>
        </div>
        <p class="settings-footnote">
          {{
            store.mode() === 'server'
              ? 'A preferência fica salva no servidor.'
              : 'A preferência fica salva neste dispositivo.'
          }}
          O Garage também respeita a redução de movimento configurada no sistema.
        </p>
        @if (settingsError()) {
          <p class="field-error import-message" role="alert">{{ settingsError() }}</p>
        }
      </section>

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
            <h2 id="backup-title">Backup</h2>
            <p>
              {{
                store.mode() === 'server'
                  ? 'Exporte uma cópia dos seus registros do servidor.'
                  : 'Exporte todos os seus registros ou confira um arquivo antes de importá-lo.'
              }}
            </p>
          </div>
        </div>

        <div class="settings-actions">
          <button class="button button-secondary" type="button" (click)="exportData()">
            Exportar backup JSON
          </button>
          @if (store.mode() === 'local') {
            <label class="button button-secondary file-button">
              Selecionar backup
              <input type="file" accept=".json,application/json" (change)="selectBackup($event)" />
            </label>
          }
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
              <div>
                <dt>Atividades de procedimentos</dt>
                <dd>{{ summary.procedureExecutions }}</dd>
              </div>
              <div>
                <dt>Abastecimentos</dt>
                <dd>{{ summary.fuelRecords }}</dd>
              </div>
              <div>
                <dt>Gastos avulsos</dt>
                <dd>{{ summary.expenseRecords }}</dd>
              </div>
              <div>
                <dt>Ocorrências</dt>
                <dd>{{ summary.occurrenceRecords }}</dd>
              </div>
              <div>
                <dt>Inspeções pré-rodagem</dt>
                <dd>{{ summary.safetyChecks }}</dd>
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

      @if (store.mode() === 'local') {
        <section class="card settings-section">
          <div class="settings-heading">
            <span class="settings-icon" aria-hidden="true">↺</span>
            <div>
              <h2>Recomeçar do zero</h2>
              <p>
                Apague os dados deste dispositivo e refaça a configuração inicial. O tema e os
                alertas são mantidos.
              </p>
            </div>
          </div>
          <div class="settings-actions">
            <button class="text-button danger" type="button" (click)="showReset.set(true)">
              Apagar dados e recomeçar
            </button>
          </div>

          @if (showReset()) {
            <div class="confirm-box" role="alert">
              <strong>Apagar seus dados?</strong>
              <p>
                Serviços, abastecimentos, gastos, ocorrências, inspeções e o histórico do odômetro
                serão apagados deste dispositivo. Exporte um backup antes se quiser guardá-los.
              </p>
              <div>
                <button
                  class="button button-secondary"
                  type="button"
                  (click)="showReset.set(false)"
                >
                  Cancelar
                </button>
                <button class="button button-danger" type="button" (click)="reset()">
                  Apagar e recomeçar
                </button>
              </div>
            </div>
          }
        </section>
      }

      <section class="card about-card">
        <span class="brand-mark large" aria-hidden="true">G</span>
        <div>
          <h2>Garage</h2>
          <p>Base funcional do MVP · Honda NX200</p>
          <small>Aplicativo web progressivo · tema {{ themeLabel(store.settings().theme) }}</small>
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
  protected readonly settingsError = signal('');
  protected readonly connecting = signal(false);
  protected readonly serverMessage = signal('');
  protected readonly serverMessageKind = signal<'error' | 'success'>('success');
  protected readonly serverPreview = signal<{
    readonly label: string;
    readonly content: string;
    readonly preview: ImportPreview;
  } | null>(null);
  protected readonly serverIsEmpty = computed(() => {
    const remote = this.store.remote();
    return remote.status === 'ready' && remote.snapshot === 'not-configured';
  });
  protected readonly remoteErrorMessage = computed(() => {
    const remote = this.store.remote();
    return remote.status === 'error' ? remote.message : '';
  });

  protected async toggleAlerts(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.settingsError.set('');
    if (!(await this.store.updateSettings(target.checked))) {
      target.checked = this.store.settings().maintenanceAlertsEnabled;
      this.settingsError.set('Não foi possível salvar a preferência de alertas.');
    }
  }

  protected async changeTheme(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    this.settingsError.set('');
    if (!(await this.store.updateTheme(target.value as GarageTheme))) {
      target.value = this.store.settings().theme;
      this.settingsError.set('Não foi possível salvar o tema.');
    }
  }

  protected async connectServer(): Promise<void> {
    this.connecting.set(true);
    this.serverMessage.set('');
    const result = await this.store.connectServer();
    this.connecting.set(false);
    this.showServerMessage(result.ok ? 'Conectado ao servidor.' : result.error, !result.ok);
  }

  protected async retryServer(): Promise<void> {
    this.serverMessage.set('');
    await this.store.refreshRemote();
  }

  protected useLocal(): void {
    this.cancelServerImport();
    if (!this.store.useLocalMode()) {
      this.showServerMessage('Não foi possível voltar ao modo local.', true);
      return;
    }
    this.showServerMessage('Usando somente os dados deste navegador.', false);
  }

  protected async previewLocalData(): Promise<void> {
    const backup = this.store.localDataBackup();
    if (!backup.ok) {
      this.showServerMessage(backup.error, true);
      return;
    }
    await this.previewServerContent(backup.value, 'Dados deste navegador');
  }

  protected async previewServerFile(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 2_000_000) {
      this.showServerMessage('Selecione um backup .json com até 2 MB.', true);
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      this.showServerMessage('Não foi possível ler o arquivo selecionado.', true);
      return;
    }
    await this.previewServerContent(content, file.name);
  }

  protected cancelServerImport(): void {
    this.serverPreview.set(null);
  }

  protected async confirmServerImport(): Promise<void> {
    const pending = this.serverPreview();
    if (!pending) return;
    const result = await this.store.importToServer(pending.content, pending.preview.digest);
    if (!result.ok) {
      this.showServerMessage(result.error, true);
      return;
    }
    this.serverPreview.set(null);
    this.showServerMessage('Dados importados para o servidor.', false);
  }

  private async previewServerContent(content: string, label: string): Promise<void> {
    this.serverMessage.set('');
    this.serverPreview.set(null);
    const result = await this.store.previewServerImport(content);
    if (!result.ok) {
      this.showServerMessage(result.error, true);
      return;
    }
    this.serverPreview.set({ label, content, preview: result.value });
  }

  private showServerMessage(message: string, error: boolean): void {
    this.serverMessageKind.set(error ? 'error' : 'success');
    this.serverMessage.set(message);
  }

  protected themeLabel(theme: GarageTheme): string {
    return { dark: 'escuro', light: 'claro', system: 'do sistema' }[theme];
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
    const result = parseGarageBackup(content, this.store.procedures());
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

  protected async confirmImport(): Promise<void> {
    const backup = this.pendingBackup();
    if (!backup) {
      return;
    }
    if (!(await this.store.importState(backup.state))) {
      this.importError.set('Não foi possível gravar o backup neste dispositivo.');
      return;
    }
    this.cancelImport();
    this.imported.set(true);
  }

  protected async reset(): Promise<void> {
    if (!(await this.store.resetToInitialState())) {
      this.importError.set('Não foi possível apagar os dados neste dispositivo.');
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

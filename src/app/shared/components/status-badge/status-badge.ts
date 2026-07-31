import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { maintenanceStatusLabel } from '../../../core/domain/maintenance-calculator';
import { MaintenanceStatus } from '../../../core/models/maintenance.model';

@Component({
  selector: 'app-status-badge',
  template: `
    <span [class]="'status-badge status-' + status()">
      <span class="status-dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<MaintenanceStatus>();

  protected label(): string {
    return maintenanceStatusLabel(this.status());
  }
}

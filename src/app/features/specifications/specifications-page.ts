import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TechnicalSpecification } from '../../core/models/specification.model';
import { GarageStore } from '../../core/services/garage-store.service';

interface SpecificationGroup {
  readonly name: string;
  readonly items: readonly TechnicalSpecification[];
}

@Component({
  selector: 'app-specifications-page',
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Ficha de referência</p>
          <h1>Especificações técnicas</h1>
          <p>Honda NX200 · valores organizados por sistema.</p>
        </div>
      </header>

      <div class="source-warning">
        <span aria-hidden="true">!</span>
        <p>
          Esta versão não publica valores mecânicos sem fonte confiável. Todos os campos abaixo
          permanecem “A confirmar” até a validação em documentação técnica correspondente ao ano.
        </p>
      </div>

      <div class="specification-groups">
        @for (group of groups(); track group.name) {
          <section class="card specification-group">
            <h2>{{ group.name }}</h2>
            <dl>
              @for (item of group.items; track item.id) {
                <div>
                  <dt>{{ item.label }}</dt>
                  <dd>
                    <strong>{{ item.value }}</strong>
                    <small>Fonte técnica: {{ item.source.label }}</small>
                  </dd>
                </div>
              }
            </dl>
          </section>
        }
      </div>

      <p class="documentation-note">
        Tem uma fonte técnica confiável? A arquitetura de dados já prevê referência, estado de
        confirmação e edição futura por ano-modelo.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecificationsPage {
  private readonly store = inject(GarageStore);
  protected readonly groups = computed<readonly SpecificationGroup[]>(() => {
    const names = [...new Set(this.store.specifications().map((item) => item.group))];
    return names.map((name) => ({
      name,
      items: this.store.specifications().filter((item) => item.group === name),
    }));
  });
}

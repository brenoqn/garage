import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly store = inject(GarageStore);
  protected readonly motorcycle = this.store.motorcycle;
  protected readonly modelLabel = computed(
    () => `${this.motorcycle().manufacturer} ${this.motorcycle().model}`,
  );
  protected readonly quickMenuOpen = signal(false);

  constructor() {
    const document = inject(DOCUMENT);
    effect(() => {
      document.documentElement.dataset['theme'] = this.store.settings().theme;
    });
  }

  protected closeQuickMenu(): void {
    this.quickMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closeQuickMenu();
  }
}

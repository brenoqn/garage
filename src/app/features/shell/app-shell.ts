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
  protected readonly store = inject(GarageStore);
  /** Modo servidor sem nenhum snapshot ainda: não renderizar telas com dados vazios. */
  protected readonly waitingForServer = computed(
    () => this.store.mode() === 'server' && !this.store.remoteLoaded(),
  );
  protected readonly remoteError = computed(() => {
    const remote = this.store.remote();
    return this.store.mode() === 'server' && remote.status === 'error' ? remote.message : '';
  });
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

  protected retryServer(): void {
    void this.store.refreshRemote();
  }

  protected useLocal(): void {
    this.store.useLocalMode();
  }

  protected closeQuickMenu(): void {
    this.quickMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closeQuickMenu();
  }
}

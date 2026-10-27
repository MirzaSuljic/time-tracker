import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SpinnerService } from '../services/spinner.service';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (spinner.visible()) {
      <div class="fixed inset-0 z-[55] grid cursor-wait place-items-center bg-white/50 backdrop-blur-[1px]" role="status" aria-live="polite">
        <div class="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-lg ring-1 ring-slate-200">
          <span class="size-6 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" aria-hidden="true"></span>
          <span class="text-sm font-medium text-slate-700">Loading…</span>
        </div>
      </div>
    }
  `,
})
export class SpinnerComponent {
  protected readonly spinner = inject(SpinnerService);
}

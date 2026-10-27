import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ModalActionButton, ModalButton } from '../models/modal.model';
import { ModalService } from '../services/modal.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  host: { '(document:keydown.escape)': 'dismiss()' },
  template: `
    @if (modalService.visible()) {
      @let m = modalService.modal();
      <div class="fixed inset-0 z-[60] grid place-items-center p-4">
        <button type="button" tabindex="-1" aria-label="Close" (click)="dismiss()"
                class="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"></button>
        <div role="alertdialog" aria-modal="true" aria-labelledby="app-modal-title" aria-describedby="app-modal-text" tabindex="-1" #panel
             class="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl outline-none">
          @if (m.tone !== 'info') {
            <span class="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
              <app-icon name="close" cls="size-6" />
            </span>
          }
          <h2 id="app-modal-title" class="mt-4 text-lg font-bold text-slate-900">{{ m.title }}</h2>
          <p id="app-modal-text" class="mt-2 text-sm text-slate-600">{{ m.content }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            @for (b of m.buttons; track b.title) {
              <button type="button" class="btn min-w-28 flex-1" [class]="buttonClass(b)" (click)="press(b)">{{ b.title }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  protected readonly modalService = inject(ModalService);
  private panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => this.panel()?.nativeElement.focus());
  }

  buttonClass(b: ModalButton) {
    if (b.action === ModalActionButton.Cancel) return 'btn-secondary';
    return b.danger ? 'btn-danger' : 'btn-primary';
  }

  press(b: ModalButton) {
    if (b.action === ModalActionButton.Confirm) this.modalService.confirm();
    else this.modalService.close();
  }

  dismiss() {
    if (!this.modalService.isOpen) return;
    if (this.modalService.modal().dismissible === false) return;
    this.modalService.close();
  }
}

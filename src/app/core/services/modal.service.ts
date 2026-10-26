import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ModalContent } from '../models/modal.model';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private display = signal(false);
  private data = signal<ModalContent>({ title: '', content: '', buttons: [] });
  private confirmAction = new Subject<string>();

  readonly visible = this.display.asReadonly();
  readonly modal = this.data.asReadonly();
  confirmAction$: Observable<string> = this.confirmAction.asObservable();

  get isOpen(): boolean {
    return this.display();
  }

  getData(data: ModalContent) {
    this.data.set(data);
  }

  open() {
    this.display.set(true);
  }

  confirm() {
    this.confirmAction.next(this.data().title);
    this.close();
  }

  close() {
    this.display.set(false);
    this.confirmAction.complete();
    this.confirmAction = new Subject<string>();
    this.confirmAction$ = this.confirmAction.asObservable();
  }
}

import { TestBed } from '@angular/core/testing';
import { ModalService } from './modal.service';
import { ModalActionButton } from '../models/modal.model';

describe('ModalService', () => {
  it('opens with content, confirms with its title and closes', () => {
    const modal = TestBed.inject(ModalService);
    const confirmed: string[] = [];
    modal.getData({ title: 'Delete entry?', content: 'Sure?', buttons: [{ title: 'Delete', action: ModalActionButton.Confirm }] });
    modal.open();
    modal.confirmAction$.subscribe(t => confirmed.push(t));

    expect(modal.isOpen).toBe(true);
    modal.confirm();

    expect(confirmed).toEqual(['Delete entry?']);
    expect(modal.isOpen).toBe(false);
  });

  it('does not report a confirm when closed with Cancel', () => {
    const modal = TestBed.inject(ModalService);
    const confirmed: string[] = [];
    modal.open();
    modal.confirmAction$.subscribe(t => confirmed.push(t));
    modal.close();
    expect(confirmed).toEqual([]);
  });
});

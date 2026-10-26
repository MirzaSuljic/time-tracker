export enum ModalActionButton {
  Cancel = 'cancel',
  Confirm = 'confirm',
}

export interface ModalButton {
  title: string;
  action: ModalActionButton;
  danger?: boolean;
}

export interface ModalContent {
  title: string;
  content: string;
  buttons: ModalButton[];
  tone?: 'error' | 'info';
  dismissible?: boolean;
}

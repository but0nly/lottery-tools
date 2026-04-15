export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: number;
  message: string;
  type: NotificationType;
}

export type ConfirmOptions = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

class NotificationManager {
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();
  private notifications: NotificationItem[] = [];
  private nextId = 1;

  private confirmListener: ((options: ConfirmOptions | null) => void) | null = null;

  subscribe(listener: (notifications: NotificationItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeConfirm(listener: (options: ConfirmOptions | null) => void) {
    this.confirmListener = listener;
    return () => { this.confirmListener = null; };
  }

  show(message: string, type: NotificationType = 'info') {
    const id = this.nextId++;
    const notification = { id, message, type };
    this.notifications = [...this.notifications, notification];
    
    // Maintain maximum of 3 notifications
    if (this.notifications.length > 3) {
      this.notifications = this.notifications.slice(-3);
    }
    
    this.notify();

    setTimeout(() => {
      this.remove(id);
    }, 3000);
  }

  confirm(options: ConfirmOptions) {
    if (this.confirmListener) {
      this.confirmListener(options);
    }
  }

  closeConfirm() {
    if (this.confirmListener) {
      this.confirmListener(null);
    }
  }

  remove(id: number) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.notifications));
  }
}

export const toast = new NotificationManager();

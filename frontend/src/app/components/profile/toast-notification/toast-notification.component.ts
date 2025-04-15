import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, NgbToastModule],
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
})
export class ToastNotificationComponent implements OnInit {
  @Input() message = '';
  @Input() show = false;
  @Output() hideToast = new EventEmitter<void>();

  ngOnInit() {
    // Auto-hide toast after 3 seconds if it's showing
    if (this.show) {
      setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  hide() {
    this.hideToast.emit();
  }
}

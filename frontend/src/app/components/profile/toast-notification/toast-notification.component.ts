import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, NgbToastModule],
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastNotificationComponent implements OnInit {
  message = input<string>('');
  show = input<boolean>(false);
  hideToast = output<void>();

  ngOnInit() {
    // Auto-hide toast after 3 seconds if it's showing
    if (this.show()) {
      setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  hide() {
    this.hideToast.emit();
  }
}

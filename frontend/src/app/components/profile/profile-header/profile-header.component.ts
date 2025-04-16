import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../services/trpc.service';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent {
  user = input.required<User>();
  editMode = input<boolean>(false);

  // Convert getInitials to a computed signal
  initials = computed(() => {
    const name = this.user()?.name;
    if (!name) return '';

    // Split the name and get initials from first and last parts
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return (
        nameParts[0][0] + nameParts[nameParts.length - 1][0]
      ).toUpperCase();
    } else {
      // If only one name, just use the first letter
      return nameParts[0][0].toUpperCase();
    }
  });
}

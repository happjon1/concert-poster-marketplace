import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../services/trpc.service';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-details.component.html',
  styleUrls: ['./profile-details.component.scss'],
})
export class ProfileDetailsComponent {
  @Input() user!: User;
}

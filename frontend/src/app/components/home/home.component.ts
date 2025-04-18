import { Component } from '@angular/core';
import { PosterCardComponent } from '../poster-card/poster-card.component';

@Component({
  selector: 'app-home',
  imports: [PosterCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true,
})
export class HomeComponent {
  items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
}

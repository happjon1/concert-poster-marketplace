import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-poster-card',
  imports: [],
  templateUrl: './poster-card.component.html',
  styleUrl: './poster-card.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosterCardComponent {}

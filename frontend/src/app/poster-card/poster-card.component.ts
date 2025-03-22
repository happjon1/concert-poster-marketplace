import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-poster-card',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatDividerModule,
    MatIcon,
  ],
  templateUrl: './poster-card.component.html',
  styleUrl: './poster-card.component.scss',
})
export class PosterCardComponent {}

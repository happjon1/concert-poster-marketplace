import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RouterTypes } from '@concert-poster-marketplace/shared';

@Component({
  selector: 'app-event-selector',
  templateUrl: './event-selector.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class EventSelectorComponent {
  @Input() parentForm!: FormGroup;
  @Input() events: RouterTypes.Events.Event[] = [];
  @Input() filteredEvents: RouterTypes.Events.Event[] = [];

  @Output() eventSearch = new EventEmitter<string>();
  @Output() addEvent = new EventEmitter<RouterTypes.Events.Event>();
  @Output() removeEvent = new EventEmitter<number>();

  eventSearchTerm = '';

  get eventIdsArray(): FormArray {
    return this.parentForm.get('eventIds') as FormArray;
  }

  onSearch(): void {
    this.eventSearch.emit(this.eventSearchTerm);
  }

  onAddEvent(event: RouterTypes.Events.Event): void {
    this.addEvent.emit(event);
  }

  onRemoveEvent(index: number): void {
    this.removeEvent.emit(index);
  }

  getEvent(id: string): RouterTypes.Events.Event | undefined {
    return this.events.find(e => e.id === id);
  }

  formatVenue(venue: RouterTypes.Venues.Venue | string | undefined): string {
    if (!venue) return 'Unknown venue';
    if (typeof venue === 'string') return venue;
    return venue.name || 'Unknown venue';
  }
}

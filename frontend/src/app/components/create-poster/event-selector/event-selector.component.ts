import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ConcertEvent } from '../../../services/trpc.service';
@Component({
  selector: 'app-event-selector',
  templateUrl: './event-selector.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class EventSelectorComponent {
  @Input() parentForm!: FormGroup;
  @Input() events: ConcertEvent[] = [];
  @Input() filteredEvents: ConcertEvent[] = [];

  @Output() eventSearch = new EventEmitter<string>();
  @Output() addEvent = new EventEmitter<ConcertEvent>();
  @Output() removeEvent = new EventEmitter<number>();

  eventSearchTerm = '';

  get eventIdsArray(): FormArray {
    return this.parentForm.get('eventIds') as FormArray;
  }

  onSearch(): void {
    this.eventSearch.emit(this.eventSearchTerm);
  }

  onAddEvent(event: ConcertEvent): void {
    this.addEvent.emit(event);
  }

  onRemoveEvent(index: number): void {
    this.removeEvent.emit(index);
  }

  getEvent(id: string): ConcertEvent | undefined {
    return this.events.find(e => e.id === id);
  }
}

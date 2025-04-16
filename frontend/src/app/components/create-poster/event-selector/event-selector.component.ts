import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSelectorComponent {
  parentForm = input.required<FormGroup>();
  events = input<ConcertEvent[]>([]);
  filteredEvents = input<ConcertEvent[]>([]);

  eventSearch = output<string>();
  addEvent = output<ConcertEvent>();
  removeEvent = output<number>();

  eventSearchTerm = '';

  get eventIdsArray(): FormArray {
    return this.parentForm().get('eventIds') as FormArray;
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
    return this.events().find(e => e.id === id);
  }
}

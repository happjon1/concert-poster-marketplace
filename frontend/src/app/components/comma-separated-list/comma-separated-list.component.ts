import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  computed,
  input,
  DestroyRef,
  inject,
  signal,
  ApplicationRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Declare the Bootstrap Popover type
declare const bootstrap: {
  Popover: new (
    element: Element,
    options?: Record<string, unknown>
  ) => { dispose: () => void };
};

@Component({
  selector: 'app-comma-separated-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comma-separated-list.component.html',
  styleUrl: './comma-separated-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommaSeparatedListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('listElement') listElement!: ElementRef;

  // Input properties
  items = input<string[]>([]);
  maxLength = input<number>(50); // Default max length before truncation, used only if autoAdjust is false
  autoAdjust = input<boolean>(false); // Whether to automatically adjust length based on container width

  // Character width estimate (in pixels)
  charWidthEstimate = input<number>(8); // Average width of a character in the current font

  // Internal state
  private adjustedMaxLength = signal<number>(50);
  private destroyRef = inject(DestroyRef);
  private observer: ResizeObserver | null = null;
  private appRef = inject(ApplicationRef);
  private popover: { dispose: () => void } | null = null;

  constructor(private hostRef: ElementRef) {
    // Initialize with default max length
    this.adjustedMaxLength.set(this.maxLength());
  }

  ngOnInit() {
    // Set up the resize observer for auto-adjustment
    if (this.autoAdjust()) {
      // Use a single timeout to ensure DOM is ready
      setTimeout(() => {
        this.setupResizeObserver();
        this.calculateMaxLength();
      }, 0);
    }
  }

  ngAfterViewInit() {
    // Initialize the popover after the view is initialized
    this.initPopover();
  }

  ngOnDestroy() {
    // Clean up the observer
    this.cleanupObserver();

    // Clean up popover
    this.disposePopover();
  }

  private initPopover() {
    try {
      if (
        this.listElement?.nativeElement &&
        typeof bootstrap !== 'undefined' &&
        bootstrap.Popover &&
        this.shouldShowPopover()
      ) {
        // Dispose existing popover if there is one
        this.disposePopover();

        // Create new popover
        this.popover = new bootstrap.Popover(this.listElement.nativeElement, {
          content: this.fullText(),
          html: false,
          trigger: 'hover focus',
          placement: 'top',
          boundary: 'window',
          delay: { show: 300, hide: 100 },
        });
      }
    } catch (error) {
      console.warn('Error initializing popover:', error);
    }
  }

  private disposePopover() {
    if (this.popover && typeof this.popover.dispose === 'function') {
      this.popover.dispose();
      this.popover = null;
    }
  }

  private updatePopover() {
    // We need to dispose and reinitialize the popover when content changes
    this.disposePopover();

    // Only reinitialize if we need to show it
    if (this.shouldShowPopover()) {
      this.initPopover();
    }
  }

  // Whether we should show a popover
  private shouldShowPopover() {
    return this.showTruncation();
  }

  private setupResizeObserver() {
    // Clean up any existing observer first
    this.cleanupObserver();

    // Set up the ResizeObserver to catch container size changes
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => {
        this.calculateMaxLength();
        // Trigger change detection
        this.appRef.tick();
      });

      // Observe just the parent element for size changes
      const parent = this.hostRef.nativeElement.parentElement;
      if (parent) {
        this.observer.observe(parent);
      }
    }
  }

  private cleanupObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private calculateMaxLength() {
    // Get parent width - this is more reliable than the element's own width
    const parent = this.hostRef.nativeElement.parentElement;
    if (!parent) return;

    const containerWidth = parent.offsetWidth;

    if (containerWidth && containerWidth > 0) {
      // Calculate how many characters can fit
      // Use 0.95 factor to account for potential padding/margins
      const chars = Math.floor(
        (containerWidth * 0.95) / this.charWidthEstimate()
      );

      // Ensure we have a reasonable minimum, but no maximum when auto-adjusting
      const newMaxLength = Math.max(10, chars);

      // Update only if there's an actual change
      if (this.adjustedMaxLength() !== newMaxLength) {
        const oldAdjustedLength = this.adjustedMaxLength();
        this.adjustedMaxLength.set(newMaxLength);

        // Update popover if the truncation status changes
        if (this.isTruncationChanged(oldAdjustedLength, newMaxLength)) {
          setTimeout(() => this.updatePopover(), 0);
        }
      }
    }
  }

  private isTruncationChanged(oldLength: number, newLength: number): boolean {
    const textLength = this.fullText().length;
    const wasTruncated = textLength > oldLength;
    const isTruncated = textLength > newLength;
    return wasTruncated !== isTruncated;
  }

  // Computed properties
  displayText = computed(() => {
    if (!this.items() || this.items().length === 0) {
      return '';
    }

    const joined = this.items().join(', ');
    const effectiveMaxLength = this.autoAdjust()
      ? this.adjustedMaxLength()
      : this.maxLength();

    if (joined.length <= effectiveMaxLength) {
      return joined;
    }

    // Find a place to cut the string near maxLength but trying to cut after a comma
    let cutIndex = effectiveMaxLength;
    while (
      cutIndex > 0 &&
      joined[cutIndex] !== ',' &&
      joined[cutIndex] !== ' '
    ) {
      cutIndex--;
    }

    // If we couldn't find a good cut point, just cut at maxLength
    if (cutIndex <= 0) {
      cutIndex = effectiveMaxLength;
    } else {
      // Cut after the comma and space
      cutIndex += 2;
    }

    return joined.substring(0, cutIndex) + '...';
  });

  // Full text is always the complete joined string for the tooltip
  fullText = computed(() => {
    if (!this.items() || this.items().length === 0) {
      return '';
    }

    return this.items().join(', ');
  });

  // Whether the text is truncated (needs a popover)
  showTruncation = computed(() => {
    return (
      this.fullText().length >
      (this.autoAdjust() ? this.adjustedMaxLength() : this.maxLength())
    );
  });
}

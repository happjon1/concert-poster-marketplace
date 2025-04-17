import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PosterCardComponent } from '../poster-card/poster-card.component';
import { TrpcService, Poster } from '../../services/trpc.service';

@Component({
  selector: 'app-home',
  imports: [PosterCardComponent, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true,
})
export class HomeComponent implements OnInit {
  // Poster data
  items: Poster[] = [];
  loading = true;
  error = '';

  // Pagination
  currentPage = 1;
  totalItems = 0;
  itemsPerPage = 24;
  nextCursor: string | null = null;

  // Store cursors for each page to handle refreshes properly
  private pageCursors: Map<number, string> = new Map<number, string>();

  // Filtering and sorting
  filter = '';
  sort = 'newest';
  artistId?: number;
  eventId?: number;

  constructor(
    private trpcService: TrpcService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to query params changes
    this.route.queryParams.subscribe(params => {
      // Get filter parameters from URL
      this.filter = params['filter'] || '';
      this.sort = params['sort'] || 'newest';

      // Properly parse numeric parameters with safeguards
      if (params['artistId'] && !isNaN(Number(params['artistId']))) {
        this.artistId = Number(params['artistId']);
      } else {
        this.artistId = undefined;
      }

      if (params['eventId'] && !isNaN(Number(params['eventId']))) {
        this.eventId = Number(params['eventId']);
      } else {
        this.eventId = undefined;
      }

      if (
        params['page'] &&
        !isNaN(Number(params['page'])) &&
        Number(params['page']) > 0
      ) {
        this.currentPage = Number(params['page']);
      } else {
        this.currentPage = 1;
      }

      // Reset cursors if filter/sort parameters change
      if (
        params['filter'] !== this.filter ||
        params['sort'] !== this.sort ||
        params['artistId'] !== this.artistId?.toString() ||
        params['eventId'] !== this.eventId?.toString()
      ) {
        this.pageCursors.clear();
      }

      // Log for debugging
      console.log('Query params loaded:', {
        filter: this.filter,
        sort: this.sort,
        artistId: this.artistId,
        eventId: this.eventId,
        page: this.currentPage,
      });

      // Fetch posters with new params
      this.fetchPosters();
    });
  }

  /**
   * Get cursor for current page
   */
  private getPageCursor(): string | undefined {
    // First page doesn't need a cursor
    if (this.currentPage === 1) {
      return undefined;
    }

    // Check if we have a stored cursor for this page
    if (this.pageCursors.has(this.currentPage)) {
      return this.pageCursors.get(this.currentPage);
    }

    // If we don't have a cursor for the requested page but need to go beyond page 1
    // We'll need to fetch pages sequentially to build cursor chain
    return undefined;
  }

  /**
   * Fetch posters from backend with filters and pagination
   */
  async fetchPosters(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      // For pages > 1 without stored cursors, we need to build the cursor chain
      if (this.currentPage > 1 && !this.pageCursors.has(this.currentPage)) {
        await this.buildCursorChain();
      }

      const cursor = this.getPageCursor();

      // Log the search parameters we're using to help with debugging
      console.log('Searching with parameters:', {
        filter: this.filter,
        artistId: this.artistId,
        eventId: this.eventId,
      });

      const response = await this.trpcService.getAllPosters({
        limit: this.itemsPerPage,
        cursor: cursor,
        filter: this.filter || undefined,
        artistId: this.artistId,
        eventId: this.eventId,
      });

      // Log the returned items to verify they match what we saw in the backend logs
      console.log(`Retrieved ${response.items.length} posters from backend`);
      if (response.items.length > 0) {
        console.log(
          'First 3 posters:',
          response.items.slice(0, 3).map(poster => ({
            id: poster.id,
            title: poster.title,
            artists: poster.artists.map(artist => artist.name),
          }))
        );
      }

      this.items = response.items;

      // Store the next cursor for future navigation
      if (response.nextCursor) {
        this.pageCursors.set(this.currentPage + 1, response.nextCursor);
      }

      this.nextCursor = response.nextCursor;

      // If the backend provides total count, use it instead of hardcoded value
      if (response.total) {
        this.totalItems = response.total;
      } else {
        this.totalItems = 120; // Temporary hard-coded value
      }

      this.loading = false;
    } catch (err) {
      this.error = 'Failed to load posters';
      this.loading = false;
      console.error('Error fetching posters:', err);
    }
  }

  /**
   * Build cursor chain by fetching pages sequentially until we reach desired page
   * This is necessary when directly accessing a page via URL
   */
  private async buildCursorChain(): Promise<void> {
    let currentCursor: string | undefined = undefined;
    let pageToFetch = 1;

    // Start from page 1 and build up cursors until we reach the page before our target
    while (pageToFetch < this.currentPage) {
      try {
        // Fetch just enough data to get the next cursor
        const response = await this.trpcService.getAllPosters({
          limit: this.itemsPerPage,
          cursor: currentCursor,
          filter: this.filter || undefined,
          artistId: this.artistId,
          eventId: this.eventId,
        });

        // If we got a next cursor, store it and continue
        if (response.nextCursor) {
          // Store the cursor for the next page
          this.pageCursors.set(pageToFetch + 1, response.nextCursor);
          currentCursor = response.nextCursor;
          pageToFetch++;
        } else {
          // No more pages available
          break;
        }
      } catch (error) {
        console.error('Error building cursor chain:', error);
        break;
      }
    }
  }

  /**
   * Navigate to specific page
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.getTotalPages()) return;

    const queryParams = {
      ...this.route.snapshot.queryParams,
      page,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Apply sort option
   */
  applySort(sort: string): void {
    const queryParams = {
      ...this.route.snapshot.queryParams,
      sort,
      page: 1, // Reset to first page when changing sort
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Calculate total number of pages
   */
  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Generate array of page numbers for pagination
   */
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();

    // For small number of pages, show all
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // For many pages, show current, 2 before and 2 after if possible
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Get displayed items range for UI
   */
  getDisplayedRange(): { start: number; end: number; total: number } {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

    return {
      start,
      end,
      total: this.totalItems,
    };
  }
}

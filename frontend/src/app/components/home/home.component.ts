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
      this.artistId = params['artistId']
        ? Number(params['artistId'])
        : undefined;
      this.eventId = params['eventId'] ? Number(params['eventId']) : undefined;
      this.currentPage = params['page'] ? Number(params['page']) : 1;

      // Fetch posters with new params
      this.fetchPosters();
    });
  }

  /**
   * Fetch posters from backend with filters and pagination
   */
  async fetchPosters(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.trpcService.getAllPosters({
        limit: this.itemsPerPage,
        cursor: this.getPageCursor(),
        filter: this.filter || undefined,
        artistId: this.artistId,
        eventId: this.eventId,
      });

      this.items = response.items;
      this.nextCursor = response.nextCursor;
      this.totalItems = 120; // Temporary hard-coded value until backend provides total count
      this.loading = false;
    } catch (err) {
      this.error = 'Failed to load posters';
      this.loading = false;
      console.error('Error fetching posters:', err);
    }
  }

  /**
   * Get cursor for current page
   */
  private getPageCursor(): string | undefined {
    // Implementation will depend on how cursor-based pagination is handled
    // For now, we'll just handle first page with no cursor
    if (this.currentPage === 1) {
      return undefined;
    }
    return this.nextCursor || undefined;
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

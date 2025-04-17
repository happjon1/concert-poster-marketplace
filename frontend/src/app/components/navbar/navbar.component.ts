import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, Params } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

// Define interface for query parameters
interface SearchQueryParams extends Params {
  page: number;
  filter?: string | null;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, AfterViewInit {
  router = inject(Router);
  authService = inject(AuthService);
  searchQuery = signal('');
  mobileSearchQuery = signal('');
  mobileSearchVisible = signal(false);
  isOnHomePage = signal(false);

  // Search term debounce subjects
  private searchTerms = new Subject<string>();
  private mobileSearchTerms = new Subject<string>();

  @ViewChild('searchInput') searchInput?: ElementRef;

  isLoggedIn = computed(() => {
    return this.authService.currentUser() !== null;
  });

  ngOnInit(): void {
    // Initial check for home page
    this.checkIfHomePage();

    // Subscribe to router events to update isOnHomePage signal
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkIfHomePage();

        // Extract filter from URL if it exists
        if (this.isOnHomePage()) {
          const urlParams = new URLSearchParams(window.location.search);
          const filterParam = urlParams.get('filter');
          if (filterParam) {
            this.searchQuery.set(filterParam);
            this.mobileSearchQuery.set(filterParam);
          }
        }
      });

    // Set up search term debounce for main search
    this.searchTerms
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        this.updateSearchQueryString(term);
      });

    // Set up search term debounce for mobile search
    this.mobileSearchTerms
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        this.updateSearchQueryString(term);
      });
  }

  private checkIfHomePage(): void {
    const url = this.router.url;
    this.isOnHomePage.set(
      url === '/' || url === '/home' || url.startsWith('/home?')
    );
  }

  isHomePage(): boolean {
    return this.isOnHomePage();
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  // Method to handle search input changes
  onSearchInput(term: string): void {
    this.searchQuery.set(term);
    this.searchTerms.next(term);
  }

  // Method to handle mobile search input changes
  onMobileSearchInput(term: string): void {
    this.mobileSearchQuery.set(term);
    this.mobileSearchTerms.next(term);
  }

  // Update query string based on search term
  private updateSearchQueryString(term: string): void {
    if (this.isOnHomePage()) {
      const queryParams: SearchQueryParams = { page: 1 };

      if (term.trim()) {
        queryParams.filter = term.trim();
      } else {
        // If search is empty, remove the filter parameter
        queryParams.filter = null;
      }

      this.router.navigate(['/home'], {
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  toggleMobileSearch() {
    this.mobileSearchVisible.update(value => !value);

    // Focus the input field when the search overlay appears
    if (this.mobileSearchVisible()) {
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 100);
    }
  }

  ngAfterViewInit() {
    // AutoFocus search input when mobile search is opened
    if (this.mobileSearchVisible() && this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }
}

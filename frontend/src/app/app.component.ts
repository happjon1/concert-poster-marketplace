import { Component, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { filter, map, mergeMap } from 'rxjs';
import { UpdateService } from './services/update.service';

@Component({
  imports: [RouterModule, NavbarComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
})
export class AppComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  updateService = inject(UpdateService);
  title = 'frontend';
  fullscreen = false;

  ngOnInit() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.route),
        map(route => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter(route => route.outlet === 'primary'),
        mergeMap(route => route.data)
      )
      .subscribe(data => (this.fullscreen = !!data['fullscreen']));
    // Service is automatically initialized
  }

  // Optional: method to check for updates manually (can be bound to a button)
  checkForUpdates() {
    this.updateService.checkForUpdate();
  }
}

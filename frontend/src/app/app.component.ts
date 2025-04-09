import { Component, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { filter, map, mergeMap } from 'rxjs';
@Component({
  imports: [RouterModule, NavbarComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
})
export class AppComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
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
  }
}

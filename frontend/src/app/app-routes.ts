import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { CreatePosterComponent } from './components/create-poster/create-poster.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent }, // Placeholder for home component
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  {
    path: 'poster',
    children: [
      {
        path: 'create',
        component: CreatePosterComponent,
        canActivate: [authGuard],
        data: {
          fullscreen: true,
        },
      },
    ],
  },
  // Add other routes as needed
];

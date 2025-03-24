import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePosterListingComponent } from './create-poster-listing.component';

describe('CreatePosterListingComponent', () => {
  let component: CreatePosterListingComponent;
  let fixture: ComponentFixture<CreatePosterListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePosterListingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePosterListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

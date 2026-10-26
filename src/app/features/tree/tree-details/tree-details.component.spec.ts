import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TreeDetailsComponent } from './tree-details.component';

describe('TreeDetailsComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [TreeDetailsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TreeDetailsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

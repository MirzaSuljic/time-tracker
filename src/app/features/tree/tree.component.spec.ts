import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TreeComponent } from './tree.component';

describe('TreeComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [TreeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TreeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

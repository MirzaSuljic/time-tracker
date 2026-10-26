import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskDetailsComponent } from './task-details.component';

describe('TaskDetailsComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskDetailsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskListComponent } from './task-list.component';

describe('TaskListComponent', () => {
  it('starts loading the tasks of the given project', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.componentRef.setInput('clientId', 1);
    fixture.componentRef.setInput('projectId', 11);
    fixture.detectChanges();
    expect(fixture.componentInstance.state().status).toBe('loading');
  });
});

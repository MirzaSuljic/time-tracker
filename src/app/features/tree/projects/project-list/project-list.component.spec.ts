import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectListComponent);
    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.state().status).toBe('loading');
  });
});

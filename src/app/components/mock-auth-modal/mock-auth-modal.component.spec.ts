import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MockAuthModalComponent } from './mock-auth-modal.component';

describe('MockAuthModalComponent', () => {
  let component: MockAuthModalComponent;
  let fixture: ComponentFixture<MockAuthModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MockAuthModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MockAuthModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

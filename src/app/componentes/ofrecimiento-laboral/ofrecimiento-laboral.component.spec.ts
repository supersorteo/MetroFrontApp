import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfrecimientoLaboralComponent } from './ofrecimiento-laboral.component';

describe('OfrecimientoLaboralComponent', () => {
  let component: OfrecimientoLaboralComponent;
  let fixture: ComponentFixture<OfrecimientoLaboralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfrecimientoLaboralComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OfrecimientoLaboralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosDeTareasComponent } from './datos-de-tareas.component';

describe('DatosDeTareasComponent', () => {
  let component: DatosDeTareasComponent;
  let fixture: ComponentFixture<DatosDeTareasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosDeTareasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DatosDeTareasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

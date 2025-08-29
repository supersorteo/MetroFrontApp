// ...existing code...
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProvinciaService, Provincia } from '../../servicios/provincia.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-ofrecimiento-laboral',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './ofrecimiento-laboral.component.html',
  styleUrl: './ofrecimiento-laboral.component.scss'
})
export class OfrecimientoLaboralComponent implements OnInit {
  eliminarProfesional(prof: any) {
    const idx = this.profesionales.indexOf(prof);
    if (idx > -1) {
      this.profesionales.splice(idx, 1);
      localStorage.setItem('ofrecimientoLaboralList', JSON.stringify(this.profesionales));
    }
  }

  editarProfesional(prof: any) {
    // Aquí puedes implementar la lógica de edición (abrir modal, cargar datos, etc.)
    alert('Funcionalidad de edición en desarrollo');
  }
  profesionales: any[] = [];
  filtroPais: string = '';
  filtroRubro: string = '';
  filtroTexto: string = '';
  filtroProvincia: string = '';
  provinciasFiltro: Provincia[] = [];
  // Solo permite números en el campo teléfono
  onTelefonoInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.value = input.value.replace(/[^0-9]/g, '');
      this.form.get('telefono')?.setValue(input.value, { emitEvent: false });
    }
  }
  paises = [
    { nombre: 'Argentina', codigo: 'AR', flag: 'https://flagcdn.com/ar.svg' },
    { nombre: 'Colombia', codigo: 'CO', flag: 'https://flagcdn.com/co.svg' },
    { nombre: 'Peru', codigo: 'PE', flag: 'https://flagcdn.com/pe.svg' }
  ];
  provincias: Provincia[] = [];
  rubros = [
    { id: 1, codigo: 'ALB', nombre: 'Albañilería' },
    { id: 2, codigo: 'ELE', nombre: 'Electricidad' },
    { id: 3, codigo: 'PLO', nombre: 'Plomería' },
    { id: 4, codigo: 'PIN', nombre: 'Pintura' },
    { id: 5, codigo: 'CAR', nombre: 'Carpintería' },
    { id: 6, codigo: 'GAS', nombre: 'Gasista' },
    { id: 7, codigo: 'HVA', nombre: 'Herrería' },
    { id: 8, codigo: 'TEC', nombre: 'Tecnología' },
    { id: 9, codigo: 'OTR', nombre: 'Otros' }
  ];
  categorias = [
    'Arquitecto',
    'Ingeniero Civil',
    'Maestro Mayor de Obras',
    'Técnico Electricista',
    'Técnico Plomero',
    'Pintor',
    'Carpintero',
    'Gasista',
    'Herrero',
    'Técnico en Refrigeración',
    'Otro'
  ];
  form: FormGroup;
  vehiculo: string = '';

  constructor(private fb: FormBuilder, private provinciaService: ProvinciaService) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      categoria: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
      email: ['', [Validators.email]],
      especializacion: ['', Validators.required],
      localidad: [''],
  pais: [null, Validators.required],
      provincia: [{ value: '', disabled: true }, Validators.required], // inicia deshabilitado
      rubro: ['', Validators.required],
      vehiculo: ['', Validators.required],
      herramientas: ['']
    });
    // Cargar profesionales guardados en localStorage
    const guardados = localStorage.getItem('ofrecimientoLaboralList');
    if (guardados) {
      this.profesionales = JSON.parse(guardados);
    }
    // Inicializar provinciasFiltro si hay país seleccionado
    if (this.filtroPais) {
      this.onFiltroPaisChange();
    }
  }
  onFiltroPaisChange() {
    this.filtroProvincia = '';
    if (this.filtroPais) {
      this.provinciaService.getProvinciasByPais(this.filtroPais).subscribe({
        next: (provs) => this.provinciasFiltro = provs,
        error: () => this.provinciasFiltro = []
      });
    } else {
      this.provinciasFiltro = [];
    }
  }


  ngOnInit(): void {
    // Por defecto no se cargan provincias hasta que se seleccione un país
  }

  onPaisChange() {
    this.form.patchValue({ provincia: '' });
    const provinciaControl = this.form.get('provincia');
    const paisSeleccionado = this.form.get('pais')?.value;
    console.log('País seleccionado:', paisSeleccionado);
    if (paisSeleccionado) {
      provinciaControl?.enable();
      this.provinciaService.getProvinciasByPais(paisSeleccionado).subscribe({
        next: (provincias) => {
          this.provincias = provincias;
          console.log('Provincias cargadas:', provincias);
        },
        error: () => {
          this.provincias = [];
        }
      });
    } else {
      this.provincias = [];
      provinciaControl?.disable();
    }
  }

  setVehiculo(valor: string) {
    this.vehiculo = valor;
    this.form.patchValue({ vehiculo: valor });
  }

  onSubmit() {
    console.log('Datos del formulario:', this.form.value);
    if (this.form.valid) {
      // Guardar el nombre de la provincia en vez del id
      const formData = { ...this.form.value };
      const provObj = this.provincias.find(p => p.id == formData.provincia);
      formData.provincia = provObj ? provObj.nombre : formData.provincia;
      this.profesionales.push(formData);
      localStorage.setItem('ofrecimientoLaboralList', JSON.stringify(this.profesionales));
      alert('Formulario enviado correctamente!');
      this.form.reset();
      this.vehiculo = '';
    } else {
      this.form.markAllAsTouched();
    }
  }

  profesionalesFiltrados() {
    return this.profesionales.filter(prof => {
      const coincidePais = !this.filtroPais || prof.pais === this.filtroPais;
      const coincideProvincia = !this.filtroProvincia || prof.provincia == this.filtroProvincia;
      const coincideRubro = !this.filtroRubro || prof.rubro === this.filtroRubro;
      const texto = (this.filtroTexto || '').toLowerCase();
      const coincideTexto = !texto ||
        prof.nombre.toLowerCase().includes(texto) ||
        prof.apellidos.toLowerCase().includes(texto) ||
        prof.especializacion.toLowerCase().includes(texto);
      return coincidePais && coincideProvincia && coincideRubro && coincideTexto;
    });
  }

  getNombreProvincia(id: any): string {
    const prov = this.provincias.find(p => p.id == id);
    return prov ? prov.nombre : id;
  }

  getNombreRubro(codigo: any): string {
    const rubro = this.rubros.find(r => r.codigo == codigo);
    return rubro ? rubro.nombre : codigo;
  }
}

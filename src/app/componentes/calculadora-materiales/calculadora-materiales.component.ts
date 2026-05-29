import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CalculadoraMaterialesService,
  CalculoMaterialGuardado,
  TareaCalculadaResumen
} from '../../servicios/calculadora-materiales.service';
import { AppToastService } from '../../servicios/app-toast.service';

export interface Material {
  nombre: string;
  valor: number;
  icono?: string;
}

export interface Tarea {
  id: number;
  titulo: string;
  mezcla?: string;
  unidad: string;
  categoria: string;
  materiales: Material[];
}

export interface ResultadoMaterial {
  nombre: string;
  cantidad: number;
  icono: string;
  bolsas?: number;
  bolsasLabel?: string;
  detalleDias?: string;
}

interface TareaResumen {
  id: number;
  titulo: string;
  categoria: string;
  unidad: string;
  createdAt?: string;
}

type SaveStatus = 'saved' | 'dirty';

const ICONOS_MATERIALES: { icono: string; keywords: string[] }[] = [
  { icono: 'bi-building', keywords: ['cemento', 'hormigon', 'mortero'] },
  { icono: 'bi-droplet', keywords: ['cal', 'aditivo', 'hidrofugo'] },
  { icono: 'bi-gem', keywords: ['ripio', 'piedra', 'canto', 'grava', 'granito'] },
  { icono: 'bi-tree', keywords: ['madera', 'liston', 'tabl', 'viga', 'alfajia'] },
  { icono: 'bi-hourglass', keywords: ['arena', 'relleno'] },
  { icono: 'bi-droplet-fill', keywords: ['agua'] },
  { icono: 'bi-person-badge', keywords: ['hrs oficial', 'oficial'] },
  { icono: 'bi-person', keywords: ['hrs ayudante', 'ayudante'] },
  { icono: 'bi-palette', keywords: ['pintura', 'latex', 'barniz', 'sellador', 'aguarras', 'asfaltic'] },
  { icono: 'bi-brush', keywords: ['yeso', 'pastina'] },
  { icono: 'bi-bricks', keywords: ['ladrillo', 'bloque', 'bobedilla', 'bovedilla', 'teja', 'ceramico', 'mosaico'] },
  { icono: 'bi-grid', keywords: ['malla', 'vigueta', 'alambre', 'hierro'] },
  { icono: 'bi-tools', keywords: ['clavo', 'metal desplegado', 'pegamento', 'membrana'] },
  { icono: 'bi-paint-bucket', keywords: ['ferrite', 'antioxido'] },
  { icono: 'bi-box', keywords: [] },
];

const TAREAS: Tarea[] = [
  {
    id: 1, titulo: 'CIMIENTOS - Hormigón de ripio', mezcla: '1:12', unidad: 'm³', categoria: 'Cimientos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 133 },
      { nombre: 'Ripio Bruto, piedra partida (M3)', valor: 1.20 },
    ]
  },
  {
    id: 2, titulo: 'CIMIENTOS - Hormigón ciclopeo', mezcla: '1:5:8', unidad: 'm³', categoria: 'Cimientos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 126 },
      { nombre: 'Piedra bola, canto rodado (M3)', valor: 0.50 },
      { nombre: 'Ripio bruto, piedra partida (M3)', valor: 0.75 },
      { nombre: 'Hrs Oficial', valor: 0.80 },
      { nombre: 'Hrs Ayudante', valor: 3.50 },
    ]
  },
  {
    id: 3, titulo: 'CAPA AISLADORA - Horizontal espesor 2cm', mezcla: '1:2', unidad: 'm²', categoria: 'Capas Aisladoras',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 16 },
      { nombre: 'Arena media (M3)', valor: 0.03 },
      { nombre: 'Hidrófugo (KG)', valor: 0.50 },
      { nombre: 'Pintura asfaltica (L)', valor: 1 },
      { nombre: 'Hrs Oficial', valor: 0.30 },
      { nombre: 'Hrs Ayudante', valor: 0.15 },
    ]
  },
  {
    id: 4, titulo: 'CAPA AISLADORA - Vertical espesor 2cm', unidad: 'm²', categoria: 'Capas Aisladoras',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 16 },
      { nombre: 'Arena mediana (M3)', valor: 0.03 },
      { nombre: 'Pintura asfaltica (L)', valor: 1 },
      { nombre: 'Membrana (M2)', valor: 1.10 },
      { nombre: 'Hrs Oficial', valor: 1.20 },
      { nombre: 'Hrs Ayudante', valor: 0.90 },
    ]
  },
  {
    id: 5, titulo: 'MAMPOSTERÍA 0,30 - Ladrillos comunes submuración', mezcla: '1:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 42 },
      { nombre: 'Arena gruesa (M3)', valor: 0.13 },
      { nombre: 'Cal (KG)', valor: 14 },
      { nombre: 'Ladrillos comunes', valor: 105 },
      { nombre: 'Hrs Oficial', valor: 1.95 },
      { nombre: 'Hrs Ayudante', valor: 2.20 },
    ]
  },
  {
    id: 6, titulo: 'MAMPOSTERÍA 0,30 - Ladrillos comunes elevación', mezcla: '1/8:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 6 },
      { nombre: 'Arena gruesa (M3)', valor: 0.14 },
      { nombre: 'Cal (KG)', valor: 16 },
      { nombre: 'Ladrillos comunes', valor: 105 },
      { nombre: 'Hrs Oficial', valor: 1.95 },
      { nombre: 'Hrs Ayudante', valor: 2.20 },
    ]
  },
  {
    id: 7, titulo: 'MAMPOSTERÍA 0,30 - Ladrillos comunes seleccionados vista', mezcla: '1/8:1:4 / 1:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 14 },
      { nombre: 'Cal (KG)', valor: 15 },
      { nombre: 'Arena gruesa (M3)', valor: 0.13 },
      { nombre: 'Ladrillos comunes', valor: 105 },
      { nombre: 'Hrs Oficial', valor: 1.65 },
      { nombre: 'Hrs Ayudante', valor: 1.80 },
    ]
  },
  {
    id: 8, titulo: 'MAMPOSTERÍA 0,15 - Ladrillos comunes elevación', mezcla: '1/8:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 3 },
      { nombre: 'Cal (KG)', valor: 8 },
      { nombre: 'Arena Gruesa (M3)', valor: 0.07 },
      { nombre: 'Ladrillos comunes', valor: 55 },
      { nombre: 'Hrs Oficial', valor: 0.93 },
      { nombre: 'Hrs Ayudante', valor: 0.93 },
    ]
  },
  {
    id: 9, titulo: 'MAMPOSTERÍA 0,15 - Ladrillos comunes seleccionados vista', mezcla: '1/8:1:4 / 1:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.5 },
      { nombre: 'Cal (KG)', valor: 4 },
      { nombre: 'Arena gruesa (M3)', valor: 0.03 },
      { nombre: 'Ladrillos comunes', valor: 55 },
      { nombre: 'Hrs Oficial', valor: 1.30 },
      { nombre: 'Hrs Ayudante', valor: 0.93 },
    ]
  },
  {
    id: 10, titulo: 'MAMPOSTERÍA 0,10 - Ladrillos huecos 8x18x25 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.83 },
      { nombre: 'Cal (KG)', valor: 2 },
      { nombre: 'Arena gruesa (M3)', valor: 0.01 },
      { nombre: 'Ladrillos huecos 8x18x25', valor: 21 },
      { nombre: 'Hrs Oficial', valor: 0.80 },
      { nombre: 'Hrs Ayudante', valor: 0.60 },
    ]
  },
  {
    id: 11, titulo: 'MAMPOSTERÍA 0,10 - Ladrillos huecos 8x18x33 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.83 },
      { nombre: 'Cal (KG)', valor: 2 },
      { nombre: 'Arena gruesa (M3)', valor: 0.01 },
      { nombre: 'Ladrillos huecos 8x12x33', valor: 16 },
      { nombre: 'Hrs Oficial', valor: 0.77 },
      { nombre: 'Hrs Ayudante', valor: 0.58 },
    ]
  },
  {
    id: 12, titulo: 'MAMPOSTERÍA 0,15 - Ladrillos huecos 12x18x25 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 2.66 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Cal (KG)', valor: 3 },
      { nombre: 'Ladrillos huecos 12x18x25', valor: 21 },
      { nombre: 'Hrs Oficial', valor: 1.02 },
      { nombre: 'Hrs Ayudante', valor: 0.76 },
    ]
  },
  {
    id: 13, titulo: 'MAMPOSTERÍA 0,15 - Ladrillos huecos 12x18x33 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 2.66 },
      { nombre: 'Cal (KG)', valor: 3 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Ladrillos huecos 12x18x33', valor: 16 },
      { nombre: 'Hrs Oficial', valor: 0.92 },
      { nombre: 'Hrs Ayudante', valor: 0.69 },
    ]
  },
  {
    id: 14, titulo: 'MAMPOSTERÍA 0,20 - Ladrillos huecos 18x18x33 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 4 },
      { nombre: 'Cal (KG)', valor: 4.5 },
      { nombre: 'Arena gruesa (M3)', valor: 0.03 },
      { nombre: 'Ladrillos huecos 18x18x33', valor: 16 },
      { nombre: 'Hrs Oficial', valor: 1.07 },
      { nombre: 'Hrs Ayudante', valor: 0.80 },
    ]
  },
  {
    id: 15, titulo: 'MAMPOSTERÍA 0,20 - Ladrillos huecos Portante 18x19x33 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 2.50 },
      { nombre: 'Cal (KG)', valor: 2.80 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Ladrillos huecos (Portante) 18x19x33', valor: 15 },
      { nombre: 'Hrs Oficial', valor: 1.15 },
      { nombre: 'Hrs Ayudante', valor: 0.86 },
    ]
  },
  {
    id: 16, titulo: 'MAMPOSTERÍA 0,20 - Bloques Hormigón 20x20x40 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 6 },
      { nombre: 'Cal (KG)', valor: 3.5 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Bloques de Hormigón 20x20x40', valor: 13 },
      { nombre: 'Hrs Oficial', valor: 1 },
      { nombre: 'Hrs Ayudante', valor: 1 },
    ]
  },
  {
    id: 17, titulo: 'MAMPOSTERÍA 0,10 - Bloques Hormigón 10x20x40 elevación', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Mampostería',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 3 },
      { nombre: 'Cal (KG)', valor: 1.75 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Bloques de Hormigón 10x20x40', valor: 13 },
      { nombre: 'Hrs Oficial', valor: 0.65 },
      { nombre: 'Hrs Ayudante', valor: 0.50 },
    ]
  },
  {
    id: 18, titulo: 'ESTRUCTURAS H.A. - Zapatas', mezcla: '3/4:2:3', unidad: 'm³', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 250 },
      { nombre: 'Arena gruesa (M3)', valor: 0.50 },
      { nombre: 'Ripio (1:3)', valor: 0.75 },
      { nombre: 'Hierro torsionado (KG)', valor: 30 },
      { nombre: 'Alambre N°16 (KG)', valor: 0.25 },
      { nombre: 'Hrs Oficial', valor: 3.50 },
      { nombre: 'Hrs Ayudante', valor: 7.20 },
    ]
  },
  {
    id: 19, titulo: 'ESTRUCTURAS H.A. - Columnas', mezcla: '1:2:3', unidad: 'm³', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 326 },
      { nombre: 'Arena gruesa (M3)', valor: 0.50 },
      { nombre: 'Ripio (1:3)', valor: 0.75 },
      { nombre: 'Hierro torsionado (KG)', valor: 100 },
      { nombre: 'Alambre N°16 (KG)', valor: 1 },
      { nombre: 'Clavos (KG)', valor: 2 },
      { nombre: 'Hrs Oficial', valor: 24.30 },
      { nombre: 'Hrs Ayudante', valor: 23.30 },
    ]
  },
  {
    id: 20, titulo: 'ESTRUCTURAS H.A. - Vigas', mezcla: '1:2:3', unidad: 'm³', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 326 },
      { nombre: 'Arena gruesa (M3)', valor: 0.50 },
      { nombre: 'Ripio (1:3)', valor: 0.75 },
      { nombre: 'Hierro torsionado (KG)', valor: 90 },
      { nombre: 'Alambre N°16 (KG)', valor: 1 },
      { nombre: 'Clavos (KG)', valor: 3 },
      { nombre: 'Hrs Oficial', valor: 23.70 },
      { nombre: 'Hrs Ayudante', valor: 20.30 },
    ]
  },
  {
    id: 21, titulo: 'ESTRUCTURAS H.A. - Encadenados', mezcla: '1:2:3', unidad: 'm³', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 326 },
      { nombre: 'Arena gruesa (M3)', valor: 0.50 },
      { nombre: 'Ripio (1:3)', valor: 0.75 },
      { nombre: 'Hierro torsionado (KG)', valor: 80 },
      { nombre: 'Alambre N°16 (KG)', valor: 0.80 },
      { nombre: 'Clavos (KG)', valor: 1 },
      { nombre: 'Hrs Oficial', valor: 17 },
      { nombre: 'Hrs Ayudante', valor: 14 },
    ]
  },
  {
    id: 22, titulo: 'ESTRUCTURAS H.A. - Encadenados sección 20x20cm', mezcla: '1:2:3', unidad: 'ml', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 13 },
      { nombre: 'Arena gruesa (M3)', valor: 0.02 },
      { nombre: 'Ripio (1:3)', valor: 0.03 },
      { nombre: 'Hierro torsionado (KG)', valor: 3.20 },
      { nombre: 'Alambre N°16 (KG)', valor: 0.03 },
      { nombre: 'Clavos (KG)', valor: 0.04 },
      { nombre: 'Hrs Oficial', valor: 0.68 },
      { nombre: 'Hrs Ayudante', valor: 0.56 },
    ]
  },
  {
    id: 23, titulo: 'ESTRUCTURAS H.A. - Losas llenas', mezcla: '1:2:3', unidad: 'm³', categoria: 'Estructuras H.A.',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 326 },
      { nombre: 'Arena gruesa (M3)', valor: 0.50 },
      { nombre: 'Ripio (1:3)', valor: 0.75 },
      { nombre: 'Hierro torsionado (KG)', valor: 40 },
      { nombre: 'Alambre N°16 (KG)', valor: 0.60 },
      { nombre: 'Clavos (KG)', valor: 2 },
      { nombre: 'Hrs Oficial', valor: 17.30 },
      { nombre: 'Hrs Ayudante', valor: 15.10 },
    ]
  },
  {
    id: 24, titulo: 'LOSAS VIGUETAS - Bovedilla h:9,5cm', mezcla: 'comp. 1:2:3', unidad: 'm²', categoria: 'Losas Viguetas',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 19 },
      { nombre: 'Arena gruesa (M3)', valor: 0.03 },
      { nombre: 'Ripio (1:3) m3', valor: 0.04 },
      { nombre: 'Viguetas mt', valor: 2 },
      { nombre: 'Bovedillas 9,5cm U', valor: 8 },
      { nombre: 'Malla 4,2 x 15 x 15 m2', valor: 1.10 },
      { nombre: 'Hrs Oficial', valor: 0.48 },
      { nombre: 'Hrs Ayudante', valor: 1.59 },
    ]
  },
  {
    id: 25, titulo: 'LOSAS VIGUETAS - Bovedilla h:12,5cm', mezcla: 'comp. 1:2:3', unidad: 'm²', categoria: 'Losas Viguetas',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 22 },
      { nombre: 'Arena gruesa (M3)', valor: 0.03 },
      { nombre: 'Ripio (1:3) m3', valor: 0.05 },
      { nombre: 'Viguetas m', valor: 2 },
      { nombre: 'Bovedillas 12,5cm U', valor: 8 },
      { nombre: 'Malla 4,2 x 15 x 15 m2', valor: 1.10 },
      { nombre: 'Hrs Oficial', valor: 0.59 },
      { nombre: 'Hrs Ayudante', valor: 1.95 },
    ]
  },
  {
    id: 26, titulo: 'LOSAS VIGUETAS - Bovedilla h:17,5cm', mezcla: 'comp. 1:2:3', unidad: 'm²', categoria: 'Losas Viguetas',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 27 },
      { nombre: 'Arena gruesa (M3)', valor: 0.04 },
      { nombre: 'Ripio (1:3) m3', valor: 0.06 },
      { nombre: 'Viguetas m', valor: 2 },
      { nombre: 'Bovedillas 17,5cm U', valor: 8 },
      { nombre: 'Malla 4,2 x 15 x 15 m2', valor: 1.10 },
      { nombre: 'Hrs Oficial', valor: 1.15 },
      { nombre: 'Hrs Ayudante', valor: 2.30 },
    ]
  },
  {
    id: 27, titulo: 'REVOQUES - Grueso interior 2cm', mezcla: '1/4:2:5', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.50 },
      { nombre: 'Cal (KG)', valor: 3.85 },
      { nombre: 'Arena Mediana (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 0.50 },
      { nombre: 'Hrs Ayudante', valor: 0.25 },
    ]
  },
  {
    id: 28, titulo: 'REVOQUES - Grueso exterior 2cm', mezcla: '1/2:2:5', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 2.80 },
      { nombre: 'Cal (KG)', valor: 3.85 },
      { nombre: 'Arena Mediana (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 0.50 },
      { nombre: 'Hrs Ayudante', valor: 0.25 },
    ]
  },
  {
    id: 29, titulo: 'REVOQUES - Fino interior 0,5cm', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.05 },
      { nombre: 'Cal (KG)', valor: 0.67 },
      { nombre: 'Arena fina (M3)', valor: 0.01 },
      { nombre: 'Hrs Oficial', valor: 0.40 },
      { nombre: 'Hrs Ayudante', valor: 0.20 },
    ]
  },
  {
    id: 30, titulo: 'REVOQUES - Fino exterior 0,5cm', mezcla: '1/2:1:3', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 1.26 },
      { nombre: 'Cal (KG)', valor: 0.03 },
      { nombre: 'Arena fina (M3)', valor: 0.01 },
      { nombre: 'Hrs Oficial', valor: 0.40 },
      { nombre: 'Hrs Ayudante', valor: 0.20 },
    ]
  },
  {
    id: 31, titulo: 'REVOQUES - Exterior rústico bolsa 3cm', mezcla: '1/2:1:4', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 4.10 },
      { nombre: 'Cal (KG)', valor: 5.40 },
      { nombre: 'Arena mediana (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 0.60 },
      { nombre: 'Hrs Ayudante', valor: 0.40 },
    ]
  },
  {
    id: 32, titulo: 'REVOQUES - Fino predosificado 0,3cm', mezcla: 'predosificada', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Mezcla predosificada (KG)', valor: 3 },
      { nombre: 'Hrs Oficial', valor: 0.60 },
      { nombre: 'Hrs Ayudante', valor: 0.30 },
    ]
  },
  {
    id: 33, titulo: 'REVOQUES - Alisado cemento vertical', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 14 },
      { nombre: 'Arena fina (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 1.47 },
      { nombre: 'Hrs Ayudante', valor: 0.60 },
    ]
  },
  {
    id: 34, titulo: 'REVOQUES - Azotado cementicio 2cm', unidad: 'm²', categoria: 'Revoques',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 10.40 },
      { nombre: 'Arena mediana (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 0.40 },
      { nombre: 'Hrs Ayudante', valor: 0.25 },
    ]
  },
  {
    id: 35, titulo: 'CONTRAPISOS - Hormigón de ripio 10cm', mezcla: '1:7', unidad: 'm²', categoria: 'Contrapisos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 22 },
      { nombre: 'Ripio bruto (M3)', valor: 0.12 },
      { nombre: 'Hrs Oficial', valor: 0.25 },
      { nombre: 'Hrs Ayudante', valor: 0.75 },
    ]
  },
  {
    id: 36, titulo: 'CARPETA CEMENTICIA - 2cm', mezcla: '1:4', unidad: 'm²', categoria: 'Contrapisos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 8.20 },
      { nombre: 'Arena mediana (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 0.50 },
      { nombre: 'Hrs Ayudante', valor: 0.30 },
    ]
  },
  {
    id: 37, titulo: 'PISOS - Cemento alisado coloreado 2cm', mezcla: '1:3', unidad: 'm²', categoria: 'Pisos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 12 },
      { nombre: 'Arena fina (M3)', valor: 0.03 },
      { nombre: 'Ferrite (KG)', valor: 0.05 },
      { nombre: 'Hrs Oficial', valor: 0.60 },
      { nombre: 'Hrs Ayudante', valor: 0.30 },
    ]
  },
  {
    id: 38, titulo: 'PISOS - Mosaico calcáreo / granítico', mezcla: '1/4:1:4', unidad: 'm²', categoria: 'Pisos',
    materiales: [
      { nombre: 'Mosaico (M2)', valor: 1.05 },
      { nombre: 'Cemento (KG)', valor: 2.00 },
      { nombre: 'Cal (KG)', valor: 2.90 },
      { nombre: 'Arena gruesa (M3)', valor: 0.03 },
      { nombre: 'Hrs Oficial', valor: 1.00 },
      { nombre: 'Hrs Ayudante', valor: 0.50 },
    ]
  },
  {
    id: 39, titulo: 'PISOS - Cerámico con pegamento', unidad: 'm²', categoria: 'Pisos',
    materiales: [
      { nombre: 'Cerámico (M2)', valor: 1.05 },
      { nombre: 'Pegamento (KG)', valor: 4.00 },
      { nombre: 'Pastina (KG)', valor: 0.40 },
      { nombre: 'Hrs Oficial', valor: 0.80 },
      { nombre: 'Hrs Ayudante', valor: 0.40 },
    ]
  },
  {
    id: 40, titulo: 'CIELORRASOS - A la cal bajo losa 2,5cm', unidad: 'm²', categoria: 'Cielorrasos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 2.5 },
      { nombre: 'Cal (KG)', valor: 4.50 },
      { nombre: 'Arena Mediana (M3)', valor: 0.03 },
      { nombre: 'Arena Fina (M3)', valor: 0.01 },
      { nombre: 'Hrs Oficial', valor: 1.30 },
      { nombre: 'Hrs Ayudante', valor: 0.25 },
    ]
  },
  {
    id: 41, titulo: 'CIELORRASOS - Yeso bajo losa', mezcla: 'castigado 1:4', unidad: 'm²', categoria: 'Cielorrasos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 3 },
      { nombre: 'Yeso Blanco (KG)', valor: 3 },
      { nombre: 'Yeso Negro (KG)', valor: 4.51 },
      { nombre: 'Arena Mediana (M3)', valor: 0.00 },
      { nombre: 'Hrs Oficial', valor: 1.80 },
      { nombre: 'Hrs Ayudante', valor: 0.90 },
    ]
  },
  {
    id: 42, titulo: 'CIELORRASOS - A la cal suspendido metal desplegado', mezcla: '1:4 / 1/4:2:5 / 1/2:1:4', unidad: 'm²', categoria: 'Cielorrasos',
    materiales: [
      { nombre: 'Cemento (KG)', valor: 5 },
      { nombre: 'Cal (KG)', valor: 4.50 },
      { nombre: 'Arena Mediana (M3)', valor: 0.03 },
      { nombre: 'Arena Fina (M3)', valor: 0.01 },
      { nombre: 'Metal desplegado m2', valor: 1.25 },
      { nombre: 'Alfajías (1" x 4") pie 2', valor: 1.73 },
      { nombre: 'Listones (1" x 1 1/2") pie 2', valor: 2.75 },
      { nombre: 'Alambre Negro (KG)', valor: 0.10 },
      { nombre: 'Hrs Oficial', valor: 2.40 },
      { nombre: 'Hrs Ayudante', valor: 1.50 },
    ]
  },
  {
    id: 43, titulo: 'PINTURA - Rendimiento por litro x 2 manos', unidad: 'm²', categoria: 'Pintura',
    materiales: [
      { nombre: 'Latex (L)', valor: 0.14 },
      { nombre: 'Sellador 1 mano (L)', valor: 0.10 },
      { nombre: 'Agua tipo "Cremar" (L)', valor: 0.25 },
      { nombre: 'Sintético sobre madera (L)', valor: 0.14 },
      { nombre: 'Sintético sobre metal (L)', valor: 0.14 },
      { nombre: 'Sellador diluido (L)', valor: 0.15 },
      { nombre: 'Antióxido (L)', valor: 0.10 },
      { nombre: 'Barniz (L)', valor: 0.17 },
      { nombre: 'Aguarrás (L)', valor: 0.08 },
    ]
  },
  {
    id: 44, titulo: 'CUBIERTAS - Tejas coloniales sobre losa', mezcla: '1/4:3:5', unidad: 'm²', categoria: 'Cubiertas',
    materiales: [
      { nombre: 'Tejas colonial 435x195x145 (N°)', valor: 27 },
      { nombre: 'Tejas francesa 425x225 (N°)', valor: 14 },
      { nombre: 'Tejas romana 435x280 (N°)', valor: 11.4 },
      { nombre: 'Arena mediana (M3)', valor: 0.03 },
      { nombre: 'Pintura asfaltica (L)', valor: 2 },
      { nombre: 'Cemento (KG)', valor: 1.90 },
      { nombre: 'Cal (KG)', valor: 13 },
      { nombre: 'Hrs Oficial', valor: 0.80 },
      { nombre: 'Hrs Ayudante', valor: 1.00 },
    ]
  },
];

export const CATEGORIAS = [...new Set(TAREAS.map(t => t.categoria))];

const DEMO_HISTORY_STORAGE_KEY = 'demoCalculadoraHistorial';
const DEMO_DAILY_USAGE_STORAGE_KEY = 'demoCalculadoraDailyUsage';
const DEMO_TASK_LIMIT = 3;
const DEMO_HISTORY_LIMIT = 3;
const DEMO_DAILY_CALC_LIMIT = 3;
const USER_HISTORY_LIMIT = 10;
const USER_LATEST_TASKS_LIMIT = 5;
const VIP_PINS_STORAGE_KEY = 'vipCalculadoraPins';

function cargarHistorialDemoDesdeStorage(): CalculoMaterialGuardado[] {
  try {
    const raw = localStorage.getItem(DEMO_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function guardarHistorialDemoEnStorage(historial: CalculoMaterialGuardado[]): void {
  try {
    localStorage.setItem(DEMO_HISTORY_STORAGE_KEY, JSON.stringify(historial.slice(0, DEMO_HISTORY_LIMIT)));
  } catch (e) {
    console.warn('[Calculadora] No se pudo guardar el historial demo en localStorage:', e);
  }
}

function getCurrentDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function cargarUsoDiarioDemoDesdeStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DEMO_DAILY_USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

function guardarUsoDiarioDemoEnStorage(usage: Record<string, number>): void {
  try {
    localStorage.setItem(DEMO_DAILY_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn('[Calculadora] No se pudo guardar el uso diario demo en localStorage:', e);
  }
}

function cargarPinIdsDesdeStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(VIP_PINS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x: unknown) => typeof x === 'number')) : new Set();
  } catch {
    return new Set();
  }
}

function guardarPinIdsEnStorage(ids: Set<number>): void {
  try {
    localStorage.setItem(VIP_PINS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch (e) {
    console.warn('[Calculadora] No se pudo guardar los pins en localStorage:', e);
  }
}

function seleccionarTareasAleatorias(limit: number): Tarea[] {
  const shuffled = [...TAREAS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(limit, shuffled.length));
}

function construirResumenesDesdeHistorial(
  historial: CalculoMaterialGuardado[],
  limit: number
): TareaResumen[] {
  const seen = new Set<number>();
  const resumenes: TareaResumen[] = [];

  for (const calculo of historial) {
    if (seen.has(calculo.tareaId)) {
      continue;
    }
    seen.add(calculo.tareaId);
    resumenes.push({
      id: calculo.tareaId,
      titulo: calculo.tareaTitulo,
      categoria: calculo.categoria,
      unidad: calculo.unidad,
      createdAt: calculo.createdAt
    });
    if (resumenes.length >= limit) {
      break;
    }
  }

  return resumenes;
}

@Component({
  selector: 'app-calculadora-materiales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculadora-materiales.component.html',
  styleUrl: './calculadora-materiales.component.scss'
})
export class CalculadoraMaterialesComponent implements OnInit {
  readonly categorias = CATEGORIAS;
  readonly isTrialMode = localStorage.getItem('trialMode') === 'true';
  readonly userCode = (localStorage.getItem('userCode') || '').trim();
  readonly userEmail = (localStorage.getItem('userEmail') || '').trim();
  readonly userDisplayName = this.buildUserDisplayName();
  readonly userModeLabel = this.isTrialMode ? 'Modo de prueba' : 'Modo VIP';

  searchTerm = signal('');
  expandedIds = signal<Set<number>>(new Set());
  inputValues = signal<Record<number, number | null>>({});
  resultados = signal<Record<number, ResultadoMaterial[]>>({});
  sidebarOpen = signal(false);
  ultimasTareasOpen = signal(false);
  historialOpen = signal(false);
  welcomeModalOpen = signal(true);
  tareasVisibles = signal<Tarea[]>(this.isTrialMode ? seleccionarTareasAleatorias(DEMO_TASK_LIMIT) : TAREAS);
  ultimasTareas = signal<TareaResumen[]>([]);
  historialCalculos = signal<CalculoMaterialGuardado[]>([]);
  saveStatus = signal<Record<number, SaveStatus | undefined>>({});
  savedCalculosByTask = signal<Record<number, CalculoMaterialGuardado | undefined>>({});
  demoDailyCalculationsUsed = signal(this.isTrialMode ? this.getDemoDailyUsageCount() : 0);
  pinnedIds = signal<Set<number>>(this.isTrialMode ? new Set<number>() : cargarPinIdsDesdeStorage());

  private readonly HISTORIAL_PAGE_SIZE = 5;
  historialPage = signal(1);
  historialTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.historialCalculos().length / this.HISTORIAL_PAGE_SIZE))
  );
  historialPaginado = computed(() => {
    const start = (this.historialPage() - 1) * this.HISTORIAL_PAGE_SIZE;
    return this.historialCalculos().slice(start, start + this.HISTORIAL_PAGE_SIZE);
  });

  filteredTasks = computed(() => {
    const term = this.normalizar(this.searchTerm());
    const tasks = this.tareasVisibles();
    if (!term) return tasks;
    return tasks.filter(t =>
      this.normalizar(t.titulo).includes(term) ||
      this.normalizar(t.categoria).includes(term) ||
      (t.mezcla && this.normalizar(t.mezcla).includes(term))
    );
  });

  constructor(
    private calculadoraMaterialesService: CalculadoraMaterialesService,
    private toast: AppToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Always clear stale data from any previous session first
    this.historialCalculos.set([]);
    this.ultimasTareas.set([]);
    this.savedCalculosByTask.set({});

    // Re-read trialMode from localStorage at init time to guard against stale readonly field
    const currentlyTrialMode = this.isTrialMode || localStorage.getItem('trialMode') === 'true';

    if (currentlyTrialMode) {
      const historialDemo = cargarHistorialDemoDesdeStorage().slice(0, DEMO_HISTORY_LIMIT);
      this.historialCalculos.set(historialDemo);
      this.ultimasTareas.set(construirResumenesDesdeHistorial(historialDemo, DEMO_HISTORY_LIMIT));
      this.syncSavedCalculosByTask(historialDemo);
      return;
    }

    if (!this.userCode) {
      return;
    }

    this.cargarHistorialBackend();
    this.cargarUltimasTareasBackend();
  }

  filteredByCategoria(cat: string): Tarea[] {
    return this.filteredTasks().filter(t => t.categoria === cat);
  }

  isCategoriaVisible(cat: string): boolean {
    return this.filteredByCategoria(cat).length > 0;
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: number): void {
    const set = new Set(this.expandedIds());
    set.has(id) ? set.delete(id) : set.add(id);
    this.expandedIds.set(set);
  }

  getInputValue(id: number): number | null {
    return this.inputValues()[id] ?? null;
  }

  setInputValue(id: number, value: number | null): void {
    this.inputValues.update(v => ({ ...v, [id]: value }));
  }

  calcular(tarea: Tarea): void {
    const val = this.getInputValue(tarea.id);
    if (val === null || isNaN(val) || val <= 0) return;
    if (this.isTrialMode && this.isTrialCalculationLimitReached()) {
      this.toast.warning(
        'Ya alcanzaste el límite de 3 cálculos diarios en el modo de prueba. Volvé mañana o pasá al modo VIP.',
        'Límite diario alcanzado'
      );
      return;
    }

    const resultados: ResultadoMaterial[] = tarea.materiales.map(m => {
      const cantidad = m.valor * val;
      const res: ResultadoMaterial = {
        nombre: m.nombre,
        cantidad,
        icono: this.getIcono(m.nombre, m.icono),
        detalleDias: this.getDetalleDias(m.nombre, cantidad),
      };
      if (m.nombre === 'Cemento (KG)') {
        res.bolsas = Math.ceil(cantidad / 50);
        res.bolsasLabel = 'bolsas 50kg';
      } else if (['Cal (KG)', 'Yeso Negro (KG)', 'Yeso Blanco (KG)'].some(n => m.nombre.includes(n.split(' ')[0]) && m.nombre.includes('KG'))) {
        if (m.nombre.toLowerCase().includes('cal') || m.nombre.toLowerCase().includes('yeso')) {
          res.bolsas = Math.ceil(cantidad / 25);
          res.bolsasLabel = 'bolsas 25kg';
        }
      }
      return res;
    });

    this.resultados.update(r => ({ ...r, [tarea.id]: resultados }));
    const set = new Set(this.expandedIds());
    set.add(tarea.id);
    this.expandedIds.set(set);
    this.saveStatus.update(status => ({ ...status, [tarea.id]: 'dirty' }));
    if (this.isTrialMode) {
      this.registerDemoCalculationUsage();
    }

    // Auto-guardar sin confirmación
    this.persistirCalculo(tarea, val, resultados);
  }

  async confirmarBorrado(id: number): Promise<void> {
    if (!this.hasResultados(id) && this.getInputValue(id) === null) {
      return;
    }

    const hasPersisted = !!this.savedCalculosByTask()[id];
    const confirmed = await this.toast.confirm(
      hasPersisted
        ? 'Este cálculo se eliminará de la vista actual y también del historial guardado.'
        : 'Se limpiará el resultado calculado de esta tarea.'
    );
    if (!confirmed) {
      return;
    }

    this.eliminarCalculo(id);
  }

  borrar(id: number): void {
    this.inputValues.update(v => ({ ...v, [id]: null }));
    this.resultados.update(r => {
      const copy = { ...r };
      delete copy[id];
      return copy;
    });
    this.saveStatus.update(status => {
      const copy = { ...status };
      delete copy[id];
      return copy;
    });
  }

  hasResultados(id: number): boolean {
    return !!(this.resultados()[id]?.length);
  }

  getResultados(id: number): ResultadoMaterial[] {
    return this.resultados()[id] ?? [];
  }

  canGuardar(id: number): boolean {
    return this.hasResultados(id) && this.saveStatus()[id] === 'dirty';
  }

  isGuardado(id: number): boolean {
    return this.saveStatus()[id] === 'saved';
  }

  getDemoDailyUsageLabel(): string {
    if (!this.isTrialMode) {
      return '';
    }

    const usados = this.demoDailyCalculationsUsed();
    const restantes = Math.max(DEMO_DAILY_CALC_LIMIT - usados, 0);
    //return `Modo de prueba: ${usados}/${DEMO_DAILY_CALC_LIMIT} cálculos usados hoy. Te quedan ${restantes}.`;
    return `Modo de prueba: ${usados}/${DEMO_DAILY_CALC_LIMIT} cálculos usados hoy.`;
  }

  isTrialCalculationLimitReached(): boolean {
    return this.isTrialMode && this.demoDailyCalculationsUsed() >= DEMO_DAILY_CALC_LIMIT;
  }

  private normalizar(str: string): string {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  private getIcono(nombre: string, custom?: string): string {
    if (custom) return custom;
    const n = nombre.toLowerCase();
    for (const item of ICONOS_MATERIALES) {
      if (item.keywords.some(k => n.includes(k))) return item.icono;
    }
    return 'bi-box';
  }

  abrirSidebar(): void { this.sidebarOpen.set(true); }
  cerrarSidebar(): void { this.sidebarOpen.set(false); }
  abrirUltimasTareas(): void { this.cerrarSidebar(); this.ultimasTareasOpen.set(true); }
  cerrarUltimasTareas(): void { this.ultimasTareasOpen.set(false); }
  abrirHistorial(): void { this.cerrarSidebar(); this.historialPage.set(1); this.historialOpen.set(true); }
  cerrarHistorial(): void { this.historialOpen.set(false); }
  cerrarBienvenida(): void { this.welcomeModalOpen.set(false); }

  historialNextPage(): void {
    if (this.historialPage() < this.historialTotalPages()) {
      this.historialPage.update(p => p + 1);
    }
  }

  historialPrevPage(): void {
    if (this.historialPage() > 1) {
      this.historialPage.update(p => p - 1);
    }
  }
  goBack(): void {
    this.cerrarSidebar();
    this.router.navigate(['/dashboard']);
  }
  irAlDashboard(): void {
    this.cerrarSidebar();
    this.router.navigate(['/dashboard']);
  }
  trackHistorial(index: number, calculo: CalculoMaterialGuardado): string | number {
    return calculo.id ?? `${calculo.tareaId}-${calculo.createdAt ?? index}`;
  }

  irATarea(tarea: TareaResumen): void {
    this.cerrarUltimasTareas();
    this.searchTerm.set('');
    const calculoGuardado = this.resolverCalculoGuardado(tarea);
    if (calculoGuardado) {
      this.restaurarHistorial(calculoGuardado);
      return;
    }
    this.ensureTaskVisible(tarea.id);
    const set = new Set(this.expandedIds());
    set.add(tarea.id);
    this.expandedIds.set(set);
    setTimeout(() => {
      document.getElementById(`tarea-${tarea.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  restaurarHistorial(calculo: CalculoMaterialGuardado): void {
    this.cerrarUltimasTareas();
    this.cerrarHistorial();
    this.searchTerm.set('');
    this.ensureTaskVisible(calculo.tareaId);
    this.inputValues.update(values => ({ ...values, [calculo.tareaId]: calculo.valorIngresado }));
    this.resultados.update(actuales => ({
      ...actuales,
      [calculo.tareaId]: calculo.resultados
    }));
    const set = new Set(this.expandedIds());
    set.add(calculo.tareaId);
    this.expandedIds.set(set);
    this.saveStatus.update(status => ({ ...status, [calculo.tareaId]: 'saved' }));
    this.savedCalculosByTask.update(state => ({ ...state, [calculo.tareaId]: calculo }));
    setTimeout(() => {
      document.getElementById(`tarea-${calculo.tareaId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  confirmarGuardado(tarea: Tarea): void {
    const valorIngresado = this.getInputValue(tarea.id);
    const resultados = this.getResultados(tarea.id);

    if (valorIngresado === null || valorIngresado <= 0 || resultados.length === 0) {
      this.toast.warning('Primero debes calcular la tarea antes de poder guardarla.', 'Nada para guardar');
      return;
    }

    if (!this.canGuardar(tarea.id)) {
      this.toast.info('Ese cálculo ya está guardado o todavía no cambió.', 'Sin cambios');
      return;
    }

    this.persistirCalculo(tarea, valorIngresado, resultados);
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) {
      return '';
    }

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsed);
  }

  private persistirCalculo(tarea: Tarea, valorIngresado: number, resultados: ResultadoMaterial[]): void {
    const calculo: CalculoMaterialGuardado = {
      userCode: this.userCode || 'DEMO',
      tareaId: tarea.id,
      tareaTitulo: tarea.titulo,
      categoria: tarea.categoria,
      unidad: tarea.unidad,
      valorIngresado,
      resultados,
      createdAt: new Date().toISOString()
    };

    if (this.isTrialMode) {
      const historial = [calculo, ...this.historialCalculos()].slice(0, DEMO_HISTORY_LIMIT);
      this.historialCalculos.set(historial);
      this.ultimasTareas.set(construirResumenesDesdeHistorial(historial, DEMO_HISTORY_LIMIT));
      guardarHistorialDemoEnStorage(historial);
      this.saveStatus.update(status => ({ ...status, [tarea.id]: 'saved' }));
      this.savedCalculosByTask.update(state => ({ ...state, [tarea.id]: historial[0] }));
      return;
    }

    if (!this.userCode) {
      this.toast.error('No se encontró el código del usuario autenticado para guardar el cálculo.');
      return;
    }

    const historialActual = this.historialCalculos();
    if (historialActual.length >= USER_HISTORY_LIMIT) {
      const sinPin = historialActual
        .filter(c => !this.isPinned(c.id))
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      if (sinPin.length === 0) {
        this.toast.error(
          'Todos los cálculos están fijados 📌. Desfijá al menos uno para poder guardar un nuevo cálculo.',
          'Historial lleno'
        );
        return;
      }

      const masAntiguo = sinPin[0];
      if (!masAntiguo.id || masAntiguo.id < 0) {
        this.removeCalculoFromState(masAntiguo);
        this.guardarCalculoVip(tarea, calculo);
        return;
      }

      this.calculadoraMaterialesService.eliminarCalculo(masAntiguo.id, this.userCode).subscribe({
        next: () => {
          this.removeCalculoFromState(masAntiguo);
          this.guardarCalculoVip(tarea, calculo);
        },
        error: () => this.toast.error('No se pudo liberar espacio para guardar el nuevo cálculo.')
      });
      return;
    }

    this.guardarCalculoVip(tarea, calculo);
  }

  private guardarCalculoVip(tarea: Tarea, calculo: CalculoMaterialGuardado): void {
    this.calculadoraMaterialesService.guardarCalculo({
      ...calculo,
      userCode: this.userCode
    }).subscribe({
      next: saved => {
        const nuevoHistorial = [saved, ...this.historialCalculos()]
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, USER_HISTORY_LIMIT);
        this.historialCalculos.set(nuevoHistorial);
        this.historialPage.set(1);
        this.saveStatus.update(status => ({ ...status, [tarea.id]: 'saved' }));
        this.savedCalculosByTask.update(state => ({ ...state, [tarea.id]: saved }));

        if (nuevoHistorial.length >= USER_HISTORY_LIMIT) {
          this.toast.info(
            'Ya guardaste 10 cálculos. Fijá los que no querés perder con 📌. Al guardar otro se eliminará el más antiguo no fijado.',
            'Historial lleno'
          );
        }

        const isOfflineSave = (saved.id ?? 0) < 0;
        if (isOfflineSave) {
          this.agregarTareaAUltimasLocal(saved);
        } else {
          this.cargarUltimasTareasBackend();
        }
      },
      error: () => this.toast.error('No se pudo guardar el cálculo. Intenta nuevamente.')
    });
  }

  private removeCalculoFromState(calculo: CalculoMaterialGuardado): void {
    const historial = this.historialCalculos().filter(c => !this.isSameCalculo(c, calculo));
    this.historialCalculos.set(historial);
    this.syncSavedCalculosByTask(historial);
    if (calculo.tareaId) this.borrar(calculo.tareaId);
  }

  private cargarHistorialBackend(): void {
    this.calculadoraMaterialesService.obtenerHistorial(this.userCode, USER_HISTORY_LIMIT).subscribe({
      next: historial => {
        const resultado = historial.slice(0, USER_HISTORY_LIMIT);
        this.historialCalculos.set(resultado);
        this.historialPage.set(1);
        this.syncSavedCalculosByTask(resultado);
      },
      error: () => {
        if (this.historialCalculos().length === 0) {
          this.toast.warning('No se pudo cargar el historial. Revisá tu conexión.', 'Historial');
        }
      }
    });
  }

  private cargarUltimasTareasBackend(): void {
    this.calculadoraMaterialesService.obtenerUltimasTareas(this.userCode, USER_LATEST_TASKS_LIMIT).subscribe({
      next: tareas => this.ultimasTareas.set(this.mapearResumenes(tareas)),
      error: () => {
        if (this.ultimasTareas().length === 0) {
          this.toast.warning('No se pudieron cargar las últimas tareas.', 'Calculadora');
        }
      }
    });
  }

  private mapearResumenes(tareas: TareaCalculadaResumen[]): TareaResumen[] {
    return tareas.map(t => ({
      id: t.tareaId,
      titulo: t.tareaTitulo,
      categoria: t.categoria,
      unidad: t.unidad,
      createdAt: t.lastCalculatedAt
    }));
  }

  private agregarTareaAUltimasLocal(calculo: CalculoMaterialGuardado): void {
    const nuevaEntrada: TareaResumen = {
      id: calculo.tareaId,
      titulo: calculo.tareaTitulo,
      categoria: calculo.categoria,
      unidad: calculo.unidad,
      createdAt: calculo.createdAt ?? new Date().toISOString()
    };
    const actuales = this.ultimasTareas().filter(t => t.id !== calculo.tareaId);
    this.ultimasTareas.set([nuevaEntrada, ...actuales].slice(0, USER_LATEST_TASKS_LIMIT));
  }

  private ensureTaskVisible(taskId: number): void {
    if (this.tareasVisibles().some(t => t.id === taskId)) {
      return;
    }

    const task = TAREAS.find(t => t.id === taskId);
    if (!task) {
      return;
    }

    this.tareasVisibles.update(actuales => [task, ...actuales]);
  }

  private eliminarCalculo(taskId: number): void {
    const persisted = this.savedCalculosByTask()[taskId];

    if (!persisted) {
      this.borrar(taskId);
      this.toast.success('El cálculo se eliminó de la vista actual.', 'Cálculo borrado');
      return;
    }

    if (this.isTrialMode) {
      const historial = this.historialCalculos().filter(calculo => !this.isSameCalculo(calculo, persisted));
      this.historialCalculos.set(historial);
      this.ultimasTareas.set(construirResumenesDesdeHistorial(historial, DEMO_HISTORY_LIMIT));
      guardarHistorialDemoEnStorage(historial);
      this.savedCalculosByTask.update(state => {
        const copy = { ...state };
        delete copy[taskId];
        return copy;
      });
      this.borrar(taskId);
      this.toast.success('El cálculo se eliminó del historial local.', 'Cálculo borrado');
      return;
    }

    if (!persisted.id || !this.userCode) {
      this.borrar(taskId);
      this.toast.warning('Se limpió la vista, pero no se pudo identificar el cálculo guardado.');
      return;
    }

    this.calculadoraMaterialesService.eliminarCalculo(persisted.id, this.userCode).subscribe({
      next: () => {
        const historial = this.historialCalculos().filter(calculo => calculo.id !== persisted.id);
        this.historialCalculos.set(historial);
        this.syncSavedCalculosByTask(historial);
        this.cargarUltimasTareasBackend();
        this.borrar(taskId);
        this.toast.success('El cálculo se eliminó del historial.', 'Cálculo borrado');
      },
      error: () => {
        this.toast.error('No se pudo eliminar el cálculo guardado.');
      }
    });
  }

  private syncSavedCalculosByTask(historial: CalculoMaterialGuardado[]): void {
    const mapping: Record<number, CalculoMaterialGuardado | undefined> = {};
    for (const calculo of historial) {
      if (!mapping[calculo.tareaId]) {
        mapping[calculo.tareaId] = calculo;
      }
    }
    this.savedCalculosByTask.set(mapping);
  }

  private isSameCalculo(a: CalculoMaterialGuardado, b: CalculoMaterialGuardado): boolean {
    if (a.id && b.id) {
      return a.id === b.id;
    }
    return a.tareaId === b.tareaId && a.createdAt === b.createdAt;
  }

  private resolverCalculoGuardado(tarea: TareaResumen): CalculoMaterialGuardado | undefined {
    const savedByTask = this.savedCalculosByTask()[tarea.id];
    if (savedByTask) {
      return savedByTask;
    }

    const historial = this.historialCalculos();
    if (!historial.length) {
      return undefined;
    }

    const matchingByTimestamp = tarea.createdAt
      ? historial.find(calculo => calculo.tareaId === tarea.id && calculo.createdAt === tarea.createdAt)
      : undefined;

    if (matchingByTimestamp) {
      return matchingByTimestamp;
    }

    return historial.find(calculo => calculo.tareaId === tarea.id);
  }

  private buildUserDisplayName(): string {
    const storedNameKeys = ['userName', 'username', 'nombre', 'fullName', 'displayName'];
    const storedName = storedNameKeys
      .map(key => (localStorage.getItem(key) || '').trim())
      .find(Boolean);

    if (storedName) {
      return storedName;
    }

    if (this.isTrialMode) {
      return 'Usuario de prueba';
    }

    if (this.userEmail) {
      const emailName = this.userEmail.split('@')[0]?.trim();
      if (emailName) {
        return emailName
          .replace(/[._-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, letter => letter.toUpperCase());
      }
    }

    return this.userCode || 'Usuario';
  }

  getCategoriaIcono(cat: string): string {
    const map: Record<string, string> = {
      'Cimientos': 'bi-bounding-box',
      'Capas Aisladoras': 'bi-shield-check',
      'Mampostería': 'bi-bricks',
      'Estructuras H.A.': 'bi-columns-gap',
      'Losas Viguetas': 'bi-layers',
      'Revoques': 'bi-brush',
      'Contrapisos': 'bi-grid',
      'Pisos': 'bi-square',
      'Cielorrasos': 'bi-cloud',
      'Pintura': 'bi-palette',
      'Cubiertas': 'bi-house-roof',
    };
    return map[cat] ?? 'bi-folder';
  }

  private getDemoDailyUsageCount(): number {
    const usage = cargarUsoDiarioDemoDesdeStorage();
    return usage[getCurrentDayKey()] ?? 0;
  }

  private registerDemoCalculationUsage(): void {
    const usage = cargarUsoDiarioDemoDesdeStorage();
    const key = getCurrentDayKey();
    usage[key] = (usage[key] ?? 0) + 1;
    guardarUsoDiarioDemoEnStorage(usage);
    this.demoDailyCalculationsUsed.set(usage[key]);
  }

  private getDetalleDias(nombre: string, horas: number): string | undefined {
    const n = nombre.toLowerCase();
    if (!n.includes('hrs oficial') && !n.includes('hrs ayudante')) return undefined;
    const dias = Math.ceil(horas / 8);
    if (dias <= 0) return undefined;
    return `(${dias} ${dias === 1 ? 'día' : 'días'})`;
  }

  isPinned(calculoId: number | undefined): boolean {
    if (!calculoId || calculoId < 0) return false;
    return this.pinnedIds().has(calculoId);
  }

  togglePin(calculo: CalculoMaterialGuardado): void {
    const id = calculo.id;
    if (!id || id < 0) return;
    const ids = new Set<number>(this.pinnedIds());
    ids.has(id) ? ids.delete(id) : ids.add(id);
    this.pinnedIds.set(ids);
    guardarPinIdsEnStorage(ids);
  }

  getVipStorageLabel(): string {
    if (this.isTrialMode) return '';
    const total = this.historialCalculos().length;
    const pinned = this.historialCalculos().filter(c => this.isPinned(c.id)).length;
    if (total < USER_HISTORY_LIMIT) return `${total}/${USER_HISTORY_LIMIT} guardados`;
    return `Historial lleno · ${pinned} fijados`;
  }
}

import * as THREE from 'three';

export type ParamType =
  | 'string'
  | 'number'
  | 'enum'
  | 'boolean'
  | 'font'
  | 'svg'
  | 'shape'
  | 'color';

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamDefinition {
  name: string;
  label: string;
  type: ParamType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  maxLength?: number;
  placeholder?: string;
  options?: (string | ParamOption)[];
  visibleIf?: string;
  previewOnly?: boolean;
  group?: string;
  helpText?: string;
}

export interface PartDefinition {
  name: string;
  label: string;
  colorParam: string;
}

export type ProductCategory =
  | 'suportes'
  | 'chaveiros'
  | 'letreiros'
  | 'cortadores'
  | 'placas'
  | 'pets'
  | 'organizacao'
  | 'acessorios';

export interface ModelSchema {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  categories: ProductCategory[];
  featured?: boolean;
  free?: boolean;
  creditCost: number;
  addedAt: string;
  badge?: string;
  params: ParamDefinition[];
  parts: PartDefinition[];
}

export interface GeneratedPartMesh {
  name: string;
  label: string;
  geometry: THREE.BufferGeometry;
  color: string;
}

export interface TechnicalSpecReport {
  title: string;
  items: { label: string; value: string }[];
}

export interface GeneratedModelResult {
  parts: GeneratedPartMesh[];
  fichaTecnica?: TechnicalSpecReport;
}

export interface ProductModule {
  schema: ModelSchema;
  generate: (params: Record<string, any>) => Promise<GeneratedModelResult>;
}

export interface MeshMetrics {
  volumeCm3: number;
  areaCm2: number;
  trianglesCount: number;
  boundingBoxMm: {
    x: number;
    y: number;
    z: number;
  };
  partMetrics: {
    name: string;
    label: string;
    color: string;
    volumeCm3: number;
    areaCm2: number;
    triangles: number;
  }[];
}

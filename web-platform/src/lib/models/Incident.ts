import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tipos de incidencia que un ciudadano puede reportar (RF-11).
 * Mantener el enum coherente con la pantalla móvil de reporte.
 */
export const INCIDENT_TYPES = [
  'accumulation', // residuos acumulados / basura en vía pública
  'damaged_container', // contenedor dañado o desbordado
  'missed_collection', // recolección no realizada
  'other',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

export const INCIDENT_STATUS = ['open', 'in_progress', 'resolved'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export interface IIncident extends Document {
  /** Código corto para mostrar al ciudadano (ej. INC-2026-0001). */
  code: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  /** Texto libre con la dirección, si el ciudadano la describe. */
  address?: string;
  /** Punto GPS del reporte (lng, lat). */
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  /** Zona detectada por geolocalización. Puede estar vacío al inicio. */
  zone?: mongoose.Types.ObjectId;
  /** Ciudadano que reportó. */
  reportedBy: mongoose.Types.ObjectId;
  /** Admin / operador que tomó el caso. */
  assignedTo?: mongoose.Types.ObjectId;
  /** Nota interna del admin/operador al cerrar el caso. */
  resolutionNote?: string;
  photoUrl?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: { type: String, enum: INCIDENT_TYPES, required: true, default: 'other' },
    severity: { type: String, enum: INCIDENT_SEVERITY, default: 'medium' },
    status: { type: String, enum: INCIDENT_STATUS, default: 'open', index: true },
    address: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

IncidentSchema.index({ location: '2dsphere' }, { sparse: true });
IncidentSchema.index({ createdAt: -1 });

export default mongoose.models.Incident ||
  mongoose.model<IIncident>('Incident', IncidentSchema);

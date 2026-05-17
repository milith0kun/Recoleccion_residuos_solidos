import mongoose, { Schema, Document } from 'mongoose';

/**
 * Traza histórica real (no programada) de una ruta. Se crea automáticamente
 * cuando una `RouteExecution` pasa a `completed`. Con múltiples trazas
 * acumuladas se puede elegir la "mejor" como la oficial a mostrar al
 * ciudadano (manual, por más paradas, mediana, o más confirmada por la
 * comunidad).
 */
export const TRACE_SELECTION_METHODS = [
  'manual',
  'most_complete',
  'median',
  'most_confirmed',
] as const;
export type TraceSelectionMethod = (typeof TRACE_SELECTION_METHODS)[number];

export interface IRouteTrace extends Document {
  route: mongoose.Types.ObjectId;
  execution: mongoose.Types.ObjectId;
  driver: mongoose.Types.ObjectId;
  date: Date;
  points: { type: 'LineString'; coordinates: number[][] };
  totalDistanceKm: number;
  durationMin: number;
  waypointsVisited: number;
  waypointsSkipped: number;
  /** Cuántos ciudadanos marcaron "vi el camión acá" cerca de esta traza. */
  communityConfirmations: number;
  /** La oficial vigente para esta ruta. Única por route. */
  isOfficial: boolean;
  selectionMethod?: TraceSelectionMethod;
  selectedBy?: mongoose.Types.ObjectId;
  selectedAt?: Date;
  /** Traza sintética (calculada por mediana, etc.) vs traza real. */
  isSynthetic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteTraceSchema = new Schema<IRouteTrace>(
  {
    route: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    execution: { type: Schema.Types.ObjectId, ref: 'RouteExecution', index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true },
    points: {
      type: { type: String, enum: ['LineString'], default: 'LineString' },
      coordinates: { type: [[Number]], required: true },
    },
    totalDistanceKm: { type: Number, default: 0 },
    durationMin: { type: Number, default: 0 },
    waypointsVisited: { type: Number, default: 0 },
    waypointsSkipped: { type: Number, default: 0 },
    communityConfirmations: { type: Number, default: 0 },
    isOfficial: { type: Boolean, default: false },
    selectionMethod: { type: String, enum: TRACE_SELECTION_METHODS },
    selectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    selectedAt: { type: Date },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RouteTraceSchema.index({ route: 1, isOfficial: 1 });
RouteTraceSchema.index({ route: 1, createdAt: -1 });

export default mongoose.models.RouteTrace ||
  mongoose.model<IRouteTrace>('RouteTrace', RouteTraceSchema);

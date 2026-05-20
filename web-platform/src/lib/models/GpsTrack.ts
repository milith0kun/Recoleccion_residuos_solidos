import mongoose, { Schema, Document } from 'mongoose';

export interface IGpsTrack extends Document {
  routeExecution: mongoose.Types.ObjectId;
  operator: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
}

const GpsTrackSchema = new Schema<IGpsTrack>({
  routeExecution: { type: Schema.Types.ObjectId, ref: 'RouteExecution', required: true },
  operator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
});

GpsTrackSchema.index({ routeExecution: 1, timestamp: 1 });
GpsTrackSchema.index({ location: '2dsphere' });
// Conserva histórico suficiente para auditoría/reportes (>=30 días).
GpsTrackSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export default mongoose.models.GpsTrack || mongoose.model<IGpsTrack>('GpsTrack', GpsTrackSchema);

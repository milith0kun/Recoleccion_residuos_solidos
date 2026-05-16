import mongoose, { Schema } from 'mongoose';

export interface IVehicle {
  plate: string;
  type: 'compactor' | 'open_truck' | 'mini_truck';
  capacity: number;
  brand: string;
  model: string;
  year: number;
  status: 'available' | 'in_route' | 'maintenance' | 'inactive';
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['compactor', 'open_truck', 'mini_truck'], required: true },
    capacity: { type: Number, required: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ['available', 'in_route', 'maintenance', 'inactive'], default: 'available' },
    currentLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

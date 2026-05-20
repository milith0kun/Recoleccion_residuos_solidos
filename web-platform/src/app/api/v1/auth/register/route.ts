import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import Notification from '@/lib/models/Notification';
import { signAccessToken, signRefreshToken } from '@/lib/utils/jwt';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { sendVerificationEmail } from '@/lib/utils/email';
import { assignZoneByAddress } from '@/lib/utils/geolocation';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      email,
      password,
      dni,
      firstName,
      lastName,
      phone,
      address,
      district,
      zoneId,
      zone: zoneInput,
    } = body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedDni = String(dni || '').trim();
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const normalizedAddress = String(address || '').trim();
    const normalizedDistrict = String(district || '').trim();
    const normalizedZoneId = String(zoneId || zoneInput || '').trim();

    if (
      !normalizedEmail ||
      !password ||
      !normalizedDni ||
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedAddress
    ) {
      return errorResponse('Todos los campos obligatorios deben ser completados', 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return errorResponse('El correo electrónico no tiene un formato válido', 400);
    }

    if (!/^\d{8}$/.test(normalizedDni)) {
      return errorResponse('El DNI debe tener exactamente 8 dígitos', 400);
    }

    if (password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { dni: normalizedDni }],
    }).select('+emailVerificationExpires');

    if (
      existingUser &&
      !existingUser.isVerified &&
      existingUser.emailVerificationExpires &&
      existingUser.emailVerificationExpires < new Date()
    ) {
      await User.deleteOne({ _id: existingUser._id });
    }

    const conflictUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { dni: normalizedDni }],
    });
    if (conflictUser) {
      return errorResponse(
        conflictUser.email === normalizedEmail
          ? 'El correo ya está registrado'
          : 'El DNI ya está registrado',
        409,
        'DUPLICATE'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let selectedZone = null;
    if (normalizedZoneId) {
      selectedZone = await Zone.findOne({ _id: normalizedZoneId, isActive: true }).select(
        '_id district name'
      );
      if (!selectedZone) {
        return errorResponse('La zona seleccionada no es válida', 400);
      }
      if (
        normalizedDistrict &&
        selectedZone.district &&
        selectedZone.district.toLowerCase() !== normalizedDistrict.toLowerCase()
      ) {
        return errorResponse('La zona no corresponde al distrito seleccionado', 400);
      }
    }

    const { location, zone } = await assignZoneByAddress(normalizedAddress);
    const finalZone = selectedZone?._id ?? zone ?? undefined;
    const zonePending = !finalZone;

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      dni: normalizedDni,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone || undefined,
      address: normalizedAddress,
      role: 'citizen',
      isVerified: false,
      location: location ?? undefined,
      zone: finalZone,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    if (finalZone) {
      const zoneDoc = selectedZone ?? (await Zone.findById(finalZone).select('name'));
      await Notification.create({
        recipient: user._id,
        kind: 'system',
        title: 'Zona de recolección asignada',
        body: zoneDoc?.name
          ? `Tu zona de recolección asignada es ${zoneDoc.name}.`
          : 'Tu zona de recolección fue asignada automáticamente.',
        data: { type: 'zone_assignment', zoneId: String(finalZone), zoneName: zoneDoc?.name },
      });
    } else {
      await Notification.create({
        recipient: user._id,
        kind: 'system',
        title: 'Zona pendiente de asignación',
        body: 'No se encontró una zona para tu dirección. Un administrador revisará tu caso.',
        data: { type: 'zone_assignment', status: 'pending' },
      });
    }

    await sendVerificationEmail(normalizedEmail, verificationCode);

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      zone: user.zone?.toString(),
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return successResponse(
      {
        accessToken,
        refreshToken,
        emailVerificationRequired: true,
        zonePending,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          dni: user.dni,
          zone: user.zone,
        },
      },
      zonePending
        ? 'Registro exitoso. No se pudo asignar zona automáticamente; queda pendiente.'
        : 'Registro exitoso',
      201
    );
  } catch (error: unknown) {
    console.error('Register error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

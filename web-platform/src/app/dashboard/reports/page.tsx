'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, BarChart3, TrendingUp } from 'lucide-react';

const mockZoneData = [
  { name: 'Zona Norte', organico: 4000, reciclable: 2400, noReciclable: 2400 },
  { name: 'Zona Sur', organico: 3000, reciclable: 1398, noReciclable: 2210 },
  { name: 'Centro', organico: 2000, reciclable: 9800, noReciclable: 2290 },
  { name: 'San Jerónimo', organico: 2780, reciclable: 3908, noReciclable: 2000 },
  { name: 'Wanchaq', organico: 1890, reciclable: 4800, noReciclable: 2181 },
];

const mockComplianceData = [
  { name: 'Lun', cumplimiento: 85 },
  { name: 'Mar', cumplimiento: 88 },
  { name: 'Mie', cumplimiento: 92 },
  { name: 'Jue', cumplimiento: 90 },
  { name: 'Vie', cumplimiento: 95 },
  { name: 'Sab', cumplimiento: 97 },
  { name: 'Dom', cumplimiento: 99 },
];

export default function ReportsPage() {
  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reportes y Analíticas</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Métricas de recolección y cumplimiento de rutas.</p>
        </div>
        <button
          className="bg-white border-2 border-emerald-100 hover:border-emerald-500 text-emerald-600 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1 */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Recolección por Zona</h2>
              <p className="text-sm font-bold text-slate-500">Volumen en kg por categoría</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockZoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                <Bar dataKey="organico" name="Orgánico" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reciclable" name="Reciclable" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noReciclable" name="No Reciclable" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Cumplimiento de Rutas</h2>
              <p className="text-sm font-bold text-slate-500">Porcentaje completado esta semana</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} domain={[0, 100]} />
                <Tooltip cursor={{ stroke: '#E2E8F0', strokeWidth: 2 }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="cumplimiento" name="Cumplimiento %" stroke="#3B82F6" strokeWidth={4} dot={{ strokeWidth: 4, r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

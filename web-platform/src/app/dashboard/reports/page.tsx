'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Download, BarChart3, TrendingUp } from 'lucide-react';

const mockZoneData = [
  { name: 'Centro', organico: 4000, reciclable: 2400, noReciclable: 2400 },
  { name: 'San Blas', organico: 3000, reciclable: 1398, noReciclable: 2210 },
  { name: 'San Jerónimo', organico: 2780, reciclable: 3908, noReciclable: 2000 },
  { name: 'Wanchaq', organico: 1890, reciclable: 4800, noReciclable: 2181 },
  { name: 'Santiago', organico: 2400, reciclable: 2300, noReciclable: 1800 },
];

const mockComplianceData = [
  { name: 'Lun', cumplimiento: 85 },
  { name: 'Mar', cumplimiento: 88 },
  { name: 'Mié', cumplimiento: 92 },
  { name: 'Jue', cumplimiento: 90 },
  { name: 'Vie', cumplimiento: 95 },
  { name: 'Sáb', cumplimiento: 97 },
  { name: 'Dom', cumplimiento: 99 },
];

const tooltipStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid #E8EDEB',
  boxShadow: '0 4px 12px rgba(0,30,43,0.08)',
  fontSize: 12,
  fontFamily: 'Geist, Outfit, sans-serif',
};

const axisTick = { fill: '#5C6C75', fontSize: 12, fontWeight: 500 };

export default function ReportsPage() {
  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Reportes y analíticas</h1>
          <p className="adm-sub">Métricas de recolección y cumplimiento operativo.</p>
        </div>
        <div className="adm-header-actions">
          <button className="adm-btn-secondary">
            <Download size={15} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <select className="adm-filter">
          <option>Última semana</option>
          <option>Último mes</option>
          <option>Últimos 3 meses</option>
          <option>Año actual</option>
        </select>
        <select className="adm-filter">
          <option>Todas las zonas</option>
          <option>Centro</option>
          <option>San Blas</option>
          <option>Wanchaq</option>
        </select>
        <div className="adm-stat-pills">
          <span className="adm-stat-pill adm-stat-pill--green"><strong>34,5 t</strong> recolectadas</span>
          <span className="adm-stat-pill adm-stat-pill--blue"><strong>92%</strong> cumplimiento</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 20,
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            .reports-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
        <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          {/* Chart 1: Recolección por zona */}
          <section className="adm-section">
            <div className="adm-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#E3FCEF',
                    color: '#00684A',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h2 className="adm-section-title">Recolección por zona</h2>
                  <p className="adm-section-sub">Volumen en kg por categoría</p>
                </div>
              </div>
            </div>

            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockZoneData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                  <Tooltip cursor={{ fill: '#F9FBFA' }} contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 16 }} />
                  <Bar dataKey="organico" name="Orgánico" fill="#00684A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reciclable" name="Reciclable" fill="#1E5180" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="noReciclable" name="No reciclable" fill="#B23A3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2: Cumplimiento */}
          <section className="adm-section">
            <div className="adm-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#E3EEF9',
                    color: '#1E5180',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <TrendingUp size={18} />
                </span>
                <div>
                  <h2 className="adm-section-title">Cumplimiento de rutas</h2>
                  <p className="adm-section-sub">Porcentaje completado esta semana</p>
                </div>
              </div>
            </div>

            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockComplianceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} domain={[0, 100]} />
                  <Tooltip cursor={{ stroke: '#E8EDEB', strokeWidth: 2 }} contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="cumplimiento"
                    name="Cumplimiento %"
                    stroke="#00684A"
                    strokeWidth={2.5}
                    dot={{ stroke: '#00684A', strokeWidth: 2, r: 4, fill: '#FFFFFF' }}
                    activeDot={{ r: 6, fill: '#00684A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      <div className="adm-system-status" style={{ paddingLeft: 4 }}>
        <span className="adm-system-status-dot" />
        <span>
          Datos mock — los reportes reales se generarán a partir de la información
          registrada por los operadores en sus jornadas.
        </span>
      </div>
    </div>
  );
}

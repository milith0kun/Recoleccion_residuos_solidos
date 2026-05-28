import type { Metadata } from 'next';
import Link from 'next/link';

type Priority = 'Alta' | 'Media';
type Actor =
  | 'Ciudadano'
  | 'Administrador'
  | 'Planificador'
  | 'Cuadrilla'
  | 'Todos';

interface Story {
  actor: Actor;
  rf: string;
  stage: string;
  text: string;
  priority: Priority;
  important?: boolean;
}

const stories: Story[] = [
  {
    actor: 'Ciudadano',
    rf: 'RF-01',
    stage: 'Ingreso al sistema',
    text: 'Como vecino del distrito, quiero registrarme con mi direccion para consultar el servicio que corresponde a mi sector, barrio o APV.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Todos',
    rf: 'RF-02',
    stage: 'Ingreso al sistema',
    text: 'Como usuario registrado, quiero iniciar sesion para usar las funciones habilitadas segun mi rol en el servicio municipal.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Administrador',
    rf: 'RF-03',
    stage: 'Configuracion municipal',
    text: 'Como administrador, quiero definir sectores operativos, barrios, APV y puntos criticos en el mapa para organizar la cobertura distrital.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Ciudadano',
    rf: 'RF-04',
    stage: 'Configuracion municipal',
    text: 'Como vecino, quiero quedar asociado al sector que corresponde a mi direccion para recibir horarios, rutas y avisos correctos.',
    priority: 'Media',
    important: true,
  },
  {
    actor: 'Planificador',
    rf: 'RF-09',
    stage: 'Planificacion del servicio',
    text: 'Como planificador municipal, quiero programar rutas, turnos, vehiculos y cuadrillas para cubrir sectores urbanos, APV y puntos criticos.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Ciudadano',
    rf: 'RF-10',
    stage: 'Consulta ciudadana',
    text: 'Como vecino, quiero consultar el calendario de mi sector para sacar residuos comunes o segregados en el dia y hora indicados.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Todos',
    rf: 'RF-07',
    stage: 'Consulta ciudadana',
    text: 'Como usuario del sistema, quiero visualizar rutas y sectores en el mapa para conocer recorridos, puntos de atencion y estado del servicio.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Cuadrilla',
    rf: 'RF-08',
    stage: 'Ejecucion en campo',
    text: 'Como personal de campo, quiero activar el GPS del vehiculo al iniciar la jornada para reportar el avance real de la ruta.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Ciudadano',
    rf: 'RF-12',
    stage: 'Alertas del servicio',
    text: 'Como vecino, quiero recibir una alerta cuando el vehiculo este proximo a mi sector para entregar mis residuos a tiempo.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Cuadrilla',
    rf: 'RF-13',
    stage: 'Alertas del servicio',
    text: 'Como personal de campo, quiero reportar retrasos, averias o puntos no atendidos para avisar a los vecinos afectados.',
    priority: 'Media',
    important: true,
  },
  {
    actor: 'Ciudadano',
    rf: 'RF-11',
    stage: 'Participacion ciudadana',
    text: 'Como vecino, quiero reportar acumulacion, residuos fuera de horario o recoleccion no realizada para que el municipio atienda el caso.',
    priority: 'Alta',
    important: true,
  },
  {
    actor: 'Ciudadano',
    rf: 'RF-06',
    stage: 'Guia de residuos',
    text: 'Como vecino, quiero consultar como clasificar cada residuo para entregarlo separado al servicio comun o selectivo segun corresponda.',
    priority: 'Alta',
  },
  {
    actor: 'Administrador',
    rf: 'RF-05',
    stage: 'Guia de residuos',
    text: 'Como administrador, quiero mantener el catalogo de residuos aprovechables y no aprovechables para orientar segregacion y valorizacion.',
    priority: 'Media',
  },
  {
    actor: 'Administrador',
    rf: 'RF-14',
    stage: 'Analitica municipal',
    text: 'Como administrador, quiero analizar residuos recolectados y valorizados por sector, categoria y periodo para mejorar la operacion.',
    priority: 'Alta',
  },
  {
    actor: 'Planificador',
    rf: 'RF-15',
    stage: 'Analitica municipal',
    text: 'Como planificador municipal, quiero medir cumplimiento por ruta, turno y cuadrilla para detectar retrasos, omisiones y desviaciones.',
    priority: 'Media',
  },
  {
    actor: 'Administrador',
    rf: 'RF-16',
    stage: 'Analitica municipal',
    text: 'Como administrador, quiero evaluar participacion vecinal por sector para priorizar empadronamiento, sensibilizacion y mejora del servicio.',
    priority: 'Media',
  },
];

const actorClass: Record<Actor, string> = {
  Ciudadano: 'actor-citizen',
  Administrador: 'actor-admin',
  Planificador: 'actor-planner',
  Cuadrilla: 'actor-crew',
  Todos: 'actor-all',
};

const actorOrder: Actor[] = [
  'Ciudadano',
  'Administrador',
  'Planificador',
  'Cuadrilla',
  'Todos',
];
const actorCounts = actorOrder.map((actor) => ({
  actor,
  count: stories.filter((story) => story.actor === actor).length,
}));

export const metadata: Metadata = {
  title: 'User Story Mapping',
  description:
    'Mapa estatico de historias de usuario para el sistema de recoleccion de residuos solidos.',
  alternates: {
    canonical: '/user-story-mapping',
  },
};

export default function UserStoryMappingPage() {
  return (
    <main className="usm-page">
      <style>{styles}</style>

      <header className="usm-header">
        <div>
          <Link href="/" className="usm-back">
            SRSS Cusco
          </Link>
          <p className="usm-kicker">Planeamiento estatico</p>
          <h1>User Story Mapping</h1>
        </div>
      </header>

      <section className="usm-legend" aria-label="Leyenda de actores">
        <span className="legend-title">Actores</span>
        {actorCounts.map(({ actor, count }) => (
          <span className={`legend-item ${actorClass[actor]}`} key={actor}>
            {actor} <strong>{count}</strong>
          </span>
        ))}
        <span className="legend-mvp">HU del MVP</span>
      </section>

      <section className="usm-map" aria-label="Mapa de historias de usuario">
        <div className="usm-flow">
          {stories.map((story) => (
            <StoryCard key={story.rf} story={story} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <article className={`story-card ${story.important ? 'story-card-important' : ''}`}>
      <div className="story-top">
        <span className="story-stage">{story.stage}</span>
        <span className="rf-code">{story.rf}</span>
      </div>
      <div className="story-meta">
        <span className={`actor-dot ${actorClass[story.actor]}`} />
        <span>{story.actor}</span>
      </div>
      <p>{story.text}</p>
      <div className="story-badges">
        <span className={`priority priority-${story.priority.toLowerCase()}`}>
          {story.priority}
        </span>
        {story.important && <span className="mvp-badge">MVP</span>}
      </div>
    </article>
  );
}

const styles = `
  .usm-page {
    height: 100vh;
    background:
      linear-gradient(180deg, rgba(227, 252, 239, 0.58) 0, rgba(255, 255, 255, 0) 320px),
      #fbfcfb;
    color: #001e2b;
    font-family: 'Geist', 'Outfit', sans-serif;
    padding: 12px 18px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .usm-header {
    max-width: 1440px;
    width: 100%;
    margin: 0 auto 8px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 28px;
    align-items: end;
  }

  .usm-back {
    display: inline-flex;
    color: #00684a;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    margin-bottom: 6px;
  }

  .usm-kicker {
    margin: 0 0 4px;
    color: #00684a;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .usm-header h1 {
    margin: 0;
    font-family: 'Newsreader', Georgia, serif;
    font-size: clamp(26px, 3.2vw, 36px);
    font-weight: 500;
    line-height: 0.98;
    letter-spacing: -0.024em;
  }

  .usm-legend {
    max-width: 1440px;
    width: 100%;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 9px;
    background: #ffffff;
    border: 1px solid #e0e8e4;
    border-radius: 8px;
  }

  .legend-title {
    color: #001e2b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-right: 4px;
  }

  .legend-item,
  .legend-mvp {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 4px 8px;
    color: #001e2b;
    background: #f7faf8;
    border: 1px solid #e4ebe7;
    font-size: 12px;
    font-weight: 650;
    white-space: nowrap;
  }

  .legend-item::before,
  .legend-mvp::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
  }

  .legend-item strong {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: #001e2b;
    border: 1px solid #001e2b;
    color: #ffffff;
    font-size: 10px;
  }

  .legend-item.actor-citizen {
    color: #00513a;
    background: #e3fcef;
    border-color: #bfe8ce;
  }

  .legend-item.actor-admin {
    color: #3c3489;
    background: #edebfe;
    border-color: #d6d2fb;
  }

  .legend-item.actor-planner {
    color: #6f4f00;
    background: #fff5d6;
    border-color: #ffe3a2;
  }

  .legend-item.actor-crew {
    color: #7c2d12;
    background: #fde8e0;
    border-color: #f6c3b3;
  }

  .legend-item.actor-all {
    color: #075985;
    background: #e0f2fe;
    border-color: #bae6fd;
  }

  .legend-mvp {
    color: #00513a;
    background: #e3fcef;
    border-color: #bfe8ce;
  }

  .usm-map {
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    overflow: visible;
    padding-bottom: 0;
    flex: 1;
    min-height: 0;
  }

  .usm-flow {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(4, minmax(0, 1fr));
    gap: 7px;
    align-items: stretch;
  }

  .story-card {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border: 1px solid #e4ebe7;
    border-left: 3px solid #d8b453;
    border-radius: 8px;
    padding: 8px 10px;
    box-shadow: 0 1px 0 rgba(0, 30, 43, 0.04);
  }

  .story-card-important {
    border-left-color: #00684a;
    background: #fefffe;
    box-shadow: inset 0 0 0 1px rgba(0, 104, 74, 0.04), 0 1px 0 rgba(0, 30, 43, 0.04);
  }

  .story-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 5px;
  }

  .story-stage {
    color: #00684a;
    font-size: 9.5px;
    font-weight: 850;
    letter-spacing: 0.1em;
    line-height: 1.3;
    text-transform: uppercase;
  }

  .story-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 5px;
    color: #475760;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .actor-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex: 0 0 auto;
  }

  .actor-citizen { color: #0f8f64; background-color: #0f8f64; }
  .actor-admin { color: #5d55c8; background-color: #5d55c8; }
  .actor-planner { color: #8c6300; background-color: #8c6300; }
  .actor-crew { color: #c24b2c; background-color: #c24b2c; }
  .actor-all { color: #0f9ac1; background-color: #0f9ac1; }

  .rf-code {
    flex: 0 0 auto;
    color: #001e2b;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 5px;
    background: #f1f4f2;
    border: 1px solid #e4ebe7;
  }

  .story-card p {
    margin: 0;
    color: #001e2b;
    font-size: clamp(12px, 0.86vw, 13.4px);
    line-height: 1.38;
    font-weight: 500;
    letter-spacing: 0;
  }

  .story-badges {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: 6px;
  }

  .priority,
  .mvp-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 2px 6px;
    font-size: 8.5px;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .priority-alta {
    color: #00513a;
    background: #e3fcef;
    border: 1px solid #c1f1d6;
  }

  .priority-media {
    color: #7a5400;
    background: #fff5d6;
    border: 1px solid #ffe3a2;
  }

  .mvp-badge {
    color: #ffffff;
    background: #00684a;
    border: 1px solid #00684a;
  }

  @media (max-width: 1100px) {
    .usm-page {
      height: auto;
      min-height: 100vh;
      overflow: visible;
    }

    .usm-flow {
      height: auto;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: none;
    }
  }

  @media (max-width: 900px) {
    .usm-page {
      padding: 22px 16px 34px;
    }

    .usm-header {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .usm-flow {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .usm-flow {
      grid-template-columns: 1fr;
    }

    .story-card {
      min-height: auto;
    }
  }
`;

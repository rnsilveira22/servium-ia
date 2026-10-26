export type Semaforo = 'vermelho' | 'amarelo' | 'verde';

const ROTULO: Record<Semaforo, string> = {
  vermelho: 'Atenção',
  amarelo: 'Acompanhar',
  verde: 'Em dia',
};

/** Cor + rótulo em texto (a cor sozinha não comunica nada a quem não distingue cores). */
export function SemaforoBadge({ semaforo }: { semaforo: Semaforo }) {
  return (
    <span className={`semaforo semaforo-${semaforo}`}>
      <span className="semaforo-dot" aria-hidden="true" />
      {ROTULO[semaforo]}
    </span>
  );
}

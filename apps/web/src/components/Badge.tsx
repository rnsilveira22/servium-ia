interface BadgeProps {
  tone?: 'activo' | 'aberto' | 'info' | 'expirado' | 'pendente' | 'encerrado' | 'cancelado' | 'alert' | 'neutral';
  children: string;
}

const TONE_CLASS: Record<NonNullable<BadgeProps['tone']>, string> = {
  activo: 'badge-ativo',
  aberto: 'badge-aberto',
  info: 'badge-info',
  expirado: 'badge-expirado',
  pendente: 'badge-pendente',
  encerrado: 'badge-encerrado',
  cancelado: 'badge-cancelado',
  alert: 'badge-alert',
  neutral: 'badge-neutral',
};

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`badge ${TONE_CLASS[tone]}`}>{children}</span>;
}

const ESTADO_TONE: Record<string, BadgeProps['tone']> = {
  aberto: 'aberto',
  ativo: 'activo',
  processando: 'info',
  aguardando: 'pendente',
  resolvido: 'activo',
  expirado: 'expirado',
  encerrado: 'encerrado',
  cancelado: 'cancelado',
  erro: 'alert',
  atenção: 'pendente',
};

export function StatusBadge({ estado }: { estado: string }) {
  return <Badge tone={ESTADO_TONE[estado] ?? 'neutral'}>{estado}</Badge>;
}
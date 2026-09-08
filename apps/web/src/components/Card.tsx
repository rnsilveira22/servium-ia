import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  label?: ReactNode;
  value?: ReactNode;
  alert?: boolean;
  children?: ReactNode;
}

export function Card({ title, label, value, alert = false, className, children, ...rest }: CardProps) {
  const classes = ['card'];
  if (alert) classes.push('card-alert');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')} {...rest}>
      {title && <div className="card-label">{title}</div>}
      {value !== undefined && <div className="card-value">{value}</div>}
      {label !== undefined && !title && <div className="card-label">{label}</div>}
      {children}
    </div>
  );
}
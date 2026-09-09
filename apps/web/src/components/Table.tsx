import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  responsive?: boolean;
}

export function Table({ responsive = true, className, children, ...rest }: TableProps) {
  const table = (
    <table className={className ? `table ${className}` : 'table'} {...rest}>
      {children}
    </table>
  );
  if (!responsive) return table;
  return <div className="table-responsive">{table}</div>;
}

interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  columns: string[];
}

export function TableHead({ columns }: TableHeadProps) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col} scope="col">{col}</th>
        ))}
      </tr>
    </thead>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function Td({ children, ...rest }: TdProps) {
  return <td {...rest}>{children}</td>;
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  scope?: 'row' | 'col';
}

export function Th({ children, scope = 'row', ...rest }: ThProps) {
  return <th scope={scope} {...rest}>{children}</th>;
}
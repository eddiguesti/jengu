import { ReactNode } from 'react'
import clsx from 'clsx'

interface TableProps {
  children: ReactNode
  className?: string
}

export const Table = ({ children, className }: TableProps) => {
  return (
    <div className={clsx('w-full overflow-x-auto', className)}>
      <table className="w-full">{children}</table>
    </div>
  )
}

Table.Header = ({ children, className }: { children: ReactNode; className?: string }) => (
  <thead className={clsx('border-border bg-elevated border-b', className)}>{children}</thead>
)

Table.Body = ({ children, className }: { children: ReactNode; className?: string }) => (
  <tbody className={className}>{children}</tbody>
)

Table.Row = ({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) => (
  <tr
    className={clsx(
      'border-border border-b transition-colors',
      onClick && 'hover:bg-elevated cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    {children}
  </tr>
)

Table.HeaderCell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <th className={clsx('text-text px-4 py-3 text-left text-sm font-semibold', className)}>
    {children}
  </th>
)

Table.Cell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <td className={clsx('text-muted px-4 py-3 text-sm', className)}>{children}</td>
)

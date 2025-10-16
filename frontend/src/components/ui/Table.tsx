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
  <thead className={clsx('border-b border-border bg-elevated', className)}>{children}</thead>
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
      'border-b border-border transition-colors',
      onClick && 'cursor-pointer hover:bg-elevated',
      className
    )}
    onClick={onClick}
  >
    {children}
  </tr>
)

Table.HeaderCell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <th className={clsx('px-4 py-3 text-left text-sm font-semibold text-text', className)}>
    {children}
  </th>
)

Table.Cell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <td className={clsx('px-4 py-3 text-sm text-muted', className)}>{children}</td>
)

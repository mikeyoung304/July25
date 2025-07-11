import * as React from 'react'
import { cn } from '@/utils'

interface SelectContextType {
  value: string
  onChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ className, children }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectTrigger must be used within Select')

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        'flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm ring-offset-background placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-macon-navy/20 focus:ring-offset-2 focus:border-macon-navy/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-neutral-300',
        className
      )}
      aria-expanded={context.open}
      aria-haspopup="listbox"
    >
      {children}
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectValue must be used within Select')

  return <span>{context.value || placeholder}</span>
}

interface SelectContentProps {
  className?: string
  children: React.ReactNode
}

const SelectContent: React.FC<SelectContentProps> = ({ className, children }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectContent must be used within Select')

  if (!context.open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-50" 
        onClick={() => context.setOpen(false)}
      />
      <div
        className={cn(
          'absolute top-full z-50 mt-2 max-h-96 w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-1 text-neutral-900 shadow-large',
          className
        )}
        role="listbox"
      >
        {children}
      </div>
    </>
  )
}

interface SelectItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const SelectItem: React.FC<SelectItemProps> = ({ value, className, children }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectItem must be used within Select')

  const handleClick = () => {
    context.onChange(value)
    context.setOpen(false)
  }

  return (
    <div
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none hover:bg-macon-navy/5 hover:text-macon-navy transition-colors focus:bg-macon-navy/5 focus:text-macon-navy',
        context.value === value && 'bg-macon-navy/10 text-macon-navy font-medium',
        className
      )}
      onClick={handleClick}
      role="option"
      aria-selected={context.value === value}
    >
      {context.value === value && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          ✓
        </span>
      )}
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
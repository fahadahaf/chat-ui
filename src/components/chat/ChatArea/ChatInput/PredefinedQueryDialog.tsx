'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { toast } from 'sonner'

interface QueryParameter {
  name: string
  type: string
  options?: string[]
  required?: boolean
}

interface QueryDefinition {
  name: string
  description: string
  details?: string
  file?: string
  parameters?: QueryParameter[]
}

interface PredefinedQueryDialogProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (queryName: string, parameters: Record<string, string>) => void
}

const PredefinedQueryDialog = ({
  isOpen,
  onClose,
  onExecute
}: PredefinedQueryDialogProps) => {
  const [queries, setQueries] = useState<QueryDefinition[]>([])
  const [selectedQuery, setSelectedQuery] = useState<QueryDefinition | null>(null)
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const ragUrl = useStore((state) => state.ragUrl)

  // Load queries from RAG service
  useEffect(() => {
    if (isOpen) {
      loadQueries()
    }
  }, [isOpen])

  const loadQueries = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rag/queries?base=${encodeURIComponent(ragUrl)}`)
      if (!response.ok) {
        throw new Error('Failed to load queries')
      }
      const data = await response.json()
      setQueries(data.queries || [])
    } catch (error) {
      toast.error('Failed to load predefined queries')
      console.error('Error loading queries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuerySelect = (query: QueryDefinition) => {
    setSelectedQuery(query)
    // Initialize parameter values
    const initialValues: Record<string, string> = {}
    query.parameters?.forEach((param) => {
      // For select types, default to first option if available
      if (param.type === 'select' && param.options && param.options.length > 0) {
        initialValues[param.name] = param.options[0]
      } else {
        initialValues[param.name] = ''
      }
    })
    setParameterValues(initialValues)
  }

  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues((prev) => ({
      ...prev,
      [paramName]: value
    }))
  }

  const handleExecute = () => {
    if (!selectedQuery) return

    // Validate that all REQUIRED parameters are filled
    const missingRequired = selectedQuery.parameters?.filter(
      (param) => param.required && (!parameterValues[param.name] || parameterValues[param.name].trim() === '')
    ) ?? []

    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map(p => p.name.replace(/_/g, ' ')).join(', ')
      toast.error(`Please fill in required parameters: ${missingNames}`)
      return
    }

    onExecute(selectedQuery.name, parameterValues)
    handleClose()
  }

  const handleClose = () => {
    setSelectedQuery(null)
    setParameterValues({})
    setShowDetails(false)
    onClose()
  }

  const handleBack = () => {
    setSelectedQuery(null)
    setParameterValues({})
    setShowDetails(false)
  }

  const renderParameterInput = (param: QueryParameter) => {
    const value = parameterValues[param.name] || ''

    // Render select dropdown if options are provided
    if (param.type === 'select' && param.options && param.options.length > 0) {
      return (
        <select
          value={value}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          className="w-full rounded-lg border border-accent bg-primaryAccent px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none"
        >
          {param.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    // Render date input for date type
    if (param.type === 'date') {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          className="w-full rounded-lg border border-accent bg-primaryAccent px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none"
        />
      )
    }

    // Render number input for number type
    if (param.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          className="w-full rounded-lg border border-accent bg-primaryAccent px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none"
          placeholder={`Enter ${param.name}`}
        />
      )
    }

    // Default: render text input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleParameterChange(param.name, e.target.value)}
        className="w-full rounded-lg border border-accent bg-primaryAccent px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none"
        placeholder={`Enter ${param.name}`}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[500px] font-geist">
        <DialogHeader>
          <DialogTitle>
            {selectedQuery ? selectedQuery.name : 'Select a Query'}
          </DialogTitle>
          <DialogDescription>
            {selectedQuery
              ? selectedQuery.description
              : 'Choose a predefined query to execute'}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-none max-h-[300px] overflow-y-auto py-4">
          {loading ? (
            <div className="text-center text-sm text-secondary">Loading queries...</div>
          ) : selectedQuery && showDetails ? (
            // Details view
            <div className="space-y-4">
              <div className="rounded-lg border border-accent bg-primaryAccent p-4">
                <h3 className="mb-2 text-sm font-semibold text-primary">Query Details</h3>
                <div className="whitespace-pre-wrap text-sm text-secondary">
                  {selectedQuery.details || 'No additional details available.'}
                </div>
              </div>
            </div>
          ) : selectedQuery ? (
            // Parameter input form
            <div className="space-y-4">
              {selectedQuery.parameters && selectedQuery.parameters.length > 0 ? (
                selectedQuery.parameters.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <label className="text-sm font-medium text-primary">
                      {param.name.replace(/_/g, ' ')}
                      {param.required && <span className="ml-1 text-red-500">*</span>}
                      <span className="ml-1 text-xs text-secondary">({param.type})</span>
                    </label>
                    {renderParameterInput(param)}
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-secondary">
                  This query has no parameters
                </div>
              )}
            </div>
          ) : (
            // Query list
            <div className="space-y-2">
              {queries.length === 0 ? (
                <div className="text-center text-sm text-secondary">
                  No queries available
                </div>
              ) : (
                queries.map((query) => (
                  <button
                    key={query.name}
                    onClick={() => handleQuerySelect(query)}
                    className="w-full rounded-lg border border-accent bg-primaryAccent p-3 text-left transition-colors hover:border-brand hover:bg-accent"
                  >
                    <div className="font-medium text-primary">{query.name}</div>
                    <div className="mt-1 text-xs text-secondary">
                      {query.description}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {selectedQuery ? (
            <>
              <Button
                variant="outline"
                className="rounded-xl border-border font-geist"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'PARAMETERS' : 'DETAILS'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-border font-geist"
                  onClick={handleBack}
                >
                  BACK
                </Button>
                {!showDetails && (
                  <Button
                    className="rounded-xl bg-brand font-geist text-primary hover:bg-brand/80"
                    onClick={handleExecute}
                  >
                    EXECUTE
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl border-border font-geist"
              onClick={handleClose}
            >
              CANCEL
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PredefinedQueryDialog


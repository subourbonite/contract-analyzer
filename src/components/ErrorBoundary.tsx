/**
 * Error Boundary Component for React error handling
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { ContractAnalyzerError, logError } from '../types/errors'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const contractError = new (class extends ContractAnalyzerError {
      readonly code = 'REACT_ERROR_BOUNDARY'
      readonly context = {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    })(error.message, error)

    logError(contractError)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">
                  Something went wrong
                </h2>
                <p className="text-red-600 mb-4">
                  The application encountered an unexpected error. Please refresh the page to try again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

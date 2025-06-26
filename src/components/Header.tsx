import React from 'react'
import { LogOut, User } from 'lucide-react'

interface HeaderProps {
  user: any
  onSignOut: () => void
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Lease Analyzer
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4" />
              <span className="text-sm">
                {user?.attributes?.email || user?.username || 'User'}
              </span>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

import React from 'react'
import { Download, Trash2, Calendar, FileText } from 'lucide-react'
import { ContractData } from '../types/contract'
import jsPDF from 'jspdf'

interface ContractAnalysisProps {
  contracts: ContractData[]
  onDeleteContract: (id: string) => void
}

export const ContractAnalysis: React.FC<ContractAnalysisProps> = ({ contracts, onDeleteContract }) => {
  const generatePDF = (contract: ContractData) => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text('Lease Contract Analysis', 20, 30)

    // File info
    doc.setFontSize(12)
    doc.text(`File: ${contract.fileName}`, 20, 50)
    doc.text(`Analyzed: ${contract.uploadDate.toLocaleDateString()}`, 20, 60)

    // Analysis table
    doc.setFontSize(14)
    doc.text('Contract Details', 20, 80)

    const tableData = [
      ['Lessor(s)', contract.analysis.lessors.join(', ')],
      ['Lessee(s)', contract.analysis.lessees.join(', ')],
      ['Acreage', contract.analysis.acreage],
      ['Depths/Formations', contract.analysis.depths],
      ['Term', contract.analysis.term],
      ['Royalty', contract.analysis.royalty]
    ]

    let yPosition = 90
    tableData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ':', 20, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.text(value, 80, yPosition)
      yPosition += 10
    })

    // Insights
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Analysis & Insights', 20, yPosition + 20)

    yPosition += 30
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    contract.analysis.insights.forEach((insight, index) => {
      const lines = doc.splitTextToSize(`${index + 1}. ${insight}`, 170)
      doc.text(lines, 20, yPosition)
      yPosition += lines.length * 5 + 5
    })

    doc.save(`${contract.fileName}_analysis.pdf`)
  }

  if (contracts.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No contracts analyzed yet
          </h3>
          <p className="text-gray-600">
            Upload contract files to begin analysis
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Contract Analysis Results
      </h2>

      {contracts.map((contract) => (
        <div key={contract.id} className="card">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {contract.fileName}
              </h3>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                {contract.uploadDate.toLocaleDateString()}
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => generatePDF(contract)}
                className="btn-secondary flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </button>

              <button
                onClick={() => onDeleteContract(contract.id)}
                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Analysis Table */}
          <div className="overflow-hidden bg-gray-50 rounded-lg mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Lessor(s)
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.lessors.join(', ') || 'Not found'}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Lessee(s)
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.lessees.join(', ') || 'Not found'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Acreage
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.acreage || 'Not found'}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Depths/Formations
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.depths || 'Not found'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Term
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.term || 'Not found'}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Royalty
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {contract.analysis.royalty || 'Not found'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Insights */}
          {contract.analysis.insights.length > 0 && (
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-4">
                Analysis & Insights
              </h4>
              <div className="space-y-3">
                {contract.analysis.insights.map((insight, index) => (
                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <p className="text-sm text-blue-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

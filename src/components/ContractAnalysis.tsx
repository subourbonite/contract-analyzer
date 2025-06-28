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

    // Page dimensions and margins
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const leftMargin = 20
    const rightMargin = 20
    const topMargin = 20
    const bottomMargin = 20
    const usableWidth = pageWidth - leftMargin - rightMargin

    let currentY = topMargin

    // Helper function to check if we need a new page
    const checkPageBreak = (neededSpace: number) => {
      if (currentY + neededSpace > pageHeight - bottomMargin) {
        doc.addPage()
        currentY = topMargin
        return true
      }
      return false
    }

    // Helper function to add wrapped text
    const addWrappedText = (text: string, x: number, fontSize: number, fontStyle: string = 'normal', maxWidth: number = usableWidth) => {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', fontStyle)

      const lines = doc.splitTextToSize(text, maxWidth)
      const lineHeight = fontSize * 0.4

      checkPageBreak(lines.length * lineHeight + 5)

      lines.forEach((line: string) => {
        doc.text(line, x, currentY)
        currentY += lineHeight
      })

      return lines.length * lineHeight
    }

    // Header with company branding
    doc.setFillColor(41, 128, 185) // Professional blue
    doc.rect(0, 0, pageWidth, 50, 'F')

    doc.setTextColor(255, 255, 255) // White text
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('OIL & GAS LEASE ANALYSIS', leftMargin, 25)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Professional Contract Review & Analysis', leftMargin, 35)

    // Reset text color and position
    doc.setTextColor(0, 0, 0)
    currentY = 70

    // Document Information Section
    doc.setFillColor(248, 249, 250) // Light gray background
    doc.rect(leftMargin, currentY - 5, usableWidth, 25, 'F')

    currentY += 5
    addWrappedText(`File: ${contract.fileName}`, leftMargin + 5, 12, 'bold')
    currentY += 2
    addWrappedText(`Analysis Date: ${contract.uploadDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, leftMargin + 5, 10, 'normal')

    currentY += 20

    // Contract Details Section
    doc.setFillColor(52, 73, 94) // Dark blue-gray
    doc.rect(leftMargin, currentY, usableWidth, 12, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRACT DETAILS', leftMargin + 5, currentY + 8)

    doc.setTextColor(0, 0, 0)
    currentY += 20

    // Contract details with better formatting
    const contractDetails = [
      { label: 'Lessor(s)', value: contract.analysis.lessors.join(', ') },
      { label: 'Lessee(s)', value: contract.analysis.lessees.join(', ') },
      { label: 'Acreage', value: contract.analysis.acreage },
      { label: 'Depths/Formations', value: contract.analysis.depths },
      { label: 'Term', value: contract.analysis.term },
      { label: 'Royalty', value: contract.analysis.royalty }
    ]

    contractDetails.forEach((detail, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(leftMargin, currentY - 3, usableWidth, 12, 'F')
      }

      // Label
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(52, 73, 94)
      doc.text(detail.label + ':', leftMargin + 5, currentY + 5)

      // Value with text wrapping
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const valueLines = doc.splitTextToSize(detail.value, usableWidth - 100)
      valueLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, leftMargin + 80, currentY + 5 + (lineIndex * 4))
      })

      currentY += Math.max(12, valueLines.length * 4 + 8)
    })

    currentY += 10

    // Analysis & Insights Section
    checkPageBreak(20)

    doc.setFillColor(52, 73, 94)
    doc.rect(leftMargin, currentY, usableWidth, 12, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ANALYSIS & INSIGHTS', leftMargin + 5, currentY + 8)

    doc.setTextColor(0, 0, 0)
    currentY += 20

    // Insights with proper formatting and numbering
    contract.analysis.insights.forEach((insight, index) => {
      checkPageBreak(20) // Check if we need space for at least a few lines

      // Number circle
      doc.setFillColor(41, 128, 185)
      doc.circle(leftMargin + 8, currentY + 3, 6, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text((index + 1).toString(), leftMargin + 6, currentY + 5)

      // Insight text
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      const insightLines = doc.splitTextToSize(insight, usableWidth - 25)
      insightLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          // Check if this insight will fit, if not start a new page
          if (currentY + (insightLines.length * 4) > pageHeight - bottomMargin) {
            doc.addPage()
            currentY = topMargin

            // Redraw number circle on new page
            doc.setFillColor(41, 128, 185)
            doc.circle(leftMargin + 8, currentY + 3, 6, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text((index + 1).toString(), leftMargin + 6, currentY + 5)

            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
          }
        }

        doc.text(line, leftMargin + 18, currentY + 5 + (lineIndex * 4))
      })

      currentY += insightLines.length * 4 + 8
    })

    // Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.line(leftMargin, pageHeight - 15, pageWidth - rightMargin, pageHeight - 15)

      // Footer text
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(128, 128, 128)
      doc.text('Generated by Oil & Gas Contract Analyzer', leftMargin, pageHeight - 8)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - rightMargin - 30, pageHeight - 8)
    }

    // Save the PDF
    doc.save(`${contract.fileName}_analysis.pdf`)
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No contracts analyzed yet
          </h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            Upload your lease documents to get started with AI-powered contract analysis and insights
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Analysis</h2>
          <p className="text-gray-600 mt-1">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {contracts.map((contract) => (
          <div key={contract.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 px-8 py-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start mb-3">
                    <div className="bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 break-words leading-tight">
                        {contract.fileName}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 ml-11">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Analyzed on {contract.uploadDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={() => generatePDF(contract)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </button>

                  <button
                    onClick={() => onDeleteContract(contract.id)}
                    className="inline-flex items-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="Delete contract"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Contract Details Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-3 flex-shrink-0">Lessor(s)</h4>
                  <p className="text-blue-900 font-medium text-sm leading-relaxed break-words flex-1">
                    {contract.analysis.lessors.join(', ') || 'Not found'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3 flex-shrink-0">Lessee(s)</h4>
                  <p className="text-green-900 font-medium text-sm leading-relaxed break-words flex-1">
                    {contract.analysis.lessees.join(', ') || 'Not found'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-3 flex-shrink-0">Acreage</h4>
                  <p className="text-purple-900 font-medium text-sm leading-relaxed break-words flex-1">
                    {contract.analysis.acreage || 'Not found'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-orange-800 uppercase tracking-wide mb-3 flex-shrink-0">Depths/Formations</h4>
                  <p className="text-orange-900 font-medium text-sm leading-relaxed break-words flex-1">
                    {contract.analysis.depths || 'Not found'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-teal-800 uppercase tracking-wide mb-3 flex-shrink-0">Term</h4>
                  <p className="text-teal-900 font-medium text-sm leading-relaxed break-words flex-1">
                    {contract.analysis.term || 'Not found'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 min-h-[120px] flex flex-col">
                  <h4 className="text-sm font-semibold text-red-800 uppercase tracking-wide mb-3 flex-shrink-0">Royalty</h4>
                  <p className="text-red-900 font-medium text-lg leading-relaxed break-words flex-1">
                    {contract.analysis.royalty || 'Not found'}
                  </p>
                </div>
              </div>

              {/* Insights Section */}
              {contract.analysis.insights.length > 0 && (
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-yellow-100 rounded-lg p-2 mr-3">
                      <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      Key Insights & Analysis
                    </h4>
                  </div>

                  <div className="grid gap-4">
                    {contract.analysis.insights.map((insight, index) => (
                      <div key={index} className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start">
                          <div className="bg-yellow-500 text-white text-sm font-bold rounded-full h-6 w-6 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-gray-800 leading-relaxed">
                            {insight}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

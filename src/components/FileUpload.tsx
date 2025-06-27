import { useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, Loader2, CheckCircle, X } from 'lucide-react'

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void
  isAnalyzing: boolean
}

export interface FileUploadRef {
  clearFiles: () => void
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFilesUploaded, isAnalyzing }, ref) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Clear files when analysis completes
  useEffect(() => {
    if (!isAnalyzing && uploadedFiles.length > 0) {
      // Clear files after a brief delay to show completion
      const timer = setTimeout(() => {
        setUploadedFiles([])
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isAnalyzing, uploadedFiles.length])

  useImperativeHandle(ref, () => ({
    clearFiles: () => setUploadedFiles([])
  }))

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles)
    onFilesUploaded(acceptedFiles)
  }, [onFilesUploaded])

  const removeFile = (fileToRemove: File) => {
    console.log('removeFile called:', {
      fileName: fileToRemove.name,
      isAnalyzing,
      totalFiles: uploadedFiles.length
    })

    if (isAnalyzing) {
      console.log('File removal blocked: analysis in progress')
      return // Prevent removal during analysis
    }

    const updatedFiles = uploadedFiles.filter(file => file !== fileToRemove)
    console.log('Files after removal:', {
      removedFile: fileToRemove.name,
      remainingFiles: updatedFiles.length,
      fileNames: updatedFiles.map(f => f.name)
    })

    setUploadedFiles(updatedFiles)
    onFilesUploaded(updatedFiles)
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Contracts
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Drag and drop your lease documents for AI-powered analysis
          </p>
        </div>

        <div className="p-6">
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 transform ${
              isDragActive
                ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-lg'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            } ${isAnalyzing ? 'pointer-events-none opacity-60' : 'hover:shadow-md'}`}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-16 w-16 text-blue-500 mb-4 animate-spin" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Analyzing Contracts...
                    </h3>
                    <p className="text-gray-600">
                      Our AI is processing your documents with advanced OCR and contract analysis
                    </p>
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`rounded-full p-4 mb-4 transition-colors duration-300 ${
                    isDragActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-12 w-12 transition-colors duration-300 ${
                      isDragActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop your contracts here' : 'Upload your lease documents'}
                  </h3>

                  <p className="text-gray-600 mb-4 max-w-sm">
                    {isDragActive
                      ? 'Release to upload your files'
                      : 'Drag and drop your files here, or click to browse'
                    }
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                    <span className="bg-white px-2 py-1 rounded border">PDF</span>
                    <span className="bg-white px-2 py-1 rounded border">DOC</span>
                    <span className="bg-white px-2 py-1 rounded border">DOCX</span>
                    <span className="bg-white px-2 py-1 rounded border">TXT</span>
                    <span className="bg-white px-2 py-1 rounded border">Images</span>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Maximum file size: 50MB per file
                  </p>
                </>
              )}
            </div>

            {/* Upload animation overlay */}
            {isDragActive && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-full p-4 shadow-lg">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fadeIn">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 mb-2">
                Some files couldn't be uploaded:
              </h4>
              <ul className="space-y-1">
                {fileRejections.map(({ file, errors }) => (
                  <li key={file.name} className="text-sm text-red-700">
                    <span className="font-medium">{file.name}:</span> {errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-green-800 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Files Ready for Analysis ({uploadedFiles.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {uploadedFiles.map((file) => (
              <div key={file.name} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start flex-1 min-w-0">
                    <div className="bg-blue-100 rounded-lg p-2 mr-4 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-xs text-green-600 bg-green-100 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                      Ready
                    </span>
                    <button
                      onClick={() => removeFile(file)}
                      className={`transition-colors duration-200 p-1.5 rounded-full ${
                        isAnalyzing
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer'
                      }`}
                      disabled={isAnalyzing}
                      title={isAnalyzing ? "Cannot remove files during analysis" : "Remove file"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

FileUpload.displayName = 'FileUpload'

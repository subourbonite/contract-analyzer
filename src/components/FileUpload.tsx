import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void
  isAnalyzing: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesUploaded, isAnalyzing }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles)
    onFilesUploaded(acceptedFiles)
  }, [onFilesUploaded])

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

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Upload Contracts
      </h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center">
          {isAnalyzing ? (
            <Loader2 className="h-12 w-12 text-primary-500 mb-4 animate-spin" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
          )}

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isAnalyzing ? 'Analyzing Contracts...' : 'Drop contracts here'}
          </h3>

          <p className="text-gray-600 mb-4">
            {isAnalyzing
              ? 'Processing your files with AWS Textract and Bedrock'
              : 'or click to browse files'
            }
          </p>

          <p className="text-sm text-gray-500">
            Supports: .txt, .doc, .docx, .pdf, images (PNG, JPG, etc.)
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <h4 className="text-sm font-medium text-red-800">
              Some files were rejected:
            </h4>
          </div>
          <ul className="mt-2 text-sm text-red-700">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                {file.name}: {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Uploaded Files:
          </h4>
          <ul className="space-y-2">
            {uploadedFiles.map((file) => (
              <li key={file.name} className="flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                <span>{file.name}</span>
                <span className="ml-auto text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

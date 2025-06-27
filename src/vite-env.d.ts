/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION?: string
  readonly VITE_S3_BUCKET_NAME?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STREAM_URL: string
  // Agrega otras variables de entorno aquí
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
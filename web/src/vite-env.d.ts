/// <reference types="vite/client" />

declare module "*.csv?raw" {
  const contenido: string;
  export default contenido;
}

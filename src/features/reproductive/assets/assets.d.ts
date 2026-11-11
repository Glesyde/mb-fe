// Vite asset URL imports used by the feature (the project has no vite/client types).
declare module "*.ttf?url" {
  const url: string;
  export default url;
}

export function assetUrl(path) {
  return `${import.meta.env?.BASE_URL ?? './'}${path}`;
}

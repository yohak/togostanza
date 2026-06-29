export const packageName = "togostanza";

export function formatPackageIdentity(version = "0.0.0"): string {
  return `${packageName}@${version}`;
}

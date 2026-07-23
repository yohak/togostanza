export type PackageMetadata = {
    name: string;
    version: string;
};
export declare const packageMetadata: PackageMetadata;
export declare const packageName: string;
export declare function formatPackageIdentity(metadata?: PackageMetadata): string;
export declare function readPackageMetadata(startUrl?: string): PackageMetadata;
//# sourceMappingURL=index.d.ts.map
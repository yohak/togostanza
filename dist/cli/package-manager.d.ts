export type PackageManager = "npm" | "pnpm";
export type PackageManagerResolution = {
    lockfilePath?: string;
    packageManager: PackageManager;
} | {
    error: string;
};
export type ResolvePackageManagerOptions = {
    explicitPackageManager?: string;
    rootDirectory?: string;
    useLockfile?: boolean;
    userAgent?: string;
};
export declare function resolvePackageManager(options?: ResolvePackageManagerOptions): PackageManagerResolution;
//# sourceMappingURL=package-manager.d.ts.map
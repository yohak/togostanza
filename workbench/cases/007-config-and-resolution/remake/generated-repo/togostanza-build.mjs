export default function case007MjsConfigMarker() {
  return {
    plugins: [
      {
        name: 'case-007-mjs-config-marker',
        buildStart() {
          this.warn('case-007: togostanza-build.mjs was executed');
        }
      }
    ]
  };
}

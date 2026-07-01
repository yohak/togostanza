module.exports = function case007JsConfigMarker() {
  return {
    plugins: [
      {
        name: 'case-007-js-config-marker',
        buildStart() {
          this.warn('case-007: togostanza-build.js was executed');
        }
      }
    ]
  };
};

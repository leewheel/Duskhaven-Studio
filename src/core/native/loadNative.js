function loadNative(packageName) {
  const runtimeRequire = typeof __non_webpack_require__ === 'function'
    ? __non_webpack_require__
    : eval('require');

  return runtimeRequire(packageName);
}

module.exports = loadNative;

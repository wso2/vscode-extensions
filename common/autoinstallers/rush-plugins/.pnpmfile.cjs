'use strict';

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file.  (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * For details, see the PNPM documentation:
 * https://pnpm.js.org/docs/en/hooks.html
 *
 * IMPORTANT: SINCE THIS FILE CONTAINS EXECUTABLE CODE, MODIFYING IT IS LIKELY TO INVALIDATE
 * ANY CACHED DEPENDENCY ANALYSIS.  After any modification to pnpmfile.js, it's recommended to run
 * "rush update --full" so that PNPM will recalculate all version selections.
 */
module.exports = {
  hooks: {
    readPackage(pkg, context) {
      function applyOverrides(deps) {
        if (!deps) return;
        if (deps['fast-xml-parser']) deps['fast-xml-parser'] = '5.3.8';
        if (deps['minimatch']) {
          const currentVersion = deps['minimatch'];
          let newVersion;
          if (currentVersion.startsWith('^3') || currentVersion.startsWith('3')) {
            newVersion = '3.1.4';
          } else if (currentVersion.startsWith('^10') || currentVersion.startsWith('10')) {
            newVersion = '10.2.3';
          } else {
            newVersion = '10.2.3';
          }
          deps['minimatch'] = newVersion;
        }
      }

      applyOverrides(pkg.dependencies);
      applyOverrides(pkg.devDependencies);

      return pkg;
    }
  }
};

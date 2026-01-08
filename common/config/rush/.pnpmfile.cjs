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
      if (pkg.dependencies) {
        if (pkg.dependencies['vfile']) {
          pkg.dependencies['vfile'] = '6.0.3';
        }
        
        // Security vulnerability fixes
        if (pkg.dependencies['brace-expansion']) {
          pkg.dependencies['brace-expansion'] = '2.0.2';
        }
        if (pkg.dependencies['http-proxy']) {
          pkg.dependencies['http-proxy'] = '1.18.1';
        }
        if (pkg.dependencies['prismjs']) {
          pkg.dependencies['prismjs'] = '1.30.0';
        }
        if (pkg.dependencies['webpack']) {
          pkg.dependencies['webpack'] = '5.94.0';
        }
        if (pkg.dependencies['webpack-dev-server']) {
          pkg.dependencies['webpack-dev-server'] = '5.2.1';
        }
        if (pkg.dependencies['braces']) {
          pkg.dependencies['braces'] = '3.0.3';
        }
        if (pkg.dependencies['micromatch']) {
          pkg.dependencies['micromatch'] = '4.0.8';
        }
        if (pkg.dependencies['esbuild']) {
          pkg.dependencies['esbuild'] = '0.25.0';
        }
        if (pkg.dependencies['xmldom']) {
          pkg.dependencies['xmldom'] = 'npm:@xmldom/xmldom@0.8.10';
        }
        if (pkg.dependencies['@eslint/plugin-kit']) {
          pkg.dependencies['@eslint/plugin-kit'] = '0.3.4';
        }
        if (pkg.dependencies['on-headers']) {
          pkg.dependencies['on-headers'] = '1.1.0';
        }
        if (pkg.dependencies['form-data']) {
          pkg.dependencies['form-data'] = '4.0.4';
        }
        if (pkg.dependencies['min-document']) {
          pkg.dependencies['min-document'] = '2.19.1';
        }
        if (pkg.dependencies['js-yaml']) {
          pkg.dependencies['js-yaml'] = '4.1.1';
        }
      }

      if (pkg.devDependencies) {
        // Security vulnerability fixes for dev dependencies
        if (pkg.devDependencies['brace-expansion']) {
          pkg.devDependencies['brace-expansion'] = '2.0.2';
        }
        if (pkg.devDependencies['http-proxy']) {
          pkg.devDependencies['http-proxy'] = '1.18.1';
        }
        if (pkg.devDependencies['prismjs']) {
          pkg.devDependencies['prismjs'] = '1.30.0';
        }
        if (pkg.devDependencies['webpack']) {
          pkg.devDependencies['webpack'] = '5.94.0';
        }
        if (pkg.devDependencies['webpack-dev-server']) {
          pkg.devDependencies['webpack-dev-server'] = '5.2.1';
        }
        if (pkg.devDependencies['braces']) {
          pkg.devDependencies['braces'] = '3.0.3';
        }
        if (pkg.devDependencies['micromatch']) {
          pkg.devDependencies['micromatch'] = '4.0.8';
        }
        if (pkg.devDependencies['esbuild']) {
          pkg.devDependencies['esbuild'] = '0.25.0';
        }
        if (pkg.devDependencies['xmldom']) {
          pkg.devDependencies['xmldom'] = 'npm:@xmldom/xmldom@0.8.10';
        }
        if (pkg.devDependencies['@eslint/plugin-kit']) {
          pkg.devDependencies['@eslint/plugin-kit'] = '0.3.4';
        }
        if (pkg.devDependencies['on-headers']) {
          pkg.devDependencies['on-headers'] = '1.1.0';
        }
        if (pkg.devDependencies['form-data']) {
          pkg.devDependencies['form-data'] = '4.0.4';
        }
        if (pkg.devDependencies['min-document']) {
          pkg.devDependencies['min-document'] = '2.19.1';
        }
      }

      return pkg;
    }
  }
};

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  // // The karma types have a missing dependency on typings from the log4js package.
  // if (packageJson.name === '@types/karma') {
  //  context.log('Fixed up dependencies for @types/karma');
  //  packageJson.dependencies['log4js'] = '0.6.38';
  // }

  return packageJson;
}

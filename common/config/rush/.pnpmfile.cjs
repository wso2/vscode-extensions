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
        if (pkg.dependencies['@modelcontextprotocol/sdk']) {
          pkg.dependencies['@modelcontextprotocol/sdk'] = '^1.26.0';
        }
        if (pkg.dependencies['@isaacs/brace-expansion']) {
          pkg.dependencies['@isaacs/brace-expansion'] = '^5.0.1';
        }
        if (pkg.dependencies['axios']) {
          pkg.dependencies['axios'] = '^1.13.5';
        }
        if (pkg.dependencies['http-proxy']) {
          pkg.dependencies['http-proxy'] = '^1.18.1';
        }
        if (pkg.dependencies['prismjs']) {
          pkg.dependencies['prismjs'] = '^1.30.0';
        }
        if (pkg.dependencies['webpack']) {
          pkg.dependencies['webpack'] = '^5.94.0';
        }
        if (pkg.dependencies['webpack-dev-server']) {
          pkg.dependencies['webpack-dev-server'] = '^5.2.1';
        }
        if (pkg.dependencies['braces']) {
          pkg.dependencies['braces'] = '^3.0.3';
        }
        if (pkg.dependencies['micromatch']) {
          pkg.dependencies['micromatch'] = '^4.0.8';
        }
        if (pkg.dependencies['esbuild']) {
          pkg.dependencies['esbuild'] = '^0.25.0';
        }
        if (pkg.dependencies['xmldom']) {
          pkg.dependencies['xmldom'] = 'npm:@xmldom/xmldom@^0.8.10';
        }
        if (pkg.dependencies['@eslint/plugin-kit']) {
          pkg.dependencies['@eslint/plugin-kit'] = '^0.3.4';
        }
        if (pkg.dependencies['on-headers']) {
          pkg.dependencies['on-headers'] = '^1.1.0';
        }
        if (pkg.dependencies['form-data']) {
          pkg.dependencies['form-data'] = '^4.0.4';
        }
        if (pkg.dependencies['min-document']) {
          pkg.dependencies['min-document'] = '^2.19.1';
        }
        if (pkg.dependencies['js-yaml']) {
          pkg.dependencies['js-yaml'] = '^4.1.1';
        }
        if (pkg.dependencies['diff']) {
          pkg.dependencies['diff'] = '^8.0.3';
        }
        if (pkg.dependencies['eslint']) {
          pkg.dependencies['eslint'] = '^9.27.0';
        }
        if (pkg.dependencies['fast-xml-parser']) {
          pkg.dependencies['fast-xml-parser'] = '5.3.7';
        }
        if (pkg.dependencies['hono']) {
          pkg.dependencies['hono'] = '^4.11.7';
        }
        if (pkg.dependencies['lodash']) {
          pkg.dependencies['lodash'] = '4.17.23';
        }
        if (pkg.dependencies['bn.js']) {
          pkg.dependencies['bn.js'] = '5.2.3';
        }
      }

      if (pkg.devDependencies) {
        // Security vulnerability fixes for dev dependencies
        if (pkg.devDependencies['@modelcontextprotocol/sdk']) {
          pkg.devDependencies['@modelcontextprotocol/sdk'] = '^1.26.0';
        }
        if (pkg.devDependencies['@isaacs/brace-expansion']) {
          pkg.devDependencies['@isaacs/brace-expansion'] = '^5.0.1';
        }
        if (pkg.devDependencies['axios']) {
          pkg.devDependencies['axios'] = '^1.13.5';
        }
        if (pkg.devDependencies['http-proxy']) {
          pkg.devDependencies['http-proxy'] = '^1.18.1';
        }
        if (pkg.devDependencies['prismjs']) {
          pkg.devDependencies['prismjs'] = '^1.30.0';
        }
        if (pkg.devDependencies['webpack']) {
          pkg.devDependencies['webpack'] = '^5.94.0';
        }
        if (pkg.devDependencies['webpack-dev-server']) {
          pkg.devDependencies['webpack-dev-server'] = '^5.2.1';
        }
        if (pkg.devDependencies['braces']) {
          pkg.devDependencies['braces'] = '^3.0.3';
        }
        if (pkg.devDependencies['micromatch']) {
          pkg.devDependencies['micromatch'] = '^4.0.8';
        }
        if (pkg.devDependencies['esbuild']) {
          pkg.devDependencies['esbuild'] = '^0.25.0';
        }
        if (pkg.devDependencies['xmldom']) {
          pkg.devDependencies['xmldom'] = 'npm:@xmldom/xmldom@^0.8.10';
        }
        if (pkg.devDependencies['@eslint/plugin-kit']) {
          pkg.devDependencies['@eslint/plugin-kit'] = '^0.3.4';
        }
        if (pkg.devDependencies['on-headers']) {
          pkg.devDependencies['on-headers'] = '^1.1.0';
        }
        if (pkg.devDependencies['form-data']) {
          pkg.devDependencies['form-data'] = '^4.0.4';
        }
        if (pkg.devDependencies['min-document']) {
          pkg.devDependencies['min-document'] = '^2.19.1';
        }
        if (pkg.devDependencies['diff']) {
          pkg.devDependencies['diff'] = '^8.0.3';
        }
        if (pkg.devDependencies['eslint']) {
          pkg.devDependencies['eslint'] = '^9.27.0';
        }
        if (pkg.devDependencies['fast-xml-parser']) {
          pkg.devDependencies['fast-xml-parser'] = '5.3.7';
        }
        if (pkg.devDependencies['hono']) {
          pkg.devDependencies['hono'] = '^4.11.7';
        }
        if (pkg.devDependencies['lodash']) {
          pkg.devDependencies['lodash'] = '4.17.23';
        }
        if (pkg.devDependencies['bn.js']) {
          pkg.devDependencies['bn.js'] = '5.2.3';
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

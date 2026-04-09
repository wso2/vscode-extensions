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
        if (deps['http-proxy']) deps['http-proxy'] = '1.18.1';
        if (deps['prismjs']) deps['prismjs'] = '1.30.0';
        if (deps['xmldom']) deps['xmldom'] = 'npm:@xmldom/xmldom@0.8.10';
        if (deps['braces']) deps['braces'] = '3.0.3';
        if (deps['micromatch']) deps['micromatch'] = '4.0.8';
        if (deps['js-yaml']) deps['js-yaml'] = '4.1.1';
        if (deps['diff']) deps['diff'] = '^8.0.3';
        if (deps['eslint']) deps['eslint'] = '^9.27.0';
        if (deps['fast-xml-parser']) deps['fast-xml-parser'] = '5.5.7';
        if (deps['esbuild']) deps['esbuild'] = '0.25.12';
        if (deps['lodash']) deps['lodash'] = '4.18.0';
        if (deps['qs']) deps['qs'] = '6.14.2';
        if (deps['hono']) deps['hono'] = '4.12.12';
        if (deps['serialize-javascript']) deps['serialize-javascript'] = '7.0.3';
        if (deps['@hono/node-server']) deps['@hono/node-server'] = '1.19.13';
        if (deps['@tootallnate/once']) deps['@tootallnate/once'] = '3.0.1';
        if (deps['dompurify']) deps['dompurify'] = '3.3.2';
        if (deps['express-rate-limit']) deps['express-rate-limit'] = '8.2.2';
        if (deps['file-type']) deps['file-type'] = '21.3.2';
        if (deps['immutable']) deps['immutable'] = '3.8.3';
        if (deps['serialize-javascript']) deps['serialize-javascript'] = '7.0.5';
        if (deps['flatted']) deps['flatted'] = '3.4.2';
        if (deps['handlebars']) deps['handlebars'] = '4.7.9';
        if (deps['undici']) deps['undici'] = '7.24.0';
        if (deps['yauzl']) deps['yauzl'] = '3.2.1';
        if (deps['bn.js']) {
          deps['bn.js'] = deps['bn.js'].startsWith('^5') ? '5.2.3' : '4.12.3';
        }
        if (deps['minimatch']) {
          const currentVersion = deps['minimatch'];
          let newVersion;
          if (currentVersion.startsWith('^3') || currentVersion.startsWith('3')) {
            newVersion = '3.1.4';
          } else if (currentVersion.startsWith('^4') || currentVersion.startsWith('4')) {
            newVersion = '4.2.5';
          } else if (currentVersion.startsWith('^5') || currentVersion.startsWith('5')) {
            newVersion = '5.1.8';
          } else if (currentVersion.startsWith('^6') || currentVersion.startsWith('6')) {
            newVersion = '6.2.2';
          } else if (currentVersion.startsWith('^7') || currentVersion.startsWith('7')) {
            newVersion = '7.4.8';
          } else if (currentVersion.startsWith('^8') || currentVersion.startsWith('8')) {
            newVersion = '8.0.6';
          } else if (currentVersion.startsWith('^9') || currentVersion.startsWith('9')) {
            newVersion = '9.0.7';
          } else if (currentVersion.startsWith('^10') || currentVersion.startsWith('10')) {
            newVersion = '10.2.3';
          } else {
            context.log(`Unexpected minimatch version: ${currentVersion}`);
            newVersion = currentVersion;
          }
          deps['minimatch'] = newVersion;
        }
        if (deps['brace-expansion']) {
          const currentVersion = deps['brace-expansion'];
          let newVersion;
          if (currentVersion.startsWith('^1') || currentVersion.startsWith('1')) {
            newVersion = '1.1.13';
          } else if (currentVersion.startsWith('^2') || currentVersion.startsWith('2')) {
            newVersion = '2.0.3';
          } else if (currentVersion.startsWith('^3') || currentVersion.startsWith('3')) {
            newVersion = '3.0.2';
          } else if (currentVersion.startsWith('^5') || currentVersion.startsWith('5')) {
            newVersion = '5.0.5';
          } else {
            context.log(`Unexpected brace-expansion version: ${currentVersion}`);
            newVersion = currentVersion;
          }
          deps['brace-expansion'] = newVersion;
        }
        if (deps['path-to-regexp']) {
          const currentVersion = deps['path-to-regexp'];
          let newVersion;
          if (currentVersion.startsWith('^0.1') || currentVersion.startsWith('~0.1') || currentVersion.startsWith('0.1')) {
            newVersion = '0.1.13';
          } else if (currentVersion.startsWith('^8') || currentVersion.startsWith('8')) {
            newVersion = '8.4.0';
          } else {
            context.log(`Unexpected path-to-regexp version: ${currentVersion}`);
            newVersion = currentVersion;
          }
          deps['path-to-regexp'] = newVersion;
        }
        if (deps['picomatch']) {
          const currentVersion = deps['picomatch'];
          let newVersion;
          if (currentVersion.startsWith('^2') || currentVersion.startsWith('2')) {
            newVersion = '2.3.2';
          } else if (currentVersion.startsWith('^3') || currentVersion.startsWith('3')) {
            newVersion = '3.0.2';
          } else if (currentVersion.startsWith('^4') || currentVersion.startsWith('4')) {
            newVersion = '4.0.4';
          } else {
            context.log(`Unexpected picomatch version: ${currentVersion}`);
            newVersion = currentVersion;
          }
          deps['picomatch'] = newVersion;
        }
        if (deps['yaml']) {
          const currentVersion = deps['yaml'];
          let newVersion;
          if (currentVersion.startsWith('^1') || currentVersion.startsWith('1')) {
            newVersion = '1.10.3';
          } else if (currentVersion.startsWith('^2') || currentVersion.startsWith('2')) {
            newVersion = '2.8.3';
          } else {
            context.log(`Unexpected yaml version: ${currentVersion}`);
            newVersion = currentVersion;
          }
          deps['yaml'] = newVersion;
        }
      }

      applyOverrides(pkg.dependencies);
      applyOverrides(pkg.devDependencies);

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

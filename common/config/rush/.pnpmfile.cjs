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
        if (deps['fast-xml-parser']) deps['fast-xml-parser'] = '5.7.0';
        if (deps['lodash']) deps['lodash'] = '4.18.0';
        if (deps['qs']) deps['qs'] = '6.15.2';
        if (deps['serialize-javascript']) deps['serialize-javascript'] = '7.0.5';
        if (deps['@hono/node-server']) deps['@hono/node-server'] = '1.19.13';
        if (deps['@tootallnate/once']) deps['@tootallnate/once'] = '3.0.1';
        if (deps['dompurify']) deps['dompurify'] = '3.4.0';
        if (deps['express-rate-limit']) deps['express-rate-limit'] = '8.2.2';
        if (deps['hono']) deps['hono'] = '4.12.21';
        if (deps['immutable']) deps['immutable'] = '3.8.3';
        if (deps['handlebars']) deps['handlebars'] = '4.7.9';
        if (deps['protobufjs']) {
          const currentVersion = deps['protobufjs'];
          if (currentVersion.startsWith('^8') || currentVersion.startsWith('8')) {
            deps['protobufjs'] = '8.2.0'; // security fix: CVE-2026-45740
          } else {
            deps['protobufjs'] = '7.5.8'; // security fix: CVE-2026-45740
          }
        }
        if (deps['@protobufjs/utf8']) deps['@protobufjs/utf8'] = '1.1.1';
        if (deps['axios']) deps['axios'] = '1.16.0';
        if (deps['flatted']) deps['flatted'] = '3.4.2';
        if (deps['fast-uri']) deps['fast-uri'] = '3.1.2';
        if (deps['ip-address']) deps['ip-address'] = '10.1.1';
        if (deps['file-type']) deps['file-type'] = '21.3.2';
        if (deps['@nevware21/ts-utils']) deps['@nevware21/ts-utils'] = '0.14.0';
        if (deps['bn.js']) {
          deps['bn.js'] = deps['bn.js'].startsWith('^5') ? '5.2.3' : '4.12.3';
        }
        if (deps['brace-expansion']) {
          const bev = deps['brace-expansion'];
          if (bev.startsWith('^1') || bev.startsWith('1')) deps['brace-expansion'] = '1.1.13';
          else if (bev.startsWith('^2') || bev.startsWith('2')) deps['brace-expansion'] = '2.0.3';
          else if (bev.startsWith('^5') || bev.startsWith('5')) deps['brace-expansion'] = '5.0.6'; // security fix: CVE-2026-45149
        }
        if (deps['picomatch']) {
          const pmv = deps['picomatch'];
          if (pmv.startsWith('^2') || pmv.startsWith('2')) deps['picomatch'] = '2.3.2';
          else if (pmv.startsWith('^4') || pmv.startsWith('4')) deps['picomatch'] = '4.0.4';
        }
        if (deps['path-to-regexp']) {
          const ptrv = deps['path-to-regexp'];
          if (ptrv.startsWith('^0') || ptrv.startsWith('0')) deps['path-to-regexp'] = '0.1.13';
          else if (ptrv.startsWith('^8') || ptrv.startsWith('8')) deps['path-to-regexp'] = '8.4.0';
        }
        if (deps['tmp']) {
          const tv = deps['tmp'];
          if (tv.startsWith('^0.2') || tv.startsWith('0.2')) deps['tmp'] = '0.2.6';
        }
        if (deps['undici']) {
          const uv = deps['undici'];
          if (uv.startsWith('^6') || uv.startsWith('6')) deps['undici'] = '6.24.0';
          else if (uv.startsWith('^7') || uv.startsWith('7')) deps['undici'] = '7.24.0';
        }
        if (deps['uuid']) deps['uuid'] = '14.0.0'; // security fix: CVE-2026-41907
        if (deps['webpack-dev-server']) {
          const wdsv = deps['webpack-dev-server'];
          if (wdsv.startsWith('^5') || wdsv.startsWith('5')) deps['webpack-dev-server'] = '5.2.4';
        }
        if (deps['ws']) {
          const wsv = deps['ws'];
          if (wsv.startsWith('^8') || wsv.startsWith('8')) deps['ws'] = '8.20.1';
        }
        if (deps['postcss']) {
          const pv = deps['postcss'];
          if (pv.startsWith('^8') || pv.startsWith('8')) deps['postcss'] = '8.5.13'; // security fix: CVE-2026-41305
        }
        if (deps['yaml']) {
          const yamlv = deps['yaml'];
          if (yamlv.startsWith('^1') || yamlv.startsWith('1')) deps['yaml'] = '1.10.3';
          else if (yamlv.startsWith('^2') || yamlv.startsWith('2')) deps['yaml'] = '2.8.3'; // security fix: CVE-2026-33532
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

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
        if (deps['js-yaml']) deps['js-yaml'] = '4.2.0';
        if (deps['diff']) deps['diff'] = '8.0.3';
        if (deps['eslint']) deps['eslint'] = '^9.27.0';
        if (deps['axios']) deps['axios'] = '1.16.0';
        if (deps['fast-xml-parser']) deps['fast-xml-parser'] = '5.7.0';
        if (deps['esbuild']) deps['esbuild'] = '0.25.12';
        if (deps['lodash']) deps['lodash'] = '4.18.0';
        if (deps['qs']) deps['qs'] = '6.15.2';
        if (deps['hono']) deps['hono'] = '4.12.25';
        if (deps['@opentelemetry/exporter-prometheus']) deps['@opentelemetry/exporter-prometheus'] = '0.217.0';
        if (deps['@opentelemetry/sdk-node']) deps['@opentelemetry/sdk-node'] = '0.217.0';
        if (deps['ip-address']) deps['ip-address'] = '10.1.1';
        if (deps['postcss']) deps['postcss'] = '8.5.10';
        if (deps['webpack-dev-server']) deps['webpack-dev-server'] = '5.2.5';
        if (deps['fast-xml-builder']) deps['fast-xml-builder'] = '1.1.7';
        if (deps['fast-uri']) deps['fast-uri'] = '3.1.2';
        if (deps['@nevware21/ts-utils']) deps['@nevware21/ts-utils'] = '0.14.0';
        if (deps['@protobufjs/utf8']) deps['@protobufjs/utf8'] = '1.1.1';
        if (deps['serialize-javascript']) deps['serialize-javascript'] = '7.0.3';
        if (deps['@hono/node-server']) deps['@hono/node-server'] = '1.19.13';
        if (deps['@tootallnate/once']) deps['@tootallnate/once'] = '3.0.1';
        if (deps['dompurify']) deps['dompurify'] = '3.4.11';
        if (deps['express-rate-limit']) deps['express-rate-limit'] = '8.2.2';
        if (deps['file-type']) deps['file-type'] = '21.3.2';
        if (deps['immutable']) deps['immutable'] = '3.8.3';
        if (deps['serialize-javascript']) deps['serialize-javascript'] = '7.0.5';
        if (deps['flatted']) deps['flatted'] = '3.4.2';
        if (deps['handlebars']) deps['handlebars'] = '4.7.9';
        if (deps['tmp']) deps['tmp'] = '0.2.7';
        if (deps['undici']) deps['undici'] = '7.28.0';
        if (deps['shell-quote']) deps['shell-quote'] = '1.8.4';
        if (deps['@babel/core']) deps['@babel/core'] = '7.29.6';
        if (deps['@opentelemetry/core']) deps['@opentelemetry/core'] = '2.8.0';
        if (deps['joi']) deps['joi'] = '17.13.4';
        if (deps['http-proxy-middleware']) deps['http-proxy-middleware'] = '2.0.10';
        if (deps['form-data']) {
          const currentVersion = deps['form-data'];
          if (currentVersion.startsWith('^4') || currentVersion.startsWith('~4') || currentVersion.startsWith('4')) {
            deps['form-data'] = '4.0.6';
          } else if (currentVersion.startsWith('^3') || currentVersion.startsWith('~3') || currentVersion.startsWith('3')) {
            deps['form-data'] = '3.0.5';
          } else if (currentVersion.startsWith('^2') || currentVersion.startsWith('~2') || currentVersion.startsWith('2')) {
            deps['form-data'] = '2.5.6';
          }
        }
        if (deps['markdown-it']) {
          const currentVersion = deps['markdown-it'];
          if (currentVersion.startsWith('^14') || currentVersion.startsWith('~14') || currentVersion.startsWith('14')) {
            deps['markdown-it'] = '14.2.0';
          }
        }
        if (deps['uuid']) deps['uuid'] = '14.0.0';
        if (deps['protobufjs']) {
          const currentVersion = deps['protobufjs'];
          if (currentVersion.startsWith('^8') || currentVersion.startsWith('8')) {
            deps['protobufjs'] = '8.6.0';
          } else {
            deps['protobufjs'] = '7.6.3';
          }
        }
        if (deps['vite']) deps['vite'] = '6.0.14';
        if (deps['yauzl']) deps['yauzl'] = '3.2.1';
        if (deps['follow-redirects']) deps['follow-redirects'] = '1.16.0';
        if (deps['bn.js']) {
          deps['bn.js'] = deps['bn.js'].startsWith('^5') ? '5.2.3' : '4.12.3';
        }
        if (deps['minimatch']) {
          const currentVersion = deps['minimatch'];
          let newVersion;
          if (currentVersion.startsWith('^3') || currentVersion.startsWith('3')) {
            newVersion = '3.1.5';
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
            newVersion = '5.0.6';
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

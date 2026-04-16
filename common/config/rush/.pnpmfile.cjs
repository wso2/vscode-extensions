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
          pkg.dependencies['@isaacs/brace-expansion'] = '^5.0.5';
        }
        if (pkg.dependencies['axios']) {
          pkg.dependencies['axios'] = '^1.15.0';
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
          const ver = pkg.dependencies['fast-xml-parser'];
          if (/^[\^~]?4\./.test(ver)) {
            pkg.dependencies['fast-xml-parser'] = '4.5.5';
          } else {
            pkg.dependencies['fast-xml-parser'] = '5.5.7';
          }
        }
        if (pkg.dependencies['hono']) {
          pkg.dependencies['hono'] = '^4.12.14';
        }
        if (pkg.dependencies['@hono/node-server']) {
          pkg.dependencies['@hono/node-server'] = '^1.19.13';
        }
        if (pkg.dependencies['dompurify']) {
          pkg.dependencies['dompurify'] = '^3.4.0';
        }
        if (pkg.dependencies['express-rate-limit']) {
          pkg.dependencies['express-rate-limit'] = '^8.2.2';
        }
        if (pkg.dependencies['@tootallnate/once']) {
          pkg.dependencies['@tootallnate/once'] = '^3.0.1';
        }
        if (pkg.dependencies['immutable']) {
          pkg.dependencies['immutable'] = '^3.8.3';
        }
        if (pkg.dependencies['serialize-javascript']) {
          pkg.dependencies['serialize-javascript'] = '^7.0.5';
        }
        if (pkg.dependencies['follow-redirects']) {
          pkg.dependencies['follow-redirects'] = '^1.16.0';
        }
        if (pkg.dependencies['flatted']) {
          pkg.dependencies['flatted'] = '^3.4.2';
        }
        if (pkg.dependencies['handlebars']) {
          pkg.dependencies['handlebars'] = '^4.7.9';
        }
        if (pkg.dependencies['minimatch']) {
          const ver = pkg.dependencies['minimatch'];
          if (/^[\^~]?3\./.test(ver)) {
            pkg.dependencies['minimatch'] = '^3.1.4';
          } else if (/^[\^~]?5\./.test(ver)) {
            pkg.dependencies['minimatch'] = '^5.1.8';
          } else if (/^[\^~]?9\./.test(ver)) {
            pkg.dependencies['minimatch'] = '^9.0.7';
          } else if (/^[\^~]?10\./.test(ver)) {
            pkg.dependencies['minimatch'] = '^10.2.3';
          }
        }
        if (pkg.dependencies['path-to-regexp']) {
          const ver = pkg.dependencies['path-to-regexp'];
          if (/^0\.1\./.test(ver)) {
            pkg.dependencies['path-to-regexp'] = '0.1.13';
          } else if (/^[\^~]?8\./.test(ver)) {
            pkg.dependencies['path-to-regexp'] = '^8.4.0';
          }
        }
        if (pkg.dependencies['picomatch']) {
          const ver = pkg.dependencies['picomatch'];
          if (/^[\^~]?2\./.test(ver)) {
            pkg.dependencies['picomatch'] = '^2.3.2';
          } else if (/^[\^~]?3\./.test(ver)) {
            pkg.dependencies['picomatch'] = '^3.0.2';
          } else if (/^[\^~]?4\./.test(ver)) {
            pkg.dependencies['picomatch'] = '^4.0.4';
          }
        }
        if (pkg.dependencies['brace-expansion']) {
          const ver = pkg.dependencies['brace-expansion'];
          if (/^[\^~]?1\./.test(ver)) {
            pkg.dependencies['brace-expansion'] = '^1.1.13';
          } else if (/^[\^~]?2\./.test(ver)) {
            pkg.dependencies['brace-expansion'] = '^2.0.3';
          } else if (/^[\^~]?5\./.test(ver)) {
            pkg.dependencies['brace-expansion'] = '^5.0.5';
          }
        }
        if (pkg.dependencies['lodash']) {
          pkg.dependencies['lodash'] = '4.18.0';
        }
        if (pkg.dependencies['bn.js']) {
          pkg.dependencies['bn.js'] = '5.2.3';
        }
        if (pkg.dependencies['undici']) {
          const ver = pkg.dependencies['undici'];
          if (/^[\^~]?6\./.test(ver)) {
            pkg.dependencies['undici'] = '^6.24.0';
          } else if (/^[\^~]?7\./.test(ver)) {
            pkg.dependencies['undici'] = '^7.24.0';
          }
        }
        if (pkg.dependencies['yaml']) {
          const ver = pkg.dependencies['yaml'];
          if (/^[\^~]?1\./.test(ver)) {
            pkg.dependencies['yaml'] = '^1.10.3';
          } else if (/^[\^~]?2\./.test(ver)) {
            pkg.dependencies['yaml'] = '^2.8.3';
          }
        }
      }

      if (pkg.devDependencies) {
        // Security vulnerability fixes for dev dependencies
        if (pkg.devDependencies['@modelcontextprotocol/sdk']) {
          pkg.devDependencies['@modelcontextprotocol/sdk'] = '^1.26.0';
        }
        if (pkg.devDependencies['@isaacs/brace-expansion']) {
          pkg.devDependencies['@isaacs/brace-expansion'] = '^5.0.5';
        }
        if (pkg.devDependencies['axios']) {
          pkg.devDependencies['axios'] = '^1.15.0';
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
          const ver = pkg.devDependencies['fast-xml-parser'];
          if (/^[\^~]?4\./.test(ver)) {
            pkg.devDependencies['fast-xml-parser'] = '4.5.5';
          } else {
            pkg.devDependencies['fast-xml-parser'] = '5.5.7';
          }
        }
        if (pkg.devDependencies['hono']) {
          pkg.devDependencies['hono'] = '^4.12.14';
        }
        if (pkg.devDependencies['@hono/node-server']) {
          pkg.devDependencies['@hono/node-server'] = '^1.19.13';
        }
        if (pkg.devDependencies['dompurify']) {
          pkg.devDependencies['dompurify'] = '^3.4.0';
        }
        if (pkg.devDependencies['express-rate-limit']) {
          pkg.devDependencies['express-rate-limit'] = '^8.2.2';
        }
        if (pkg.devDependencies['@tootallnate/once']) {
          pkg.devDependencies['@tootallnate/once'] = '^3.0.1';
        }
        if (pkg.devDependencies['immutable']) {
          pkg.devDependencies['immutable'] = '^3.8.3';
        }
        if (pkg.devDependencies['serialize-javascript']) {
          pkg.devDependencies['serialize-javascript'] = '^7.0.5';
        }
        if (pkg.devDependencies['follow-redirects']) {
          pkg.devDependencies['follow-redirects'] = '^1.16.0';
        }
        if (pkg.devDependencies['flatted']) {
          pkg.devDependencies['flatted'] = '^3.4.2';
        }
        if (pkg.devDependencies['handlebars']) {
          pkg.devDependencies['handlebars'] = '^4.7.9';
        }
        if (pkg.devDependencies['minimatch']) {
          const ver = pkg.devDependencies['minimatch'];
          if (/^[\^~]?3\./.test(ver)) {
            pkg.devDependencies['minimatch'] = '^3.1.4';
          } else if (/^[\^~]?5\./.test(ver)) {
            pkg.devDependencies['minimatch'] = '^5.1.8';
          } else if (/^[\^~]?9\./.test(ver)) {
            pkg.devDependencies['minimatch'] = '^9.0.7';
          } else if (/^[\^~]?10\./.test(ver)) {
            pkg.devDependencies['minimatch'] = '^10.2.3';
          }
        }
        if (pkg.devDependencies['path-to-regexp']) {
          const ver = pkg.devDependencies['path-to-regexp'];
          if (/^0\.1\./.test(ver)) {
            pkg.devDependencies['path-to-regexp'] = '0.1.13';
          } else if (/^[\^~]?8\./.test(ver)) {
            pkg.devDependencies['path-to-regexp'] = '^8.4.0';
          }
        }
        if (pkg.devDependencies['picomatch']) {
          const ver = pkg.devDependencies['picomatch'];
          if (/^[\^~]?2\./.test(ver)) {
            pkg.devDependencies['picomatch'] = '^2.3.2';
          } else if (/^[\^~]?3\./.test(ver)) {
            pkg.devDependencies['picomatch'] = '^3.0.2';
          } else if (/^[\^~]?4\./.test(ver)) {
            pkg.devDependencies['picomatch'] = '^4.0.4';
          }
        }
        if (pkg.devDependencies['brace-expansion']) {
          const ver = pkg.devDependencies['brace-expansion'];
          if (/^[\^~]?1\./.test(ver)) {
            pkg.devDependencies['brace-expansion'] = '^1.1.13';
          } else if (/^[\^~]?2\./.test(ver)) {
            pkg.devDependencies['brace-expansion'] = '^2.0.3';
          } else if (/^[\^~]?5\./.test(ver)) {
            pkg.devDependencies['brace-expansion'] = '^5.0.5';
          }
        }
        if (pkg.devDependencies['lodash']) {
          pkg.devDependencies['lodash'] = '4.18.0';
        }
        if (pkg.devDependencies['bn.js']) {
          pkg.devDependencies['bn.js'] = '5.2.3';
        }
        if (pkg.devDependencies['undici']) {
          const ver = pkg.devDependencies['undici'];
          if (/^[\^~]?6\./.test(ver)) {
            pkg.devDependencies['undici'] = '^6.24.0';
          } else if (/^[\^~]?7\./.test(ver)) {
            pkg.devDependencies['undici'] = '^7.24.0';
          }
        }
        if (pkg.devDependencies['yaml']) {
          const ver = pkg.devDependencies['yaml'];
          if (/^[\^~]?1\./.test(ver)) {
            pkg.devDependencies['yaml'] = '^1.10.3';
          } else if (/^[\^~]?2\./.test(ver)) {
            pkg.devDependencies['yaml'] = '^2.8.3';
          }
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

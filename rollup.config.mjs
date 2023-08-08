import { execSync } from 'child_process';
import fs from 'fs';

// 1st party Rollup plugins
import { createFilter } from '@rollup/pluginutils';
import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import terser from '@rollup/plugin-terser';

// 3rd party Rollup plugins
import dts from 'rollup-plugin-dts';
import jscc from 'rollup-plugin-jscc';
import { visualizer } from 'rollup-plugin-visualizer';

/** @typedef {import('rollup').RollupOptions} RollupOptions */
/** @typedef {import('rollup').Plugin} Plugin */
/** @typedef {import('rollup').OutputOptions} OutputOptions */
/** @typedef {import('@rollup/plugin-babel').RollupBabelInputPluginOptions} RollupBabelInputPluginOptions */
/** @typedef {import('@rollup/plugin-strip').RollupStripOptions} RollupStripOptions */

/**
 * This plugin converts every two spaces into one tab. Two spaces is the default the babel plugin
 * outputs, which is independent of the four spaces of the code base.
 *
 * @param {boolean} enable - Enable or disable the plugin.
 * @returns {Plugin} The plugin.
 */
function spacesToTabs(enable) {
    const filter = createFilter([
        '**/*.js'
    ], []);

    return {
        name: "spacesToTabs",
        transform(code, id) {
            if (!enable || !filter(id)) return undefined;
            // ^    = start of line
            // " +" = one or more spaces
            // gm   = find all + multiline
            const regex = /^ +/gm;
            code = code.replace(
                regex,
                startSpaces => startSpaces.replace(/ {2}/g, '\t')
            );
            return {
                code,
                map: null
            };
        }
    };
}

/**
 * The ES5 options for babel(...) plugin.
 *
 * @param {string} buildType - Only 'debug' requires special handling so far.
 * @returns {RollupBabelInputPluginOptions} The babel options.
 */
const es5Options = buildType => ({
    babelHelpers: 'bundled',
    babelrc: false,
    comments: buildType === 'debug',
    compact: false,
    minified: false,
    presets: [
        [
            '@babel/preset-env', {
                loose: true,
                modules: false,
                targets: {
                    ie: '11'
                }
            }
        ]
    ]
});

/**
 * The ES6 options for babel(...) plugin.
 *
 * @param {string} buildType - Only 'debug' requires special handling so far.
 * @returns {RollupBabelInputPluginOptions} The babel options.
 */
const moduleOptions = buildType => ({
    babelHelpers: 'bundled',
    babelrc: false,
    comments: buildType === 'debug',
    compact: false,
    minified: false,
    presets: [
        [
            '@babel/preset-env', {
                bugfixes: true,
                loose: true,
                modules: false,
                targets: {
                    esmodules: true
                }
            }
        ]
    ]
});

const stripFunctions = [
    'Debug.assert',
    'Debug.assertDeprecated',
    'Debug.assertDestroyed',
    'Debug.call',
    'Debug.deprecated',
    'Debug.warn',
    'Debug.warnOnce',
    'Debug.error',
    'Debug.errorOnce',
    'Debug.log',
    'Debug.logOnce',
    'Debug.trace',
    'DebugHelper.setName',
    'DebugHelper.setLabel',
    `DebugHelper.setDestroyed`,
    'DebugGraphics.toString',
    'DebugGraphics.clearGpuMarkers',
    'DebugGraphics.pushGpuMarker',
    'DebugGraphics.popGpuMarker',
    'WebgpuDebug.validate',
    'WebgpuDebug.memory',
    'WebgpuDebug.internal',
    'WebgpuDebug.end',
    'WorldClustersDebug.render'
];

/**
 * Build a target that rollup is supposed to build.
 *
 * @param {'debug'|'release'|'profiler'|'min'} buildType - The build type.
 * @param {'es5'|'es6'} moduleFormat - The module format.
 * @returns {RollupOptions} One rollup target.
 */
function buildTarget(rootFile, outName, buildType, moduleFormat) {
    const outputPlugins = {
        release: [],
        min: [
            terser()
        ]
    };

    if (process.env.treemap) {
        outputPlugins.min.push(visualizer({
            filename: 'treemap.html',
            brotliSize: true,
            gzipSize: true
        }));
    }

    if (process.env.treenet) {
        outputPlugins.min.push(visualizer({
            filename: 'treenet.html',
            template: 'network'
        }));
    }

    if (process.env.treesun) {
        outputPlugins.min.push(visualizer({
            filename: 'treesun.html',
            template: 'sunburst'
        }));
    }

    const outputFile = {
        debug:    `build/${outName}.dbg`,
        release:  `build/${outName}`,
        profiler: `build/${outName}.prf`,
        min:      `build/${outName}.min`,
    };

    const outputExtension = {
        es5: '.js',
        es6: '.mjs'
    };

    /** @type {Record<string, 'umd'|'es'>} */
    const outputFormat = {
        es5: 'umd',
        es6: 'es'
    };

    const sourceMap = {
        debug: 'inline',
        release: null
    };
    /** @type {OutputOptions} */
    const outputOptions = {
        plugins: outputPlugins[buildType || outputPlugins.release],
        format: outputFormat[moduleFormat],
        indent: '\t',
        sourcemap: sourceMap[buildType] || sourceMap.release,
        name: 'pc',
        //preserveModules: moduleFormat === 'es6',
        file: `${outputFile[buildType]}${outputExtension[moduleFormat]}`
    };


    const jsccOptions = {
        debug: {
            values: {
                _DEBUG: 1,
                _PROFILER: 1
            },
            keepLines: true
        },
        release: {
        },
        profiler: {
            values: {
                _PROFILER: 1
            }
        }
    };

    /**
     * @type {RollupStripOptions}
     */
    const stripOptions = {
        functions: stripFunctions
    };

    const babelOptions = {
        es5: es5Options(buildType),
        es6: moduleOptions(buildType)
    };

    return {
        input: rootFile,
        output: outputOptions,
        plugins: [
            jscc(jsccOptions[buildType] || jsccOptions.release),
            buildType !== 'debug' ? strip(stripOptions) : undefined,
            babel(babelOptions[moduleFormat]),
            spacesToTabs(buildType !== 'debug')
        ]
    };
}

/**
 * Build an ES5 target that rollup is supposed to build.
 *
 * @param {string} name - The name, like `pcx` or `VoxParser`.
 * @param {string} input - The input file, like `extras/index.js`.
 * @param {string} [output] - If not given, input is used.
 * @returns {RollupOptions} One rollup target.
 */
function scriptTarget(name, input, output) {
    return {
        input: input,
        output: {
            name: name,
            file: output || input.replace('.mjs', '.js'),
            format: 'umd',
            indent: '\t',
            globals: { playcanvas: 'pc' }
        },
        plugins: [
            resolve(),
            babel(es5Options('release')),
            spacesToTabs(true)
        ],
        external: ['playcanvas'],
        cache: false
    };
}

/**
 * Build an ES6 target that rollup is supposed to build.
 *
 * @param {string} name - The name, like `pcx` or `VoxParser`.
 * @param {string} input - The input file, like `extras/index.js`.
 * @param {string} output - The output file, like `build/playcanvas-extras.mjs`.
 * @returns {RollupOptions} One rollup target.
 */
function scriptTargetEs6(name, input, output) {
    return {
        input: input,
        output: {
            name: name,
            dir: output,
            format: 'es',
            indent: '\t',
            //preserveModules: true
        },
        plugins: [
            resolve(),
            babel(moduleOptions('release')),
            spacesToTabs(true)
        ],
        external: ['playcanvas', 'fflate']
    };
}

const target_extras = [
    scriptTarget('pcx', 'extras/index.js', 'build/playcanvas-extras.js'),
    scriptTargetEs6('pcx', 'extras/index.js', 'build/playcanvas-extras.mjs'),
    scriptTarget('VoxParser', 'scripts/parsers/vox-parser.mjs')
];

/** @type {RollupOptions} */
const target_types = {
    input: 'types/index.d.ts',
    output: [{
        file: 'build/playcanvas.d.ts',
        footer: 'export as namespace pc;',
        format: 'es'
    }],
    plugins: [
        dts()
    ]
};

export default (args) => {
    /** @type {RollupOptions[]} */
    let targets = [];

    const envTarget = process.env.target ? process.env.target.toLowerCase() : null;
    if (envTarget === 'types') {
        targets.push(target_types);
    } else if (envTarget === 'extras') {
        targets = targets.concat(target_extras);
    } else {
        ['release', 'debug', 'profiler', 'min'].forEach((t) => {
            ['es5', 'es6'].forEach((m) => {
                if (envTarget === null || envTarget === t || envTarget === m || envTarget === `${t}_${m}`) {
                    targets.push(buildTarget(t, m));
                }
            });
        });

        if (envTarget === null) {
            // no targets specified, build them all
            targets = targets.concat(target_extras);
        }
    }
    targets.length = 0;
    targets.push(
        buildTarget('./react-dom-client.mjs', 'react-dom-client', 'release', 'es6'),
        buildTarget('./react-dom-client.mjs', 'react-dom-client', 'min'    , 'es6'),
    );
    return targets;
};

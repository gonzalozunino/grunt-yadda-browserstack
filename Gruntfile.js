'use strict';

var rewriteRulesSnippet = require('grunt-connect-rewrite/lib/utils').rewriteRequest;

module.exports = function(grunt) {
    var paths = grunt.file.readJSON('app/dev/js/paths.json');
    var castlePaths = grunt.file.readJSON('app/dev/js/paths.json');
    castlePaths.i18n = "../../../test/unit/mocks/services/common/i18n";
    castlePaths.i18nStubData = "../../../.tmp/test/stubs/amd/dictionaries/i18n_es_cl";
    castlePaths.stubs = "../../../.tmp/test/stubs/amd/";

    //TODO: This fixes an isse on stubby, which has a console lib that breaks phantomjs reporting
    process.stdout.isTTY = true;

    // load all grunt tasks
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    // import proxy configuration
    var proxyConfig = require('./build/proxyConfig');

    var connectProxies = proxyConfig(grunt);


    grunt.initConfig({
        appConfig: {
            name: 'reissue',
            appPath: './app/dev',
            distPath: './app/dist'
        },

        instrument: {
            files: ['app/dev/js/**/*.js', 'test/unit/mocks/services/common/i18n.js', 'test/unit/mocks/services/rest/common/i18nService.js'],
            options: {
                lazy: true,
                basePath: '.tmp/instrumented-sources/'
            }
        },
        dependo: {
            main: {
                fileName: 'http://localhost:1234/es_cl/apps/personas/reissue/#ingresa-tus-datos',
                targetPath: '.'
            },
            options: {
                outputPath: '_build/doc/dependencies',
                fileName: 'dependencies.html',
                format: 'amd',
                exclude: 'node_modules|bower_components|test|lib|Gruntfile|_build|doc|portaldev-www'
            }
        },
        mocha: {
            test: {
                src: ['.tmp/specs/unit/**/*.html'],
                options: {
                    coverage: {
                        coverageFile: '.tmp/test/coverage/reports/coverage.json'
                    }
                }
            }
        },
        makeReport: {
            src: '.tmp/test/coverage/reports/**/*.json',
            options: {
                type: ['lcov', 'cobertura'],
                dir: '_build',
                print: 'detail'
            }
        },
        castle: {
            app: {
                options: {
                    mocks: {
                        client: {
                            baseUrl: 'test/unit/mocks',
                            paths: {},
                            map: {
                                '*': {
                                    'css': 'require-css-alt/css'
                                }
                            },
                            hbs: {
                                disableI18n: true
                            }
                        },
                        server: {
                            baseUrl: 'test/unit/mocks',
                            paths: {},
                            map: {
                                '*': {
                                    'css': 'require-css-alt/css'
                                }
                            },
                            hbs: {
                                disableI18n: true
                            }
                        }
                    },
                    specs: {
                        baseUrl: 'test/unit',
                        client: 'spec/**/*.js',
                        server: 'spec/**/*.server.js',
                        common: 'spec/**/*.common.js',
                        'client-target': '.tmp/specs/unit'
                    },
                    requirejs: {
                        client: {
                            baseUrl: 'app/dev/js',
                            paths: castlePaths,
                            shim: {
                                "handlebars-helper-intl": {
                                    deps: ["handlebars", "intl"],
                                    exports: "HandlebarsIntl"
                                }
                            },
                            map: {
                                '*': {
                                    'css': 'require-css-alt/css'
                                }
                            },
                            hbs: {
                                disableI18n: true
                            }
                        },
                        server: {
                            baseUrl: 'app/dev/js',
                            paths: castlePaths,
                            shim: {
                                handlebars: {
                                    exports: "Handlebars"
                                },
                                "handlebars-helper-intl": {
                                    deps: ["handlebars", "intl"],
                                    exports: "HandlebarsIntl"
                                }

                            },
                            map: {
                                '*': {
                                    'css': 'require-css-alt/css'
                                }
                            },
                            hbs: {
                                disableI18n: true
                            }
                        }
                    },
                    reporting: {
                        coverageFile: '.tmp/test/coverage/reports/coverage.json',
                        xunitFile: '.tmp/xunit.xml',
                        dest: ".tmp/castle-reports", // location to write analysis and coverage reports
                        src: "<%= appConfig.appPath %>/js",
                        stripPath: "app/dev/js",
                        options: {},
                        analysis: {
                            files: ["app/dev/js/**/*.js"]
                        },
                        coverage: {
                            dest: ".tmp/instrumented-sources/", // target for instrumented code
                            exclude: [
                                ".svn",
                                "paths.json"
                            ]
                        }

                    }
                }
            }
        },
        wrap: {
            stubs: {
                expand: true,
                cwd: 'test/stubs/',
                src: '**/*.json',
                dest: '.tmp/test/stubs/amd/',
                options: {
                    wrapper: ['define(', ');']
                },
                ext: '.js'
            }
        },

        // watch list
        watch: {

            js: {
                files: [
                    'app/dev/js/{,**/}*.js',
                    '<%= appConfig.distPath %>/templates/precompiled/templates.js',
                    'test/{,**/}*.js'
                ],
                tasks: ['test'],
            },
            // Configure beautifier watcher
            // ============================
            // Choose files
            // Choose tasks
            //
            beautify: {
                files: [
                    "app/dev/js/{,**/}*.js",
                    "test/{,**/}*.js"
                ],
                tasks: ['beautify', 'jshint']
            },
            handlebars: {
                files: [
                    '<%= appConfig.appPath %>/templates/**/*.hbs'
                ],
                tasks: ['handlebars']
            }
        },

        // testing server
        connect: {
            testserver: {
                options: {
                    port: 1234,
                    base: '.',
                    hostname: '*',
                    middleware: function(connect, options) {
                        var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
                        return [
                            rewriteRulesSnippet,
                            proxy,
                            connect.static(options.base),
                            // Make empty directories browsable.
                            connect.directory(options.base),
                            function(req, res, next) {
                                res.setEncoding('iso88591');
                            }
                        ];
                    }
                },
                proxies: connectProxies
            },
            rules: [{
                from: '^/app/dev/js/(.*)$',
                to: '/.tmp/instrumented-sources/app/dev/js/$1'
            }]
        },

        // mocha command
        exec: {
            functionalTests: {
                cmd: function(feature) {

                    var functionalXml = "_build/test-reports/TEST-functional.xml";
                    var functionalHtml = "_build/doc/functional/test-results.html";
                    var yaddaConfig = "test/functional/config-yadda.js";

                    var command = "mkdir -p _build/test-reports _build/doc/functional;";
                    command += "multi='spec=- xunit=" + functionalXml + " doc=" + functionalHtml + "'";
                    command += " browser=phantomjs ";

                    if (feature !== 'undefined') {
                        command += " feature=" + feature;
                    }
                    command += " ./node_modules/.bin/_mocha --reporter mocha-multi --colors --timeout 30s " + yaddaConfig;

                    return command;
                },
                stdout: true
            },
            functionalTestsChrome: {
                cmd: function(feature) {

                    var command = " browser=chrome ";

                    if (feature !== 'undefined') {
                        command += " feature=" + feature;
                    }

                    command += " ./node_modules/.bin/mocha --reporter spec --colors --timeout 20s test/functional/config-yadda.js";

                    return command;
                },
                stdout: true
            },
            functionalTestBrowserStack: {
                cmd: function(feature) {

                    var command = "";

                    if (feature !== 'undefined') {
                        command += " feature=" + feature;
                    }

                    command += " ./node_modules/.bin/mocha --reporter spec --colors --timeout 180s test/functional/browser_stack_runner.js";

                    return command;
                },
                stdout: true
            },
            //TODO: We have to add instanbul-middleware to make this possible
            //Most likely this can be merged with the above (using mocha-multi)
            functionalTestsCoverage: {
                command: "browser=phantomjs ./node_modules/.bin/_mocha --reporter mocha-istanbul --colors --timeout 20s test/functional/config-yadda.js",
                stdout: true
            }
        },
        stubby: {
            stubsServer: {
                files: [{
                    src: ['test/stubs/**/*.yaml']
                }],
                options: {
                    stubs: 3001
                }
            }
        },
        // open app and test page
        open: {
            server: {
                path: 'http://localhost:<%= connect.testserver.options.port %>'
            }
        },

        clean: {
            dist: ['.tmp', '<%= appConfig.distPath %>/*'],
            server: '.tmp',
            coverage: 'tmp/instrumented-sources',
            templates: '<%= appConfig.distPath %>/templates/',
            templatesTemp: '.tmp/templates/',
            spec: ".tmp/spec/"
        },

        // Linting (JSHint)
        // ================
        // Choose jshintrc file path
        // Choose reporter
        // Choose files to check

        jshint: {
            options: {
                //archivo de configuracion de jshint, '.jshintrc'
                jshintrc: '.jshintrc'
            },
            all: [
                //se definen los archivos que se verifican
                'Gruntfile.js',
                "app/dev/js/{,**/}*.js",
                "test/{,**/}*.js"
            ]
        },

        hslint: {
            options: {
                templateDelimiters: ['{{', '}}']
            },
            src: [
                '<%= appConfig.appPath %>/templates/**/*.hbs'
            ]
        },

        jsonlint: {
            src: [
                'test/**/*.json',
                '<%= appConfig.appPath %>/**/*.json'
            ]
        },

        // JSBeatifier (code beautifier)
        // =============================
        // Choose files
        // Choose options
        //
        jsbeautifier: {
            files: [
                "Gruntfile.js",
                "app/dev/js/{,**/}*.js",
                "test/{,**/}*.js"
            ],
            options: {
                jsbeautifyrc: true
            }
        },

        // require
        requirejs: {
            js: {

                options: {
                    baseUrl: "<%= appConfig.appPath %>/js",
                    name: "<%= appConfig.name %>",
                    out: "<%= appConfig.distPath %>/js/<%= appConfig.name %>.js",
                    exclude: [
                        "require-css-alt/normalize",
                        "jquery",
                        "bootstrap"
                    ],
                    include: ['services/rest/common/i18nService'],
                    shim: {
                        "handlebars-helper-intl": {
                            deps: ["handlebars", "intl"],
                            exports: "HandlebarsIntl"
                        }
                    },
                    map: {
                        '*': {
                            // Set it to the path to require-css
                            'css': 'require-css-alt/css'
                        }
                    },
                    siteRoot: "../../dev",
                    hbs: {
                        disableI18n: true
                    },
                    paths: require('./app/dev/js/paths.json'),
                    preserveLicenseComments: false,
                    useStrict: true,
                    wrap: true,
                    optimize: 'uglify',
                    uglify2: {},
                    pragmasOnSave: {
                        excludeHbsParser: true,
                        excludeHbs: true,
                        excludeAfterBuild: true
                    },
                    separateCSS: true
                }
            }
        },

        rename: {
            reports: {
                src: '.tmp/castle-reports/client-coverage/xunit.xml',
                dest: '_build/test-reports/TEST-index.xml'
            }
        },

        bower: {
            install: {
                options: {
                    verbose: true
                }
            }
        },

        portal: {
            options: {
                port: 3002,
                blueprint: "doc/reissue.apib",
                publicDir: "portaldev-www",
                helpersDir: "portaldev-www/helpers",
                docsDir: "doc",
                appJsRoot: "app/dev/js",
                proxies: {},
                routes: {
                    "/LANWebBootstrap": "portaldev-www/LANWebBootstrap",
                    "/LANLibJSCore": "portaldev-www/LANLibJSCore",
                    "/layout": "portaldev-www/LANWebBootstrap/Libs",
                    "/apps/reissue/latest/": ".",
                    "/": "."
                },
                redirect: {
                    '/': '/es_cl/apps/personas/reissue/'
                }
            },
            dev: {
                options: {
                    appJsRoot: "app/dev/js"
                }
            },
            dist: {
                options: {
                    appJsRoot: "app/dist/js"
                }
            }
        },

        // handlebars
        handlebars: {
            compile: {
                options: {
                    amd: true,
                    processName: function(filePath) {
                        return filePath.match(/templates\/(.+).hbs/)[1];
                    }
                },
                files: {
                    '<%= appConfig.distPath %>/templates/precompiled/templates.js': ['<%= appConfig.appPath %>/templates/**/*.hbs']
                }
            }
        },


        /**
         * Copy files
         * ==================
         * URL: https: *www.npmjs.org/package/grunt-contrib-copy
         *
         * Choose files base path (cwd)
         * Choose files destination
         * Choose files
         */
        copy: {
            dist: {
                files: [{
                    // Copy images and fonts
                    expand: true,
                    cwd: "<%= appConfig.appPath %>",
                    dest: "<%= appConfig.distPath %>",
                    src: [
                        "images/**",
                        "styles/**",
                        "i18n/**",
                        "templates/precompiled/**"
                    ]
                }, {
                    // The config file
                    expand: true,
                    cwd: "<%= appConfig.appPath %>",
                    dest: "<%= appConfig.distPath %>",
                    src: [
                        "js/<%= appConfig.name %>.dist.config.js",
                    ],
                    rename: function(dest, src) {
                        return dest + "/" + src.replace("dist.", "");
                    }
                }, {
                    // Some bower components, required in runtime
                    expand: true,
                    cwd: ".",
                    dest: "<%= appConfig.distPath %>",
                    src: [
                        "bower_components/require-css-alt/**",
                        "bower_components/requirejs-plugins/**",
                        "bower_components/moment/**",
                        "bower_components/handlebars-helper-intl/**"
                    ]
                }]
            },
            // TODO: This is some debt associated with how require-css processes styles when compiling.
            processApplicationStylePaths: {
                options: {
                    process: function(content, srcpath) {
                        return content.replace(/url\(styles\//g, "url(../styles/");
                    }
                },
                files: [{
                    expand: true,
                    cwd: "<%= appConfig.distPath %>",
                    dest: "<%= appConfig.distPath %>",
                    src: [
                        "js/<%= appConfig.name %>.css",
                    ]

                }]
            },
            coverage: {
                files: [{
                    expand: true,
                    src: ['.tmp/test/stubs/amd/**', 'bower_components/**', '<%= appConfig.distPath %>/templates/**'],
                    dest: '.tmp/instrumented-sources/'
                }]
            },
            xunit: {
                files: [{
                    // Copy portal internationalized files
                    expand: true,
                    cwd: ".tmp",
                    dest: "_build/test-reports/",
                    src: ["xunit.xml"],
                    rename: function(dest, src) {
                        return dest + '/TEST-index.xml';
                    }
                }],
                options: {
                    process: function(content, srcPath) {
                        var top = '<?xml version="1.0" encoding="UTF-8"?><testsuites>';
                        var bottom = '</testsuites>';
                        content = top + content + bottom;
                        return content;
                    }
                }
            }
        },
        json_merge: {
            options: {
                replacer: null,
                space: ' '
            },
            i18n: {
                files: {
                    'test/stubs/i18n_es_global.json': ['test/stubs/i18n_es.json', 'test/stubs/i18n_es_*.json'],

                },
            },
        },
        gherkin_report: {
            functionalTests: {
                options: {
                    title: 'Reissue Features',
                    subtitle: 'Generated on ' + (new Date()).toISOString() + ', version: ' + grunt.option('versionNumber') || 'unknown',
                    destination: '_build/doc/functional/features-report.html'
                },
                files: [{
                    cwd: 'test/functional/features',
                    src: ['**/*.feature']
                }]
            }
        },
        sonarRunner: {
            analysis: {
                options: {
                    dryRun: false,
                    debug: true,
                    separator: '\n',
                    sonar: {
                        host: {
                            url: 'https://sonar.dev.lan.com/dashboard/index/com.lan.web:LatamWebApplicationReissue-CPL-1260-UnitTest'
                        },
                        projectKey: 'com.lan.web:LatamWebApplicationReissue-CPL-1260-UnitTest',
                        projectName: 'LatamWebApplicationReissue-CPL-1260-UnitTest',
                        projectVersion: '1.0',
                        sources: ['app/dev/js'].join(','),
                        tests: 'test/unit/spec',
                        language: 'js',
                        sourceEncoding: 'UTF-8',
                        javascript: {
                            lcov: {
                                reportPath: '_build/lcov.info'
                            }
                        },
                        dynamicAnalysis: 'reuseReports'
                    }
                }
            }
        }
    });


    ////////////////
    // DEV SERVER //
    ////////////////

    // starts express server with live testing via testserver
    grunt.registerTask('default', function(target) {

        if (target === 'dist') {
            grunt.task.run([
                'clean:server',

                'jshint',
                'beautify',

                'build',

                'portal:dist:background',

                'configureProxies:testserver',
                'connect:testserver',
                'stubby',

                'test',
                'open',
                'watch'
            ]);
        } else {

            grunt.option('force', true);

            grunt.task.run([
                'clean:server',

                'jshint',
                'beautify',

                'templates',

                'portal:dev:background',

                'configureProxies:testserver',
                'connect:testserver',
                'stubby',

                'test',
                'open',
                'watch'
            ]);
        }
    });



    ///////////
    // BUILD //
    ///////////

    // Compile js, css and templates.
    // Then translate and copy all assets and vendor libraries to dist directory.
    grunt.registerTask("build", [
        "gherkin_report",
        "clean:dist",
        "templates",
        "requirejs:js",
        "copy:dist",
        "copy:processApplicationStylePaths"
    ]);



    ///////////////
    // TEMPLATES //
    ///////////////

    grunt.registerTask('templates', ['handlebars']);


    //////////////////
    // UNIT TESTING //
    //////////////////

    // Test task, does unit testing
    grunt.registerTask("test", [
        "clean:spec",
        "wrap",
        "castle:app:test-client"
    ]);

    // Generates coverage reports
    grunt.registerTask('coverage', function() {

        grunt.task.run('clean:coverage');
        grunt.task.run('copy:coverage');

        grunt.task.run('instrument');

        // Re-usa la configuracion de castle, pero modifica el baseUrl para que tome archivos instrumentados.
        grunt.config.set('castle.app.options.requirejs.client.baseUrl', '.tmp/instrumented-sources/app/dev/js');
        grunt.task.run('wrap');
        grunt.task.run('castle:app:test-client');
        grunt.task.run('makeReport');
    });

    // Generates coverage reports
    grunt.registerTask('functionalCoverage', function() {
        grunt.task.run('clean:coverage');
        grunt.task.run('copy:coverage');
        grunt.task.run('instrument');
        grunt.task.run('functionalTestsWithCoverage');
        grunt.task.run('makeReport');
    });

    // Generates unit tests reports in xunit format
    grunt.registerTask('xunit', ['wrap', 'castle:app:xunit-client', 'copy:xunit']);

    ///////////////////////
    // FUNCTIONL TESTING //
    ///////////////////////
    grunt.task.registerTask('functionalTests', 'Tarea para ejectura el/los test funcionales', function(feature) {

        var taskList = [
            'clean:server',
            'beautify',
            'jshint',
            'templates',
            'portal:dev:background',
            'configureProxies:testserver',
            'connect:testserver',
            'stubby',
            'exec:functionalTests:' + feature
        ];
        grunt.task.run(taskList);
    });

    grunt.task.registerTask('functionalTestsChrome', 'Tarea para ejectura el/los test funcionales en chrome', function(feature) {
        var taskList = [
            'clean:server',
            'beautify',
            'jshint',
            'templates',
            'portal:dev:background',
            'configureProxies:testserver',
            'connect:testserver',
            'stubby',
            'exec:functionalTestsChrome:' + feature
        ];
        grunt.task.run(taskList);
    });

    grunt.task.registerTask('functionalTestsBrowserStack', 'Tarea para ejectura el/los test funcionales en Browserstack', function(feature) {
        var taskList = [
            'clean:server',
            'beautify',
            'jshint',
            'templates',
            'portal:dev:background',
            'configureProxies:testserver',
            'connect:testserver',
            'stubby',
            'exec:functionalTestBrowserStack:' + feature
        ];
        grunt.task.run(taskList);
    });

    //TODO: We have to add instanbul-middleware to make this possible
    grunt.registerTask('functionalTestsWithCoverage', [
        'jshint',
        'beautify',
        'templates',
        'portal:dev:background',
        'configureProxies:testserver',
        'configureRewriteRules',
        'connect:testserver',
        'stubby',
        'exec:functionalTestsCoverage'
    ]);

    // This is useful to see how the app works with instrumented code
    // Like for debugging the above
    grunt.registerTask('serverInstrumented', [
        'clean:server',
        'instrument',
        'jshint',
        'beautify',
        'templates',
        'portal:dev:background',
        'configureProxies:testserver',
        'configureRewriteRules',
        'connect:testserver',
        'stubby',
        'open',
        'watch'
    ]);

    grunt.registerTask('functionalTestsDist', [
        'clean:server',
        'jshint',
        'beautify',
        'build',
        'portal:dist:background',
        'configureProxies:testserver',
        'connect:testserver',
        'stubby',
        'exec:functionalTests'
    ]);

    grunt.registerTask('functionalTestsChromeDist', [
        'clean:server',
        'jshint',
        'beautify',
        'build',
        'portal:dist:background',
        'configureProxies:testserver',
        'connect:testserver',
        'stubby',
        'exec:functionalTestsChrome'
    ]);
    //////////////////
    // CODE QUALITY //
    //////////////////

    grunt.registerTask('beautify', ['jsbeautifier']);

    // Beautify code and lint it
    grunt.registerTask("code-quality", ["hslint", "jsbeautifier", "jshint:readable", "jshint:report"]);

    //////////////////
    // I18N STUBS   //
    //////////////////
    grunt.registerTask('mergei18n', ['json_merge']);

};

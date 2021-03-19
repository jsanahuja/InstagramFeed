module.exports = function(grunt) {
    grunt.initConfig({
        babel: {
            options: {
                sourceMap: false,
                comments: false,
                sourceType: "unambiguous",
                presets: ['@babel/preset-env', 'minify']
            },
            dist: {
                files: {
                    'dist/InstagramFeed.min.js': ['src/*.js']
                }
            }
        },
        qunit: {
            files: ['test/index.html'],
            options: {
                puppeteer: {
                    ignoreDefaultArgs: true,
                    args: ['--headless', '--disable-web-security', '--allow-file-access-from-files']
                },
                timeout: 10000
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.registerTask('test', 'qunit');

    grunt.loadNpmTasks('grunt-babel');
    grunt.registerTask('build', ['babel']);
};
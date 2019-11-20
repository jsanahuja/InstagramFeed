module.exports = function(grunt) {
    grunt.initConfig({
        'node-minify': {
            gcc: {
                files: {
                    'dist/instagramFeed.min.js': ['src/*.js']
                }
            }
        },
        qunit: {
            files: ['test/index.html']
        }
    });
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.registerTask('test', 'qunit');

    grunt.loadNpmTasks('grunt-node-minify');
    grunt.registerTask('dist', 'node-minify');
};

/*
 * InstagramFeed
 *
 * @version 1.0.0
 *
 * @author Javier Sanahuja Liebana <bannss1@gmail.com>
 * @contributor csanahuja <csanahuja@gmail.com>
 *
 * https://github.com/jsanahuja/InstagramFeed
 *
 */

/**
 * This file is based on Universal Module Definition.
 */
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports', 'require'], factory);
    } else if (typeof exports === 'object' && typeof module === 'object') {
        factory(module.exports || exports);
    }
})(function(exports){
    if(typeof exports !== "undefined"){
        exports = InstagramFeed;
    }
    return InstagramFeed;
});

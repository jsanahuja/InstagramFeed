/*
 * InstagramFeed
 *
 * @version 1.5.0
 *
 * @author jsanahuja <bannss1@gmail.com>
 * @contributor csanahuja <csanahuja10@gmail.com>
 *
 * https://github.com/jsanahuja/InstagramFeed
 *
 */
(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.InstagramFeed = factory();
    }
}(this, function() {
    var defaults = {
        'host': "https://www.instagram.com/",
        'username': '',
        'tag': '',
        'container': '',
        'display_profile': true,
        'display_biography': true,
        'display_gallery': true,
        'display_captions': false,
        'display_igtv': false,
        'callback': null,
        'styling': true,
        'items': 8,
        'items_per_row': 4,
        'margin': 0.5,
        'image_size': 640,
        'lazy_load': false,
        'on_error': console.error,
        // a localstorage prefix that is used to identify keys that have been set by InstagramFeed.
        'cache_prefix': 'igf_',
        // cache entries will be returned from the cache until this amount of time has passed.
        'cache_for': '30:min',
        // set this to true to turn on internal localStorage caching, reducing the possibility that 
      // set this to true to turn on internal localStorage caching, reducing the possibility that 
        // set this to true to turn on internal localStorage caching, reducing the possibility that 
        // you’ll hit issue #25 / error #4: https://github.com/jsanahuja/jquery.instagramFeed/issues/25
        'cache_use': false,
    };

    var image_sizes = {
        "150": 0,
        "240": 1,
        "320": 2,
        "480": 3,
        "640": 4
    };

    var escape_map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    function escape_string(str){
        return str.replace(/[&<>"'`=\/]/g, function (char) {
            return escape_map[char];
        });
    }

    return function(opts) {
        this.options = Object.assign({}, defaults);
        this.options = Object.assign(this.options, opts);
        this.is_tag = this.options.username == "";

        this.valid = true;
        if (this.options.username == "" && this.options.tag == "") {
            this.options.on_error("InstagramFeed: Error, no username or tag defined.", 1);
            this.valid = false;
        }
        if (typeof this.options.get_data !== "undefined") {
            console.warn("InstagramFeed: options.get_data is deprecated, options.callback is always called if defined");
        }
        if (this.options.callback == null && this.options.container == "") {
            this.options.on_error("InstagramFeed: Error, neither container found nor callback defined.", 2);
            this.valid = false;
        }

      /**
       * Composes the xhr url based on if this pull was based on a username or a tag. this is used to both pull data from 
       * instagram and show the url that couldn’t be cached if a window.localStorage error occurred when trying to stuff 
       * data into the cache
       */
      this.url = function(){
          return this.is_tag ? this.options.host + "explore/tags/" + this.options.tag + "/" : this.options.host + this.options.username + "/";
      }

      this.get = function(callback) {
          var url = this.url(),
              xhr = new XMLHttpRequest();

          var _this = this;
          // compose the cache key based on what kind of thing InstagramFeed is pulling
          var key = (_this.is_tag) ? 't-'+_this.options.tag : 'u-'+_this.options.username,
          // do we have a cached version of the data pull available in local storage?
          data = (_this.options.cache_use === true) ? _this.cache(key) : null;
          // we have cached data, pass it to the callback
          if(data !== null){
            callback(data, _this);
          }
          // no data cached; get the data, parse and cache the result, then execute the callback when complete
          else {
            xhr.onload = function(e) {
              if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                      try{
                        data = xhr.responseText.split("window._sharedData = ")[1].split("<\/script>")[0];
                      }catch(error){
                          _this.options.on_error("InstagramFeed: It looks like the profile you are trying to fetch is age restricted. See https://github.com/jsanahuja/InstagramFeed/issues/26", 3);
                          return;
                      }
                      data = JSON.parse(data.substr(0, data.length - 1));
                      data = data.entry_data.ProfilePage || data.entry_data.TagPage;
                      if(typeof data === "undefined"){
                          _this.options.on_error("InstagramFeed: It looks like YOUR network has been temporary banned because of too many requests. See https://github.com/jsanahuja/jquery.instagramFeed/issues/25", 4);
                          return;
                      }
                      data = data[0].graphql.user || data[0].graphql.hashtag;
                      _this.cache(key,data);
                      callback(data, _this);
                  } else {
                      _this.options.on_error("InstagramFeed: Unable to fetch the given user/tag. Instagram responded with the status code: " + xhr.statusText, 5);
                  }
              }
            };
            xhr.open("GET", url, true);
            xhr.send();
          }

      };

      /**
       * Get an expiration timestamp based on a future time specifier
       * @param { string } on an expiration specifier. A specifier is a {number}, followed by a ":", followed 
       *                      by one of {min|minute|minutes|mon|month|months|hour|hours}. 
       * @examples some valid specifiers:
       *    1:min
       *    10:minutes
       *    1:months
       *    10:mon
       *    1:hour
       *    10:hours
       */
      this.cache_expire = function(on){
              // a base date for the cache expiration
          var start = new Date(),
              // a default date for the cache expiration
              expire = new Date(start),
              // the colon delimited future time period specifier
              parts = on.split(':'),
              // a default unit in case we get passed a bad specifier
              units = 1;
          // if parts parsed out into two parts
          if(parts.length > 1){
            units = parseInt(parts[0],10);
            type = parts[1];
            switch (type) {
              // add some number of minutes to the base time
              case 'min':
              case 'minute':
              case 'minutes':
                expire.setMinutes(start.getMinutes() + units);
              break;                
              // add some number of months to the base time
              case 'mon':
              case 'month':
              case 'months':
                expire.setMonth(start.getMonth() + units);
              break;
              // adding some number of hours to the base time is the default
              case 'hour':
              case 'hours':
              default:
                expire.setHours(start.getHours() + units);
              break;
            }
          }
          // get the expiration time as unix; if we were passed a bad time specifier this will be 1 minute from "now"
          var expires = expire.getTime();
          return expires;
      }

      /**
       * Gets keys that match options.cache_prefix
       * @source: https://stackoverflow.com/a/17748203/12894421
       */
      this.cache_keys = function(store){
              // default value for keys that match options.cache_prefix
          var keys = [],
              // get a list of all the keys available in localStorage
              list = Object.keys(store),
              // get the length of the list of keys
              length = list.length,
              // create a regex that can match the configured prefix against each of the keys in localstorage
              has = new RegExp('/^'+prefix+'/');

          // while the length of the list counter is above 0, post incremented
          while ( length-- ) {
            // get the key from the list at the given index
            var check = list[length];
            // does this key begin with our cache prefix?
            if(check.match(has)){
              // push the key into our list of keys that we'll remove from window.localStorage
              keys.push(check);
            }
          }
          return keys;
      }

      /**
       * Get, set, remove, or clear data to/from window.localStorage. Data is returned from cache until you've cleared 
       * the key or the key has expired. Keys expire based on the time period set in options.cache_for
       * @param { string | null } key a cache key to get or set; or null if you want to clear all items in the store that match options.prefix
       * @param { any | undefined } value a value to set; undefined if you're doing a get; or a string flag, REMOVE, to remove a given cache key
       * @returns { any | null } your cached value will be returned if (you're doing a get operation && the key exists in window.localStorage && the data hasn't expired); otherwise null
       * @examples
       *    * Set a value into the cache:
       *      this.cache('some-key',{an:'object'});
       *    * Get a value from the cache:
       *      value = this.cache('some-key');
       *      => value == {an:'object'}
       *    * Remove an item from the cache:
       *      this.cache('some-key','REMOVE');
       *      value = this.cache('some-key');
       *      => value == null
       *    * Clear all keys from the cache that match options.cache_prefix
       *      this.cache(null);
       *      => all non-InstagramFeed localStorage keys left intact, all values matching options.cache_prefix removed
       */
      this.cache = function(key,value){
          var _this = this,
              data = null,
              prefix = _this.options.cache_prefix,
              expires = _this.options.cache_for,
              InstaStore = window.localStorage;
          if(InstaStore){
            // if a non null key (our clear cache flag) got passed in then auto prepend the configured keystore prefix to the key
            if(key !== null){
              key = prefix + key;
            }
            // perform the requested cache operation based on the incoming key and value
            switch (value) {
              // the special flag 'REMOVE' was passed in with with a key that is a string
              case 'REMOVE':
                if(typeof key === "string"){
                  InstaStore.removeItem(key);
                }
              break;

              default:
                // null was sent in as the key; clear all window.localStorage keys that match the options.cache_prefix
                if(key === null){
                  var keys = _this.cache_keys(InstaStore);
                  // if we have matching cache keys then pass each of them back into this.cache() with the REMOVE flag set
                  if(keys.length > 0){
                    // iterate over our list of matching keys, removing each one that matched our prefix
                    keys.forEach(function(item){
                      // remove the prefix so it doesn't double up on the way back into this.cache
                      item = item.replace(prefix,'');
                      // pass the 
                      _this.cache(item,'REMOVE');
                    });
                  }
                // set the item into local storage if a GET or REMOVE wasn't requested
                } else if (value || value === false){
                  // get the expiration date for this cache entry
                  var expiration = _this.cache_expire(expires);
                  // wrap the real value in an object that containss the value (v) and metadata (m) about the value
                  var store = {
                    // the real value that we're storing
                    v: value,
                    // the metadata for the value
                    m: {
                      // when the data was stored as a unix timestamp
                      on: Date.now(),
                      // when the value expires as a unix timestamp
                      e: expiration,
                    }
                  }
                  // stringify the wrapped value so we can stuff it into local storage
                  store = JSON.stringify(store);
                  try {
                    InstaStore.setItem(key,store);
                  } catch (error) {
                    // compose an error message about the failure to cache the requested data
                    var message = [
                      "InstagramFeed: Unable to cache the instagram feed for:",
                      this.url(),
                      'because a window.localStorage storage exception occurred:',
                      error.toString()
                    ].join(' ');
                    _this.options.on_error(message);
                  }
                // get the item out of local storage by its key
                } else {
                  data = InstaStore.getItem(key);
                  // if a non null value was stored then the key was found
                  if(data !== null){
                    // unpack the wrapped data
                    data = JSON.parse(data);
                    var on = data.m.e,
                        now = Date.now();
                    // if the current time is less than the expiration time then return the unwrapped data.value, if expired then lie and return null
                    data = (now < on) ? data.v : null;
                  }
                }
              break;
            }
          }
          return data;
      };

        this.parse_caption = function(igobj, data) {
            if (
                typeof igobj.node.edge_media_to_caption.edges[0] !== "undefined" && 
                typeof igobj.node.edge_media_to_caption.edges[0].node !== "undefined" && 
                typeof igobj.node.edge_media_to_caption.edges[0].node.text !== "undefined" && 
                igobj.node.edge_media_to_caption.edges[0].node.text !== null
            ) {
                return igobj.node.edge_media_to_caption.edges[0].node.text;
            }

            if (
                typeof igobj.node.title !== "undefined" &&
                igobj.node.title !== null &&
                igobj.node.title.length != 0
            ) {
                return igobj.node.title;
            }

            if (
                typeof igobj.node.accessibility_caption !== "undefined" &&
                igobj.node.accessibility_caption !== null &&
                igobj.node.accessibility_caption.length != 0
            ) {
                return igobj.node.accessibility_caption;
            }
            return (this.is_tag ? data.name : data.username) + " image ";
        }

        this.display = function(data) {
            // Styling
            var html = "",
                styles;
            if (this.options.styling) {
                var width = (100 - this.options.margin * 2 * this.options.items_per_row) / this.options.items_per_row;
                styles = {
                    'profile_container': " style='text-align:center;'",
                    'profile_image': " style='border-radius:10em;width:15%;max-width:125px;min-width:50px;'",
                    'profile_name': " style='font-size:1.2em;'",
                    'profile_biography': " style='font-size:1em;'",
                    'gallery_image': " style='width:100%;'",
                    'gallery_image_link': " style='width:" + width + "%; margin:" + this.options.margin + "%; position:relative; display: inline-block; height: 100%;'"
                };
                // Caption Styling
                if(this.options.display_captions){
                    html += "<style>\
                        a[data-caption]:hover::after {\
                            content: attr(data-caption);\
                            text-align: center;\
                            font-size: 0.8rem;\
                            color: black;\
                            position: absolute;\
                            left: 0;\
                            right: 0;\
                            bottom: 0;\
                            padding: 1%;\
                            max-height: 100%;\
                            overflow-y: auto;\
                            overflow-x: hidden;\
                            background-color: hsla(0, 100%, 100%, 0.8);\
                        }\
                    </style>";
                }
            } else {
                styles = {
                    'profile_container': "",
                    'profile_image': "",
                    'profile_name': "",
                    'profile_biography': "",
                    'gallery_image': "",
                    'gallery_image_link': ""
                };
            }

            // Profile
            if (this.options.display_profile) {
                html += "<div class='instagram_profile'" + styles.profile_container + ">";
                html += "<img class='instagram_profile_image'" + (this.options.lazy_load ? " loading='lazy'" : '')  + " src='" + data.profile_pic_url + "' alt='" + (this.is_tag ? data.name + " tag pic" : data.username + " profile pic") + " profile pic'" + styles.profile_image + " />";
                if (this.is_tag)
                    html += "<p class='instagram_tag'" + styles.profile_name + "><a href='https://www.instagram.com/explore/tags/" + this.options.tag + "' rel='noopener' target='_blank'>#" + this.options.tag + "</a></p>";
                else
                    html += "<p class='instagram_username'" + styles.profile_name + ">@" + data.full_name + " (<a href='https://www.instagram.com/" + this.options.username + "' rel='noopener' target='_blank'>@" + this.options.username + "</a>)</p>";

                if (!this.is_tag && this.options.display_biography)
                    html += "<p class='instagram_biography'" + styles.profile_biography + ">" + data.biography + "</p>";

                html += "</div>";
            }

            // Gallery
            if (this.options.display_gallery) {
                var image_index = typeof image_sizes[this.options.image_size] !== "undefined" ? image_sizes[this.options.image_size] : image_sizes[640];

                if (typeof data.is_private !== "undefined" && data.is_private === true) {
                    html += "<p class='instagram_private'><strong>This profile is private</strong></p>";
                } else {
                    var imgs = (data.edge_owner_to_timeline_media || data.edge_hashtag_to_media).edges;
                    max = (imgs.length > this.options.items) ? this.options.items : imgs.length;

                    html += "<div class='instagram_gallery'>";
                    for (var i = 0; i < max; i++) {
                        var url = "https://www.instagram.com/p/" + imgs[i].node.shortcode,
                            image, type_resource,
                            caption = escape_string(this.parse_caption(imgs[i], data));

                        switch (imgs[i].node.__typename) {
                            case "GraphSidecar":
                                type_resource = "sidecar"
                                image = imgs[i].node.thumbnail_resources[image_index].src;
                                break;
                            case "GraphVideo":
                                type_resource = "video";
                                image = imgs[i].node.thumbnail_src
                                break;
                            default:
                                type_resource = "image";
                                image = imgs[i].node.thumbnail_resources[image_index].src;
                        }

                        if (this.is_tag) data.username = '';
                        html += "<a href='" + url + (this.options.display_captions? "' data-caption='" + caption : "") + "' class='instagram-" + type_resource + "' rel='noopener' target='_blank'" + styles.gallery_image_link + ">";
                        html += "<img" + (this.options.lazy_load ? " loading='lazy'" : '')  + " src='" + image + "' alt='" + caption + "'" + styles.gallery_image + " />";
                        html += "</a>";
                    }

                    html += "</div>";
                }
            }

            // IGTV
            if (this.options.display_igtv && typeof data.edge_felix_video_timeline !== "undefined") {
                var igtv = data.edge_felix_video_timeline.edges,
                    max = (igtv.length > this.options.items) ? this.options.items : igtv.length
                if (igtv.length > 0) {
                    html += "<div class='instagram_igtv'>";
                    for (var i = 0; i < max; i++) {
                        var url = "https://www.instagram.com/p/" + igtv[i].node.shortcode,
                            caption = escape_string(this.parse_caption(igtv[i], data));

                        html += "<a href='" + url + (this.options.display_captions? "' data-caption='" + caption : "") + "' rel='noopener' target='_blank'" + styles.gallery_image_link + ">";
                        html += "<img" + (this.options.lazy_load ? " loading='lazy'" : '')  + " src='" + igtv[i].node.thumbnail_src + "' alt='" + caption + "'" + styles.gallery_image + " />";
                        html += "</a>";
                    }
                    html += "</div>";
                }
            }

            this.options.container.innerHTML = html;
        };

        this.run = function() {
            this.get(function(data, instance) {
                if(instance.options.container != ""){
                    instance.display(data);
                }
                if(typeof instance.options.callback === "function"){
                    instance.options.callback(data);
                }
            });
        };

        if (this.valid) {
            this.run();
        }
    };
}));

/*
    requires: phantomjs, async
    usage: phantomjs capture.js
*/
var async = require('async'),
    fs = require('fs'),
    sizes = [
        // [320, 480, "small"],
        // [320, 568, "iphone"],
        // [568, 320, "iphone-l"],
        // [765, 1024, "ipad-l"],
        // [1024, 765, "ipad"],
        [1440, 900, "desktop"]
    ];

var system = require('system');
var args = system.args;
var url = args[1];
// var name = args[1].replace('http://', '').replace('https://', '').replace('/', '').replace('&', '');
var name = url.replace('http://', '').replace('https://', '');
// name = name.substring(0, name.indexOf('/'));
var debug = false;

if(args[2] !== undefined && args[2] === 'debug') {
  debug = true;
}

function log(data) {
  if(debug) {
    console.log(data);
  }
}
log('url ' + url);

name = Math.ceil(100000000*Math.random());
var filename = "";
var result = {};
    result['responses'] = [];
var i = 0;

if (args.length === 1) {
  console.log('Try to pass some arguments when invoking this script!');
} else {
  //  args.forEach(function(arg, i) {
  //    console.log(i + ': ' + arg);
  //  });
}

function capture(sizes, callback) {
    filename = (name + '-' + sizes[2] + '.jpg').replace(/\ /g, '');
    log('filename: ' + filename);

      var page = require('webpage').create();
      page.onResourceError = function(resourceError) {
          page.reason = resourceError.errorString;
          page.reason_url = resourceError.url;

          log(page.reason);
          log(page.reason_url);
      };
      // page.onError(function() {
      //   //Ignore errors.
      // });
      page.onConsoleMessage = function(msg) {
        if(msg.indexOf('THEAIMSCRIPTSLIST') === 0) {
          // console.log(msg);
          if(msg.indexOf('google') > -1 && msg.indexOf('analytics') > -1) {
            result.analytics = "Analytics is geïnstalleerd.";
            result.has_analytics = 1;
          }
          result['scripts'] = msg;
        }

        if(msg.indexOf('THEAIMMOBILE') === 0) {
          console.log(msg);
          result['msite'] = msg;
        }
      };
      page.viewportSize = {
        width: sizes[0],
        height: sizes[1]
      };
      page.clipRect = { top: 0, left: 0, width: sizes[0], height: sizes[1] };
      page.zoomFactor = 1;

      page.onResourceReceived = function(response) {
        // console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response) + "\n\n");
        result['responses'].push(response);
      };

      function onPageReady() {
        // window.setTimeout(function() {
          // page.render('./screenshots/' + filename, {format: 'jpg', quality: '80'});
          // clearInterval(loading);
          // window.setTimout(function() {
            // console.log(window.gaGlobal.hid);
            page.close();
            callback.apply();
          // }, 4000);
        // }, 5000);
      }

      // page.onLoadFinished = function(status) {
      //   // console.log("STATUS: " + status);
      //   setTimeout(function() {
      //     console.log("HID: " + window.gaGlobal);
      //   }, 12000);
      // }

      t = Date.now();
      log('url '  + url);
      page.open(url, function (status) {
        log('opening page: ' + status);
        if (status !== 'success') {
          page.close();
          phantom.exit( 1 );
        } else {
          result['loadspeed'] = Date.now() - t;

          // window.setTimeout(function() {

            function checkReadyState() {
                setTimeout(function () {
                    var readyState = page.evaluate(function () {
                        return document.readyState;
                    });

                    if ("complete" === readyState) {
                        // console.log(document)

                        // Check what JS files are included in the page DOM (not source!), to get
                        // a more correct result on presence of e.g. Google Analytics
                        page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
                            page.evaluate(function() {
                              var scripts = "";
                              for(var i=0, j=$('script').length; i<j; i++) {
                                var script_url = $('script').eq(i).attr('src');
                                if(script_url !== undefined) {
                                  // console.log(script_url);
                                  scripts += script_url;
                                }
                              }
                              // Use 'THEAIMSCRIPTSLIST' to be sure only our own messages will be
                              // processed in the onConsoleMessage method (see above)
                              console.log("THEAIMSCRIPTSLIST " + scripts);

                              // Check for mobile site alternative
                              console.log("THEAIMMOBILE " + $('link[rel="alternate"][media*="only screen and (max-width: "]').attr('href'));
                            });
                            onPageReady();
                            phantom.exit();
                        });

                        // onPageReady();
                    } else {
                        // console.log(window.gaGlobal);
                        checkReadyState();
                    }
                });
            }
            checkReadyState();
          // }, 10000);
        }

      });
}

async.eachSeries(sizes, capture, function (e) {
    // if (e) console.log(e);
    console.log("AIMERRORPREVENT");
    console.log(JSON.stringify(result));
    phantom.exit( 0 );
});

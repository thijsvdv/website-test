// V 0.1

var phantom = require('node-phantom');

var async = require('async');
var fs = require('fs');
// var system = require('system');
// var async = require('async');
var request = require('request');
var cheerio = require('cheerio');

// var url = process.argv[process.argv.length-1];
var url = process.argv[2];
// var url = args[1]
// var url = system.args[1];
var site_url = url;

var protocol = site_url.split('://');
protocol = protocol[0];
// console.log(protocol);
// console.log("URL: " + url);

var debug = false;
if(process.argv[3] !== undefined && process.argv[3] === 'debug') {
  debug = true;
}

function log(data) {
  if(debug) {
    console.log(data);
  }
}

function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

function flatten(array, mutable) {
    var toString = Object.prototype.toString;
    var arrayTypeStr = '[object Array]';

    var result = [];
    var nodes = (mutable && array) || array.slice();
    var node;

    if (!array.length) {
        return result;
    }

    node = nodes.pop();

    do {
        if (toString.call(node) === arrayTypeStr) {
            nodes.push.apply(nodes, node);
        } else {
            result.push(node);
        }
    } while (nodes.length && (node = nodes.pop()) !== undefined);

    result.reverse(); // we reverse result to restore the original order
    return result;
}

log(url);


  var regexp = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/;
  var urls = regexp.exec(url);
  var json = { "title" : "", "h1" : "", "h2" : "", "description" : ""};
  var done = false;

  var sitemap = "";

  function occurrences(string, subString, allowOverlapping){
    string+=""; subString+="";
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step=(allowOverlapping)?(1):(subString.length);

    while(true){
        pos=string.indexOf(subString,pos);
        if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
  }

  var stopTimer = setTimeout(function() {
    // Timout our analysis after one minute.
    done = true;
  }, 60000);



  var options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    }
  };

  request(options, function(error, response, html) {
    // console.log(response.statusCode);
    if(!error && response.statusCode === 200) {
      // console.log(html);

      var $ = cheerio.load(html);
      var title, release, rating;
      // var json = { "title" : "", "h1" : "", "h2" : "", "description" : ""};

      json.domain = urls[0];
      json.title = "";
      json.description = "";
      json.h1 = [];
      json.h2 = [];
      json.alt = [];
      json.stylesheets = [];
      json.mediaqueries = [];
      json.keywords = "";
      json.scripts = [];
      json.analytics = "Geen analytics gevonden";
      json.has_analytics = 0;
      json.sitemap = "Geen sitemap gevonden";
      json.has_sitemap = 0;
      json.words = "";
      var load = 0;
      // json.sitemap = sitemap;

      //Get real URL after redirects
      var real_url = response.request.uri.href;
      log(real_url);

      var base = url;
      if($("base").length > 0 && $("base").attr('href') !== undefined && $("base").attr('href').length > 0) {
        base = $("base").attr('href');
      }

      if(base.slice(-1) !== '/') base += '/';

      //Stylesheets from source code
      // var mq = html.match(/(?:href\=[\']?[\"]?)(\S*\.css)*/gmi);
      // var mq = html.match(/(?:[^\'\"])(\S*\.css[^\'"])/gmi);
      // var mq = html.match(/(?:[\'\"])(\S*\.css)/gmi);
      var mq = html.match(/([^\]\"][a-zA-Z0-9\/\.\-\_]*\.css)/gmi);
      // console.log(mq);
      var uniqueArray = mq.map(function(item) {

        var url = "";
        if(item.indexOf('http') !== 0) {
          if(item.indexOf('../') >= 0) {
            var count = occurrences(item, '../', false);
            var base_fragments = base.replace('//', '||').split('/');
            base_fragments.pop();
            for(var i=0; i<count; i++) {
              base_fragments.pop();
            }
            url = base_fragments.join('/');
            url = url.replace('||', '//');

            item = item.replace(/\.\.\//g, '');
            item = url + '/' + item;
            // console.log(item);
          } else if(item.indexOf('//') === 0) {
            item = protocol + ':' + item;
          } else {
            item = base + item;
            // console.log(item);
          }
        }
        console.log(item);
        return item;



        // if(item.indexOf('http') === -1 && item.indexOf('//') !== 0) {
        //   // log("PROBLEMATIC URL: " + item);
        //   // return protocol + ':' + item;
        //   return url + '/' + item;
        // } else {
        //   return item;
        // }
      })
      json.stylesheets = uniqueArray.filter(function(item, pos, self) {
        return self.indexOf(item) == pos;
      });


      // console.log("base:", base);

      log('title?');
      $("title").filter(function() {
        var data = $(this);
        log('data: ' +  data);
        json.title = data.text();
        json['title_length'] = json.title.length;
        json.words += ' ' + json.title;
      });
      // console.log(++load);

      $('meta[name="description"]').filter(function() {
        var data = $(this);
        json.description = data.attr('content');
        json.words += ' ' + json.description;
      });
      // console.log(++load);

      $('meta[name="keywords"]').filter(function() {
        var data = $(this);
        json.keywords = data.attr('content');
        json.words += ' ' + json.keywords;
      });
      // console.log(++load);

      $('link[rel="alternate"][media*="max-width"]').filter(function() {
        var data = $(this);
        if(data.attr('href') !== undefined) {
          json.mobilesite = data.attr('href');
        }
      });

      var i = 0;
      $('style').filter(function() {

        var data = $(this);
        if(data.children().length === 0) {
          i++;
          var css = data.text();
              css = css.split('@import url("');
              css.forEach(function(u) {
                if(u !== '') {
                  json.stylesheets.push(u.replace('");', ''));
                }
              });
        }
      });

      $("h1").filter(function() {
        var data = $(this);
        json['h1_length'] = data.text().length;
        json.h1.push(data.text());
      });
      // console.log(++load);

      $("h2").filter(function() {
        var data = $(this);
        json.h2.push(data.text());
      });
      // console.log(++load);

      $("img").filter(function() {
        var data = $(this);
        if(data.attr('alt') !== undefined)
          json.alt.push(data.attr('alt'));
          json.words += ' ' + data.attr('alt');
      });
      // console.log(++load);

      // LATERZ
        // json.words += ' ' + $('body').clone().find('script').remove().end().text();
        // json.words = json.words; //.replace(/[^\w\s]/gi, "").replace( /\s+/g, ",");




        // var strip_words = ['een', 'de', 'van', 'met', 'in', 'op', 'het', 'heel', 'zeer', 'nogal',
        // 'er', 'je', 'zij', 'ze', 'we', 'wij', 'jou', 'hem', 'haar', 'hun', 'is', 'nu', 'ons', 'dat',
        // 'al', 'bij', 'zal', 'deze', 'die', 'af', 'zijn', 'en', 'uw', 'u', 'voor', 'onze', 'naar',
        // 'te', 'of', 'niet', 'was'];
        // var max = {
        //     single: 0,
        //     double: 0,
        //     triple: 0
        // }


        // function exlude_words(string) {
        //     var input = string.replace(/[^\w\s]/gi, "").replace( /\s+/g, ",").split(',');
        //     return input.filter(function(el) {
        //         return strip_words.indexOf(el.toLowerCase()) < 0;
        //     });
        // }

        // function createDoubleCombinations(words) {
        //     var combinations = [];
        //     for(var i=0, j=words.length; i<j-1; i++) {
        //         combinations.push(words[i] + ' ' + words[i+1]);
        //     }
        //     return combinations;
        // }

        // function createTripleCombinations(words) {
        //     var combinations = [];
        //     for(var i=0, j=words.length; i<j-2; i++) {
        //         combinations.push(words[i] + ' ' + words[i+1] + ' ' + words[i+2]);
        //     }
        //     return combinations;
        // }

        // function countOccurences(words, num) {
        //     var count_words = {};
        //     words.forEach(function(word) {
        //         if(count_words[word] === undefined) {
        //             count_words[word] = 1;
        //         } else {
        //             count_words[word] = count_words[word]+1;
        //             if(count_words[word]+1 > max[num]) {
        //                 max[num] = count_words[word];
        //             }
        //         }
        //     });
        //     return count_words;
        // }

        // function listOccurences(words, num) {
        //     var word_count = [];
        //     for(var i=1; i<=max[num]; i++) {
        //         word_count[i] = [];
        //     }
        //     // console.log('word_count', word_count);
        //     console.log(words);

        //     for(var word in words) {
        //         if(word !== '' && word !== null && word !== undefined && word !== " ") {
        //           console.log('word "' + word +'"');
        //           console.log(words[word]);
        //           word_count[words[word]].push(word);
        //         }
        //     }

        //     return word_count;
        // }

        // var clean_title = exlude_words(json.title);
        // var single_words = exlude_words(json.words);
        // var doubleCombinationsText = createDoubleCombinations(exlude_words(json.words));
        // var tripleCombinationsText = createTripleCombinations(exlude_words(json.words));
        // // var doubleCombinationsTitle = createDoubleCombinations(clean_title);
        // // var tripleCombinationsTitle = createTripleCombinations(clean_title);

        // // console.log('single_words', single_words);
        // // console.log('doubleCombinations', doubleCombinationsText);
        // // console.log('tripleCombinations', tripleCombinationsText);

        // var num_single = countOccurences(single_words, 'single');
        // var num_double = countOccurences(doubleCombinationsText, 'double');
        // var num_triple = countOccurences(tripleCombinationsText, 'triple');

        // // console.log('num_single', num_single);
        // // console.log('num_double', num_double);
        // // console.log('num_triple', num_triple);
        // // console.log(max);

        // json.list_single = listOccurences(num_single, 'single');
        // json.list_double = listOccurences(num_double, 'double');
        // json.list_triple = listOccurences(num_triple, 'triple');




      $('html').find('script[type="application/ld+json"]').each(function() {
        var linkdata = JSON.parse($(this).text());

        console.log('linkdata ' + linkdata);

        if(linkdata.sameAs !== undefined) {
          json['linkdata'] = linkdata;
          linkdata.sameAs.forEach(function(link) {
            if(link.indexOf('facebook.com/pages/') > -1) {
              json['link_fb'] = link;
              var like_url = 'https://api.facebook.com/method/fql.query?query=select%20%20like_count%20from%20link_stat%20where%20url=%22' + json.link_fb +'%22';
              log(json.link_fb);

              request(like_url, function(error, response, html){
                if(!error){
                  var $ = cheerio.load(html);
                  json.count_fb = $('like_count').text().replace(/\s+/g, '');
                }
              });
            }

            if(link.indexOf('linkedin.com') > -1) {
              json['link_li'] = link;
            }

            if(link.indexOf('twitter.com') > -1) {
              json['link_tw'] = link;
              request(json.link_tw, function(error, response, html){
                if(!error){
                  var $ = cheerio.load(html);
                  json.count_tw = $('.ProfileNav-item--followers .ProfileNav-value').text().replace(/\s+/g, '');
                  done = true;
                }
              });
            }

            if(link.indexOf('plus.google.com') > -1) {
              json['link_gp'] = link;
            }

            if(link.indexOf('youtube.com') > -1) {
              json['link_yt'] = link;
            }
          });
        }
      });

      log('1');

      if(json.link_fb === undefined || json.link_fb === '') {
        $('body').find('a[href*="facebook.com"]').each(function() {
          // log(this);
          if($(this).attr('href').indexOf('sharer') < 0) {
            json.link_fb = $(this).attr('href');
            var lfb = json.link_fb.split('?');
            json.link_fb = lfb[0];

            log("json.link_fb: " + json.link_fb);


            // var fb_fragments = json.link_fb.replace('//', '||').split('/');
            // log('fb_fragments ' + parseInt(fb_fragments[3]) + ' ' + typeof(fb_fragments[3]));

            // var index = 1;
            // if(fb_fragments[1] === 'pages') index = 2;

            // json.link_fb = 'https://www.facebook.com/' + fb_fragments[index];

            // if(parseInt(fb_fragments[3]) > 0) {
            //   json.link_fb = json.link_fb + "/" + fb_fragments[3];
            //   log("json.link_fb: " + json.link_fb);
            // }

            var like_url = 'https://api.facebook.com/method/fql.query?query=select%20%20like_count%20from%20link_stat%20where%20url=%22' + json.link_fb +'%22';
            log("like_url: " + like_url);
            request(like_url, function(error, response, html){
              log('like_url error? ' + error);
              if(!error){
                var $ = cheerio.load(html);
                json.count_fb = $('like_count').text().replace(/\s+/g, '');
              }
            });
          }
        });
      }

      log('2');

      if(json.link_tw === undefined || json.link_tw === '') {
        $('body').find('a[href*="twitter.com"]').each(function() {
          if($(this).attr('href').indexOf('share') < 0) {
            json.link_tw = $(this).attr('href');
            // console.log("TW", json.link_tw);
            done = false;
            log("json.link_tw: " + json.link_tw)
            request(json.link_tw, function(error, response, html){
              log('json.link_tw error? ' + error);
              if(!error){
                var $ = cheerio.load(html);
                json.count_tw = $('.ProfileNav-item--followers .ProfileNav-value').text().replace(/\s+/g, '');
                done = true;
                // console.log(json.count_tw);
              }
            });
          }
        });
      }

      log('3');

      if(json.link_yt === undefined || json.link_yt === '') {
        $('body').find('a[href*="youtube.com"]').each(function() {
          if($(this).attr('href').indexOf('watch') < 0) {
            json.link_yt = $(this).attr('href');
            // console.log("YT", json.link_yt);
          }
        });
      }

      log('4');

      if(json.link_li === undefined || json.link_li === '') {
        $('body').find('a[href*="linkedin.com"]').each(function() {
          if($(this).attr('href').indexOf('shareArticle') < 0) {
            json.link_li = $(this).attr('href');
            // console.log("YT", json.link_yt);
          }
        });
      }

      log('5');

      if($("body").text().indexOf("www.google-analytics.com/analytics.js") > 0 || $("head").text().indexOf("www.google-analytics.com/analytics.js") > 0 || $("head").text().indexOf("google-analytics.com/ga.js") > 0 || $("body").text().indexOf("google-analytics.com/ga.js") > 0) {
        json.analytics = "Analytics is geïnstalleerd.";
        json.has_analytics = 1;
      }

      log('6 ' + done);

      // console.log($('head').html());

      $("head").filter(function() {
        var data = $(this);
        data.find('script').each(function(i, elem) {
          if(data.attr('src') !== undefined)
            json.scripts.push(elem.attr('src'));
        });

        var i = 0;

        data.find('link[rel="stylesheet"]').each(function(i, elem) {
            var cssurl = $(this).attr('href');
            var url = "";
            if(cssurl.indexOf('http') !== 0) {
              if(cssurl.indexOf('../') >= 0) {
                var count = occurrences(cssurl, '../', false);
                var base_fragments = base.replace('//', '||').split('/');
                base_fragments.pop();
                for(var i=0; i<count; i++) {
                  base_fragments.pop();
                }
                url = base_fragments.join('/');
                url = url.replace('||', '//');

                cssurl = cssurl.replace(/\.\.\//g, '');
                cssurl = url + '/' + cssurl;
              } else {
                cssurl = base + cssurl;
              }
            }
            json.stylesheets.push(cssurl);
        });
      });
      // console.log(++load);

      log('7 ' + done);
      if(json.stylesheets.length > 0) {
        json.stylesheets.forEach(function(link) {
          // console.log(link);
          done = false;
          log('css link: ' + link);
          request(link, function(error, response, html){
            log(error);
            if(!error){
              var $ = cheerio.load(html);
              // var mq = html.match(/@media[^{]*(?:(?!\}\s*\}))*/gmi); // Wrong results
              var mq = html.match(/@media[A-Za-z\s]*[\(][^{]*/gmi);

              // console.log(mq);
              json.mediaqueries.push(mq);
              done = true;
            }
          });
        });
      }


      log('8 ' + done);

      request(urls[0] + '/sitemap.xml', function(error, response, html){
        if(!error) {
          json.sitemap = "Sitemap gevonden";
          json.has_sitemap = 1;
          // console.log(++load);
        } else {
          json.sitemap = error;
          log(error);
        }
      });

      log('9 ' + done);

      var loop = setInterval(function() {
        log('done: ' + done);
        if(done) {
          clearTimeout(stopTimer);


          var test = flatten(json.mediaqueries, true);
          json.mediaqueries = test.filter(function(item, pos, self) {
            // TODO: filter out null
            return self.indexOf(item) == pos;
          });

          console.log('AIMERRORPREVENT');
          console.log(JSON.stringify(json, null, 4));
          clearInterval(loop);
        }
      }, 3000);

      log('10 ' + done);

    } else {
      console.log(error);
    }
  })


  // async.eachSeries(sizes, capture, function (e) {
  //   // if (e) console.log(e);
  //   // console.log(JSON.stringify(result));
  //   console.log(JSON.stringify(json, null, 4));
  //   phantom.exit( 0 );
  // });

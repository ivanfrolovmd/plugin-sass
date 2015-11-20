var fs = require('fs');
var querystring = require('querystring');
var sass = require('sass.js');
var url = require('url');

var cssInject = "(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})";

var urlBase;

var escape = function(source){
  return source
    .replace(/(["\\])/g, '\\$1')
    .replace(/[\f]/g, '\\f')
    .replace(/[\b]/g, '\\b')
    .replace(/[\n]/g, '\\n')
    .replace(/[\t]/g, '\\t')
    .replace(/[\r]/g, '\\r')
    .replace(/[\ufeff]/g, '')
    .replace(/[\u2028]/g, '\\u2028')
    .replace(/[\u2029]/g, '\\u2029');
};

var loadFile = function(path) {
  return new Promise(function(resolve, reject) {
    fs.readFile(path, {encoding: 'UTF-8'}, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// intercept file loading requests (@import directive) from libsass
sass.importer(function(request, done){
  // Currently only supporting scss imports due to
  // https://github.com/sass/libsass/issues/1695
  var importUrl = url.resolve(urlBase, request.current+'.scss');
  var partialUrl = importUrl.replace(/\/([^/]*)$/, '/_$1');
  var readImportPath = querystring.unescape(url.parse(importUrl).path);
  var readPartialPath = querystring.unescape(url.parse(partialUrl).path);
  var content;
  loadFile(readPartialPath)
    .then(function(data){content = data})
    .catch(function(){loadFile(readImportPath)})
    .then(function(data){content = data})
    .then(function(){done(content)});
});

exports.default = function(loads, compileOpts){
  var stubDefines = loads.map(function(load){
    var sys = (compileOpts.systemGlobal || System)
    return sys.register(load.name, [], false, function() {});
  }).join('\n');

  var compilePromise = function(load){
    return new Promise(function(resolve, reject){
      urlBase = load.address;
      const options = {
        style: sass.style.compressed,
        indentedSyntax: urlBase.endsWith('.sass')
      };
      sass.compile(load.source, options, function(result){
        if (result.status === 0) {
          resolve(result.text);
        } else {
          reject(result.formatted);
        }
      });
    });
  };
  return new Promise(function(resolve, reject){
    // Keep style order
    Promise.all(loads.map(compilePromise))
    .then(
      function(response){resolve([stubDefines, cssInject, escape(response.reverse().join(''))].join('\n'))},
      function(reason){reject(reason)});
  });
};

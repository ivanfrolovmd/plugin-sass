var reqwest = require('reqwest');
var url = require('url');
require('./modernizr');

var urlBase;

var importSass = new Promise(function(resolve, reject){
  if (Modernizr.webworkers) {
    System.import('sass.js/dist/sass', __moduleName).then(function(Sass){
      resolve(new Sass());
    }).catch(function(err){reject(err)});
  } else {
    System.import('sass.js/dist/sass.sync', __moduleName).then(function(Sass){
      resolve(Sass);
    }).catch(function(err){reject(err)});
  }
});


// intercept file loading requests (@import directive) from libsass
importSass.then(function(sass){
  sass.importer(function(request, done){
    var current = request;
    // Currently only supporting scss imports due to
    // https://github.com/sass/libsass/issues/1695
    console.log(current);
    console.log(current+'.scss');
    var importUrl = url.resolve(urlBase, current+'.scss');
    var partialUrl = importUrl.replace(/\/([^/]*)$/, '/_$1');
    var content;
    reqwest(partialUrl)
      .then(function(resp){
        // In Cordova Apps the response is the raw XMLHttpRequest
        content = resp.responseText ? resp.responseText : resp;
        return content;
      })
      .catch(function(){reqwest(importUrl)})
      .then(function(resp){
        content = resp.responseText ? resp.responseText : resp;
        return content;
      })
      .then(function(){done(content)});
  });
});


var compile = function(scss) {
  return new Promise(function(resolve, reject){
    importSass.then(function(sass) {
      sass.compile(scss.content, scss.options, function(result) {
        if (result.status === 0) {
          const style = document.createElement('style');
          style.textContent = result.text;
          style.setAttribute('type', 'text/css');
          document.getElementsByTagName('head')[0].appendChild(style);
          resolve('');
        } else {
          reject(result.formatted);
        }
      });
    });
  });
};


exports.default = function(load) {
  urlBase = load.address;
  var indentedSyntax = urlBase.endsWith('.sass');
  // load initial scss file
  return reqwest(urlBase)
          .then(function(resp) {
            return {
              content: (resp.responseText ? resp.responseText : resp),
              options: indentedSyntax
            };
          })
          .then(compile);
};

if (typeof window !== 'undefined')
{
  exports.fetch = function(load) {
    return System.import('./sass-inject', {name: __moduleName}).then(function (inject){
      inject.default(load)
    });
  }
} else {
  exports.translate = function(load) {
    load.metadata.format = 'defined';
  };
  exports.bundle = function(loads, opts) {
    return System.import('./sass-builder', {name: __moduleName}).then(function(builder){
      builder.default.call(System, loads, opts);
    });
  }
}

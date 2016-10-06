var define, seajs;
(function(window, undefined){
    var modulesFn = {},
        modules = {},
        names = {},
        id = 0,
        randKey = (Math.random() + '').substring(2);

    var require = function(name) {
        var module, rst;
        for(var i in names) {
            if(names.hasOwnProperty(i) && (names[i] === name)) {
                module = modules[i];
                if(!module[randKey]) {
                    rst = modulesFn[i].call(window, require, module.exports, module);
                    if(rst) {
                        module.exports = rst;
                    }
                }
                return module.exports;
            }
        }
        return undefined;
    };

    define = function(name, dependencies, moduleFn){
        names[id] = name;
        modulesFn[id] = moduleFn;
        modules[id] = {
            exports: {}
        };
        modules[id][randKey] = false;
        id++;
    };

    seajs = {
        use: function(name){
            var module;
            for(var i in names) {
                if(names.hasOwnProperty(i) && (names[i] === name)) {
                    module = modules[i];
                    if(!module[randKey]) modulesFn[i].call(window, require, module.exports, module);
                    return;
                }
            }
        }
    };
})(window);
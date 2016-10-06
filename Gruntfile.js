'use strict';

var path = require('path');

//windows下跨分区路径操作有问题，暂时重载path.join处理
if(/win/.test(process.platform)) {
    var _join = path.join;
    path.join = function() {
        return _join.apply(null,arguments).replace(/[\s\S]*(\w:[^:]+)$/,'$1');
    }
}

module.exports = function(grunt) {

    //因为运行grunt时，可能改变了grunt当前工作目录（如使用--base参数）
    //重置grunt当前工作目录，避开模块路径依赖造成的问题
    grunt.file.setBase(__dirname);

    var config;
    try{
        config = require('./config.json');
    }catch(err) {
        config = {};
    }

    // 获取项目名称，项目名称约定为父目录名
    var match = path.resolve(__dirname, '../').match(/\w+$/);

    var PROJECT_NAME = match ? match[0] : '',
        //端口和node_modules可配置
        PORT = grunt.option('port') || config.port || '9090',
        HOST = config.host || '0.0.0.0',
        MODULE_PATH = grunt.option('nodepath') || config.nodePath || __dirname,
        OUTPUT_PATH = (config.outputPath || 'output').replace(/:?\\\\/g,'/'),

        //因为grunt当前工作目录不固定， assemble 依赖的各种 helpers 模块路径需要修正一下
        HELPERS_PATH = path.relative(process.cwd(), MODULE_PATH);

    var mountFolder = function (connect, dir) {return connect.static(path.resolve(dir));};   

    require(path.join(MODULE_PATH, 'matchdep'))
    .filterDev('grunt-*', path.join(__dirname, 'package.json'))
    .forEach(function(name){
        grunt.task.loadTasks(path.join(MODULE_PATH, name, 'tasks'));
    });

    grunt.task.loadTasks(path.join(MODULE_PATH, 'assemble', 'tasks'));

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        //文件变化监听
        watch: {
            options: {
                livereload: {
                    port:3+PORT
                },
                interrupt: true
            },
            gruntfile: {
                files: 'Gruntfile.js',
                tasks: ['watchcontexthelper:gruntfile'],
                options: {
                    nospawn: true
                }
            },
            sass: {
                files: ['public/assets/sass/{,*/}*.{scss,sass}'],
                tasks: ['watchcontexthelper:sass'],
                options: {
                    nospawn: true
                }
            },
            js: {
                files: ['public/assets/js/**/*.js'],
                tasks: ['watchcontexthelper:js'],
                options: {
                    nospawn: true
                }
            },
            img: {
                files: ['public/assets/images/**/*'],
                tasks: ['watchcontexthelper:img'],
                options: {
                    nospawn: true
                }
            },
            html: {
                files: ['public/assets/tpl/**/*.hbs'],
                tasks: ['watchcontexthelper:html'],
                options: {
                    nospawn: true
                }
            },
            tmod: {
                files: ['public/assets/tpl/tmod/*.tpl'],
                options: {}
            }
        },
        //nodejs connect 配置
        connect: {
            options: {
                port: PORT,
                hostname: HOST
            },
            production: {
                options: {
                    middleware: function(connect) {
                        return [mountFolder(connect, OUTPUT_PATH)];
                    }
                }
            },
            output: {
                options: {
                    middleware: function(connect) {
                        return [mountFolder(connect, OUTPUT_PATH)];
                    }
                }
            },
            dev: {
                options: {
                    middleware: function(connect) {
                        return [mountFolder(connect, 'public')];
                    }
                }
            }
        },
        open: {
            dev: {path: 'http://localhost:<%= connect.options.port %>/'},
            production: {path: 'http://localhost:<%= connect.options.port %>/'}
        },

        cssmin: {
            output: {
                options: {},
                expand: true,
                cwd: OUTPUT_PATH+'/assets/css/',
                src: [ '*.css', '!*.min.css' ],
                dest: OUTPUT_PATH+'/assets/css/'
            }
        },
        uglify: {
            options: {},
            output: {
                files: [
                    {
                        expand: true,
                        cwd: OUTPUT_PATH+'/assets/js/',
                        src: ['**/*.js', '!**/*.min.js'],
                        dest: OUTPUT_PATH+'/assets/js/'
                    }
                ]
            }
        },
        sass: {
            dev: {
                options: {
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    cwd: 'public/assets/sass',
                    src: ['*.scss'],
                    dest: 'public/assets/css/',
                    ext: '.css'
                }]
            }
        },
        imagemin: {                         
            dist: {                         
                options: {                      
                    optimizationLevel: 3,
                },
                files: [{
                    expand: true,                  
                    cwd: OUTPUT_PATH+'/',                 
                    src: ['**/*.{png,jpg,gif}'],  
                    dest: OUTPUT_PATH+'/'               
                }]
            }
        },
        assemble: {
            options: {
                layoutdir: 'public/assets/tpl/layouts',
                pages: 'public/assets/tpl/pages/**/*.hbs',
                partials: 'public/assets/tpl/partials/**/*.hbs',
                prettify: {
                    condense: true,
                    padcomments: true,
                    indent: 4
                },
                helpers: [path.join(HELPERS_PATH, 'helper-moment'), path.join(HELPERS_PATH, 'prettify')],
				data: 'public/assets/tpl/data/*.json'
            },
            development: {
                options: {production: false},
                files: [{ 
                    expand: true, 
                    cwd: 'public/assets/tpl/pages/', 
                    src: ['**/*.hbs'], 
                    dest: 'public/assets/tpl/html/'
                }],
            }
        },
        tmod: {
            path: path.join(__dirname,'public/assets/tpl/tmod'),
            options: {
                output: '../../js/tpl',
                debug : false,
                charset : 'utf-8',
                type: 'cmd'
            }
        },
        compile: {
            options: {
                base: 'public/assets/js/'
            },
            all: {
                src: [
                    'public/assets/js/**/*.js'
                ],
                dest: 'public/assets/compiled'
            }
        },
        pack: {
            js: {
                type: 'js',
                options: {base: 'public/assets/compiled'},
                src: ['public/assets/compiled/pages/*.js'],
                dest: OUTPUT_PATH+'/assets/js/pages/'
            }
        },
        jsbeautifier: {
            files : [OUTPUT_PATH+'/assets/js/**/*.js'],
            options : {}
        },
        copy: {
            distOutputHTML: {
                expand: true,
                cwd: 'public/',
                src: '*',
                dest: OUTPUT_PATH+'/',
                filter: 'isFile'
            },
            distSass: {
                expand: true,
                cwd: 'public/assets/sass/',
                src: '**/*',
                dest: OUTPUT_PATH+'/assets/sass'
            },
            distCss: {
                expand: true,
                cwd: 'public/assets/css/',
                src: '**/*',
                dest: OUTPUT_PATH+'/assets/css'
            },
            distLib: {
                expand: true,
                cwd: 'public/assets/js/lib',
                src: '**',
                dest: OUTPUT_PATH+'/assets/js/lib'
            },
            distWidget: {
                expand: true,
                cwd: 'public/assets/js/widget',
                src: '**',
                dest: OUTPUT_PATH+'/assets/js/widget'
            },
            distImage: {
                expand: true,
                cwd: 'public/assets/images/',
                src: '**',
                dest: OUTPUT_PATH+'/assets/images/'
            },
            distFlash: {
                expand: true,
                cwd: 'public/assets/flash/',
                src: '**',
                dest: OUTPUT_PATH+'/assets/flash/'
            },
            distSea: {
                src: 'public/assets/js/seajs/sea-debug.js',
                dest: OUTPUT_PATH+'/assets/js/seajs/sea.js'
            },
            devJs: {
                expand: true,
                cwd: 'public/assets/djs/',
                src: '*.js',
                dest: 'public/assets/js/',
                options: {
                    process: function (content, srcpath) {
                        return dynamicJs(content, srcpath);
                    }
                }
            },
            devhtml: {
                expand: true,
                cwd: 'public/assets/tpl/html',
                src: '**',
                dest: 'public/',
                options: {
                    process: function (content, srcpath) {
                        return insertAssets('dev', content, srcpath);
                    }
                }
            },
            preoutput: {
                expand: true,
                cwd: 'public/assets/tpl/html',
                src: '**',
                dest: 'public/',
                options: {
                    process: function (content, srcpath) {
                        return insertAssets('production', content, srcpath);
                    }
                }
            }
        },
        clean: {
            dist: [OUTPUT_PATH, 'public/assets/compiled'],
            compile: ['public/assets/compiled'],
            dev: ['public/assets/js/tpl', 'public/*.html', 'public/assets/css/style.css', 'public/assets/compile'],
            tplhtml: ['public/assets/tpl/html'],
            tmod: ['public/assets/js/tpl'],
            outputjs: [OUTPUT_PATH+'/assets/js'],
            outputhtml: [OUTPUT_PATH+'/html/*.html', OUTPUT_PATH+'/*.html'],
            publichtml: ['public/*.html'],
            devcss: ['public/assets/css/style.css'],
            outputcss: [OUTPUT_PATH+'/assets/css'],
            outputimage: [OUTPUT_PATH+'/assets/images']
        }
    });

    //编译js发布到output/assets/js
    grunt.registerTask('outputjs', ['clean:outputjs', 'compile', 'pack', 'clean:compile', 'copy:distLib', 'copy:distSea', 'copy:distWidget']);

    //编译html模板, assemble和tmod
    grunt.registerTask('devhtml', ['clean:publichtml', 'assemble', 'copy:devhtml', 'clean:tplhtml']);

    //编译assemble模板到public/html目录下, 并自动增加html的外部资源引用, 将tmod数据模板编译到public/js/tpl目录下
    grunt.registerTask('development', ['clean:dev', 'sass:dev', 'tmod', 'assemble', 'copy:devhtml', 'copy:devJs', 'clean:tplhtml']);
    grunt.registerTask('preoutput', ['clean:dev', 'sass:dev', 'tmod', 'assemble', 'copy:preoutput', 'clean:tplhtml']);

    //将seajs模块, 编译打包, 到ouput/assets/js目录下, 拷贝图片,css, 等外部资源到output/assets目录下, 此时的代码未压缩
    grunt.registerTask('output', ['clean:dist', 'compile', 'pack', 'clean:compile', 'copy:distOutputHTML', 'copy:distSass', 'copy:distCss', 'cssmin', 'copy:distImage', 'imagemin', 'copy:distFlash', 'copy:distLib', 'copy:distSea', 'copy:distWidget']);

    //不带debug参数, 代码直接压缩混淆到发布状态, 带debug, 代码未经压缩混淆
    grunt.registerTask('production', function(target) {
        if(target === 'debug') {
            return grunt.task.run(['preoutput', 'output', 'jsbeautifier']);
        }else if(target == 'local') {
            return grunt.task.run(['devhtml', 'output']);
        }
        grunt.task.run(['preoutput', 'output', 'uglify:output', 'cssmin:output']);
    });

    //启动服务器, 并执行完全工作流
    grunt.registerTask('server', function (target) {
        if (target === 'output') {
            grunt.watchcontext = 'output';
            return grunt.task.run(['production:local', 'connect:output', 'open:production', 'watch']);
        }
        if (target === 'production') {
            grunt.watchcontext = 'production';

            return grunt.task.run(['production', 'connect:production', 'open:production', 'watch']);
        }
        grunt.task.run(['development', 'connect:dev', 'open:dev', 'watch']);
    });

    grunt.registerTask('watchcontexthelper', function (target){
        switch (target) {
            case 'js':
                if(grunt.watchcontext === 'production') {
                    grunt.task.run(['outputjs', 'uglify:output'])
                } else if (grunt.watchcontext === 'output'){
                    grunt.task.run(['outputjs']);
                }
                break;
            case 'img':
                if (grunt.watchcontext === 'production' || grunt.watchcontext === 'output') {
                    grunt.task.run(['clean:outputimage', 'copy:distImage'])
                }
                break;
            case 'html':
                if(grunt.watchcontext === 'production' || grunt.watchcontext === 'output') {
                    grunt.task.run(['devhtml', 'clean:outputhtml', 'copy:distOutputHTML']);
                } else {
                    grunt.task.run(['devhtml']);
                }
                break;
            case 'sass':
                if(grunt.watchcontext === 'production') {
                    grunt.task.run(['clean:devcss', 'clean:outputcss', 'sass', 'copy:distCss', 'cssmin']);
                } else if(grunt.watchcontext === 'output'){
                    grunt.task.run(['clean:devcss', 'clean:outputcss', 'sass', 'copy:distCss']);
                } else {
                    grunt.task.run(['clean:devcss', 'sass']);
                }
                break;
        }
    });

    grunt.registerTask('default', ['server']);


    function insertAssets(type, content, srcpath) {
        var pageName = srcpath.split('/').pop().split('.')[0],
            d = new Date(),
            v = '' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + d.getHours() + d.getMinutes();

        //combo
        var css = '',
            js = '',
            
            // 静态资源收集后放在这里
            res = {},

            //缓存起来，可以用来去重
            cache = {},

            // 配置host属性的映射关系
            hosts = {
                res:'http://res.yy.com/libs/'
            },

            // 匹配combo标记
            combo_re = /<!--\s*combo(css|js)(?:\[host=(.*)\])?:([\s\S]*?)-->/gm,
            // 用来切分多个资源
            res_re = /\S+/gm;

        
        if(config.hosts) {
            for(var i in config.hosts) {
                hosts[i] = config.hosts[i];
            }
        }

        //收集资源
        var addUrl = function(type, host, urls) {
            host = host || 'res';
            res[host] || (res[host] = {js:[],css:[]});

            var result = urls.match(res_re);
            for(var i=0,l=result.length;i<l;i++) {
                var url = result[i];

                if(!cache[host+'_'+url]) {
                    cache[host+'_'+url] = 1;

                    res[host][type].push(url);
                }
            }
        }

        // nodejs中replace带callback时会变成异步，所以用test
        while(combo_re.test(content)) {
            addUrl(RegExp.$1, RegExp.$2, RegExp.$3);
        }

        for(var i in res) {
            if(typeof hosts[i] === 'undefined') {
                continue;
            }

            switch(type) {
                case 'production': {
                    if(res[i].js.length) {
                        var url = hosts[i] + '??' + res[i].js.join(',')+'?ver='+v;
                        js += '<script src="'+url+'" type="text/javascript"></script>';
                    }

                    if(res[i].css.length) {
                        var url = hosts[i] + '??' + res[i].css.join(',')+'?ver='+v;
                        css += '<link rel="stylesheet" href="'+url+'" type="text/css" media="screen" />';
                    }

                    break;
                }

                case 'dev': {
                    if(res[i].js.length) {
                        res[i].js.forEach(function(url) {
                            js += '<script src="'+hosts[i]+url+'?ver='+v+'" type="text/javascript"></script>';
                        });
                    }

                    if(res[i].css.length) {
                        res[i].css.forEach(function(url) {
                            css += '<link rel="stylesheet" href="'+hosts[i]+url+'?ver='+v+'" type="text/css" media="screen" />';
                        });
                    }

                    break;
                }
            }

        }

        content = content.replace(combo_re, '')
            .replace(/<!--\s*js_holder\s*-->/gm, js)
            .replace(/<!--\s*css_holder\s*-->/gm, css)
            .replace(/src\s*=\s*["'](?![^"']*\/\/)([^'"]+)\.js([^'"]*)['"]/gm, 'src="assets/js/$1.js$2"')
            .replace(/href\s*=\s*["'](?![^"']*\/\/)([^'"]+)\.css([^'"]*)['"]/gm, 'href="assets/css/$1.css$2"')
            .replace(/<!--\s*seajs_holder\s*-->/gm, '<script src="assets/js/seajs/sea.js"></script>');

        if(type != 'production') {
            content = content.replace(/<\/body>/g, '<script src="http://127.0.0.1:3'+PORT+'/livereload.js"></script>'+'</body>');
        }

        return content;
            
    }

    function requireJson(varName, path, prop) {

        var 
            value = '',
            json = {};

        try{
            json = require(path);
        }catch(e){
            console.log(e);
        }

        if(prop) {
            var values = [];

            for(var i in json) {
                values.push(json[i][prop]);
            }

            value = '"'+values.join(',')+'"';

        }else {
            value = JSON.stringify(json);
        }

        return 'var ' + varName + ' = ' + value + ';';
    }


    function dynamicJs(content, srcpath) {
        //用来匹配动态js的包含语句
        var require_re = /\/\*<%\s*(\w*?)\s*=\s*require\(([^\(\)]*?)\)\s*%>\*\//gm;

        var str = '';
        while(require_re.test(content)) {

            var 
                var_name = RegExp.$1,
                args = RegExp.$2.split(','),
                json_path = args[0].replace(/["'"]/g,''),
                prop = args[1] && args[1].replace(/ /g,'');

            str += requireJson(var_name, path.resolve(srcpath, '../', json_path), prop);
        }

        return content.replace(require_re, str);

    }
};

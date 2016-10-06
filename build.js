/**
* @fileoverview feteam工作流自动构建工具
* @author yikehao
* @mail yikehao@yy.com
* @version 0.0.2
*/

var fs = require('fs');
var path = require('path');
var https = require('https');
var exec = require('child_process').exec;
var EmitterClass = require('events').EventEmitter;
var emitter = new EmitterClass();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var LOG = {
    DEFAULT: '',
    ERROR: 'red',
    GOOD: 'green',
    WARN: 'yellow',
    FUN: 'pink',
    EM: 'cyan',
    TIPS: 'gray'
};
var log = function(text, color) {
    var colors = {
        red: 31,
        green: 32,
        yellow: 33,
        blue: 34,
        pink: 35,
        cyan: 36,
        gray: 90
    };

    return console.log('\033[' + (colors[color] || '00') + 'm'+text+'\033[0m');
}

// 指定项目包版本号
var PACKAGE_VERSION = {
    MULTI: '0.0.5',
    SINGLE: '0.0.2'
}

// 定义每个步骤
var STEP = {
    BEGIN: 0,
    CONFIG: 1,
    GRUNT_TASK: 2,
    PRO_TYPE: 3,
    NODE_PATH: 4,
    PORT: 5,
    CREATE: 6,
    SCRIPT: 7
};

// 空数据，用于跳过终端输入的等待
var EMPTY_DATA = 'empty_data_'+Date.now();

// 定义任务类型
var TASK_TYPE = {
    Y_OR_N: 0,
    CHOOSE: 1,
    INPUT: 2,
    DEFERRED: 3
}

// 用来收集用户输入的任务配置数据
var task_config = {};

// 任务管理器
var taskManager = {
    /**
    * 程序开始启动的标记，用于防止重复启动
    */
    hasStart: false,

    /**
    * 当前执行的任务
    */
    curTask: null,

    /**
    * 所有注册的任务都放在这里
    */
    tasks: {},

    /**
    * 任务队列，有时需要任务按一定的顺序执行
    */
    queue: [],

    /**
    * 注册一个任务
    * @return {Object taskManager}
    * @param {Number} tid 任务ID，从STEP中选择
    * @param {Object} opt 任务的配置，会成为任务实例的属性
    */
    register: function(tid, opt) {

        if(!this.tasks[tid]) {
            this.tasks[tid] = [];

        }

        opt.id = tid;
        var task = new Task(opt);

        this.tasks[tid].push(task);

        return this;
    },

    /**
    * 删除一组任务
    * @param {Number} tid 任务ID，从STEP中选择
    */
    remove: function(tid) {
        this.tasks[tid] = null;
    },

    /**
    * 执行一组任务
    * @param {Number} tid 任务ID，从STEP中选择
    * @param {Object} data（可选参数）任务附带参数
    */
    runTask: function(tid, data) {
        if(this.tasks[tid]) {

            var _this = this;

            this.tasks[tid].forEach(function(task) {
                _this.curTask = task;
                return task.begin(data);
            });

        }
    },

    /**
    * 执行一个队列的任务
    */
    runByQueue: function() {
        var tid = this.queue.shift();

        if(typeof tid == 'number') {
            this.runTask(tid);
        }else {
            this.runTask(tid.id, tid.data);
        }

        this.queue.length && this.runByQueue();
    },

    /**
    * 开始执行任务
    * @param {Array} queue（可选参数）一个任务队列
    */
    start: function(queue) {
        if(this.hasStart) {
            return;
        }

        this.hasStart = true;

        var _this = this;

        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', function (text) {
            text = text.replace(/\s*/g,'');

            emitter.emit('receive_data', _this.curTask, text);
        });

        emitter.on('receive_data', function(task, text) {
            task.receive(text);
        });

        if(queue) {
            this.queue = queue;
            this.runByQueue();

        }else if(process.argv[2] == '-c'){
            this.runTask(STEP.BEGIN);

        }else {
            this.runTask(STEP.GRUNT_TASK);
        }
    },

    end: function() {
        // log(task_config);
        process.exit();
    }

};

/**
* 任务类
* @return {Object Task}
* @param {Object} opt 任务的配置，会成为任务实例的属性
*   opt.id 任务id
*   opt.type 任务类别 从TASK_TYPE中选择
*   opt.prompt 任务提示文本
*   opt.success type为Y_OR_N特有，回答y时的回调
*   opt.refuse type为Y_OR_N特有，回答n时的回调
*   opt.input type为INPUT特有，用户输入的回调
*   opt.options type为CHOOSE特有，各个选项的值
*   opt.choose type为CHOOSE特有，用户输入的回调
*   opt.when type为CHOOSE特有，用户输入的回调
*   opt.done type为CHOOSE特有，用户输入的回调
*/
var Task = function(opt) {
    this.id = opt.id;
    this.type = opt.type;
    this.prompt = opt.prompt;

    this.config = opt;
};

Task.prototype = {
    /**
    * 监听到用户的输入行为，然后分钟处理
    * @param {Object} data 一般是用户输入的数据
    */
    receive: function(data) {
        switch(this.type) {
            case TASK_TYPE.Y_OR_N: {

                data = data.toUpperCase();

                if(data == 'Y') {
                    this.config.accept.call(this, taskManager);
                }else if(data == 'N') {
                    this.config.refuse.call(this, taskManager);
                }else {
                    log('别卖萌了', LOG.FUN);
                    this.begin();
                }

                break;
            }

            case TASK_TYPE.INPUT: {
                this.config.input.call(this, taskManager, data);
                break;
            }

            case TASK_TYPE.CHOOSE: {
                this.config.choose.call(this, taskManager, this.config.options[data-1]);
                break;
            }

            case TASK_TYPE.DEFERRED: {
                var eid = 'deferred_event_'+Date.now();

                emitter.on(eid, this.config.done);
                this.config.when.call(this, taskManager, eid);
                break;
            }
        }
    },

    /**
    * 任务开始
    */
    begin: function(data) {
        if(this.prompt) {
            log('\n'+this.prompt, LOG.EM);
        }else {
            process.stdin.emit('data', EMPTY_DATA);
        }

        if(this.config.tips) {
            log('tips: '+this.config.tips, LOG.TIPS);
        }
    }
}


/**
* 项目构建对象
*/
var project = {
    //中间产物，自生自灭
    outputFileName: 'feteam.tar.gz',

    /**
    * https远程请求一个文件
    * @param {Any} tag 用来标记这一次请求
    * @param {Object} options 请求的配置
    *   options.host 主机IP
    *   options.port 端口
    *   options.path 文件URI
    *   options.method 请求方法
    *   options.headers 请求头设置
    * @param {Function} callback 请求的回调
    */
    request:function(tag,options,callback){

        var req = https.request(options, function(res){

            var file = fs.createWriteStream(project.outputFileName);
            
            res.on('data', function(data) {
                file.write(data);
            });
            
            res.on('end', function() {
                file.end();
                callback(tag, 0, res);
            });
        });
        
        req.on('error', function(err){
            log(err, LOG.ERROR);
            callback(tag, 1);
        });
        
        req.end(options.body);
    },

    /**
    * https远程请求一个文件
    * @param {String} version 项目包版本号
    * @param {Function} callback 传递给buildPro
    */
    getProFiles: function(version, callback) {
        var _this = this;

        var user = {
            email:'yikehao',
            password:'yikehao'
        };

        this.request(user,{
            host: '172.19.108.138',
            port: 8443,
            path: '/svn/feteam/feteam-build/'+task_config.proType+'/'+version+'.tar.gz',
            method: 'GET',
            headers:{
                'Content-Type':'text/xml',
                'Authorization':'Basic '+new Buffer(user.email+':'+user.password).toString('base64')
            }
        }, function(tag, code, res) {
            if(code == 0) {
                _this.buildPro(callback);
            }else {
                log('\n获取项目包失败', LOG.WARN);
                taskManager.end();
            }
        });
    },

    /**
    * 构建项目，其实只是解压
    * @param {Function} callback 任务的回调 
    */
    buildPro: function(callback) {
        log('\n开始构建项目...', LOG.GOOD);

        exec('tar -zxvf '+project.outputFileName, function (error, stdout, stderr) {
            log(stdout, LOG.TIPS);

            if(stderr) {
                log('stderr: ' + stderr, LOG.ERROR);
            }

            fs.unlinkSync('./'+project.outputFileName);

            callback && callback();
        });
        
    },

    /**
    * 创建配置文件
    * @param {Function} callback 任务的回调 
    */
    createConfigFiles: function(callback) {
        var node_path = path.normalize(path.join(task_config.nodePath, 'node_modules'));
        var grunt_path = path.normalize(path.join(node_path, 'grunt'));
        var cmd_path = path.normalize(path.join(task_config.nodePath, 'grunt.cmd'));

        var shell_content = '#!/bin/bash\n grunt server:$1 --base="' + grunt_path + '" --nodepath="' + node_path + '" --port=$2';
        var shell_content_win = '@echo off\n set /p t=grunt task name:\n set /p p=server port:\n call "' + cmd_path + '" server:%t% --base="' + grunt_path + '" --nodepath="' + node_path + '" --port=%p%\n pause';

        try {
            task_config.nodePath = node_path;

            fs.writeFileSync('./config.json', JSON.stringify(task_config));
            fs.writeFileSync('./grunt.sh', shell_content);
            fs.writeFileSync('./grunt.bat', shell_content_win);
        }catch(err) {
            throw err;
        }

        callback && callback();
    }
};


taskManager
//开始构建
.register(STEP.BEGIN, {
    type: TASK_TYPE.Y_OR_N,
    prompt: '是否构建项目？(Y/N)',
    tips: 'Y进入构建步骤，N跳过构建，直接跑grunt任务',
    accept: function(manager) {
        task_config.create = true;
        manager.runTask(STEP.CONFIG);
    },
    refuse: function(manager) {
        task_config.create = false;
        manager.runTask(STEP.GRUNT_TASK);
    }
})
//指定config.json
.register(STEP.CONFIG, {
    type: TASK_TYPE.INPUT,
    prompt: '请输入config.json路径:',
    tips: '不指定则直接回车，默认为项目路径',
    input: function(manager, data) {
        
        if(data) {
            task_config = require(data);            
            manager.runTask(STEP.CREATE);
        }else {
            manager.runTask(STEP.PRO_TYPE);
        }
    }
})
//指定项目类型
.register(STEP.PRO_TYPE, {
    type: TASK_TYPE.CHOOSE,
    prompt: '请指定创建的任务类型：\n 1. multi\n 2. single\n 3. subject',
    options: ['multi', 'single', 'subject'],
    choose: function(manager, data) {
        task_config.proType = data;
        manager.runTask(STEP.NODE_PATH);
    }
})
//指定node_module
.register(STEP.NODE_PATH, {
    type: TASK_TYPE.INPUT,
    prompt: '请输入node_modules路径:',
    tips: '指定到node_modules的父目录，例如 d:/nodejs/',
    input: function(manager, data) {
        task_config.nodePath = data;
        manager.runTask(STEP.PORT);
    }
})
//指定端口号
.register(STEP.PORT, {
    type: TASK_TYPE.INPUT,
    prompt: '请输入默认端口号:',
    input: function(manager, data) {
        task_config.port = data;
        manager.runTask(STEP.CREATE);
    }
})
//构建项目
.register(STEP.CREATE, {
    type: TASK_TYPE.DEFERRED,
    when: function(manager, event) {
        log('\n正在获取项目包...', LOG.GOOD);

        // var version = PACKAGE_VERSION[task_config.proType.toUpperCase()];
        var version = 'main';

        project.getProFiles(version, function(){
            emitter.emit(event, manager);
        });
        
    },
    done: function(manager) {
        manager.runTask(STEP.SCRIPT);
    }
})
//生成脚本和配置文件
.register(STEP.SCRIPT, {
    type: TASK_TYPE.DEFERRED,
    when: function(manager, event) {
        log('\n正在生成脚本和配置文件...', LOG.GOOD);

        project.createConfigFiles(function() {
            emitter.emit(event, manager);
        });
    },
    done: function(manager) {
        log('\n脚本和配置文件创建成功', LOG.GOOD);
        log('\n恭喜！项目构建完成!!', LOG.WARN);
        manager.runTask(STEP.GRUNT_TASK);
    }
})
//运行grunt任务分支
.register(STEP.GRUNT_TASK, {
    type: TASK_TYPE.CHOOSE,
    prompt: '请指定要执行的任务分支：\n1. dev\n2. production\n3. output for dev\n4. debug for production',
    tips: '分支1是开发任务，不会产生output目录；分支2是发布任务；分支3是输出output来调试用，无combo无压缩；分支4相当于分支2的无压缩版',
    options: ['dev', 'production', 'output', 'production:debug'],
    choose: function(manager, data) {

        if(!task_config.create) {
            task_config = require('./config.json');
        }

        if(!task_config) {
            log('\n找不到配置文件，需要重新构建', LOG.WARN);
            manager.end();

        }else {

            var cli = require(path.join(task_config.nodePath,'grunt')).cli;
            cli.tasks = ['server:'+data];
            cli();
        }
    }
})
;

taskManager.start();


(function (factory) {
    if (typeof define === 'function') {
        // AMD
        define(function (require, exports, module) {
            if (!window.jQuery) {
                //window.jQuery = require('jquery');
            }
            module.exports = factory(window.jQuery);
        });
    } else if (typeof exports === 'object') {
        // CommonJS
        return factory(require('jquery'));
    } else {
        // Browser globals
        window["region"] = factory(window.jQuery);
    }
}(function ($) {
    //your code
    function myScrollCSS(){
        var b,a='.myscroll_track{display:none;height:100%;position:absolute;top:0;width:10px;background-color:#000;right:0;overflow:hidden}.myscroll_bar{position:absolute;top:0;left:1px;cursor:pointer;background-color:#ddd;overflow:hidden;width:8px;display:none}';
        document.createStyleSheet ? (b = document.createStyleSheet(), b.cssText = a) : (b = document.createElement("style"), b.type = "text/css", b.appendChild(document.createTextNode(a)), document.head.appendChild(b));
    }
    myScrollCSS();

    //计算滑块的高度、位置
    function computeBarHeightAndPostion($this){
        var $this = $($this);
        var thisH = $this.height();
        var thisScrollObj = $this.find(".myscroll");
        var thisScrollObjH = thisScrollObj.outerHeight();
        var thisTraceObj = $this.find(".myscroll_track");
        var thisTraceObjH = thisTraceObj.height();
        var thisBarObj = $this.find(".myscroll_bar");
        //是否显示轨道
        if(!$this.data("trackAlwaysShow")){
            thisScrollObjH>thisH ? (thisTraceObj.show()) : thisTraceObj.hide();
        }
        //计算滑块高度
        if(thisH<thisScrollObjH){
            thisBarObj.height(Math.floor(thisH/thisScrollObjH*thisTraceObjH)).show();
        }
        else{
            thisBarObj.height(thisTraceObjH);
        }
    }
    //设置滑块的位置
    function limitBarTop(barObj,topNum){
        if(barObj.data("dis")!="true"){
            var newNum = topNum;
            var thisTrackObj = barObj.parent();
            var trackH = thisTrackObj.height();
            var barH = barObj.height();
            var thisScrollObj = thisTrackObj.prev();
            var $this = thisScrollObj.parent();
            var scaleNum = trackH/barH;
            var scaleNum = thisScrollObj.height()/$this.height();
            var thisScrollObjT;
            //如果滑块默认位于底部
            if(barObj.data("pos")=="srolltobottom"){
                newNum = trackH-barH;
            }
            else if(topNum<=0){
                newNum = 0;
                barObj.data("pos",0);
            }
            else{
                if(topNum>=trackH-barH){
                    newNum = trackH-barH;
                    barObj.data("pos","srolltobottom");
                }
                else{
                    barObj.data("pos",0);
                }
            }
            barObj.css({"top":newNum});

            //根据滑块的top移动内容
            if(newNum>0){
                thisScrollObjT = newNum*scaleNum;
                thisScrollObj.css({"margin-top":-thisScrollObjT});
                // if(thisScrollObjT>=thisScrollObj.height()-$this.height()-1){
                //     thisScrollObj.css({"margin-top":-(thisScrollObj.height()-$this.height())});
                // }
            }
            else{
                thisScrollObj.css({"margin-top":"0"});
            }


        }
    }
    //鼠标松开时，可以鼠标拖选文本
    $(document).on("mouseup",function(){
        $(this).data("msdown","false");
        try{
            $("html").removeAttr("onselectstart").css("-moz-user-select", "auto");
            document.body.onselectstart = document.body.ondrag = function(){
                return true;
            }
        }catch(e){}
    });
    $(document).on("mousemove",function(e){
        if($(this).data("msdown")=="true"){
            var thisBarObj = $(".thisscroll").parent().find(".myscroll_bar");
            var thisBarObjT = thisBarObj.data("top");
            var thisBarObjClickPos = thisBarObj.data("click_pos");
            var thisBarObjNewT = e.pageY - thisBarObjClickPos+thisBarObjT;
            thisBarObj.data("pos",0);
            if(thisBarObj.data("dis")!="true"){
                limitBarTop(thisBarObj,thisBarObjNewT);
            }
        }
    });
    $.fn.myScroll = function (options) {
        var defaults = {
            "barPosition": "top",
            //"autoRefresh": true,
            "trackAlwaysShow":false
        };
        var jsonParam = $.extend(defaults, options);

        return this.each(function () {
            var $this = $(this);
            $this.data("barPosition",jsonParam.barPosition);
            //$this.data("autoRefresh",jsonParam.autoRefresh);
            $this.data("trackAlwaysShow",jsonParam.trackAlwaysShow);
            if($this.data("myScroll")!="true"){
                $this.data("myScroll","true");
                //给欲滚动的对象加上类名thiswheel
                $this.on("mousemove",function(){
                    $(".thiswheel").removeClass("thiswheel");
                    $this.addClass("thiswheel");
                });
                //给对象内部包裹一个div
                $this.css({"overflow":"hidden","position":"relative"}).wrapInner('<div class="myscroll"></div>');
                //添加轨道和滑块
                $this.append('<div class="myscroll_track"><div class="myscroll_bar" data-dis="false"><i id="myscroll_bar_top"></i><i class="myscroll_bar_bd"></i><i class="myscroll_bar_bot"></i></div></div>');
                var thisScrollObj = $this.find(".myscroll");
                var thisScrollTrackObj = $this.find(".myscroll_track");
                var thisScrollBarObj = $this.find(".myscroll_bar");
                //滑块是否默认位于底部
                if(jsonParam.barPosition=="bottom"){
                    thisScrollBarObj.data("pos","srolltobottom");
                }
                //是否强制显示轨道
                if(jsonParam.trackAlwaysShow){
                    thisScrollTrackObj.show();
                }
                //计算滑块的高度、位置
                computeBarHeightAndPostion($this);
                limitBarTop(thisScrollBarObj,0);

                //滑块按下事件，页面不能鼠标拖选文本
                thisScrollBarObj.on("mousedown",function(e){
                    $(document).data("msdown","true");
                    thisScrollBarObj.data("click_pos",e.pageY);
                    thisScrollBarObj.data("top",parseFloat(thisScrollBarObj.css("top")));
                    $(".myscroll").removeClass("thisscroll");
                    thisScrollObj.addClass("thisscroll");
                    try{
                        $("html").attr("onselectstart", "return false").css("-moz-user-select", "none");
                        document.body.onselectstart = document.body.ondrag = function(){
                                return false;
                        };
                    }catch(e){}
                });
                //绑定鼠标滚轮事件
                if ($this[0].addEventListener){
                    $this[0].addEventListener('DOMMouseScroll', wheel, true);
                }
                $this[0].onmousewheel = wheel;
            }

            //滚轮
            function wheel(e) {
                var msT = $(".thiswheel>.myscroll_track").filter(":visible");
                var msTh = msT.outerHeight(true);
                var msb = $(".thiswheel>.myscroll_track>.myscroll_bar");
                var msbH = parseFloat(msb.outerHeight(true));
                var wheelScale = msbH/msTh;
                var barT = parseFloat(msb.css("top"));
                var evt = e || window.event;
                var wheelDelta = evt.wheelDelta || evt.detail;
                if(msb.data("dis")!="true"){
                    if (wheelDelta == -120 || wheelDelta == 3) {
                        barT += 120*wheelScale;
                    } else if (wheelDelta == 120 || wheelDelta == -3) {
                        barT -= 120*wheelScale;
                    }
                    msb.data("pos",0);
                    limitBarTop(msb,barT);
                }
                if(barT>0 && barT<msTh-msbH){
                    return false;
                }
            }
        });
    }
    //刷新滚动条各项
    $.fn.refreshMyScroll = function(){
        return this.each(function(){
            var $this = $(this);
            var thisBar = $this.find(".myscroll_bar");
            computeBarHeightAndPostion($this);
            if(thisBar.data("pos")=="srolltobottom" && thisBar.data("dis")!="true"){
                limitBarTop(thisBar,thisBar.css("top"));
            }
        });
    }
    //禁止滚动内容
    $.fn.disMyScroll = function(){
        return this.each(function(){
            var $this = $(this);
            var thisBar = $this.find(".myscroll_bar");
            thisBar.data("dis","true");
        });
    }
    //允许滚动内容
    $.fn.enMyScroll = function(){
        return this.each(function(){
            var $this = $(this);
            var thisBar = $this.find(".myscroll_bar");
            thisBar.data("dis","false");
        });
    }
    //清空滚动条
    $.fn.restMyscroll = function(){
        return this.each(function(){
            var $this = $(this);
            var thisBar = $this.find(".myscroll_bar");
            var thisTrack = $this.find(".myscroll_track");
            var thisObj = $this.find(".myscroll");
            thisObj.css({"margin-top":"0"});
            thisBar.css({"top":"0","height":thisTrack.height()});
            computeBarHeightAndPostion($this);
            limitBarTop(thisBar,thisBar.css("top"));
        });
    }

}));
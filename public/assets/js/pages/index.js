define(function(require, exports, module) {

    var config = require('../config');
    require("../lib/myScroll");
    
    
    
    $(function(){
        var ii=0;
        $(".null").myScroll({"trackAlwaysShow":true});
        $(".null").on("click",function(){
            $(this).find(".nn").append('<p>add'+ii+'</p>');
            $(this).refreshMyScroll();
            ii++
        });
        $("#p").myScroll();
        $("#p").click(function(){
            $("#p .pp").append('<p>add'+ii+'</p>');
            ii++;
            $("#p").refreshMyScroll();
            if(ii==20){
                $("#p .pp").html("");
                $("#p").restMyscroll();
                ii=0;
            }
        });
        $("#s").myScroll({
            "barPosition":"bottom"
        });
        
        $("#s").on("click",function(){
            $(this).find(".ss").append('<p>add'+ii+'</p>');
            $(this).refreshMyScroll();
            ii++
        });
        
        $(".dis").click(function(){
            $(this).prev().disMyScroll();
        });
        $(".dis").dblclick(function(){
            $(this).prev().enMyScroll();
        });
    });

            
});
seajs.use('pages/index');

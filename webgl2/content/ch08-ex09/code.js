document.getElementById("webgl-canvas").onmousedown = handleMouseDown;
document.onmouseup = handleMouseUp;
document.onmousemove = handleMouseMove;
var canvas = document.getElementById("webgl-canvas");
if (canvas.addEventListener) {
   canvas.addEventListener("mousewheel", MouseScroll, false);
   canvas.addEventListener("DOMMouseScroll", MouseScroll, false);
} else {
   if (canvas.attachEvent) {
       canvas.attachEvent("onmousewheel", MouseScroll);
   }
}
function MouseScroll(event) {
   var rolled = 0;
   if ('wheelDelta' in event) {
       rolled = event.wheelDelta;
   } else {
       rolled = event.detail;
   }
   distance += -rolled / 10;
}
window.onkeydown = checkKey;
var delta = 5;
function checkKey(ev) {
   switch (ev.keyCode) {
       case 49:
       case 107:
           makeRandomTree();
           break;
       case 173:
       case 109:
       case 189:
           if (forest.length > 0) {
               delete forest[forest.length - 1];
               forest.splice(forest.length - 1, forest.length);
               updateTreeCounterDisplay();
           }
           break;
       default:
           console.log(ev.keyCode);
           break;
   }
}

/*******************************************************************************
 Mouse motion handling
 *******************************************************************************/
let webGLCanvas = document.getElementById('webgl-canvas');
webGLCanvas.onmousemove = handleMouseMove;
webGLCanvas.onmousedown = handleMouseDown;
webGLCanvas.onmouseup = handleMouseUp;
webGLCanvas.onmousewheel = handleMouseWheel;


// this variable will tell if the mouse is being moved while pressing the button
let rotY = 0; //rotation on the Y-axis (in degrees)
let rotX = 0; //rotation on the X-axis (in degrees)
let dragging = false;
let oldMousePos = {x: 0, y: 0};
let mousePos;
let rotSpeed = 1.0; //rotation speed
let mouseButton;

function handleMouseWheel(event) {
    let wheel = event.wheelDelta / 120;//n or -n
    zoom += wheel / 2;
}


function handleMouseMove(event) {
    event = event || window.event; // IE-ism
    mousePos = {
        x: event.clientX,
        y: event.clientY
    };
    if (dragging) {
        let dX = mousePos.x - oldMousePos.x;
        let dY = mousePos.y - oldMousePos.y;
        //console.log((mousePos.x - oldMousePos.x) + ", " + (mousePos.y - oldMousePos.y)); //--- DEBUG LINE ---
        rotY += dX > 0 ? rotSpeed : dX < 0 ? -rotSpeed : 0;
        rotX += dY > 0 ? rotSpeed : dY < 0 ? -rotSpeed : 0;
        oldMousePos = mousePos;
    }
}

function handleMouseDown(event) {
    dragging = true;
    mouseButton = event.button;
    oldMousePos.x = oldMousePos.y = 0;
}

function handleMouseUp(event) {
    dragging = false;
}

// in the next function 'currentRy' is usefull for the exercice 8-9
let currentRy = 0; //keeps the current rotation on y, used to keep the billboards orientation

function rotateModelViewMatrixUsingQuaternion(stop) {

    stop = typeof stop !== 'undefined' ? stop : false;

    //use quaternion rotations for the rotation of the object with the mouse
    let rx = degToRad(rotX);
    let ry = degToRad(rotY);

    let rotXQuat = quat.create();
    quat.setAxisAngle(rotXQuat, [1, 0, 0], rx);

    let rotYQuat = quat.create();
    quat.setAxisAngle(rotYQuat, [0, 1, 0], ry);

    let myQuaternion = quat.create();
    quat.multiply(myQuaternion, rotYQuat, rotXQuat);

    let rotationMatrix = mat4.create();
    mat4.identity(rotationMatrix);
    mat4.fromQuat(rotationMatrix, myQuaternion);
    mat4.multiply(mvMatrix, rotationMatrix, mvMatrix);
    //reset rotation values, otherwise rotation accumulates
    if (stop) {
        rotX = 0.;
        rotY = 0.;
    }
}

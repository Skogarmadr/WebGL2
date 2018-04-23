/**
* @file ch08 - ex09
* @author Luca Srdjenovic
* @description Making a small forest
*/

/* ***************************************** *\
  Declaration of the vertex shader
\ *****************************************  */
var vertexShaderSource = `#version 300 es
precision highp float;
precision highp int;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;
uniform vec3 uLightPosition; // u_lightWorldPosition

in vec3 pos;
in vec2 textureCoord;
in vec3 normal;

out vec2 vTextureCoord;
out vec3 vNormal;
out vec3 vLightRay;
out vec3 vEyeVec;

void main()
{
  // Pass the texcoord to the fragment shader.
	vTextureCoord = textureCoord;

  vec4 vertex = uMVMatrix * vec4(pos, 1.0);

  vNormal = vec3(uNMatrix * vec4(normal, 1.0));

  vec4 light = vec4(uLightPosition, 1.0);
  vLightRay = vertex.xyz - light.xyz;
  vEyeVec = -vec3(vertex.xyz);
	gl_Position = uPMatrix * vertex;
}
`;

/* ***************************************** *\
		Declaration of the fragment shader
\ *****************************************  */
var fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

// the final color (gl_FragColor)
out vec4 outColor;

//The texture
uniform sampler2D uColorTexture;

uniform float uShininess;
uniform vec3 uLightAmbient;
uniform vec3 uMaterialDiffuse;
uniform vec3 uMaterialSpecular;

//Passed in from the vertex-shader
in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vLightRay; //surface light
in vec3 vEyeVec;

void main()
{
	vec3 L = normalize(vLightRay);
  vec3 N = normalize(vNormal);
  float lambertTerm = dot(N, -L);
  vec2 mapCoord = vec2(vTextureCoord.s, vTextureCoord.t);
  vec4 texelColor = texture(uColorTexture, mapCoord);

  float alpha = 1.0;
  if (texelColor[0]==(254.0/255.0) && texelColor[1]==(121.0/255.0) && texelColor[2]==(243.0/255.0))
  {
    alpha = 0.0;
    discard;
  }
  vec3 finalColor = uLightAmbient;
  if (lambertTerm > 0.0)
  {
    finalColor += uMaterialDiffuse * lambertTerm * 0.1;
    vec3 E = normalize(vEyeVec);
    vec3 R = reflect(L, N);
    float specular = 0.0;
    finalColor += uMaterialDiffuse * specular * 0.5;
  }
  finalColor = texelColor.xyz * finalColor;
  outColor = vec4(finalColor, alpha);
}
`;

/* ***************************************** *\
	Definition of global variables
\ *****************************************  */
/**
* Initialization
*/
var glContext = null; //glContext global variable to access webgl functionnalities
var program = null; //program is the shader program where the two shaders are compiled
var vertexArray = null; //vertexArray is a variable used to communicate the vertex

var vertexPositionLocation = -1; //Location of the vertex position within the shader
var vertexPositionBuffer = null; //Buffer that will contain the position vertex

var vertexCoordLocation = -1; //Location of the coordination coordinate within the shader
var vertexCoordBuffer = null; //Buffer that will contain the coordinate  vertex

var vertexTextCoordsLocation = -1; //Location of the texture  coordinate within the shader
var vertexTextCoordsBuffer = null; //Buffer that will contain the coordinate  vertex

var vertexNormalLocation = -1; //Location of the texture  coordinate within the shader
var vertexNormalBuffer = null; //Buffer that will contain the coordinate  vertex



var indexBuffer = null; //Buffer that will contain the indexes
var indexLength = -1; //Size of the indexes for the current

//Matrix
var pMatrix = null; //mat4 for the projection matrix
var mvMatrix = null; //mat4 for the model view matrix
var nMatrix = null; //mat4 for the normal matrix

var PMatrixLocation = null; //Reference to the PMatrix Location within the shader
var MVMatrixLocation = null; //Reference to the MVMatrix Location within the shader
var NMatrixLocation = null; //Reference to the NMatrix Location with the shader

//Texture
var texture = null;
var textureLocation = null;

//Lights
var LightPositionLocation = null; // reference to the light
var ShininessLocation = null;// reference to the shininess
var LightAmbientLocation = null;// reference to the lightAmbient
var materialDiffuseLocation = null;// reference to the materialDiffuse
var materialSpecularLocation = null;// reference to the materialSpecular

//Draw instance
var instanceCount = 4;
var ext = null;

//Inputs
var currentTexID = 1;
const maxSample = 5;
var texColorTab = new Array(); //textures
var rotObject = 0;
var indices = [];
var vertices = [];
var textCoords = [];
var normals = [];
var forest = new Array();
var textures = new Array();
var canva = document.getElementById("webgl-canvas");
var c_width = canva.width;
var c_height = canva.height;

var leftMouseDown = false;
var rightMouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var moveXInWorld = 0;
var moveYInWorld = 0;
var lastRightMouseX = 0;
var lastRightMouseY = 0;
var distance = 0;
var nbSteps = 4;
var rotationMatrix = mat4.create();
mat4.identity(rotationMatrix);


/* ***************************************** *\
						Application functions
\ *****************************************  */
/**
* Initializes the WebGL context, allowing to run a webgl 2 program
*/
function initWebGLContext() {
   //Selection of the canvas through the DOM
   var canvas = document.getElementById("webgl-canvas");

   //If it can't be found, throw an exception
   if (canvas == "undefined") {
       throw "Can't find webgl-canvas";
   }
   //Gets a webgl 2 context
   glContext = canvas.getContext("webgl2", {antialias: false});
   ext = glContext.getExtension("ANGLE_instanced_arrays"); // Vendor prefixes may apply!

   //If it does not support WebGL2, throw an exception
   var isWebGL2 = glContext != null;
   if (!isWebGL2) {
       throw 'WebGL 2 is not available with your current browser. See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to get a WebGL 2 implementation</a>';
   }
}

/**
* Initializes the program and with that, compiles the shaders
*/
function initProgram() {
 //Initialization of the shader program and activation of the programme
 program = createProgram(glContext, vertexShaderSource, fragmentShaderSource);

 //Tell the WebGL context to use this program
 glContext.useProgram(program);
}

/**
* Destructor of the program. Unused in this case buy always prepare a way to destroy your objects
*/
function destroy() {
   glContext.deleteBuffer(vertexPositionBuffer);
   glContext.deleteBuffer(vertexTextCoordsBuffer);
   glContext.deleteProgram(program);
   glContext.deleteVertexArray(vertexArray);
}

/**
* Defines all the links with the shaders parameters
*/
function initShaderParameters() {
   //Definition of the location 0 as the entry for the position vertex
   vertexPositionLocation = glContext.getUniformLocation(program, "pos");

   //Definition of the location 1 as the entry for the texcoord vertex
   vertexTextcoordLocation = glContext.getUniformLocation(program, "textureCoord");

   vertexNormalLocation = glContext.getUniformLocation(program, "normal");

   //Retriving the location of the PMatrix in the current program
   PMatrixLocation = glContext.getUniformLocation(program, "uPMatrix");

   //Retriving the location of the MVMatrix in the current program
   MVMatrixLocation = glContext.getUniformLocation(program, "uMVMatrix");

   //Retriving the location of the NMatrix in the current program
   NMatrixLocation = glContext.getUniformLocation(program, "uNMatrix");

   //Retriving the location of the lightPosition in the current program
   LightPositionLocation = glContext.getUniformLocation(program, "uLightPosition");

   //Retriving the location of the shininess in the current program
   ShininessLocation = glContext.getUniformLocation(program, "uShininess");

   //Retriving the location of the lightambient in the current program
   LightAmbientLocation = glContext.getUniformLocation(program, "uLightAmbient");

   //Retriving the location of the materialDiffuse in the current program
   materialDiffuseLocation = glContext.getUniformLocation(program, "uMaterialDiffuse");

   //Retriving the location of the materialSpecular in the current program
   materialSpecularLocation = glContext.getUniformLocation(program, "uMaterialSpecular");

   //Retriving the location of the texture in the current program
   vertexTextCoordsLocation = glContext.getUniformLocation(program, "uColorTexture");
}

/**
* Init the buffers and values for the code
*/
function initBuffers() {
   //Creation of the vertexArray we will use to transfer the position and color buffers
   vertexArray = glContext.createVertexArray();

   //Binding the vertexArray as the current vertex array
   glContext.bindVertexArray(vertexArray);


   //Enabling the position location to be used to transfer vertex arrays
   glContext.enableVertexAttribArray(vertexPositionLocation);

   //Vertices of positions
   vertices = new Float32Array([
       -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
       -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0
   ]);

   //Creation of the buffer to store the vertices in
   vertexPositionBuffer = glContext.createBuffer();

   //Binding it to the ARRAY_BUFFER slot
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);

   //Transfer the vertice data to the buffer
   glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);

   //Send the vertexPositionBuffer to the vertex pos location,
   //with 3 values per point, as float, without spaces between the data and without offset
   glContext.vertexAttribPointer(
       vertexPositionLocation,
       3,
       glContext.FLOAT,
       false,
       0,
       0
   );
   //Reset ARRAY_BUFFER
   glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

   //normals
   normals = new Float32Array([
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0
   ]);

   vertexNormalBuffer = glContext.createBuffer();
   //Binding it to the ARRAY_BUFFER slot
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexNormalBuffer);

   //Transfer the vertice data to the buffer
   glContext.bufferData(glContext.ARRAY_BUFFER, normals, glContext.STATIC_DRAW);

   //Send the vertexPositionBuffer to the vertex pos location,
   //with 3 values per point, as float, without spaces between the data and without offset
   glContext.vertexAttribPointer(
       vertexNormalLocation,
       3,
       glContext.FLOAT,
       false,
       0,
       0
   );

   //Reset ARRAY_BUFFER
   glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

   //Texture
   var textCoords = new Float32Array([
       0.0, 0.0,
       2.0, 0.0,
       0.0, 2.0,
       2.0, 2.0
   ]);

   //Creation of the buffer to store the textcoords in
   vertexTextCoordsBuffer = glContext.createBuffer();

   //Binding it to the ARRAY_BUFFER slot
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexTextCoordsBuffer);

   //Transfer the color data to the buffer
   glContext.bufferData(glContext.ARRAY_BUFFER, textCoords, glContext.STATIC_DRAW);

   //Send the vertexColorBuffer to the vectex color location,
   //with 2 values per point, as float, without space between the data and without offset
   glContext.vertexAttribPointer(
       vertexTextCoordsLocation,
       2,
       glContext.FLOAT,
       false,
       0,
       0
   );
		//Reset ARRAY_BUFFER
	  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

		//Declaration of the indexes
	  indices = new Uint16Array([0, 1, 2]);

 	//We must keep the index count of our element array buffer
	  indexLength = indices.length;

		//We create the index buffer
	  indexBuffer = glContext.createBuffer();

		//We bind the index buffer to the element_array_buffer slot
	  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);

		//We transfer the index data to the index buffer
	  glContext.bufferData(
	    glContext.ELEMENT_ARRAY_BUFFER,
	    indices,
	    glContext.STATIC_DRAW
	  );

		/* Notice that we don't remove the ELEMENT_ARRAY_BUFFER attribution before unsetting the vertexarray */

	  //Reset the selected vertex Array
	  glContext.bindVertexArray(null);
}

function verticesRotY(vertices, alpha) {
    var rotVertices = [vertices.length];
    for (var i = 0; i < vertices.length; i += 3)
    {
        var xyz = [vertices[i], vertices[i + 1], vertices[i + 2]];
        rotVertices[i] = xyz[0] * Math.cos(alpha) - xyz[2] * Math.sin(alpha);
        rotVertices[i + 1] = xyz[1];
        rotVertices[i + 2] = xyz[2] * Math.cos(alpha) - xyz[0] * Math.sin(alpha);
    }
    return rotVertices;
}
function verticesRotX(vertices, alpha) {
    var rotVertices = [vertices.length];
    for (var i = 0; i < vertices.length; i += 3)
    {
        var xyz = [vertices[i], vertices[i + 1], vertices[i + 2]];
        rotVertices[i] = xyz[0];
        rotVertices[i + 1] = xyz[1] * Math.cos(alpha);
        rotVertices[i + 2] = xyz[2] * Math.cos(alpha) - xyz[1] * Math.sin(alpha);
    }
    return rotVertices;
}

function verticesTranslation(vertices, x, y, z) {
    var rotVertices = [vertices.length];
    for (var i = 0; i < vertices.length; i += 3)
    {
        var xyz = [vertices[i], vertices[i + 1], vertices[i + 2]];
        rotVertices[i] = xyz[0] + x;
        rotVertices[i + 1] = xyz[1] + y;
        rotVertices[i + 2] = xyz[2] + z;
    }
    return rotVertices;
}
/**
* Handling mouse event
*/
function handleMouseDown(event) {
    if (event.which == 3 || event.button == 2) {
        lastRightMouseX = event.clientX;
        lastRightMouseY = event.clientY;
        rightMouseDown = true;
    } else {
        if (event.which == 1 || event.button == 0) {
            lastMouseX = event.clientX;
            lastMouseY = event.clientY
            leftMouseDown = true;
        }
    }
}
function handleMouseUp(event) {
    if (event.which == 3 || event.button == 2) {
        rightMouseDown = false;
    } else {
        if (event.which == 1 || event.button == 0) {
            leftMouseDown = false;
        }
    }
}
function handleMouseMove(event) {
    var newX = event.clientX;
    var newY = event.clientY;
    if (rightMouseDown) {
        var deltaX = newX - lastRightMouseX;
        var deltaY = newY - lastRightMouseY;
        moveXInWorld += deltaX / 100;
        moveYInWorld -= deltaY / 100;
        lastRightMouseX = newX;
        lastRightMouseY = newY;
    }
    if (leftMouseDown) {
        var newRotationMatrix = mat4.create();
        mat4.identity(newRotationMatrix);
        var deltaX = newX - lastMouseX;
        mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaX / 5), [0, 1, 0]);
        var deltaY = newY - lastMouseY;
        mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaY / 5), [1, 0, 0]);
        mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);
        lastMouseX = newX
        lastMouseY = newY;
    }
}
/**
* Defines all the links for the lightsparameters
*/
function initLights() {
    //Set the light position
    glContext.uniform3f(LightPositionLocation, 1.0, 1.0, 1.0);
    //Set the ambient light
    glContext.uniform3f(LightAmbientLocation, 0.5, 0.5, 0.5);
    //Set the diffuse color
    glContext.uniform3f(materialDiffuseLocation, 0.6, 0.6, 0.6);
    //Set the specular color
    glContext.uniform3f(materialSpecularLocation, 0.3, 0.3, 0.3);
    //Set the shininess
    glContext.uniform1f(ShininessLocation, 1.0);
}

/**
* Bind texture with image
*/
function initTextureWithImage(sFilename, texturen) {
    var anz = texturen.length;
    texturen[anz] = glContext.createTexture();

    texturen[anz].image = new Image();
    texturen[anz].image.onload = function() {
        glContext.bindTexture(glContext.TEXTURE_2D, texturen[anz]);
        glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, true);
        glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, texturen[anz].image);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);

        glContext.generateMipmap(glContext.TEXTURE_2D);

        glContext.bindTexture(glContext.TEXTURE_2D, null);
    }

    texturen[anz].image.src = sFilename;

    // let's use a canvas to make textures, with by default a random color (red, green, blue)
    function rnd() {
        return Math.floor(Math.random() * 256);
    }

    var c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    var ctx = c.getContext("2d");
    var red = rnd();
    var green = rnd();
    var blue = rnd();
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";

    ctx.fillRect(0, 0, 64, 64);

    glContext.bindTexture(glContext.TEXTURE_2D, texturen[anz]);
    glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, c);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
}

/**
* Iniatilization of the texture
*/
function initTexture()
{
  for(var i = 0; i < maxSample; i++)
  {
    initTextureWithImage("../ressources/fig/tree/" + i + ".png", texColorTab);
  }
}

function drawATree(tree){


  currentTexID = 0;
  for(var i = -nbSteps / 2; i < nbSteps / 2; i++){
    drawElement(tree.vertexBuffer[i], tree.normalBuffer[i]);
    currentTexID++;
  }
  drawElement(tree.vertexBufferRoots, tree.normalBufferRoots);
  currentTexID = 1;
}

function getArrayBufferWithArray(values) {
    //The following code snippet creates an array buffer and binds the array values to it
    var vBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(values), glContext.STATIC_DRAW);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

    return vBuffer;
}

function calcTree(tree){
    vertices = [-tree[3] / 2, -tree[4] / 2, 0.0, 3.0 * (tree[3] / 2), -tree[4] / 2, 0.0, -tree[3] / 2, 3.0 * (tree[4] / 2), 0.0];
    normals = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0];
    var rotVertices = vertices;
    var rotNormals = normals;
    tree.rotVertices = [];
    tree.rotNormals = [];
    tree.vertexBuffer = [];
    tree.normalBuffer = [];
    for (var i = -nbSteps / 2; i < nbSteps / 2; i++) {
        tree.rotVertices[i] = verticesRotY(vertices, degToRad(i * 180 / nbSteps));
        tree.rotNormals[i] = verticesRotY(normals, degToRad(i * 180 / nbSteps));
        tree.rotVertices[i] = verticesTranslation(tree.rotVertices[i], tree[0], tree[1] + tree[4] / 2, tree[2]);
        tree.vertexBuffer[i] = getArrayBufferWithArray(tree.rotVertices[i]);
        tree.normalBuffer[i] = getArrayBufferWithArray(tree.rotNormals[i]);
    }
    vertices = [-tree[3] / 2, -tree[3] / 2, 0.0, 3.0 * (tree[3] / 2), -tree[3] / 2, 0.0, -tree[3] / 2, 3.0 * (tree[3] / 2), 0.0];
    tree.rotVerticesRoot = verticesRotX(vertices, degToRad(90));
    tree.rotVerticesRoot = verticesTranslation(tree.rotVerticesRoot, tree[0], tree[1], tree[2]);
    tree.rotNormalsRoot = verticesRotX(normals, degToRad(90));
    tree.normalBufferRoots = getArrayBufferWithArray(tree.rotNormalsRoot);
    tree.vertexBufferRoots = getArrayBufferWithArray(tree.rotVerticesRoot);
}
function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}
function getRand(a, b) {
    return Math.floor((Math.random() * (b - a)) + a);
}
function drawElement(vertexBuffer, normalBuffer) {

  //Binding the vertexArray as the current vertex array
  glContext.bindVertexArray(vertexArray);

  glContext.enableVertexAttribArray(vertexPositionLocation);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, normalBuffer);
  glContext.vertexAttribPointer(vertexNormalLocation,3,glContext.FLOAT,false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
  glContext.vertexAttribPointer(vertexPositionLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
  glContext.uniform1i(vertexTextcoordLocation, currentTexID);
  //Draws the triangle. DrawArraysInstanced allows to draw multiple instances
  //glContext.drawArrays(glContext.TRIANGLE_STRIP, 0, indices.length);

  glContext.drawElements(glContext.TRIANGLE_STRIP, indexLength, glContext.UNSIGNED_SHORT, 0);

  //Unbind the vertexArray
  glContext.bindVertexArray(null);

}

/**
* Draws the content with the wanted data
*/
function draw() {
	//Clears the canvas with the clear color
 //glContext.clear(glContext.COLOR_BUFFER_BIT);

 mat4.perspective(pMatrix, degToRad(60), c_width / c_height, 0.1, 1000.0);

 mat4.identity(mvMatrix);
 mat4.rotate(mvMatrix, mvMatrix, rotObject, [0, 1, 0]);
 mat4.translate(mvMatrix, mvMatrix, [moveXInWorld, moveYInWorld, -4.0 + distance]);
 mat4.multiply(mvMatrix, mvMatrix, rotationMatrix);
 mat4.copy(nMatrix, mvMatrix);
 mat4.invert(nMatrix, nMatrix);
 mat4.transpose(nMatrix, nMatrix);
 glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
 glContext.uniformMatrix4fv(MVMatrixLocation, false, mvMatrix);
 mat4.copy(nMatrix, mvMatrix);
 mat4.invert(nMatrix, nMatrix);
 mat4.transpose(nMatrix, nMatrix);
 glContext.uniformMatrix4fv(NMatrixLocation, false, nMatrix);
 initLights();

 for (var i = 0; i < forest.length; i++) {
      drawATree(forest[i]);
 }
 //Request the drawing of the next scene (optional for this sample)
 requestAnimationFrame(draw);
}

/**
* Configuration of the context. This can be used to parameters the rendering options on the canvas
*/
function configureContext() {
	//Configures the color in which the canvas must be cleared
  glContext.enable(glContext.BLEND);
  glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);
  glContext.clearColor(1.0, 1.0, 1.0, 1.0);
  glContext.enable(glContext.DEPTH_TEST);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  glContext.viewport(0.0, 0.0, c_width, c_height);


}

/**
 * Configuration of the scene. This can be used to pass parameters to the shader that will not change in the application lifespan
 */
function configureScene() {
 //Creation of the pMatrix with glMatrix library
 pMatrix = mat4.create();
 //Creation of the mvMatrix with glMatrix library
 mvMatrix = mat4.create();
 //Creation of the nMatrix with glMatrix library
 nMatrix = mat4.create();

 //Setting the values for the constants of pMatrix and mvMatrix and nMatrix



}

function generateForest() {
    for (var i = 0; i < 50; i++) {
        makeRandomTree();
    }
}
function makeRandomTree() {
    var x = getRand(-20, 20);
    var y = 0;
    var z = getRand(-5, 5);
    var w = getRand(1, 3);
    var h = getRand(1, 6);
    var i = forest.length;
    forest[i] = new Array();
    forest[i][0] = x;
    forest[i][1] = y;
    forest[i][2] = z;
    forest[i][3] = w;
    forest[i][4] = h;
    calcTree(forest[i]);
    updateTreeCounterDisplay();
}
function updateTreeCounterDisplay() {
    document.getElementById("treeCount").innerHTML = "Nb trees : " + forest.length;
}
function WriteIDs() {
    document.getElementById("spanIDs").innerHTML = "TextureID: " + currentTexID;
}
function changeTexture() {
    if (currentTexID < maxSample) ++currentTexID;
    else currentTexID = 1;
    WriteIDs();
}

function initWebGL() {
   //We initialize each components in a specific order
   initWebGLContext();
   initProgram();
   initShaderParameters();
   initBuffers();
   initLights();
   initTexture();
   configureContext();
	 configureScene();
   generateForest();
   // set which texture units to render with.
   glContext.uniform1i(vertexTextCoordsLocation, currentTexID);
   glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[0]);
   glContext.activeTexture(glContext.TEXTURE1);
   glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[1]);
   glContext.activeTexture(glContext.TEXTURE2);
   glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[2]);
   glContext.activeTexture(glContext.TEXTURE3);
   glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[3]);
   glContext.activeTexture(glContext.TEXTURE4);
   glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[4]);
   glContext.activeTexture(glContext.TEXTURE5);
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexTextCoordsBuffer);
   glContext.vertexAttribPointer(vertexTextcoordLocation, 2, glContext.FLOAT, false, 0, 0);

   //We request the first drawing when all is initialized
   requestAnimationFrame(draw);
}

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

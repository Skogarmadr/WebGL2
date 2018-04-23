/**
 * @file ch09 - ex03
 * @author Luca Srdjenovic
 * @description Face Mesh Morphing
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
uniform vec3 uLightPosition;

in vec3 pos;
in vec3 normal;
in vec2 vertexTexture;

out vec3 vNormal;
out vec3 vLightRay;
out vec3 vEyeVec;
out vec2 vTexture;

void main()
{
  gl_PointSize = 3.0;
  vec4 vertex = uMVMatrix * vec4(pos, 1.0);
  vNormal = vec3(uNMatrix * vec4(normal, 1.0));
  vec4 light = vec4(uLightPosition,1.0);
  vLightRay = vertex.xyz - light.xyz;
  vEyeVec = -vec3(vertex.xyz);
  vTexture = vertexTexture;
  gl_Position = uPMatrix * vertex;
}
`;

/* ***************************************** *\
		Declaration of the fragment shader
\ *****************************************  */
var fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

uniform float uShininess;
uniform vec3 uLightAmbient;
uniform vec3 uMaterialDiffuse;
uniform vec3 uMaterialSpecular;
uniform sampler2D uColorTexture;

in vec3 vNormal;
in vec3 vLightRay;
in vec3 vEyeVec;
in vec2 vTexture;

out vec4 outColor;

void main()
{
  vec2 mapCoord = vec2(vTexture.s, vTexture.t);
  vec4 texelColor = texture(uColorTexture, mapCoord);
  vec3 finalColor = texelColor.rgb;
  vec3 L = normalize(vLightRay);
  vec3 N = normalize(vNormal);

  float lambertTerm=dot(N,-L);
  if(lambertTerm > 0.0){
    finalColor +=uMaterialDiffuse * lambertTerm;
    vec3 E=normalize(vEyeVec);
    vec3 R=reflect(L, N);
    float specular=pow( max(dot(R, E), 0.0), uShininess);
    finalColor +=uMaterialSpecular * specular;
  }
  outColor = vec4(finalColor, 1.0);
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

var vertexNormalLocation = -1; //Location of the normal vertex within the shader
var vertexNormalBuffer = null; //Buffer that will contain the normal vertex

var vertexTextcoordLocation = -1; //Location of the texture coordinates vertex within the shader
var vertexTextcoordBuffer = null; //Buffer that will contain the textures coordinate vertex

var indexBuffer = null; //Buffer that will contain the indexes
var indexLength = -1; //Size of the indexes for the current

var pMatrix = null; //mat4 for the projection matrix
var mvMatrix = null; //mat4 for the model view matrix
var nMatrix = null;
var PMatrixLocation = null; //Reference to the PMatrix Location within the shader
var MVMatrixLocation = null; //Reference to the MVMatrix Location within the shader
var NMatrixLocation = null;

//Lights
var LightPositionLocation = null; // reference to the light
var ShininessLocation = null;// reference to the shininess
var LightAmbientLocation = null;// reference to the lightAmbient
var MaterialDiffuseLocation = null;// reference to the materialDiffuse
var MaterialSpecularLocation = null;// reference to the materialSpecular

//Inputs
var rotY = 0;
var rotX = 0;
var indices = new Array();
var textures = new Array();
var points = {};
points["BoucheGauche"] = [0.108, -0.105, 0.309];
points["BoucheDroite"] = [-0.108, -0.105, 0.309];
points["SourcilGauche"] = [0.205, 0.165, 0.167];
points["SourcilDroit"] = [-0.205, 0.165, 0.167];
points["JoueGauche"] = [0.168, 0.058, 0.233];
points["JoueDroite"] = [-0.168, 0.058, 0.233];

var canva = document.getElementById("webgl-canvas");
var c_width = canva.width;
var c_height = canva.height;

window.onkeydown = checkKey;
var delta = 5;

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
    glContext.deleteBuffer(vertexPosBuffer);
    glContext.deleteBuffer(vertexColorBuffer);
    glContext.deleteProgram(program);
    glContext.deleteVertexArray(vertexArray);
}

/**
 * Defines all the links with the shaders parameters
 */
function initShaderParameters() {
    //Definition of the location 0 as the entry for the position vertex
    vertexPositionLocation =  glContext.getUniformLocation(program, "pos");

    //Definition of the location 1 as the entry for the Normal vertex
    vertexNormalLocation = glContext.getUniformLocation(program, "normal");

    //Definition of the location 1 as the entry for the  texture vertex
    vertexTextcoordLocation = glContext.getUniformLocation(program, "uColorTexture");

    //Retriving the location of the PMatrix in the current program
    PMatrixLocation = glContext.getUniformLocation(program, "uPMatrix");

    //Retriving the location of the MVMatrix in the current program
    MVMatrixLocation = glContext.getUniformLocation(program, "uMVMatrix");

    //Retriving the location of the NVMatrix in the current program
	  NMatrixLocation = glContext.getUniformLocation(program, 'uNMatrix');

    //Retriving the location of the lightPosition in the current program
    LightPositionLocation = glContext.getUniformLocation(program, "uLightPosition");

    //Retriving the location of the shininess in the current program
    ShininessLocation = glContext.getUniformLocation(program, "uShininess");

    //Retriving the location of the lightambient in the current program
    LightAmbientLocation = glContext.getUniformLocation(program, "uLightAmbient");

    //Retriving the location of the materialDiffuse in the current program
    MaterialDiffuseLocation = glContext.getUniformLocation(program, "uMaterialDiffuse");

    //Retriving the location of the materialSpecular in the current program
    MaterialSpecularLocation = glContext.getUniformLocation(program, "uMaterialSpecular");

}

/**
 * Init the buffers and values for the code
 */
function initBuffers() {

    //Creation of the vertexArray we will use to transfer the position and color buffers
    vertexArray = glContext.createVertexArray();



    loadModel("../ressources/models/head/main.json");
}
/**
* Defines all the links for the lightsparameters
*/
function initLights()
{
  //Set the light position
  glContext.uniform3f(LightPositionLocation, 1.0, 1.0, 1.0);
  //Set the ambient light
  glContext.uniform3f(LightAmbientLocation, 0.1, 0.1, 0.1);
  //Set the diffuse color
  glContext.uniform3f(MaterialDiffuseLocation, 0.2, 0.2, 0.2);
  //Set the specular color
  glContext.uniform3f(MaterialSpecularLocation, 0.25, 0.25, 0.25);
  //Set the shininess
  glContext.uniform1f(ShininessLocation, 30.0);
}

/**
 * Draws the content with the wanted data
 */
function draw() {

  mat4.perspective(pMatrix, degToRad(40), c_width / c_height, 0.1, 1000.0);
  mat4.identity(mvMatrix);
  var tx = 0;
  var ty = 0.0;
  var tz = -1.8;
  mat4.translate(mvMatrix, mvMatrix, [tx, ty, tz]);
  mat4.rotate(mvMatrix, mvMatrix, degToRad(rotY), [0, 1, 0]);
  mat4.rotate(mvMatrix, mvMatrix, degToRad(rotX), [1, 0, 0]);
  //Setting the values for the constants of pMatrix and mvMatrix
  glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
  glContext.uniformMatrix4fv(MVMatrixLocation, false, mvMatrix);
  mat4.copy(nMatrix, mvMatrix);
  mat4.invert(nMatrix, nMatrix);
  mat4.transpose(nMatrix, nMatrix);

  glContext.bindVertexArray(vertexArray);
  glContext.activeTexture(glContext.TEXTURE0);
  glContext.uniform1i(vertexTextcoordLocation, 0);

  for (var texture in indices) {
      indexBuffer = glContext.createBuffer();
      glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
      glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices[texture]), glContext.STATIC_DRAW);
      glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);

      glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
      glContext.bindTexture(glContext.TEXTURE_2D, textures[texture][0]);
      glContext.drawElements(glContext.TRIANGLES, indices[texture].length, glContext.UNSIGNED_SHORT, 0);
  }
  requestAnimationFrame(draw);
}

/**
 * Configuration of the context. This can be used to parameters the rendering options on the canvas
 */
function configureContext() {
	//Configures the color in which the canvas must be cleared
  glContext.clearColor(0.9, 0.9, 1.0, 1.0);
  glContext.enable(glContext.DEPTH_TEST);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  glContext.viewport(0, 0, c_width, c_height);

}

function configureScene() {
  //Creation of the pMatrix with glMatrix library
  pMatrix = mat4.create();
  //Creation of the mvMatrix with glMatrix library
  mvMatrix = mat4.create();
  //Creation of the nMatrix with glMatrix library
  nMatrix = mat4.create();



}

function initWebGL() {
    //We initialize each components in a specific order
    initWebGLContext();
    initProgram();
    initShaderParameters();
    initBuffers();
    configureContext();
		configureScene();
    //initLights();
    //mat4.identity(mvMatrix);
    //We request the first drawing when all is initialized
    requestAnimationFrame(draw);
}

function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}

function loadModel(filename){
    var request = new XMLHttpRequest();
    console.info('Requesting ' + filename);
    request.open("GET",filename);
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        if(request.status == 404) {
            console.info(filename + ' does not exist');
         }
        else {
          handleLoadedModel(filename, JSON.parse(request.responseText));
          //glContext.bindVertexArray(null);
        }
      }
    }
    request.send();
}

function handleLoadedModel(filename, payload){
  console.info(filename + ' has been retrieved from the server');
  console.log("vertices: " + payload.vertices.length);
  console.log("normals: " + payload.normals.length);
  console.log("textures: " + payload.textures.length);
  vertexBase = payload.vertices;
  glContext.bindVertexArray(vertexArray);

  glContext.enableVertexAttribArray(vertexNormalLocation);
  vertexNormalBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexNormalBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(payload.normals), glContext.STATIC_DRAW);
  glContext.vertexAttribPointer(vertexNormalLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

  glContext.enableVertexAttribArray(vertexTextcoordLocation);
  vertexTextcoordBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexTextcoordBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(payload.textures), glContext.STATIC_DRAW);
  glContext.vertexAttribPointer(vertexTextcoordLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
  glContext.bindVertexArray(null);

  for (var i = 0; i < payload.indices.length; i++) {
      console.log("loading " + payload.indices[i].texture + " for " + payload.indices[i].indices.length + " faces");
      indices[payload.indices[i].texture] = payload.indices[i].indices;
      textures[payload.indices[i].texture] = new Array();
      initTextureWithImage("../ressources/models/head/" + payload.indices[i].texture, textures[payload.indices[i].texture]);
  }
  elastic();
  initLights();
}

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

function elastic() {
    var vertexModified = new Array();
    for (var i = 0; i < vertexBase.length; i++) {
        vertexModified[i] = vertexBase[i];
    }
    for (var name in points) {
        var dx = document.getElementById("slider" + name + "X").value / 3000;
        var dy = document.getElementById("slider" + name + "Y").value / 3000;
        var dz = document.getElementById("slider" + name + "Z").value / 3000;
        var x = points[name][0];
        var y = points[name][1];
        var z = points[name][2];
        for (var i = 0; i < vertexBase.length; i += 3) {
            var dist = Math.sqrt(Math.pow(x - vertexBase[i], 2) + Math.pow(y - vertexBase[i + 1], 2) + Math.pow(z - vertexBase[i + 2], 2));
            dist = Math.pow((0.5 * (2 - dist)), 30);
            vertexModified[i] += dx * dist;
            vertexModified[i + 1] += dy * dist;
            vertexModified[i + 2] += dz * dist;
        }
    }
    glContext.bindVertexArray(vertexArray);
    glContext.enableVertexAttribArray(vertexPositionLocation);
    vertexPositionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertexModified), glContext.STATIC_DRAW);
    glContext.vertexAttribPointer(vertexPositionLocation, 3, glContext.FLOAT, false, 0, 0);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
    glContext.bindVertexArray(null);

}

function checkKey(ev) {
    switch (ev.keyCode) {
        case 65:
            rotY -= delta;
            break;
        case 68:
            rotY += delta;
            break;
        case 87:
            rotX -= delta;
            break;
        case 83:
            rotX += delta;
            break;
        default:
            console.log(ev.keyCode);
            break;
    }
}

/**
 * @file ch09 - eg05
 * @author Luca Srdjenovic
 * @description Mesh Deform Face Animation
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

out vec3 vNormal;
out vec3 vLightRay;
out vec3 vEyeVec;


void main()
{
  gl_PointSize = 3.0;
  vec4 vertex = uMVMatrix * vec4(pos, 1.0);
  vNormal     = vec3(uNMatrix * vec4(normal, 1.0));
  vec4 light  = vec4(uLightPosition,1.0);
  vLightRay   = vertex.xyz - light.xyz;
  vEyeVec     = -vec3(vertex.xyz);
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

in vec3 vNormal;
in vec3 vLightRay;
in vec3 vEyeVec;

out vec4 outColor;

void main()
{
  vec3 L = normalize(vLightRay);
  vec3 N = normalize(vNormal);
  float lambertTerm = dot(N,-L);
  vec3 finalColor = uLightAmbient;
  if(lambertTerm > 0.0)
  {
    finalColor += uMaterialDiffuse * lambertTerm;
    vec3 E = normalize(vEyeVec);
    vec3 R = reflect(L, N);
    float specular = pow( max(dot(R, E), 0.0), uShininess);
    finalColor += uMaterialSpecular * specular;
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

var indexBuffer = null; //Buffer that will contain the indexes
var indexLength = -1; //Size of the indexes for the current

var vertexBuffersArray = null;
var indexBuffersArray = null;
var normalBuffersArray = null;

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
var baseShapeVertices = null;
var baseShapeNormals = null;
var meshTargets = [];
var filledTrianglesRendering = true;

var canva = document.getElementById("webgl-canvas");
var c_width = canva.width;
var c_height = canva.height;

window.onkeydown = checkKey;

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

    //Definition of the location 1 as the entry for the color vertex
    vertexNormalLocation = glContext.getUniformLocation(program, "normal");

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
    //vertexArray = glContext.createVertexArray();

    loadAllModels();
}
/**
* Defines all the links for the lightsparameters
*/
function initLights()
{
  //Set the light position
  glContext.uniform3f(LightPositionLocation, 0.0, 0.0, 1.0);
  //Set the ambient light
  glContext.uniform3f(LightAmbientLocation, 0.1, 0.1, 0.1);
  //Set the diffuse color
  glContext.uniform3f(MaterialDiffuseLocation, 0.5, 0.5, 0.5);
  //Set the specular color
  glContext.uniform3f(MaterialSpecularLocation, 0.6, 0.6, 0.6);
  //Set the shininess
  glContext.uniform1f(ShininessLocation, 10000.0);
}

function drawObject(index, indexCount){

    //Binding the vertexArray as the current vertex array
    glContext.bindVertexArray(vertexArray);

    //We bind the index buffer to the element_array_buffer slot
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, index);



    if( filledTrianglesRendering )
      glContext.drawElements( glContext.TRIANGLES, indexCount, glContext.UNSIGNED_SHORT, 0 );
    else
      glContext.drawElements( glContext.POINTS, indexCount, glContext.UNSIGNED_SHORT, 0 );
    //glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);
    glContext.bindVertexArray(null);

}

/**
 * Draws the content with the wanted data
 */
function draw() {

  mat4.perspective(pMatrix, degToRad(60), c_width / c_height, 0.1, 1000.0);
  glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
  var tx = 0;
  var ty = -0.5;
  var tz = -2.0;
  translationMat = mat4.create();
  mat4.identity(translationMat);
  mat4.translate(translationMat, translationMat, [tx, ty, tz]);
  rotateModelViewMatrixUsingQuaternion(true);
  if(indexLength > 0)
  {
    var modelViewMatrix = mat4.multiply(mat4.create(), translationMat, mvMatrix);
    glContext.uniformMatrix4fv(MVMatrixLocation, false, modelViewMatrix);
    mat4.copy(nMatrix, modelViewMatrix);
    mat4.invert(nMatrix, nMatrix);
    mat4.transpose(nMatrix, nMatrix);
    glContext.uniformMatrix4fv(NMatrixLocation, false, nMatrix);
    drawObject(indexBuffer, indexLength);
  }

  requestAnimationFrame(draw);
}

/**
 * Configuration of the context. This can be used to parameters the rendering options on the canvas
 */
function configureContext() {
	//Configures the color in which the canvas must be cleared
  glContext.enable(glContext.DEPTH_TEST);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  	glContext.clearColor(0.9, 0.9, 1.0, 1.0);

}

function configureScene() {
  //Creation of the pMatrix with glMatrix library
  pMatrix = mat4.create();
  //Creation of the mvMatrix with glMatrix library
  mvMatrix = mat4.create();
  //Creation of the nMatrix with glMatrix library
  nMatrix = mat4.create();

  //Setting the values for the constants of pMatrix and mvMatrix



}

function loadAllModels()
{
  loadModel("../ressources/models/OBJ/neutral.obj");
  loadModel("../ressources/models/OBJ/happy.obj");
  loadModel("../ressources/models/OBJ/sad.obj");
  loadModel("../ressources/models/OBJ/surprise.obj");
}

function initWebGL() {
    //We initialize each components in a specific order
    initWebGLContext();
    initProgram();
    initShaderParameters();
    initBuffers();
    configureContext();
		configureScene();
    initLights();
    mat4.identity(mvMatrix);
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
          handleOBJModel(filename, request.responseText)
        }
      }
    }
    request.send();
}
function handleOBJModel(filename, data){
  console.info(filename + ' has been retrieved from the server');
  meshTargets.push(new OBJ.Mesh(data));
  var lastObject = meshTargets.length-1;
  //Creation of the vertexArray we will use to transfer the position and color buffers


  //Binding the vertexArray as the current vertex array

  glContext.bindVertexArray(vertexArray);
  glContext.enableVertexAttribArray(vertexPositionLocation);
  vertexPositionBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);
  console.log(meshTargets[lastObject].vertices);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(meshTargets[lastObject].vertices), glContext.STATIC_DRAW);
  glContext.vertexAttribPointer(vertexPositionLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

  glContext.enableVertexAttribArray(vertexNormalLocation);
  vertexNormalBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexNormalBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(meshTargets[lastObject].vertexNormals), glContext.STATIC_DRAW);
  glContext.vertexAttribPointer(vertexNormalLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

  var indices = new Uint16Array(meshTargets[lastObject].indices);

  indexBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
  glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, indices, glContext.STATIC_DRAW);
  indexLength = indices.length;
    glContext.bindVertexArray(null);

  if (lastObject == 0){
    baseShapeVertices = meshTargets[lastObject].vertices;
    baseShapeNormals = meshTargets[lastObject].vertexNormals;
  }



}

function morph(){
  console.log('test');
  var meshNb = meshTargets.length;
  var morphingScale = [];
  morphingScale.push( meshNb*document.getElementById("sliderHappiness").value / 100.0 );
  morphingScale.push( meshNb*document.getElementById("sliderSadness").value / 100.0 );
  morphingScale.push( meshNb*document.getElementById("sliderSurprise").value / 100.0 );
  var morphedVertices = [];
  var morphedNormals = [];
  for(var i = 0; i < baseShapeVertices.length; ++i){
    var baseValue = parseFloat( baseShapeVertices[i] );
    var interpolatedValue = baseValue*(meshNb-1);
    for (var morphTargetIndx = 1; morphTargetIndx < meshNb; ++morphTargetIndx) {
      var morphTargetValue = parseFloat( meshTargets[morphTargetIndx].vertices[i] );
      interpolatedValue += (morphTargetValue - baseValue) * morphingScale[morphTargetIndx-1];
    }
    morphedVertices.push(interpolatedValue/morphingScale.length);
  }

  glContext.bindVertexArray(vertexArray);
  glContext.enableVertexAttribArray(vertexPositionLocation);

  vertexPositionBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(morphedVertices), glContext.STATIC_DRAW);
  glContext.vertexAttribPointer(vertexPositionLocation, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

  glContext.bindVertexArray(null);
}

function checkKey(ev){
  switch(ev.keyCode){
    case 78:
      break;
    case 84:{
      filledTrianglesRendering= !filledTrianglesRendering;
      break;
    }
    default:
      console.log(ev.keyCode);
    break;
  }
}

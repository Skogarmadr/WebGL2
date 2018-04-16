/**
* @file ch08 - ex09
* @author Luca Srdjenovic
* @description Making a small forest
*/

/* ***************************************** *\
  Declaration of the vertex shader
\ *****************************************  */
var vertexShaderSource = `#version 300 es
#define POSITION_LOCATION 0
#define TEXTURE_LOCATION 1
#define NORMAL_LOCATION 2

precision highp float;
precision highp int;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;
uniform vec3 uLightPosition;

layout(location = POSITION_LOCATION) in vec3 pos;
layout(location = NORMAL_LOCATION) in vec3 normal;
layout(location = TEXTURE_LOCATION) in vec2 textureCoord;

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
	vColor = color;
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
out vec4 color;

//The texture
uniform sampler2D uColorTexture;

uniform float uShininess;
uniform vec3 uLightAmbient;
uniform vec3 uMaterialDiffuse;
uniform vec3 uMaterialSpecular;

//Passed in from the vertex-shader
in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vLightRay;
in vec4 vEyeVec;

void main()
{
	vec3 L = normalize(vLightRay);
  vec3 N = normalize(vNormal);
  float lambertTerm = dot(N, -L);

  vec4 texelColor = texture(uColorTexture, vTextureCoord);

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
  color = vec4(finalColor, alpha);
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

var vertexTextureCoordLocation = -1; //Location of the texture  coordinate within the shader
var vertexTextcoordBuffer = null; //Buffer that will contain the coordinate  vertex
var textures = new Array();

var indexBuffer = null; //Buffer that will contain the indexes
var indexLength = -1; //Size of the indexes for the current

//Matrix
var pMatrix = null; //mat4 for the projection matrix
var mvMatrix = null; //mat4 for the model view matrix
var nMatrix = null; //mat4 for the normal matrix

var PMatrixLocation = null; //Reference to the PMatrix Location within the shader
var MVMatrixLocation = null; //Reference to the MVMatrix Location within the shader
var NMatrixLocation = null; //Reference to the NMatrix Location with the shader

//Lights
var light = null; // vec3 for the light
var lightLocation = null; // reference to the light

//Inputs
var forest = new Array();
var images = new Array();
var rotObject = 0;

const maxSample = 5;


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
   vertexPositionLocation = 0;

   //Definition of the location 1 as the entry for the texcoord vertex
   vertexTextcoordLocation = 1;

   //Retriving the location of the PMatrix in the current program
   PMatrixLocation = glContext.getUniformLocation(program, "uPMatrix");

   //Retriving the location of the MVMatrix in the current program
   MVMatrixLocation = glContext.getUniformLocation(program, "uMVMatrix");

   //Retriving the location of the uNMatrix in the current program
   NMatrixLocation = gl.context.getUniformLocation(program, "uNMatrix");
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
   var vertices = new Float32Array([
       -0.5, -0.5,  0.0,
        1.0, -1.0,  0.0,
       -1.0,  1.0,  0.0,
		     0.5,  0.5,  0.0
   ]);

   //Enabling the color location to be used to transfer vertex arrays
   glContext.enableVertexAttribArray(vertexColorLocation);

   //Creation of the buffer to store the vertices in
   vertexPositionBuffer = glContext.createBuffer();

   //Binding it to the ARRAY_BUFFER slot
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);

   //Transfer the vertice data to the buffer
   glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);

   //Send the vertexPositionBuffer to the vertex pos location,
   //with 3 values per point, as float, without spaces between the data and without offset
   glContext.vertexAttribPointer(
       vertexPositionBuffer,
       3,
       glContext.FLOAT,
       false,
       0,
       0
   );
   //Reset ARRAY_BUFFER
   glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

   //Colors
   var colors = new Float32Array([
       0.0, 0.5, 0.0, 1.0,
       1.0, 0.5, 0.0, 1.0,
       0.0, 0.5, 1.0, 1.0,
       1.0, 0.5, 1.0, 1.0
   ]);

   //Creation of the buffer to store the colors in
   vertexColorBuffer = glContext.createBuffer();

   //Binding it to the ARRAY_BUFFER slot
   glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexColorBuffer);

   //Transfer the color data to the buffer
   glContext.bufferData(glContext.ARRAY_BUFFER, colors, glContext.STATIC_DRAW);

   //Send the vertexColorBuffer to the vectex color location,
   //with 4 values per point, as float, without space between the data and without offset
   glContext.vertexAttribPointer(
       vertexColorLocation,
       4,
       glContext.FLOAT,
       false,
       0,
       0
   );
		//Reset ARRAY_BUFFER
	  glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

		//Declaration of the indexes
	  const indices = new Uint16Array([0, 1, 2, 1, 2, 3]);

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
/**
* Draws the content with the wanted data
*/
function drawScene() {
	//Clears the canvas with the clear color
 glContext.clear(glContext.COLOR_BUFFER_BIT);

 //Binding the vertexArray as the current vertex array
 glContext.bindVertexArray(vertexArray);


 //Draws the triangle. DrawArraysInstanced allows to draw multiple instances
 glContext.drawElements(
   glContext.TRIANGLES,
   indexLength,
   glContext.UNSIGNED_SHORT,
   0
 );

 //Unbinding of the vertex array
 glContext.bindVertexArray(null);
 //Request the drawing of the next scene (optional for this sample)
 requestAnimationFrame(drawScene);
}

/**
* Configuration of the context. This can be used to parameters the rendering options on the canvas
*/
function configureContext() {
	//Configures the color in which the canvas must be cleared
	glContext.clearColor(0.0, 0.0, 0.0, 1.0);

}

function configureScene() {
 //Creation of the pMatrix with glMatrix library
 pMatrix = mat4.create();
 //Creation of the mvMatrix with glMatrix library
 mvMatrix = mat4.create();
 //Creation of the nMatrix with glMatrix library
 nMatrix = mat4.create();

 //Setting the values for the constants of pMatrix and mvMatrix
 glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
 glContext.uniformMatrix4fv(MVMatrixLocation, false, mvMatrix);
 glContext.uniformMatrix4fv(NMatrixLocation, false, nMatrix);
}




function initWebGL() {
   //We initialize each components in a specific order
   initWebGLContext();
   initProgram();
   initShaderParameters();
   initBuffers();
   configureContext();
	 configureScene();
   //We request the first drawing when all is initialized
   requestAnimationFrame(drawScene);
}

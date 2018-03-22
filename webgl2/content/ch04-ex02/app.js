/**
 * @file ch04 - ex02
 * @author Luca Srdjenovic
 * @description A Diamond With Two Triangles
 */

/* ***************************************** *\
   Declaration of the vertex shader
\ *****************************************  */
var vertexShaderSource = `#version 300 es
#define POSITION_LOCATION 0
#define COLOR_LOCATION 1

precision highp float;
precision highp int;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

layout(location = POSITION_LOCATION) in vec3 pos;
layout(location = COLOR_LOCATION) in vec4 color;
out vec4 vColor;

void main()
{
	vColor = color;
	gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
}
`;

/* ***************************************** *\
		Declaration of the fragment shader
\ *****************************************  */
var fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

in vec4 vColor;
out vec4 color;

void main()
{
	color = vColor;
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
var vertexColorLocation = -1; //Location of the color vertex within the shader
var vertexColorBuffer = null; //Buffer that will contain the color vertex

var indexBuffer = null; //Buffer that will contain the indexes
var indexLength = -1; //Size of the indexes for the current

var pMatrix = null; //mat4 for the projection matrix
var mvMatrix = null; //mat4 for the model view matrix
var PMatrixLocation = null; //Reference to the PMatrix Location within the shader
var MVMatrixLocation = null; //Reference to the MVMatrix Location within the shader

/* ***************************************** *\
			Utility functions
\ *****************************************  */
/**
 * Creates and compiles a shader based on his code and type
 * @param {WebGL2RenderingContext} glContext - The WebGL context
 * @param {string} source - The source of the shader
 * @param {GLenum} type - The type of shader to compile
 * @returns {WebGLShader} - The compiled shader
 */
function createShader(glContext, source, type) {
	//Creates the shader
	var shader = glContext.createShader(type);

	//Loads in the shader code
	glContext.shaderSource(shader, source);

	//Dynamically compiles it
	glContext.compileShader(shader);

	return shader;
}



/**
 * Creates a program based on a vertex and fragment shader source
 * @param {WebGL2RenderingContext} glContext - The WebGL context
 * @param {string} vertexShaderSource - The source of the vertex shader
 * @param {string} fragmentShaderSource - The source of the fragment shader
 * @returns {WebGLProgram} - The program composed of 2 shaders
 */
function createProgram(glContext, vertexShaderSource, fragmentShaderSource) {
	//Creates a new program
	var program = glContext.createProgram();

	//Calls a compilation of the vertex shader
	var vshader = createShader(glContext, vertexShaderSource, glContext.VERTEX_SHADER);

	//Calls a compilation of the fragment shader
	var fshader = createShader(glContext, fragmentShaderSource, glContext.FRAGMENT_SHADER);

	//Copies the vertex shader to the program
	glContext.attachShader(program, vshader);

	//The shader being copied, it can be deleted
	glContext.deleteShader(vshader);

	//Copies the fragment shader into the program
	glContext.attachShader(program, fshader);

	//The shader being copied, it can be deleted
	glContext.deleteShader(fshader);

	//We link the new program to the WebGL context
	glContext.linkProgram(program);

	//Retrives and logs in console the logs from the program creation
	var log = glContext.getProgramInfoLog(program);
	if (log) {
		console.log(log);
	}

	//Retrives and logs in console the logs from the vertex shader creation
	var log = glContext.getShaderInfoLog(vshader);
	if (log) {
		console.log(log);
	}

	//Retrives and logs in console the logs from the fragment shader creation
	var log = glContext.getShaderInfoLog(fshader);
	if (log) {
		console.log(log);
	}

	return program;
}

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

    //Definition of the location 1 as the entry for the color vertex
    vertexColorLocation = 1;

    //Retriving the location of the PMatrix in the current program
    PMatrixLocation = glContext.getUniformLocation(program, "uPMatrix");

    //Retriving the location of the MVMatrix in the current program
    MVMatrixLocation = glContext.getUniformLocation(program, "uMVMatrix");
}

/**
 * Init the buffers and values for the code
 */
function initBuffers() {
    //Creation of the vertexArray we will use to transfer the position and color buffers
    vertexArray = glContext.createVertexArray();

    //Creation of the pMatrix with glMatrix library
    pMatrix = mat4.create();
    //Creation of the mvMatrix with glMatrix library
    mvMatrix = mat4.create();

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

	  var indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
	  indexLength = indices.length;
	  indexBuffer = glContext.createBuffer();
	  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
	  glContext.bufferData(
	    glContext.ELEMENT_ARRAY_BUFFER,
	    indices,
	    glContext.STATIC_DRAW
	  );
	  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);
	  //Reset the selected vertex Array
	  glContext.bindVertexArray(null);
}
/**
 * Draws the content with the wanted data
 */
function drawScene() {
	//Clears the canvas with the clear color
  glContext.clear(glContext.COLOR_BUFFER_BIT);

  glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
  glContext.uniformMatrix4fv(MVMatrixLocation, false, mvMatrix);

  //Binding the vertexArray as the current vertex array
  glContext.bindVertexArray(vertexArray);

  //We set the indexes in the buffers
  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
  //Draws the triangle. DrawArraysInstanced allows to draw multiple instances
  glContext.drawElements(
    glContext.TRIANGLES,
    indexLength,
    glContext.UNSIGNED_SHORT,
    0
  );
  //Unbinding of the Element_array_buffer
  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);
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
	glContext.clearColor(0.9, 0.9, 0.9, 1.0);

}

function initWebGL() {
    //We initialize each components in a specific order
    initWebGLContext();
    initProgram();
    initShaderParameters();
    initBuffers();
    configureContext();
    //We request the first drawing when all is initialized
    requestAnimationFrame(drawScene);
}

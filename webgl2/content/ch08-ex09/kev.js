/**
 * @file Application file for the Chapter 8, exercise 8
 * @author Vulliemin Kevin
 * @description TODO
 */



//Declaration of the vertex shader
var vertexShaderSource = `#version 300 es
#define POSITION_LOCATION 0
#define TEXTURE_LOCATION 1

precision highp float;
precision highp int;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

layout(location = POSITION_LOCATION) in vec3 pos;
layout(location = TEXTURE_LOCATION) in vec2 texcoord;	// Defined in the shader instead of glContext.bindAttribLocation

// a varying to pass the texture coordinates to the fragment shader
out vec2 v_texcoord;

void main()
{
	gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);

	// Pass the texcoord to the fragment shader.
	v_texcoord = texcoord;
}
`;

//Declaration of the fragment shader
var fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

// the final color
out vec4 color;

// Passed in from the vertex shader.
in vec2 v_texcoord;

// The texture.
uniform sampler2D u_texture;

void main()
{
	vec4 temp_color = texture(u_texture, v_texcoord);
	if(temp_color.x==254.0/255.0 && temp_color.y==121.0/255.0 && temp_color.z==243.0/255.0){
		discard;
	}
	else{
		color = texture(u_texture, v_texcoord);
	}
}
`;

/* ***************************************** *\
		Definition of global variables
\ *****************************************  */

//glContext global variable to access webgl functionnalities
var glContext = null;
//program is the shader program where the two shaders are compiled
var program = null;
//vertexArray is a variable used to communicate the vertex
var vertexArray = null;

//Location of the vertex position within the shader
var vertexPosLocation = -1;
//Buffer that will contain the position vertex
var vertexPosBuffer = null;

//mat4 for the projection matrix
var pMatrix = null;
//mat4 for the model view matrix
var mvMatrix = null;

//Reference to the PMatrix Location within the shader
var PMatrixLocation = null;
//Reference to the MVMatrix Location within the shader
var MVMatrixLocation = null;

//-----Exercise 8.8 variables-----

//Objects
var triangles = [];

//Textures
var vertexTextcoordLocation = -1;	//Location of the texture within the shader
var vertexTextcoordBuffer = null; //Buffer that will contain the texture coordinates vertex
var textures = [];

//Images variables
var seasons = ["P", "E", "A", "H"];
var branchesBySeason = 10;
var images = [];

//Perspective
var translationMatrix;

/* ***************************************** *\
			Inputs
\ *****************************************  */

var currentSeason = "P";

function changeSeason(){
	currentSeason = document.getElementById("season").value;

	for(var brancheId=0; brancheId < branchesBySeason; brancheId++){
		images[currentSeason][brancheId].addEventListener('load', bindTextureWithImage(textures[brancheId], images[currentSeason][brancheId]));
	}

	//alert(currentSeason);
}

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
	var canvas = document.getElementById('webgl-canvas');

	//If it can't be found, throw an exception
	if (canvas == 'undefined') {
		throw "Can't find webgl-canvas";
	}
	//Gets a webgl 2 context
	glContext = canvas.getContext('webgl2', { antialias: false });

	//If it does not support WebGL2, throw an exception
	var isWebGL2 = (glContext != null);
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
 * Defines all the links with the shaders parameters
 */
function initShaderParameters() {
	//Definition of the location 0 as the entry for the position vertex
	vertexPosLocation = 0;

	//Definition of the location 1 as the entry for the textcoord vertexArray
	vertexTextcoordLocation = 1;

	//Retriving the location of the PMatrix in the current program
	PMatrixLocation = glContext.getUniformLocation(program, 'uPMatrix');

	//Retriving the location of the MVMatrix in the current program
	MVMatrixLocation = glContext.getUniformLocation(program, 'uMVMatrix');
}

/**
 * Init the buffers and values for the code
 */
function initBuffers() {

	//----- Init -------

	//Creation of the vertexArray we will use to transfer the position and color buffers
	vertexArray = glContext.createVertexArray();

	//Creation of the pMatrix with glMatrix library
	pMatrix = mat4.create();
	//Creation of the mvMatrix with glMatrix library
	mvMatrix = mat4.create();

	//Binding the vertexArray as the current vertex array
	glContext.bindVertexArray(vertexArray);

	//---- Create triangles ----

	//Create triangles
	triangles.push(new Triangle([0.6, -0.75, 0.2], [-0.2, -0.75, 0.2], [-0.2, -0.75, -0.6]));
	triangles.push(new Triangle([0.0, 1.25, 0.2], [0.0, -0.75, 0.2], [0.0, -0.75, -0.6]));
	triangles.push(new Triangle([-0.2, 1.25, 0.0], [-0.2, -0.75, 0.0], [0.6, -0.75, 0.0]));
	triangles.push(new Triangle([1.2, 0.5, 0.3], [-0.4, 0.5, 0.3], [-0.4, -0.5, -1.5]));
	triangles.push(new Triangle([1.2, 0.0, 0.3], [-0.4, 0.0, 0.3], [-0.4, 1.0, -1.5]));
	triangles.push(new Triangle([0.75, 1.0, 0.5], [-0.25, 0.0, 0.5], [-0.25, 0.0, -2.1]));
	triangles.push(new Triangle([0.75, -0.5, 0.5], [-0.25, 0.5, 0.5], [-0.25, 0.5, -2.1]));
	triangles.push(new Triangle([0.625, 0.625, 0.375], [-0.375, 0.625, 0.375], [ -0.375, 0.625, -0.925]));
	triangles.push(new Triangle([-0.125, 1.375, 0.375], [-0.125, 0.375, 0.375], [-0.125, 0.375, -0.925]));
	triangles.push(new Triangle([-0.375, 1.375, 0.075], [-0.375, 0.375, 0.075], [0.625, 0.375, 0.075]));

	//------ Pos -------

	//Enabling the position location to be used to transfer vertex arrays
	glContext.enableVertexAttribArray(vertexPosLocation);

	//Concat triangle's vertices
	var verticesArray = [];
	for(var i = 0; i < triangles.length; i++){
		verticesArray = verticesArray.concat(triangles[i].getVertices());
	}

	//Vertices of positions
	var vertices = new Float32Array(verticesArray);

	//Creation of the buffer to store the vertices in
	vertexPosBuffer = glContext.createBuffer();
	//Binding it to the ARRAY_BUFFER slot
	glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPosBuffer);
	//Transfer the vertice data to the buffer
	glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);

	//Send the vertexPosBuffer to the vertex pos location,
	//with 3 values per point, as float, without spaces between the data and without offset
	glContext.vertexAttribPointer(vertexPosLocation, 3, glContext.FLOAT, false, 0, 0);
	//Reset ARRAY_BUFFER
	glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

	//----- Texture ------

	//Enabling the texture location to be used to transfer vertex arrays
	glContext.enableVertexAttribArray(vertexTextcoordLocation);
	//Texture coordinates
	var textcoords = new Float32Array([
		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0,

		0.0, -1.0,
		0.0, 1.0,
		2.0, 1.0
	]);

	//Creation of the buffer to store the textcoords in
	vertexTextcoordBuffer = glContext.createBuffer();
	//Binding it to the ARRAY_BUFFER slot
	glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexTextcoordBuffer);
	//Transfer the textcoord data to the buffer
	glContext.bufferData(glContext.ARRAY_BUFFER, textcoords, glContext.STATIC_DRAW);

	//Send the vertexTextcoordBuffer to the vertex textcoord location,
	//with 2 values per point, as float, without space between the data and without offset
	glContext.vertexAttribPointer(vertexTextcoordLocation, 2, glContext.FLOAT, false, 0, 0);
	//Reset ARRAY_BUFFER
	glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

	//-------End-------

	//Reset the selected vertex Array
	glContext.bindVertexArray(null);
}

/**
 * Configuration of the context. This can be used to parameters the rendering options on the canvas
 */
function configureContext() {
	//Configures the color in which the canvas must be cleared
	glContext.clearColor(0.9, 0.9, 0.9, 1.0);

	glContext.enable(glContext.BLEND);
	glContext.pixelStorei(glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
	glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

	//Turn first perspective to clip view between 0.1 and 100.0 with an angle of 40°
	var c_width = document.getElementById("webgl-canvas").width;
	var c_height = document.getElementById("webgl-canvas").height;
	mat4.perspective(pMatrix, degToRad(40), c_width / c_height, 0.1, 100.0);

	//Also move the object from -3 in z axis to make it visible
	translationMatrix = mat4.create();
	mat4.identity(translationMatrix);
	mat4.translate(translationMatrix, translationMatrix, [0.0, 0.0, -3.0]);
}

function bindTextureWithImage(texture, image) {
	// Now that the image has loaded make copy it to the texture.
	glContext.bindTexture(glContext.TEXTURE_2D, texture);
	glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);
	glContext.generateMipmap(glContext.TEXTURE_2D);

	//---- Bind to uniform ----

  // lookup the sampler locations.
	var u_textureLocation = glContext.getUniformLocation(program, "u_texture");

	// set which texture units to render with.
  glContext.uniform1i(u_textureLocation, 0);  // texture unit 0

	// Set each texture unit to use a particular texture.
  glContext.activeTexture(glContext.TEXTURE0);
  glContext.bindTexture(glContext.TEXTURE_2D, textures[0]);
}

/**
 * Loading of textures and images
 */
function initTextures(){
	//Load all images
	var path = "./tree";
	var season = null;

	for(var seasonId=0; seasonId<seasons.length; seasonId++){
		season = seasons[seasonId];
		images[season] = new Array();

		for(var brancheId=0; brancheId<branchesBySeason; brancheId++){
			//Defin image object
			var image = new Image();

			//Format path to image
			var fileName = path + "/" + season + "/tree";
			if (brancheId+1 < 10)
				fileName += "0";
			fileName += (brancheId+1)+".png";

			image.src = fileName;
			images[season].push(image);
		}
	}

	//Create textures and bind first season
	for(var i=0; i<branchesBySeason; i++){
		//Create the textures
		var texture = glContext.createTexture();
		textures.push(texture);
		glContext.bindTexture(glContext.TEXTURE_2D, texture);

		//Fill it with blue until images are loaded
		glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, 1, 1, 0, glContext.RGBA, glContext.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

		//When image is loaded bind it to texture. Bind only current season
		images[currentSeason][i].addEventListener('load', bindTextureWithImage(textures[i], images[currentSeason][i]));
	}
}

/**
 * Draws the content with the wanted data
 */
function draw() {
	//Clears the canvas with the clear color
	glContext.clear(glContext.COLOR_BUFFER_BIT);

	//Mouse motion handling
	rotateModelViewMatrixUsingQuaternion(true);

	//Perspective view
	modelViewMatrix = mat4.multiply(mat4.create(), translationMatrix, mvMatrix);

	glContext.uniformMatrix4fv(PMatrixLocation, false, pMatrix);
	glContext.uniformMatrix4fv(MVMatrixLocation, false, modelViewMatrix);

	//Binding the vertexArray as the current vertex array
	glContext.bindVertexArray(vertexArray);

	//Draws the triangle. DrawArraysInstanced allows to draw multiple instances
	glContext.activeTexture(glContext.TEXTURE0);

	for(var i=0; i<textures.length; i++){
		glContext.bindTexture(glContext.TEXTURE_2D, textures[i]);
	  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
		glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
		glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
		glContext.drawArrays(glContext.TRIANGLE_STRIP, i*3, 3);
	}

	//Request the drawing of the next scene (optional for this sample)
	requestAnimationFrame(draw);
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

function initWebGL() {
	//We initialize each components in a specific order
	initWebGLContext();
	initProgram();
	initShaderParameters();
	initBuffers();
	configureContext();
	initTextures();
	//We request the first drawing when all is initialized
	requestAnimationFrame(draw);
}

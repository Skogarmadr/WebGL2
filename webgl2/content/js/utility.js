/**
 * @file Utility.js contains basic functionnalities to help develop a WebGL 2.0 application
 * @author Christophe Bolinhas
 * @description This file will be upgraded until the end of the "Infographie" course around April 2018
 */
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
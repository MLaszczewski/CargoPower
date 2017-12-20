export function compileShader(gl, shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)

  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!success) {
    throw "could not compile shader:" + gl.getShaderInfoLog(shader)
  }

  return shader;
}

export function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  var success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!success) {
    throw ("program filed to link:" + gl.getProgramInfoLog (program))
  }

  return program;
}

export class Shader {
  uniforms: any = {}
  attributes: any = {}
  program: WebGLShader
  gl: WebGLRenderingContext

  constructor(gl, vertexCode, fragmentCode, uniformNames, attributeNames) {
    this.gl = gl
    let vertex = compileShader(gl, vertexCode, gl.VERTEX_SHADER)
    let fragment = compileShader(gl, fragmentCode, gl.FRAGMENT_SHADER)
    this.program = createProgram(gl, vertex, fragment)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)

    for(let uniformName of uniformNames) {
      this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName)
    }
    for(let attributeName of attributeNames) {
      this.attributes[attributeName] = gl.getAttribLocation(this.program, attributeName)
    }
  }

  begin() {
    this.gl.useProgram(this.program)
    for(let attrName in this.attributes) {
      this.gl.enableVertexAttribArray(this.attributes[attrName])
    }
  }

  end() {
    for(let attrName in this.attributes) {
      this.gl.disableVertexAttribArray(this.attributes[attrName])
    }
    this.gl.useProgram(null)
  }

}

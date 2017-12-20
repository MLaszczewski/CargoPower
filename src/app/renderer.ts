import { Shader } from "./shaders"
import { Box } from "./box"
import { BOXES } from "./mock-boxes"

import { mat4, vec3 } from "../third-party/tsm"


const glOptions = { premultipliedAlpha: true }

const flatVertexShaderCode = `
  precision mediump float;
  attribute vec3 aPosition;
  attribute vec4 aColor;
  attribute vec3 aNormal;
  uniform mat4 uMultipliedMatrix;
  
  uniform vec3 uLightDirection;
  
  varying vec4 vColor;  
  
  void main() {   
    gl_Position = uMultipliedMatrix * vec4(aPosition, 1.0);
    float lightness = 0.5 + 0.6 * min(max(dot(aNormal, uLightDirection), 0.0),1.0); 
    vColor = vec4(aColor.xyz * lightness, aColor.w);    
  }
`

const flatFragmentShaderCode = `
  precision mediump float;
  varying vec4 vColor;
  
  void main() {
    gl_FragColor = vColor;
  }
`

const boxPoints = new Float32Array([

  0, 0, 0, // 0 - left  top    near
  1, 0, 0, // 1 - right top    near
  1, 0, 1, // 2 - right top    far
  0, 0, 1, // 3 - left  top    far

  0, 1, 0, // 4 - left  bottom near
  1, 1, 0, // 5 - right bottom near
  1, 1, 1, // 6 - right bottom far
  0, 1, 1, // 7 - left  bottom far

])

const boxFaces = new Float32Array([

  0, 3, 2,  0, 2, 1, // Top quad
  4, 5, 6,  4, 6, 7, // Bottom quad
  4, 0, 1,  4, 1, 5, // Front face
  7, 2, 3,  7, 6, 2, // Back face
  7, 3, 0,  7, 0, 4, // Dropped from helicopter face
  5, 1, 2,  5, 2, 6  // The only right face

])

const boxFaceNormals = new Float32Array([

   0,  1,  0,   0,  1,  0, // Top quad
   0, -1,  0,   0, -1,  0, // Bottom quad
   0,  0, -1,   0,  0, -1, // Front Face
   0,  0,  1,   0,  0,  1, // Back Face
  -1,  0,  0,  -1,  0,  0, // Left Face
   1,  0,  0,   1,  0,  0  // Right Face

])

export class TriangleBuffer {

  vertex: Float32Array
  normal: Float32Array
  color: Float32Array

  size: number
  position: number

  constructor(size : number) {
    this.position = 0
    this.size = size
    this.vertex = new Float32Array(3 * size)
    this.normal = new Float32Array(3 * size)
    this.color  = new Float32Array(4 * size)
    console.log("MAKE BUFFER", size)
  }

  putBox( x: number, y: number, z: number, xs: number, ys: number, zs: number,
          r: number, g: number, b: number, a: number) {

    if (this.position + boxFaces.length > this.size) throw new Error("Buffer overflow")
    for (let i = 0; i < boxFaces.length; i++) {
      let indice = boxFaces[i]
      let face = Math.floor(i/3)
      this.vertex[ this.position * 3 + 0 ] = boxPoints[ indice * 3 + 0 ] * xs + x
      this.vertex[ this.position * 3 + 1 ] = boxPoints[ indice * 3 + 1 ] * ys + y
      this.vertex[ this.position * 3 + 2 ] = boxPoints[ indice * 3 + 2 ] * zs + z
      this.normal[ this.position * 3 + 0 ] = boxFaceNormals[ face * 3 + 0 ]
      this.normal[ this.position * 3 + 1 ] = boxFaceNormals[ face * 3 + 1 ]
      this.normal[ this.position * 3 + 2 ] = boxFaceNormals[ face * 3 + 2 ]
      this.color[ this.position * 4 + 0 ] = r
      this.color[ this.position * 4 + 1 ] = g
      this.color[ this.position * 4 + 2 ] = b
      this.color[ this.position * 4 + 3 ] = a
      this.position++
    }

  }

  reset() {
    this.position = 0
  }

}

const boxMargin = 0.046;
const cycle = 4646

export class Renderer {

  gl: WebGLRenderingContext

  flatShader: Shader

  triangleBuffer: TriangleBuffer

  vertexBuffer: WebGLBuffer
  normalBuffer: WebGLBuffer
  colorBuffer: WebGLBuffer

  center: vec3

  boxes: Box[] = []
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.triangleBuffer = new TriangleBuffer(128)
    this.gl = <WebGLRenderingContext> (canvas.getContext("webgl", glOptions)
      || canvas.getContext("experimental-webgl", glOptions ))
    let gl = this.gl
    this.flatShader = new Shader( gl, flatVertexShaderCode, flatFragmentShaderCode,
      ['uMultipliedMatrix', 'uLightDirection'], ['aPosition', 'aNormal', 'aColor'] )

    this.vertexBuffer = gl.createBuffer()
    this.colorBuffer = gl.createBuffer()
    this.normalBuffer = gl.createBuffer()

    requestAnimationFrame((t) => this.render(t))
  }

  render(time) {
    time = Date.now()
    let gl = this.gl

    let viewWidth = this.canvas.clientWidth * window.devicePixelRatio
    let viewHeight = this.canvas.clientHeight * window.devicePixelRatio
    if(viewWidth != this.canvas.width || viewHeight != this.canvas.height) {
      this.canvas.width = viewWidth
      this.canvas.height = viewHeight
    }

    gl.viewport(0, 0, viewWidth, viewHeight)

    let projection = mat4.perspective(35, viewWidth/viewHeight, 1, 100 )

    let angle = ( (time % (cycle*2)) / cycle ) * Math.PI
    let obsX = Math.sin(angle) * 15
    let obsZ = Math.cos(angle) * 15

    let lightDir = new vec3([Math.sin(angle), -1, Math.cos(angle)])
    lightDir.normalize()


    let view = mat4.lookAt(
      new vec3([obsX, 3, obsZ]),
      new vec3([0, 0, 0]),
      new vec3([0, 1, 0])
    )

    let model = new mat4()
    model.setIdentity()
    model.translate(this.center)

    let mvp = projection.multiply(view).multiply(model)
    let identity = new mat4()
    identity.setIdentity()

    if(this.boxes.length == 0) {
      requestAnimationFrame((t) => this.render(t))
      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)

    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(gl.CW)

    this.flatShader.begin()

    gl.uniformMatrix4fv(this.flatShader.uniforms.uMultipliedMatrix, false, new Float32Array(mvp.values))
    gl.uniform3fv(this.flatShader.uniforms.uLightDirection, new Float32Array(lightDir.values))

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.vertexAttribPointer(this.flatShader.attributes.aPosition, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer)
    gl.vertexAttribPointer(this.flatShader.attributes.aNormal, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.vertexAttribPointer(this.flatShader.attributes.aColor, 4, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.TRIANGLES, 0, this.triangleBuffer.position)

    this.flatShader.end()

    requestAnimationFrame((t) => this.render(t))
  }

  setBoxes(newBoxes: Box[]) {
    this.boxes = newBoxes
    if(newBoxes.length == 0) return;
    var requiredBufferSize = this.boxes.length * boxFaces.length + boxFaces.length
    if(this.triangleBuffer.size < requiredBufferSize) this.triangleBuffer = new TriangleBuffer(requiredBufferSize + 64)
    this.triangleBuffer.reset()

    this.triangleBuffer.putBox(
      4, 4, 6,
      -4, -4, -6,
      0.7,0.7,0.9,1
    )

    for(let i = 0; i < this.boxes.length; i++) {
      let box = this.boxes[i]
      this.triangleBuffer.putBox(
        box.position.x + boxMargin, box.position.y + boxMargin, box.position.z + boxMargin,
        box.size.x - boxMargin * 2 , box.size.y - boxMargin * 2 , box.size.z - boxMargin * 2 ,
        box.color.r, box.color.g, box.color.b,1
      )
    }


    let gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.triangleBuffer.vertex, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.triangleBuffer.normal, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.triangleBuffer.color, gl.STATIC_DRAW)

    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for(let box of this.boxes) {
      if(box.position.x < minX) minX = box.position.x
      if(box.position.y < minY) minY = box.position.y
      if(box.position.z < minZ) minZ = box.position.z
      if(box.position.x + box.size.x > maxX) maxX = box.position.x + box.size.x
      if(box.position.y + box.size.y > maxY) maxY = box.position.y + box.size.y
      if(box.position.z + box.size.z > maxZ) maxZ = box.position.z + box.size.z
    }
    let centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2, centerZ = (minZ + maxZ / 2)
    console.log("CENTER", centerX, centerY, centerZ)

    this.center = new vec3([-centerX, -centerY, -centerZ])

    console.log("VERTEXES", this.triangleBuffer.vertex.length, " / 3 = ", this.triangleBuffer.vertex.length / 3)
    console.log("COLORS", this.triangleBuffer.color.length, " / 4 = ", this.triangleBuffer.color.length / 4)
    console.log("BUFFER SIZE", this.triangleBuffer.size)
    console.log("SIZE", this.triangleBuffer.position)
    console.log("VERTEXES", this.triangleBuffer.vertex)
    console.log("COLORS", this.triangleBuffer.color)
  }

}

import { Mesh, BufferGeometry, BufferAttribute, LinearFilter, Scene, WebGLRenderTarget, Camera, Vector2, HalfFloatType } from 'three'

import { ConvolutionMaterial } from './convolutionMaterial'

export class BlurPass {
  constructor(options) {
    const { gl, resolution, width = 500, height = 500, minDepthThreshold = 0, maxDepthThreshold = 1, depthScale = 0, depthToBlurRatioBias = 0.25 } = options

    this.renderTargetA = new WebGLRenderTarget(resolution, resolution, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      stencilBuffer: false,
      depthBuffer: false,
      type: HalfFloatType,
    })

    this.renderTargetB = this.renderTargetA.clone()
    this.convolutionMaterial = new ConvolutionMaterial()
    this.convolutionMaterial.setTexelSize(1.0 / width, 1.0 / height)
    this.convolutionMaterial.setResolution(new Vector2(width, height))
    this.scene = new Scene()
    this.camera = new Camera()

    this.convolutionMaterial.uniforms.minDepthThreshold.value = minDepthThreshold
    this.convolutionMaterial.uniforms.maxDepthThreshold.value = maxDepthThreshold
    this.convolutionMaterial.uniforms.depthScale.value = depthScale
    this.convolutionMaterial.uniforms.depthToBlurRatioBias.value = depthToBlurRatioBias

    // 定义是否使用深度信息
    this.convolutionMaterial.defines = this.convolutionMaterial.defines || {}
    this.convolutionMaterial.defines.USE_DEPTH = depthScale > 0

    // 创建一个简单的全屏三角形
    const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0])
    const uvs = new Float32Array([0, 0, 2, 0, 0, 2])
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2))

    this.screen = new Mesh(geometry, this.convolutionMaterial)
    this.screen.frustumCulled = false
    this.scene.add(this.screen)

    this.renderToScreen = false
  }

  render(renderer, inputBuffer, outputBuffer) {
    const scene = this.scene
    const camera = this.camera
    const renderTargetA = this.renderTargetA
    const renderTargetB = this.renderTargetB
    const material = this.convolutionMaterial
    const uniforms = material.uniforms

    // 设置深度纹理
    uniforms.depthBuffer.value = inputBuffer.depthTexture
    const kernel = material.kernel
    let lastRT = inputBuffer
    let destRT

    // 应用多通道模糊
    for (let i = 0, l = kernel.length - 1; i < l; ++i) {
      // 在目标之间交替
      destRT = (i & 1) === 0 ? renderTargetA : renderTargetB
      uniforms.kernel.value = kernel[i]
      uniforms.inputBuffer.value = lastRT.texture

      renderer.setRenderTarget(destRT)
      renderer.render(scene, camera)
      lastRT = destRT
    }

    // 最后一次渲染
    uniforms.kernel.value = kernel[kernel.length - 1]
    uniforms.inputBuffer.value = lastRT.texture
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
    renderer.render(scene, camera)
  }

  dispose() {
    this.renderTargetA.dispose()
    this.renderTargetB.dispose()
    this.screen.geometry.dispose()
    this.convolutionMaterial.dispose()
  }
}

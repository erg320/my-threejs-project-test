import { Matrix4, MeshStandardMaterial, Texture, Vector3, Vector4, WebGLRenderTarget, PerspectiveCamera, Plane, LinearFilter, HalfFloatType, DepthTexture, DepthFormat, UnsignedShortType, WebGLRenderer, Scene, Camera, Vector2 } from 'three'
import { BlurPass } from './BlurPass'

// 反射材质实现
export class MeshReflectorMaterial extends MeshStandardMaterial {
  constructor(options = {}) {
    // 移除可能导致父类setValues尝试访问我们的自定义属性的选项
    const standardMaterialOptions = { ...options }

    // 从传递给父类构造函数的选项中删除我们的自定义属性
    delete standardMaterialOptions.resolution
    delete standardMaterialOptions.blur
    delete standardMaterialOptions.mixBlur
    delete standardMaterialOptions.mixStrength
    delete standardMaterialOptions.mirror
    delete standardMaterialOptions.minDepthThreshold
    delete standardMaterialOptions.maxDepthThreshold
    delete standardMaterialOptions.depthScale
    delete standardMaterialOptions.depthToBlurRatioBias
    delete standardMaterialOptions.distortion
    delete standardMaterialOptions.mixContrast
    delete standardMaterialOptions.reflectorOffset
    delete standardMaterialOptions.distortionMap

    // 使用过滤后的选项调用父类构造函数
    super(standardMaterialOptions)

    // 存储原始选项以供之后使用
    const reflectorOptions = options

    // 初始化所有属性的默认值
    this._tDepth = { value: null }
    this._distortionMap = { value: null }
    this._tDiffuse = { value: null }
    this._tDiffuseBlur = { value: null }
    this._textureMatrix = { value: null }
    this._hasBlur = { value: false }
    this._mirror = { value: 0.0 }
    this._mixBlur = { value: 0.0 }
    this._blurStrength = { value: 0.5 }
    this._minDepthThreshold = { value: 0.9 }
    this._maxDepthThreshold = { value: 1 }
    this._depthScale = { value: 0 }
    this._depthToBlurRatioBias = { value: 0.25 }
    this._distortion = { value: 1 }
    this._mixContrast = { value: 1.0 }

    // 现在，安全地应用我们的自定义属性
    this.resolution = reflectorOptions.resolution || 256
    this.blur = Array.isArray(reflectorOptions.blur) ? reflectorOptions.blur : [reflectorOptions.blur || 0, reflectorOptions.blur || 0]
    this.reflectorOffset = reflectorOptions.reflectorOffset !== undefined ? reflectorOptions.reflectorOffset : 0

    // 设置其他属性
    this.mirror = reflectorOptions.mirror !== undefined ? reflectorOptions.mirror : 0
    this.mixBlur = reflectorOptions.mixBlur !== undefined ? reflectorOptions.mixBlur : 0
    this.mixStrength = reflectorOptions.mixStrength !== undefined ? reflectorOptions.mixStrength : 1
    this.minDepthThreshold = reflectorOptions.minDepthThreshold !== undefined ? reflectorOptions.minDepthThreshold : 0.9
    this.maxDepthThreshold = reflectorOptions.maxDepthThreshold !== undefined ? reflectorOptions.maxDepthThreshold : 1
    this.depthScale = reflectorOptions.depthScale !== undefined ? reflectorOptions.depthScale : 0
    this.depthToBlurRatioBias = reflectorOptions.depthToBlurRatioBias !== undefined ? reflectorOptions.depthToBlurRatioBias : 0.25
    this.distortion = reflectorOptions.distortion !== undefined ? reflectorOptions.distortion : 1
    this.mixContrast = reflectorOptions.mixContrast !== undefined ? reflectorOptions.mixContrast : 1

    if (reflectorOptions.distortionMap) {
      this.distortionMap = reflectorOptions.distortionMap
    }

    // 内部状态
    this.hasBlur = this.blur[0] + this.blur[1] > 0
    this.parent = null

    // 创建必要的对象
    this.reflectorPlane = new Plane()
    this.normal = new Vector3()
    this.reflectorWorldPosition = new Vector3()
    this.cameraWorldPosition = new Vector3()
    this.rotationMatrix = new Matrix4()
    this.lookAtPosition = new Vector3(0, 0, -1)
    this.clipPlane = new Vector4()
    this.view = new Vector3()
    this.target = new Vector3()
    this.q = new Vector4()
    this.textureMatrix = new Matrix4()
    this.virtualCamera = new PerspectiveCamera()

    // 设置FBO和模糊通道
    this.setupRenderTargets()

    // 更新预定义
    this.setupMaterial()
  }

  setRenderer(renderer, scene, camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
  }

  setupRenderTargets() {
    const parameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      type: HalfFloatType,
    }

    this.fbo1 = new WebGLRenderTarget(this.resolution, this.resolution, parameters)
    this.fbo1.depthBuffer = true
    this.fbo1.depthTexture = new DepthTexture(this.resolution, this.resolution)
    this.fbo1.depthTexture.format = DepthFormat
    this.fbo1.depthTexture.type = UnsignedShortType

    this.fbo2 = new WebGLRenderTarget(this.resolution, this.resolution, parameters)
  }

  setupMaterial() {
    // 更新预定义
    const defines = this.defines || {}
    if (this.hasBlur) defines.USE_BLUR = ''
    if (this.depthScale > 0) defines.USE_DEPTH = ''
    if (this.distortionMap) defines.USE_DISTORTION = ''
    this.defines = defines

    // 设置反射相关属性
    this._tDiffuse.value = this.fbo1.texture
    this._tDepth.value = this.fbo1.depthTexture
    this._tDiffuseBlur.value = this.fbo2.texture
    this._distortionMap.value = this.distortionMap
    this._textureMatrix.value = this.textureMatrix
    this._hasBlur.value = this.hasBlur

    this.needsUpdate = true
  }

  initBlurPass(renderer) {
    if (!this.blurpass && this.hasBlur) {
      this.blurpass = new BlurPass({
        gl: renderer,
        resolution: this.resolution,
        width: this.blur[0],
        height: this.blur[1],
        minDepthThreshold: this.minDepthThreshold,
        maxDepthThreshold: this.maxDepthThreshold,
        depthScale: this.depthScale,
        depthToBlurRatioBias: this.depthToBlurRatioBias,
      })
    }
  }

  onBeforeCompile(shader) {
    // 添加必要的着色器代码
    if (!shader.defines?.USE_UV) {
      shader.defines.USE_UV = ''
    }

    // 添加所有必要的uniform
    shader.uniforms.hasBlur = this._hasBlur
    shader.uniforms.tDiffuse = this._tDiffuse
    shader.uniforms.tDepth = this._tDepth
    shader.uniforms.distortionMap = this._distortionMap
    shader.uniforms.tDiffuseBlur = this._tDiffuseBlur
    shader.uniforms.textureMatrix = this._textureMatrix
    shader.uniforms.mirror = this._mirror
    shader.uniforms.mixBlur = this._mixBlur
    shader.uniforms.mixStrength = this._blurStrength
    shader.uniforms.minDepthThreshold = this._minDepthThreshold
    shader.uniforms.maxDepthThreshold = this._maxDepthThreshold
    shader.uniforms.depthScale = this._depthScale
    shader.uniforms.depthToBlurRatioBias = this._depthToBlurRatioBias
    shader.uniforms.distortion = this._distortion
    shader.uniforms.mixContrast = this._mixContrast

    // 修改顶点着色器
    shader.vertexShader = `
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${shader.vertexShader}`

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`
    )

    // 修改片段着色器
    shader.fragmentShader = `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${shader.fragmentShader}`

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `
    )
  }

  beforeRender() {
    if (!this.parent || !this.camera || !this.renderer) return false

    // 初始化模糊通道（如果需要）
    this.initBlurPass(this.renderer)

    // 更新位置和矩阵
    this.reflectorWorldPosition.setFromMatrixPosition(this.parent.matrixWorld)
    this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld)
    this.rotationMatrix.extractRotation(this.parent.matrixWorld)
    this.normal.set(0, 0, 1)
    this.normal.applyMatrix4(this.rotationMatrix)

    // 应用反射偏移
    this.reflectorWorldPosition.addScaledVector(this.normal, this.reflectorOffset)

    // 计算视图向量
    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition)

    // 当反射面朝向远离相机时避免渲染
    if (this.view.dot(this.normal) > 0) return false

    // 计算反射
    this.view.reflect(this.normal).negate()
    this.view.add(this.reflectorWorldPosition)
    this.rotationMatrix.extractRotation(this.camera.matrixWorld)
    this.lookAtPosition.set(0, 0, -1)
    this.lookAtPosition.applyMatrix4(this.rotationMatrix)
    this.lookAtPosition.add(this.cameraWorldPosition)
    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition)
    this.target.reflect(this.normal).negate()
    this.target.add(this.reflectorWorldPosition)

    // 设置虚拟相机
    this.virtualCamera.position.copy(this.view)
    this.virtualCamera.up.set(0, 1, 0)
    this.virtualCamera.up.applyMatrix4(this.rotationMatrix)
    this.virtualCamera.up.reflect(this.normal)
    this.virtualCamera.lookAt(this.target)
    this.virtualCamera.far = this.camera.far
    this.virtualCamera.updateMatrixWorld()
    this.virtualCamera.projectionMatrix.copy(this.camera.projectionMatrix)

    // 更新纹理矩阵
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0)
    this.textureMatrix.multiply(this.virtualCamera.projectionMatrix)
    this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse)
    this.textureMatrix.multiply(this.parent.matrixWorld)

    // 更新投影矩阵
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition)
    this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse)
    this.clipPlane.set(this.reflectorPlane.normal.x, this.reflectorPlane.normal.y, this.reflectorPlane.normal.z, this.reflectorPlane.constant)

    const projectionMatrix = this.virtualCamera.projectionMatrix
    this.q.x = (Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
    this.q.y = (Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
    this.q.z = -1.0
    this.q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

    // 计算缩放的平面向量
    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q))

    // 替换投影矩阵的第三行
    projectionMatrix.elements[2] = this.clipPlane.x
    projectionMatrix.elements[6] = this.clipPlane.y
    projectionMatrix.elements[10] = this.clipPlane.z + 1.0
    projectionMatrix.elements[14] = this.clipPlane.w

    return true
  }

  update() {
    if (!this.renderer || !this.scene || !this.camera) return

    // 保存父对象
    this.parent = this.parent || this._parent

    // 跳过无效情况
    if (!this.parent) return

    // 准备渲染
    const shouldRender = this.beforeRender()
    if (!shouldRender) return

    // 临时设置
    this.parent.visible = false
    const currentXrEnabled = this.renderer.xr.enabled
    const currentShadowAutoUpdate = this.renderer.shadowMap.autoUpdate
    this.renderer.xr.enabled = false
    this.renderer.shadowMap.autoUpdate = false

    // 渲染到反射纹理
    this.renderer.setRenderTarget(this.fbo1)
    this.renderer.state.buffers.depth.setMask(true)
    if (!this.renderer.autoClear) this.renderer.clear()
    this.renderer.render(this.scene, this.virtualCamera)

    // 处理模糊（如果需要）
    if (this.hasBlur && this.blurpass) {
      this.blurpass.render(this.renderer, this.fbo1, this.fbo2)
    }

    // 恢复设置
    this.renderer.xr.enabled = currentXrEnabled
    this.renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
    this.parent.visible = true
    this.renderer.setRenderTarget(null)
  }

  // getter 和 setter 方法
  get tDiffuse() {
    return this._tDiffuse.value
  }

  set tDiffuse(v) {
    this._tDiffuse.value = v
  }

  get tDepth() {
    return this._tDepth.value
  }

  set tDepth(v) {
    this._tDepth.value = v
  }

  get distortionMap() {
    return this._distortionMap.value
  }

  set distortionMap(v) {
    this._distortionMap.value = v
  }

  get tDiffuseBlur() {
    return this._tDiffuseBlur.value
  }

  set tDiffuseBlur(v) {
    this._tDiffuseBlur.value = v
  }

  get textureMatrix() {
    return this._textureMatrix.value
  }

  set textureMatrix(v) {
    this._textureMatrix.value = v
  }

  get hasBlur() {
    return this._hasBlur.value
  }

  set hasBlur(v) {
    this._hasBlur.value = v
  }

  get mirror() {
    return this._mirror.value
  }

  set mirror(v) {
    this._mirror.value = v
  }

  get mixBlur() {
    return this._mixBlur.value
  }

  set mixBlur(v) {
    this._mixBlur.value = v
  }

  get mixStrength() {
    return this._blurStrength.value
  }

  set mixStrength(v) {
    this._blurStrength.value = v
  }

  get minDepthThreshold() {
    return this._minDepthThreshold.value
  }

  set minDepthThreshold(v) {
    this._minDepthThreshold.value = v
  }

  get maxDepthThreshold() {
    return this._maxDepthThreshold.value
  }

  set maxDepthThreshold(v) {
    this._maxDepthThreshold.value = v
  }

  get depthScale() {
    return this._depthScale.value
  }

  set depthScale(v) {
    this._depthScale.value = v
  }

  get depthToBlurRatioBias() {
    return this._depthToBlurRatioBias.value
  }

  set depthToBlurRatioBias(v) {
    this._depthToBlurRatioBias.value = v
  }

  get distortion() {
    return this._distortion.value
  }

  set distortion(v) {
    this._distortion.value = v
  }

  get mixContrast() {
    return this._mixContrast.value
  }

  set mixContrast(v) {
    this._mixContrast.value = v
  }

  // 清理资源方法
  dispose() {
    super.dispose()

    if (this.fbo1) this.fbo1.dispose()
    if (this.fbo2) this.fbo2.dispose()
    if (this.blurpass) this.blurpass.dispose()
  }
}

// CloudEffect.js
import { BufferAttribute, Color, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, MeshLambertMaterial, PlaneGeometry, Quaternion, REVISION, Scene, Texture, TextureLoader, Vector3 } from 'three'

// 默认云朵纹理URL
const CLOUD_URL = 'https://rawcdn.githack.com/pmndrs/drei-assets/9225a9f1fbd449d9411125c2f419b843d0308c9f/cloud.png'

// 云朵段的状态接口
// interface CloudSegmentState {
//   id: string;
//   index: number;
//   segments: number;
//   dist: number;
//   matrix: Matrix4;
//   bounds: Vector3;
//   position: Vector3;
//   volume: number;
//   length: number;
//   ref: Group;
//   speed: number;
//   growth: number;
//   opacity: number;
//   fade: number;
//   density: number;
//   rotation: number;
//   rotationFactor: number;
//   color: Color;
// }

// // 云朵属性接口
// export interface CloudOptions {
//   seed?: number;
//   segments?: number;
//   bounds?: [number, number, number];
//   concentrate?: 'random' | 'inside' | 'outside';
//   volume?: number;
//   smallestVolume?: number;
//   distribute?: (cloud: CloudSegmentState, index: number) => { point: Vector3; volume?: number };
//   growth?: number;
//   speed?: number;
//   fade?: number;
//   opacity?: number;
//   color?: string | number;
// }

// // 云朵组属性接口
// export interface CloudsOptions {
//   texture?: string;
//   limit?: number;
//   range?: number;
//   material?: typeof Material;
//   frustumCulled?: boolean;
// }

// 自定义云朵材质类
class CloudMaterial extends MeshLambertMaterial {
  constructor() {
    super()
    const opaque_fragment = parseInt(REVISION.replace(/\D+/g, '')) >= 154 ? 'opaque_fragment' : 'output_fragment'

    this.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute float cloudOpacity;
         varying float vOpacity;
        ` +
        shader.vertexShader.replace(
          '#include <fog_vertex>',
          `#include <fog_vertex>
           vOpacity = cloudOpacity;
          `
        )

      shader.fragmentShader =
        `varying float vOpacity;
        ` +
        shader.fragmentShader.replace(
          `#include <${opaque_fragment}>`,
          `#include <${opaque_fragment}>
           gl_FragColor = vec4(outgoingLight, diffuseColor.a * vOpacity);
          `
        )
    }
  }
}

// 云朵管理器类
class CloudManager {
  constructor(scene, options = {}) {
    this.scene = scene
    this.cloudGroup = new Group()
    this.cloudSegments = []
    this.limit = options.limit || 200
    this.range = options.range

    // 辅助属性
    this.parentMatrix = new Matrix4()
    this.translation = new Vector3()
    this.rotation = new Quaternion()
    this.cpos = new Vector3()
    this.cquat = new Quaternion()
    this.scale = new Vector3()
    this.qat = new Quaternion()
    this.dir = new Vector3(0, 0, 1)
    this.pos = new Vector3()

    // 创建主要Group
    scene.add(this.cloudGroup)

    // 初始化数据数组
    this.opacities = new Float32Array(Array.from({ length: this.limit }, () => 1))
    this.colors = new Float32Array(Array.from({ length: this.limit }, () => [1, 1, 1]).flat())

    // 加载纹理
    const textureLoader = new TextureLoader()
    this.texture = textureLoader.load(options.texture || CLOUD_URL)

    // 设置几何体和材质
    const imageBounds = [this.texture.image ? this.texture.image.width || 1 : 1, this.texture.image ? this.texture.image.height || 1 : 1]
    const max = Math.max(imageBounds[0], imageBounds[1])
    const normalizedBounds = [imageBounds[0] / max, imageBounds[1] / max]

    const geometry = new PlaneGeometry(normalizedBounds[0], normalizedBounds[1])
    const opacityAttribute = new InstancedBufferAttribute(this.opacities, 1)
    opacityAttribute.usage = DynamicDrawUsage
    geometry.setAttribute('cloudOpacity', opacityAttribute)

    // 创建材质
    const material = new CloudMaterial()
    material.map = this.texture
    material.transparent = true
    material.depthWrite = false

    // 创建实例化网格
    this.instancedMesh = new InstancedMesh(geometry, material, this.limit)
    this.instancedMesh.instanceMatrix.usage = DynamicDrawUsage
    this.instancedMesh.matrixAutoUpdate = false
    this.instancedMesh.frustumCulled = options.frustumCulled !== undefined ? options.frustumCulled : true

    // 为网格添加颜色属性
    const colorAttribute = new InstancedBufferAttribute(this.colors, 3)
    colorAttribute.usage = DynamicDrawUsage
    this.instancedMesh.instanceColor = colorAttribute

    this.cloudGroup.add(this.instancedMesh)
  }

  // 添加云朵方法
  addCloud(position = new Vector3(), options = {}) {
    const { opacity = 1, speed = 0, bounds = [5, 1, 1], segments = 20, color = '#ffffff', fade = 10, volume = 6, smallestVolume = 0.25, distribute = null, growth = 4, concentrate = 'inside', seed = Math.random() } = options

    // 随机函数
    let seedValue = seed
    const random = () => {
      const x = Math.sin(seedValue++) * 10000
      return x - Math.floor(x)
    }

    // 创建云朵组
    const cloudGroup = new Group()
    cloudGroup.position.copy(position)
    // this.cloudGroup.add(cloudGroup)

    // 为每个段创建状态
    const id = Math.random().toString(36).substring(2, 9)
    const cloudSegmentsArray = []

    for (let i = 0; i < segments; i++) {
      const segment = {
        id,
        index: i,
        segments,
        dist: 0,
        matrix: new Matrix4(),
        bounds: new Vector3(bounds[0], bounds[1], bounds[2]),
        position: new Vector3(),
        volume: 0,
        length: 0,
        ref: cloudGroup,
        speed,
        growth,
        opacity,
        fade,
        density: Math.max(0.5, random()),
        rotation: i * (Math.PI / segments),
        rotationFactor: Math.max(0.2, 0.5 * random()) * speed,
        color: new Color(color),
      }

      // 分布段
      const distributed = distribute ? distribute(segment, i) : null

      if (distributed || segments > 1) {
        segment.position.copy(segment.bounds).multiply(distributed?.point || new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1))
      }

      // 计算段长度
      const xDiff = Math.abs(segment.position.x)
      const yDiff = Math.abs(segment.position.y)
      const zDiff = Math.abs(segment.position.z)
      const max = Math.max(xDiff, yDiff, zDiff)

      segment.length = 1
      if (xDiff === max) segment.length -= xDiff / segment.bounds.x
      if (yDiff === max) segment.length -= yDiff / segment.bounds.y
      if (zDiff === max) segment.length -= zDiff / segment.bounds.z

      // 计算体积
      segment.volume = (distributed?.volume !== undefined ? distributed.volume : Math.max(Math.max(0, smallestVolume), concentrate === 'random' ? random() : concentrate === 'inside' ? segment.length : 1 - segment.length)) * volume

      cloudSegmentsArray.push(segment)
    }

    // 添加到云段数组
    this.cloudSegments.push(...cloudSegmentsArray)

    // 更新实例网格计数
    this.updateInstancedMeshCount()

    return cloudGroup
  }

  // 更新实例化网格计数
  updateInstancedMeshCount() {
    const count = Math.min(this.limit, this.range !== undefined ? this.range : this.limit, this.cloudSegments.length)

    this.instancedMesh.count = count
    this.setUpdateRange(this.instancedMesh.instanceMatrix, { start: 0, count: count * 16 })

    if (this.instancedMesh.instanceColor) {
      this.setUpdateRange(this.instancedMesh.instanceColor, { start: 0, count: count * 3 })
    }

    this.setUpdateRange(this.instancedMesh.geometry.attributes.cloudOpacity, { start: 0, count: count })
  }

  // 辅助方法：设置更新范围
  setUpdateRange(attribute, range) {
    if (attribute && attribute.updateRange) {
      attribute.updateRange.start = range.start
      attribute.updateRange.count = range.count
    }
  }

  // 移除云朵
  removeCloud(cloudGroup) {
    const id = this.cloudSegments.find((cloud) => cloud.ref === cloudGroup)?.id

    if (id) {
      this.cloudSegments = this.cloudSegments.filter((segment) => segment.id !== id)
      this.cloudGroup.remove(cloudGroup)
      this.updateInstancedMeshCount()
    }
  }

  // 清除所有云朵
  clear() {
    this.cloudSegments = []

    // 移除所有子对象，保留instancedMesh
    while (this.cloudGroup.children.length > 1) {
      const child = this.cloudGroup.children[0]
      if (child !== this.instancedMesh) {
        this.cloudGroup.remove(child)
      } else {
        this.cloudGroup.remove(this.cloudGroup.children[1])
      }
    }

    this.updateInstancedMeshCount()
  }

  // 获取云朵组
  getGroup() {
    return this.cloudGroup
  }

  // 动画更新方法
  update(camera, clock, delta) {
    const t = clock.getElapsedTime()

    this.parentMatrix.copy(this.instancedMesh.matrixWorld).invert()
    camera.matrixWorld.decompose(this.cpos, this.cquat, this.scale)

    // 更新云段位置和旋转
    for (let i = 0; i < this.cloudSegments.length; i++) {
      const config = this.cloudSegments[i]

      // 分解矩阵获取位置、旋转和缩放
      config.ref.matrixWorld.decompose(this.translation, this.rotation, this.scale)

      // 更新位置
      this.translation.add(this.pos.copy(config.position).applyQuaternion(this.rotation).multiply(this.scale))

      // 更新旋转
      this.rotation.copy(this.cquat).multiply(this.qat.setFromAxisAngle(this.dir, (config.rotation += delta * config.rotationFactor)))

      // 更新体积
      this.scale.multiplyScalar(config.volume + ((1 + Math.sin(t * config.density * config.speed)) / 2) * config.growth)

      // 组合矩阵
      config.matrix.compose(this.translation, this.rotation, this.scale).premultiply(this.parentMatrix)

      // 计算距离
      config.dist = this.translation.distanceTo(this.cpos)
    }

    // 深度排序
    this.cloudSegments.sort((a, b) => b.dist - a.dist)

    // 更新实例
    for (let i = 0; i < this.cloudSegments.length; i++) {
      const config = this.cloudSegments[i]

      // 设置不透明度
      this.opacities[i] = config.opacity * (config.dist < config.fade - 1 ? config.dist / config.fade : 1)

      // 设置矩阵和颜色
      this.instancedMesh.setMatrixAt(i, config.matrix)
      this.instancedMesh.setColorAt(i, config.color)
    }

    // 更新属性
    this.instancedMesh.geometry.attributes.cloudOpacity.needsUpdate = true
    this.instancedMesh.instanceMatrix.needsUpdate = true
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true
    }
  }

  // 销毁方法
  dispose() {
    this.clear()
    this.scene.remove(this.cloudGroup)

    // 清理资源
    this.instancedMesh.geometry.dispose()
    this.instancedMesh.material.dispose()
    if (this.texture) {
      this.texture.dispose()
    }
  }
}

export default CloudManager

import { BoxGeometry, Clock, Color, Fog, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import AddMeshes from './addMesh'
import addLight from './addLight'
import { ThreeCSGTest } from './CSGTest'
import LoadModel from './loadModel'
import { getMergedGeometry } from '../utils'
import SimplePoint from './simplePoint.ts'
import CloudManager from './cloud.js'

class Init3D {
  constructor(container) {
    this.scene = new Scene()
    window.scene = this.scene
    window.scene = this.scene
    this.renderer = new WebGLRenderer({
      powerPreference: 'high-performance',
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(this.renderer.domElement) // 绑定到 DOM
    // 监听窗口大小变化
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
    this.camera.position.set(0, 2, 5) // 设置相机位置
    this.scene.fog = new Fog(0xaaaaaa, 10, 5000)
    this.scene.background = new Color(0xffffff)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true // 启用惯性
    this.controls.dampingFactor = 0.05

    window.addEventListener('resize', () => this.onWindowResize(), false)
    // 创建时钟
    this.clock = new Clock()
    // new AddMeshes(this.scene)
    new addLight(this.scene)
    this.loader = new LoadModel(this.scene)

    // this.loadModel()
    this.loadSky()

    this.createCube()
    // 渲染循环
    this.animate()

    // 初始化云朵管理器
    this.initClouds()
  }

  onWindowResize() {
    // 更新相机的宽高比和渲染器的尺寸
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  async createCube() {
    // await this.loader.loadModel()
    new ThreeCSGTest(this.scene)
    setTimeout(() => {}, 3000)
  }

  async loadModel() {
    const obj = await this.loader.gltf_loader('/model/building/build.gltf')
    console.log(obj)
    this.build = obj.scene
    this.scene.add(this.build)

    const simple = new SimplePoint(this.scene, this.build)
  }

  async loadSky() {
    await this.loader.loadSky()
  }

  initClouds() {
    // 创建云朵管理器
    this.cloudManager = new CloudManager(this.scene, {
      limit: 200, // 最大分段数量
      frustumCulled: true,
      // 可选: 自定义纹理
      // texture: 'path/to/custom/cloud.png'
    })

    // 添加几朵云
    this.addClouds()
  }

  addClouds() {
    // 添加第一朵云
    this.cloudManager.addCloud(new Vector3(0, 0, 0), {
      segments: 30,
      bounds: [5, 1.5, 1.5],
      color: '#ffffff',
      speed: 0.3,
      growth: 4,
      volume: 6,
      fade: 10,
    })

    // 添加第二朵云
    this.cloudManager.addCloud(new Vector3(-5, 2, -2), {
      segments: 20,
      bounds: [3, 1, 1],
      color: '#f0f0f0',
      seed: 1,
      speed: 0.2,
      growth: 3,
      volume: 4,
      fade: 8,
    })

    // 添加第三朵云
    this.cloudManager.addCloud(new Vector3(5, -2, -1), {
      segments: 25,
      bounds: [4, 1.2, 1.2],
      color: '#e0e0e0',
      seed: 2,
      speed: 0.25,
      growth: 3.5,
      volume: 5,
      fade: 9,
      concentrate: 'outside', // 尝试不同的集中方式
    })

    // 添加带有自定义分布的云
    this.cloudManager.addCloud(new Vector3(0, -4, -3), {
      segments: 15,
      bounds: [2.5, 1, 1],
      color: '#f8f8f8',
      seed: 3,
      speed: 0.15,
      growth: 2.5,
      volume: 3,
      // 自定义分布函数
      distribute: (cloud, index) => {
        // 创建一个螺旋状分布
        const angle = index * 0.4
        const radius = index * 0.1
        return {
          point: new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, index * 0.1 - 0.5),
          volume: 0.5 + index * 0.03, // 变化的体积
        }
      },
    })
  }

  animate(time) {
    // 控制器更新
    this.controls.update()

    // 渲染场景（假设外部已经创建了场景）
    this.renderer.render(this.scene, this.camera)

    const delta = this.clock.getDelta()
    if (this.cloudManager) {
      this.cloudManager.update(this.camera, this.clock, delta)
    }
    // 请求下一帧
    requestAnimationFrame(() => this.animate())
  }
}

export default Init3D

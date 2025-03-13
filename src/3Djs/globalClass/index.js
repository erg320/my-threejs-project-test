import { BoxGeometry, Color, Fog, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import AddMeshes from './addMesh'
import addLight from './addLight'
import { ThreeCSGTest } from './CSGTest'
import LoadModel from './loadModel'
import { getMergedGeometry } from '../utils'
import SimplePoint from './simplePoint.ts'

class Init3D {
  constructor(container) {
    this.scene = new Scene()
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

    new AddMeshes(this.scene)
    new addLight(this.scene)
    this.loader = new LoadModel(this.scene)

    this.loadModel()

    // this.createCube()
    // 渲染循环
    this.animate()
  }

  onWindowResize() {
    // 更新相机的宽高比和渲染器的尺寸
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  async createCube() {
    await this.loader.loadModel()
    setTimeout(() => {
      new ThreeCSGTest(this.scene, ['build'])
    }, 3000)
  }

  async loadModel() {
    const obj = await this.loader.gltf_loader('/model/building/build.gltf')
    console.log(obj)
    this.build = obj.scene
    this.scene.add(this.build)

    const simple = new SimplePoint(this.scene, this.build)
  }

  animate() {
    // 控制器更新
    this.controls.update()

    // 渲染场景（假设外部已经创建了场景）
    this.renderer.render(this.scene, this.camera)

    // 请求下一帧
    requestAnimationFrame(() => this.animate())
  }
}

export default Init3D

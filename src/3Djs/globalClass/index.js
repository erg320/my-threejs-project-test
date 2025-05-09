import { BoxGeometry, Clock, Color, DoubleSide, Fog, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import AddMeshes from './addMesh'
import addLight from './addLight'
import { ThreeCSGTest } from './CSGTest'
import LoadModel from './loadModel'
import { getMergedGeometry } from '../utils'
import SimplePoint from './simplePoint.ts'
import CloudManager from './cloud.js'
import { MeshReflectorMaterial } from '../material/meshReflectorMaterial.js'
import { TransScene } from './transScene.js'
import { ScreenShareTexture, VirtualMeetingRoom } from '../material/screenShareTexture.js'

class Init3D {
  constructor(container) {
    // new TransScene()
    this.container = container
    this.scene = new Scene()
    window.scene = this.scene
    window.scene = this.scene
    this.renderer = new WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true, // 启用抗锯齿
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

    // 渲染循环
    this.animate()
    // 模糊阴影
    // this.reflectorTest()
    // 初始化云朵管理器
    // this.initClouds()
    // 投屏
    // this.videoTextureTest()

    // new VirtualMeetingRoom(this.container, this.scene, this.camera, this.renderer, this.controls)
  }

  onWindowResize() {
    // 更新相机的宽高比和渲染器的尺寸
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
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
    return

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

  videoTextureTest() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    const geometry = new PlaneGeometry(16, 9)
    const material = new MeshBasicMaterial({
      color: 0x888888, // 使用浅灰色作为默认颜色，这样可以更容易看到变化
      side: DoubleSide, // 双面显示，防止因朝向问题导致看不到
    })
    const plane = new Mesh(geometry, material)
    controls.update()
    this.scene.add(plane)

    // 显示调试信息
    const statusElement = document.createElement('div')
    this.statusElement = statusElement
    statusElement.style.position = 'absolute'
    statusElement.style.top = '10px'
    statusElement.style.left = '10px'
    statusElement.style.background = 'rgba(0,0,0,0.7)'
    statusElement.style.color = 'white'
    statusElement.style.padding = '10px'
    statusElement.style.fontFamily = 'monospace'
    statusElement.style.zIndex = '100'
    statusElement.textContent = '点击平面启动屏幕共享'
    document.body.appendChild(statusElement)
    const screenShare = new ScreenShareTexture({
      width: 1920,
      height: 1080,
      onStart: (texture) => {
        statusElement.textContent = '屏幕共享已启动'

        // 当屏幕共享开始时，更新平面的材质
        plane.material.map = texture
        plane.material.color.set(0xffffff) // 设为白色以不影响纹理显示
        plane.material.needsUpdate = true

        console.log('Screen sharing started, texture:', texture)
      },
      onStop: () => {
        statusElement.textContent = '屏幕共享已停止'

        // 当屏幕共享停止时，恢复平面的颜色
        plane.material.map = null
        plane.material.color.set(0x888888)
        plane.material.needsUpdate = true

        console.log('Screen sharing stopped')
      },
      onError: (error) => {
        statusElement.textContent = `错误: ${error.message}`
        console.error('Screen sharing error:', error)
      },
    })
    this.screenShare = screenShare

    // 点击平面启动/停止屏幕共享
    const raycaster = new Raycaster()
    const mouse = new Vector2()
    window.addEventListener('click', async (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, this.camera)
      const intersects = raycaster.intersectObject(plane)

      if (intersects.length > 0) {
        statusElement.textContent = '处理中...'
        try {
          await screenShare.toggle()
        } catch (err) {
          statusElement.textContent = `错误: ${err.message}`
        }
      }
    })
  }

  // 模糊反射
  reflectorTest() {
    // 创建一个几何体用于演示
    const boxGeometry = new BoxGeometry(2, 4, 1)
    const texture = new TextureLoader().load('/texture/2.png')
    const boxMaterial = new MeshStandardMaterial({ map: texture })
    const box = new Mesh(boxGeometry, boxMaterial)
    box.position.set(0, 2, 0)
    this.box = box
    this.scene.add(box)

    const planeGeometry = new PlaneGeometry(50, 50)
    const reflectorMaterial = new MeshReflectorMaterial({
      color: '#151515',
      roughness: 1,
      metalness: 0.6,
      mirror: 0.75, // 反射强度
      resolution: 2048, // 反射纹理分辨率
      blur: [400, 100], // 水平和垂直方向的模糊
      mixBlur: 1.0, // 混合模糊强度
      mixStrength: 15, // 混合强度
      depthScale: 1, // 深度缩放
      minDepthThreshold: 0.85, // 最小深度阈值
      maxDepthThreshold: 1.4, // 最大深度阈值
      distortion: 0.2, // 扭曲强度
      mixContrast: 1.0, // 混合对比度
      reflectorOffset: 0, // 反射平面偏移量
    })
    reflectorMaterial.setRenderer(this.renderer, this.scene, this.camera)

    const reflectorMesh = new Mesh(planeGeometry, reflectorMaterial)
    reflectorMesh.rotation.x = -Math.PI / 2
    scene.add(reflectorMesh)
    reflectorMaterial._parent = reflectorMesh
    this.reflectorMaterial = reflectorMaterial
  }

  animate(time) {
    requestAnimationFrame(() => this.animate())

    // 控制器更新
    this.controls.update()

    const delta = this.clock.getDelta()
    if (this.cloudManager) {
      this.cloudManager.update(this.camera, this.clock, delta)
    }
    this.scene.updateMatrixWorld(true)

    // 更新反射材质 - 关键步骤
    if (this.reflectorMaterial) this.reflectorMaterial.update()

    if (this.screenShare) this.screenShare.update()

    if (this.screenShare && this.screenShare.isSharing) {
      const video = this.screenShare.video
      this.statusElement.textContent = `屏幕共享中: ${video.videoWidth}x${video.videoHeight} | readyState: ${video.readyState}`
    }

    // 渲染场景（假设外部已经创建了场景）
    this.renderer.render(this.scene, this.camera)
  }
}

export default Init3D

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Portal from './index.js'

class PortalDemo {
  /**
   * 构造函数
   * @param {HTMLElement} container - 用于渲染的DOM容器
   */
  constructor(container) {
    // 保存容器引用
    this.container = container

    // 初始化场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111111)
    this.animate = this.animate.bind(this) // 提前绑定
    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000)
    this.camera.position.set(0, 3, 8)
    this.camera.lookAt(0, 0, 0)

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.container.appendChild(this.renderer.domElement)

    // 添加控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05

    // 创建灯光
    this.addLights()

    // 创建地面
    this.addFloor()

    // 创建传送门
    this.createPortal()

    // 添加窗口大小调整监听
    window.addEventListener('resize', this.onWindowResize.bind(this))

    // 启动动画循环
    this.clock = new THREE.Clock()
    this.animate()
  }

  /**
   * 添加场景灯光
   */
  addLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    this.scene.add(ambientLight)

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(1, 2, 3)
    this.scene.add(directionalLight)

    // 添加点光源在传送门附近
    const portalLight = new THREE.PointLight(0x00aaff, 2, 10)
    portalLight.position.set(0, 0, -0.5)
    this.scene.add(portalLight)
  }

  /**
   * 添加地面
   */
  addFloor() {
    const geometry = new THREE.PlaneGeometry(20, 20)
    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.1,
    })
    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -2
    this.scene.add(floor)

    // 添加网格辅助
    const gridHelper = new THREE.GridHelper(20, 20)
    gridHelper.position.y = -1.99
    this.scene.add(gridHelper)
  }

  /**
   * 创建传送门
   */
  createPortal() {
    // 根据新的Portal类实现调整参数
    this.portal = new Portal({
      scene: this.scene,
    })

    // 添加一些场景装饰
    this.addSceneDecorations()
  }

  /**
   * 添加场景装饰
   */
  addSceneDecorations() {
    // 创建几个浮动的小柱体
    const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 16)
    const cylinderMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x002244,
      metalness: 0.7,
      roughness: 0.3,
    })

    // 在场景四周创建几个发光柱子
    const positions = [new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 0, -5), new THREE.Vector3(-5, 0, 5), new THREE.Vector3(5, 0, 5)]

    this.pillars = []
    positions.forEach((position) => {
      const pillar = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
      pillar.position.copy(position)
      this.scene.add(pillar)
      this.pillars.push({
        mesh: pillar,
        initialY: position.y,
        pulseSpeed: 0.5 + Math.random() * 0.5,
      })
    })

    // 添加环境粒子效果
    // this.addParticles()
  }

  /**
   * 添加粒子效果
   */
  addParticles() {
    const particleCount = 200
    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      // 在传送门周围随机分布粒子
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * 6
      const height = -2 + Math.random() * 6

      positions[i * 3] = Math.cos(angle) * radius // x
      positions[i * 3 + 1] = height // y
      positions[i * 3 + 2] = Math.sin(angle) * radius // z
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    })

    this.particles = new THREE.Points(particleGeometry, particleMaterial)
    this.scene.add(this.particles)
  }

  /**
   * 窗口大小调整处理函数
   */
  onWindowResize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  /**
   * 动画循环
   */
  animate() {
    this.animationId = requestAnimationFrame(this.animate)
    const elapsedTime = this.clock.getElapsedTime() // 获取累计总时间

    // 更新控制器
    this.controls.update()

    // 更新传送门
    if (this.portal) {
      this.portal.update(elapsedTime) // 传递累计时间
    }

    // 更新场景装饰物
    this.updateSceneObjects(elapsedTime)

    // 渲染场景
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * 更新场景物体
   */
  updateSceneObjects(delta) {
    const time = this.clock.getElapsedTime()

    // 更新柱子
    if (this.pillars) {
      this.pillars.forEach((pillar) => {
        // 让柱子发光脉冲
        pillar.mesh.material.emissiveIntensity = 0.5 + Math.sin(time * pillar.pulseSpeed) * 0.5

        // 轻微浮动
        pillar.mesh.position.y = pillar.initialY + Math.sin(time * 0.5) * 0.1
      })
    }

    // 更新粒子
    if (this.particles) {
      // 旋转粒子系统
      this.particles.rotation.y += delta * 0.1

      // 粒子呼吸效果
      this.particles.material.opacity = 0.5 + Math.sin(time) * 0.2
    }
  }

  /**
   * 清理资源
   */
  dispose() {
    // 停止动画循环
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    // 移除事件监听器
    window.removeEventListener('resize', this.onWindowResize)

    // 移除渲染器DOM元素
    if (this.renderer && this.container) {
      this.container.removeChild(this.renderer.domElement)
    }

    // 清理控制器
    if (this.controls) {
      this.controls.dispose()
    }

    // 清理渲染器
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

export default PortalDemo

import { BoxGeometry, CylinderGeometry, Group, LinearFilter, LinearMipMapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, RGBAFormat, RGBFormat, Scene, SRGBColorSpace, Vector2, VideoTexture } from 'three'

export class ScreenShareTexture {
  constructor(options = {}) {
    // 默认选项
    this.options = Object.assign(
      {
        width: 1280,
        height: 720,
        fps: 30,
        audio: false,
        cursor: 'always',
        surfaceType: 'monitor',
        autoStart: false,
        onStart: null,
        onStop: null,
        onError: null,
      },
      options
    )

    // 创建视频元素并添加到DOM（重要修改点：添加到DOM）
    this.video = document.createElement('video')
    this.video.autoplay = true
    this.video.muted = true
    this.video.playsInline = true
    this.video.style.display = 'none' // 隐藏但保留在DOM中
    document.body.appendChild(this.video) // 添加到DOM以确保正确播放

    // 初始化纹理
    this.texture = new VideoTexture(this.video)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.colorSpace = SRGBColorSpace
    this.texture.format = RGBFormat // 修改为RGBFormat，某些设备上RGBA可能有问题

    this.isSharing = false
    this.stream = null

    // 如果设置了自动启动，则初始化时启动
    if (this.options.autoStart) {
      this.start()
    }
  }

  /**
   * 启动屏幕共享
   * @returns {Promise} 共享启动成功后的Promise
   */
  async start() {
    if (this.isSharing) return Promise.resolve(this.texture)

    try {
      console.log('Requesting display media...')
      // 请求屏幕共享的MediaStream
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: this.options.cursor,
          width: { ideal: this.options.width },
          height: { ideal: this.options.height },
          frameRate: { ideal: this.options.fps },
          displaySurface: this.options.surfaceType,
        },
        audio: this.options.audio,
      })

      console.log('Display media obtained, setting up video...')

      // 设置视频来源
      this.video.srcObject = this.stream

      // 确保视频播放
      const playPromise = this.video.play()

      // 强制更新纹理
      this.texture.needsUpdate = true

      this.isSharing = true
      console.log('Screen sharing started successfully')

      // 调用开始回调
      if (typeof this.options.onStart === 'function') {
        this.options.onStart(this.texture)
      }

      return this.texture
    } catch (error) {
      console.error('Screen sharing error:', error)
      if (typeof this.options.onError === 'function') {
        this.options.onError(error)
      }
      throw error
    }
  }

  /**
   * 停止屏幕共享
   */
  stop() {
    if (!this.isSharing) return

    console.log('Stopping screen share...')

    // 停止所有轨道
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`)
        track.stop()
      })
      this.stream = null
    }

    // 清理视频元素
    this.video.srcObject = null
    this.isSharing = false

    console.log('Screen share stopped')

    // 调用停止回调
    if (typeof this.options.onStop === 'function') {
      this.options.onStop()
    }
  }

  /**
   * 更新纹理
   * 在动画循环中调用以保证纹理更新
   */
  update() {
    if (this.isSharing && this.video.readyState >= 2) {
      if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
        this.texture.needsUpdate = true
      }
    }
  }

  /**
   * 切换屏幕共享的状态
   * @returns {Promise} 如果启动共享，则返回Promise
   */
  async toggle() {
    console.log(`Toggling screen share. Current state: ${this.isSharing ? 'active' : 'inactive'}`)
    if (this.isSharing) {
      // this.stop()
      return Promise.resolve(null)
    } else {
      return this.start()
    }
  }

  /**
   * 清理资源
   */
  dispose() {
    console.log('Disposing ScreenShareTexture...')
    this.stop()

    if (this.texture) {
      this.texture.dispose()
    }

    // 从DOM中移除视频元素
    if (this.video && this.video.parentNode) {
      this.video.parentNode.removeChild(this.video)
    }

    // 移除所有引用
    this.video = null
    this.texture = null
    this.options = null

    console.log('ScreenShareTexture disposed')
  }
}

/**
 * 使用示例：创建一个包含多个屏幕的3D虚拟会议室
 */
export class VirtualMeetingRoom {
  constructor(container, scene, camera, renderer, controls) {
    // 初始化Three.js基础组件
    this.container = container
    this.scene = scene
    this.camera = camera

    this.renderer = renderer

    container.appendChild(this.renderer.domElement)

    // 添加控制器
    this.controls = controls

    // 创建会议室
    this.createRoom()

    // 创建多个屏幕
    this.screens = []
    this.createScreens()

    // 添加窗口大小调整监听
    window.addEventListener('resize', this.onWindowResize.bind(this))

    // 启动动画循环
    this.animate()
  }

  setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // 主光源
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(10, 10, 10)
    mainLight.castShadow = true
    this.scene.add(mainLight)

    // 辅助光源
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-10, 5, -10)
    this.scene.add(fillLight)
  }

  createRoom() {
    // 地面
    const floorGeometry = new PlaneGeometry(30, 30)
    const floorMaterial = new MeshStandardMaterial({ color: 0x333333, roughness: 0.8 })
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -2
    floor.receiveShadow = true
    this.scene.add(floor)

    // 会议桌
    const tableGeometry = new CylinderGeometry(6, 6, 1, 32)
    const tableMaterial = new MeshStandardMaterial({ color: 0x5b3c24, roughness: 0.8 })
    const table = new Mesh(tableGeometry, tableMaterial)
    table.position.y = -1.5
    table.castShadow = true
    table.receiveShadow = true
    this.scene.add(table)
  }

  createScreens() {
    // 创建四个屏幕，分别放在房间的四个方向
    const screenPositions = [
      { pos: [0, 5, -10], rot: [0, 0, 0] },
      { pos: [-10, 5, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [10, 5, 0], rot: [0, -Math.PI / 2, 0] },
      { pos: [0, 5, 10], rot: [0, Math.PI, 0] },
    ]

    screenPositions.forEach((config, index) => {
      this.createScreen(config.pos, config.rot, index)
    })
  }

  createScreen(position, rotation, index) {
    // 创建屏幕共享纹理
    const screenShare = new ScreenShareTexture({
      width: 1920,
      height: 1080,
      onStart: () => console.log(`Screen ${index} started sharing`),
      onStop: () => console.log(`Screen ${index} stopped sharing`),
      onError: (err) => console.error(`Screen ${index} error:`, err),
    })

    // 创建屏幕框架几何体
    const frameGeometry = new BoxGeometry(16.2, 9.2, 0.3)
    const frameMaterial = new MeshStandardMaterial({ color: 0x333333 })
    const frame = new Mesh(frameGeometry, frameMaterial)
    frame.position.set(0, 0, -0.2)
    frame.castShadow = true

    // 创建屏幕显示几何体
    const screenGeometry = new PlaneGeometry(16, 9)
    const screenMaterial = new MeshBasicMaterial({
      color: 0x111111,
      map: screenShare.texture,
    })
    const screen = new Mesh(screenGeometry, screenMaterial)
    screen.position.set(0, 0, 0)

    // 创建一个组来包含框架和屏幕
    const screenGroup = new Group()
    screenGroup.add(frame)
    screenGroup.add(screen)
    screenGroup.position.set(...position)
    screenGroup.rotation.set(...rotation)
    this.scene.add(screenGroup)

    // 存储屏幕信息
    this.screens.push({
      group: screenGroup,
      screen: screen,
      frame: frame,
      texture: screenShare,
      isActive: false,
    })

    // 添加点击事件
    this.addScreenClickEvent(screen, index)
  }

  addScreenClickEvent(screenMesh, index) {
    // 使用射线检测来处理点击事件
    const raycaster = new Raycaster()
    const mouse = new Vector2()

    this.renderer.domElement.addEventListener('click', (event) => {
      // 计算鼠标位置
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // 更新射线
      raycaster.setFromCamera(mouse, this.camera)

      // 检查是否点击了这个屏幕
      const intersects = raycaster.intersectObject(screenMesh)

      if (intersects.length > 0) {
        this.toggleScreenShare(index)
      }
    })
  }

  async toggleScreenShare(index) {
    const screen = this.screens[index]

    if (!screen) return

    // 如果屏幕当前未共享，则启动共享
    if (!screen.isActive) {
      try {
        await screen.texture.start()
        screen.isActive = true

        // 更新材质
        screen.screen.material.color.set(0xffffff)
      } catch (error) {
        console.error(`Failed to start screen share for screen ${index}:`, error)
      }
    } else {
      // 如果屏幕当前正在共享，则停止共享
      return
      screen.texture.stop()
      screen.isActive = false

      // 恢复默认材质
      screen.screen.material.color.set(0x111111)
    }
  }

  onWindowResize() {
    // 更新相机
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    // 更新渲染器
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))

    // 更新控制器
    this.controls.update()

    // 更新所有屏幕共享纹理
    this.screens.forEach((screen) => {
      if (screen.isActive) {
        screen.texture.update()
      }
    })

    // 渲染场景
    this.renderer.render(this.scene, this.camera)
  }

  // 清理资源
  dispose() {
    // 停止所有屏幕共享
    this.screens.forEach((screen) => {
      screen.texture.dispose()
    })

    // 移除窗口大小调整监听
    window.removeEventListener('resize', this.onWindowResize)

    // 清理Three.js资源
    this.renderer.dispose()
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })

    // 从DOM中移除canvas
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}

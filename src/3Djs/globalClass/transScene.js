import gsap from 'gsap'
import { AmbientLight, BoxGeometry, Clock, Color, ConeGeometry, DirectionalLight, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, Object3D, OrthographicCamera, PerspectiveCamera, Scene, TextureLoader, Vector3, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderTransitionPass } from 'three/examples/jsm/postprocessing/RenderTransitionPass.js'

export class TransScene {
  constructor(container) {
    this.container = container || document.body
    this.params = {
      sceneAnimate: true,
      transitionAnimate: true,
      transition: 0,
      useTexture: true,
      texture: 0,
      cycle: true,
      threshold: 0.1,
    }
    this.clock = new Clock()
    this.composer = null
    this.renderTransitionPass = null
    this.textures = []

    const geoA = new BoxGeometry(2, 2, 2)
    const mtA = new MeshBasicMaterial({ color: 0xff0000 })

    const geoB = new ConeGeometry(5, 6, 7)
    const mtB = new MeshLambertMaterial({ color: 0x777777 })

    this.sceneA = new CreateScene({
      bgColor: 0x111111,
      geo: geoA,
      mt: mtA,
      rotationSpeed: new Vector3(0, 0.4, 0),
      sceneAnimate: true,
    })

    this.sceneB = new CreateScene({
      bgColor: 0x000000,
      geo: geoB,
      mt: mtB,
      rotationSpeed: new Vector3(0, 0.2, 0.1),
      sceneAnimate: true,
    })

    this.init()
  }

  init() {
    this.initTextures()

    const renderer = new WebGLRenderer({ antialias: true })
    this.renderer = renderer
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    // 使用提供的容器或默认添加到body
    this.container.appendChild(renderer.domElement)

    this.composer = new EffectComposer(renderer)

    this.renderTransitionPass = new RenderTransitionPass(this.sceneA.scene, this.sceneA.camera, this.sceneB.scene, this.sceneB.camera)

    // 确保纹理加载成功后设置
    if (this.textures.length > 0) {
      this.renderTransitionPass.setTexture(this.textures[0])
    }

    this.composer.addPass(this.renderTransitionPass)

    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)

    // 绑定this上下文
    this.onWindowResize = this.onWindowResize.bind(this)
    window.addEventListener('resize', this.onWindowResize)

    gsap.to(this.params, {
      transition: 1,
      duration: 1.5,
      repeat: -1, // 无限循环
      yoyo: true, // 来回播放
      delay: 2, // 每次循环前等待 2 秒
      onUpdate: () => {
        // 使用类的属性而非未定义的变量
        this.renderTransitionPass.setTransition(this.params.transition)

        if (this.params.cycle && (this.params.transition === 0 || this.params.transition === 1)) {
          this.params.texture = (this.params.texture + 1) % this.textures.length
          this.renderTransitionPass.setTexture(this.textures[this.params.texture])
        }
      },
    })

    // 开始动画
    this.animate()
  }

  onWindowResize() {
    this.sceneA.resize(window.innerWidth, window.innerHeight)
    this.sceneB.resize(window.innerWidth, window.innerHeight)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.composer.setSize(window.innerWidth, window.innerHeight)
  }

  initTextures() {
    const loader = new TextureLoader()

    try {
      // 添加一些基本的过渡纹理，如果没有实际文件可以先用基本形状
      for (let i = 0; i < 1; i++) {
        const texture = loader.load(
          './texture/cloud/cloud.png',
          // 成功回调
          (texture) => {
            console.log('纹理加载成功', i)
          },
          // 进度回调
          undefined,
          // 错误回调
          (err) => {
            console.warn(`无法加载纹理 ${i}:`, err)
            // 创建一个默认纹理
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 256
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, 256, 256)

            const defaultTexture = new TextureLoader().load(canvas.toDataURL())
            this.textures[i] = defaultTexture
            if (this.renderTransitionPass && i === 0) {
              this.renderTransitionPass.setTexture(defaultTexture)
            }
          }
        )
        this.textures[i] = texture
      }
    } catch (error) {
      console.error('纹理加载失败:', error)
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))

    if (this.clock) {
      const delta = this.clock.getDelta()
      if (this.sceneA) this.sceneA.update(delta)
      if (this.sceneB) this.sceneB.update(delta)
    }

    this.render()
  }

  render() {
    if (!this.renderer) return

    if (this.params.transition === 0) {
      this.renderer.render(this.sceneA.scene, this.sceneA.camera)
    } else if (this.params.transition === 1) {
      this.renderer.render(this.sceneB.scene, this.sceneB.camera)
    } else {
      // 当 0 < transition < 1 时渲染两个场景间的过渡
      if (this.composer) {
        this.composer.render()
      }
    }
  }
}

// 修改类名为首字母大写，符合类的命名规范
class CreateScene {
  constructor(options = {}) {
    const { bgColor = 0x111111, geo, mt, rotationSpeed, sceneAnimate = true } = options

    this.params = { sceneAnimate }
    this.scene = new Scene()

    // 使用透视相机而非正交相机，提供更自然的3D视觉效果
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.z = 20 // 设置相机位置

    this.init(bgColor, geo, mt, rotationSpeed)
  }

  init(bgColor, geo, mt, rotationSpeed) {
    if (!geo || !mt) {
      console.error('几何体或材质未提供')
      return
    }

    this.scene.background = new Color(bgColor)

    // 添加环境光
    const ambientLight = new AmbientLight(0xaaaaaa, 3)
    this.scene.add(ambientLight)

    // 添加方向光
    const light = new DirectionalLight(0xffffff, 3)
    light.position.set(0, 1, 4)
    this.scene.add(light)

    // 生成实例化网格
    const instancedMesh = this.generateInstancedMesh(geo, mt, 10)
    this.scene.add(instancedMesh)

    this.mesh = instancedMesh
    this.rotationSpeed = rotationSpeed || new Vector3(0, 0, 0)
  }

  generateInstancedMesh(geo, mt, count) {
    const mesh = new InstancedMesh(geo, mt, count)
    const dummy = new Object3D()
    const color = new Color()

    for (let i = 0; i < count; i++) {
      dummy.position.x = Math.random() * 40 - 20 // 缩小分布范围
      dummy.position.y = Math.random() * 40 - 20
      dummy.position.z = Math.random() * 40 - 20

      dummy.rotation.x = Math.random() * 2 * Math.PI
      dummy.rotation.y = Math.random() * 2 * Math.PI
      dummy.rotation.z = Math.random() * 2 * Math.PI

      dummy.scale.x = Math.random() * 1.5 + 0.5 // 缩小比例变化
      dummy.scale.y = Math.random() * 1.5 + 0.5
      dummy.scale.z = Math.random() * 1.5 + 0.5

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // 设置颜色
      mesh.setColorAt(i, color.setScalar(0.3 + 0.7 * Math.random()))
    }

    // 确保颜色和矩阵更新
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    return mesh
  }

  update(delta) {
    // 确保参数和网格存在
    if (!this.params || !this.mesh || !this.rotationSpeed) return

    if (this.params.sceneAnimate) {
      this.mesh.rotation.x += this.rotationSpeed.x * delta
      this.mesh.rotation.y += this.rotationSpeed.y * delta
      this.mesh.rotation.z += this.rotationSpeed.z * delta
    }
  }

  resize(width, height) {
    if (!this.camera) return

    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    } else if (this.camera.isOrthographicCamera) {
      // 正交相机的调整
      this.camera.left = -width / 2
      this.camera.right = width / 2
      this.camera.top = height / 2
      this.camera.bottom = -height / 2
      this.camera.updateProjectionMatrix()
    }
  }
}

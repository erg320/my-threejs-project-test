import { Scene, Mesh, PlaneGeometry, ShaderMaterial, Vector2, DoubleSide, AdditiveBlending } from 'three'

/**
 * 创建炫酷的传送门效果
 */
class Portal {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {Scene} options.scene - Three.js场景
   */
  constructor(options = {}) {
    this.scene = options.scene || new Scene()
    this.init()
  }

  init() {
    // 创建平面几何体
    const geometry = new PlaneGeometry(10, 10, 100, 100)

    // 创建着色器材质
    const material = new ShaderMaterial({
      vertexShader: this.vertexShader(),
      fragmentShader: this.fragmentShader(),
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
      },
      side: DoubleSide,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    // 创建网格对象
    this.mesh = new Mesh(geometry, material)
    this.scene.add(this.mesh)
  }

  /**
   * 更新动画
   * @param {number} time 时间参数
   */
  update(time) {
    this.mesh.material.uniforms.uTime.value = time
  }

  /**
   * 顶点着色器
   */
  vertexShader() {
    return `
      varying vec2 vUv;
      uniform float uTime;
      
      void main() {
        vUv = uv;
        vec4 pos = vec4(position, 1.0);
        
        // 计算极坐标
        float radius = length(pos.xy);
        float angle = atan(pos.y, pos.x);
        
        // 旋涡扭曲效果
        float vortexStrength = (1.0 - radius) * 0.3;
        float vortexAngle = angle + uTime * vortexStrength;
        
        // 应用旋涡变形
        pos.x = cos(vortexAngle) * radius;
        pos.y = sin(vortexAngle) * radius;
        
        // 添加径向扰动
        float distortion = sin(radius * 15.0 - uTime * 5.0) * 0.03;
        pos.z += distortion;
        
        gl_Position = projectionMatrix * modelViewMatrix * pos;
      }
    `
  }

  /**
   * 片段着色器
   */
  fragmentShader() {
    return `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      
      // 简单的2D噪声函数
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      // 分形噪声
      float fbm(vec2 p) {
        float total = 0.0;
        float amplitude = 0.5;
        for(int i = 0; i < 4; i++) {
          total += noise(p) * amplitude;
          p *= 2.0;
          amplitude *= 0.5;
        }
        return total;
      }
      
      void main() {
        // 计算极坐标
        vec2 uv = vUv - 0.5;
        float radius = length(uv);
        float angle = atan(uv.y, uv.x);
        
        // 颜色渐变
        vec3 color = mix(
          vec3(0.0, 0.0, 0.2), 
          vec3(0.0, 0.5, 1.0), 
          smoothstep(0.2, 1.0, 1.0 - radius)
        );
        
        // 添加白色边缘
        color = mix(color, vec3(1.0), smoothstep(0.7, 1.0, radius));
        
        // 添加动态噪声
        float n = fbm(uv * 8.0 + uTime * 0.5);
        color += n * 0.3;
        
        // 透明度衰减
        float alpha = smoothstep(0.8, 0.2, radius);
        
        gl_FragColor = vec4(color, alpha);
      }
    `
  }
}

// 导出Portal类
export default Portal

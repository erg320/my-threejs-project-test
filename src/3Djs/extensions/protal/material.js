import { ShaderMaterial, Color, AdditiveBlending, MeshBasicMaterial } from 'three'

/**
 * 创建传送门材质
 * @param {Object} options 配置选项
 * @returns {ShaderMaterial} 传送门材质
 */
export function createPortalMaterial(options = {}) {
  // 默认配置
  const config = {
    innerColor: options.innerColor || new Color(0x000066), // 深蓝色
    outerColor: options.outerColor || new Color(0xffffff), // 白色
    noiseIntensity: options.noiseIntensity || 0.5, // 噪声强度
    ...options,
  }

  // 创建自定义着色器材质
  const portalMaterial = new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      innerColor: { value: config.innerColor },
      outerColor: { value: config.outerColor },
      noiseIntensity: { value: config.noiseIntensity },
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 innerColor;
      uniform vec3 outerColor;
      uniform float noiseIntensity;
      varying vec2 vUv;
      
      // 更好的噪声函数
      vec2 hash22(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      float noise(vec2 p) {
        const float K1 = 0.366025404;
        const float K2 = 0.211324865;
        
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
        
        return dot(n, vec3(70.0));
      }
      
      void main() {
        // 计算到中心的距离
        vec2 center = vec2(0.5, 0.5);
        float dist = length(vUv - center);
        
        // 创建动态旋转角度
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        float rotationSpeed = 1.0; // 降低旋转速度
        float rotatedAngle = angle + time * rotationSpeed;
        
        // 添加动态噪声
        vec2 noiseCoord = vec2(cos(rotatedAngle) * dist * 5.0, sin(rotatedAngle) * dist * 5.0);
        float noiseValue = noise(noiseCoord + time * 0.3) * noiseIntensity;
        
        // 创建主渐变
        float gradientFactor = smoothstep(0.0, 1.0, dist + noiseValue * 0.1);
        vec3 color = mix(innerColor, outerColor, gradientFactor);
        
        // 添加旋转光束效果
        float beams = 6.0; // 光束数量
        float beamWidth = 0.15; // 光束宽度
        float beamFactor = abs(sin(rotatedAngle * beams)) * beamWidth;
        color = mix(color, outerColor, beamFactor);
        
        // 添加脉动效果
        float pulseSpeed = 1.5; // 降低脉动速度
        float pulseStrength = 0.2;
        float pulse = 0.5 + 0.5 * sin(time * pulseSpeed);
        color = mix(color, outerColor, pulse * pulseStrength * dist);
        
        // 透明度边缘（平滑过渡）
        float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
  })

  return portalMaterial
}

/**
 * 创建内圆环材质 - 带波动边缘效果
 * @param {Object} options 配置选项
 * @returns {ShaderMaterial} 内圆环材质
 */
export function createInnerRingMaterial(options = {}) {
  // 默认配置
  const config = {
    innerColor: options.innerColor || new Color(0x4444ff),
    outerColor: options.outerColor || new Color(0xddffff),
    noiseIntensity: options.noiseIntensity || 0.6,
    ...options,
  }

  return new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      innerColor: { value: config.innerColor },
      outerColor: { value: config.outerColor },
      noiseIntensity: { value: config.noiseIntensity },
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 innerColor;
      uniform vec3 outerColor;
      uniform float noiseIntensity;
      varying vec2 vUv;
      
      // 噪声函数
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      float noise(vec2 p) {
        const float K1 = 0.366025404;
        const float K2 = 0.211324865;
        
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
        
        return dot(n, vec3(70.0));
      }
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        
        // 创建旋转效果
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        float rotationSpeed = 0.7;
        float rotatedAngle = angle + time * rotationSpeed;
        
        // 扭曲UV坐标，创建波动边缘
        float dist = length(vUv - center);
        
        // 计算波动系数
        float waveSpeed = 0.5;
        float waveFreq = 8.0;
        float waveAmp = 0.08;
        float wave = sin(angle * waveFreq + time * waveSpeed) * waveAmp;
        
        // 离心波动效果 - 同步中心黑洞的波动
        float centrifugalForce = 0.05 + 0.03 * sin(time * 0.8);
        float centrifugalWave = centrifugalForce * sin(time + angle * 3.0);
        
        // 噪声扰动
        float noiseValue = noise(vec2(angle * 5.0, time * 0.2)) * 0.05 * noiseIntensity;
        
        // 计算内外边界波动
        float innerMask = smoothstep(0.37 - wave - centrifugalWave - noiseValue, 
                                     0.39 - wave - centrifugalWave - noiseValue, 
                                     dist);
        float outerMask = smoothstep(0.54 + wave + centrifugalWave + noiseValue, 
                                     0.50 + wave + centrifugalWave + noiseValue, 
                                     dist);
        
        // 结合内外边界
        float ringMask = innerMask * outerMask;
        
        // 光束效果
        float beams = 6.0;
        float beamWidth = 0.15;
        float beamFactor = abs(sin(rotatedAngle * beams)) * beamWidth;
        
        // 颜色渐变
        float gradientFactor = smoothstep(0.35, 0.55, dist + noiseValue);
        vec3 color = mix(innerColor, outerColor, gradientFactor);
        
        // 添加光束
        color = mix(color, outerColor, beamFactor);
        
        // 脉动效果
        float pulse = 0.5 + 0.5 * sin(time * 1.2);
        color = mix(color, mix(innerColor, outerColor, 0.5), pulse * 0.2);
        
        // 应用环形遮罩
        gl_FragColor = vec4(color, ringMask);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
  })
}

/**
 * 创建传送门中心材质
 * @returns {ShaderMaterial} 传送门中心材质
 */
export function createPortalCenterMaterial() {
  return new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      
      // 噪声函数
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      float noise(vec2 p) {
        const float K1 = 0.366025404;
        const float K2 = 0.211324865;
        
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
        
        return dot(n, vec3(70.0));
      }
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        
        // 添加时间变化的扭曲效果
        float distortionSpeed = 0.3; // 扭曲速度
        float distortionAmount = 0.1; // 扭曲幅度
        
        // 创建旋转效果
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        
        // 根据角度计算离心力扭曲
        float centrifugalForce = 0.05 + 0.03 * sin(time * 0.8); // 离心力随时间波动
        
        // 应用离心扭曲
        vec2 distortedUV = vUv;
        distortedUV = center + normalize(distortedUV - center) * (length(distortedUV - center) + 
                     sin(angle * 5.0 + time * distortionSpeed) * distortionAmount + 
                     centrifugalForce * sin(time + angle * 3.0));
        
        // 根据扭曲后的坐标计算距离
        float dist = length(distortedUV - center);
        
        // 添加噪声扰动
        float noiseValue = noise(distortedUV * 10.0 + time * 0.2) * 0.05;
        
        // 波动边缘半径
        float radius = 0.45;
        float waveAmount = 0.05;
        float edgeRadius = radius + sin(angle * 6.0 + time * 0.7) * waveAmount + noiseValue;
        
        // 创建黑洞效果，中心完全黑，边缘波动
        float alpha = 1.0 - smoothstep(edgeRadius, edgeRadius + 0.05, dist);
        
        // 添加边缘微弱的蓝光
        float edgeGlow = smoothstep(edgeRadius - 0.05, edgeRadius, dist) * 
                         smoothstep(edgeRadius + 0.05, edgeRadius, dist);
        
        // 内部脉动
        float innerPulse = 0.5 + 0.5 * sin(time * 0.6);
        float innerGlow = smoothstep(0.2, 0.4, dist) * innerPulse * 0.2;
        
        vec3 color = vec3(0.0, 0.0, 0.1) * edgeGlow + vec3(0.0, 0.02, 0.1) * innerGlow;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
  })
}

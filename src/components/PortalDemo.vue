<template>
  <div class="portal-demo-wrapper">
    <div class="info-panel">
      <h1>三维传送门演示</h1>
      <p>这是一个使用Three.js和着色器创建的炫酷传送门效果</p>
      <div class="controls-info">
        <h3>操作说明：</h3>
        <ul>
          <li>鼠标左键 - 旋转视角</li>
          <li>鼠标滚轮 - 缩放视图</li>
          <li>鼠标右键 - 平移视图</li>
        </ul>
      </div>
    </div>
    <div class="portal-container" ref="container"></div>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import PortalDemo from '../3Djs/extensions/protal/demo.js'

export default {
  name: 'PortalDemo',
  setup() {
    const container = ref(null)
    let demo = null

    onMounted(() => {
      if (container.value) {
        // 初始化传送门演示
        demo = new PortalDemo(container.value)

        // 日志确认
        console.log('传送门演示已初始化')
      }
    })

    onBeforeUnmount(() => {
      // 组件卸载时销毁演示
      if (demo) {
        demo.dispose()
        demo = null
        console.log('传送门演示已销毁')
      }
    })

    return {
      container,
    }
  },
}
</script>

<style scoped>
.portal-demo-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #000;
  font-family: 'Arial', sans-serif;
}

.portal-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.info-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  max-width: 300px;
  z-index: 2;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 150, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 150, 255, 0.3);
}

h1 {
  color: #00aaff;
  margin-top: 0;
  font-size: 24px;
}

p {
  color: #ccc;
  margin-bottom: 20px;
}

.controls-info {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 10px;
}

h3 {
  margin-top: 0;
  color: #00aaff;
  font-size: 16px;
}

ul {
  padding-left: 16px;
  margin: 0;
}

li {
  color: #ccc;
  margin-bottom: 5px;
  font-size: 14px;
}
</style>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import Init3D from '../3Djs/globalClass/index'

const container = ref(null)
let threeScene = null

onMounted(() => {
  threeScene = new Init3D(container.value)
})

onUnmounted(() => {
  threeScene.destroy()
})
</script>

<template>
  <div ref="container" class="three-container"></div>
</template>

<style>
.three-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>

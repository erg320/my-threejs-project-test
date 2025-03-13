import { BufferGeometry, Mesh, Object3D, Scene, Vector3 } from 'three'
import { getMergedGeometry } from '../utils'

/**
 * 简化mesh，拿到一个极简几何体
 *
 */
export default class SimplePoint {
  scene: Scene
  needSimpleMesh: Object3D
  mergedGeo: BufferGeometry
  constructor(scene: Scene, mesh: Object3D) {
    this.scene = scene
    this.needSimpleMesh = mesh

    // this.mergedGeo = getMergedGeometry(this.needSimpleMesh)
  }

  getVoxelization(geo: BufferGeometry, reductionFactor: number) {
    const position = geo.attributes.position
    const points: Vector3[] = []

    // 过滤掉一部分点
    for (let i = 0; i < position.count; i += Math.round(1 / reductionFactor)) {
      const vertex = new Vector3()
      vertex.fromBufferAttribute(position, i)
      points.push(vertex)
    }

    const voxelSize = 0.5 // 体素大小，控制精度
    const voxelMap = new Map()

    // 将每个点放到对应的体素中
    points.forEach(p => {
      const key = `${Math.round(p.x / voxelSize)},${Math.round(p.y / voxelSize)},${Math.round(p.z / voxelSize)}`;
      if (!voxelMap.has(key)) voxelMap.set(key, []);
      voxelMap.get(key).push(p);
    })

    console.log(voxelMap)
  }
}


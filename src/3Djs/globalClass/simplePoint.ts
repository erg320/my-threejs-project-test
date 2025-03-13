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

    this.mergedGeo = getMergedGeometry(this.needSimpleMesh)
  }

  getVoxelization(geo: BufferGeometry, reductionFactor: number) {
    const position = geo.attributes.position
    const points: Vector3[] = []

    for (let i = 0; i < position.count; i += Math.round(1 / reductionFactor)) {
      const vertex = new Vector3()
      vertex.fromBufferAttribute(position, i)
      points.push(vertex)
    }
  }
}


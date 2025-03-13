import { BufferGeometry, Mesh, Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const getMergedGeometry = (mesh: Object3D) => {
  let geometries: BufferGeometry[] = []
  const mergeGeo = (mesh: Object3D) => {
    if (mesh.children.length > 0) {
      mesh.children.forEach((element) => {
        mergeGeo(element)
      })
    } else {
      geometries.push((mesh as any).geometry.clone())
    }
  }
  mergeGeo(mesh)

  const mergedGeometry = mergeGeometries(geometries)
  return mergedGeometry
}

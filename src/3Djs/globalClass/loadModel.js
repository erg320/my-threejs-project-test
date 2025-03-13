import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export default class LoadModel {
  constructor(scene) {
    this.scene = scene

    this.loader = new GLTFLoader()
  }

  async loadModel() {
    this.loader.load('/model/building/build.gltf', (gltf) => {
      console.log(gltf)
      // gltf.scene.name = 'build'
      const obj = gltf.scene
      // this.scene.add(obj)
      // return
      let geometries = []
      const mergeGeo = (group) => {
        if (group.children.length > 0) {
          group.children.forEach((element) => {
            mergeGeo(element)
          })
        } else {
          geometries.push(group.geometry.clone())
        }
      }
      mergeGeo(obj)
      console.log(geometries)

      const mergedGeometry = mergeGeometries(geometries)

      const mt = new MeshStandardMaterial({
        metalness: 1,
        roughness: 0.5,
      })
      const mt2 = new MeshBasicMaterial({
        color: 0xfffaaa,
      })
      const mergedMesh = new Mesh(mergedGeometry, mt)
      mergedMesh.scale.set(0.1, 0.1, 0.1)
      mergedMesh.name = 'build'
      this.scene.add(mergedMesh)
    })
  }
}

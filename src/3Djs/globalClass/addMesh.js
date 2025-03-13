import { BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'

class AddMeshes {
  constructor(scene) {
    this.scene = scene
    const mt = this.createStandMt()
    const geo = this.createBoxGeo()
    this.createCube(geo, mt)
  }

  createCube(geo, mt) {
    this.cube = new Mesh(geo, mt)
    this.scene.add(this.cube)
  }

  createBasicMt() {
    const material = new MeshBasicMaterial({ color: 0x00ff00 })
    return material
  }

  createStandMt() {
    const standMt = new MeshStandardMaterial({
      metalness: 0.2,
      roughness: 0.1,
    })
    return standMt
  }

  createBoxGeo() {
    const geometry = new BoxGeometry()
    return geometry
  }
}

export default AddMeshes

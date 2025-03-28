import * as THREE from 'three'
import { CSG } from 'three-csg-ts'

export class ThreeCSGTest {
  constructor(scene) {
    this.scene = scene
    // this.csgList = csgList
    // this.csgListCut()
    this.runTest()
  }

  runTest() {
    // 创建基础立方体
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2)
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: false })
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial)
    boxMesh.position.set(-1, 0, 0)

    // 创建球体
    const sphereGeometry = new THREE.SphereGeometry(1.5, 32, 32)
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, wireframe: false })
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphereMesh.position.set(1, 0, 0)

    // 进行 CSG 操作
    const resultUnion = this.performCSG(boxMesh, sphereMesh, 'union')
    const resultSubtract = this.performCSG(boxMesh, sphereMesh, 'subtract')
    const resultIntersect = this.performCSG(boxMesh, sphereMesh, 'intersect')

    // 设置不同的渲染位置，避免重叠
    resultUnion.position.set(-4, 0, 0)
    resultSubtract.position.set(0, 0, 0)
    resultIntersect.position.set(4, 0, 0)

    // 添加到场景
    this.scene.add(resultUnion)
    this.scene.add(resultSubtract)
    this.scene.add(resultIntersect)
  }

  performCSG(meshA, meshB, operation) {
    const csgA = CSG.fromMesh(meshA)
    const csgB = CSG.fromMesh(meshB)
    let resultCSG

    switch (operation) {
      case 'union':
        resultCSG = csgA.union(csgB)
        break
      case 'subtract':
        resultCSG = csgA.subtract(csgB)
        break
      case 'intersect':
        resultCSG = csgA.intersect(csgB)
        break
      default:
        throw new Error(`Unknown CSG operation: ${operation}`)
    }

    const resultMesh = CSG.toMesh(resultCSG, meshA.matrixWorld)
    resultMesh.material = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: false })

    return resultMesh
  }

  csgListCut() {
    const boxGeometry = new THREE.BoxGeometry(400, 200, 400)
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: false })
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial)
    boxMesh.position.set(0, 150, 0)
    this.csgList.forEach((e) => {
      const obj = this.scene.getObjectByName(e)
      console.log(obj)
      const resultSubtract = this.performCSG(obj, boxMesh, 'subtract')
      obj.visible = false
      this.scene.add(resultSubtract)
    })
  }
}

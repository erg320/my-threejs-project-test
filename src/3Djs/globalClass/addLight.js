import { AmbientLight, DirectionalLight, HemisphereLight, SpotLight } from 'three'

export default class addLight {
  constructor(scene) {
    this.scene = scene

    this.addDirectionalLight()
    this.addAmbient()
  }

  addSpotLight() {
    const spoLight = new SpotLight(0xffff00, 1.0)
    this.scene.add(spoLight)
  }

  addDirectionalLight() {
    const directionalLight = new DirectionalLight(0xffffff, 3)
    directionalLight.position.set(50, 50, 50)
    this.scene.add(directionalLight)

    const hel = new HemisphereLight(0xffffff, 0x444444, 1.5)
    this.scene.add(hel)
  }

  addAmbient() {
    const ambient = new AmbientLight(0xffffff, 2)
    this.scene.add(ambient)
  }
}

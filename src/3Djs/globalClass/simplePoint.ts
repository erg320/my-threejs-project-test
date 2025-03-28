import { BoxGeometry, BufferGeometry, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshNormalMaterial, MeshStandardMaterial, Object3D, Scene, Vector3 } from 'three'
import { getMergedGeometry } from '../utils'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

/**
 * 简化mesh，拿到一个极简几何体
 *
 */
export default class SimplePoint {
  scene: Scene
  needSimpleMesh: Object3D
  mergedGeo: BufferGeometry
  marchingCubes!: MarchingCubes;
  constructor(scene: Scene, mesh: Object3D) {
    this.scene = scene
    this.needSimpleMesh = mesh

    this.mergedGeo = getMergedGeometry(this.needSimpleMesh)

    // 获取体素化的点
    const voxelMap = this.getVoxelizationPoint(this.mergedGeo, 1)

    // 生成并添加简化后的网格
    // this.voxelToMesh(voxelMap);
    const pointsArray = Array.from(voxelMap.values()).flat();
    const m = this.createLineSegmentsFromPoints(pointsArray)

  }

  getVoxelizationPoint(geo: BufferGeometry, reductionFactor: number) {
    const position = geo.attributes.position
    const points: Vector3[] = []

    // 过滤掉一部分点
    for (let i = 0; i < position.count; i += Math.round(1 / reductionFactor)) {
      const vertex = new Vector3()
      vertex.fromBufferAttribute(position, i)
      points.push(vertex)
    }

    const voxelSize = 10 // 体素大小，控制精度
    const voxelMap = new Map()

    // 将每个点放到对应的体素中
    points.forEach(p => {
      const key = `${Math.round(p.x / voxelSize)},${Math.round(p.y / voxelSize)},${Math.round(p.z / voxelSize)}`;
      if (!voxelMap.has(key)) voxelMap.set(key, []);
      voxelMap.get(key).push(p);
    })

    return voxelMap
  }

  /**
     * 使用 Marching Cubes 将体素点云转化为 Mesh
     */
  voxelToMesh(voxelMap: Map<string, Vector3[]>) {
    const resolution = 10; // Marching Cubes 分辨率
    this.marchingCubes = new MarchingCubes(resolution, new MeshBasicMaterial({ color: 0x00ff00 }));
    this.marchingCubes.isolation = 40; // 控制网格密度
    this.marchingCubes.enableUvs = false;
    this.marchingCubes.enableColors = false;
    // **计算点云边界，用于归一化**
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    voxelMap.forEach((points, key) => {
      points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        minZ = Math.min(minZ, p.z);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
        maxZ = Math.max(maxZ, p.z);
      });
    });
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    voxelMap.forEach((points, key) => {
      points.forEach(p => {
        const normX = ((p.x - minX) / sizeX) * resolution;
        const normY = ((p.y - minY) / sizeY) * resolution;
        const normZ = ((p.z - minZ) / sizeZ) * resolution;

        this.marchingCubes.addBall(normX, normY, normZ, 2, 2);
      });
    });
    console.log(this.marchingCubes)
    // **生成 Marching Cubes 几何体**
    const geometry = this.marchingCubes.generateBufferGeometry();

    if (!geometry.attributes.position.count) {
      console.warn("⚠️ Marching Cubes 生成的几何体为空，请检查参数！");
      return;
    }

    // 生成 Marching Cubes 的 BufferGeometry
    this.scene.add(this.marchingCubes);
    return

    // 创建 Mesh 并添加到场景
    const material = new MeshStandardMaterial({ color: 0x00ff00, wireframe: false });
    const mesh = new Mesh(geometry, material);
  }

  createLineSegmentsFromPoints(instances: any) {
    const cubeGeometry = new BoxGeometry(1, 1, 1); // 小方块的尺寸可以根据需求调整
    const cubeMaterial = new MeshBasicMaterial({ color: 0x00ff00 });

    // 创建 InstancedMesh，参数分别为几何体、材质和实例数量
    const pointsArray = Array.from(instances.values()).flat();
    const instanceMesh = new InstancedMesh(cubeGeometry, cubeMaterial, pointsArray.length);

    // 设置每个实例的变换矩阵
    const matrix = new Matrix4();
    pointsArray.forEach((point: any, index) => {
      // 根据点的位置设置变换矩阵
      matrix.setPosition(point.x / 60, point.y / 60, point.z / 60);
      instanceMesh.setMatrixAt(index, matrix);
    });
    this.scene.add(instanceMesh)
  }

}


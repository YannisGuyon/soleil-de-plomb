import * as THREE from "three";

const fireMeshes: Array<
  THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshToonMaterial,
    THREE.Object3DEventMap
  >
> = [];
const fireGeometry = new THREE.SphereGeometry(0.2, 4, 4);

export function InitFire(scene: THREE.Scene<THREE.Object3DEventMap>) {
  for (let i = 0; i < 50; ++i) {
    const fireMesh = new THREE.Mesh(
      fireGeometry,
      new THREE.MeshToonMaterial({
        color:
          (0xff << 16) |
          (Math.ceil(Math.random() * 0x80 + (0xff - 0x80)) << 8) |
          0,
      }),
    );

    fireMesh.castShadow = false;
    fireMesh.receiveShadow = false;
    fireMesh.position.y = Math.random() * 10;
    scene.add(fireMesh);
    fireMesh.visible = false;
    fireMeshes.push(fireMesh);
  }
}

export function UpdateFire(
  position: THREE.Vector3,
  duration: number,
  shouldStop: boolean,
) {
  for (let i = 0; i < 50; ++i) {
    fireMeshes[i].position.add(new THREE.Vector3(0, duration * 10, 0));
    const max_height = 5;
    if (fireMeshes[i].position.y > position.y + max_height) {
      fireMeshes[i].position.set(
        position.x + Math.random() - 0.5,
        position.y + Math.random() - 0.5,
        position.z + Math.random() - 0.5,
      );
      fireMeshes[i].visible = !shouldStop;
    }
    let scale = 1 - (fireMeshes[i].position.y - position.y) / max_height;
    // scale *= scale;
    fireMeshes[i].scale.set(scale, scale, scale);
  }
}

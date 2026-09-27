import * as THREE from "three";

import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { CreateSky, UpdateSky } from "./sky";
import { InitFire, UpdateFire } from "./fire";
import {
  LoadGround,
  LoadHouse,
  LoadTree,
  LoadWall,
  LoadBall,
  LoadWalk,
  LoadMarcel,
  LoadDeath,
} from "./gltf";
import * as CANNON from "cannon-es";

const debug_mode = false;

let canvas = document.createElement("canvas");
function CreateRenderer(canvas: HTMLCanvasElement) {
  var context = canvas.getContext("webgl2");
  if (context) {
    return new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: canvas,
      context: context,
    });
  } else {
    return new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
  }
}

let pan = 0;
let tilt = 0.2;
function updatePosition(e: MouseEvent) {
  pan -= e.movementX * 0.001;
  tilt = Math.max(
    -Math.PI * 0.2,
    Math.min(Math.PI * 0.2, tilt + e.movementY * 0.001),
  );
}
function lockChangeAlert() {
  if (document.pointerLockElement === canvas) {
    document.addEventListener("mousemove", updatePosition);
  } else {
    document.removeEventListener("mousemove", updatePosition);
  }
}
document.addEventListener("pointerlockchange", lockChangeAlert);

const renderer: THREE.WebGLRenderer = CreateRenderer(canvas);
renderer.setPixelRatio(window.devicePixelRatio);

// Environment
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  /*fov=*/ 60,
  /*aspect=*/ window.innerWidth / window.innerHeight,
  /*near=*/ 0.01,
  /*far=*/ 100,
);

const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const sound_cigale = new THREE.Audio(listener);
audioLoader.load("resources/sound/cigale.mp3", function (buffer) {
  sound_cigale.setBuffer(buffer);
  sound_cigale.setLoop(true);
  sound_cigale.setVolume(0.2);
});
const sound_paf = new THREE.Audio(listener);
audioLoader.load("resources/sound/paf.mp3", function (buffer) {
  sound_paf.setBuffer(buffer);
  sound_paf.setLoop(false);
  sound_paf.setVolume(0.5);
});
const sound_fire = new THREE.Audio(listener);
audioLoader.load("resources/sound/fire.mp3", function (buffer) {
  sound_fire.setBuffer(buffer);
  sound_fire.setLoop(false);
  sound_fire.setVolume(1.0);
});
const sound_death = new THREE.Audio(listener);
audioLoader.load("resources/sound/death.mp3", function (buffer) {
  sound_death.setBuffer(buffer);
  sound_death.setLoop(false);
  sound_death.setVolume(1.0);
});

let debug_stop = false;

// Objects
const sky_scene = new THREE.Scene();
const sky_object = CreateSky(sky_scene, debug_mode);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sun_light = new THREE.DirectionalLight(0xffffff, 3);
sun_light.castShadow = true;
sun_light.position.set(10, 100, 0);
sun_light.target.position.set(0, 0, 0);
sun_light.shadow.mapSize.width = 2048;
sun_light.shadow.mapSize.height = 2048;
sun_light.shadow.camera.near = 0.5;
sun_light.shadow.camera.far = 200;
sun_light.shadow.camera.left = -200;
sun_light.shadow.camera.right = 200;
sun_light.shadow.camera.top = 200;
sun_light.shadow.camera.bottom = -200;
sun_light.shadow.camera.updateProjectionMatrix();
sun_light.shadow.bias = -0.0001;
const raycaster = new THREE.Raycaster();

scene.add(sun_light);

LoadGround(scene);
const house = LoadHouse(scene);
const tree = LoadTree(scene);
const wall = LoadWall(scene);
LoadWalk(scene);
const marcel = LoadMarcel(scene);
const death = LoadDeath(scene);

const shadows_maker: Array<THREE.Object3D> = [house, tree, wall];

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
// Create a slippery material (friction coefficient = 0.0)
const physicsMaterial = new CANNON.Material("physics");
const physics_physics = new CANNON.ContactMaterial(
  physicsMaterial,
  physicsMaterial,
  {
    friction: 0.0,
    restitution: 0.3,
  },
);
// We must add the contact materials to the world
world.addContactMaterial(physics_physics);
const cubeShape = new CANNON.Cylinder(0.5, 0.5, 1);
const cubeBody = new CANNON.Body({ mass: 5, material: physicsMaterial });
cubeBody.addShape(cubeShape);
cubeBody.position.x = marcel.position.x;
cubeBody.position.y = marcel.position.y;
cubeBody.position.z = marcel.position.z;
cubeBody.fixedRotation = true;
// cubeBody.type = CANNON.BODY_TYPES.KINEMATIC;
// cubeBody.linearDamping = 1.0;
world.addBody(cubeBody);
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
planeBody.addShape(planeShape);
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
// planeBody.type = CANNON.BODY_TYPES.STATIC;
world.addBody(planeBody);
const treeShape = new CANNON.Cylinder(1, 1, 10);
const treeBody = new CANNON.Body({ mass: 0 });
treeBody.addShape(treeShape);
world.addBody(treeBody);

InitFire(scene);

// The shooting balls
const ballShape = new CANNON.Cylinder(0.2, 0.2, 0.4);
const ballGeometry = new THREE.SphereGeometry(0.2, 4, 4);

// Returns a vector pointing the the diretion the camera is at
function getShootDirection() {
  const vector = new THREE.Vector3(0, 0, 1);
  vector.applyEuler(marcel.rotation);
  vector.normalize();
  vector.y = 1;
  vector.normalize();
  return vector;
}

const balls: Array<CANNON.Body> = [];
const ballMeshes: Array<
  THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshStandardMaterial,
    THREE.Object3DEventMap
  >
> = [];
let duration_since_mouse_down = 0;
canvas.addEventListener("mousedown", () => {
  duration_since_mouse_down = 0;
});
canvas.addEventListener("mouseup", () => {
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  } else {
    const ballBody = new CANNON.Body({ mass: 5 });
    ballBody.addShape(ballShape);
    // ballBody.linearDamping = 0.95;
    const ballMesh = new THREE.Mesh(
      ballGeometry,
      new THREE.MeshStandardMaterial({ color: 0x000000 }),
    );

    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;

    world.addBody(ballBody);
    scene.add(ballMesh);
    balls.push(ballBody);
    ballMeshes.push(ballMesh);

    LoadBall(ballMesh);

    const shootDirection = getShootDirection();
    const shoot_velocity = 4 + Math.min(20, duration_since_mouse_down * 4);
    ballBody.velocity.set(
      shootDirection.x * shoot_velocity + cubeBody.velocity.x,
      shootDirection.y * shoot_velocity + cubeBody.velocity.y,
      shootDirection.z * shoot_velocity + cubeBody.velocity.z,
    );
    ballBody.quaternion.set(
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
    );

    // Move the ball outside the player sphere
    const x = marcel.position.x + shootDirection.x * (1 * 1.02 + 0.2);
    const y = marcel.position.y + shootDirection.y * (1 * 1.02 + 0.2);
    const z = marcel.position.z + shootDirection.z * (1 * 1.02 + 0.2);
    ballBody.position.set(x, y, z);
    ballMesh.position.copy(ballBody.position);
  }
});

camera.position.x = 0;
camera.position.y = 4;
camera.position.z = 5;
camera.lookAt(marcel.position);

let playing = false;
let finished = false;
const gros_overlay = document.getElementById("GrosOverlay")!;
const success_screen = document.getElementById("EndScreen")!;
const end_message = document.getElementById("EndMessage")! as HTMLDivElement;
let success_screen_opacity = 0;
let gros_overlay_opacity = 1;
const play_button = document.getElementById("PlayButton")! as HTMLButtonElement;
const replay_button = document.getElementById(
  "ReplayButton",
)! as HTMLButtonElement;

new HDRLoader().setPath("resources/IBL/").load("IBL.hdr", function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
});

let marcel_pousse_up = false;
let marcel_pousse_down = false;
let marcel_pousse_left = false;
let marcel_pousse_right = false;

// Inputs
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event: KeyboardEvent) {
  if (finished) {
    return;
  }
  var keyCode = event.key;
  if (
    keyCode == "ArrowUp" ||
    keyCode == "w" ||
    keyCode == "W" ||
    keyCode == "z" ||
    keyCode == "Z"
  ) {
    marcel_pousse_up = true;
  } else if (keyCode == "ArrowDown" || keyCode == "s" || keyCode == "S") {
    marcel_pousse_down = true;
  } else if (
    keyCode == "ArrowLeft" ||
    keyCode == "a" ||
    keyCode == "A" ||
    keyCode == "q" ||
    keyCode == "Q"
  ) {
    marcel_pousse_left = true;
  } else if (keyCode == "ArrowRight" || keyCode == "d" || keyCode == "D") {
    marcel_pousse_right = true;
  } else if (keyCode == " ") {
    debug_stop = !debug_stop;
    document.getElementById("Pause")!.style.display = debug_stop
      ? "block"
      : "none";
  }
}

document.addEventListener("keyup", onDocumentKeyUp, false);
function onDocumentKeyUp(event: KeyboardEvent) {
  if (finished) {
    return;
  }
  var keyCode = event.key;
  if (
    keyCode == "ArrowUp" ||
    keyCode == "w" ||
    keyCode == "W" ||
    keyCode == "z" ||
    keyCode == "Z"
  ) {
    StartPlaying();
    marcel_pousse_up = false;
  } else if (keyCode == "ArrowDown" || keyCode == "s" || keyCode == "S") {
    StartPlaying();
    marcel_pousse_down = false;
  } else if (
    keyCode == "ArrowLeft" ||
    keyCode == "a" ||
    keyCode == "A" ||
    keyCode == "q" ||
    keyCode == "Q"
  ) {
    StartPlaying();
    marcel_pousse_left = false;
  } else if (keyCode == "ArrowRight" || keyCode == "d" || keyCode == "D") {
    StartPlaying();
    marcel_pousse_right = false;
  }
}

function StartPlaying() {
  if (!playing) {
    playing = true;
    sound_cigale.play();
    canvas.requestPointerLock();
  }
}
play_button.addEventListener("click", StartPlaying);
replay_button.addEventListener("click", () => {
  location.reload();
});

// Events
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

let previous_timestamp: null | number = null;
let time = 0;
let average_duration = 0.016;
let marcel_is_unsafe_duration = 0;
function renderLoop(timestamp: number) {
  requestAnimationFrame(renderLoop);

  if (previous_timestamp == null) {
    previous_timestamp = timestamp;
  }
  average_duration = THREE.MathUtils.lerp(
    average_duration,
    (timestamp - previous_timestamp) / 1000,
    0.1,
  );
  const duration = average_duration;

  if (playing && gros_overlay_opacity > 0) {
    gros_overlay_opacity = Math.max(0, gros_overlay_opacity - duration);
    gros_overlay.style.opacity = gros_overlay_opacity.toString();
    if (gros_overlay_opacity == 0) {
      gros_overlay.style.display = "none";
    }
  }

  if (playing && !debug_stop && !finished) {
    duration_since_mouse_down += duration;

    // Update death location
    let death_move = marcel.position.clone().sub(death.position);
    death_move.y = 0;
    death_move.setLength(duration * 1);
    death.position.add(death_move);
    death.position.y = 1 + Math.sin(time) * 0.5;
    death.lookAt(marcel.position);

    // Update player location
    let movement_forward = marcel.position.clone();
    movement_forward.sub(camera.position);
    movement_forward.y = 0;
    movement_forward.normalize();
    let movement_right = new THREE.Vector3(
      -movement_forward.z,
      0,
      movement_forward.x,
    );

    let marcel_pousse = new THREE.Vector3();
    if (marcel_pousse_up) {
      marcel_pousse.add(movement_forward);
    }
    if (marcel_pousse_down) {
      marcel_pousse.sub(movement_forward);
    }
    if (marcel_pousse_left) {
      marcel_pousse.sub(movement_right);
    }
    if (marcel_pousse_right) {
      marcel_pousse.add(movement_right);
    }
    if (marcel_pousse.lengthSq() > 0) {
      marcel_pousse.setLength(50);
      cubeBody.applyForce(
        new CANNON.Vec3(marcel_pousse.x, marcel_pousse.y, marcel_pousse.z),
      );
      let velocity = new THREE.Vector3(
        cubeBody.velocity.x,
        0,
        cubeBody.velocity.z,
      );
      if (velocity.length() > 5) {
        cubeBody.velocity.x *= 5 / velocity.length();
        cubeBody.velocity.z *= 5 / velocity.length();
      }
    } else {
      cubeBody.velocity.x /= 2;
      cubeBody.velocity.z /= 2;
    }

    world.step(duration * 2);

    // Copy coordinates from Cannon to Three.js
    marcel.position.set(
      cubeBody.position.x,
      cubeBody.position.y,
      cubeBody.position.z,
    );
    // box.quaternion.set(
    //   cubeBody.quaternion.x,
    //   cubeBody.quaternion.y,
    //   cubeBody.quaternion.z,
    //   cubeBody.quaternion.w,
    // );
    // Update ball positions
    for (let i = 0; i < balls.length; i++) {
      ballMeshes[i].position.copy(balls[i].position);
      ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }

    let death_position = death.position
      .clone()
      .add(new THREE.Vector3(0, 0.5, 0));
    for (let i = 0; i < balls.length; i++) {
      if (
        balls[i].velocity.lengthSquared() > 0.01 &&
        ballMeshes[i].position.distanceToSquared(death_position) < 1 * 1
      ) {
        let vec = marcel.position
          .clone()
          .sub(death.position)
          .multiplyScalar(1.2);
        let new_death_position = marcel.position.clone().add(vec);
        death.position.set(new_death_position.x, 0, new_death_position.z);
        sound_paf.position.set(
          death.position.x,
          death.position.y,
          death.position.z,
        );
        sound_paf.play();
      }
    }

    let velocity = new THREE.Vector3(
      cubeBody.velocity.x,
      0,
      cubeBody.velocity.z,
    );
    if (velocity.lengthSq() > duration) {
      marcel.lookAt(marcel.position.clone().add(velocity));
    }

    // Update camera location
    let camera_position = marcel.position
      .clone()
      .add(
        new THREE.Vector3(0, 0, 6 + tilt * 6)
          .applyAxisAngle(new THREE.Vector3(-1, 0, 0), tilt)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), pan),
      );
    camera.position.set(
      camera_position.x,
      camera_position.y,
      camera_position.z,
    );
    camera.lookAt(marcel.position);
    camera.position.add(new THREE.Vector3(0, 2, 0));

    time += duration;
  }
  const day_progress = Math.max(0, Math.min(1, (time - 1) / 60));
  if (playing && !debug_stop && !finished) {
    const sun_position = UpdateSky(sky_object, day_progress);
    sun_light.position.copy(sun_position.clone().multiplyScalar(100));

    raycaster.set(
      marcel.position.clone().add(new THREE.Vector3(0, 0, 0)),
      sun_position.clone().normalize(),
    );
    raycaster.far = 100;
    const intersects = raycaster.intersectObjects(shadows_maker, true);
    const marcel_is_safe = intersects.length > 0;
    UpdateFire(marcel.position, duration, marcel_is_safe);
    if (marcel_is_safe) {
      marcel_is_unsafe_duration = 0;
      sound_fire.stop();
    } else {
      marcel_is_unsafe_duration += duration;
      sound_fire.play();
    }

    if (day_progress == 1) {
      finished = true;
      success_screen.style.display = "block";
      end_message.textContent = "Success!";
      document.exitPointerLock();
    } else {
      let diff = new THREE.Vector2(
        death.position.x - marcel.position.x,
        death.position.z - marcel.position.z,
      );
      if (diff.lengthSq() < 1) {
        finished = true;
        success_screen.style.display = "block";
        end_message.textContent = "Death!";
        document.exitPointerLock();
        sound_death.play();
        sound_fire.stop();
      }
    }
    if (!finished && marcel_is_unsafe_duration > 3) {
      finished = true;
      success_screen.style.display = "block";
      end_message.textContent = "Burnt!";
      document.exitPointerLock();
    }
  }

  if (finished && success_screen_opacity != 1) {
    success_screen_opacity += duration * 3;
    success_screen.style.opacity = success_screen_opacity.toString();
  }

  document.getElementById("Fps")!.textContent =
    (1.0 / average_duration).toFixed(1).toString() + " fps";

  renderer.autoClear = false;
  renderer.clear();

  renderer.toneMappingExposure = 0.1;
  renderer.render(sky_scene, camera);
  renderer.toneMappingExposure = 0.5;

  renderer.render(scene, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);

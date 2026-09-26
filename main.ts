import * as THREE from "three";

//import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { CreateSky, UpdateSky } from "./sky";
import { LoadGround, LoadHouse, LoadTree, LoadWall, LoadWalk } from "./gltf";
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
renderer.toneMappingExposure = 0.1;
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
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load("resources/sound/cigale.mp3", function (buffer) {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.2);
});

let debug_stop = false;

// Objects
const sky_scene = new THREE.Scene();
const sky_object = CreateSky(sky_scene, debug_mode);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sun_light = new THREE.DirectionalLight(0xffffff, 3);
scene.add(sun_light);
const spot = new THREE.PointLight(0xffffff, 1, 400);
scene.add(spot);

spot.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  ),
);
spot.position.x = -20;
spot.position.y = 20;
spot.position.z = 20;

// Debug cube
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x000000 }),
);
scene.add(box);
box.position.x = 5;
box.position.y = 0.51;
box.position.z = 0;

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
const cubeBody = new CANNON.Body({ mass: 0.1, material: physicsMaterial });
cubeBody.addShape(cubeShape);
cubeBody.position.x = box.position.x;
cubeBody.position.y = box.position.y;
cubeBody.position.z = box.position.z;
// cubeBody.linearDamping = 1.0;
world.addBody(cubeBody);
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
planeBody.addShape(planeShape);
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(planeBody);
const treeShape = new CANNON.Cylinder(1, 1, 10);
const treeBody = new CANNON.Body({ mass: 0 });
treeBody.addShape(treeShape);
world.addBody(treeBody);

// The shooting balls
const shootVelocity = 40;
const ballShape = new CANNON.Sphere(0.2);
const ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);

// Returns a vector pointing the the diretion the camera is at
function getShootDirection() {
  const vector = new THREE.Vector3(0, 0, 1);
  vector.unproject(camera);
  const ray = new THREE.Ray(box.position, vector.sub(box.position).normalize());
  return ray.direction;
}

const balls: Array<CANNON.Body> = [];
const ballMeshes: Array<
  THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshStandardMaterial,
    THREE.Object3DEventMap
  >
> = [];
canvas.addEventListener("click", async () => {
  if (!document.pointerLockElement) {
    await canvas.requestPointerLock();
  } else {
    const ballBody = new CANNON.Body({ mass: 1 });
    ballBody.addShape(ballShape);
    ballBody.linearDamping = 0.95;
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

    const shootDirection = getShootDirection();
    ballBody.velocity.set(
      shootDirection.x * shootVelocity,
      shootDirection.y * shootVelocity,
      shootDirection.z * shootVelocity,
    );

    // Move the ball outside the player sphere
    const x = box.position.x + shootDirection.x * (1 * 1.02 + ballShape.radius);
    const y = box.position.y + shootDirection.y * (1 * 1.02 + ballShape.radius);
    const z = box.position.z + shootDirection.z * (1 * 1.02 + ballShape.radius);
    ballBody.position.set(x, y, z);
    ballMesh.position.copy(ballBody.position);
  }
});

camera.position.x = 0;
camera.position.y = 4;
camera.position.z = 5;
camera.lookAt(box.position);

// Debug cube
const boxx = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.1, 0.1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 }),
);
scene.add(boxx);
boxx.position.x = 2;
boxx.position.y = 0;
boxx.position.z = 0;

// Debug cube
const boxy = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.1, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
);
scene.add(boxy);
boxy.position.x = 0;
boxy.position.y = 2;
boxy.position.z = 0;

// Debug cube
const boxz = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.1, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x0000ff }),
);
scene.add(boxz);
boxz.position.x = 0;
boxz.position.y = 0;
boxz.position.z = 2;

LoadGround(scene);
LoadHouse(scene);
LoadTree(scene);
LoadWall(scene);
LoadWalk(scene);

let playing = false;
let finished = false;
const gros_overlay = document.getElementById("GrosOverlay")!;
const encore_plus_gros_overlay = document.getElementById(
  "EncorePlusGrosOverlay",
)!;
let encore_plus_gros_overlay_opacity = 0;
let gros_overlay_opacity = 1;
const play_button = document.getElementById("PlayButton")!;
const replay_button = document.getElementById("ReplayButton")!;

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

// function GameLoop(duration: number, factor: number) {
//   const speed_min = 0.5;
//   const speed_max = 2.0;
//   const speed =
//     speed_min +
//     Math.min(
//       speed_max - speed_min,
//       (speed_max - speed_min) * Math.pow(factor, 2),
//     );
//   let step = duration * speed;
//   while (step > 0) {
//     // player.Update(Math.min(step, 0.001));
//     // const position = player.GetAbsolutePosition();
//     // const displacement =
//     //   1 - Noise3D(position.clone().multiplyScalar(0.5)) * 0.05;
//     // position.multiplyScalar(displacement);
//     // rails.AddPoint(position, player.GetAbsoluteRotation());
//     // train.AddPoint(position, player.GetAbsoluteRotation());
//     step -= 0.001;
//   }
// }
function StartPlaying() {
  if (!playing) {
    playing = true;
    sound.play();

    // Kickstart trails
    // for (let i = 0; i < 1000; ++i) {
    //   player.Update(0.001);
    //   const position = player.GetAbsolutePosition();
    //   const displacement =
    //     1 - Noise3D(position.clone().multiplyScalar(0.5)) * 0.05;
    //   position.multiplyScalar(displacement);
    //   rails.AddPoint(position, player.GetAbsoluteRotation());
    //   train.AddPoint(position, player.GetAbsoluteRotation());
    //   if (rails.IsLoaded()) {
    //     break;
    //   }
    // }
  }
}
play_button.addEventListener("click", StartPlaying);
replay_button.addEventListener("click", () => {
  location.reload();
});

// var pre_post_effect = new PrePostEffect();

// Events
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

// function KeepWithin(
//   object: THREE.Object3D,
//   target: THREE.Vector3,
//   max_distance: number,
//   fixed_elevation: number,
// ) {
//   const object_to_target = target.clone().sub(object.position);
//   if (object_to_target.length() > max_distance) {
//     object_to_target.setLength(max_distance);
//     const new_object_position = target.clone().sub(object_to_target);
//     new_object_position.setLength(fixed_elevation);
//     object.position.x = new_object_position.x;
//     object.position.y = new_object_position.y;
//     object.position.z = new_object_position.z;
//   }
// }

let previous_timestamp: null | number = null;
let time = 0;
let average_duration = 0.016;
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
  const duration = average_duration; // Can also be hardcoded to 0.016.

  if (playing && gros_overlay_opacity > 0) {
    gros_overlay_opacity = Math.max(0, gros_overlay_opacity - duration);
    gros_overlay.style.opacity = gros_overlay_opacity.toString();
    if (gros_overlay_opacity == 0) {
      gros_overlay.style.display = "none";
    }
  }

  if (playing && !debug_stop && !finished) {
    // Update player location
    let movement_forward = box.position.clone();
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
      marcel_pousse.setLength(10);
      cubeBody.applyForce(
        new CANNON.Vec3(marcel_pousse.x, marcel_pousse.y, marcel_pousse.z),
      );
      // box.position.add(marcel_pousse);
      // box.lookAt(box.position.clone().add(marcel_pousse));
      // cubeBody.applyImpulse(
      //   new CANNON.Vec3(marcel_pousse.x, 10000, marcel_pousse.z),
      // );
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

    world.step(duration);

    // world.step(duration);

    // Copy coordinates from Cannon to Three.js
    box.position.set(
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

    let velocity = new THREE.Vector3(
      cubeBody.velocity.x,
      0,
      cubeBody.velocity.z,
    );
    if (velocity.lengthSq() > duration) {
      box.lookAt(box.position.clone().add(velocity));
    }

    // Update camera location
    let camera_position = box.position
      .clone()
      .add(
        new THREE.Vector3(0, 0, 10)
          .applyAxisAngle(new THREE.Vector3(-1, 0, 0), tilt)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), pan),
      );
    camera.position.set(
      camera_position.x,
      camera_position.y,
      camera_position.z,
    );
    // let vec = camera.position;
    // vec.sub(box.position);
    // vec.y = 0;
    // vec.setLength(10);
    // vec.add(box.position);
    // camera.position.set(vec.x, box.position.y + 5, vec.z);
    camera.lookAt(box.position);

    time += duration;
  }
  const day_progress = Math.max(0, Math.min(1, (time - 1) / 180));
  if (playing && !debug_stop && !finished) {
    UpdateSky(sky_object, day_progress);
    // GameLoop(duration, day_progress);

    if (day_progress == 1) {
      finished = true;
      encore_plus_gros_overlay.style.display = "block";
      console.log("finished");
    }
    // const damage = pre_post_effect.GetDamage();
    // if (damage > 0.0) {
    //   pre_post_effect.SetDamage(damage - 0.01);
    // } else {
    //   pre_post_effect.SetDamage(0.0);
    // }
    // const score = pre_post_effect.GetScore();
    // if (score > 0.0) {
    //   pre_post_effect.SetScore(score - 0.01);
    // } else {
    //   pre_post_effect.SetScore(0.0);
    // }
  }

  if (finished && encore_plus_gros_overlay_opacity != 1) {
    encore_plus_gros_overlay_opacity += duration * 3;
    encore_plus_gros_overlay.style.opacity =
      encore_plus_gros_overlay_opacity.toString();
  }

  // const tip_position = player.GetAbsolutePosition();
  // if (finished) {
  //   train.LaunchIntoSpace();
  // } else {
  //   train.SetPosition(tip_position);
  // }
  // if (playing && !debug_stop) {
  //   train.SpawnSmoke();
  // }

  // const ideal_camera_position = player.GetIdealCameraPosition(camera_distance);
  // const ideal_camera_rotation = player.GetAbsoluteRotation();

  if (gros_overlay_opacity > 0.95) {
    // camera_placeholder.position.x = ideal_camera_position.x;
    // camera_placeholder.position.y = ideal_camera_position.y;
    // camera_placeholder.position.z = ideal_camera_position.z;
    // camera_placeholder.setRotationFromQuaternion(ideal_camera_rotation);
  } else {
    // const ideal_to_tip = tip_position.clone().sub(ideal_camera_position);
    // // const camera_to_tip = tip_position.clone().sub(camera_placeholder.position);
    // // camera_to_tip.setLength(ideal_to_tip.length());
    // // const new_camera_position = tip_position.clone().sub(camera_to_tip);
    // // new_camera_position.setLength(ideal_camera_position.length());
    // // camera_placeholder.position.x = new_camera_position.x;
    // // camera_placeholder.position.y = new_camera_position.y;
    // // camera_placeholder.position.z = new_camera_position.z;
    // KeepWithin(
    //   camera_placeholder,
    //   tip_position,
    //   ideal_to_tip.length(),
    //   ideal_camera_position.length(),
    // );
    // KeepWithin(
    //   camera_placeholder,
    //   ideal_camera_position,
    //   ideal_to_tip.length() * 0.8,
    //   ideal_camera_position.length(),
    // );
    // camera_placeholder.setRotationFromQuaternion(ideal_camera_rotation);
    // camera_placeholder.setRotationFromQuaternion(
    //   new THREE.Quaternion().slerpQuaternions(
    //     camera_placeholder.quaternion,
    //     ideal_camera_rotation,
    //     lerp_factor
    //   )
    // );
    // const new_camera_to_tip = tip_position
    //   .clone()
    //   .sub(camera_placeholder.position);
    // camera_placeholder.setRotationFromQuaternion(
    //   new THREE.Quaternion().setFromUnitVectors(
    //     new_camera_to_tip.normalize(),
    //     camera_placeholder.position.clone().normalize()
    //   )
    // );
    // const new_camera_to_tip = tip_position
    //   .clone()
    //   .sub(camera_placeholder.position);
    // const quat = new THREE.Quaternion();
    // new_camera_to_tip.normalize();
    // const euler = new THREE.Euler(new_camera_to_tip.x,
    //   new_camera_to_tip.y, new_camera_to_tip.z);
    // quat.setFromEuler(euler);
    // const new_camera_to_tip = tip_position
    //   .clone()
    //   .sub(camera_placeholder.position);
    // new_camera_to_tip.normalize();
    // camera_placeholder.setRotationFromQuaternion(
    //   new THREE.Quaternion().setFromUnitVectors(
    //     camera_placeholder.position.clone().normalize(),new_camera_to_tip
    //   )
    // );
    // camera_placeholder.position.x = 0;
    // camera_placeholder.position.y = 0;
    // camera_placeholder.position.z = -12;
    // const rotationMatrix = new THREE.Matrix4();
    // rotationMatrix.lookAt(
    //   tip_position,
    //   camera_placeholder.position,
    //   camera_placeholder.position.clone().normalize().negate(),
    // );
    // camera_placeholder.setRotationFromQuaternion(
    //   new THREE.Quaternion().setFromRotationMatrix(rotationMatrix),
    // );
  }
  // camera_placeholder.position.lerpVectors(
  //   camera_placeholder.position,
  //   ideal_camera_position,
  //   lerp_factor
  // );
  // const ideal_to_tip = player.GetAbsolutePosition().sub(ideal_camera_position);
  // const camera_to_tip = player
  //   .GetAbsolutePosition()
  //   .sub(camera_placeholder.position);
  // camera_placeholder.position
  //   .add(camera_to_tip)
  //   .sub(camera_to_tip.clone().setLength(ideal_to_tip.length()));

  // camera_placeholder.position.lerpVectors(
  //   camera_placeholder.position,
  //   ideal_camera_position,
  //   lerp_factor
  // );
  // camera_placeholder.setRotationFromQuaternion(
  //   new THREE.Quaternion().slerpQuaternions(
  //     camera_placeholder.quaternion,
  //     ideal_camera_rotation,
  //     lerp_factor
  //   )
  // );
  // planet.ReduceBuildings(camera_placeholder.position);

  if (playing && !finished) {
    // var is_collide = planet.CheckCollision(
    //   train.GetAbsolutePosition(),
    //   train.GetAbsoluteDirection().negate(),
    //   1 + factor,
    // );
    // if (is_collide) {
    //   pre_post_effect.SetDamage(0.6);
    //   collision_count++;
    //   document.getElementById("Damage")!.textContent =
    //     "Damage: " + collision_count.toString();
    // }
    // var is_collide_crate = planet.CheckCollisionCrate(
    //   train.GetAbsolutePosition(),
    // );
    // if (is_collide_crate) {
    //   pre_post_effect.SetScore(0.6);
    //   crate_count++;
    //   document.getElementById("Score")!.textContent =
    //     "Score: " + crate_count.toString();
    // }
  }
  if (!debug_stop) {
    // planet.UpdateHit(duration);
  }

  document.getElementById("Fps")!.textContent =
    (1.0 / average_duration).toFixed(1).toString() + " fps";

  if (playing && !debug_stop) {
    // train.UpdateSmoke(duration, camera.quaternion);
  }
  // camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer.autoClear = false;
  renderer.clear();
  // pre_post_effect.PreRender(renderer, camera);

  renderer.render(sky_scene, camera);

  renderer.render(scene, camera);
  // pre_post_effect.PostRender(renderer, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

function CreateRenderer() {
  let canvas = document.createElement("canvas");
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

const renderer: THREE.WebGLRenderer = CreateRenderer();
renderer.setPixelRatio(window.devicePixelRatio);

// Environment
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  /*fov=*/ 60,
  /*aspect=*/ window.innerWidth / window.innerHeight,
  /*near=*/ 0.001,
  /*far=*/ 100,
);
const camera_position = new THREE.PerspectiveCamera(
  /*fov=*/ 60,
  /*aspect=*/ window.innerWidth / window.innerHeight,
  /*near=*/ 0.001,
  /*far=*/ 100,
);
const debug_camera_position = new THREE.PerspectiveCamera(
  /*fov=*/ 60,
  /*aspect=*/ window.innerWidth / window.innerHeight,
  /*near=*/ 0.001,
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

const controls = new OrbitControls(debug_camera_position, renderer.domElement);
let debug_camera = false;
let debug_stop = false;

// Objects
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
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

const camera_representation = new THREE.Mesh(
  new THREE.ConeGeometry(0.2, 1),
  new THREE.MeshStandardMaterial({ color: 0x996666 }),
);
scene.add(camera_representation);

// Debug cube
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x000000 }),
);
scene.add(box);
box.position.x = 0;
box.position.y = 2;
box.position.z = 0;

camera_position.position.x = 0;
camera_position.position.y = 4;
camera_position.position.z = 5;
camera_position.lookAt(box.position);
debug_camera_position.position.x = 10;
debug_camera_position.position.y = 1;
debug_camera_position.position.z = 20;
debug_camera_position.lookAt(box.position);

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

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide }),
);
scene.add(ground);
ground.position.x = 0;
ground.position.y = 0;
ground.position.z = 0;
ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

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
  if (keyCode == "Shift") {
    debug_camera = !debug_camera;
  } else if (
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
    let marcel_pousse = new THREE.Vector3();
    if (marcel_pousse_up) {
      marcel_pousse.z -= 1;
    }
    if (marcel_pousse_down) {
      marcel_pousse.z += 1;
    }
    if (marcel_pousse_left) {
      marcel_pousse.x -= 1;
    }
    if (marcel_pousse_right) {
      marcel_pousse.x += 1;
    }
    marcel_pousse.multiplyScalar(duration * 5);
    box.position.add(marcel_pousse);

    camera_position.lookAt(box.position);
    let vec = camera_position.position;
    vec.sub(box.position);
    vec.setLength(5);
    vec.add(box.position);
    camera_position.position.set(vec.x, vec.y, vec.z);

    time += duration;
  }
  const factor = Math.max(0, Math.min(1, (time - 1) / 3600));
  if (playing && !debug_stop && !finished) {
    // GameLoop(duration, factor);

    if (factor == 1) {
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

  if (debug_camera) {
    controls.update();
    debug_camera_position.getWorldPosition(camera.position);
    debug_camera_position.getWorldQuaternion(camera.quaternion);
    camera_position.getWorldPosition(camera_representation.position);
    camera_position.getWorldQuaternion(camera_representation.quaternion);
    camera_representation.rotateX(Math.PI * 0.5);
    camera_representation.visible = true;
  } else {
    camera_position.getWorldPosition(camera.position);
    camera_position.getWorldQuaternion(camera.quaternion);
    camera_representation.visible = false;
  }

  if (playing && !debug_stop) {
    // train.UpdateSmoke(duration, camera.quaternion);
  }
  // camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer.autoClear = false;
  renderer.clear();
  // pre_post_effect.PreRender(renderer, camera);
  renderer.render(scene, camera);
  // pre_post_effect.PostRender(renderer, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);

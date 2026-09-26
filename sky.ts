import * as THREE from "three";
import { Sky } from 'three/addons/objects/Sky.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
function GUIDebug(sky: Sky, sun: THREE.Vector3) {
  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.98,
    elevation: 90,
    azimuth: 0
  };
  function guiChanged() {
    const uniforms = sky.material.uniforms;
    uniforms[ 'turbidity' ].value = effectController.turbidity;
    uniforms[ 'rayleigh' ].value = effectController.rayleigh;
    uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
    uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;
    const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
    const theta = THREE.MathUtils.degToRad( effectController.azimuth );
    sun.setFromSphericalCoords( 1, phi, theta );
    uniforms[ 'sunPosition' ].value.copy( sun );
  }
  const gui = new GUI();
  gui.add( effectController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, 'rayleigh', 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'elevation', 0, 90, 0.1 ).onChange( guiChanged );
  gui.add( effectController, 'azimuth', - 180, 180, 0.1 ).onChange( guiChanged );
  guiChanged();
}

function CreateSky(scene: THREE.Scene, debug_mode: boolean) {
  const sky = new Sky();
  scene.add(sky);
  sky.scale.setScalar(1000);
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 1;
  skyUniforms['rayleigh'].value = 3;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.98;
  skyUniforms['cloudCoverage'].value = 0.0;
  const sun = new THREE.Vector3();
  const phi = 0;
  const theta = Math.PI;
  sun.setFromSphericalCoords(1, phi, theta);
  if (debug_mode) {
    GUIDebug(sky, sun);
  }
  return sky;
}

function UpdateSky(sky: Sky, day_progress: number) {
  const sun = new THREE.Vector3();
  const phi = day_progress * Math.PI / 2.0;
  const theta = Math.PI;
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);
}

export { CreateSky, UpdateSky }
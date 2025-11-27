import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { DRACOLoader, GLTFLoader, Sky } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { remapMixamoAnimationToVRM } from './Utils/remapMixamoAnimationToVRM';


const canvas = document.querySelector('.webgl');

const scene = new THREE.Scene();

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const fbxLoader = new FBXLoader();
dracoLoader.setDecoderPath('../static/draco/')
gltfLoader.setDRACOLoader(dracoLoader)
  gltfLoader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });
const sizes ={
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize',()=>{
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.x = -4;
camera.position.y = 3;
camera.position.z = 0;
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.CineonToneMapping;

//plane
const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(7,7),
  new THREE.MeshStandardMaterial({
    color:'	#818589',
    roughness :0.5,
    metalness:0.2,
    side:THREE.DoubleSide

  })
)
plane.receiveShadow = true;
plane.rotation.x = - Math.PI * 0.5;
scene.add(plane)

//model

let currentAnimationUrl = '/assets/Waving.fbx'
let currentVrm = undefined
let currentMixer = undefined
let currentAction = undefined;
let vrm
gltfLoader.load('/assets/Sample_Female.vrm',(gltf)=>{
   vrm = gltf.userData.vrm;
   // calling this function greatly improves the performance
			VRMUtils.removeUnnecessaryVertices( gltf.scene );
			VRMUtils.combineSkeletons( gltf.scene );
			VRMUtils.combineMorphs( vrm );
      if ( currentVrm ) {

				scene.remove( currentVrm.scene );

				VRMUtils.deepDispose( currentVrm.scene );

			}
      currentVrm = vrm;
  vrm.scene.rotation.y = Math.PI * 0.5;
  scene.add(vrm.scene);
  vrm.scene.traverse((object)=>{
    if(object.isMesh){
      object.castShadow = true;
      object.frustumCulled = false;
    }
  })
  currentMixer = new THREE.AnimationMixer( currentVrm.scene );
  if ( currentAnimationUrl ) {

				loadFBX( currentAnimationUrl );

			}
})
async function loadFBX(animationUrl){
  currentAnimationUrl = animationUrl

  if(currentMixer){
    const clip = await remapMixamoAnimationToVRM(currentVrm,animationUrl)
    const newAction = currentMixer.clipAction(clip)
    newAction.reset().play()

    if ( currentAction && currentAction !== newAction ) {

			currentAction.crossFadeTo( newAction, 0.5, false );

		}

		currentAction = newAction;
  }
}
let flag1 = 0;
window.addEventListener('click',async(event)=>{
  if(flag1 === 0){
    await loadFBX('/assets/Salsa_Dancing.fbx')
    flag1 = 1;
  }
  else{
    await loadFBX('/assets/Waving.fbx')
    flag1 = 0
  }
  
})
 


let flag2 = 0;
window.addEventListener('keypress',(event)=>{
  console.log(event)
  if(event.key === 'c' && flag2 === 0){
    camera.position.set(4,3,2)
    flag2 = 1;
  }
  else if(event.key === 'c' && flag2 === 1){
    camera.position.set(-4,3,2)
    flag2 = 2;
  }
  else{
    camera.position.set(-4,3,0)
    flag2 = 0;
  }
})
//Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);


const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(3,3,-1);
scene.add(directionalLight);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.normalBias = 0.05;


//sky
const sky = new Sky();
        sky.scale.setScalar( 450000 );
        scene.add( sky );

        const sun = new THREE.Vector3();

        const skyParameters = {
          turbidity: 10,
          rayleigh: 3,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.95,
          elevation: -2.2,
          azimuth: 100,
          exposure: renderer.toneMappingExposure
        };

        function updateSky() {

          const uniforms = sky.material.uniforms;
          uniforms[ 'turbidity' ].value = skyParameters.turbidity;
          uniforms[ 'rayleigh' ].value = skyParameters.rayleigh;
          uniforms[ 'mieCoefficient' ].value = skyParameters.mieCoefficient;
          uniforms[ 'mieDirectionalG' ].value = skyParameters.mieDirectionalG;

          const phi = THREE.MathUtils.degToRad( 90 - skyParameters.elevation );
          const theta = THREE.MathUtils.degToRad( skyParameters.azimuth );

          sun.setFromSphericalCoords( 1, phi, theta );

          uniforms[ 'sunPosition' ].value.copy( sun );

          renderer.toneMappingExposure = skyParameters.exposure;
          renderer.render( scene, camera );

        }

updateSky()


const clock = new THREE.Clock();
let previousTime = 0;

function tick(){
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;
  if ( currentMixer ) {

		// update the animation
		currentMixer.update( deltaTime );

	}

	if ( currentVrm ) {

		currentVrm.update( deltaTime );

	}
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}
tick();
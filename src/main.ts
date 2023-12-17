import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { randFloat } from "three/src/math/MathUtils.js";

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(new THREE.Color("#87ceeb"));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.z = 1300;

const axesHelper = new THREE.AxesHelper(20);
scene.add(axesHelper);

const controls = new OrbitControls(camera, renderer.domElement);

const Box3Radius = 500;
const box3 = new THREE.Box3().setFromPoints([new THREE.Vector3(-Box3Radius, -Box3Radius, -Box3Radius), new THREE.Vector3(Box3Radius, Box3Radius, Box3Radius)]);
const box3Helper = new THREE.Box3Helper(box3);
scene.add(box3Helper);

interface Boid {
    position: THREE.Vector3;
    veloctiy: THREE.Vector3;
    accelaration: THREE.Vector3;
    cohesion: THREE.Vector3;
    alignment: THREE.Vector3;
    seperation: THREE.Vector3;
    mesh: THREE.Mesh;
}

const createBoid = (): Boid => {
    // get random veloctiy values and normalize them so that the veloctiy length is 1
    let randXVel = Math.random() * 10 - 5;
    let randYVel = Math.random() * 10 - 5;
    let randZVel = Math.random() * 10 - 5;

    const hypo = Math.hypot(randXVel, randYVel, randZVel);
    randXVel /= hypo;
    randYVel /= hypo;
    randZVel /= hypo;
    const veloctiy = new THREE.Vector3(randXVel, randYVel, randZVel);

    const geometry = new THREE.ConeGeometry(5, 15, 3);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boidMesh = new THREE.Mesh(geometry, material);
    boidMesh.geometry.rotateZ(-Math.PI);
    boidMesh.geometry.rotateX(-Math.PI / 2);
    boidMesh.lookAt(veloctiy);

    const boid: Boid = {
        position: new THREE.Vector3(randFloat(-Box3Radius, Box3Radius), randFloat(-Box3Radius, Box3Radius), randFloat(-Box3Radius, Box3Radius)),
        veloctiy,
        accelaration: new THREE.Vector3(0, 0, 0),
        cohesion: new THREE.Vector3(0, 0, 0),
        alignment: new THREE.Vector3(0, 0, 0),
        seperation: new THREE.Vector3(0, 0, 0),
        mesh: boidMesh,
    };

    scene.add(boidMesh);

    return boid;
};

// ** alignment
const createBoidAlignmentSteer = (b: Boid, flock: Boid[], cohesionRadius: number) => {
    const averageVelocity = new THREE.Vector3();

    let total = 0;
    // sum all the position vectors together
    for (const boid of flock) {
        const connectionVec = b.position.clone().sub(boid.position);
        const connectionVecLength = connectionVec.length();
        if (boid != b && connectionVecLength <= cohesionRadius) {
            averageVelocity.add(boid.veloctiy);
            total++;
        }
    }

    let steer = new THREE.Vector3();

    // get the average position
    if (total > 0) {
        // divide all the velocities by the total
        averageVelocity.divideScalar(total);
        // subtract the average velocity form boids velocity to get the steer
        steer = averageVelocity.clone().sub(b.veloctiy);
        
        steer.normalize().multiplyScalar(0.02);
    }

    return steer;
};

// ** cohesion
const createBoidCohesionSteer = (b: Boid, flock: Boid[], cohesionRadius: number) => {
    const averagePosition = new THREE.Vector3();

    let total = 0;
    // sum all the position vectors together
    for (const boid of flock) {
        const connectionVec = b.position.clone().sub(boid.position);
        const connectionVecLength = connectionVec.length();
        if (boid != b && connectionVecLength <= cohesionRadius) {
            averagePosition.add(boid.position);
            total++;
        }
    }

    let steer = new THREE.Vector3();

    // get the average position
    if (total > 0) {
        averagePosition.divideScalar(total);

        // get the direction the boid should steer to
        const direction = averagePosition.clone().sub(b.position);

        // subtract from velocity
        steer = direction.clone().sub(b.veloctiy);

        // limit the force
        steer.normalize().multiplyScalar(0.03);
    }

    return steer;
};

// ** seperation
const createBoidSeperationSteer = (b: Boid, flock: Boid[], cohesionRadius: number) => {
    const averageVelocity = new THREE.Vector3();

    let total = 0;
    // sum all the position vectors together
    for (const boid of flock) {
        const connectionVec = b.position.clone().sub(boid.position);
        const connectionVecLength = connectionVec.length();
        if (boid != b && connectionVecLength <= cohesionRadius) {
            // averageVelocity.add(boid.veloctiy);

            const diff = connectionVec.divideScalar(connectionVecLength);
            averageVelocity.add(diff);

            total++;
        }
    }

    let steer = new THREE.Vector3();

    // get the average position
    if (total > 0) {
        // divide all the velocities by the total
        averageVelocity.divideScalar(total);
        // subtract the average velocity form boids velocity to get the steer
        steer = averageVelocity.clone().sub(b.veloctiy);

        steer.normalize().multiplyScalar(0.08);
    }

    return steer;
};

// ** update the boids props
const updateBoidProps = (b: Boid) => {
    const alignment = createBoidAlignmentSteer(b, flock, 50);
    b.alignment = alignment;

    const cohesion = createBoidCohesionSteer(b, flock, 30);
    b.cohesion = cohesion;

    const seperation = createBoidSeperationSteer(b, flock, 30);
    b.seperation = seperation;
};

const updateBoidPosition = (b: Boid) => {
    b.accelaration = new THREE.Vector3();
    b.accelaration.add(b.alignment);
    b.accelaration.add(b.cohesion);
    b.accelaration.add(b.seperation);

    b.veloctiy.add(b.accelaration);
    b.veloctiy.normalize();
    b.position.add(b.veloctiy);

    // wrap them around the canvas
    if (b.position.x > Box3Radius) b.position.x = -Box3Radius;
    else if (b.position.x < -Box3Radius) b.position.x = Box3Radius;

    if (b.position.y > Box3Radius) b.position.y = -Box3Radius;
    else if (b.position.y < -Box3Radius) b.position.y = Box3Radius;

    if (b.position.z > Box3Radius) b.position.z = -Box3Radius;
    else if (b.position.z < -Box3Radius) b.position.z = Box3Radius;
};

const updateBoid = (b: Boid) => {
    // update the positon
    updateBoidPosition(b);

    b.mesh.position.set(b.position.x, b.position.y, b.position.z);

    b.mesh.lookAt(b.position.clone().add(b.veloctiy));
};

const flock: Boid[] = [];
const flockSize = 500;
for (let i = 0; i < flockSize; i++) {
    flock.push(createBoid());
}

function animate() {
    requestAnimationFrame(animate);

    for (const boid of flock) {
        updateBoidProps(boid);
    }

    for (const boid of flock) {
        updateBoid(boid);
    }

    controls.update();
    renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// Main script that generates and renders the 3D globe


console.log("Setting things up...");

// Parameters controlling globe generation
var globe = {
    // Radius of the sphere in scene units
    radius: 1,
    // Multiplier controlling how tall mountains appear
    heightScale: 0.05,
    // Geometry resolution along latitude and longitude
    latitudeRes: 256,
    longitudeRes: 256,
    // Resolution of the texture applied to the sphere
    gLatitudeRes: 1024,
    gLongitudeRes: 1024,
    // Seed value used for deterministic terrain generation
    noiseSeed: 1,
    points: [],
    // Latitude at which polar ice caps begin
    iceCapLatitude: 0.75,
    // Maximum ice cap thickness relative to radius
    iceCapLevel: 0.025,
    // Range over which the ice cap transitions into terrain
    iceCapTransitionRange: 0.05
};

// Canvas used for main WebGL rendering
var canvas = document.getElementById("main");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.left = "0px";
canvas.style.top = "0px";
canvas.style.position = "absolute";

// Offscreen canvas for land texture generation
var landColor = document.getElementById("aux");
var ctxLand = landColor.getContext("2d");
// Initial texture size; values may change when the globe is regenerated
landColor.width = globe.gLongitudeRes;
landColor.height = globe.gLatitudeRes;
landColor.style.left = "0px";
landColor.style.top = "0px";
landColor.style.position = "absolute";
landColor.style.width = globe.gLongitudeRes + "px";
landColor.style.height = globe.gLatitudeRes + "px";
// Canvas for 2D GUI overlays

var gui = document.getElementById("gui");
var ctx = gui.getContext("2d");
gui.width = window.innerWidth;
gui.height = window.innerHeight;
gui.style.left = "0px";
gui.style.top = "0px";
gui.style.position = "absolute";
gui.style.width = gui.width;
gui.style.height = gui.height;

// Scene to render GUI elements onto the 2D canvas
var guiCamera = new THREE.OrthographicCamera(-gui.width/2, gui.width/2, gui.height/2, -gui.height/2, 0, 30);
var guiScene = new THREE.Scene();
var guiTexture = new THREE.CanvasTexture(gui);
guiTexture.needsUpdate = true;
guiTexture.anisotropy = 16;
//guiTexture.minFilter = THREE.LinearFilter;
var guiMaterial = new THREE.MeshBasicMaterial({map: guiTexture});
guiMaterial.transparent = true;
guiMaterial.opacity = 1;
var guiPlane = new THREE.Mesh(new THREE.PlaneGeometry(gui.width, gui.height), guiMaterial);
guiScene.add(guiPlane);

guiScene.add(new THREE.AxesHelper());


// Main 3D scene setup
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 1000);

// Renderer for drawing the 3D scene
var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: false});
renderer.setSize(canvas.width, canvas.height);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var light = new THREE.DirectionalLight(0xffffff, 1, 100);
light.position.set(1, 0, 0);
light.castShadow = true;
scene.add(light);

var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Track current pointer position
var mouse = { x: 0, y: 0 };
// Flags for click-and-drag camera control
var isDragging = false;
var dragStart = { x: 0, y: 0 };

// Start dragging when the user presses on the canvas
canvas.addEventListener("pointerdown", function(event) {
    if (firstPerson) {
        return; // pointer lock handles movement in first person mode
    }
    isDragging = true;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
});

// Rotate camera while dragging the pointer
canvas.addEventListener("pointermove", function(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (firstPerson && document.pointerLockElement === canvas) {
        // Update yaw/pitch while pointer is locked
        player.yaw -= event.movementX * 0.002;
        player.pitch -= event.movementY * 0.002;
        // Limit looking too far up or down
        player.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, player.pitch));
    } else if (isDragging) {
        var deltaX = event.clientX - dragStart.x;
        var deltaY = event.clientY - dragStart.y;
        // Horizontal drag rotates around the Y axis, vertical drag around X
        cam.dx -= (deltaX / canvas.clientWidth) * Math.PI;
        cam.dy -= (deltaY / canvas.clientHeight) * Math.PI;
        dragStart.x = event.clientX;
        dragStart.y = event.clientY;
    }
});

// Stop dragging when the pointer is released
canvas.addEventListener("pointerup", function(event) {
    if (!firstPerson) {
        isDragging = false;
        canvas.releasePointerCapture(event.pointerId);
    }
});

// Request pointer lock on click when first person mode is active
canvas.addEventListener("click", function() {
    if (firstPerson && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
});

// Zoom in/out with the mouse wheel
canvas.addEventListener("wheel", function(event) {
    if (!firstPerson) {
        event.preventDefault();
        cam.distance += event.deltaY * 0.01;
        // Clamp zoom so the camera doesn't get too close or too far
        cam.distance = Math.min(Math.max(cam.distance, globe.radius * 1.5), globe.radius * 10);
    }
});

// Handle keyboard input (unused but kept for future features)
window.addEventListener("keydown", 
	function(event) {
		keys[event.which || event.keyCode] = true;
	}
);
window.addEventListener("keyup",
        function(event) {
                keys[event.which || event.keyCode] = false;
        }
);

// When pointer lock is lost, exit first person mode
document.addEventListener("pointerlockchange", function() {
    if (firstPerson && document.pointerLockElement !== canvas) {
        firstPerson = false;
        document.getElementById("firstPersonToggle").checked = false;
    }
});

var keys = [];


// Adjust canvas sizes when the window changes
window.addEventListener("resize", 
	function() {
		canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gui.width = window.innerWidth;
        gui.height = window.innerHeight;
	}
);

console.log("Setup done!");

// ---------------------------------------------
// Noise seeding utilities
// ---------------------------------------------

// Simple deterministic RNG used to generate additional seed values
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

var reps = 7; // Number of noise layers used when generating terrain
var seed = [];
var capSeed = [[], []];

// Initialize the noise library and seed arrays from a numeric seed value
function initializeNoiseSeeds(seedValue) {
    noise.seed(seedValue);
    var rng = mulberry32(seedValue);
    for (var a = 0; a < reps; a++) {
        seed[a] = (2 * rng() - 1) * 65536;
        capSeed[0][a] = (2 * rng() - 1) * 65536;
        capSeed[1][a] = (2 * rng() - 1) * 65536;
    }
}

// Perform initial seeding
initializeNoiseSeeds(globe.noiseSeed);

// Initialize height array

for (var a = 0; a < globe.longitudeRes; a++) {
    globe.points[a] = [];
    for (var b = 0; b < globe.latitudeRes; b++) {
        globe.points[a][b] = 0;
    }
}
// Camera settings

var cam = {
    dx: 0,
    dy: 0,
    dz: 0,
    distance: globe.radius * 3,
    rotation: new THREE.Quaternion(0, 0, 0, 0)
};

// Toggle for switching between orbit and first person camera modes
var firstPerson = false;
// Stores player orientation and position when in first person mode
var player = {
    position: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    // Camera height above the terrain surface
    headHeight: 0.02
};

// Meshes for the ocean and terrain. These are recreated when settings change.
var ocean = null;
var land = null;


// Generate altitude and biome for a point on the sphere
function getAlt (dx, dy) {
    var alt = 0;
    var capLat1 = globe.iceCapLatitude;
    var capLat2 = -capLat1;
    var biome = "DEFAULT";
    var scalarRatio = 1.6;
    for (var a = 0; a < reps; a++) {
        alt += noise.perlin3(Math.pow(2, a + 1) * Math.cos(dx) * Math.cos(dy), Math.pow(2, a + 1) * Math.sin(dy) + seed[a], Math.pow(2, a + 1) * Math.sin(dx) * Math.cos(dy)) / Math.pow(scalarRatio, a) / -(1 + scalarRatio / (1 - scalarRatio));
        capLat1 += noise.perlin2(Math.pow(2, a) * Math.sin(dx), Math.pow(2, a) * Math.cos(dx) + capSeed[0][a]) / Math.pow(2, a + 2);
        capLat2 -= noise.perlin2(Math.pow(2, a) * Math.sin(dx), Math.pow(2, a) * Math.cos(dx) + capSeed[1][a]) / Math.pow(2, a + 2);
    }
    if (dy > capLat1 || dy < capLat2) {
        biome = "ICE CAPS";
    } else if (alt < 0) {
        biome = "OCEAN";
    }
    var capAlt;
    var surfaceBreak = Math.sqrt(globe.iceCapLevel * globe.iceCapTransitionRange);

    if (dy - surfaceBreak > capLat1 || dy + surfaceBreak < capLat2) {
        capAlt = globe.iceCapLevel;
    } else if (dy > 0) {
        capAlt = globe.iceCapLevel - Math.pow(dy - surfaceBreak - capLat1, 2) / globe.iceCapTransitionRange;
    } else if (dy <= 0) {
        capAlt = globe.iceCapLevel - Math.pow(dy + surfaceBreak - capLat2, 2) / globe.iceCapTransitionRange;
    }
    if (alt < capAlt) {
        alt = capAlt;
        if (capAlt !== globe.iceCapLevel) {
            biome = "ICE CAPS EDGE";
        }
    }

    return {alt: alt, biome: biome};
};

// Generate the globe geometry and textures based on current parameters
function generateGlobe() {
    // Update offscreen canvas size to match texture resolution
    landColor.width = globe.gLongitudeRes;
    landColor.height = globe.gLatitudeRes;
    landColor.style.width = globe.gLongitudeRes + "px";
    landColor.style.height = globe.gLatitudeRes + "px";

    // Remove previous meshes if they exist
    if (land) {
        scene.remove(land);
        land.geometry.dispose();
        land.material.map.dispose();
        land.material.dispose();
    }
    if (ocean) {
        scene.remove(ocean);
        ocean.geometry.dispose();
        ocean.material.dispose();
    }

    // Create the ocean mesh
    ocean = new THREE.Mesh(
        new THREE.SphereGeometry(globe.radius, globe.latitudeRes, globe.longitudeRes),
        new THREE.MeshStandardMaterial({color: 0x1f7fef, side: THREE.DoubleSide})
    );
    ocean.material.transparent = true;
    ocean.material.opacity = 0.8;
    ocean.position.copy({x: 0, y: 0, z: 0});
    scene.add(ocean);

    // Generate vertex positions for the terrain
    console.log("Generating landscape...");
    var landPoints = [];
    var index = [];
    for (var a = 0; a < globe.longitudeRes; a++) {
        globe.points[a] = [];
        index[a] = [];
        for (var b = 0; b <= globe.latitudeRes; b++) {
            var angleA = (a / globe.longitudeRes * 2 - 1) * Math.PI;
            var angleB = (b / globe.latitudeRes - 0.5) * Math.PI;

            var alt = getAlt(angleA, angleB).alt;

            globe.points[a][b] = alt;
            index[a][b] = landPoints.length / 3;
            landPoints.push(globe.radius * (1 + globe.heightScale * alt) * Math.cos(angleA) * Math.cos(angleB));
            landPoints.push(globe.radius * (1 + globe.heightScale * alt) * Math.sin(angleB));
            landPoints.push(globe.radius * (1 + globe.heightScale * alt) * Math.sin(angleA) * Math.cos(angleB));
        }
    }

    // Connect vertices into triangular faces
    console.log("Plotting triangles...");
    var facesIndex = [];
    for (var a = 0; a < globe.longitudeRes; a++) {
        for (var b = 0; b < globe.latitudeRes; b++) {
            if (a === globe.longitudeRes - 1) {
                if (Math.random() < 0.5) {
                    facesIndex.push(index[a][b]);
                    facesIndex.push(index[a][b+1]);
                    facesIndex.push(index[0][b]);

                    facesIndex.push(index[0][b+1]);
                    facesIndex.push(index[0][b]);
                    facesIndex.push(index[a][b+1]);
                } else {
                    facesIndex.push(index[a][b]);
                    facesIndex.push(index[a][b+1]);
                    facesIndex.push(index[0][b+1]);

                    facesIndex.push(index[0][b+1]);
                    facesIndex.push(index[0][b]);
                    facesIndex.push(index[a][b]);
                }
            } else {
                if (Math.random < 0.5) {
                    facesIndex.push(index[a][b]);
                    facesIndex.push(index[a][b+1]);
                    facesIndex.push(index[a+1][b]);

                    facesIndex.push(index[a+1][b+1]);
                    facesIndex.push(index[a+1][b]);
                    facesIndex.push(index[a][b+1]);
                } else {
                    facesIndex.push(index[a][b]);
                    facesIndex.push(index[a][b+1]);
                    facesIndex.push(index[a+1][b+1]);

                    facesIndex.push(index[a+1][b+1]);
                    facesIndex.push(index[a+1][b]);
                    facesIndex.push(index[a][b]);
                }
            }
        }
    }

    // Create a colour map and paint the land texture
    console.log("Coloring landscape...");
    var colorMapPoints = [
        {p: -1, r: 140, g: 140, b: 140},
        {p: -0.4, r: 140, g: 140, b: 140},
        {p: 0, r: 177, g: 180, b: 117},
        {p: 0.05, r: 77, g: 223, b: 90},
        {p: 0.3, r: 63, g: 191, b: 71},
        {p: 0.4, r: 170, g: 170, b: 170},
        {p: 0.45, r: 255, g: 255, b: 255},
        {p: 1, r: 255, g: 255, b: 255}
    ];

    function lerp(min, max, t, mode) {
        if (mode === "CUBIC") {
            t = -2 * t * t * t + 3 * t * t;
        } else if (mode === "SINE") {
            t = (1 - Math.cos(t * Math.PI)) / 2;
        }
        return min + t * (max - min);
    }

    function colorMap(t) {
        var c = {r: 0, g: 0, b: 0};
        for (var a = 0; a < colorMapPoints.length - 1; a++) {
            if (t >= colorMapPoints[a].p && t < colorMapPoints[a + 1].p) {
                c = {
                    r: lerp(colorMapPoints[a].r, colorMapPoints[a + 1].r, (t - colorMapPoints[a].p) / (colorMapPoints[a + 1].p - colorMapPoints[a].p), "CUBIC"),
                    g: lerp(colorMapPoints[a].g, colorMapPoints[a + 1].g, (t - colorMapPoints[a].p) / (colorMapPoints[a + 1].p - colorMapPoints[a].p), "CUBIC"),
                    b: lerp(colorMapPoints[a].b, colorMapPoints[a + 1].b, (t - colorMapPoints[a].p) / (colorMapPoints[a + 1].p - colorMapPoints[a].p), "CUBIC")
                };
            }
        }
        return "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
    }

    // Draw land colours to texture
    ctxLand.fillStyle = "#ffffff";
    ctxLand.fillRect(0, 0, landColor.width, landColor.height);

    // Create the terrain mesh using the generated points
    land = new THREE.Mesh(
        new THREE.PolyhedronGeometry(landPoints, facesIndex, globe.radius, 1),
        new THREE.MeshLambertMaterial({side: THREE.FrontSide, map: new THREE.CanvasTexture(landColor)})
    );

    land.material.map.center = {x: 0.5, y: 0.5};
    land.material.map.rotation = Math.PI;
    land.material.map.anisotropy = 4;
    land.material.map.offset = {x: 0.5 / globe.gLongitudeRes, y: -0.5 / globe.gLatitudeRes};
    land.position.copy({x: 0, y: 0, z: 0});
    scene.add(land);

    // Paint colours for visible land areas onto the texture
    for (var a = 0; a < globe.gLongitudeRes; a++) {
        for (var b = 0; b < globe.gLatitudeRes; b++) {
            if (Math.abs(b / globe.gLatitudeRes - 0.5) < 0.3) {
                var angleA = (a / globe.gLongitudeRes * 2) * Math.PI;
                var angleB = (b / globe.gLatitudeRes - 0.5) * Math.PI;
                var place = getAlt(angleA, angleB);
                if (place.biome !== "ICE CAPS" && place.biome !== "ICE CAPS EDGE") {
                    ctxLand.fillStyle = colorMap(place.alt);
                    ctxLand.fillRect(a, b, 1, 1);
                }
            }
        }
    }
    land.material.map.needsUpdate = true;
}

// Initial globe creation
generateGlobe();

// Rebuild the globe when the user clicks the Update button
document.getElementById('applySettings').addEventListener('click', function() {
    // Read updated parameters from the overlay inputs
    globe.radius = parseFloat(document.getElementById('worldRadius').value);
    globe.latitudeRes = parseInt(document.getElementById('latRes').value, 10);
    globe.longitudeRes = parseInt(document.getElementById('lonRes').value, 10);
    globe.gLatitudeRes = parseInt(document.getElementById('texLatRes').value, 10);
    globe.gLongitudeRes = parseInt(document.getElementById('texLonRes').value, 10);
    globe.noiseSeed = parseInt(document.getElementById('noiseSeed').value, 10);
    globe.heightScale = parseFloat(document.getElementById('heightScale').value);
    player.headHeight = parseFloat(document.getElementById('headHeight').value);
    globe.iceCapLatitude = parseFloat(document.getElementById('iceCapLat').value);
    globe.iceCapLevel = parseFloat(document.getElementById('iceCapLvl').value);
    globe.iceCapTransitionRange = parseFloat(document.getElementById('iceCapRange').value);
    // Camera distance scales with world radius
    cam.distance = globe.radius * 3;
    // Re-seed noise for deterministic generation
    initializeNoiseSeeds(globe.noiseSeed);
    // Recreate meshes and textures using the new parameters
    generateGlobe();
});

// Toggle first person mode when the checkbox changes
document.getElementById('firstPersonToggle').addEventListener('change', function() {
    firstPerson = this.checked;
    if (firstPerson) {
        // Initialize player position based on current orbit camera angles
        var alt = getAlt(cam.dx, -cam.dy).alt;
        // Position the player slightly above the surface based on headHeight
        var r = globe.radius * (1 + globe.heightScale * alt) + player.headHeight;
        player.position.set(r * Math.sin(cam.dx) * Math.cos(-cam.dy),
                            -r * Math.sin(-cam.dy),
                            r * Math.cos(cam.dx) * Math.cos(-cam.dy));
        player.yaw = cam.dx;
        player.pitch = -cam.dy;
        canvas.requestPointerLock();
    } else {
        document.exitPointerLock();
    }
});


// Main render loop
function draw() {
    requestAnimationFrame(draw);

    /*
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Comic Sans MS";
    ctx.fillText("test", 20, gui.height - 20);
    guiTexture.needsUpdate = true;
    */

    land.rotation.y += 0.0005;
    ocean.rotation.y += 0.0005;

    if (firstPerson) {
        // Player orientation is defined relative to the local surface normal
        var up = player.position.clone().normalize();
        // Rotate the forward vector around the up axis by the yaw amount
        var yawQuat = new THREE.Quaternion().setFromAxisAngle(up, player.yaw);
        var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawQuat);
        // Tangent right vector used for strafing and pitching
        var right = new THREE.Vector3().crossVectors(forward, up).normalize();
        // Apply pitch rotation around the right axis
        forward.applyAxisAngle(right, player.pitch);

        var speed = 0.01 * globe.radius;
        if (keys[87]) player.position.addScaledVector(forward, speed); // W
        if (keys[83]) player.position.addScaledVector(forward, -speed); // S
        if (keys[65]) player.position.addScaledVector(right, -speed); // A
        if (keys[68]) player.position.addScaledVector(right, speed); // D

        // Keep the player on the surface based on terrain altitude
        var lon = Math.atan2(player.position.z, player.position.x);
        var lat = Math.asin(player.position.y / player.position.length());
        var alt = getAlt(lon, lat).alt;
        // Maintain a constant offset above the surface
        var r = globe.radius * (1 + globe.heightScale * alt) + player.headHeight;
        player.position.setLength(r);

        camera.position.copy(player.position);
        camera.up.copy(up);
        camera.lookAt(player.position.clone().add(forward));
    } else {
        // Convert the current camera angles into a quaternion for Three.js
        cam.rotation.w = Math.cos(cam.dx / 2) * Math.cos(cam.dy / 2);
        cam.rotation.z = -Math.sin(cam.dx / 2) * Math.sin(cam.dy / 2);
        cam.rotation.x = Math.cos(cam.dx / 2) * Math.sin(cam.dy / 2);
        cam.rotation.y = Math.sin(cam.dx / 2) * Math.cos(cam.dy / 2);

        camera.setRotationFromQuaternion(cam.rotation);
        camera.position.set(
            cam.distance * Math.sin(cam.dx) * Math.cos(cam.dy),
            -cam.distance * Math.sin(cam.dy),
            cam.distance * Math.cos(cam.dx) * Math.cos(cam.dy)
        );
    }

    renderer.render(scene, camera);
    renderer.render(guiScene, guiCamera);
};

draw();

// Start the animation
console.log("Loading done!");

// Utility function to inspect max altitude (for debugging)
function getMaxAlt () {
    var max = 0;
    for (var a = 0; a < globe.points.length; a++) {
        for (var b = 0; b < globe.points[a].length; b++) {
            if (globe.points[a][b] > max) {
                max = globe.points[a][b];
            }
        }
    }
    return max;
};
/*
ctx.fillStyle = "#ffffff";
ctx.font = "32px Arial";
ctx.fillText("Max Altitude: " + getMaxAlt().toFixed(3), 20, gui.height - 20);
guiTexture.needsUpdate = true;
*/

/*
    land.setRotationFromQuaternion({
        w: Math.sin(cam.dx / 2) * Math.cos(cam.dy / 2),
        x: Math.cos(cam.dx / 2) * Math.sin(cam.dy / 2),
        y: Math.cos(cam.dx / 2) * Math.cos(cam.dy / 2),
        z: -Math.sin(cam.dx / 2) * Math.sin(cam.dy / 2)
    });

    light.position.set(Math.cos(cam.dx) * Math.cos(cam.dy), -Math.sin(cam.dy), Math.sin(cam.dx) * Math.cos(cam.dy));
*/



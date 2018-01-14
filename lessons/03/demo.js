/* globals dat, AMI*/


var newRenderer = setRenderer();
var container = newRenderer.container;
var renderer = newRenderer.renderer;
var scene = new THREE.Scene();
var camera = setCamera();
var controls = setControls();


function onWindowResize() {
    const numberOfDirectionsToRecalculateZoom = 2;

    camera.canvas = {
        width: container.offsetWidth,
        height: container.offsetHeight,
    };
    camera.fitBox(numberOfDirectionsToRecalculateZoom);
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}

const attachEventListenerOnWindowLoad = true;
window.addEventListener('resize', onWindowResize, attachEventListenerOnWindowLoad);

function gui(stackHelper) {
    const myGuiContainerId = 'my-gui-container';
    var gui = new dat.GUI({
        autoPlace: false
    });

    var customContainer = document.getElementById(myGuiContainerId);
    customContainer.appendChild(gui.domElement);

    var camUtils = {
        Invertir_Eje_X: false,
        Invertir_Eje_Y: false,
        Rotar_Derecha: false,
        rotate: 0,
        Orientacion: 'axial',
        Convencion: 'radio',
    };

    var cameraFolder = gui.addFolder('Camera');
    var Invertir_Eje_X = cameraFolder.add(camUtils, 'Invertir_Eje_X');
    Invertir_Eje_X.onChange(function () {
        camera.invertRows();
    });

    var Invertir_Eje_Y = cameraFolder.add(camUtils, 'Invertir_Eje_Y');
    Invertir_Eje_Y.onChange(function () {
        camera.invertColumns();
    });

    var Rotar_Derecha = cameraFolder.add(camUtils, 'Rotar_Derecha');
    Rotar_Derecha.onChange(function () {
        camera.rotate();
    });

    cameraFolder
        .add(camera, 'angle', 0, 360)
        .step(1)
        .listen();

    const Orientacion = 'Orientacion';
    const medicalImageAxisNames = ['axial', 'coronal', 'sagittal'];

    let orientationUpdate = cameraFolder.add(camUtils, Orientacion, medicalImageAxisNames);
    orientationUpdate.onChange(function (value) {
        camera.orientation = value;
        camera.update();
        const numberOfDirectionsToRecalculateCameraDimension = 2;
        camera.fitBox(numberOfDirectionsToRecalculateCameraDimension);
        stackHelper.orientation = camera.stackOrientation;
    });

    const medicalConvention = 'Convencion';
    const modesToVisualizeImage = ['radio', 'neuro'];

    let conventionUpdate = cameraFolder.add(camUtils, medicalConvention, modesToVisualizeImage);
    conventionUpdate.onChange(function (value) {
        camera.convention = value;
        camera.update();
        camera.fitBox(2);
    });

    cameraFolder.open();

    // of course we can do everything from lesson 01!
    var stackFolder = gui.addFolder('Stack');
    stackFolder
        .add(stackHelper, 'index', 0, stackHelper.stack.dimensionsIJK.z - 1)
        .step(1)
        .listen();
    stackFolder
        .add(stackHelper.slice, 'interpolation', 0, 1)
        .step(1)
        .listen();
    stackFolder.open();
}

/**
 * Start animation loop
 */
function animate() {
    controls.update();
    renderer.render(scene, camera);

    // request new frame
    requestAnimationFrame(function () {
        animate();
    });
}

animate();

// Setup loader
var loader = new AMI.VolumeLoader(container);
var file = 'https://cdn.rawgit.com/FNNDSC/data/master/nifti/adi_brain/adi_brain.nii.gz';

loader
    .load(file)
    .then(function () {


        var series = mergeFilesIntoCleanSeriesStackFrameStructure();


        var stack = createStackOfASeriesOfImages();


        detachLoaderAndProgressBarFromDOM();


// be carefull that series and target stack exist!
        var stackHelper = createStackHelperToManipulateOrientationAndSliceDisplayed();
        // stackHelper.orientation = 2;
        // stackHelper.index = 56;

        // tune bounding box
        stackHelper.bbox.visible = false;

        // tune slice border
        stackHelper.border.color = 0xff9800;
        // stackHelper.border.visible = false;

        scene.add(stackHelper);

        // build the gui
        gui(stackHelper, 'my-gui-container');

        // center camera and interactor to center of bouding box
        // for nicer experience
        // set camera
        var worldbb = stack.worldBoundingBox();
        var lpsDims = new THREE.Vector3(worldbb[1] - worldbb[0], worldbb[3] - worldbb[2], worldbb[5] - worldbb[4]);

        // box: {halfDimensions, center}
        var box = {
            center: stack.worldCenter().clone(),
            halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10)
        };

        // init and zoom
        var canvas = {
            width: container.clientWidth,
            height: container.clientHeight,
        };

        camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
        camera.box = box;
        camera.canvas = canvas;
        camera.update();
        camera.fitBox(2);

        function mergeFilesIntoCleanSeriesStackFrameStructure() {
            var series = loader.data[0].mergeSeries(loader.data);
            return series;
        }

        function createStackOfASeriesOfImages() {
            return series[0].stack[0];
        }

        function detachLoaderAndProgressBarFromDOM() {
            loader.free();
        }

        function createStackHelperToManipulateOrientationAndSliceDisplayed() {
            return new AMI.StackHelper(stack);
        }
    })
    .catch(function (error) {
        window.console.log('oops... something went wrong...');
        window.console.log(error);
    });

function setRenderer() {
    var container = document.getElementById('container');
    const smoothBorders = true;

    var renderer = new THREE.WebGLRenderer({
        antialias: smoothBorders
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);

    const blackColor = 0x353535;
    const alpha = 1;

    renderer.setClearColor(blackColor, alpha);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    return {container: container, renderer: renderer};
}

function setCamera() {

    const left = container.clientWidth / -2;
    const right = container.clientWidth / 2;
    const top = container.clientHeight / 2;
    const bottom = container.clientHeight / -2;
    const near = 0.1;
    const far = 10000;

    return new AMI.OrthographicCamera(
        left,
        right,
        top,
        bottom,
        near,
        far
    );
}

function setControls() {
    var controls = new AMI.TrackballOrthoControl(camera, container);
    controls.staticMoving = true;
    controls.noRotate = true;
    camera.controls = controls;
    return controls;
}
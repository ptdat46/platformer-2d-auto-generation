import {vec2, vec3} from 'gl-matrix';

import {setGL} from './globals';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Camera from './Camera';
import GameEngine from './engine/GameEngine';
import GameObject from './engine/GameObject';

import Player from './scene/Player';
import Coin from './scene/Coin';
import sceneAttributes from './scene/SceneAttributes';

import RhythmGropuGenerator from './LevelGenerator/RhythmGroupGenerator';

let Stats = require("stats-js")

let time: number = 0.0;
let gameStart: boolean = false;

function main() {

    let rhythmTypeSelect = <HTMLSelectElement> document.getElementById("rhythmSelect");
    rhythmTypeSelect.onchange = () => {
        sceneAttributes.rhythmType = parseInt(rhythmTypeSelect.value);
    }

    let groupLengthSlider = <HTMLInputElement> document.getElementById("timeSelect");
    let groupLengthOutput = document.getElementById("timeSelectDisplay");
    groupLengthOutput.innerHTML = groupLengthSlider.value + " giây";
    groupLengthSlider.oninput = () => {
        groupLengthOutput.innerHTML = groupLengthSlider.value + " giây";
        sceneAttributes.rhythmGroupLength = parseInt(groupLengthSlider.value);
    }

    let groupNumberSelect = <HTMLInputElement> document.getElementById("numberSelect");
    let groupNumberOutput = document.getElementById("numberDisplay");
    groupNumberOutput.innerHTML = groupNumberSelect.value;
    groupNumberSelect.oninput = () => {
        groupNumberOutput.innerHTML = groupNumberSelect.value;
        sceneAttributes.numberOfGroups = parseInt(groupNumberSelect.value);
    }

    let gravitySelect = <HTMLSelectElement> document.getElementById("gravitySelect");
    gravitySelect.onchange = function() {
        sceneAttributes.gravity = parseFloat(gravitySelect.value);
    }

    let jumpSelect = <HTMLSelectElement> document.getElementById("jumpSelect");
    jumpSelect.onchange = () => {
        sceneAttributes.playerJump = parseFloat(jumpSelect.value);
    }

    let speedSelect = <HTMLSelectElement> document.getElementById("speedSelect");
    speedSelect.onchange = () => {
        sceneAttributes.playerSpeed = parseFloat(speedSelect.value);
    }

    let densitySelect = <HTMLSelectElement> document.getElementById("densitySelect");
    densitySelect.onchange = () => {
        sceneAttributes.levelDensity = parseFloat(densitySelect.value);
    }

    let startButton = <HTMLButtonElement> document.getElementById("generateLevelButton");
    startButton.onclick = () => {
        document.body.innerHTML = "";
        BeginGame();
    }

}

function BeginGame() {
    let canvas = document.createElement("canvas");
    canvas.setAttribute("id", "canvas");

    document.body.appendChild(canvas);

    let winText = document.createElement("div");
    winText.id = "winText";
    winText.textContent = "Chiến thắng";
    document.body.appendChild(winText);

    let backBtn = document.createElement("button");
    backBtn.id = "backButton";
    backBtn.textContent = "Chơi lại";
    backBtn.onclick = () => location.reload();
    document.body.appendChild(backBtn);

    const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
    if (!gl) {
        alert('Trình duyệt không hỗ trợ WebGL 2!');
    }
    setGL(gl);

    let displayStats = false;
    const stats = Stats();
    if (window.location.hostname === "localhost") {
        displayStats = true;
        stats.setMode(0);
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);
    }

    let engine: GameEngine = GameEngine.getEngine();
    const camera: Camera = engine.getCamera();

    const renderer = new OpenGLRenderer(canvas);
    renderer.setClearColor(0.9, 0.9, 0.9, 1);
    engine.setRenderer(renderer);
    engine.generateLevel();
    let player: Player = new Player([0, 1]);
    camera.makeParent(player);
    function tick() {
        if (displayStats) {
            stats.begin();
        }
        time++;
        engine.tick();

        if (GameEngine.getEngine().isWin()) {
            let winEl = document.getElementById("winText") as HTMLElement;
            winEl.style.opacity = "1";
            winEl.classList.add("active");

            let backBtn = document.getElementById("backButton") as HTMLElement;
            backBtn.style.top = "calc(50% + 60px)";
            backBtn.style.left = "50%";
            backBtn.style.right = "auto";
            backBtn.style.transform = "translateX(-50%)";
        }

        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.clear();
        GameEngine.getEngine().drawGameObjects();
    
        if (displayStats) {
            stats.end();
        }
        requestAnimationFrame(tick);
    }
  
    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
    }, false);
  
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();

    engine.startGame();
    tick();
}

main();
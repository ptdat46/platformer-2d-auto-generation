import {vec2, vec3} from 'gl-matrix';
import SaveManager from './scene/SaveManager';

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
    // If there's a saved game, skip the menu and go straight to game
    if (SaveManager.hasSave()) {
        let startScreen = document.getElementById("startScreen");
        let settingsPanel = document.getElementById("settingsPanel");
        if (startScreen) (startScreen as HTMLElement).style.display = "none";
        if (settingsPanel) (settingsPanel as HTMLElement).style.display = "none";
        BeginGame();
        return;
    }

    // Wire up "Bắt Đầu" button to start the game
    let startBtn = document.getElementById("generateLevelButton");
    if (startBtn) {
        startBtn.onclick = () => {
            let startScreen = document.getElementById("startScreen");
            let settingsPanel = document.getElementById("settingsPanel");
            if (startScreen) (startScreen as HTMLElement).style.display = "none";
            if (settingsPanel) (settingsPanel as HTMLElement).style.display = "none";
            BeginGame();
        };
    }

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
    backBtn.onclick = () => {
        SaveManager.stopAutoSave();
        SaveManager.deleteSave();
        window.location.href = window.location.pathname;
    };
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

    // ── Pause overlay ───────────────────────────────────────────────────────
    let pauseOverlay: HTMLDivElement = document.createElement("div");
    pauseOverlay.id = "pauseOverlay";
    pauseOverlay.innerHTML = `
        <style>
            #pauseOverlay {
                display: none;
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.7);
                justify-content: center; align-items: center;
                flex-direction: column; gap: 12px;
                z-index: 100;
            }
            #pauseOverlay.visible { display: flex; }
            #pauseOverlay h2 {
                color: #fff; font-family: sans-serif; margin: 0 0 8px;
                font-size: 28px; letter-spacing: 2px;
            }
            #pauseOverlay button {
                padding: 10px 28px; font-size: 16px; cursor: pointer;
                border: none; border-radius: 6px;
                background: #4CAF50; color: #fff;
                min-width: 180px;
            }
            #pauseOverlay button:hover { background: #45a049; }
            #pauseOverlay button.secondary { background: #555; }
            #pauseOverlay button.secondary:hover { background: #666; }
            #saveStatus {
                color: #aaa; font-family: sans-serif; font-size: 13px;
                margin-top: 4px;
            }
        </style>
        <h2>TẠM DỪNG</h2>
        <button id="btnResume">Tiếp Tục</button>
        <button id="btnSave" class="secondary">Lưu Game</button>
        <button id="btnReload" class="secondary">Chơi Lại</button>
        <div id="saveStatus"></div>
    `;
    document.body.appendChild(pauseOverlay);

    let paused = false;

    function showPauseOverlay() {
        paused = true;
        let status = document.getElementById("saveStatus");
        if (status) {
            status.textContent = SaveManager.hasSave() ? "Đã có bản lưu" : "Chưa có bản lưu";
        }
        let btnSave = document.getElementById("btnSave") as HTMLButtonElement;
        if (btnSave) btnSave.style.display = SaveManager.hasSave() ? "none" : "inline-block";
        pauseOverlay.classList.add("visible");
    }

    function hidePauseOverlay() {
        paused = false;
        pauseOverlay.classList.remove("visible");
        requestAnimationFrame(tick);
    }

    // Pause / resume on P
    window.addEventListener("keydown", (e) => {
        if ((e.key === "p" || e.key === "P") && !GameEngine.getEngine().isWin()) {
            if (paused) hidePauseOverlay();
            else showPauseOverlay();
        }
        if (e.key === "Escape" && paused) {
            hidePauseOverlay();
        }
    });

    document.getElementById("btnResume").onclick = hidePauseOverlay;

    document.getElementById("btnSave").onclick = () => {
        if (SaveManager.save()) {
            let status = document.getElementById("saveStatus");
            if (status) status.textContent = "Đã lưu!";
            let btnSave = document.getElementById("btnSave") as HTMLButtonElement;
            if (btnSave) btnSave.style.display = "none";
        }
    };

    document.getElementById("btnReload").onclick = () => {
        SaveManager.stopAutoSave();
        SaveManager.deleteSave();
        localStorage.clear();
        localStorage.removeItem("platformer_save");
        window.location.href = window.location.pathname;
    };

    const renderer = new OpenGLRenderer(canvas);
    renderer.setClearColor(0.9, 0.9, 0.9, 1);
    engine.setRenderer(renderer);

    // ── Auto-load saved game ──────────────────────────────────────────────────
    let shouldLoadSave = SaveManager.hasSave();

    if (shouldLoadSave) {
        // Load clears existing objects, rebuilds from save, starts engine + auto-save
        SaveManager.load();
        SaveManager.startAutoSave();
    } else {
        // Fresh new game
        engine.generateLevel();
        let player: Player = new Player([0, 1]);
        camera.makeParent(player);
        SaveManager.startAutoSave();
    }

    let gameEnded = false;
    let rafId: number = 0;
    function tick() {
        // When paused, stop the loop; hidePauseOverlay restarts it
        if (paused) return;

        if (displayStats) {
            stats.begin();
        }
        time++;
        engine.tick();

        if (!gameEnded && GameEngine.getEngine().isWin()) {
            gameEnded = true;
            SaveManager.stopAutoSave();
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
        rafId = requestAnimationFrame(tick);
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
import {vec2} from 'gl-matrix';
import GameEngine from '../engine/GameEngine';
import Player from './Player';
import Terrain from './Terrain';
import Coin from './Coin';
import Checkpoint from './Checkpoint';
import Baddie from './Baddie';
import Spike from './Spike';
import Gem from './Gem';
import sceneAttributes from './SceneAttributes';

const SAVE_KEY = 'platformer_save';
const AUTOSAVE_INTERVAL_MS = 5000; // 5 seconds

export interface SaveData {
    sceneAttributes: typeof sceneAttributes;
    player: PlayerSave;
    terrain: TerrainSave;
    entities: {
        coins: CoinSave[];
        checkpoints: CheckpointSave[];
        baddies: BaddieSave[];
        spikes: SpikeSave[];
        gem: GemSave | null;
    };
    win: boolean;
}

export interface PlayerSave {
    position: [number, number];
    startPos: [number, number];
    dead: boolean;
    win: boolean;
    direction: number;
    grounded: boolean;
}

export interface TerrainSave {
    tiles: { x: number; y: number }[];
    randomOffset: number;
}

export interface CoinSave {
    position: [number, number];
    collected: boolean;
}

export interface CheckpointSave {
    position: [number, number];
    claimed: boolean;
}

export interface BaddieSave {
    position: [number, number];
    direction: number;
}

export interface SpikeSave {
    position: [number, number];
}

export interface GemSave {
    position: [number, number];
    collected: boolean;
}

let autoSaveTimer: number | null = null;

function collectSaveData(): SaveData | null {
    const engine = GameEngine.getEngine();
    const player = engine.getPlayer() as Player | null;
    if (!player) return null;

    const terrain = engine.terrainObjects[0] as Terrain | undefined;
    if (!terrain) return null;

    const coins: CoinSave[] = [];
    const checkpoints: CheckpointSave[] = [];
    const baddies: BaddieSave[] = [];
    const spikes: SpikeSave[] = [];
    let gem: GemSave | null = null;

    for (const go of engine.getGameObjects()) {
        const pos = go.getPosition();
        const posTuple: [number, number] = [pos[0], pos[1]];

        if (go instanceof Coin) {
            coins.push({ position: posTuple, collected: go.isCollected() });
        } else if (go instanceof Checkpoint) {
            checkpoints.push({ position: posTuple, claimed: go.isClaimed() });
        } else if (go instanceof Baddie) {
            baddies.push({ position: posTuple, direction: go.getDirection() });
        } else if (go instanceof Spike) {
            spikes.push({ position: posTuple });
        } else if (go instanceof Gem) {
            gem = { position: posTuple, collected: go.isCollected() };
        }
    }

    return {
        sceneAttributes: { ...sceneAttributes },
        player: player.serialize(),
        terrain: terrain.serialize(),
        entities: { coins, checkpoints, baddies, spikes, gem },
        win: engine.isWin(),
    };
}

function applySaveData(data: SaveData) {
    const engine = GameEngine.getEngine();

    // Clear ALL existing game objects (including player)
    engine.clearDynamicGameObjects();

    // Restore scene attributes
    Object.assign(sceneAttributes, data.sceneAttributes);

    // Rebuild terrain
    const terrain = new Terrain();
    terrain.deserialize(data.terrain);
    engine.terrainObjects.length = 0;
    engine.setTerrain(terrain);

    // Rebuild entities
    for (const coinData of data.entities.coins) {
        const coin = new Coin(coinData.position);
        if (coinData.collected) coin.markCollected();
    }
    for (const cpData of data.entities.checkpoints) {
        const cp = new Checkpoint(cpData.position);
        if (cpData.claimed) cp.markClaimed();
    }
    for (const baddieData of data.entities.baddies) {
        new Baddie(baddieData.position, terrain);
    }
    for (const spikeData of data.entities.spikes) {
        new Spike(spikeData.position);
    }
    if (data.entities.gem && !data.entities.gem.collected) {
        new Gem(data.entities.gem.position);
    }

    // Create new player at saved position
    const player = new Player(data.player.position);
    player.deserialize(data.player);

    // Re-parent camera to loaded player
    engine.getCamera().makeParent(player as any);
}

class SaveManager {

    static save(): boolean {
        const data = collectSaveData();
        if (!data) return false;
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    static load(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data: SaveData = JSON.parse(raw);
            // Skip old saves that don't have entities
            if (!data.entities || !Array.isArray(data.entities.coins)) {
                SaveManager.deleteSave();
                return false;
            }
            applySaveData(data);
            // Re-parent camera to loaded player
            const engine = GameEngine.getEngine();
            const player = engine.getPlayer() as Player | null;
            if (player) {
                engine.getCamera().makeParent(player as any);
            }
            engine.startGame();
            return true;
        } catch (e) {
            console.error('SaveManager: failed to load', e);
            return false;
        }
    }

    static hasSave(): boolean {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    static deleteSave(): void {
        localStorage.removeItem(SAVE_KEY);
    }

    static startAutoSave(): void {
        if (autoSaveTimer !== null) clearInterval(autoSaveTimer);
        autoSaveTimer = window.setInterval(() => {
            SaveManager.save();
        }, AUTOSAVE_INTERVAL_MS);

        // Auto-save on checkpoint collision — Player.ts calls __onCheckpointClaimed
        (window as any).__onCheckpointClaimed = () => {
            SaveManager.save();
        };
    }

    static stopAutoSave(): void {
        if (autoSaveTimer !== null) {
            clearInterval(autoSaveTimer);
            autoSaveTimer = null;
        }
        delete (window as any).__onCheckpointClaimed;
    }
}

export default SaveManager;

import {vec2} from 'gl-matrix';
import GameObject from '../engine/GameObject';
import GameEngine from '../engine/GameEngine';
import Particle from './Particle';
import {spriteCoordinates} from '../constants';
import WinEffectManager from './WinEffectManager';

export default class Gem extends GameObject {

    private collected: boolean = false;

    constructor(pos: vec2 | number[]) {
        super(false, false, true);
        this.setPosition(pos);
    }

    isCollected(): boolean {
        return this.collected;
    }

    markCollected(): void {
        this.collected = true;
        this.destroy();
    }

    getSpriteUv(): vec2 {
        return spriteCoordinates.SPRITE_GEM;
    }

    onUpdate(delta: number) {
        if (Math.random() < 0.02) {
            let sparkle = new Particle(
                spriteCoordinates.SPRITE_SPARKLE,
                vec2.fromValues(
                    this.getPosition()[0] + Math.random() - 0.5,
                    this.getPosition()[1] + Math.random() - 0.5,
                ),
                0.5
            );
            sparkle.setMovement((time: number) => {
                sparkle.setSize(time * (0.5 - time) * 8);
                return vec2.create();
            });
        }
    }

    onCollision(other: GameObject) {
        if (other.constructor.name === "Player" && !this.collected) {
            let manager = new WinEffectManager();
            manager.isActive = true;
            GameEngine.getEngine().onWin();
            this.markCollected();
        }
    }

}
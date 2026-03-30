import {vec2} from 'gl-matrix';
import GameObject from '../engine/GameObject';
import GameEngine from '../engine/GameEngine';
import Particle from './Particle';
import {spriteCoordinates} from '../constants';

export default class WinEffectManager extends GameObject {

    public isActive: boolean = false;
    private burstCooldown: number = 0;
    private readonly BURST_INTERVAL: number = 0.8;

    constructor() {
        super(false, true, false);
    }

    getSpriteUv(): vec2 {
        return spriteCoordinates.SPRITE_SPARKLE;
    }

    onUpdate(delta: number) {
        if (!this.isActive) {
            return;
        }
        this.burstCooldown -= delta;
        if (this.burstCooldown <= 0) {
            this.spawnBurst();
            this.burstCooldown = this.BURST_INTERVAL;
        }
    }

    private spawnBurst() {
        for (let go of GameEngine.getEngine().getCollidableObjects()) {
            if ((go as any).constructor?.name === "Player") {
                let pos = go.getPosition();
                for (let i = 0; i < 12; i++) {
                    let angle = i * Math.PI * 2 / 12;
                    let dir = vec2.fromValues(Math.cos(angle), Math.sin(angle));
                    let sparkle = new Particle(
                        spriteCoordinates.SPRITE_SPARKLE,
                        vec2.add(vec2.create(), pos,
                            vec2.scale(vec2.create(), dir, 0.3)),
                        0.8
                    );
                    sparkle.setSize(0.7);
                    sparkle.setMovement((time: number) => {
                        return vec2.scale(vec2.create(), dir, time * 3);
                    });
                }
                break;
            }
        }
    }
}

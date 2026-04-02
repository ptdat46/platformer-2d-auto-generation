export interface Track {
    name: string;
    file: string;
}

export const TRACKS: Track[] = [
    { name: 'Mặc Định', file: '' },
    { name: 'Beat 1', file: 'music/beat1.mp3' },
    { name: 'Beat 2', file: 'music/beat2.mp3' },
    { name: 'Beat 3', file: 'music/beat3.mp3' },
];

class AudioManager {
    private audio: HTMLAudioElement;
    private currentTrack: string = '';

    constructor() {
        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.volume = 0.3;
    }

    play(trackFile: string): void {
        if (!trackFile) {
            this.stop();
            return;
        }
        if (this.currentTrack === trackFile) return;

        this.audio.src = trackFile;
        this.audio.load();
        this.currentTrack = trackFile;
        this.audio.play().catch(() => {});
    }

    stop(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.currentTrack = '';
    }

    setVolume(volume: number): void {
        this.audio.volume = Math.max(0, Math.min(1, volume));
    }

    getVolume(): number {
        return this.audio.volume;
    }

    isPlaying(): boolean {
        return !this.audio.paused;
    }

    getCurrentTrack(): string {
        return this.currentTrack;
    }
}

export default new AudioManager();

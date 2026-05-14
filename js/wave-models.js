window.App = window.App || {};

App.WaveModels = {
    states: null,
    _noiseBuf: null,

    init() {
        this.states = [];
        for (let s = 0; s < App.Config.NUM_STRINGS; s++) {
            this.states.push({ waves: [] });
        }
    },

    strum(stringIdx, normalizedY, intensity) {
        const state = this.states[stringIdx];
        const baseFreq = 6 + Math.random() * 4;
        const amp = intensity * 0.015;
        state.waves.push(
            { age: 0, amp, freq: baseFreq, dir: 1, speed: 0.012 + intensity * 0.008, pos: normalizedY },
            { age: 0, amp, freq: baseFreq, dir: -1, speed: 0.012 + intensity * 0.008, pos: normalizedY }
        );
        if (state.waves.length > 16) state.waves.splice(0, 2);
    },

    update() {
        for (const state of this.states) {
            for (let i = state.waves.length - 1; i >= 0; i--) {
                const w = state.waves[i];
                w.age += 1;
                w.amp *= 0.997;
                w.pos += w.dir * w.speed;
                if (w.pos > 1.0) { w.pos = 2.0 - w.pos; w.dir *= -1; }
                else if (w.pos < 0.0) { w.pos = -w.pos; w.dir *= -1; }
                if (w.amp < 0.001) state.waves.splice(i, 1);
            }
        }
    },

    // t: normalized position [0,1] along string; time: animation clock (seconds);
    // freq: spatial frequency multiplier; phase: offset (radians); baseAmplitude: pixels
    getDisplacement(stringIdx, t, time, baseAmplitude, freq, phase) {
        const state = this.states[stringIdx];
        const envelope = Math.sin(t * Math.PI);
        let d = Math.sin(t * freq * Math.PI * 4 + time * (2 + stringIdx * 0.5) + phase) * baseAmplitude * envelope;

        for (let i = 0, len = state.waves.length; i < len; i++) {
            const w = state.waves[i];
            const dist = t - w.pos;
            if (dist > 0.08 || dist < -0.08) continue;
            const distSq = dist * dist;
            const falloff = 1 - distSq * 156;
            if (falloff <= 0) continue;
            d += Math.sin(t * w.freq * Math.PI + w.age * 0.3) * w.amp * baseAmplitude * falloff;
        }

        return d;
    }
};

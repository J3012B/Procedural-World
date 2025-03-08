// Audio system
export class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.currentMusic = null;
        this.musicVolume = 0.3; // Default music volume
        this.soundVolume = 0.5; // Default sound volume
        this.initialized = false;
        this.musicSystem = {
            context: null,
            mainGainNode: null,
            currentTrack: null,
            isPlaying: false,
            melodyOscillators: [],
            bassOscillators: [],
            scheduledNotes: [],
            tracks: {
                main: {
                    name: 'main',
                    bpm: 120,
                    notes: [], // Will be generated
                    bassline: [], // Will be generated
                    drums: [] // Will be generated
                },
                combat: {
                    name: 'combat',
                    bpm: 150,
                    notes: [], // Will be generated
                    bassline: [], // Will be generated
                    drums: [] // Will be generated
                }
            }
        };
        
        // Sound effects
        this.sounds = {
            damage: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            attack: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            enemyHit: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            enemyDefeat: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            combatStart: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            combatEnd: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v'
        };
    }
    
    // Initialize audio system
    init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create music system
            this.initMusicSystem();
            
            this.initialized = true;
            console.log("Audio system initialized");
            return true;
        } catch (error) {
            console.warn("Audio could not be initialized. Music will be disabled.");
            this.musicEnabled = false;
            return false;
        }
    }
    
    // Initialize music system
    initMusicSystem() {
        try {
            if (!this.audioContext) return false;
            
            this.musicSystem.context = this.audioContext;
            
            // Create main gain node
            this.musicSystem.mainGainNode = this.audioContext.createGain();
            this.musicSystem.mainGainNode.gain.value = this.musicVolume;
            this.musicSystem.mainGainNode.connect(this.audioContext.destination);
            
            // Generate music patterns
            this.generateMusicPatterns();
            
            // Start with main theme
            this.playMusic('main');
            
            console.log("Music system initialized");
            return true;
        } catch (error) {
            console.error(`Error in music system initialization: ${error.message}`);
            return false;
        }
    }
    
    // Generate music patterns for all tracks
    generateMusicPatterns() {
        try {
            // Generate main theme (heroic, adventurous)
            const mainMelody = [
                { note: 'C4', duration: 0.5 },
                { note: 'E4', duration: 0.5 },
                { note: 'G4', duration: 0.5 },
                { note: 'C5', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'G4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'F4', duration: 0.5 },
                { note: 'G4', duration: 1.0 },
                { note: 'E4', duration: 0.5 },
                { note: 'C4', duration: 0.5 },
                { note: 'D4', duration: 0.5 },
                { note: 'E4', duration: 0.5 },
                { note: 'F4', duration: 0.5 },
                { note: 'G4', duration: 1.0 }
            ];
            
            const mainBassline = [
                { note: 'C2', duration: 1.0 },
                { note: 'G2', duration: 1.0 },
                { note: 'A2', duration: 1.0 },
                { note: 'F2', duration: 1.0 },
                { note: 'C2', duration: 1.0 },
                { note: 'G2', duration: 1.0 },
                { note: 'F2', duration: 1.0 },
                { note: 'G2', duration: 1.0 }
            ];
            
            const mainDrums = [
                { type: 'kick', time: 0.0 },
                { type: 'hihat', time: 0.5 },
                { type: 'snare', time: 1.0 },
                { type: 'hihat', time: 1.5 },
                { type: 'kick', time: 2.0 },
                { type: 'hihat', time: 2.5 },
                { type: 'snare', time: 3.0 },
                { type: 'hihat', time: 3.5 }
            ];
            
            // Generate combat theme (intense, faster)
            const combatMelody = [
                { note: 'E4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'G4', duration: 0.5 },
                { note: 'E4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'A4', duration: 0.5 },
                { note: 'E4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'B4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'G4', duration: 0.5 },
                { note: 'E4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'G4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'C5', duration: 0.5 }
            ];
            
            const combatBassline = [
                { note: 'E2', duration: 0.5 },
                { note: 'E2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'B2', duration: 0.5 },
                { note: 'B2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'G2', duration: 0.5 },
                { note: 'E2', duration: 0.5 },
                { note: 'E2', duration: 0.5 },
                { note: 'G2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'B2', duration: 0.5 },
                { note: 'B2', duration: 0.5 },
                { note: 'C3', duration: 0.5 },
                { note: 'C3', duration: 0.5 }
            ];
            
            const combatDrums = [
                { type: 'kick', time: 0.0 },
                { type: 'hihat', time: 0.25 },
                { type: 'snare', time: 0.5 },
                { type: 'hihat', time: 0.75 },
                { type: 'kick', time: 1.0 },
                { type: 'hihat', time: 1.25 },
                { type: 'snare', time: 1.5 },
                { type: 'hihat', time: 1.75 },
                { type: 'kick', time: 2.0 },
                { type: 'kick', time: 2.25 },
                { type: 'snare', time: 2.5 },
                { type: 'hihat', time: 2.75 },
                { type: 'kick', time: 3.0 },
                { type: 'hihat', time: 3.25 },
                { type: 'snare', time: 3.5 },
                { type: 'snare', time: 3.75 }
            ];
            
            // Assign patterns to tracks
            this.musicSystem.tracks.main.notes = mainMelody;
            this.musicSystem.tracks.main.bassline = mainBassline;
            this.musicSystem.tracks.main.drums = mainDrums;
            
            this.musicSystem.tracks.combat.notes = combatMelody;
            this.musicSystem.tracks.combat.bassline = combatBassline;
            this.musicSystem.tracks.combat.drums = combatDrums;
            
        } catch (error) {
            console.error(`Error in music pattern generation: ${error.message}`);
        }
    }
    
    // Play a music track
    playMusic(trackName) {
        try {
            if (!this.musicEnabled || !this.audioContext) return;
            
            // Stop current music if playing
            if (this.musicSystem.isPlaying) {
                this.stopMusic();
            }
            
            // Get the track
            const track = this.musicSystem.tracks[trackName];
            if (!track) {
                console.warn(`Music track "${trackName}" not found`);
                return;
            }
            
            this.musicSystem.currentTrack = trackName;
            this.musicSystem.isPlaying = true;
            
            // Play the track
            this.playMusicTrack(track);
            
            console.log(`Playing music track: ${trackName}`);
        } catch (error) {
            console.error(`Error in play music: ${error.message}`);
        }
    }
    
    // Stop the current music
    stopMusic() {
        try {
            if (!this.musicSystem.isPlaying) return;
            
            // Stop all oscillators
            if (this.musicSystem.melodyOscillators) {
                this.musicSystem.melodyOscillators.forEach(osc => {
                    try {
                        osc.stop();
                        osc.disconnect();
                    } catch (e) {
                        // Ignore errors from already stopped oscillators
                    }
                });
            }
            
            if (this.musicSystem.bassOscillators) {
                this.musicSystem.bassOscillators.forEach(osc => {
                    try {
                        osc.stop();
                        osc.disconnect();
                    } catch (e) {
                        // Ignore errors from already stopped oscillators
                    }
                });
            }
            
            // Clear any scheduled notes
            if (this.musicSystem.scheduledNotes) {
                this.musicSystem.scheduledNotes.forEach(note => clearTimeout(note));
            }
            
            this.musicSystem.isPlaying = false;
            this.musicSystem.melodyOscillators = [];
            this.musicSystem.bassOscillators = [];
            this.musicSystem.scheduledNotes = [];
            
            console.log("Music stopped");
        } catch (error) {
            console.error(`Error in stop music: ${error.message}`);
        }
    }
    
    // Play a music track with melody, bassline and drums
    playMusicTrack(track) {
        try {
            const context = this.musicSystem.context;
            const bpm = track.bpm;
            const beatDuration = 60 / bpm;
            
            // Create oscillator arrays
            this.musicSystem.melodyOscillators = [];
            this.musicSystem.bassOscillators = [];
            this.musicSystem.scheduledNotes = [];
            
            // Create gain nodes for each part
            const melodyGain = context.createGain();
            melodyGain.gain.value = 0.2;
            melodyGain.connect(this.musicSystem.mainGainNode);
            
            const bassGain = context.createGain();
            bassGain.gain.value = 0.3;
            bassGain.connect(this.musicSystem.mainGainNode);
            
            const drumsGain = context.createGain();
            drumsGain.gain.value = 0.4;
            drumsGain.connect(this.musicSystem.mainGainNode);
            
            // Function to play a note with 8-bit sound
            const playNote = (note, time, duration, isBaseline = false) => {
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                // Use square wave for 8-bit sound
                oscillator.type = isBaseline ? 'square' : 'square';
                
                // Convert note name to frequency
                const freq = this.noteToFrequency(note);
                oscillator.frequency.value = freq;
                
                // Connect oscillator to gain node
                oscillator.connect(gainNode);
                gainNode.connect(isBaseline ? bassGain : melodyGain);
                
                // Schedule note start and end
                const startTime = context.currentTime + time;
                const stopTime = startTime + duration * beatDuration * 0.9; // Slightly shorter for staccato effect
                
                // Apply envelope for 8-bit sound
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
                gainNode.gain.setValueAtTime(0.8, stopTime - 0.05);
                gainNode.gain.linearRampToValueAtTime(0, stopTime);
                
                // Start and stop the oscillator
                oscillator.start(startTime);
                oscillator.stop(stopTime);
                
                // Store oscillator for later cleanup
                if (isBaseline) {
                    this.musicSystem.bassOscillators.push(oscillator);
                } else {
                    this.musicSystem.melodyOscillators.push(oscillator);
                }
            };
            
            // Function to play a drum sound
            const playDrum = (type, time) => {
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(drumsGain);
                
                const startTime = context.currentTime + time;
                
                if (type === 'kick') {
                    // Kick drum
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(120, startTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, startTime + 0.1);
                    
                    gainNode.gain.setValueAtTime(1, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.2);
                } else if (type === 'snare') {
                    // Snare drum (noise-based)
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(100, startTime);
                    
                    gainNode.gain.setValueAtTime(0.8, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.1);
                    
                    // Add noise component
                    const noiseBuffer = this.createNoiseBuffer(context);
                    const noiseSource = context.createBufferSource();
                    const noiseGain = context.createGain();
                    
                    noiseSource.buffer = noiseBuffer;
                    noiseSource.connect(noiseGain);
                    noiseGain.connect(drumsGain);
                    
                    noiseGain.gain.setValueAtTime(0.5, startTime);
                    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                    
                    noiseSource.start(startTime);
                    noiseSource.stop(startTime + 0.1);
                } else if (type === 'hihat') {
                    // Hi-hat (high-frequency noise)
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(800, startTime);
                    
                    gainNode.gain.setValueAtTime(0.2, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.05);
                }
            };
            
            // Schedule melody notes
            let melodyTime = 0;
            track.notes.forEach(note => {
                playNote(note.note, melodyTime, note.duration);
                melodyTime += note.duration * beatDuration;
            });
            
            // Schedule bassline notes
            let bassTime = 0;
            track.bassline.forEach(note => {
                playNote(note.note, bassTime, note.duration, true);
                bassTime += note.duration * beatDuration;
            });
            
            // Schedule drum hits
            track.drums.forEach(drum => {
                playDrum(drum.type, drum.time * beatDuration);
            });
            
            // Schedule loop to continue playing
            const loopDuration = Math.max(melodyTime, bassTime);
            const loopTimeout = setTimeout(() => {
                if (this.musicSystem.isPlaying && this.musicSystem.currentTrack === track.name) {
                    this.playMusicTrack(track);
                }
            }, loopDuration * 1000);
            
            this.musicSystem.scheduledNotes.push(loopTimeout);
        } catch (error) {
            console.error(`Error in play music track: ${error.message}`);
        }
    }
    
    // Create a noise buffer for drum sounds
    createNoiseBuffer(context) {
        const bufferSize = context.sampleRate * 0.1; // 100ms buffer
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    // Convert note name to frequency
    noteToFrequency(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = parseInt(note.slice(-1));
        const noteName = note.slice(0, -1);
        
        const noteIndex = notes.indexOf(noteName);
        if (noteIndex === -1) return 440; // Default to A4 if note not found
        
        // Calculate frequency using equal temperament formula
        // A4 = 440Hz, each semitone is 2^(1/12) times the previous
        const semitoneFromA4 = (octave - 4) * 12 + noteIndex - 9;
        return 440 * Math.pow(2, semitoneFromA4 / 12);
    }
    
    // Toggle music on/off
    toggleMusic() {
        try {
            if (!this.initialized) {
                this.init();
                return;
            }
            
            this.musicEnabled = !this.musicEnabled;
            
            if (this.musicEnabled) {
                // Resume audio context if suspended
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                return true;
            } else {
                this.stopMusic();
                return false;
            }
        } catch (error) {
            console.error(`Error in toggle music: ${error.message}`);
            return false;
        }
    }
    
    // Play a sound effect
    playSound(soundName) {
        try {
            if (!this.initialized || !this.audioContext) return;
            
            // Only play if we have the sound
            if (this.sounds[soundName]) {
                const audio = new Audio(this.sounds[soundName]);
                audio.volume = this.soundVolume;
                audio.play().catch(e => console.log('Audio play error:', e));
            }
        } catch (error) {
            console.error(`Error in play sound: ${error.message}`);
        }
    }
} 
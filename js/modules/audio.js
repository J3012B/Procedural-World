// Audio system
export class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.soundVolume = 0.5; // Default sound volume
        this.initialized = false;
        
        // Sound effects
        this.sounds = {
            damage: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            attack: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            enemyHit: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            enemyDefeat: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            combatStart: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            combatEnd: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            swordSwing: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            enemyNearby: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            heartCollect: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v'
        };
        
        // Sound timers to prevent too frequent playing
        this.soundTimers = {
            enemyNearby: 0,
            enemyNearbyInterval: 120 // Play every 2 seconds at most
        };
    }
    
    // Initialize audio system
    init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.initialized = true;
            console.log("Audio system initialized");
            return true;
        } catch (error) {
            console.warn("Audio could not be initialized. Sound will be disabled.");
            return false;
        }
    }
    
    // Play a sound effect
    playSound(soundName) {
        try {
            if (!this.initialized || !this.audioContext) return;
            
            // Check sound timers for rate-limited sounds
            if (soundName === 'enemyNearby') {
                if (this.soundTimers.enemyNearby > 0) {
                    return; // Skip if too soon
                }
                this.soundTimers.enemyNearby = this.soundTimers.enemyNearbyInterval;
            }
            
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
    
    // Update sound timers
    updateSoundTimers() {
        // Decrease all sound timers
        for (const timer in this.soundTimers) {
            if (typeof this.soundTimers[timer] === 'number' && this.soundTimers[timer] > 0) {
                this.soundTimers[timer]--;
            }
        }
    }
    
    // Play enemy nearby sound if enemies are close
    playEnemyNearbySound(nearbyEnemies) {
        if (nearbyEnemies && nearbyEnemies.length > 0) {
            // Find closest enemy
            let closestDistance = Infinity;
            for (const enemy of nearbyEnemies) {
                if (enemy.distance < closestDistance) {
                    closestDistance = enemy.distance;
                }
            }
            
            // Play sound if very close (within 2 tiles)
            if (closestDistance < 64) {
                this.playSound('enemyNearby');
            }
        }
    }
} 
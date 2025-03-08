import { PLAYER_SIZE } from './constants.js';

// Player object with all properties
export const player = {
    worldX: 0,
    worldY: 0,
    color: '#8C8C8C', // Silver/gray for knight armor
    size: PLAYER_SIZE,
    speed: 3, // Slightly slower for a knight in armor
    animationFrame: 0,
    isMoving: false,
    lastDirection: { x: 0, y: 0 },
    blinkRate: 0.1, // Controls how often the knight blinks
    inBoat: false, // Whether the knight is currently in a boat
    boatColor: '#8B4513', // Brown wooden boat
    health: 3, // Player starts with 3 hearts
    maxHealth: 3, // Maximum health
    invulnerable: false, // Invulnerability after taking damage
    invulnerabilityTime: 0, // Time remaining for invulnerability
    invulnerabilityDuration: 120, // Frames of invulnerability (2 seconds at 60fps)
    damageFlashTime: 0, // Time remaining for damage flash effect
    isAttacking: false, // Whether the player is currently attacking
    attackCooldown: 0, // Cooldown time between attacks
    attackCooldownDuration: 20, // Frames of cooldown (0.33 seconds at 60fps)
    attackDuration: 15, // How long the attack animation lasts
    attackTime: 0, // Current frame of the attack animation
    attackRange: PLAYER_SIZE * 2.5, // Range of the sword attack
    minDamage: 1, // Minimum damage dealt by the sword
    maxDamage: 3, // Maximum damage dealt by the sword
    criticalChance: 0.1, // 10% chance for critical hit
    criticalMultiplier: 2, // Critical hits do double damage
    inCombat: false, // Whether the player is currently in combat
    combatTimer: 0, // Time remaining in combat state
    combatDuration: 180, // How long combat lasts after last enemy interaction (3 seconds)
    nearbyEnemies: [], // Enemies that are currently in combat range
    score: 0, // Player's score
    combo: 0, // Current combo count
    comboTimer: 0, // Time remaining for current combo
    comboDuration: 180, // How long combos last (3 seconds at 60fps)
    killEffects: [] // Visual effects for kills
};

// Update player animation
export function updatePlayerAnimation() {
    if (player.isMoving) {
        player.animationFrame += 0.5;
    } else {
        // Slower animation when not moving
        player.animationFrame += 0.1;
    }
    
    // Keep animation frame within reasonable bounds
    if (player.animationFrame > 1000) {
        player.animationFrame = 0;
    }
    
    // Random blinking
    if (Math.random() < player.blinkRate / 60) {
        player.isBlinking = true;
        setTimeout(() => {
            player.isBlinking = false;
        }, 150); // Blink duration in milliseconds
    }
}

// Start a sword attack
export function startAttack() {
    try {
        player.isAttacking = true;
        player.attackTime = player.attackDuration;
    } catch (error) {
        console.error(`Error in start attack: ${error.message}`);
    }
}

// Update the attack state
export function updateAttackState() {
    try {
        // Update attack cooldown
        if (player.attackCooldown > 0) {
            player.attackCooldown--;
        }
        
        // Update attack animation
        if (player.isAttacking) {
            player.attackTime--;
            
            // Attack is finished
            if (player.attackTime <= 0) {
                player.isAttacking = false;
                player.attackCooldown = player.attackCooldownDuration;
            }
        }
    } catch (error) {
        console.error(`Error in update attack state: ${error.message}`);
    }
}

// Damage the player and handle invulnerability
export function damagePlayer(amount, audioSystem) {
    try {
        // Only take damage if not invulnerable
        if (!player.invulnerable) {
            player.health -= amount;
            
            // Make player invulnerable temporarily
            player.invulnerable = true;
            player.invulnerabilityTime = player.invulnerabilityDuration;
            player.damageFlashTime = 10; // Flash for 10 frames
            
            // Play damage sound
            if (audioSystem) {
                audioSystem.playSound('damage');
            }
            
            // Check if player is dead
            if (player.health <= 0) {
                return true; // Player died
            }
        }
        return false; // Player still alive
    } catch (error) {
        console.error(`Error in player damage: ${error.message}`);
        return false;
    }
}

// Reset player to initial state
export function resetPlayer() {
    player.health = player.maxHealth;
    player.invulnerable = false;
    player.invulnerabilityTime = 0;
    player.damageFlashTime = 0;
    player.isAttacking = false;
    player.attackCooldown = 0;
    player.attackTime = 0;
    player.inCombat = false;
    player.combatTimer = 0;
    player.nearbyEnemies = [];
    player.combo = 0;
    player.comboTimer = 0;
    player.killEffects = [];
} 
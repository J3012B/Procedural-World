import { TILE_SIZE, OBJECTS, TERRAIN, ENEMY_PROPERTIES, ENEMY_TYPES } from './constants.js';
import { player } from './player.js';
import { HEART_COLLECTIBLE, addHeartDrop } from './collectibles.js';

// Array to store all enemies
export let enemies = [];

// Maximum number of enemies to spawn
export const MAX_ENEMIES = 30;

// Minimum distance between enemies and player when spawning
export const MIN_SPAWN_DISTANCE = TILE_SIZE * 10;

// Spawn enemies randomly around the world
export function spawnEnemies(getTerrainAt, getObjectAt) {
    try {
        console.log("Spawning enemies...");
        
        // Clear existing enemies
        enemies = [];
        
        // Spawn up to MAX_ENEMIES
        for (let i = 0; i < MAX_ENEMIES; i++) {
            // Generate a random position that's not too close to the player
            let enemyX, enemyY;
            let validPosition = false;
            let attempts = 0;
            
            while (!validPosition && attempts < 50) {
                // Random position within a reasonable range of the player
                const range = TILE_SIZE * 50; // 50 tiles range
                enemyX = player.worldX + (Math.random() * range * 2 - range);
                enemyY = player.worldY + (Math.random() * range * 2 - range);
                
                // Check if position is valid (not in water, not in objects, not too close to player)
                const tileX = Math.floor(enemyX / TILE_SIZE);
                const tileY = Math.floor(enemyY / TILE_SIZE);
                const terrain = getTerrainAt(tileX, tileY);
                const object = getObjectAt(tileX, tileY);
                const distanceToPlayer = Math.sqrt(
                    Math.pow(enemyX - player.worldX, 2) + 
                    Math.pow(enemyY - player.worldY, 2)
                );
                
                validPosition = (
                    terrain !== TERRAIN.WATER && 
                    object === OBJECTS.NONE && 
                    distanceToPlayer > MIN_SPAWN_DISTANCE
                );
                
                attempts++;
            }
            
            if (validPosition) {
                // Choose a random enemy type
                const enemyType = Math.floor(Math.random() * Object.keys(ENEMY_TYPES).length);
                
                // Create the enemy
                const enemy = {
                    type: enemyType,
                    worldX: enemyX,
                    worldY: enemyY,
                    ...ENEMY_PROPERTIES[enemyType], // Spread in the properties for this enemy type
                    animationFrame: Math.random() * 100, // Random starting animation frame
                    isMoving: false,
                    moveDirection: { x: 0, y: 0 },
                    lastMoveChange: 0,
                    health: ENEMY_PROPERTIES[enemyType].health, // Initialize health
                    hitEffect: 0
                };
                
                enemies.push(enemy);
            }
        }
        
        console.log(`Spawned ${enemies.length} enemies`);
        return enemies;
    } catch (error) {
        console.error(`Error in enemy spawning: ${error.message}`);
        return [];
    }
}

// Update all enemies
export function updateEnemies(gameTime, getTerrainAt, getObjectAt, damagePlayer) {
    try {
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Update animation
            enemy.animationFrame += 0.2;
            if (enemy.animationFrame > 1000) {
                enemy.animationFrame = 0;
            }
            
            // Update hit effect
            if (enemy.hitEffect > 0) {
                enemy.hitEffect--;
            }
            
            // Check for collision with player
            if (!player.invulnerable) {
                const distanceToPlayer = Math.sqrt(
                    Math.pow(enemy.worldX - player.worldX, 2) + 
                    Math.pow(enemy.worldY - player.worldY, 2)
                );
                
                // If enemy is touching player, damage player
                if (distanceToPlayer < (player.size/2 + enemy.size/2) * 0.8) {
                    damagePlayer(1);
                }
            }
            
            // Determine if enemy should follow player
            let shouldFollow = false;
            if (enemy.followPlayer) {
                const distanceToPlayer = Math.sqrt(
                    Math.pow(enemy.worldX - player.worldX, 2) + 
                    Math.pow(enemy.worldY - player.worldY, 2)
                );
                
                shouldFollow = distanceToPlayer <= enemy.detectionRadius;
            }
            
            // Update movement
            if (shouldFollow) {
                // Follow player
                const dx = player.worldX - enemy.worldX;
                const dy = player.worldY - enemy.worldY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    enemy.moveDirection = {
                        x: dx / distance,
                        y: dy / distance
                    };
                    enemy.isMoving = true;
                }
            } else {
                // Random movement for non-following enemies or when player is out of range
                if (gameTime - enemy.lastMoveChange > 120) { // Change direction every ~2 seconds
                    // 20% chance to stop, 80% chance to move in a random direction
                    if (Math.random() < 0.2) {
                        enemy.isMoving = false;
                    } else {
                        const angle = Math.random() * Math.PI * 2;
                        enemy.moveDirection = {
                            x: Math.cos(angle),
                            y: Math.sin(angle)
                        };
                        enemy.isMoving = true;
                    }
                    enemy.lastMoveChange = gameTime;
                }
            }
            
            // Apply movement
            if (enemy.isMoving) {
                const newX = enemy.worldX + enemy.moveDirection.x * enemy.speed;
                const newY = enemy.worldY + enemy.moveDirection.y * enemy.speed;
                
                // Check for collisions
                const tileX = Math.floor(newX / TILE_SIZE);
                const tileY = Math.floor(newY / TILE_SIZE);
                const terrain = getTerrainAt(tileX, tileY);
                const object = getObjectAt(tileX, tileY);
                
                // Only move if not colliding with water or objects
                if (terrain !== TERRAIN.WATER && object === OBJECTS.NONE) {
                    enemy.worldX = newX;
                    enemy.worldY = newY;
                } else {
                    // If collision, change direction immediately
                    enemy.lastMoveChange = gameTime - 100; // Force direction change soon
                }
            }
        }
    } catch (error) {
        console.error(`Error in enemy updating: ${error.message}`);
    }
}

// Damage an enemy
export function damageEnemy(enemyIndex, amount, isCritical, wasResisted, audioSystem) {
    try {
        // Add health property to enemy if it doesn't exist
        if (typeof enemies[enemyIndex].health === 'undefined') {
            // Use the predefined health from ENEMY_PROPERTIES
            const enemyType = enemies[enemyIndex].type;
            enemies[enemyIndex].health = ENEMY_PROPERTIES[enemyType].health;
        }
        
        // Get enemy position for effects
        const enemy = enemies[enemyIndex];
        const enemyX = enemy.worldX;
        const enemyY = enemy.worldY;
        
        // Add hit effect
        enemy.hitEffect = 10; // Flash for 10 frames
        
        // Play hit sound
        if (audioSystem) {
            audioSystem.playSound('enemyHit');
        }
        
        // Reduce enemy health
        enemy.health -= amount;
        
        // Check if enemy is defeated
        if (enemy.health <= 0) {
            // Get enemy type before removing
            const enemyType = enemy.type;
            
            // Remove the enemy
            enemies.splice(enemyIndex, 1);
            
            // Play defeat sound
            if (audioSystem) {
                audioSystem.playSound('enemyDefeat');
            }
            
            // Chance to drop a heart
            if (Math.random() < HEART_COLLECTIBLE.dropChance) {
                addHeartDrop(enemyX, enemyY);
            }
            
            // Increment combo
            player.combo++;
            player.comboTimer = player.comboDuration;
            
            // Calculate score based on enemy type and combo
            let baseScore;
            switch (enemyType) {
                case ENEMY_TYPES.GOBLIN:
                    baseScore = 300; // Higher score for tougher enemy
                    break;
                case ENEMY_TYPES.SKELETON:
                    baseScore = 200;
                    break;
                case ENEMY_TYPES.SLIME:
                    baseScore = 100;
                    break;
                default:
                    baseScore = 100;
            }
            
            // Apply combo multiplier
            const scoreGain = baseScore * player.combo;
            
            // Add to total score
            player.score += scoreGain;
            
            return { 
                hit: true, 
                killed: true,
                enemyType,
                position: { x: enemyX, y: enemyY },
                score: scoreGain
            };
        }
        
        return { 
            hit: true, 
            killed: false,
            position: { x: enemyX, y: enemyY },
            damage: amount,
            isCritical,
            wasResisted
        };
    } catch (error) {
        console.error(`Error in damage enemy: ${error.message}`);
        return { hit: false, killed: false };
    }
} 
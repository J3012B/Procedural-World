// Import modules
import { TILE_SIZE, PLAYER_SIZE, TERRAIN, OBJECTS, TERRAIN_COLORS, ENEMY_TYPES, ENEMY_PROPERTIES, GAMEPAD_BUTTON, GAMEPAD_DEADZONE } from './modules/constants.js';
import { player, updatePlayerAnimation, startAttack, updateAttackState, damagePlayer, resetPlayer } from './modules/player.js';
import { enemies, spawnEnemies, updateEnemies, damageEnemy } from './modules/enemies.js';
import { AudioSystem } from './modules/audio.js';
import { collectibles, updateCollectibles, drawCollectibles } from './modules/collectibles.js';

// Game variables
let canvas, ctx;
let cameraX = 0, cameraY = 0;
let worldMap = {};
let worldObjects = {};
let keysPressed = {};
let tileImages = {};
let objectImages = {};
let gameTime = 0;
let minimapVisible = true;
let gamepads = {};
let gamepadConnected = false;
let screenShakeAmount = 0;
let screenShakeDecay = 0.9;

// Audio system
const audioSystem = new AudioSystem();

// Initialize the game
function init() {
    try {
        // Set up canvas
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        
        // Make canvas fullscreen
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Prevent scrolling with arrow keys
        window.addEventListener('keydown', function(e) {
            // Space and arrow keys
            if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
                e.preventDefault();
            }
            
            // Toggle minimap with 'M' key
            if(e.key === 'm' || e.key === 'M') {
                minimapVisible = !minimapVisible;
            }
        }, false);
        
        // Set up input handlers with logging
        window.addEventListener('keydown', e => { 
            keysPressed[e.key] = true; 
            if (gameTime % 60 === 0) {
                console.log(`Key down: ${e.key}`);
            }
            
            // Initialize audio on first user interaction
            if (!audioSystem.initialized) {
                audioSystem.init();
            }
        });
        
        window.addEventListener('keyup', e => { 
            keysPressed[e.key] = false; 
            if (gameTime % 60 === 0) {
                console.log(`Key up: ${e.key}`);
            }
        });
        
        // Set up gamepad support
        initGamepadSupport();
        
        // Generate tile and object images
        generateTileImages();
        generateObjectImages();
        
        // Initialize player position
        initializePlayerPosition();
        
        // Spawn initial enemies
        spawnEnemies(getTerrainAt, getObjectAt);
        
        // Try to initialize audio (may be blocked until user interaction)
        try {
            audioSystem.init();
        } catch (e) {
            console.log("Audio initialization deferred until user interaction");
        }
        
        // Start the game loop
        gameLoop();
        
        // Show welcome message with instructions
        showMessage("Welcome to Procedural World!", 5000);
    } catch (error) {
        console.error(`Error in initialization: ${error.message}`);
    }
}

// Initialize gamepad support
function initGamepadSupport() {
    try {
        // Check if the browser supports the Gamepad API
        if (navigator.getGamepads) {
            console.log("Gamepad API supported");
            
            // Listen for gamepad connections
            window.addEventListener("gamepadconnected", function(e) {
                console.log("Gamepad connected:", e.gamepad.id);
                gamepads[e.gamepad.index] = e.gamepad;
                gamepadConnected = true;
                
                // Show a message to the user
                showMessage("Controller connected: " + e.gamepad.id, 3000);
            });
            
            // Listen for gamepad disconnections
            window.addEventListener("gamepaddisconnected", function(e) {
                console.log("Gamepad disconnected:", e.gamepad.id);
                delete gamepads[e.gamepad.index];
                
                // Check if any gamepads are still connected
                gamepadConnected = Object.keys(gamepads).length > 0;
                
                if (!gamepadConnected) {
                    showMessage("Controller disconnected", 3000);
                }
            });
            
            // Check for already connected gamepads (in case the page was loaded with gamepads already connected)
            const initialGamepads = navigator.getGamepads();
            for (let i = 0; i < initialGamepads.length; i++) {
                if (initialGamepads[i]) {
                    gamepads[initialGamepads[i].index] = initialGamepads[i];
                    gamepadConnected = true;
                    console.log("Gamepad already connected:", initialGamepads[i].id);
                }
            }
        } else {
            console.log("Gamepad API not supported in this browser");
        }
    } catch (error) {
        console.error(`Error in gamepad initialization: ${error.message}`);
    }
}

// Main game loop
function gameLoop() {
    try {
        // Update game time
        gameTime++;
        
        // Log game loop running every few seconds
        if (gameTime % 300 === 0) {
            console.log(`Game loop running: frame ${gameTime}`);
            console.log(`Player position: (${player.worldX}, ${player.worldY})`);
            console.log(`Keys currently pressed: ${Object.keys(keysPressed).filter(key => keysPressed[key]).join(", ")}`);
        }
        
        // Update invulnerability
        if (player.invulnerable) {
            player.invulnerabilityTime--;
            if (player.invulnerabilityTime <= 0) {
                player.invulnerable = false;
            }
            
            // Update damage flash
            if (player.damageFlashTime > 0) {
                player.damageFlashTime--;
            }
        }
        
        // Update combo timer
        if (player.combo > 0) {
            player.comboTimer--;
            if (player.comboTimer <= 0) {
                // Reset combo when timer expires
                player.combo = 0;
            }
        }
        
        // Update combat state
        updateCombatState();
        
        // Update sound timers
        audioSystem.updateSoundTimers();
        
        // Update gamepad state
        if (gamepadConnected) {
            updateGamepadState();
        }
        
        // Process input and update game state
        handleInput();
        
        // Update enemies
        updateEnemies(gameTime, getTerrainAt, getObjectAt, 
            (amount) => damagePlayer(amount, audioSystem));
        
        // Update collectibles
        updateCollectibles(audioSystem);
        
        // Render the game
        render();
        
        // Continue the game loop
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error(`Error in game loop: ${error.message}`);
        // Even if there's an error, try to continue the game loop
        requestAnimationFrame(gameLoop);
    }
}

// Update player's combat state
function updateCombatState() {
    try {
        // Store previous combat state
        const wasInCombat = player.inCombat;
        
        // Clear the list of nearby enemies
        player.nearbyEnemies = [];
        
        // Check for enemies in combat detection range
        const combatDetectionRange = TILE_SIZE * 5; // 5 tiles
        
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Calculate distance to player
            const dx = enemy.worldX - player.worldX;
            const dy = enemy.worldY - player.worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If enemy is within range, add to nearby enemies
            if (distance < combatDetectionRange) {
                player.nearbyEnemies.push({
                    index: i,
                    distance: distance,
                    type: enemy.type
                });
            }
        }
        
        // Update combat state based on nearby enemies
        if (player.nearbyEnemies.length > 0) {
            // Enter or stay in combat
            player.inCombat = true;
            player.combatTimer = player.combatDuration;
            
            // Play enemy nearby sound
            audioSystem.playEnemyNearbySound(player.nearbyEnemies);
        } else if (player.combatTimer > 0) {
            // Countdown combat timer if no enemies nearby
            player.combatTimer--;
            
            // Exit combat when timer expires
            if (player.combatTimer <= 0) {
                player.inCombat = false;
            }
        } else {
            // Not in combat
            player.inCombat = false;
        }
        
        // Also enter combat when attacking
        if (player.isAttacking) {
            player.inCombat = true;
            player.combatTimer = player.combatDuration;
        }
        
        // Play sound when entering combat
        if (!wasInCombat && player.inCombat) {
            audioSystem.playSound('combatStart');
        }
        
        // Play sound when exiting combat
        if (wasInCombat && !player.inCombat) {
            audioSystem.playSound('combatEnd');
        }
    } catch (error) {
        console.error(`Error in update combat state: ${error.message}`);
    }
}

// Handle game over
function gameOver() {
    try {
        // Reset player health
        resetPlayer();
        
        // Reset player position to a safe location
        initializePlayerPosition();
        
        // Respawn enemies
        spawnEnemies(getTerrainAt, getObjectAt);
        
        // Display game over message
        showMessage('Game Over! You have been respawned.', 3000);
    } catch (error) {
        console.error(`Error in game over: ${error.message}`);
    }
}

// Show a temporary message on screen
function showMessage(text, duration) {
    try {
        const messageElement = document.createElement('div');
        messageElement.className = 'game-message';
        messageElement.textContent = text;
        document.body.appendChild(messageElement);
        
        // Remove the message after the specified duration
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, duration);
    } catch (error) {
        console.error(`Error in show message: ${error.message}`);
    }
}

// Add screen shake effect
function addScreenShake(amount) {
    screenShakeAmount = Math.min(screenShakeAmount + amount, 20);
}

// Initialize the game when the page loads
window.addEventListener('load', init); 
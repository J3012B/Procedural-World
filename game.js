// Game constants
const TILE_SIZE = 32; // Size of each tile in pixels
let VIEWPORT_TILES_X = Math.ceil(window.innerWidth / TILE_SIZE) + 2; // Number of tiles visible horizontally
let VIEWPORT_TILES_Y = Math.ceil(window.innerHeight / TILE_SIZE) + 2; // Number of tiles visible vertically
const CAMERA_SPEED = 5; // Speed of camera movement
const PLAYER_SIZE = 24; // Size of the player character

// Gamepad support
let gamepads = {};
let gamepadConnected = false;
const GAMEPAD_DEADZONE = 0.2; // Ignore small joystick movements
const GAMEPAD_BUTTON = {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LEFT_BUMPER: 4,
    RIGHT_BUMPER: 5,
    LEFT_TRIGGER: 6,
    RIGHT_TRIGGER: 7,
    SELECT: 8,
    START: 9,
    LEFT_STICK: 10,
    RIGHT_STICK: 11,
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15
};

// Terrain types
const TERRAIN = {
    WATER: 0,
    SAND: 1,
    GRASS: 2,
    EARTH: 3,
    STONE: 4
};

// Object types
const OBJECTS = {
    NONE: 0,
    TREE: 1,
    ROCK: 2
};

// Terrain colors
const TERRAIN_COLORS = {
    [TERRAIN.WATER]: '#1e90ff', // Deep blue
    [TERRAIN.SAND]: '#f0e68c',  // Khaki
    [TERRAIN.GRASS]: '#32cd32', // Lime green
    [TERRAIN.EARTH]: '#8b4513', // Saddle brown
    [TERRAIN.STONE]: '#708090'  // Slate gray
};

// Game variables
let canvas, ctx;
let cameraX = 0, cameraY = 0;
let worldMap = {};
let worldObjects = {};
let keysPressed = {};
let tileImages = {};
let objectImages = {};
let player = {
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

// Enemy types
const ENEMY_TYPES = {
    GOBLIN: 0,
    SKELETON: 1,
    SLIME: 2
};

// Enemy properties
const ENEMY_PROPERTIES = {
    [ENEMY_TYPES.GOBLIN]: {
        color: '#4CAF50', // Green
        size: PLAYER_SIZE * 0.9, // Slightly larger
        speed: 1.0, // Faster than other enemies
        followPlayer: true,
        detectionRadius: TILE_SIZE * 6, // Better detection
        health: 5, // Much tougher
        damageResistance: 0.3 // 30% chance to resist damage
    },
    [ENEMY_TYPES.SKELETON]: {
        color: '#E0E0E0', // Light gray
        size: PLAYER_SIZE * 0.9,
        speed: 0.5, // Reduced speed
        followPlayer: true,
        detectionRadius: TILE_SIZE * 5,
        health: 3 // Medium health
    },
    [ENEMY_TYPES.SLIME]: {
        color: '#9C27B0', // Purple
        size: PLAYER_SIZE * 0.7,
        speed: 0.3, // Reduced speed
        followPlayer: false,
        detectionRadius: 0,
        health: 2 // Weakest but still requires two hits
    }
};

// Array to store all enemies
let enemies = [];

// Maximum number of enemies to spawn
const MAX_ENEMIES = 30;

// Minimum distance between enemies and player when spawning
const MIN_SPAWN_DISTANCE = TILE_SIZE * 10;

let gameTime = 0;
let minimapVisible = true;

// Error handler
const errorHandler = {
    handle: function(error, context) {
        console.error(`Error in ${context}: ${error.message}`);
    }
};

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
            if (!audioContext) {
                initAudio();
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
        spawnEnemies();
        
        // Try to initialize audio (may be blocked until user interaction)
        try {
            initAudio();
        } catch (e) {
            console.log("Audio initialization deferred until user interaction");
        }
        
        // Start the game loop
        gameLoop();
        
        // Show welcome message with instructions
        showMessage("Welcome to Procedural World!", 5000);
    } catch (error) {
        errorHandler.handle(error, 'initialization');
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
        errorHandler.handle(error, 'gamepad initialization');
    }
}

// Initialize player to a nice starting position
function initializePlayerPosition() {
    // Find a grass or earth tile to start on
    let startX = 0, startY = 0;
    let found = false;
    
    // Try a few positions until we find a suitable one
    for (let attempts = 0; attempts < 50 && !found; attempts++) {
        startX = attempts * 3;
        startY = attempts * 3;
        
        const terrain = generateTerrain(startX, startY);
        const object = generateObject(startX, startY);
        
        // Make sure we start on grass or earth with no objects
        if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.EARTH) && 
            object === OBJECTS.NONE) {
            found = true;
        }
    }
    
    // Set player position
    player.worldX = startX * TILE_SIZE;
    player.worldY = startY * TILE_SIZE;
    
    // Make sure the player's initial position is stored in the world map
    getTerrainAt(startX, startY);
    getObjectAt(startX, startY);
    
    // Center camera on player
    updateCamera();
    
    // Log the starting position
    console.log(`Cat starting at position: ${startX}, ${startY}`);
}

// Resize canvas to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update viewport tiles based on window size
    VIEWPORT_TILES_X = Math.ceil(window.innerWidth / TILE_SIZE) + 2;
    VIEWPORT_TILES_Y = Math.ceil(window.innerHeight / TILE_SIZE) + 2;
    
    // Force a render to prevent blank screen during resize
    if (ctx) {
        render();
    }
}

// Generate pixel art tile images
function generateTileImages() {
    try {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = TILE_SIZE;
        tileCanvas.height = TILE_SIZE;
        const tileCtx = tileCanvas.getContext('2d');
        
        // Generate each terrain type
        for (const type in TERRAIN) {
            const terrainType = TERRAIN[type];
            
            // Clear the tile canvas
            tileCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
            
            // Fill base color
            tileCtx.fillStyle = TERRAIN_COLORS[terrainType];
            tileCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
            
            // Add texture/details based on terrain type
            switch (terrainType) {
                case TERRAIN.WATER:
                    addWaterTexture(tileCtx);
                    break;
                case TERRAIN.SAND:
                    addSandTexture(tileCtx);
                    break;
                case TERRAIN.GRASS:
                    addGrassTexture(tileCtx);
                    break;
                case TERRAIN.EARTH:
                    addEarthTexture(tileCtx);
                    break;
                case TERRAIN.STONE:
                    addStoneTexture(tileCtx);
                    break;
            }
            
            // Create image from canvas
            const img = new Image();
            img.src = tileCanvas.toDataURL();
            tileImages[terrainType] = img;
        }
    } catch (error) {
        errorHandler.handle(error, 'tile image generation');
    }
}

// Add water texture
function addWaterTexture(ctx) {
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const width = 2 + Math.random() * 6;
        ctx.fillStyle = '#87CEFA'; // Light blue
        ctx.fillRect(x, y, width, 1);
    }
    ctx.globalAlpha = 1.0;
}

// Add sand texture
function addSandTexture(ctx) {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 1 + Math.random() * 2;
        ctx.fillStyle = '#D2B48C'; // Tan
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;
}

// Add grass texture
function addGrassTexture(ctx) {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const height = 2 + Math.random() * 4;
        ctx.fillStyle = '#228B22'; // Forest green
        ctx.fillRect(x, y, 1, height);
    }
    ctx.globalAlpha = 1.0;
}

// Add earth texture
function addEarthTexture(ctx) {
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 2 + Math.random() * 3;
        ctx.fillStyle = '#A0522D'; // Sienna
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;
}

// Add stone texture
function addStoneTexture(ctx) {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 3 + Math.random() * 5;
        ctx.fillStyle = i % 2 === 0 ? '#A9A9A9' : '#696969'; // Dark gray variations
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;
}

// Generate object images (trees and rocks)
function generateObjectImages() {
    try {
        const objectCanvas = document.createElement('canvas');
        objectCanvas.width = TILE_SIZE;
        objectCanvas.height = TILE_SIZE;
        const objectCtx = objectCanvas.getContext('2d');
        
        // Generate tree image
        objectCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        
        // Tree trunk
        objectCtx.fillStyle = '#8B4513'; // Brown
        objectCtx.fillRect(TILE_SIZE/2 - 2, TILE_SIZE/2, 4, TILE_SIZE/2);
        
        // Tree foliage
        objectCtx.fillStyle = '#228B22'; // Forest green
        objectCtx.beginPath();
        objectCtx.moveTo(TILE_SIZE/2, 2);
        objectCtx.lineTo(TILE_SIZE - 4, TILE_SIZE/2 + 4);
        objectCtx.lineTo(4, TILE_SIZE/2 + 4);
        objectCtx.closePath();
        objectCtx.fill();
        
        objectCtx.beginPath();
        objectCtx.moveTo(TILE_SIZE/2, 6);
        objectCtx.lineTo(TILE_SIZE - 6, TILE_SIZE/2 + 2);
        objectCtx.lineTo(6, TILE_SIZE/2 + 2);
        objectCtx.closePath();
        objectCtx.fill();
        
        // Create tree image
        const treeImg = new Image();
        treeImg.src = objectCanvas.toDataURL();
        objectImages[OBJECTS.TREE] = treeImg;
        
        // Generate rock image
        objectCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        
        // Base rock shape
        objectCtx.fillStyle = '#777777'; // Gray
        objectCtx.beginPath();
        objectCtx.ellipse(TILE_SIZE/2, TILE_SIZE/2 + 4, TILE_SIZE/3, TILE_SIZE/4, 0, 0, Math.PI * 2);
        objectCtx.fill();
        
        // Rock details
        objectCtx.fillStyle = '#999999'; // Lighter gray
        objectCtx.beginPath();
        objectCtx.ellipse(TILE_SIZE/2 - 3, TILE_SIZE/2, TILE_SIZE/5, TILE_SIZE/6, 0.2, 0, Math.PI * 2);
        objectCtx.fill();
        
        objectCtx.fillStyle = '#555555'; // Darker gray
        objectCtx.beginPath();
        objectCtx.ellipse(TILE_SIZE/2 + 4, TILE_SIZE/2 + 2, TILE_SIZE/6, TILE_SIZE/8, -0.3, 0, Math.PI * 2);
        objectCtx.fill();
        
        // Create rock image
        const rockImg = new Image();
        rockImg.src = objectCanvas.toDataURL();
        objectImages[OBJECTS.ROCK] = rockImg;
        
    } catch (error) {
        errorHandler.handle(error, 'object image generation');
    }
}

// Get terrain at specific world coordinates
function getTerrainAt(worldX, worldY) {
    const key = `${worldX},${worldY}`;
    
    // If we've already generated this tile, return it
    if (worldMap[key] !== undefined) {
        return worldMap[key];
    }
    
    // Otherwise, generate a new terrain type for this position
    const terrain = generateTerrain(worldX, worldY);
    worldMap[key] = terrain;
    return terrain;
}

// Generate terrain using simplex noise (simplified version)
function generateTerrain(x, y) {
    // Simple noise function (can be replaced with a better one like simplex noise)
    const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
    
    // Add some variation based on position
    const variation = Math.sin(x * 0.05 + y * 0.05) * 0.2;
    const value = noise + variation;
    
    // Map the noise value to a terrain type
    if (value < 0.3) return TERRAIN.WATER;
    if (value < 0.4) return TERRAIN.SAND;
    if (value < 0.7) return TERRAIN.GRASS;
    if (value < 0.85) return TERRAIN.EARTH;
    return TERRAIN.STONE;
}

// Get object at specific world coordinates
function getObjectAt(worldX, worldY) {
    const key = `${worldX},${worldY}`;
    
    // If we've already generated an object for this position, return it
    if (worldObjects[key] !== undefined) {
        return worldObjects[key];
    }
    
    // Otherwise, generate a new object for this position
    const object = generateObject(worldX, worldY);
    worldObjects[key] = object;
    return object;
}

// Generate object based on position and terrain
function generateObject(x, y) {
    // Get the terrain at this position
    const terrain = getTerrainAt(x, y);
    
    // Water and sand don't have objects
    if (terrain === TERRAIN.WATER || terrain === TERRAIN.SAND) {
        return OBJECTS.NONE;
    }
    
    // Use a hash function based on coordinates for deterministic generation
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const value = hash - Math.floor(hash);
    
    // 10% chance for a tree on grass or earth
    if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.EARTH) && value < 0.1) {
        return OBJECTS.TREE;
    }
    
    // 15% chance for a rock on stone
    if (terrain === TERRAIN.STONE && value < 0.15) {
        return OBJECTS.ROCK;
    }
    
    // 5% chance for a rock on earth
    if (terrain === TERRAIN.EARTH && value > 0.9) {
        return OBJECTS.ROCK;
    }
    
    return OBJECTS.NONE;
}

// Check if player is colliding with objects or water
function checkCollision(newX, newY) {
    try {
        // Get the tile coordinates for the player's position
        const playerSize = player.size * 0.8; // Use slightly smaller hitbox for better gameplay
        let isOverWater = false;
        
        // Check the four corners of the player
        const positions = [
            { x: newX, y: newY }, // Top-left
            { x: newX + playerSize, y: newY }, // Top-right
            { x: newX, y: newY + playerSize }, // Bottom-left
            { x: newX + playerSize, y: newY + playerSize } // Bottom-right
        ];
        
        // Check each corner for collision
        for (const pos of positions) {
            const tileX = Math.floor(pos.x / TILE_SIZE);
            const tileY = Math.floor(pos.y / TILE_SIZE);
            
            // Check terrain
            const terrain = getTerrainAt(tileX, tileY);
            if (terrain === TERRAIN.WATER) {
                isOverWater = true;
            }
            
            // Check objects
            const object = getObjectAt(tileX, tileY);
            if (object === OBJECTS.TREE || object === OBJECTS.ROCK) {
                return true; // Collision with object
            }
        }
        
        // Update boat status based on terrain
        if (isOverWater) {
            player.inBoat = true;
            // Slow down significantly when in boat on water
            player.speed = 1.5;
            return false; // Allow movement over water when in boat
        } else {
            if (player.inBoat) {
                // Return to normal speed when leaving boat
                player.speed = 3;
            }
            player.inBoat = false;
            return false; // No collision
        }
    } catch (error) {
        errorHandler.handle(error, 'collision detection');
        return false;
    }
}

// Handle user input
function handleInput() {
    try {
        // Store original position for collision detection
        const originalX = player.worldX;
        const originalY = player.worldY;
        
        // Get keyboard input
        const keyboardInput = getKeyboardInput();
        
        // Get gamepad input
        const gamepadInput = getGamepadInput();
        
        // Combine inputs (gamepad takes precedence if both are used)
        let directionX = gamepadInput.x !== 0 ? gamepadInput.x : keyboardInput.x;
        let directionY = gamepadInput.y !== 0 ? gamepadInput.y : keyboardInput.y;
        let attack = gamepadInput.attack || keyboardInput.attack;
        
        // Normalize diagonal movement
        if (directionX !== 0 && directionY !== 0) {
            const length = Math.sqrt(directionX * directionX + directionY * directionY);
            directionX /= length;
            directionY /= length;
        }
        
        // Check if player is moving
        const isMoving = directionX !== 0 || directionY !== 0;
        
        // Handle attack input
        if (attack && player.attackCooldown <= 0 && !player.isAttacking) {
            startAttack();
        }
        
        // Update attack state
        updateAttackState();
        
        // Calculate new position
        const newX = player.worldX + directionX * player.speed;
        const newY = player.worldY + directionY * player.speed;
        
        // Debug key presses
        if (isMoving && gameTime % 60 === 0) {
            console.log("Keys pressed:", Object.keys(keysPressed).filter(key => keysPressed[key]).join(", "));
            console.log(`Attempting to move from (${originalX}, ${originalY}) to (${newX}, ${newY})`);
        }
        
        // Try horizontal and vertical movement separately for better control
        let horizontalCollision = false;
        let verticalCollision = false;
        
        if (newX !== originalX) {
            // Try horizontal movement
            horizontalCollision = checkCollision(newX, originalY);
            if (!horizontalCollision) {
                player.worldX = newX;
            } else if (gameTime % 60 === 0) {
                console.log("Horizontal collision detected");
            }
        }
        
        if (newY !== originalY) {
            // Try vertical movement
            verticalCollision = checkCollision(player.worldX, newY);
            if (!verticalCollision) {
                player.worldY = newY;
            } else if (gameTime % 60 === 0) {
                console.log("Vertical collision detected");
            }
        }
        
        // Update player animation state
        player.isMoving = isMoving && (player.worldX !== originalX || player.worldY !== originalY);
        
        if (isMoving && (directionX !== 0 || directionY !== 0)) {
            player.lastDirection = { x: directionX, y: directionY };
        }
        
        // Update camera to follow player
        updateCamera();
        
        // Update coordinate display
        document.getElementById('coordX').textContent = Math.floor(player.worldX / TILE_SIZE);
        document.getElementById('coordY').textContent = Math.floor(player.worldY / TILE_SIZE);
    } catch (error) {
        errorHandler.handle(error, 'input handling');
    }
}

// Get keyboard input direction
function getKeyboardInput() {
    let directionX = 0;
    let directionY = 0;
    let attack = false;
    
    // Check arrow keys and WASD
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
        directionX -= 1;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
        directionX += 1;
    }
    if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) {
        directionY -= 1;
    }
    if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) {
        directionY += 1;
    }
    
    // Check for attack input (Space key)
    if (keysPressed[' '] || keysPressed['Spacebar']) {
        attack = true;
    }
    
    return { x: directionX, y: directionY, attack: attack };
}

// Get gamepad input direction
function getGamepadInput() {
    let directionX = 0;
    let directionY = 0;
    let attack = false;
    
    if (gamepadConnected) {
        try {
            // Get the latest gamepad state
            const gamepadsArray = navigator.getGamepads();
            
            // Use the first connected gamepad
            let activeGamepad = null;
            for (let i = 0; i < gamepadsArray.length; i++) {
                if (gamepadsArray[i]) {
                    activeGamepad = gamepadsArray[i];
                    break;
                }
            }
            
            if (activeGamepad) {
                // Left analog stick
                const leftStickX = activeGamepad.axes[0];
                const leftStickY = activeGamepad.axes[1];
                
                // Apply deadzone to avoid drift
                if (Math.abs(leftStickX) > GAMEPAD_DEADZONE) {
                    directionX = leftStickX;
                }
                if (Math.abs(leftStickY) > GAMEPAD_DEADZONE) {
                    directionY = leftStickY;
                }
                
                // D-pad
                if (activeGamepad.buttons[GAMEPAD_BUTTON.DPAD_LEFT].pressed) {
                    directionX = -1;
                } else if (activeGamepad.buttons[GAMEPAD_BUTTON.DPAD_RIGHT].pressed) {
                    directionX = 1;
                }
                
                if (activeGamepad.buttons[GAMEPAD_BUTTON.DPAD_UP].pressed) {
                    directionY = -1;
                } else if (activeGamepad.buttons[GAMEPAD_BUTTON.DPAD_DOWN].pressed) {
                    directionY = 1;
                }
                
                // Attack with X button or right trigger
                if (activeGamepad.buttons[GAMEPAD_BUTTON.X].pressed || 
                    activeGamepad.buttons[GAMEPAD_BUTTON.RIGHT_TRIGGER].pressed) {
                    attack = true;
                }
                
                // Toggle minimap with Y button
                if (activeGamepad.buttons[GAMEPAD_BUTTON.Y].pressed && !activeGamepad.buttons[GAMEPAD_BUTTON.Y].wasPressed) {
                    minimapVisible = !minimapVisible;
                }
                
                // Store button states for next frame
                for (let i = 0; i < activeGamepad.buttons.length; i++) {
                    activeGamepad.buttons[i].wasPressed = activeGamepad.buttons[i].pressed;
                }
            }
        } catch (error) {
            errorHandler.handle(error, 'gamepad input');
        }
    }
    
    return { x: directionX, y: directionY, attack: attack };
}

// Update camera position to follow player
function updateCamera() {
    // Calculate the center of the screen
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Update camera position to center on player
    cameraX = player.worldX - centerX + player.size / 2;
    cameraY = player.worldY - centerY + player.size / 2;
    
    // Apply screen shake if active
    if (screenShakeAmount > 0.1) {
        // Random shake offset
        cameraX += (Math.random() * 2 - 1) * screenShakeAmount;
        cameraY += (Math.random() * 2 - 1) * screenShakeAmount;
        
        // Decay shake amount
        screenShakeAmount *= screenShakeDecay;
    } else {
        screenShakeAmount = 0;
    }
}

// Render the game world
function render() {
    try {
        // Clear the canvas with a black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw combat indicator if in combat
        if (player.inCombat) {
            drawCombatIndicator();
        }
        
        // Calculate visible tile range
        const startTileX = Math.floor(cameraX / TILE_SIZE) - 1;
        const startTileY = Math.floor(cameraY / TILE_SIZE) - 1;
        const endTileX = startTileX + VIEWPORT_TILES_X + 2;
        const endTileY = startTileY + VIEWPORT_TILES_Y + 2;
        
        // Render visible tiles and objects
        for (let y = startTileY; y <= endTileY; y++) {
            for (let x = startTileX; x <= endTileX; x++) {
                const terrain = getTerrainAt(x, y);
                const screenX = Math.round(x * TILE_SIZE - cameraX);
                const screenY = Math.round(y * TILE_SIZE - cameraY);
                
                // Only draw tiles that are visible on screen
                if (screenX > -TILE_SIZE && screenX < canvas.width && 
                    screenY > -TILE_SIZE && screenY < canvas.height) {
                    // Draw the terrain tile
                    if (tileImages[terrain] && tileImages[terrain].complete) {
                        // Use the pre-generated tile image
                        ctx.drawImage(tileImages[terrain], screenX, screenY, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback to simple colored rectangle
                        ctx.fillStyle = TERRAIN_COLORS[terrain];
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    }
                    
                    // Draw objects on top of terrain
                    const object = getObjectAt(x, y);
                    if (object !== OBJECTS.NONE) {
                        if (objectImages[object] && objectImages[object].complete) {
                            // Use the pre-generated object image
                            ctx.drawImage(objectImages[object], screenX, screenY, TILE_SIZE, TILE_SIZE);
                        }
                    }
                }
            }
        }
        
        // Draw kill effects
        drawKillEffects();
        
        // Draw enemies
        drawEnemies();
        
        // Draw player
        drawPlayer();
        
        // Draw health UI
        drawHealthUI();
        
        // Draw score display
        drawScoreDisplay();
        
        // Draw minimap
        if (minimapVisible) {
            drawMinimap();
        }
    } catch (error) {
        errorHandler.handle(error, 'rendering');
    }
}

// Draw kill effects
function drawKillEffects() {
    try {
        // Process each kill effect
        for (let i = player.killEffects.length - 1; i >= 0; i--) {
            const effect = player.killEffects[i];
            
            // Update effect lifetime
            effect.lifetime--;
            
            // Remove expired effects
            if (effect.lifetime <= 0) {
                player.killEffects.splice(i, 1);
                continue;
            }
            
            // Calculate screen position
            const screenX = Math.round(effect.worldX - cameraX);
            const screenY = Math.round(effect.worldY - cameraY);
            
            // Skip if off screen
            if (screenX < -50 || screenX > canvas.width + 50 || 
                screenY < -50 || screenY > canvas.height + 50) {
                continue;
            }
            
            // Handle heart pickup physics and collision with player
            if (effect.type === 'heart' && !effect.collected) {
                // Update pulse animation
                effect.pulseTime = (effect.pulseTime || 0) + 1;
                
                // Apply physics to heart
                if (!effect.grounded) {
                    // Apply gravity
                    effect.velocityY += effect.gravity;
                    
                    // Apply friction
                    effect.velocityX *= effect.friction;
                    effect.velocityY *= effect.friction;
                    
                    // Update position
                    effect.worldX += effect.velocityX;
                    effect.worldY += effect.velocityY;
                    
                    // Check for collision with ground (simulate ground at the same Y level as the heart was spawned)
                    const groundY = effect.worldY;
                    if (effect.velocityY > 0 && Math.abs(effect.velocityY) < 0.2) {
                        effect.grounded = true;
                        effect.bounceTime = 0;
                    }
                    
                    // Bounce if hitting the ground
                    if (effect.worldY > groundY && effect.velocityY > 0) {
                        effect.worldY = groundY;
                        effect.velocityY = -effect.velocityY * effect.bounce;
                        
                        // If bounce is too small, stop bouncing
                        if (Math.abs(effect.velocityY) < 0.5) {
                            effect.velocityY = 0;
                            effect.grounded = true;
                        }
                    }
                } else {
                    // Heart is on the ground, make it hover slightly
                    effect.bounceTime += 0.05;
                    effect.bounceHeight = Math.sin(effect.bounceTime) * 3;
                    effect.worldY = effect.worldY + effect.bounceHeight;
                }
                
                // Check for collision with player
                const distX = effect.worldX - player.worldX;
                const distY = effect.worldY - player.worldY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                // If player touches the heart
                if (distance < player.size + effect.size / 2) {
                    // Mark as collected
                    effect.collected = true;
                    
                    // Heal player by 1 heart
                    if (player.health < player.maxHealth) {
                        player.health++;
                        
                        // Play heal sound
                        playSound('heal');
                        
                        // Add healing text effect
                        player.killEffects.push({
                            type: 'text',
                            worldX: player.worldX,
                            worldY: player.worldY - 40,
                            text: '+1 HEART',
                            size: 24,
                            color: '255, 0, 0', // Red for heart
                            lifetime: 60,
                            maxLifetime: 60
                        });
                        
                        // Add heart collection particles
                        const particles = [];
                        const particleCount = 15;
                        
                        // Create particles
                        for (let j = 0; j < particleCount; j++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 0.5 + Math.random() * 1.5;
                            
                            particles.push({
                                x: Math.cos(angle) * speed * 5,
                                y: Math.sin(angle) * speed * 5,
                                size: 2 + Math.random() * 3,
                                color: '255, 0, 0' // Red particles
                            });
                        }
                        
                        // Add particle effect
                        player.killEffects.push({
                            type: 'particles',
                            worldX: effect.worldX,
                            worldY: effect.worldY,
                            particles: particles,
                            lifetime: 30,
                            maxLifetime: 30
                        });
                    }
                    
                    // Remove the heart effect
                    player.killEffects.splice(i, 1);
                    continue;
                }
                
                // Make heart glow when player is nearby to indicate it can be collected
                effect.playerNearby = distance < TILE_SIZE * 3;
            }
            
            // Draw based on effect type
            switch (effect.type) {
                case 'explosion':
                    drawExplosionEffect(effect, screenX, screenY);
                    break;
                case 'text':
                    drawTextEffect(effect, screenX, screenY);
                    break;
                case 'particles':
                    drawParticleEffect(effect, screenX, screenY);
                    break;
                case 'heart':
                    drawHeartEffect(effect, screenX, screenY);
                    break;
            }
        }
    } catch (error) {
        errorHandler.handle(error, 'kill effects');
    }
}

// Draw a heart pickup effect
function drawHeartEffect(effect, x, y) {
    try {
        // Skip if already collected
        if (effect.collected) return;
        
        // Calculate pulse size modifier (make heart "beat")
        const pulse = Math.sin(effect.pulseTime * 0.1) * 0.2 + 1;
        
        // Calculate fade-in and fade-out
        let alpha = 1;
        if (effect.lifetime < 60) {
            // Fade out in the last second
            alpha = effect.lifetime / 60;
        } else if (effect.maxLifetime - effect.lifetime < 30) {
            // Fade in at the beginning
            alpha = (effect.maxLifetime - effect.lifetime) / 30;
        }
        
        // Determine if player is nearby for visual effect
        const isPlayerNearby = effect.playerNearby;
        
        // Draw shadow under the heart
        ctx.beginPath();
        ctx.ellipse(x, y + effect.size * 0.4, effect.size * 0.6, effect.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
        ctx.fill();
        
        // Draw the heart with enhanced effects
        const size = effect.size * pulse;
        
        // Add a glowing effect when player is nearby
        if (isPlayerNearby) {
            // Outer glow
            ctx.globalAlpha = alpha * 0.7;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'; // Golden glow
            drawHeart(x, y, size * 1.3, 'rgba(255, 215, 0, 0.3)');
            
            // Inner glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            drawHeart(x, y, size * 1.1, 'rgba(255, 100, 100, 0.5)');
            ctx.shadowBlur = 0;
        } else {
            // Normal glow
            ctx.globalAlpha = alpha * 0.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
            drawHeart(x, y, size * 1.1, 'rgba(255, 100, 100, 0.4)');
            ctx.shadowBlur = 0;
        }
        
        // Reset alpha
        ctx.globalAlpha = alpha;
        
        // Draw the main heart
        drawHeart(x, y, size, `rgba(255, 0, 0, ${alpha})`);
        
        // Draw a shine effect on the heart
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fill();
        
        // Draw "Collect me!" text above the heart when player is nearby
        if (isPlayerNearby) {
            const textY = y - size - 15;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (0.5 + 0.5 * Math.sin(effect.pulseTime * 0.2))})`;
            ctx.fillText('Collect!', x, textY);
        }
        
        // Reset global settings
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    } catch (error) {
        errorHandler.handle(error, 'heart effect');
    }
}

// Draw explosion effect
function drawExplosionEffect(effect, x, y) {
    // Calculate progress (1.0 to 0.0)
    const progress = effect.lifetime / effect.maxLifetime;
    
    // Size grows then shrinks
    const size = effect.size * (1 - Math.abs(progress - 0.5) * 2);
    
    // Opacity fades out
    const opacity = progress;
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 50, ${opacity * 0.7})`;
    ctx.fill();
    
    // Draw inner circle
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
}

// Draw text effect
function drawTextEffect(effect, x, y) {
    // Calculate progress (1.0 to 0.0)
    const progress = effect.lifetime / effect.maxLifetime;
    
    // Text rises up
    const yOffset = (1 - progress) * 40;
    
    // Opacity fades out at the end
    const opacity = progress < 0.3 ? progress / 0.3 : 1;
    
    // Text size pulses
    const sizeFactor = 1 + Math.sin(effect.lifetime * 0.2) * 0.1;
    
    // Draw text
    ctx.font = `bold ${effect.size * sizeFactor}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${effect.color}, ${opacity})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = 3;
    
    ctx.strokeText(effect.text, x, y - yOffset);
    ctx.fillText(effect.text, x, y - yOffset);
}

// Draw particle effect
function drawParticleEffect(effect, x, y) {
    // Calculate progress (1.0 to 0.0)
    const progress = effect.lifetime / effect.maxLifetime;
    
    // Each particle
    for (const particle of effect.particles) {
        // Calculate particle position
        const particleX = x + particle.x * (1 - progress);
        const particleY = y + particle.y * (1 - progress) - (1 - progress) * 50; // Add upward motion
        
        // Opacity fades out
        const opacity = progress;
        
        // Size shrinks
        const size = particle.size * progress;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color}, ${opacity})`;
        ctx.fill();
    }
}

// Draw the player character (knight)
function drawPlayer() {
    try {
        // Skip drawing player every few frames when flashing from damage
        if (player.damageFlashTime > 0 && player.damageFlashTime % 2 === 0) {
            return;
        }
        
        // Calculate player's screen position (center of screen)
        const screenX = Math.round(player.worldX - cameraX);
        const screenY = Math.round(player.worldY - cameraY);
        
        // Update animation frame
        updatePlayerAnimation();
        
        // Calculate center position
        const centerX = screenX + player.size/2;
        const centerY = screenY + player.size/2;
        
        // Add a slight bounce effect when moving
        const bounceOffset = player.isMoving ? Math.sin(player.animationFrame * 0.3) * 2 : 0;
        
        // Draw boat if player is over water
        if (player.inBoat) {
            // Draw boat shadow
            ctx.beginPath();
            ctx.ellipse(
                centerX, 
                centerY + player.size/2 + 4, 
                player.size * 0.8, 
                player.size/3, 
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
            
            // Draw boat base (hull)
            ctx.beginPath();
            ctx.ellipse(
                centerX, 
                centerY + player.size/4 - bounceOffset, 
                player.size * 0.7, 
                player.size/3, 
                0, 0, Math.PI
            );
            ctx.fillStyle = player.boatColor;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#5A3A1A';
            ctx.stroke();
            
            // Draw boat interior
            ctx.beginPath();
            ctx.ellipse(
                centerX, 
                centerY + player.size/4 - bounceOffset, 
                player.size * 0.6, 
                player.size/4, 
                0, 0, Math.PI
            );
            ctx.fillStyle = '#A67D5A'; // Lighter wood color for interior
            ctx.fill();
            
            // Draw boat sides
            ctx.beginPath();
            ctx.moveTo(centerX - player.size * 0.7, centerY + player.size/4 - bounceOffset);
            ctx.lineTo(centerX - player.size * 0.5, centerY - player.size/4 - bounceOffset);
            ctx.lineTo(centerX + player.size * 0.5, centerY - player.size/4 - bounceOffset);
            ctx.lineTo(centerX + player.size * 0.7, centerY + player.size/4 - bounceOffset);
            ctx.closePath();
            ctx.fillStyle = player.boatColor;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#5A3A1A';
            ctx.stroke();
            
            // Draw water ripples around boat
            const rippleTime = gameTime * 0.003;
            for (let i = 0; i < 3; i++) {
                const rippleSize = player.size * (0.8 + 0.2 * Math.sin(rippleTime + i));
                const rippleOffset = 5 + i * 8;
                
                ctx.beginPath();
                ctx.arc(
                    centerX, 
                    centerY + player.size/4 - bounceOffset + rippleOffset, 
                    rippleSize, 
                    0.1 * Math.PI, 0.9 * Math.PI
                );
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 - i * 0.1})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Determine player color based on invulnerability
        let playerColor = player.color;
        if (player.invulnerable && player.damageFlashTime <= 0) {
            // Flashing effect during invulnerability
            if (Math.floor(player.invulnerabilityTime / 5) % 2 === 0) {
                playerColor = '#FFFFFF'; // Flash white
            }
        }
        
        // Draw knight body (circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY - bounceOffset, player.size/2, 0, Math.PI * 2);
        ctx.fillStyle = playerColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#5A5A5A'; // Darker gray outline
        ctx.stroke();
        
        // Draw knight helmet
        const helmetHeight = player.size / 2.5;
        
        // Helmet base
        ctx.beginPath();
        ctx.rect(
            centerX - player.size/3, 
            centerY - bounceOffset - player.size/2 - helmetHeight/2, 
            player.size/1.5, 
            helmetHeight
        );
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = '#5A5A5A';
        ctx.stroke();
        
        // Helmet visor
        ctx.beginPath();
        ctx.rect(
            centerX - player.size/4, 
            centerY - bounceOffset - player.size/2 - helmetHeight/4, 
            player.size/2, 
            helmetHeight/3
        );
        ctx.fillStyle = '#333333'; // Dark visor
        ctx.fill();
        
        // Helmet plume/crest
        ctx.beginPath();
        ctx.moveTo(centerX - player.size/6, centerY - bounceOffset - player.size/2 - helmetHeight);
        ctx.lineTo(centerX, centerY - bounceOffset - player.size/2 - helmetHeight - player.size/4);
        ctx.lineTo(centerX + player.size/6, centerY - bounceOffset - player.size/2 - helmetHeight);
        ctx.closePath();
        ctx.fillStyle = '#CC0000'; // Red plume
        ctx.fill();
        
        // Draw sword with attack animation
        drawPlayerSword(centerX, centerY, bounceOffset);
        
        // Shield (if facing left)
        if (player.lastDirection.x < 0) {
            ctx.beginPath();
            ctx.ellipse(
                centerX - player.size/2 - player.size/6, 
                centerY - bounceOffset, 
                player.size/4, player.size/3, 0, 0, Math.PI * 2
            );
            ctx.fillStyle = '#CC0000'; // Red shield
            ctx.fill();
            ctx.strokeStyle = '#FFCC00'; // Gold trim
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Shield emblem
            ctx.beginPath();
            ctx.moveTo(centerX - player.size/2 - player.size/6, centerY - bounceOffset - player.size/6);
            ctx.lineTo(centerX - player.size/2 - player.size/6 - player.size/10, centerY - bounceOffset);
            ctx.lineTo(centerX - player.size/2 - player.size/6, centerY - bounceOffset + player.size/6);
            ctx.lineTo(centerX - player.size/2 - player.size/6 + player.size/10, centerY - bounceOffset);
            ctx.closePath();
            ctx.fillStyle = '#FFCC00'; // Gold emblem
            ctx.fill();
        }
        
        // Eyes (visible through visor)
        const eyeSize = player.size / 10;
        const eyeOffsetX = player.size / 8;
        const eyeOffsetY = -player.size/3;
        
        // Eye position changes based on last movement direction
        const eyeOffsetXDirection = player.lastDirection.x * player.size / 16;
        
        // Check if knight is blinking
        if (player.isBlinking) {
            // Closed eyes (lines)
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            
            // Left eye
            ctx.beginPath();
            ctx.moveTo(centerX - eyeOffsetX - eyeSize + eyeOffsetXDirection, 
                      centerY - bounceOffset + eyeOffsetY - eyeSize/2);
            ctx.lineTo(centerX - eyeOffsetX + eyeSize + eyeOffsetXDirection, 
                      centerY - bounceOffset + eyeOffsetY + eyeSize/2);
            ctx.stroke();
            
            // Right eye
            ctx.beginPath();
            ctx.moveTo(centerX + eyeOffsetX - eyeSize + eyeOffsetXDirection, 
                      centerY - bounceOffset + eyeOffsetY - eyeSize/2);
            ctx.lineTo(centerX + eyeOffsetX + eyeSize + eyeOffsetXDirection, 
                      centerY - bounceOffset + eyeOffsetY + eyeSize/2);
            ctx.stroke();
        } else {
            // Open eyes (glowing in the darkness of the helmet)
            ctx.fillStyle = '#FFFFFF'; // Glowing white eyes
            
            // Left eye
            ctx.beginPath();
            ctx.ellipse(
                centerX - eyeOffsetX + eyeOffsetXDirection, 
                centerY - bounceOffset + eyeOffsetY, 
                eyeSize, eyeSize, 0, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Right eye
            ctx.beginPath();
            ctx.ellipse(
                centerX + eyeOffsetX + eyeOffsetXDirection, 
                centerY - bounceOffset + eyeOffsetY, 
                eyeSize, eyeSize, 0, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw attack effect if attacking
        if (player.isAttacking) {
            drawAttackEffect(centerX, centerY);
        }
    } catch (error) {
        errorHandler.handle(error, 'drawPlayer');
    }
}

// Draw the player's sword with attack animation
function drawPlayerSword(centerX, centerY, bounceOffset) {
    try {
        // Only draw sword if facing right or attacking
        if (player.lastDirection.x >= 0 || player.isAttacking) {
            // Calculate sword position and rotation based on attack state
            let swordRotation = 0;
            let swordExtension = 0;
            
            if (player.isAttacking) {
                // Calculate attack progress (0 to 1)
                const attackProgress = player.attackTime / player.attackDuration;
                
                // Sword swings in an arc during attack
                swordRotation = Math.sin(attackProgress * Math.PI) * Math.PI * 0.75;
                
                // Sword extends further during attack
                swordExtension = player.size * 0.3 * Math.sin(attackProgress * Math.PI);
            }
            
            // Base position for sword (right side of player)
            let swordBaseX = centerX + player.size/2;
            let swordBaseY = centerY - bounceOffset - player.size/8;
            
            // Adjust sword position based on player direction
            if (player.lastDirection.x < 0 && player.isAttacking) {
                // Flip sword to left side during attack if facing left
                swordBaseX = centerX - player.size/2;
                swordRotation = -swordRotation; // Reverse rotation
            }
            
            // Calculate sword handle position
            const handleLength = player.size/4;
            const handleWidth = player.size/4;
            
            // Save the current context state
            ctx.save();
            
            // Translate to the sword base position
            ctx.translate(swordBaseX, swordBaseY);
            
            // Rotate the context
            ctx.rotate(swordRotation);
            
            // Draw sword handle
            ctx.beginPath();
            ctx.rect(
                0, 
                -handleWidth/2, 
                handleLength, 
                handleWidth
            );
            ctx.fillStyle = '#8B4513'; // Brown handle
            ctx.fill();
            ctx.strokeStyle = '#5A3A1A';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw sword blade
            const bladeLength = player.size/2 + swordExtension;
            const bladeWidth = player.size/6;
            
            ctx.beginPath();
            ctx.moveTo(handleLength, 0);
            ctx.lineTo(handleLength + bladeLength, -bladeWidth/2);
            ctx.lineTo(handleLength + bladeLength + player.size/6, 0);
            ctx.lineTo(handleLength + bladeLength, bladeWidth/2);
            ctx.closePath();
            ctx.fillStyle = '#CCCCCC'; // Silver blade
            ctx.fill();
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Restore the context
            ctx.restore();
        }
    } catch (error) {
        errorHandler.handle(error, 'draw player sword');
    }
}

// Draw attack effect
function drawAttackEffect(centerX, centerY) {
    try {
        // Calculate attack progress (0 to 1)
        const attackProgress = player.attackTime / player.attackDuration;
        
        // Calculate attack direction
        const attackAngle = Math.atan2(player.lastDirection.y, player.lastDirection.x);
        
        // Calculate attack radius
        const attackRadius = player.attackRange * attackProgress;
        
        // Draw attack arc
        ctx.beginPath();
        ctx.arc(
            centerX, 
            centerY, 
            attackRadius, 
            attackAngle - Math.PI/3, 
            attackAngle + Math.PI/3
        );
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        
        // Fill with semi-transparent white
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - attackProgress)})`;
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - attackProgress)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    } catch (error) {
        errorHandler.handle(error, 'draw attack effect');
    }
}

// Update player animation
function updatePlayerAnimation() {
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

// Draw the player's health UI
function drawHealthUI() {
    try {
        const heartSize = 30;
        const heartSpacing = 10;
        const startX = 20;
        const startY = 20;
        
        for (let i = 0; i < player.maxHealth; i++) {
            const heartX = startX + i * (heartSize + heartSpacing);
            
            // Draw heart outline
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFFFFF';
            
            // Draw heart shape
            drawHeart(heartX, startY, heartSize, i < player.health ? '#FF0000' : 'rgba(255, 0, 0, 0.3)');
        }
    } catch (error) {
        errorHandler.handle(error, 'health UI');
    }
}

// Draw a heart shape
function drawHeart(x, y, size, fillColor) {
    try {
        const halfSize = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + halfSize, y + size * 0.25);
        
        // Left curve
        ctx.bezierCurveTo(
            x + halfSize, y, 
            x, y, 
            x, y + halfSize
        );
        
        // Left bottom
        ctx.bezierCurveTo(
            x, y + size * 0.75, 
            x + halfSize * 0.5, y + size * 0.9, 
            x + halfSize, y + size
        );
        
        // Right bottom
        ctx.bezierCurveTo(
            x + halfSize * 1.5, y + size * 0.9, 
            x + size, y + size * 0.75, 
            x + size, y + halfSize
        );
        
        // Right curve
        ctx.bezierCurveTo(
            x + size, y, 
            x + halfSize, y, 
            x + halfSize, y + size * 0.25
        );
        
        // Fill and stroke
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    } catch (error) {
        errorHandler.handle(error, 'heart drawing');
    }
}

// Draw the minimap
function drawMinimap() {
    try {
        const minimapSize = 150; // Size of the minimap
        const minimapTileSize = 3; // Size of each tile on the minimap
        const minimapX = canvas.width - minimapSize - 20; // Position from right
        const minimapY = 20; // Position from top
        const minimapRadius = minimapSize / 2;
        const centerTileX = Math.floor(player.worldX / TILE_SIZE);
        const centerTileY = Math.floor(player.worldY / TILE_SIZE);
        const tilesVisible = Math.floor(minimapRadius / minimapTileSize);
        
        // Draw minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(minimapX + minimapRadius, minimapY + minimapRadius, minimapRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw minimap border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(minimapX + minimapRadius, minimapY + minimapRadius, minimapRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw tiles on minimap
        for (let y = centerTileY - tilesVisible; y <= centerTileY + tilesVisible; y++) {
            for (let x = centerTileX - tilesVisible; x <= centerTileX + tilesVisible; x++) {
                const terrain = getTerrainAt(x, y);
                const object = getObjectAt(x, y);
                const mapX = minimapX + minimapRadius + (x - centerTileX) * minimapTileSize;
                const mapY = minimapY + minimapRadius + (y - centerTileY) * minimapTileSize;
                
                // Calculate distance from center for circular mask
                const distFromCenter = Math.sqrt(
                    Math.pow(mapX - (minimapX + minimapRadius), 2) + 
                    Math.pow(mapY - (minimapY + minimapRadius), 2)
                );
                
                // Only draw if within the circular minimap
                if (distFromCenter <= minimapRadius) {
                    // Draw terrain
                    ctx.fillStyle = TERRAIN_COLORS[terrain];
                    ctx.fillRect(mapX - minimapTileSize/2, mapY - minimapTileSize/2, minimapTileSize, minimapTileSize);
                    
                    // Draw objects
                    if (object === OBJECTS.TREE) {
                        ctx.fillStyle = '#006400'; // Dark green for trees
                        ctx.fillRect(mapX - minimapTileSize/2, mapY - minimapTileSize/2, minimapTileSize, minimapTileSize);
                    } else if (object === OBJECTS.ROCK) {
                        ctx.fillStyle = '#A9A9A9'; // Dark gray for rocks
                        ctx.fillRect(mapX - minimapTileSize/2, mapY - minimapTileSize/2, minimapTileSize, minimapTileSize);
                    }
                }
            }
        }
        
        // Draw enemies on minimap
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const enemyTileX = Math.floor(enemy.worldX / TILE_SIZE);
            const enemyTileY = Math.floor(enemy.worldY / TILE_SIZE);
            const mapX = minimapX + minimapRadius + (enemyTileX - centerTileX) * minimapTileSize;
            const mapY = minimapY + minimapRadius + (enemyTileY - centerTileY) * minimapTileSize;
            
            // Calculate distance from center for circular mask
            const distFromCenter = Math.sqrt(
                Math.pow(mapX - (minimapX + minimapRadius), 2) + 
                Math.pow(mapY - (minimapY + minimapRadius), 2)
            );
            
            // Only draw if within the circular minimap
            if (distFromCenter <= minimapRadius) {
                // Draw enemy based on type
                switch (enemy.type) {
                    case ENEMY_TYPES.GOBLIN:
                        ctx.fillStyle = '#FF0000'; // Red for goblins
                        break;
                    case ENEMY_TYPES.SKELETON:
                        ctx.fillStyle = '#FFFFFF'; // White for skeletons
                        break;
                    case ENEMY_TYPES.SLIME:
                        ctx.fillStyle = '#9C27B0'; // Purple for slimes
                        break;
                }
                
                ctx.beginPath();
                ctx.arc(mapX, mapY, minimapTileSize/2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw player on minimap
        const playerMapX = minimapX + minimapRadius;
        const playerMapY = minimapY + minimapRadius;
        
        ctx.fillStyle = '#FFFF00'; // Yellow for player
        ctx.beginPath();
        ctx.arc(playerMapX, playerMapY, minimapTileSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player direction indicator
        const dirLength = minimapTileSize * 2;
        const dirX = playerMapX + player.lastDirection.x * dirLength;
        const dirY = playerMapY + player.lastDirection.y * dirLength;
        
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playerMapX, playerMapY);
        ctx.lineTo(dirX, dirY);
        ctx.stroke();
    } catch (error) {
        errorHandler.handle(error, 'minimap rendering');
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
            playSound('combatStart');
            
            // Switch to combat music
            if (musicEnabled && audioContext) {
                playMusic('combat');
            }
        }
        
        // Play sound when exiting combat
        if (wasInCombat && !player.inCombat) {
            playSound('combatEnd');
            
            // Switch back to main music
            if (musicEnabled && audioContext) {
                playMusic('main');
            }
        }
    } catch (error) {
        errorHandler.handle(error, 'update combat state');
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
        
        // Update gamepad state
        if (gamepadConnected) {
            updateGamepadState();
        }
        
        // Process input and update game state
        handleInput();
        
        // Update enemies
        updateEnemies();
        
        // Render the game
        render();
        
        // Continue the game loop
        requestAnimationFrame(gameLoop);
    } catch (error) {
        errorHandler.handle(error, 'game loop');
        // Even if there's an error, try to continue the game loop
        requestAnimationFrame(gameLoop);
    }
}

// Update gamepad state
function updateGamepadState() {
    try {
        // Get the latest gamepad state
        const gamepadsArray = navigator.getGamepads();
        
        // Update our gamepads object with the latest state
        for (let i = 0; i < gamepadsArray.length; i++) {
            if (gamepadsArray[i]) {
                // Store the previous button states before updating
                if (!gamepads[gamepadsArray[i].index]) {
                    gamepads[gamepadsArray[i].index] = gamepadsArray[i];
                    
                    // Initialize wasPressed for all buttons
                    for (let j = 0; j < gamepadsArray[i].buttons.length; j++) {
                        gamepadsArray[i].buttons[j].wasPressed = false;
                    }
                } else {
                    // Store previous button states
                    for (let j = 0; j < gamepadsArray[i].buttons.length; j++) {
                        gamepadsArray[i].buttons[j].wasPressed = 
                            gamepads[gamepadsArray[i].index].buttons[j].pressed;
                    }
                }
                
                // Update with new gamepad state
                gamepads[gamepadsArray[i].index] = gamepadsArray[i];
            }
        }
    } catch (error) {
        errorHandler.handle(error, 'gamepad state update');
    }
}

// Spawn enemies randomly around the world
function spawnEnemies() {
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
    } catch (error) {
        errorHandler.handle(error, 'enemy spawning');
    }
}

// Update all enemies
function updateEnemies() {
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
        errorHandler.handle(error, 'enemy updating');
    }
}

// Draw all enemies
function drawEnemies() {
    try {
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Calculate enemy's screen position
            const screenX = Math.round(enemy.worldX - cameraX);
            const screenY = Math.round(enemy.worldY - cameraY);
            
            // Only draw if on screen
            if (
                screenX + enemy.size < 0 || 
                screenX > canvas.width || 
                screenY + enemy.size < 0 || 
                screenY > canvas.height
            ) {
                continue;
            }
            
            // Calculate center position
            const centerX = screenX + enemy.size/2;
            const centerY = screenY + enemy.size/2;
            
            // Add a slight bounce effect when moving
            const bounceOffset = enemy.isMoving ? Math.sin(enemy.animationFrame * 0.3) * 2 : 0;
            
            // Skip drawing every other frame if hit effect is active
            if (enemy.hitEffect > 0 && enemy.hitEffect % 2 === 0) {
                continue;
            }
            
            // Draw enemy based on type
            switch (enemy.type) {
                case ENEMY_TYPES.GOBLIN:
                    drawGoblin(enemy, centerX, centerY, bounceOffset);
                    break;
                case ENEMY_TYPES.SKELETON:
                    drawSkeleton(enemy, centerX, centerY, bounceOffset);
                    break;
                case ENEMY_TYPES.SLIME:
                    drawSlime(enemy, centerX, centerY, bounceOffset);
                    break;
            }
            
            // Always draw health bar
            drawEnemyHealthBar(enemy, centerX, centerY);
        }
    } catch (error) {
        errorHandler.handle(error, 'enemy rendering');
    }
}

// Draw enemy health bar
function drawEnemyHealthBar(enemy, centerX, centerY) {
    try {
        const barWidth = enemy.size;
        const barHeight = 4;
        const barY = centerY - enemy.size/2 - 10;
        
        // Get max health for this enemy type
        const maxHealth = ENEMY_PROPERTIES[enemy.type].health;
        
        // Background (empty health)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(centerX - barWidth/2, barY, barWidth, barHeight);
        
        // Health amount
        const healthPercent = enemy.health / maxHealth;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(centerX - barWidth/2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - barWidth/2, barY, barWidth, barHeight);
    } catch (error) {
        errorHandler.handle(error, 'enemy health bar');
    }
}

// Draw a goblin enemy
function drawGoblin(enemy, centerX, centerY, bounceOffset) {
    // Body
    ctx.beginPath();
    ctx.arc(centerX, centerY - bounceOffset, enemy.size/2, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2E7D32'; // Darker green
    ctx.stroke();
    
    // Ears
    const earSize = enemy.size / 5;
    
    // Left ear
    ctx.beginPath();
    ctx.moveTo(centerX - enemy.size/3, centerY - bounceOffset - enemy.size/4);
    ctx.lineTo(centerX - enemy.size/3 - earSize, centerY - bounceOffset - enemy.size/2);
    ctx.lineTo(centerX - enemy.size/3 + earSize, centerY - bounceOffset - enemy.size/2);
    ctx.closePath();
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.strokeStyle = '#2E7D32';
    ctx.stroke();
    
    // Right ear
    ctx.beginPath();
    ctx.moveTo(centerX + enemy.size/3, centerY - bounceOffset - enemy.size/4);
    ctx.lineTo(centerX + enemy.size/3 - earSize, centerY - bounceOffset - enemy.size/2);
    ctx.lineTo(centerX + enemy.size/3 + earSize, centerY - bounceOffset - enemy.size/2);
    ctx.closePath();
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.strokeStyle = '#2E7D32';
    ctx.stroke();
    
    // Eyes
    const eyeSize = enemy.size / 10;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(centerX - enemy.size/4, centerY - bounceOffset - enemy.size/6, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#FF0000'; // Red eyes
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(centerX + enemy.size/4, centerY - bounceOffset - enemy.size/6, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#FF0000';
    ctx.fill();
    
    // Mouth (evil grin)
    ctx.beginPath();
    ctx.arc(centerX, centerY - bounceOffset + enemy.size/6, enemy.size/4, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2E7D32';
    ctx.stroke();
}

// Draw a skeleton enemy
function drawSkeleton(enemy, centerX, centerY, bounceOffset) {
    // Body
    ctx.beginPath();
    ctx.arc(centerX, centerY - bounceOffset, enemy.size/2, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#9E9E9E'; // Gray
    ctx.stroke();
    
    // Skull details
    ctx.beginPath();
    ctx.arc(centerX, centerY - bounceOffset, enemy.size/2.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#9E9E9E';
    ctx.stroke();
    
    // Eyes (dark sockets)
    const eyeSize = enemy.size / 8;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(centerX - enemy.size/4, centerY - bounceOffset - enemy.size/8, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#000000'; // Black eye sockets
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(centerX + enemy.size/4, centerY - bounceOffset - enemy.size/8, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Nose (triangle)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - bounceOffset);
    ctx.lineTo(centerX - enemy.size/10, centerY - bounceOffset + enemy.size/10);
    ctx.lineTo(centerX + enemy.size/10, centerY - bounceOffset + enemy.size/10);
    ctx.closePath();
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Mouth (teeth)
    ctx.beginPath();
    ctx.rect(centerX - enemy.size/4, centerY - bounceOffset + enemy.size/6, enemy.size/2, enemy.size/10);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Teeth lines
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX - enemy.size/4 + (enemy.size/2) * (i/4), centerY - bounceOffset + enemy.size/6);
        ctx.lineTo(centerX - enemy.size/4 + (enemy.size/2) * (i/4), centerY - bounceOffset + enemy.size/6 + enemy.size/10);
        ctx.strokeStyle = enemy.color;
        ctx.stroke();
    }
}

// Draw a slime enemy
function drawSlime(enemy, centerX, centerY, bounceOffset) {
    // Slime body (wobbling blob)
    const wobble = Math.sin(enemy.animationFrame * 0.2) * enemy.size/10;
    
    // Main body
    ctx.beginPath();
    ctx.ellipse(
        centerX, 
        centerY - bounceOffset, 
        enemy.size/2 + wobble, 
        enemy.size/2 - wobble/2, 
        0, 0, Math.PI * 2
    );
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#7B1FA2'; // Darker purple
    ctx.stroke();
    
    // Highlight
    ctx.beginPath();
    ctx.ellipse(
        centerX - enemy.size/6, 
        centerY - bounceOffset - enemy.size/6, 
        enemy.size/6, 
        enemy.size/8, 
        Math.PI/4, 0, Math.PI * 2
    );
    ctx.fillStyle = '#CE93D8'; // Light purple
    ctx.fill();
    
    // Eyes
    const eyeSize = enemy.size / 10;
    const eyeDistance = enemy.size / 5;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(centerX - eyeDistance, centerY - bounceOffset - eyeSize, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(centerX + eyeDistance, centerY - bounceOffset - eyeSize, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Mouth (simple curve)
    ctx.beginPath();
    ctx.arc(centerX, centerY - bounceOffset + enemy.size/6, enemy.size/5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7B1FA2';
    ctx.stroke();
}

// Damage the player and handle invulnerability
function damagePlayer(amount) {
    try {
        // Only take damage if not invulnerable
        if (!player.invulnerable) {
            player.health -= amount;
            
            // Make player invulnerable temporarily
            player.invulnerable = true;
            player.invulnerabilityTime = player.invulnerabilityDuration;
            player.damageFlashTime = 10; // Flash for 10 frames
            
            // Play damage sound
            playSound('damage');
            
            // Check if player is dead
            if (player.health <= 0) {
                gameOver();
            }
        }
    } catch (error) {
        errorHandler.handle(error, 'player damage');
    }
}

// Handle game over
function gameOver() {
    try {
        // Reset player health
        player.health = player.maxHealth;
        
        // Reset player position to a safe location
        initializePlayerPosition();
        
        // Respawn enemies
        spawnEnemies();
        
        // Display game over message
        showMessage('Game Over! You have been respawned.', 3000);
    } catch (error) {
        errorHandler.handle(error, 'game over');
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
        errorHandler.handle(error, 'show message');
    }
}

// Play a sound effect
function playSound(soundName) {
    try {
        if (!audioContext) return;
        
        // Check sound timers for rate-limited sounds
        if (soundName === 'enemyNearby') {
            if (soundTimers.enemyNearby > 0) {
                return; // Skip if too soon
            }
            soundTimers.enemyNearby = soundTimers.enemyNearbyInterval;
        }
        
        // Only play if we have the sound
        if (sounds[soundName]) {
            const audio = new Audio(sounds[soundName]);
            audio.volume = soundVolume;
            audio.play().catch(e => console.log('Audio play error:', e));
        }
    } catch (error) {
        console.error(`Error in play sound: ${error.message}`);
    }
}

// Update sound timers
function updateSoundTimers() {
    // Decrease all sound timers
    for (const timer in soundTimers) {
        if (typeof soundTimers[timer] === 'number' && soundTimers[timer] > 0) {
            soundTimers[timer]--;
        }
    }
}

// Play enemy nearby sound if enemies are close
function playEnemyNearbySound(nearbyEnemies) {
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
            playSound('enemyNearby');
        }
    }
}

// Start a sword attack
function startAttack() {
    try {
        player.isAttacking = true;
        player.attackTime = player.attackDuration;
        
        // Check for enemies in attack range
        attackEnemies();
    } catch (error) {
        errorHandler.handle(error, 'start attack');
    }
}

// Update the attack state
function updateAttackState() {
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
        errorHandler.handle(error, 'update attack state');
    }
}

// Attack enemies in range
function attackEnemies() {
    try {
        // Calculate attack area based on player direction
        const attackDirection = player.lastDirection;
        
        // Use a wider attack area
        const attackCenterX = player.worldX + attackDirection.x * player.size * 0.5;
        const attackCenterY = player.worldY + attackDirection.y * player.size * 0.5;
        
        // Track if we hit any enemy
        let hitAnyEnemy = false;
        
        // Check each enemy for collision with attack area
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Calculate distance from attack center to enemy
            const dx = enemy.worldX - attackCenterX;
            const dy = enemy.worldY - attackCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If enemy is in range, damage it
            // Use a more generous hit detection
            if (distance < player.attackRange + enemy.size) {
                // Calculate random damage
                let damage = Math.floor(Math.random() * (player.maxDamage - player.minDamage + 1)) + player.minDamage;
                
                // Check for critical hit
                let isCritical = Math.random() < player.criticalChance;
                if (isCritical) {
                    damage = Math.floor(damage * player.criticalMultiplier);
                }
                
                // Check for enemy damage resistance
                let damageResisted = false;
                if (enemy.damageResistance && Math.random() < enemy.damageResistance) {
                    // Damage was resisted
                    damageResisted = true;
                    damage = Math.max(1, Math.floor(damage / 2)); // Minimum 1 damage
                }
                
                // Apply damage and get result
                const damageResult = damageEnemy(i, damage, isCritical, damageResisted);
                
                if (damageResult.hit) {
                    hitAnyEnemy = true;
                }
            }
        }
        
        // Play different sound based on whether we hit anything
        if (hitAnyEnemy) {
            playSound('enemyHit');
        } else {
            playSound('attack');
        }
    } catch (error) {
        errorHandler.handle(error, 'attack enemies');
    }
}

// Damage an enemy
function damageEnemy(enemyIndex, amount, isCritical, wasResisted) {
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
        
        // Reduce enemy health
        enemy.health -= amount;
        
        // Show damage number
        showDamageNumber(enemyX, enemyY, amount, isCritical, wasResisted);
        
        // Check if enemy is defeated
        if (enemy.health <= 0) {
            // Get enemy type before removing
            const enemyType = enemy.type;
            
            // Remove the enemy
            enemies.splice(enemyIndex, 1);
            
            // Play defeat sound
            playSound('enemyDefeat');
            
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
            
            // Add visual effects
            addKillEffects(enemyX, enemyY, enemyType, scoreGain);
            
            return { hit: true, killed: true };
        }
        
        return { hit: true, killed: false };
    } catch (error) {
        errorHandler.handle(error, 'damage enemy');
        return { hit: false, killed: false };
    }
}

// Show damage number
function showDamageNumber(x, y, amount, isCritical, wasResisted) {
    try {
        // Determine color and size based on damage type
        let color, size;
        let text = amount.toString();
        
        if (isCritical) {
            // Critical hit
            color = '255, 255, 0'; // Yellow
            size = 24;
            text = 'CRIT! ' + text;
        } else if (wasResisted) {
            // Resisted hit
            color = '150, 150, 150'; // Gray
            size = 16;
            text = text + ' (Resisted)';
        } else {
            // Normal hit
            color = '255, 255, 255'; // White
            size = 18;
        }
        
        // Add random offset to prevent overlapping numbers
        const offsetX = (Math.random() * 40) - 20;
        
        // Add text effect
        player.killEffects.push({
            type: 'text',
            worldX: x + offsetX,
            worldY: y - 30,
            text: text,
            size: size,
            color: color,
            lifetime: 45,
            maxLifetime: 45
        });
    } catch (error) {
        errorHandler.handle(error, 'show damage number');
    }
}

// Add visual effects for enemy defeat
function addKillEffects(x, y, enemyType, score) {
    try {
        // Add explosion effect
        player.killEffects.push({
            type: 'explosion',
            worldX: x,
            worldY: y,
            size: PLAYER_SIZE * 1.5,
            lifetime: 30,
            maxLifetime: 30
        });
        
        // Add score text effect
        player.killEffects.push({
            type: 'text',
            worldX: x,
            worldY: y - 20,
            text: `+${score}`,
            size: 20 + Math.min(player.combo * 2, 20), // Text gets bigger with higher combos
            color: player.combo >= 5 ? '255, 255, 0' : '255, 255, 255', // Yellow for high combos
            lifetime: 60,
            maxLifetime: 60
        });
        
        // Add combo text for combos of 2 or higher
        if (player.combo >= 2) {
            player.killEffects.push({
                type: 'text',
                worldX: x,
                worldY: y - 50,
                text: `${player.combo}x COMBO!`,
                size: 16 + Math.min(player.combo * 3, 24),
                color: player.combo >= 10 ? '255, 0, 255' : player.combo >= 5 ? '255, 255, 0' : '255, 165, 0',
                lifetime: 60,
                maxLifetime: 60
            });
        }
        
        // Chance to drop a heart based on enemy type and player's health
        let heartDropChance = 0;
        
        // Higher chance to drop hearts when player health is low
        if (player.health < player.maxHealth) {
            // Base drop chance depends on enemy type
            switch (enemyType) {
                case ENEMY_TYPES.GOBLIN:
                    heartDropChance = 0.25; // 25% chance for tougher enemies
                    break;
                case ENEMY_TYPES.SKELETON:
                    heartDropChance = 0.15; // 15% chance for medium enemies
                    break;
                case ENEMY_TYPES.SLIME:
                    heartDropChance = 0.10; // 10% chance for weak enemies
                    break;
                default:
                    heartDropChance = 0.10;
            }
            
            // Increase chance when health is very low
            if (player.health === 1) {
                heartDropChance *= 2; // Double the chance when at 1 heart
            }
            
            // Check if a heart should drop
            if (Math.random() < heartDropChance) {
                // Generate random velocity for the heart to make it bounce
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 2;
                
                // Add heart pickup effect as a physical item
                player.killEffects.push({
                    type: 'heart',
                    worldX: x,
                    worldY: y,
                    size: PLAYER_SIZE * 0.8,
                    lifetime: 600, // Heart stays for 10 seconds
                    maxLifetime: 600,
                    collected: false,
                    pulseTime: 0,
                    // Physics properties
                    velocityX: Math.cos(angle) * speed,
                    velocityY: Math.sin(angle) * speed,
                    gravity: 0.1,
                    bounce: 0.6,
                    friction: 0.95,
                    grounded: false,
                    bounceHeight: 0,
                    bounceTime: 0
                });
                
                // Add text to indicate heart drop
                player.killEffects.push({
                    type: 'text',
                    worldX: x,
                    worldY: y - 80,
                    text: 'HEART DROP!',
                    size: 18,
                    color: '255, 0, 0', // Red for heart drop
                    lifetime: 90,
                    maxLifetime: 90
                });
            }
        }
        
        // Add particle effect
        const particles = [];
        const particleCount = 20 + player.combo * 2; // More particles for higher combos
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            // Random angle
            const angle = Math.random() * Math.PI * 2;
            // Random distance
            const distance = Math.random() * PLAYER_SIZE * 2;
            
            // Particle color based on enemy type
            let color;
            switch (enemyType) {
                case ENEMY_TYPES.GOBLIN:
                    color = '76, 175, 80';
                    break;
                case ENEMY_TYPES.SKELETON:
                    color = '224, 224, 224';
                    break;
                case ENEMY_TYPES.SLIME:
                    color = '156, 39, 176';
                    break;
                default:
                    color = '255, 255, 255';
            }
            
            // Add particle
            particles.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                size: 2 + Math.random() * 4,
                color: color
            });
        }
        
        // Add particle effect
        player.killEffects.push({
            type: 'particles',
            worldX: x,
            worldY: y,
            particles: particles,
            lifetime: 45,
            maxLifetime: 45
        });
        
        // Screen shake for high combos
        if (player.combo >= 5) {
            addScreenShake(player.combo * 0.5);
        }
    } catch (error) {
        errorHandler.handle(error, 'kill effects');
    }
}

// Global variables for screen shake
let screenShakeAmount = 0;
let screenShakeDecay = 0.9;

// Add screen shake effect
function addScreenShake(amount) {
    screenShakeAmount = Math.min(screenShakeAmount + amount, 20);
}

// Draw the score display
function drawScoreDisplay() {
    try {
        // Position in top-right corner
        const scoreX = canvas.width - 20;
        const scoreY = 30;
        
        // Draw score text
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        // Draw score with outline
        ctx.strokeText(`Score: ${player.score}`, scoreX, scoreY);
        ctx.fillText(`Score: ${player.score}`, scoreX, scoreY);
        
        // Draw combo if active
        if (player.combo > 1) {
            const comboY = scoreY + 30;
            
            // Calculate combo timer percentage
            const comboTimePercent = player.comboTimer / player.comboDuration;
            
            // Combo text gets larger with higher combos (up to a limit)
            const comboSize = Math.min(24 + player.combo * 2, 48);
            
            // Combo text pulses
            const pulseFactor = 1 + Math.sin(gameTime * 0.2) * 0.1;
            
            // Combo text color changes based on combo level
            let comboColor;
            if (player.combo >= 10) {
                comboColor = '#FF00FF'; // Purple for 10+
            } else if (player.combo >= 5) {
                comboColor = '#FFFF00'; // Yellow for 5-9
            } else {
                comboColor = '#FF9900'; // Orange for 2-4
            }
            
            // Draw combo text
            ctx.font = `bold ${comboSize * pulseFactor}px Arial`;
            ctx.fillStyle = comboColor;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            
            ctx.strokeText(`${player.combo}x COMBO!`, scoreX, comboY);
            ctx.fillText(`${player.combo}x COMBO!`, scoreX, comboY);
            
            // Draw combo timer bar
            const barWidth = 100;
            const barHeight = 6;
            const barX = scoreX - barWidth;
            const barY = comboY + 10;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Timer fill
            ctx.fillStyle = comboColor;
            ctx.fillRect(barX, barY, barWidth * comboTimePercent, barHeight);
            
            // Border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    } catch (error) {
        errorHandler.handle(error, 'score display');
    }
}

// Draw combat indicator
function drawCombatIndicator() {
    try {
        // Calculate pulsing effect
        const pulseIntensity = 0.2 + 0.1 * Math.sin(gameTime * 0.1);
        
        // Draw red border around the screen
        const borderWidth = 10;
        const borderOpacity = 0.3 + pulseIntensity;
        
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = `rgba(255, 0, 0, ${borderOpacity})`;
        
        // Draw the border with rounded corners
        ctx.beginPath();
        ctx.roundRect(
            borderWidth / 2, 
            borderWidth / 2, 
            canvas.width - borderWidth, 
            canvas.height - borderWidth, 
            10 // Corner radius
        );
        ctx.stroke();
        
        // Draw enemy indicators for nearby enemies
        drawEnemyIndicators();
        
        // Draw combat text
        const textY = 80;
        const textOpacity = 0.7 + pulseIntensity;
        
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 0, 0, ${textOpacity})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${textOpacity})`;
        ctx.lineWidth = 3;
        
        // Pulse text size
        const textSize = 24 + 4 * Math.sin(gameTime * 0.1);
        ctx.font = `bold ${textSize}px Arial`;
        
        // Draw text with outline
        ctx.strokeText('COMBAT MODE', canvas.width / 2, textY);
        ctx.fillText('COMBAT MODE', canvas.width / 2, textY);
        
        // Draw number of nearby enemies
        if (player.nearbyEnemies.length > 0) {
            const enemyText = `${player.nearbyEnemies.length} ${player.nearbyEnemies.length === 1 ? 'enemy' : 'enemies'} nearby`;
            ctx.font = 'bold 18px Arial';
            ctx.strokeText(enemyText, canvas.width / 2, textY + 30);
            ctx.fillText(enemyText, canvas.width / 2, textY + 30);
        }
    } catch (error) {
        errorHandler.handle(error, 'combat indicator');
    }
}

// Draw indicators pointing to nearby enemies
function drawEnemyIndicators() {
    try {
        // Only show indicators for enemies not on screen
        for (const enemyInfo of player.nearbyEnemies) {
            const enemy = enemies[enemyInfo.index];
            
            // Calculate enemy's screen position
            const screenX = Math.round(enemy.worldX - cameraX);
            const screenY = Math.round(enemy.worldY - cameraY);
            
            // Check if enemy is off screen
            const isOffScreen = 
                screenX + enemy.size < 0 || 
                screenX > canvas.width || 
                screenY + enemy.size < 0 || 
                screenY > canvas.height;
            
            if (isOffScreen) {
                // Calculate direction to enemy
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                const dx = enemy.worldX - player.worldX;
                const dy = enemy.worldY - player.worldY;
                const angle = Math.atan2(dy, dx);
                
                // Calculate position on screen edge
                const distance = Math.min(centerX, centerY) - 40;
                const indicatorX = centerX + Math.cos(angle) * distance;
                const indicatorY = centerY + Math.sin(angle) * distance;
                
                // Draw arrow pointing to enemy
                drawEnemyArrow(indicatorX, indicatorY, angle, enemy.type);
            }
        }
    } catch (error) {
        errorHandler.handle(error, 'enemy indicators');
    }
}

// Draw an arrow pointing to an off-screen enemy
function drawEnemyArrow(x, y, angle, enemyType) {
    // Save context
    ctx.save();
    
    // Translate to arrow position
    ctx.translate(x, y);
    
    // Rotate to point in the right direction
    ctx.rotate(angle);
    
    // Get color based on enemy type
    let arrowColor;
    switch (enemyType) {
        case ENEMY_TYPES.GOBLIN:
            arrowColor = '#4CAF50'; // Green
            break;
        case ENEMY_TYPES.SKELETON:
            arrowColor = '#E0E0E0'; // Light gray
            break;
        case ENEMY_TYPES.SLIME:
            arrowColor = '#9C27B0'; // Purple
            break;
        default:
            arrowColor = '#FF0000'; // Red
    }
    
    // Draw arrow
    const arrowSize = 15;
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize/2, arrowSize/2);
    ctx.lineTo(-arrowSize/2, -arrowSize/2);
    ctx.closePath();
    
    // Fill and stroke
    ctx.fillStyle = arrowColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    
    // Pulse effect
    const pulseSize = 5 + 3 * Math.sin(gameTime * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Restore context
    ctx.restore();
}

// Initialize the game when the page loads
window.addEventListener('load', init); 

// Audio context for sound effects
let audioContext;
let soundVolume = 0.5; // Default sound volume

// Initialize audio context
function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        console.log("Audio system initialized");
        return true;
    } catch (error) {
        console.warn("Audio could not be initialized. Sound will be disabled.");
        return false;
    }
}

// Sound effects
const sounds = {
    damage: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    attack: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    enemyHit: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    enemyDefeat: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    combatStart: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    combatEnd: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    swordSwing: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    enemyNearby: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    heartCollect: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
    heal: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v'
};

// Sound timers to prevent too frequent playing
const soundTimers = {
    enemyNearby: 0,
    enemyNearbyInterval: 120 // Play every 2 seconds at most
};

// Toggle music on/off
function toggleMusic() {
    try {
        if (!audioContext) {
            initAudio();
            return;
        }
        
        musicEnabled = !musicEnabled;
        
        if (musicEnabled) {
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Start playing appropriate music
            if (player.inCombat) {
                playMusic('combat');
            } else {
                playMusic('main');
            }
            
            showMessage("Music enabled", 2000);
        } else {
            stopMusic();
            showMessage("Music disabled", 2000);
        }
    } catch (error) {
        errorHandler.handle(error, 'toggle music');
    }
} 
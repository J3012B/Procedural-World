// Game constants
const TILE_SIZE = 32; // Size of each tile in pixels
let VIEWPORT_TILES_X = Math.ceil(window.innerWidth / TILE_SIZE) + 2; // Number of tiles visible horizontally
let VIEWPORT_TILES_Y = Math.ceil(window.innerHeight / TILE_SIZE) + 2; // Number of tiles visible vertically
const CAMERA_SPEED = 5; // Speed of camera movement
const PLAYER_SIZE = 24; // Size of the player character

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
    invulnerabilityDuration: 60, // Frames of invulnerability (1 second at 60fps)
    damageFlashTime: 0 // Time remaining for damage flash effect
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
        size: PLAYER_SIZE * 0.8,
        speed: 1.2,
        followPlayer: true,
        detectionRadius: TILE_SIZE * 5
    },
    [ENEMY_TYPES.SKELETON]: {
        color: '#E0E0E0', // Light gray
        size: PLAYER_SIZE * 0.9,
        speed: 0.8,
        followPlayer: true,
        detectionRadius: TILE_SIZE * 7
    },
    [ENEMY_TYPES.SLIME]: {
        color: '#9C27B0', // Purple
        size: PLAYER_SIZE * 0.7,
        speed: 0.5,
        followPlayer: false,
        detectionRadius: 0
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
        });
        
        window.addEventListener('keyup', e => { 
            keysPressed[e.key] = false; 
            if (gameTime % 60 === 0) {
                console.log(`Key up: ${e.key}`);
            }
        });
        
        // Generate tile images
        generateTileImages();
        
        // Generate object images
        generateObjectImages();
        
        // Initialize player position
        initializePlayerPosition();
        
        // Spawn initial enemies
        spawnEnemies();
        
        // Start the game loop
        gameLoop();
    } catch (error) {
        errorHandler.handle(error, 'initialization');
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
        // Track if player is moving
        let isMoving = false;
        let directionX = 0;
        let directionY = 0;
        
        // Store original position
        const originalX = player.worldX;
        const originalY = player.worldY;
        let newX = originalX;
        let newY = originalY;
        
        // Calculate new position based on key presses
        if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) {
            newY -= player.speed;
            isMoving = true;
            directionY = -1;
        }
        if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) {
            newY += player.speed;
            isMoving = true;
            directionY = 1;
        }
        if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
            newX -= player.speed;
            isMoving = true;
            directionX = -1;
        }
        if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
            newX += player.speed;
            isMoving = true;
            directionX = 1;
        }
        
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

// Update camera position to follow player
function updateCamera() {
    // Calculate the center of the screen
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Update camera position to center on player
    cameraX = player.worldX - centerX + player.size / 2;
    cameraY = player.worldY - centerY + player.size / 2;
}

// Render the game world
function render() {
    try {
        // Clear the canvas with a black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
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
        
        // Draw enemies
        drawEnemies();
        
        // Draw player
        drawPlayer();
        
        // Draw health UI
        drawHealthUI();
        
        // Draw minimap
        if (minimapVisible) {
            drawMinimap();
        }
    } catch (error) {
        errorHandler.handle(error, 'rendering');
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
        
        // Sword (if facing right)
        if (player.lastDirection.x >= 0) {
            // Sword handle
            ctx.beginPath();
            ctx.rect(
                centerX + player.size/2, 
                centerY - bounceOffset - player.size/8, 
                player.size/4, 
                player.size/4
            );
            ctx.fillStyle = '#8B4513'; // Brown handle
            ctx.fill();
            
            // Sword blade
            ctx.beginPath();
            ctx.moveTo(centerX + player.size/2 + player.size/4, centerY - bounceOffset);
            ctx.lineTo(centerX + player.size/2 + player.size/4 + player.size/2, centerY - bounceOffset - player.size/6);
            ctx.lineTo(centerX + player.size/2 + player.size/4 + player.size/2, centerY - bounceOffset + player.size/6);
            ctx.closePath();
            ctx.fillStyle = '#CCCCCC'; // Silver blade
            ctx.fill();
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 1;
            ctx.stroke();
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
    } catch (error) {
        errorHandler.handle(error, 'drawPlayer');
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
                    lastMoveChange: 0
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
        }
    } catch (error) {
        errorHandler.handle(error, 'enemy rendering');
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
        // Simple audio implementation
        const sounds = {
            damage: 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9v',
            // Add more sounds as needed
        };
        
        // Only play if we have the sound
        if (sounds[soundName]) {
            const audio = new Audio(sounds[soundName]);
            audio.volume = 0.3; // Lower volume
            audio.play().catch(e => console.log('Audio play error:', e));
        }
    } catch (error) {
        errorHandler.handle(error, 'play sound');
    }
}

// Initialize the game when the page loads
window.addEventListener('load', init); 
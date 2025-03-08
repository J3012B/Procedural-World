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
    boatColor: '#8B4513' // Brown wooden boat
};
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
        
        // Initialize player position to a nice starting area
        initializePlayerPosition();
        
        // Log initial state
        console.log("Game initialized");
        console.log("Player position:", player.worldX, player.worldY);
        console.log("Canvas size:", canvas.width, canvas.height);
        
        // Start game loop
        requestAnimationFrame(gameLoop);
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
            // Slow down slightly when in boat
            player.speed = 2.5;
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
        
        // Draw player
        drawPlayer();
        
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
        
        // Draw knight body (circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY - bounceOffset, player.size/2, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
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
                        ctx.fillStyle = '#696969'; // Dark gray for rocks
                        ctx.fillRect(mapX - minimapTileSize/2, mapY - minimapTileSize/2, minimapTileSize, minimapTileSize);
                    }
                }
            }
        }
        
        // Draw player on minimap
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(minimapX + minimapRadius, minimapY + minimapRadius, minimapTileSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw minimap label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press M to toggle minimap', minimapX + minimapRadius, minimapY + minimapSize + 15);
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
        
        // Process input and update game state
        handleInput();
        
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

// Initialize the game when the page loads
window.addEventListener('load', init); 
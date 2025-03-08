// Game constants
export const TILE_SIZE = 32; // Size of each tile in pixels
export const CAMERA_SPEED = 5; // Speed of camera movement
export const PLAYER_SIZE = 24; // Size of the player character

// Terrain types
export const TERRAIN = {
    WATER: 0,
    SAND: 1,
    GRASS: 2,
    EARTH: 3,
    STONE: 4
};

// Object types
export const OBJECTS = {
    NONE: 0,
    TREE: 1,
    ROCK: 2
};

// Enemy types
export const ENEMY_TYPES = {
    GOBLIN: 0,
    SKELETON: 1,
    SLIME: 2
};

// Terrain colors
export const TERRAIN_COLORS = {
    [TERRAIN.WATER]: '#1e90ff', // Deep blue
    [TERRAIN.SAND]: '#f0e68c',  // Khaki
    [TERRAIN.GRASS]: '#32cd32', // Lime green
    [TERRAIN.EARTH]: '#8b4513', // Saddle brown
    [TERRAIN.STONE]: '#708090'  // Slate gray
};

// Enemy properties
export const ENEMY_PROPERTIES = {
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

// Gamepad button mappings
export const GAMEPAD_BUTTON = {
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

export const GAMEPAD_DEADZONE = 0.2; // Ignore small joystick movements 
import { player } from './player.js';

// Array to store all collectible items
export let collectibles = [];

// Heart collectible properties
export const HEART_COLLECTIBLE = {
    type: 'heart',
    size: 15,
    healAmount: 1,
    lifetime: 600, // 10 seconds at 60fps
    bobAmplitude: 5, // How much the heart bobs up and down
    bobSpeed: 0.05, // Speed of bobbing animation
    dropChance: 0.3 // 30% chance to drop from enemies
};

// Add a heart collectible at the specified position
export function addHeartDrop(x, y) {
    collectibles.push({
        type: HEART_COLLECTIBLE.type,
        x: x,
        y: y,
        size: HEART_COLLECTIBLE.size,
        healAmount: HEART_COLLECTIBLE.healAmount,
        lifetime: HEART_COLLECTIBLE.lifetime,
        animationTime: Math.random() * 100 // Random start time for animation
    });
}

// Update all collectibles
export function updateCollectibles(audioSystem) {
    // Update lifetime and remove expired collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        
        // Decrease lifetime
        collectible.lifetime--;
        
        // Update animation time
        collectible.animationTime += 1;
        
        // Remove if expired
        if (collectible.lifetime <= 0) {
            collectibles.splice(i, 1);
            continue;
        }
        
        // Check for collision with player
        const dx = collectible.x - player.worldX;
        const dy = collectible.y - player.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.size/2 + collectible.size) {
            // Collect the item
            if (collectible.type === HEART_COLLECTIBLE.type) {
                // Only heal if not at max health
                if (player.health < player.maxHealth) {
                    player.health = Math.min(player.health + collectible.healAmount, player.maxHealth);
                    
                    // Play heart collect sound
                    if (audioSystem) {
                        audioSystem.playSound('heartCollect');
                    }
                }
            }
            
            // Remove the collectible
            collectibles.splice(i, 1);
        }
    }
}

// Draw all collectibles
export function drawCollectibles(ctx, cameraX, cameraY) {
    for (const collectible of collectibles) {
        // Calculate screen position
        const screenX = Math.round(collectible.x - cameraX);
        const screenY = Math.round(collectible.y - cameraY);
        
        // Skip if off screen
        if (screenX < -collectible.size*2 || screenX > ctx.canvas.width + collectible.size*2 || 
            screenY < -collectible.size*2 || screenY > ctx.canvas.height + collectible.size*2) {
            continue;
        }
        
        // Draw based on type
        if (collectible.type === HEART_COLLECTIBLE.type) {
            drawHeart(ctx, collectible, screenX, screenY);
        }
    }
}

// Draw a heart collectible
function drawHeart(ctx, heart, x, y) {
    // Calculate bobbing effect
    const bobOffset = Math.sin(heart.animationTime * HEART_COLLECTIBLE.bobSpeed) * HEART_COLLECTIBLE.bobAmplitude;
    
    // Calculate fade-in and fade-out
    let opacity = 1;
    const fadeInTime = 20;
    const fadeOutTime = 60;
    
    if (heart.lifetime > HEART_COLLECTIBLE.lifetime - fadeInTime) {
        // Fade in
        opacity = 1 - (heart.lifetime - (HEART_COLLECTIBLE.lifetime - fadeInTime)) / fadeInTime;
    } else if (heart.lifetime < fadeOutTime) {
        // Fade out
        opacity = heart.lifetime / fadeOutTime;
    }
    
    // Pulse effect
    const pulseScale = 1 + 0.2 * Math.sin(heart.animationTime * 0.1);
    const size = heart.size * pulseScale;
    
    // Draw heart shape
    const halfSize = size / 2;
    
    ctx.save();
    
    // Draw heart with glow effect
    // Outer glow
    ctx.beginPath();
    ctx.moveTo(x, y - bobOffset + halfSize * 0.3);
    ctx.bezierCurveTo(
        x, y - bobOffset - halfSize * 0.7,
        x - size, y - bobOffset - halfSize * 0.7,
        x - size, y - bobOffset + halfSize * 0.3
    );
    ctx.bezierCurveTo(
        x - size, y - bobOffset + halfSize,
        x - halfSize, y - bobOffset + size * 1.1,
        x, y - bobOffset + size * 0.8
    );
    ctx.bezierCurveTo(
        x + halfSize, y - bobOffset + size * 1.1,
        x + size, y - bobOffset + halfSize,
        x + size, y - bobOffset + halfSize * 0.3
    );
    ctx.bezierCurveTo(
        x + size, y - bobOffset - halfSize * 0.7,
        x, y - bobOffset - halfSize * 0.7,
        x, y - bobOffset + halfSize * 0.3
    );
    ctx.closePath();
    
    // Glow effect
    const gradient = ctx.createRadialGradient(
        x, y - bobOffset, size * 0.5,
        x, y - bobOffset, size * 1.2
    );
    gradient.addColorStop(0, `rgba(255, 0, 0, ${opacity * 0.7})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Inner heart
    ctx.beginPath();
    ctx.moveTo(x, y - bobOffset + halfSize * 0.3);
    ctx.bezierCurveTo(
        x, y - bobOffset - halfSize * 0.5,
        x - size * 0.8, y - bobOffset - halfSize * 0.5,
        x - size * 0.8, y - bobOffset + halfSize * 0.3
    );
    ctx.bezierCurveTo(
        x - size * 0.8, y - bobOffset + halfSize * 0.8,
        x - halfSize * 0.8, y - bobOffset + size * 0.9,
        x, y - bobOffset + size * 0.6
    );
    ctx.bezierCurveTo(
        x + halfSize * 0.8, y - bobOffset + size * 0.9,
        x + size * 0.8, y - bobOffset + halfSize * 0.8,
        x + size * 0.8, y - bobOffset + halfSize * 0.3
    );
    ctx.bezierCurveTo(
        x + size * 0.8, y - bobOffset - halfSize * 0.5,
        x, y - bobOffset - halfSize * 0.5,
        x, y - bobOffset + halfSize * 0.3
    );
    ctx.closePath();
    
    // Fill with red
    ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
    ctx.fill();
    
    // Add highlight
    ctx.beginPath();
    ctx.ellipse(
        x - halfSize * 0.3, 
        y - bobOffset - halfSize * 0.2, 
        size * 0.15, 
        size * 0.1, 
        Math.PI / 4, 
        0, Math.PI * 2
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.fill();
    
    ctx.restore();
} 
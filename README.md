# Procedural World

A browser-based procedurally generated world explorer built with HTML5 Canvas, CSS, and JavaScript.

## Play Online

You can play the game online at: [https://j3012b.github.io/Procedural-World](https://j3012b.github.io/Procedural-World)

## Game Description

Explore a procedurally generated world with different terrain types including water, sand, grass, earth, and stone. The world is infinite and can be explored in all directions. Navigate your cat character around trees and rocks while exploring the landscape.

## How to Play

1. Use the following controls to navigate the world:
   - WASD or Arrow Keys: Move your cat around the world
   - M: Toggle minimap visibility
2. The coordinates display in the top-left shows your current position in the world
3. Avoid obstacles like water, trees, and rocks

## Features

- Fullscreen canvas for immersive exploration
- Procedurally generated terrain that extends infinitely
- Pixel art style terrain tiles with unique textures
- Animated cat character with blinking and movement animations
- Trees and rocks that act as obstacles
- Minimap for easier navigation
- Smooth camera movement
- Coordinate tracking
- Collision detection

## Technical Details

The game is built using:
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic and procedural generation
- CSS for styling the UI elements

The world generation uses a simplified noise function to create varied terrain patterns. Each terrain type is represented by a unique color and texture. Trees and rocks are procedurally placed based on the underlying terrain type.

## Running Locally

```
# Install dependencies
npm install

# Start the development server
npm start
```

Then open your browser to `http://localhost:8080`.

## Deployment

This project is deployed using GitHub Pages. To deploy your own version:

```
# Install dependencies
npm install

# Deploy to GitHub Pages
npm run deploy
```

## Future Improvements

Planned enhancements:
- Implement proper Perlin/Simplex noise for better terrain generation
- Add more types of structures and objects
- Implement day/night cycle
- Add weather effects
- Add interactive elements and resources to collect
- Create a quest or goal system
- Add NPCs and enemies

## License

This project is open source and available for anyone to use and modify. 
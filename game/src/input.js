// Keyboard input for Sol Bay.
//
// One object owns every key the game cares about. It tracks which keys are
// held down right now and which were pressed since the last frame, so a
// tap (enter a car, shoot, pause) fires once while holding a movement key
// keeps steering. Arrow keys and WASD both drive; the page never scrolls
// under the game because the handled keys are prevented.

const HANDLED = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyE', 'KeyF', 'KeyM', 'KeyP', 'KeyR', 'KeyQ', 'Space', 'Enter', 'Escape',
];

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.anyKey = false;
  }

  attach(target) {
    target.addEventListener('keydown', (e) => {
      if (HANDLED.includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.anyKey = true;
    });
    target.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    target.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  // Call once per frame, after the game has read the presses.
  endFrame() {
    this.pressed.clear();
  }

  isDown(code) {
    return this.down.has(code);
  }

  // True when any handled key was pressed since the last frame.
  anyPressed() {
    return this.pressed.size > 0;
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // -1..1 on each axis from the movement keys. Up is negative y.
  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    return { x, y };
  }

  // True while the player is holding the run modifier (Shift).
  running() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  get up() { return this.isDown('KeyW') || this.isDown('ArrowUp'); }
  get downKey() { return this.isDown('KeyS') || this.isDown('ArrowDown'); }
  get left() { return this.isDown('KeyA') || this.isDown('ArrowLeft'); }
  get right() { return this.isDown('KeyD') || this.isDown('ArrowRight'); }
  get enterCar() { return this.wasPressed('KeyE'); }
  get punch() { return this.wasPressed('Space'); }
  get shoot() { return this.wasPressed('KeyF'); }
  get jobs() { return this.wasPressed('KeyM'); }
  get pause() { return this.wasPressed('KeyP') || this.wasPressed('Escape'); }
  get radio() { return this.wasPressed('KeyR'); }
  get confirm() { return this.wasPressed('Enter') || this.wasPressed('Space'); }
}

export function createInput() {
  return new Input();
}

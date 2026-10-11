const CANVAS_W = 800;
const CANVAS_H = 600;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function clear() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
}

loadSpritesheet(() => {
  clear();
});

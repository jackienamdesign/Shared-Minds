/**
 * Shared Minds — Stream of Consciousness Canvas
 * Foundation template ready for interactive ideation, thought streams, and visual nodes.
 */

class ConsciousnessEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Interactive state
    this.mouse = { x: 0, y: 0, px: 0, py: 0, isDown: false };
    this.particles = [];
    this.thoughtNodes = [];
    this.maxParticles = 120;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
    this.seedAmbientParticles();
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.px = this.mouse.x;
      this.mouse.py = this.mouse.y;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (this.mouse.isDown || Math.random() < 0.25) {
        this.addStreamParticle(this.mouse.x, this.mouse.y);
      }
    });

    window.addEventListener('mousedown', (e) => {
      this.mouse.isDown = true;
      for (let i = 0; i < 6; i++) {
        this.addStreamParticle(e.clientX, e.clientY, true);
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });

    // Touch support for mobile / touchpads
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.mouse.x = touch.clientX;
        this.mouse.y = touch.clientY;
        this.addStreamParticle(this.mouse.x, this.mouse.y);
      }
    }, { passive: true });
  }

  seedAmbientParticles() {
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(100, 255, 218, 0.4)' : 'rgba(168, 85, 247, 0.35)',
        alpha: Math.random() * 0.6 + 0.2,
        life: 1,
        decay: 0
      });
    }
  }

  addStreamParticle(x, y, burst = false) {
    const speed = burst ? 2.5 : 1.2;
    const angle = Math.random() * Math.PI * 2;
    const colors = [
      'rgba(100, 255, 218, 0.8)', // Cyan
      'rgba(168, 85, 247, 0.8)', // Purple
      'rgba(244, 63, 94, 0.7)'   // Rose
    ];

    this.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed * (Math.random() + 0.5),
      vy: Math.sin(angle) * speed * (Math.random() + 0.5),
      radius: Math.random() * 3 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      life: 1,
      decay: Math.random() * 0.015 + 0.008
    });

    if (this.particles.length > this.maxParticles) {
      this.particles.splice(40, 1); // remove older interactive particles
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.decay > 0) {
        p.life -= p.decay;
        p.alpha = p.life;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      } else {
        // Wrap ambient particles
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      }
    }
  }

  render() {
    // Subtle trail persistence
    this.ctx.fillStyle = 'rgba(11, 12, 16, 0.25)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw particle connections / neural web
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.15 * Math.min(this.particles[i].alpha, this.particles[j].alpha);
          this.ctx.strokeStyle = `rgba(100, 255, 218, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  animate() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.engine = new ConsciousnessEngine('consciousness-canvas');
});

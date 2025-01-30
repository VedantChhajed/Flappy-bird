class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 50; // Reduced maximum particles for better performance
    }

    createParticle(x, y, color) {
        return {
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color
        };
    }

    update() {
        // Remove excess particles if we're over the limit
        if (this.particles.length > this.maxParticles) {
            this.particles.length = this.maxParticles;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

class Game {
    loadSounds() {
        this.sounds = {};
        const audioContext = this.audioContext;

        // Load flap sound
        fetch(AUDIO_FILES.flap)
            .then(response => response.arrayBuffer())
            .then(buffer => audioContext.decodeAudioData(buffer))
            .then(decodedData => {
                this.sounds.flap = decodedData;
            })
            .catch(error => {
                console.error('Error loading flap sound:', error);
            });
    }

    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        this.startScreen = document.getElementById('start-screen');
        this.startButton = document.getElementById('start-button');

        // Initialize audio context safely
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sounds = {};
        } catch (e) {
            console.warn('Audio context not supported');
            this.audioContext = null;
            this.sounds = null;
        }

        this.bird = {
            x: this.canvas.width * 0.25,
            y: this.canvas.height * 0.5,
            velocity: 0,
            rotation: 0,
            wingFrame: 0,
            wingDirection: 1
        };

        this.pipes = [];
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') || 0;
        this.gameOver = false;
        this.particles = new ParticleSystem();
        this.backgrounds = this.createBackgrounds();

        this.startButton.addEventListener('click', () => {
            this.startGame();
        });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.gameOver) this.jump();
        });
        this.canvas.addEventListener('click', () => {
            if (!this.gameOver && this.startScreen.style.display === 'none') this.jump();
        });
        window.addEventListener('resize', () => this.handleResize());

        this.drawStartScreen();
    }

    setCanvasSize() {
        const isMobile = window.innerWidth <= 768;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Adjust game elements for the new canvas size
        if (this.bird) {
            this.bird.x = this.canvas.width * 0.25;
            this.bird.y = this.canvas.height * 0.5;
        }
    }

    handleResize() {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        this.setCanvasSize();

        // Scale game elements
        const scaleX = this.canvas.width / oldWidth;
        const scaleY = this.canvas.height / oldHeight;

        this.bird.x *= scaleX;
        this.bird.y *= scaleY;

        this.pipes.forEach(pipe => {
            pipe.x *= scaleX;
            pipe.height *= scaleY;
        });

        this.backgrounds = this.createBackgrounds();
    }

    createBackgrounds() {
        return [
            { img: this.createBackgroundLayer('#4a677a', 0.2), x: 0, speed: 0.5 },
            { img: this.createBackgroundLayer('#2a576a', 0.3), x: 0, speed: 1 },
            { img: this.createBackgroundLayer('#1a475a', 0.4), x: 0, speed: 1.5 }
        ];
    }

    createBackgroundLayer(color, alpha) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width * 2; // Double the width for smooth scrolling
        canvas.height = this.canvas.height;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize rendering
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        
        // Create a random mountain-like background
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        let x = 0;
        while (x < canvas.width) {
            const height = Math.random() * 100 + 200;
            ctx.lineTo(x, canvas.height - height);
            x += 50;
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
        
        return canvas;
    }

    startGame() {
        this.bird = {
            x: this.canvas.width * 0.25,
            y: this.canvas.height * 0.5,
            velocity: 0,
            rotation: 0,
            wingFrame: 0,
            wingDirection: 1
        };
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.startScreen.style.display = 'none';
        this.canvas.style.display = 'block';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.animate();
    }

    animate() {
        if (this.gameOver) {
            this.drawGameOver();
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw backgrounds
        this.backgrounds.forEach(bg => {
            bg.x = (bg.x - bg.speed) % bg.img.width;
            this.ctx.drawImage(bg.img, bg.x, 0);
            this.ctx.drawImage(bg.img, bg.x + bg.img.width, 0);
        });

        this.updateBird();
        this.updatePipes();
        this.particles.update();

        this.drawPipes();
        this.drawBird();
        this.particles.draw(this.ctx);
        this.drawScore();

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    jump() {
        if (this.gameOver) return;
        this.bird.velocity = -8;

        // Create particles
        for (let i = 0; i < 5; i++) {
            this.particles.particles.push(
                this.particles.createParticle(
                    this.bird.x - 20,
                    this.bird.y,
                    `hsl(${Math.random() * 60 + 180}, 100%, 70%)`
                )
            );
        }
    }

    updateBird() {
        this.bird.velocity += 0.4;
        this.bird.y += this.bird.velocity;
        this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.velocity * 0.1));
        
        // Wing animation
        this.bird.wingFrame += 0.2 * this.bird.wingDirection;
        if (this.bird.wingFrame > 1 || this.bird.wingFrame < 0) {
            this.bird.wingDirection *= -1;
        }

        if (this.bird.y > this.canvas.height - 20 || this.bird.y < 0) {
            this.gameOver = true;
        }
    }

    updatePipes() {
        // Generate new pipes with proper spacing
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.canvas.width - 200) {
            const gap = 150;
            const minHeight = 50;
            const maxHeight = this.canvas.height - gap - 50;
            const height = Math.random() * (maxHeight - minHeight) + minHeight;
            this.pipes.push({
                x: this.canvas.width,
                height: height,
                passed: false
            });
        }

        // Update pipe positions and check collisions
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= 2;

            // Optimized collision detection
            if (!this.gameOver && this.bird.x + 15 > pipe.x && this.bird.x - 15 < pipe.x + 50) {
                if (this.bird.y - 15 < pipe.height || this.bird.y + 15 > pipe.height + 150) {
                    this.gameOver = true;
                    this.createExplosion();
                    if (this.animationFrame) {
                        cancelAnimationFrame(this.animationFrame);
                    }
                }
            }

            // Score update with proper timing
            if (!pipe.passed && pipe.x + 50 < this.bird.x) {
                this.score++;
                pipe.passed = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('highScore', this.highScore);
                }
            }

            // Remove off-screen pipes
            if (pipe.x < -60) {
                this.pipes.splice(i, 1);
            }
        }
    }

    createExplosion() {
        // Play hit sound if available
        if (this.audioContext && this.sounds.hit) {
            const hitSound = this.audioContext.createBufferSource();
            hitSound.buffer = this.sounds.hit;
            hitSound.connect(this.audioContext.destination);
            hitSound.start();
        }

        for (let i = 0; i < 30; i++) {
            this.particles.particles.push(
                this.particles.createParticle(
                    this.bird.x,
                    this.bird.y,
                    `hsl(${Math.random() * 60}, 100%, 70%)`
                )
            );
        }
    }

    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x, this.bird.y);
        this.ctx.rotate(this.bird.rotation);

        // Bird body
        this.ctx.fillStyle = '#f4ce42';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Wing
        this.ctx.fillStyle = '#e6b71e';
        this.ctx.beginPath();
        this.ctx.ellipse(-5, 0, 12, 8, -Math.PI / 4 + this.bird.wingFrame * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(8, -5, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(10, -5, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Beak
        this.ctx.fillStyle = '#ff9933';
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(25, 0);
        this.ctx.lineTo(15, 5);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPipes() {
        this.pipes.forEach(pipe => {
            // Top pipe
            this.ctx.fillStyle = '#43a047';
            this.ctx.fillRect(pipe.x, 0, 50, pipe.height);

            // Bottom pipe
            this.ctx.fillRect(pipe.x, pipe.height + 150, 50, this.canvas.height);

            // Pipe caps
            this.ctx.fillStyle = '#2e7d32';
            this.ctx.fillRect(pipe.x - 3, pipe.height - 20, 56, 20);
            this.ctx.fillRect(pipe.x - 3, pipe.height + 150, 56, 20);
        });
    }

    drawScore() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, 50);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 80);
    }

    drawStartScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGameOver() {
        // Semi-transparent overlay
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerY = this.canvas.height * 0.4;
        const spacing = this.canvas.height * 0.1;

        // Game Over text
        this.ctx.shadowColor = '#ff4444';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#ff6666';
        this.ctx.font = `bold ${Math.min(this.canvas.height * 0.08, 60)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width * 0.5, centerY);

        // Score
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#ffdd44';
        this.ctx.font = `bold ${Math.min(this.canvas.height * 0.06, 40)}px Arial`;
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width * 0.5, centerY + spacing);

        // High Score
        this.ctx.fillStyle = '#44ff44';
        this.ctx.font = `${Math.min(this.canvas.height * 0.05, 30)}px Arial`;
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width * 0.5, centerY + spacing * 2);

        // GitHub button
        const githubButtonWidth = Math.min(this.canvas.width * 0.3, 200);
        const githubButtonHeight = Math.min(this.canvas.height * 0.06, 40);
        const githubButtonY = centerY + spacing * 4.2;

        // Store GitHub button dimensions for click detection
        this.githubButton = {
            x: this.canvas.width * 0.5 - githubButtonWidth * 0.5,
            y: githubButtonY,
            width: githubButtonWidth,
            height: githubButtonHeight
        };

        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#24292e';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.githubButton.x,
            this.githubButton.y,
            this.githubButton.width,
            this.githubButton.height,
            githubButtonHeight * 0.5
        );
        this.ctx.fill();

        // GitHub text
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${Math.min(this.canvas.height * 0.03, 18)}px Arial`;
        this.ctx.fillText('View on GitHub', this.canvas.width * 0.5, githubButtonY + githubButtonHeight * 0.65);

        // Share button
        const shareButtonWidth = Math.min(this.canvas.width * 0.3, 200);
        const shareButtonHeight = Math.min(this.canvas.height * 0.06, 40);
        const shareButtonY = githubButtonY + githubButtonHeight + 20;

        // Store Share button dimensions for click detection
        this.shareButton = {
            x: this.canvas.width * 0.5 - shareButtonWidth * 0.5,
            y: shareButtonY,
            width: shareButtonWidth,
            height: shareButtonHeight
        };

        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#1DA1F2';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.shareButton.x,
            this.shareButton.y,
            this.shareButton.width,
            this.shareButton.height,
            shareButtonHeight * 0.5
        );
        this.ctx.fill();

        // Share text
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${Math.min(this.canvas.height * 0.03, 18)}px Arial`;
        this.ctx.fillText('Share Score', this.canvas.width * 0.5, shareButtonY + shareButtonHeight * 0.65);

        // Play Again button
        const buttonWidth = Math.min(this.canvas.width * 0.4, 300);
        const buttonHeight = Math.min(this.canvas.height * 0.08, 60);
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * 2) * 0.1 + 1;

        // Store button dimensions for click detection
        this.playAgainButton = {
            x: this.canvas.width * 0.5 - (buttonWidth * pulse) * 0.5,
            y: centerY + spacing * 3,
            width: buttonWidth * pulse,
            height: buttonHeight
        };

        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.playAgainButton.x,
            this.playAgainButton.y,
            this.playAgainButton.width,
            this.playAgainButton.height,
            buttonHeight * 0.5
        );
        this.ctx.fill();

        // Play Again text
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${Math.min(this.canvas.height * 0.04, 24)}px Arial`;
        this.ctx.fillText('Play Again', this.canvas.width * 0.5, centerY + spacing * 3 + buttonHeight * 0.6);

        this.ctx.restore();

        // Add click event listener if not already added
        if (!this.gameOverClickListener) {
            this.gameOverClickListener = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (this.playAgainButton && 
                    x >= this.playAgainButton.x && 
                    x <= this.playAgainButton.x + this.playAgainButton.width &&
                    y >= this.playAgainButton.y && 
                    y <= this.playAgainButton.y + this.playAgainButton.height) {
                    this.startGame();
                    this.canvas.removeEventListener('click', this.gameOverClickListener);
                    this.gameOverClickListener = null;
                } else if (this.githubButton &&
                    x >= this.githubButton.x &&
                    x <= this.githubButton.x + this.githubButton.width &&
                    y >= this.githubButton.y &&
                    y <= this.githubButton.y + this.githubButton.height) {
                    window.open('https://github.com/VedantChhajed/Flappy-bird', '_blank');
                } else if (this.shareButton &&
                    x >= this.shareButton.x &&
                    x <= this.shareButton.x + this.shareButton.width &&
                    y >= this.shareButton.y &&
                    y <= this.shareButton.y + this.shareButton.height) {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?score=${this.score}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        // Show a temporary message that the link was copied
                        const originalText = 'Share Score';
                        this.ctx.clearRect(this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height);
                        
                        // Redraw button with confirmation message
                        this.ctx.fillStyle = '#28a745';
                        this.ctx.beginPath();
                        this.ctx.roundRect(
                            this.shareButton.x,
                            this.shareButton.y,
                            this.shareButton.width,
                            this.shareButton.height,
                            shareButtonHeight * 0.5
                        );
                        this.ctx.fill();
                        
                        this.ctx.fillStyle = 'white';
                        this.ctx.fillText('Link Copied!', this.canvas.width * 0.5, shareButtonY + shareButtonHeight * 0.65);
                        
                        // Reset button after 2 seconds
                        setTimeout(() => {
                            if (this.gameOver) {
                                this.ctx.clearRect(this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height);
                                
                                this.ctx.fillStyle = '#1DA1F2';
                                this.ctx.beginPath();
                                this.ctx.roundRect(
                                    this.shareButton.x,
                                    this.shareButton.y,
                                    this.shareButton.width,
                                    this.shareButton.height,
                                    shareButtonHeight * 0.5
                                );
                                this.ctx.fill();
                                
                                this.ctx.fillStyle = 'white';
                                this.ctx.fillText(originalText, this.canvas.width * 0.5, shareButtonY + shareButtonHeight * 0.65);
                            }
                        }, 2000);
                    });
                }
            };
            this.canvas.addEventListener('click', this.gameOverClickListener);
        }
    }

    updateBackgrounds() {
        this.backgrounds.forEach(bg => {
            bg.x = (bg.x - bg.speed) % this.canvas.width; // Smooth scrolling
        });
    }

    drawBackgrounds() {
        this.backgrounds.forEach(bg => {
            this.ctx.drawImage(bg.img, bg.x, 0);
            this.ctx.drawImage(bg.img, bg.x + this.canvas.width, 0);
        });
    }

    animate() {
        // Clear any existing animation frame first
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        if (this.gameOver) {
            this.drawGameOver();
            return;
        } else {
            // Hide start screen during gameplay
            this.startScreen.style.display = 'none';
        }

        this.updateBird();
        this.updatePipes();
        this.updateBackgrounds();
        this.particles.update();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawBackgrounds();
        this.drawPipes();
        this.drawBird();
        this.particles.draw(this.ctx);
        this.drawScore();

        // Request next frame
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}

// Initialize game instance when the page loads
window.addEventListener('load', () => {
    new Game();
});
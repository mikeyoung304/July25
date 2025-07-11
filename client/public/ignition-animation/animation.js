/**
 * Macon AI Ignition Sequence Animation Controller
 * Premium loading animation with particle effects and accessibility features
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        particleCount: 12,
        particleColors: ['#F3A463', '#FFD4A3', '#E89348'],
        animationDuration: 3000,
        skipAnimationDelay: 100
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Elements
    const elements = {
        logo: document.getElementById('macon-ai-logo'),
        skipButton: document.getElementById('skip-animation'),
        loadingStatus: document.getElementById('loading-status'),
        nodes: {
            left: document.getElementById('node-left'),
            right: document.getElementById('node-right'),
            center: document.getElementById('node-center')
        },
        particles: {
            left: document.getElementById('particles-left'),
            right: document.getElementById('particles-right'),
            center: document.getElementById('particles-center')
        }
    };

    /**
     * Create particle explosion effect for node ignition
     */
    function createParticles(container, nodeId) {
        if (prefersReducedMotion) return;

        const particles = [];
        
        for (let i = 0; i < CONFIG.particleCount; i++) {
            const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const angle = (i / CONFIG.particleCount) * Math.PI * 2;
            const velocity = 30 + Math.random() * 40;
            const size = 1 + Math.random() * 3;
            const color = CONFIG.particleColors[Math.floor(Math.random() * CONFIG.particleColors.length)];
            
            // Set particle attributes
            particle.setAttribute('r', size);
            particle.setAttribute('fill', color);
            particle.setAttribute('opacity', '0');
            
            // Calculate end position
            const x = Math.cos(angle) * velocity;
            const y = Math.sin(angle) * velocity;
            
            // Set CSS variables for animation
            particle.style.setProperty('--x', `${x}px`);
            particle.style.setProperty('--y', `${y}px`);
            
            particles.push(particle);
            container.appendChild(particle);
        }

        return particles;
    }

    /**
     * Trigger particle explosion animation
     */
    function explodeParticles(nodeId) {
        const container = elements.particles[nodeId];
        if (!container) return;

        const particles = createParticles(container, nodeId);
        
        // Animate particles
        particles.forEach((particle, index) => {
            setTimeout(() => {
                particle.style.opacity = '1';
                particle.style.animation = 'particle-explosion 0.6s ease-out forwards';
            }, index * 20);
        });

        // Clean up particles after animation
        setTimeout(() => {
            particles.forEach(particle => particle.remove());
        }, 1000);
    }

    /**
     * Initialize node ignition sequences with particles
     */
    function initializeNodeAnimations() {
        // Node ignition timings (matching CSS delays)
        const nodeTimings = {
            left: 640,   // 0.8s * 0.8
            right: 840,  // 0.8s * 0.8 + 0.2s
            center: 1040 // 0.8s * 0.8 + 0.4s
        };

        Object.entries(nodeTimings).forEach(([nodeId, delay]) => {
            setTimeout(() => {
                explodeParticles(nodeId);
                updateLoadingStatus(`Igniting ${nodeId} node...`);
            }, delay);
        });
    }

    /**
     * Update loading status for screen readers
     */
    function updateLoadingStatus(message) {
        if (elements.loadingStatus) {
            elements.loadingStatus.textContent = message;
        }
    }

    /**
     * Skip animation and show final state
     */
    function skipAnimation() {
        // Remove all animations
        const animatedElements = elements.logo.querySelectorAll('*');
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.filter = 'none';
        });

        // Apply final states
        elements.logo.style.animation = 'logo-breathe 6s ease-in-out infinite';
        updateLoadingStatus('Macon AI loaded');
        
        // Hide skip button
        if (elements.skipButton) {
            elements.skipButton.style.display = 'none';
        }

        // Trigger completion callback
        onAnimationComplete();
    }

    /**
     * Handle animation completion
     */
    function onAnimationComplete() {
        // Add completion class for CSS hooks
        document.body.classList.add('animation-complete');
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('maconLogoAnimationComplete', {
            detail: { duration: CONFIG.animationDuration }
        }));

        // Update status
        updateLoadingStatus('Macon AI ready');
    }

    /**
     * Initialize enhanced interactivity
     */
    function initializeInteractivity() {
        // Petal hover sound effect (optional)
        const petals = elements.logo.querySelectorAll('.petal');
        petals.forEach(petal => {
            petal.addEventListener('mouseenter', () => {
                petal.style.transform = 'scale(1.1) rotate(5deg)';
            });
            
            petal.addEventListener('mouseleave', () => {
                petal.style.transform = '';
            });
        });

        // Node click effect
        Object.values(elements.nodes).forEach(node => {
            node.addEventListener('click', (e) => {
                // Create ripple effect on click
                const ripple = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                ripple.setAttribute('fill', 'none');
                ripple.setAttribute('stroke', node.getAttribute('fill'));
                ripple.setAttribute('stroke-width', '2');
                ripple.setAttribute('cx', node.getAttribute('cx'));
                ripple.setAttribute('cy', node.getAttribute('cy'));
                ripple.setAttribute('r', '0');
                ripple.style.opacity = '0.6';
                
                node.parentNode.appendChild(ripple);
                
                // Animate ripple
                ripple.animate([
                    { r: '0', opacity: '0.6', strokeWidth: '2' },
                    { r: '40', opacity: '0', strokeWidth: '0.5' }
                ], {
                    duration: 600,
                    easing: 'ease-out'
                }).onfinish = () => ripple.remove();
            });
        });
    }

    /**
     * Monitor performance and adjust quality
     */
    function monitorPerformance() {
        if (!window.performance || !performance.now) return;

        let frameCount = 0;
        let lastTime = performance.now();
        
        function checkFrameRate() {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            frameCount++;

            if (delta >= 1000) {
                const fps = (frameCount * 1000) / delta;
                
                // Reduce quality if FPS drops below 30
                if (fps < 30 && !prefersReducedMotion) {
                    document.body.classList.add('reduce-animation-quality');
                    console.log('Reducing animation quality for performance');
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }

            if (!document.body.classList.contains('animation-complete')) {
                requestAnimationFrame(checkFrameRate);
            }
        }

        requestAnimationFrame(checkFrameRate);
    }

    /**
     * Initialize the animation sequence
     */
    function initialize() {
        // Update initial status
        updateLoadingStatus('Starting Macon AI ignition sequence...');

        // Skip button handler
        if (elements.skipButton) {
            elements.skipButton.addEventListener('click', skipAnimation);
            
            // Keyboard accessibility
            elements.skipButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    skipAnimation();
                }
            });
        }

        // Initialize node animations if not reduced motion
        if (!prefersReducedMotion) {
            initializeNodeAnimations();
            monitorPerformance();
        }

        // Set up completion timer
        setTimeout(() => {
            onAnimationComplete();
            initializeInteractivity();
        }, CONFIG.animationDuration);

        // Handle visibility change (pause animations when tab is not visible)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                elements.logo.style.animationPlayState = 'paused';
            } else {
                elements.logo.style.animationPlayState = 'running';
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Export for external use
    window.MaconAnimation = {
        skip: skipAnimation,
        restart: () => {
            location.reload();
        }
    };
})();
/**
 * London Pages - Animations and Micro-interactions
 * Handles animations, transitions, and interactive elements
 */

// Smooth scrolling for anchor links
const smoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
};

// Parallax effect for background elements
const parallaxEffect = () => {
  const parallaxElements = document.querySelectorAll('.parallax');
  
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    parallaxElements.forEach(element => {
      const speed = element.dataset.speed || 0.5;
      element.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });
};

// Text scramble effect
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.update = this.update.bind(this);
  }
  
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise(resolve => this.resolve = resolve);
    this.queue = [];
    
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  
  update() {
    let output = '';
    let complete = 0;
    
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="scramble-char">${char}</span>`;
      } else {
        output += from;
      }
    }
    
    this.el.innerHTML = output;
    
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
  
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// Initialize text scramble effect
const initTextScramble = () => {
  const elements = document.querySelectorAll('.scramble-text');
  
  elements.forEach(el => {
    const originalText = el.textContent;
    const fx = new TextScramble(el);
    
    // Initial scramble
    fx.setText(originalText);
    
    // Scramble on hover
    el.addEventListener('mouseenter', () => {
      fx.setText(originalText);
    });
  });
};

// Magnetic effect for buttons
const magneticButtons = () => {
  const buttons = document.querySelectorAll('.magnetic-btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
      const position = btn.getBoundingClientRect();
      const x = e.clientX - position.left - position.width / 2;
      const y = e.clientY - position.top - position.height / 2;
      
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.5}px)`;
    });
    
    btn.addEventListener('mouseout', function() {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
};

// Tilt effect for cards
const tiltCards = () => {
  const cards = document.querySelectorAll('.tilt-card');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', function(e) {
      const position = card.getBoundingClientRect();
      const x = e.clientX - position.left;
      const y = e.clientY - position.top;
      
      const centerX = position.width / 2;
      const centerY = position.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseout', function() {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  });
};

// Animated counter
const animateCounters = () => {
  const counters = document.querySelectorAll('.counter');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = parseInt(counter.getAttribute('data-duration') || 2000);
        const increment = target / (duration / 16); // 60fps
        
        let current = 0;
        
        const updateCounter = () => {
          current += increment;
          counter.textContent = Math.floor(current);
          
          if (current < target) {
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = target;
          }
        };
        
        updateCounter();
        observer.unobserve(counter);
      }
    });
  }, {
    threshold: 0.5
  });
  
  counters.forEach(counter => {
    observer.observe(counter);
  });
};

// Reveal animations on scroll
const revealOnScroll = () => {
  const revealElements = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealElements.forEach(el => {
    observer.observe(el);
  });
};

// Staggered animations for list items
const staggeredAnimations = () => {
  const staggerContainers = document.querySelectorAll('.stagger-container');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = entry.target;
        const items = container.querySelectorAll('.stagger-item');
        
        items.forEach((item, index) => {
          item.style.transitionDelay = `${index * 0.1}s`;
          item.classList.add('stagger-visible');
        });
        
        observer.unobserve(container);
      }
    });
  }, {
    threshold: 0.2
  });
  
  staggerContainers.forEach(container => {
    observer.observe(container);
  });
};

// Gradient text animation
const gradientTextAnimation = () => {
  const gradientTexts = document.querySelectorAll('.gradient-text-animated');
  
  gradientTexts.forEach(text => {
    text.style.backgroundSize = '200% 200%';
    text.style.animation = 'gradientShift 5s ease infinite';
  });
};

// Initialize all animations
document.addEventListener('DOMContentLoaded', () => {
  smoothScroll();
  parallaxEffect();
  initTextScramble();
  magneticButtons();
  tiltCards();
  animateCounters();
  revealOnScroll();
  staggeredAnimations();
  gradientTextAnimation();
  
  // Add animation classes to elements
  document.querySelectorAll('.fade-in').forEach(el => {
    el.classList.add('animate-on-scroll');
  });
  
  document.querySelectorAll('.slide-up').forEach(el => {
    el.classList.add('animate-on-scroll');
  });
  
  document.querySelectorAll('.slide-left').forEach(el => {
    el.classList.add('animate-on-scroll');
  });
  
  document.querySelectorAll('.slide-right').forEach(el => {
    el.classList.add('animate-on-scroll');
  });
  
  // Initialize scroll animations
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });
  
  animatedElements.forEach(el => {
    observer.observe(el);
  });
});

/**
 * London Pages - 3D Models and Animations
 * Handles loading and animating 3D models using Three.js
 */

// Import Three.js from CDN in the HTML file

class ModelViewer {
  constructor(containerId, modelPath, options = {}) {
    this.container = document.getElementById(containerId);
    this.modelPath = modelPath;
    this.options = {
      autoRotate: true,
      backgroundColor: 0x000000,
      ambientLightColor: 0xffffff,
      ambientLightIntensity: 0.5,
      directionalLightColor: 0xffffff,
      directionalLightIntensity: 0.8,
      cameraPosition: { x: 0, y: 0, z: 5 },
      ...options
    };
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.mixer = null;
    this.clock = new THREE.Clock();
    
    this.init();
  }
  
  init() {
    if (!this.container) {
      console.error(`Container with ID "${this.containerId}" not found.`);
      return;
    }
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor);
    
    // Create camera
    const { width, height } = this.container.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(
      this.options.ambientLightColor,
      this.options.ambientLightIntensity
    );
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(
      this.options.directionalLightColor,
      this.options.directionalLightIntensity
    );
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Load model
    this.loadModel();
    
    // Add controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = this.options.autoRotate;
    this.controls.autoRotateSpeed = 1;
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Start animation loop
    this.animate();
  }
  
  loadModel() {
    const loader = new THREE.GLTFLoader();
    
    loader.load(
      this.modelPath,
      (gltf) => {
        this.model = gltf.scene;
        
        // Center model
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        this.model.position.x = -center.x;
        this.model.position.y = -center.y;
        this.model.position.z = -center.z;
        
        // Scale model to fit container
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        this.model.scale.set(scale, scale, scale);
        
        // Add model to scene
        this.scene.add(this.model);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length) {
          this.mixer = new THREE.AnimationMixer(this.model);
          gltf.animations.forEach(clip => {
            this.mixer.clipAction(clip).play();
          });
        }
      },
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  }
  
  onWindowResize() {
    const { width, height } = this.container.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // Update controls
    this.controls.update();
    
    // Update animations
    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta);
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize models when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded. Make sure to include it in your HTML.');
    return;
  }
  
  // Initialize models
  const models = [
    {
      containerId: 'globe-model',
      modelPath: '/3D Models/Globe.glb',
      options: {
        backgroundColor: 0x000000,
        autoRotate: true
      }
    },
    {
      containerId: 'dragon-model',
      modelPath: '/3D Models/London-Pages-Dragon.glb',
      options: {
        backgroundColor: 0x000000,
        autoRotate: true
      }
    },
    {
      containerId: 'robot-model',
      modelPath: '/3D Models/Robot head.glb',
      options: {
        backgroundColor: 0x000000,
        autoRotate: true
      }
    },
    {
      containerId: 'camera-model',
      modelPath: '/3D Models/Video camera.glb',
      options: {
        backgroundColor: 0x000000,
        autoRotate: true
      }
    }
  ];
  
  // Initialize each model
  models.forEach(model => {
    const container = document.getElementById(model.containerId);
    if (container) {
      new ModelViewer(model.containerId, model.modelPath, model.options);
    }
  });
});

// Custom cursor implementation
document.addEventListener('DOMContentLoaded', () => {
  const cursor = document.createElement('div');
  cursor.classList.add('cursor');
  document.body.appendChild(cursor);
  
  const cursorFollower = document.createElement('div');
  cursorFollower.classList.add('cursor-follower');
  document.body.appendChild(cursorFollower);
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    
    // Add a slight delay to the follower for a nice effect
    setTimeout(() => {
      cursorFollower.style.left = `${e.clientX}px`;
      cursorFollower.style.top = `${e.clientY}px`;
    }, 50);
  });
  
  // Change cursor size on clickable elements
  const clickables = document.querySelectorAll('a, button, .btn, input[type="submit"]');
  clickables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '30px';
      cursor.style.height = '30px';
      cursor.style.backgroundColor = 'var(--primary-300)';
      
      cursorFollower.style.width = '60px';
      cursorFollower.style.height = '60px';
    });
    
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      cursor.style.backgroundColor = 'var(--primary-200)';
      
      cursorFollower.style.width = '40px';
      cursorFollower.style.height = '40px';
    });
  });
});

// Dark/Light mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.createElement('div');
  themeToggle.classList.add('theme-toggle');
  themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  document.body.appendChild(themeToggle);
  
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Toggle theme on click
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem('theme', 'light');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });
});

// Spiral cards animation
document.addEventListener('DOMContentLoaded', () => {
  const spiralContainer = document.querySelector('.spiral-container');
  if (!spiralContainer) return;
  
  const cards = spiralContainer.querySelectorAll('.spiral-card');
  const centerX = spiralContainer.offsetWidth / 2;
  const centerY = spiralContainer.offsetHeight / 2;
  
  // Position cards in a spiral
  cards.forEach((card, index) => {
    const angle = index * 0.5; // Angle in radians
    const radius = 50 + index * 20; // Increasing radius
    
    const x = centerX + radius * Math.cos(angle) - card.offsetWidth / 2;
    const y = centerY + radius * Math.sin(angle) - card.offsetHeight / 2;
    
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.transform = `rotate(${angle * 10}deg)`;
    card.style.zIndex = cards.length - index;
  });
});

// Intersection Observer for animations
document.addEventListener('DOMContentLoaded', () => {
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

// Micro-interactions for buttons and links
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btn, button');
  
  buttons.forEach(button => {
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
  });
});

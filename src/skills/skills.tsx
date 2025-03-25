import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './skills.scss';

// Create a custom shader material using Three.js directly
// Updated createChromaticAberrationMaterial function
function createChromaticAberrationMaterial(
  texture: THREE.Texture
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      map: { value: texture },
      aberrationStrength: { value: 0.0 },
      aberrationDirection: { value: new THREE.Vector2(0, 0) },
      uOffset: { value: new THREE.Vector2(0.0, 0.0) },
    },
    vertexShader: `
      uniform vec2 uOffset;
      varying vec2 vUv;

      #define M_PI 3.1415926535897932384626433832795

      vec3 deformationCurve(vec3 position, vec2 uv, vec2 offset) {
        position.x = position.x + (sin(uv.y * M_PI) * offset.x);
        position.y = position.y + (sin(uv.x * M_PI) * offset.y);
        return position;
      }

      void main() {
        vUv = uv;
        vec3 newPosition = deformationCurve(position, uv, uOffset);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float aberrationStrength;
      uniform vec2 aberrationDirection;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;

        // Only apply aberration if strength is not zero
        vec4 r, g, b;

        if (aberrationStrength > 0.0) {
          // Apply aberration in the direction of scroll
          vec2 rOffset = aberrationDirection * aberrationStrength;
          vec2 bOffset = -aberrationDirection * aberrationStrength;

          r = texture2D(map, uv + rOffset);
          g = texture2D(map, uv);
          b = texture2D(map, uv + bOffset);
        } else {
          // Use original texture with no aberration
          g = texture2D(map, uv);
          r = g;
          b = g;
        }

        // Use the alpha from the original texture
        float alpha = g.a;

        gl_FragColor = vec4(r.r, g.g, b.b, alpha);
      }
    `,
  });
}
interface ImageSize {
  width: number;
  height: number;
}

interface ImageWithEffectProps {
  src: string;
  position: [number, number, number];
  size: ImageSize;
  maxAberration?: number;
}

interface ImageData {
  src: string;
  position: [number, number, number];
  size: ImageSize;
}

function ImageWithEffect({
  src,
  position,
  size,
  maxAberration = 2,
}: ImageWithEffectProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const texture = useLoader(THREE.TextureLoader, src);
  const meshRef = useRef<THREE.Mesh>(null);

  // Animation state
  const isScrolling = useRef<boolean>(false);
  const targetAberrationStrength = useRef<number>(0);
  const currentAberrationStrength = useRef<number>(0);
  const targetDirection = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const currentDirection = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const lastScrollY = useRef<number>(window.scrollY);
  const scrollTimer = useRef<number | null>(null);
  const forceReset = useRef<boolean>(false);

  // Create material on first render
  useEffect(() => {
    if (texture) {
      // Ensure proper texture settings for transparency
      texture.premultiplyAlpha = false;
      texture.format = THREE.RGBAFormat;
      texture.needsUpdate = true;

      materialRef.current = createChromaticAberrationMaterial(texture);
    }
  }, [texture]);

  useEffect(() => {
    const handleScroll = () => {
      // Request animation frame to prevent event flooding during inertial scrolling
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;
        lastScrollY.current = currentScrollY;

        // Use a lower threshold for mobile - mobile can have smaller deltas
        if (Math.abs(delta) < 0.1) return;

        // Calculate normalized direction - use the actual delta value rather than just sign
        // This gives smoother transitions when direction changes
        const normalizedDelta = Math.min(
          1.0,
          Math.abs(delta) / (isMobile() ? 15 : 30)
        );
        targetDirection.current.set(0, normalizedDelta * Math.sign(delta));

        // Calculate speed factor with smoother scaling - prevent sudden jumps
        const speedFactor = Math.min(
          1.0,
          Math.abs(delta) / (isMobile() ? 12 : 25)
        );
        targetAberrationStrength.current = speedFactor * maxAberration;

        // Set scrolling state
        isScrolling.current = true;

        // Important: Don't force reset while actively scrolling
        forceReset.current = false;

        // Clear any existing timeout
        if (scrollTimer.current !== null) {
          window.clearTimeout(scrollTimer.current);
        }

        // More consistent timeout between mobile and desktop
        scrollTimer.current = window.setTimeout(
          () => {
            isScrolling.current = false;
            targetAberrationStrength.current = 0;

            // Don't use a second timeout - simplify the reset logic
            // A slow decay is better than a sudden jump
            // The useFrame function will handle the transition smoothly
          },
          isMobile() ? 250 : 200
        );
      });
    };

    // Use passive touch events which are better for mobile
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Add touch events to handle mobile scroll more precisely
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (scrollTimer.current !== null) {
        window.clearTimeout(scrollTimer.current);
      }
    };
  }, [maxAberration]);

  // Animation loop with smooth transitions in both directions
  // Modified useFrame function to fix mobile snapping issue
  useFrame((_, delta) => {
    if (!materialRef.current) return;

    // Adaptive damping based on device type
    const isMobileDevice = isMobile();

    // Use consistent damping values - this prevents the sudden changes in interpolation speed
    const strengthDamping = isMobileDevice ? 0.12 : 0.15;

    // Force reset check - but make it smoother
    if (forceReset.current) {
      // Instead of instantly setting to zero, use a stronger damping
      const resetDamping = isMobileDevice ? 0.4 : 0.25;
      currentAberrationStrength.current = THREE.MathUtils.lerp(
        currentAberrationStrength.current,
        0,
        resetDamping
      );
      currentDirection.current.lerp(new THREE.Vector2(0, 0), resetDamping);

      // Only truly reset once we're very close to zero
      if (currentAberrationStrength.current < 0.0005) {
        currentAberrationStrength.current = 0;
        currentDirection.current.set(0, 0);
        forceReset.current = false;
      }
    } else {
      // Use consistent time-scaled damping for all cases
      const scaledDamping = 1.0 - Math.pow(1.0 - strengthDamping, delta * 60);

      // Smoothly interpolate aberration strength
      currentAberrationStrength.current = THREE.MathUtils.lerp(
        currentAberrationStrength.current,
        targetAberrationStrength.current,
        scaledDamping
      );

      // Only round to zero when very close
      if (currentAberrationStrength.current < 0.0005) {
        currentAberrationStrength.current = 0;
      }

      // Use consistent direction damping to prevent the shift
      const directionDamping = isMobileDevice ? 0.12 : 0.15;
      const scaledDirectionDamping =
        1.0 - Math.pow(1.0 - directionDamping, delta * 60);
      currentDirection.current.lerp(
        targetDirection.current,
        scaledDirectionDamping
      );
    }

    // Update shader uniforms
    materialRef.current.uniforms.aberrationStrength.value =
      currentAberrationStrength.current;
    materialRef.current.uniforms.aberrationDirection.value =
      currentDirection.current;

    // Calculate offset with a more stable approach
    const offset =
      currentAberrationStrength.current * 0.5 * currentDirection.current.y; // Use the full value instead of just the sign

    materialRef.current.uniforms.uOffset.value.set(0, offset);
  });

  // 3. Add a device detection function
  function isMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  }

  return materialRef.current ? (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[size.width, size.height, 6, 1]} />
      <primitive object={materialRef.current} attach="material" />
    </mesh>
  ) : null;
}

// Updated ShaderEffectOverlay component with better resize handling
function ShaderEffectOverlay() {
  const [imageData, setImageData] = useState<ImageData[]>([]);
  const { viewport } = useThree();

  // Use a ref to track if initial setup has been done
  const setupComplete = useRef<boolean>(false);

  // Re-measure image positions when window is resized
  useEffect(() => {
    // Debounce resize function to avoid too many calculations
    const handleResize = _.debounce(() => {
      setupImages();
    }, 200);

    // Initial setup
    setupImages();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to collect image data from DOM with improved size calculations
  const setupImages = () => {
    const images = document.querySelectorAll('img[data-shader]');
    const newImageData: ImageData[] = [];

    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;

      // Calculate size based on the current bounding rect instead of the original img dimensions
      const worldWidth = (rect.width / window.innerWidth) * viewportWidth;
      const worldHeight = (rect.height / window.innerHeight) * viewportHeight;

      // Calculate center position (Three.js uses center coordinates)
      const worldX =
        ((rect.left + rect.width / 2) / window.innerWidth) * viewportWidth -
        viewportWidth / 2;
      const worldY =
        -(
          ((rect.top + rect.height / 2) / window.innerHeight) *
          viewportHeight
        ) +
        viewportHeight / 2;

      newImageData.push({
        src: (img as HTMLImageElement).src,
        position: [worldX, worldY, 0],
        size: {
          width: worldWidth,
          height: worldHeight,
        },
      });

      // Hide original image
      (img as HTMLImageElement).style.opacity = '0';
    });

    setImageData(newImageData);
    setupComplete.current = true;
  };

  // Updates positions AND sizes when scrolling or when sizes change
  useFrame(() => {
    if (setupComplete.current) {
      const images = document.querySelectorAll('img[data-shader]');
      const updatedImageData = [...imageData];
      let needsUpdate = false;

      images.forEach((img, index) => {
        if (index >= updatedImageData.length) return;

        const rect = img.getBoundingClientRect();
        const viewportWidth = viewport.width;
        const viewportHeight = viewport.height;

        // Update position coordinates
        const worldX =
          ((rect.left + rect.width / 2) / window.innerWidth) * viewportWidth -
          viewportWidth / 2;
        const worldY =
          -(
            ((rect.top + rect.height / 2) / window.innerHeight) *
            viewportHeight
          ) +
          viewportHeight / 2;

        // Update size coordinates - crucial for responsive resizing
        const worldWidth = (rect.width / window.innerWidth) * viewportWidth;
        const worldHeight = (rect.height / window.innerHeight) * viewportHeight;

        // Check if position OR size has changed significantly
        if (
          Math.abs(updatedImageData[index].position[0] - worldX) > 0.01 ||
          Math.abs(updatedImageData[index].position[1] - worldY) > 0.01 ||
          Math.abs(updatedImageData[index].size.width - worldWidth) > 0.01 ||
          Math.abs(updatedImageData[index].size.height - worldHeight) > 0.01
        ) {
          updatedImageData[index] = {
            ...updatedImageData[index],
            position: [worldX, worldY, 0],
            size: {
              width: worldWidth,
              height: worldHeight,
            },
          };
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setImageData(updatedImageData);
      }
    }
  });

  return (
    <>
      {imageData.map((data, index) => (
        <ImageWithEffect
          key={index}
          src={data.src}
          position={data.position}
          size={data.size}
        />
      ))}
    </>
  );
}

// Main component that creates the Canvas and finds images with data-shader
export const ShaderImageEffect = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <Canvas gl={{ alpha: true, premultipliedAlpha: false, antialias: true }}>
        <scene background={null} />
        <ShaderEffectOverlay />
      </Canvas>
    </div>
  );
};

// Example Skills component with the new approach
export const Skills = () => {
  const images = [''];
  return (
    <>
      <span className="clip">
        <p className="skills-intro">
          I have 8 years of experience building interactive web apps, building
          anything from SaaS products, component libraries, marketing campaigns
          and anything else in-between!
        </p>
      </span>

      {/* ShaderImageEffect creates an overlay canvas that applies effects to all images with data-shader */}
      <ShaderImageEffect />
      <div className="images">
        <div className="img-container">
          <img alt="javscript" src="js.png" data-shader />
        </div>
        <div className="img-container">
          <img alt="typescript" src="ts.png" data-shader />
        </div>

        <div className="img-container">
          <img
            alt="react"
            src="react.png"
            data-shader
            style={{ paddingTop: '89.06%', marginTop: 0 }}
          />
        </div>

        <div className="img-container">
          <img alt="react native" src="react-native.svg" data-shader />
        </div>

        <div className="img-container">
          <img alt="angular" src="angular.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="three JS" src="three.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="GSAP" src="gsap.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="Sass" src="scss.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="CSS" src="css.svg.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="Git" src="git.svg.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="Google Cloud" src="google-cloud.svg" data-shader />
        </div>

        <div className="img-container">
          <img alt="Graph QL" src="graphql.png" data-shader />
        </div>
        <div className="img-container">
          <img alt="Jasmine" src=" jasmine.svg.png" data-shader />
        </div>

        <div className="img-container">
          <img className="figma" alt="Jasmine" src="figma.png" data-shader />
        </div>

        <div className="img-container">
          <img alt="Jasmine" src="rxjs.png" data-shader />
        </div>
      </div>
    </>
  );
};

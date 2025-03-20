import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
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

  // Set up scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      // Skip tiny movements to avoid jitter
      if (Math.abs(delta) < 0.5) return;

      // Calculate normalized direction
      const direction = Math.sign(delta);
      targetDirection.current.set(0, direction);

      // Calculate scroll speed - simpler calculation
      const speedFactor = Math.min(1.0, Math.abs(delta) / 20);
      targetAberrationStrength.current = speedFactor * maxAberration;

      // Set scrolling state
      isScrolling.current = true;
      forceReset.current = false;

      // Clear any existing timeout
      if (scrollTimer.current !== null) {
        window.clearTimeout(scrollTimer.current);
      }

      // Set new timeout to reset scrolling state
      scrollTimer.current = window.setTimeout(() => {
        isScrolling.current = false;
        // Don't immediately reset values, just set the target to 0
        targetAberrationStrength.current = 0;

        // Set another timeout to force reset if animation gets stuck
        window.setTimeout(() => {
          // Only force reset if current strength is very small but not 0
          if (
            currentAberrationStrength.current > 0 &&
            currentAberrationStrength.current < 0.05
          ) {
            forceReset.current = true;
          }
        }, 1000); // Check after 1 second
      }, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current !== null) {
        window.clearTimeout(scrollTimer.current);
      }
    };
  }, [maxAberration]);

  // Animation loop with smooth transitions in both directions
  useFrame((_, delta) => {
    if (!materialRef.current) return;

    // Determine appropriate damping factor
    // Use stronger damping when returning to rest state for faster decay
    const strengthDamping = isScrolling.current ? 0.15 : 0.08;

    // Force reset check
    if (forceReset.current) {
      currentAberrationStrength.current = 0;
      currentDirection.current.set(0, 0);
      forceReset.current = false;
    } else {
      // Smoothly interpolate aberration strength
      currentAberrationStrength.current = THREE.MathUtils.lerp(
        currentAberrationStrength.current,
        targetAberrationStrength.current,
        strengthDamping
      );

      // Round to zero if very close to avoid floating point issues
      if (currentAberrationStrength.current < 0.001) {
        currentAberrationStrength.current = 0;
      }

      // Smoothly interpolate direction vector
      const directionDamping = 0.2;
      currentDirection.current.lerp(targetDirection.current, directionDamping);
    }

    // Update shader uniforms
    materialRef.current.uniforms.aberrationStrength.value =
      currentAberrationStrength.current;
    materialRef.current.uniforms.aberrationDirection.value =
      currentDirection.current;

    // Calculate offset based on current values
    const offset =
      currentAberrationStrength.current *
      0.5 *
      (currentDirection.current.y === 0
        ? 0
        : Math.sign(currentDirection.current.y));

    materialRef.current.uniforms.uOffset.value.set(0, offset);
  });

  return materialRef.current ? (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[size.width, size.height, 8, 8]} />
      <primitive object={materialRef.current} attach="material" />
    </mesh>
  ) : null;
}

// Component to handle the image mapping and canvas setup
function ShaderEffectOverlay() {
  const [imageData, setImageData] = useState<ImageData[]>([]);
  const { viewport } = useThree();

  // Use a ref to track if initial setup has been done
  const setupComplete = useRef<boolean>(false);

  // Re-measure image positions when window is resized
  useEffect(() => {
    const handleResize = () => {
      setupImages();
    };

    // Initial setup
    setupImages();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to collect image data from DOM
  const setupImages = () => {
    const images = document.querySelectorAll('img[data-shader]');
    const newImageData: ImageData[] = [];

    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;

      // Calculate normalized coordinates and size
      // Convert from pixel coordinates to Three.js world coordinates
      // @ts-ignore
      const worldWidth = (img.width / window.innerWidth) * viewportWidth;
      // @ts-ignore
      const worldHeight = (img.height / window.innerHeight) * viewportHeight;

      // Calculate center position (Three.js uses center coordinates)
      // Also needs to convert from DOM coordinates (top-left origin) to Three.js coordinates (center origin)
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
        // @ts-ignore
        src: img.src,
        position: [worldX, worldY, 0],
        size: {
          width: worldWidth,
          height: worldHeight,
        },
      });

      // Hide original image
      // @ts-ignore
      img.style.opacity = '0';
    });

    setImageData(newImageData);
    setupComplete.current = true;
  };

  // Updates positions when scrolling
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

        const worldX =
          ((rect.left + rect.width / 2) / window.innerWidth) * viewportWidth -
          viewportWidth / 2;
        const worldY =
          -(
            ((rect.top + rect.height / 2) / window.innerHeight) *
            viewportHeight
          ) +
          viewportHeight / 2;

        if (
          Math.abs(updatedImageData[index].position[0] - worldX) > 0.01 ||
          Math.abs(updatedImageData[index].position[1] - worldY) > 0.01
        ) {
          updatedImageData[index] = {
            ...updatedImageData[index],
            position: [worldX, worldY, 0],
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
      <p className="intro">
        I have 8 years of experience building interactive web apps, from SaaS
        products to content-managed marketing websites in the US, Australia, and
        New Zealand.
      </p>
      {/* ShaderImageEffect creates an overlay canvas that applies effects to all images with data-shader */}
      <ShaderImageEffect />
      <div className="images">
        <img alt="test" src="js.png" data-shader />
        <img alt="test" src="ts.png" data-shader />
        <img alt="test" src="react.png" data-shader />
        <img alt="test" src="react-native.svg" data-shader />
        <img alt="test" src="angular.png" data-shader />
        <img alt="test" src="three.png" data-shader />
        <img alt="test" src="gsap.png" data-shader />
        <img alt="test" src="scss.png" data-shader />
        <img alt="test" src="css.png" data-shader />
        <img alt="test" src="git.png" data-shader />
        <img alt="test" src="google-cloud.svg" data-shader />
        <img alt="test" src="graphql.png" data-shader />
      </div>
      <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br />{' '}
      <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br />{' '}
      <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br />{' '}
      <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br /> <br />{' '}
      <br />
    </>
  );
};

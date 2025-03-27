import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

// Define types
type MaterialRef = React.MutableRefObject<{
  uniforms: {
    uTime: { value: number };
    abberationStrength: { value: number };
    uResolution: { value: THREE.Vector2 };
  };
} | null>;

type ImageEntry = {
  src: string;
  element: HTMLImageElement;
  id: string;
  visible: boolean;
};

type ChromaticImageProps = {
  imageSrc: string;
  imageRef: HTMLImageElement;
  initialStrength?: number;
  targetStrength: number;
};

// Create the shader material
const createChromaticMaterial = (
  texture: THREE.Texture,
  strength: number
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      abberationStrength: { value: strength },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float abberationStrength;
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // This determines whether there is something to sample within the bounds of the UV coords
      // This prevents artifacting on the edge.
      vec4 sampleColor(vec2 uv){
        vec4 color = texture2D(uTexture, uv);
        if (uv.x < 0.0 || uv.x > 1.0) {
          color = vec4(0.0);
        }
        if (uv.y < 0.0 || uv.y > 1.0) {
          color = vec4(0.0);
        }
        return color;
      }

      mat2 rotation2d(float angle){
        float s = sin(angle);
        float c = cos(angle);

        return mat2(
          c, -s, s, c
        );
      }

      void main() {
        // Use original vUv for sampling but calculate normalized screen coordinates for effects
        vec2 screenUv = vUv;


        // This moves the channels around in a circular motion and stretches/contracts/wave effect
        vec2 abberationStrength_ = abberationStrength * vec2(
          sin(uTime + screenUv.x * 4.0 + screenUv.y * 4.0),
          sin(uTime + screenUv.x * 3.0 + screenUv.y * 3.0)
        );

        vec4 redColorChannel = sampleColor(screenUv + abberationStrength_ * rotation2d(1.0));
        vec4 blueColorChannel = sampleColor(screenUv + abberationStrength_ * rotation2d(2.0));
        vec4 greenColorChannel = sampleColor(screenUv - abberationStrength_ * rotation2d(3.0));
        // vec4 blackColorChannel = sampleColor(screenUv);


        // blackColorChannel.r = 0.0;
        // blackColorChannel.g = 0.0;
        // blackColorChannel.b = 0.0;

        redColorChannel.g = 0.0;
        redColorChannel.b = 0.0;
        redColorChannel.a = redColorChannel.r;
        blueColorChannel.g = 0.0;
        blueColorChannel.r = 0.0;
        blueColorChannel.a = blueColorChannel.b;
        greenColorChannel.r = 0.0;
        greenColorChannel.b = 0.0;
        greenColorChannel.a = greenColorChannel.g;

        vec4 colorChannels = redColorChannel + greenColorChannel + blueColorChannel;
        gl_FragColor = colorChannels;
      }
    `,
  });
};

// Handle material updates
const updateMaterial = (
  materialRef: MaterialRef,
  clock: { getElapsedTime: () => number },
  size: { width: number; height: number },
  strength: number,
  targetStrength: number
): number => {
  const strengthDifference = targetStrength - strength;
  const newStrength = strength + strengthDifference * 0.02;

  if (materialRef.current) {
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.abberationStrength.value = newStrength;
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
  }

  return newStrength;
};

// Track scroll position
const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition({
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return scrollPosition;
};

// Single image component
const ChromaticImage = ({
  imageSrc,
  imageRef,
  initialStrength = 1,
  targetStrength,
}: ChromaticImageProps) => {
  // Load the texture
  const texture = useLoader(THREE.TextureLoader, imageSrc);
  const materialRef = useRef<any>(null) as MaterialRef;
  const [strength, setStrength] = useState<number>(initialStrength);
  const { camera, size } = useThree();
  const scrollPosition = useScrollPosition();

  // Set up correct texture parameters
  useEffect(() => {
    if (texture) {
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Calculate position and size
  const [dimensions, setDimensions] = useState({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  useEffect(() => {
    const updatePosition = () => {
      if (imageRef) {
        const rect = imageRef.getBoundingClientRect();

        // Calculate world position for the mesh
        const x = rect.left + rect.width / 2 - window.innerWidth / 2;
        // Negate y because DOM and WebGL use different coordinate systems
        const y = -(rect.top + rect.height / 2 - window.innerHeight / 2);

        setDimensions({
          x,
          y,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    const resizeObserver = new ResizeObserver(updatePosition);

    if (imageRef) {
      resizeObserver.observe(imageRef);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      if (imageRef) {
        resizeObserver.unobserve(imageRef);
      }
    };
  }, [imageRef]);

  // Update position when scrolling
  useEffect(() => {
    if (imageRef) {
      const rect = imageRef.getBoundingClientRect();

      // Calculate world position for the mesh
      const x = rect.left + rect.width / 2 - window.innerWidth / 2;
      // Negate y because DOM and WebGL use different coordinate systems
      const y = -(rect.top + rect.height / 2 - window.innerHeight / 2);

      setDimensions((prev) => ({
        ...prev,
        x,
        y,
      }));
    }
  }, [scrollPosition, imageRef]);

  // Create the material
  const shaderMaterial = useMemo(
    () => createChromaticMaterial(texture, strength),
    [texture, strength]
  );

  // Update on each frame
  useFrame(({ clock }) => {
    const newStrength = updateMaterial(
      materialRef,
      clock,
      size,
      strength,
      targetStrength
    );
    setStrength(newStrength);
  });

  return (
    <mesh position={[dimensions.x, dimensions.y, 0]}>
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <primitive object={shaderMaterial} attach="material" ref={materialRef} />
    </mesh>
  );
};

// Setup for orthographic camera
const CameraSetup = () => {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.left = -size.width / 2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = -size.height / 2;
    cam.near = -1000;
    cam.far = 1000;
    cam.position.z = 10;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
};

// Fallback while loading
const LoadingFallback = () => null;

// All images component
const ChromaticImages = () => {
  const [images, setImages] = useState<ImageEntry[]>([]);

  useEffect(() => {
    // Set up intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const imageId = (entry.target as HTMLImageElement).dataset
            .chromaticId;
          if (imageId) {
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageId
                  ? { ...img, visible: entry.isIntersecting }
                  : img
              )
            );
          }
        });
      },
      { threshold: [0.0, 0.01, 1.0] }
    );

    // Find all images with data-chromatic-decay
    const chromaticImages = Array.from(
      document.querySelectorAll('img[data-chromatic-decay]')
    ) as HTMLImageElement[];

    console.log(
      `Found ${chromaticImages.length} images with data-chromatic-decay`
    );

    // Create entries and set up observation
    const imageEntries = chromaticImages.map((img, index) => {
      const id = `chromatic-image-${index}`;
      img.dataset.chromaticId = id;
      observer.observe(img);

      console.log(
        `Image #${index}: ${img.src}, size: ${img.width}x${img.height}`
      );

      return {
        src: img.src,
        element: img,
        id,
        visible: false,
      };
    });

    setImages(imageEntries);

    // Hide original images but maintain their layout
    chromaticImages.forEach((img) => {
      img.style.opacity = '0';
    });

    return () => {
      observer.disconnect();
      chromaticImages.forEach((img) => {
        img.style.opacity = '';
        delete img.dataset.chromaticId;
      });
    };
  }, []);

  return (
    <>
      <CameraSetup />
      {images.map(({ src, element, id, visible }) => (
        <Suspense key={id} fallback={<LoadingFallback />}>
          <ChromaticImage
            imageSrc={src}
            imageRef={element}
            targetStrength={visible ? 0 : 1}
          />
        </Suspense>
      ))}
    </>
  );
};

// Main component
export const ChromaticAberrationEffect = () => {
  return (
    <Canvas
      orthographic
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <ChromaticImages />
    </Canvas>
  );
};

// Init function
export const initChromaticAberration = () => {
  const container = document.createElement('div');
  container.id = 'chromatic-aberration-container';
  document.body.appendChild(container);

  import('react-dom/client').then(({ createRoot }) => {
    const reactRoot = createRoot(container);
    reactRoot.render(<ChromaticAberrationEffect />);
  });
};

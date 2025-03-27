import { Canvas, ThreeElement, useFrame, useLoader } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

const Scene = ({
  imageSrc,
  strength,
  targetStrength,
}: {
  imageSrc: string;
  strength: number;
  targetStrength: number;
}) => {
  const texture = useLoader(THREE.TextureLoader, imageSrc);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const materialRef = useRef<
    Omit<ThreeElement<any>, 'args'> & {
      object: object;
    }
  >(null);

  useFrame(({ clock, size }) => {
    const strengthDifference = targetStrength - strength;
    strength += strengthDifference * 0.02;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.abberationStrength.value = strength;
      // Update resolution uniform with current canvas size
      materialRef.current.uniforms.uResolution.value.set(
        size.width,
        size.height
      );
    }
  });

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
            vec2 screenUv = (gl_FragCoord.xy - 25.0) / (uResolution.xy - 25.0);


            // This moves the channels around in a circular motion and stretches/contracts/wave effect
            vec2 abberationStrength_ = abberationStrength * vec2(
              sin(uTime + screenUv.x * 4.0 + screenUv.y * 4.0),
              sin(uTime + screenUv.x * 3.0 + screenUv.y * 3.0)
            );

            vec4 redColorChannel = sampleColor(screenUv + abberationStrength_ * rotation2d(1.0));
            vec4 blueColorChannel = sampleColor(screenUv + abberationStrength_ * rotation2d(2.0));
            vec4 greenColorChannel = sampleColor(screenUv - abberationStrength_ * rotation2d(3.0));
            vec4 blackColorChannel = sampleColor(screenUv);


            blackColorChannel.r = 0.0;
            blackColorChannel.g = 0.0;
            blackColorChannel.b = 0.0;

            redColorChannel.g = 0.0;
            redColorChannel.b = 0.0;
            redColorChannel.a = redColorChannel.r;
            blueColorChannel.g = 0.0;
            blueColorChannel.r = 0.0;
            blueColorChannel.a = blueColorChannel.b;
            greenColorChannel.r = 0.0;
            greenColorChannel.b = 0.0;
            greenColorChannel.a = greenColorChannel.g;

            vec4 colorChannels = redColorChannel + blackColorChannel + greenColorChannel + blueColorChannel;
            gl_FragColor = colorChannels;
          }
        `,
      }),
    []
  );

  return (
    <mesh>
      <planeGeometry args={[18, 9]} />
      <primitive object={shaderMaterial} attach="material" ref={materialRef} />
    </mesh>
  );
};

// Main component that sets up the Canvas
export const ChromaticAberration = ({ imageSrc }: { imageSrc: string }) => {
  const meshRef = useRef<any>(null);
  const [targetStrength, setTargetStrength] = useState(1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio > 0) {
            setTargetStrength(0);
          } else {
            setTargetStrength(1);
          }
        });
      },
      {
        threshold: [0.0, 0.01, 1.0],
      }
    );

    observer.observe(meshRef.current);
  });

  return (
    <Canvas ref={meshRef}>
      <Suspense fallback={<LoadingFallback />}>
        <Scene
          imageSrc={imageSrc}
          strength={1}
          targetStrength={targetStrength}
        />
      </Suspense>
    </Canvas>
  );
};

// A simple fallback component to show while textures are loading
const LoadingFallback = () => {
  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#444444" />
    </mesh>
  );
};

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';
import './App.scss';

import { ChromaticAberration } from './chromatic-abberation/chromatic-abberation';
import { Showcase } from './showcase/showcase';
import { Skills } from './skills/skills';

function App() {
  const engagingText = useRef(null);
  const usersText = useRef(null);
  const businessValueText = useRef(null);
  const codeQualityText = useRef(null);
  const transition = useRef(null);
  const charsRef = useRef([]);
  const textRef = useRef(null);

  const engagingCopy = 'engaging';
  // Reset refs array when text changes
  charsRef.current = [];

  // Add to ref array for each character
  const addToRefs = (el: any) => {
    // @ts-ignore
    if (el && !charsRef.current.includes(el)) {
      // @ts-ignore
      charsRef.current.push(el);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setupHighlightWordEffect(engagingText, 1, 0);
      setupUnderlineWordEffect(usersText, 500, 1);
      setupUnderlineWordEffect(businessValueText, 900, 1);
      setupUnderlineWordEffect(codeQualityText, 1300, 1);
    }, 1750);

    setTimeout(() => {
      animateText();
    }, 2020);
  }, []);

  useEffect(() => {
    // Set initial color for all characters
    gsap.set(charsRef.current, { color: '#fffce1' });

    // Create a timeline for reuse
    const tl = gsap.timeline({ paused: true });

    // Add animation to the timeline
    tl.to(charsRef.current, {
      duration: 0.5,
      color: 'black',
      stagger: 0.046,
      ease: 'power2.inOut',
    });

    // Store the timeline in ref
    // @ts-ignore
    textRef.current = tl;
  }, []);

  const animateText = () => {
    // Reset to initial state before playing
    // @ts-ignore
    textRef.current.progress(0);
    // @ts-ignore
    textRef.current.play();
  };

  const setupHighlightWordEffect = (
    element?: any,
    iterations = 1,
    delay = 0
  ) => {
    if (!element) return;

    const annotation = annotate(element.current, {
      type: 'highlight', // Annotation type
      multiline: true,
      color: '#F49939', // Color of the circle
      iterations,
      padding: 4,
    });

    // Display the annotation
    setTimeout(() => {
      annotation.show();
    }, delay);
  };

  const setupCircleWordEffect = (
    element?: any,
    iterations = 1,
    delay = 1200
  ) => {
    console.log(element);
    if (!element) return;

    const annotation = annotate(element.current, {
      type: 'box', // Annotation type
      color: '#F49939', // Color of the circle
      strokeWidth: 2, // Thickness of the circle's stroke
      padding: 2, // Padding around the element
      iterations: 1,
      animationDuration: 1000,
      multiline: true,
    });

    // Display the annotation
    setTimeout(() => {
      annotation.show();
    }, delay);
  };

  const setupUnderlineWordEffect = (
    element?: any,
    delay = 3000,
    iterations = 1
  ) => {
    if (!element) return;

    const annotation = annotate(element.current, {
      type: 'underline', // Annotation type
      color: '#F49939', // Color of the circle
      strokeWidth: 2, // Thickness of the circle's stroke
      padding: 1, // Padding around the element
      iterations,
      multiline: true,
    });

    // Display the annotation
    setTimeout(() => {
      annotation.show();
    }, delay);
  };

  return (
    <>
      {/* <Squiggle></Squiggle> */}
      <section className="landing">
        <p className="intro">
          <span className="clip">
            <span className="name">
              <span className="hey">Hey,&nbsp;</span>
              <span className="im">I'm&nbsp;</span>
              <span className="sam">Sam</span>
            </span>
          </span>
          <br />

          <span className="clip">
            <span className="jobTitle">
              Software Engineer and&nbsp;
              <span>Designer</span>
            </span>
          </span>

          <span className="clip">
            <span className="about">
              I love crafting&nbsp;
              <span ref={engagingText} className="engaging">
                <span ref={transition}>
                  {engagingCopy.split('').map((char, index) => (
                    <span
                      key={index}
                      ref={addToRefs}
                      className="text-color-wipe-char"
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>{' '}
              experiences with the
              <span ref={usersText}> users</span>,&nbsp;
              <span ref={businessValueText}>business value</span> and
              <span ref={codeQualityText}> code quality</span> at the forefront
            </span>
          </span>
        </p>

        <div className="email">
          <span className="clip">
            <a className="contact" href="mailto:samalexmunro94@gmail.com">
              Say hello&#64;sammunro.com
            </a>
          </span>

          <button className="anchor-button">
            <span className="material-symbols-outlined">arrow_downward</span>
          </button>
        </div>
      </section>

      <div className="loading-background"></div>

      <ChromaticAberration imageSrc="projects/hotel-insights.png" />

      <Skills />

      <Showcase />
    </>
  );
}

export default App;

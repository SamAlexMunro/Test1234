import { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';
import './App.scss';
import { Skills } from './skills/skills';

function App() {
  const engagingText = useRef(null);
  const usersText = useRef(null);
  const businessValueText = useRef(null);
  const codeQualityText = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      setupCircleWordEffect(engagingText, 0, 0);
      setupUnderlineWordEffect(usersText, 500, 2);
      setupUnderlineWordEffect(businessValueText, 900, 1);
      setupUnderlineWordEffect(codeQualityText, 1300, 2);
    }, 1750);
  }, []);

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
      padding: 0,
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
      strokeWidth: 3, // Thickness of the circle's stroke
      padding: 2, // Padding around the element
      iterations: 2,
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
      padding: 2, // Padding around the element
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
                engaging
              </span>{' '}
              experiences with the
              <span ref={usersText}> users</span>,&nbsp;
              <span ref={businessValueText}>business value</span> and
              <span ref={codeQualityText}> code quality</span> at the forefront
            </span>
          </span>
        </p>

        <div className="email">
          <a className="contact" href="mailto:samalexmunro94@gmail.com">
            Say hello&#64;sammunro.com
          </a>

          <button className="anchor-button">
            <span className="material-symbols-outlined">arrow_downward</span>
          </button>
        </div>
      </section>

      <div className="loading-background"></div>

      <Skills />
    </>
  );
}

export default App;

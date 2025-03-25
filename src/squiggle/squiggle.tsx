import { useEffect, useRef } from 'react';
import './squiggle.scss';

export const Squiggle = () => {
  const svgPath = useRef<SVGPathElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    updateScrollPath();
    window.addEventListener('scroll', updateScrollPath);
  }, []);

  const updateScrollPath = () => {
    if (!svgPath || !svgPath.current || !svg || !svg.current) return;

    const pathLength = svgPath.current.getTotalLength();

    const distance = window.scrollY;
    const totalDistance = svg.current.clientHeight - window.innerHeight;
    const scrollPercentage = distance / totalDistance;

    svgPath.current.style.strokeDasharray = `${pathLength}`;
    svgPath.current.style.strokeDashoffset = `${
      pathLength * (1 - scrollPercentage)
    }`;
  };

  return (
    <svg
      ref={svg}
      xmlns="http://www.w3.org/2000/svg"
      width="1124"
      height="1958"
      fill="none"
      className="squiggle"
    >
      <path
        ref={svgPath}
        stroke="red"
        d="M385.5 1s-36 180 0 244.5S526 317 596 340.5s270 75 307.5 126 18.975 104.604 0 167c-59.37 195.225-608.557-114.358-518 68.5 47.948 96.819 137.777 208.456 230.5 153 82.372-49.266 38.351-149.452 25-244.5-32.143-228.824-347.006 308.638-270 526.5 72.671 205.6 302.248 156.42 496.5 255.5 84.092 42.89 148.56 42.94 215.5 109.5 200.54 199.39-410.544 162.17-670.5 273.5C251.045 1844.65 1 1957 1 1957"
      />
    </svg>
  );
};

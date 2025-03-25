import './showcase.scss';

export const Showcase = () => {
  const projects = [
    {
      title: 'Google Market Finder',
      splash: 'projects/market-finder-splash.png',
      blurb: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus id
          expedita quidem ab nesciunt.`,
    },
    {
      title: 'Google Hotel Insights',
      splash: 'projects/hotel-insights.png',
      blurb: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus id
          expedita quidem ab nesciunt.`,
    },
  ];
  return (
    <section className="section">
      <h1 className="project-intro">Projects</h1>

      <>
        {projects.map((project, index) => (
          <div key={index} className="project">
            <h2 className="project-name">{project.title}</h2>
            <img className="project-splash" src={project.splash} alt="" />
            <p className="blurb">{project.blurb}</p>
          </div>
        ))}
      </>
    </section>
  );
};

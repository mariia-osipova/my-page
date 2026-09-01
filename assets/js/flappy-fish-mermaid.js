import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

if (document.querySelector('.fish-project .mermaid')) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    flowchart: {
      curve: 'basis',
      htmlLabels: true
    },
    themeVariables: {
      background: '#fdfffa',
      primaryColor: '#fff5cf',
      primaryTextColor: '#17241f',
      primaryBorderColor: '#30985b',
      secondaryColor: '#e8fff1',
      secondaryTextColor: '#17241f',
      secondaryBorderColor: '#2b9a8c',
      tertiaryColor: '#eef6ff',
      tertiaryTextColor: '#17241f',
      tertiaryBorderColor: '#5c82d8',
      lineColor: '#2b9a8c',
      textColor: '#17241f',
      fontFamily: 'inherit'
    }
  });

  mermaid.run({ querySelector: '.fish-project .mermaid' }).catch((error) => {
    console.warn('Flappy Fish Mermaid diagrams could not be rendered.', error);
  });
}

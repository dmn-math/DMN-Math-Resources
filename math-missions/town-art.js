(() => {
  'use strict';
  // Original pixel art. Layers share a 160 × 94 grid: terrain, home, items, resident.
  // To add a visual variant, define it here and include its ID in the SQL allowlist.
  const homes = {
    clay: {label:'Terracotta', roof:'#bd583e',shade:'#943c31',wall:'#ffe2a4'},
    mint: {label:'Seafoam', roof:'#57978a',shade:'#2c6b65',wall:'#fff0c8'},
    dusk: {label:'Lavender', roof:'#8772b5',shade:'#61518d',wall:'#f4d3bd'}
  };
  const characters = {
    sprout: {label:'Sprout', art:'<path fill="#254841" d="M119 57h7v-3h3v-3h7v4h-4v3h5v4h4v14h-4v4h-4v3h-5v-3h-4v3h-5v-4h-5V65h3v-4h2z"/><path fill="#9cdc89" d="M120 63h4v-4h10v4h4v12h-4v3h-12v-3h-5v-9h3z"/><path fill="#f9ebad" d="M123 65h12v8h-12z"/><path fill="#24453e" d="M125 67h2v3h-2zM131 67h2v3h-2z"/><path fill="#ec9f74" d="M128 71h2v1h-2z"/>'},
    fox: {label:'Fox', art:'<path fill="#603931" d="M116 55h5v3h5v3h5v-3h4v-3h5v11h2v11h-4v6h-6v-3h-8v3h-6v-5h-4V65h2z"/><path fill="#e69751" d="M118 59h3v3h6v2h4v-2h5v-3h2v8h2v8h-4v3h-14v-3h-6v-8h2z"/><path fill="#fff0c5" d="M121 70h5v3h6v-3h5v6h-16z"/><path fill="#573630" d="M122 67h2v3h-2zM133 67h2v3h-2zM127 72h3v2h-3z"/>'},
    robot: {label:'Robot', art:'<path fill="#33415c" d="M127 54h4v5h7v4h4v12h-4v7h-6v-4h-7v4h-6v-7h-4V63h4v-4h8z"/><path fill="#afc8e9" d="M120 62h16v4h3v7h-3v3h-15v-3h-3v-7h2z"/><path fill="#586c8c" d="M121 65h15v7h-15z"/><path fill="#c6fbad" d="M123 67h3v3h-3zM131 67h3v3h-3z"/><path fill="#ffd07a" d="M127 54h4v3h-4z"/>'}
  };
  const decor={
    plant:'<path fill="#bf6447" d="M20 69h10v8h-2v4h-6v-4h-2z"/><path fill="#3d8863" d="M24 62h3v8h-3zM20 61h4v4h-4zM27 57h5v5h-5z"/>',
    lamp:'<path fill="#4a4e4a" d="M106 60h2v18h-2zM103 77h8v3h-8z"/><path fill="#ffdf7b" d="M103 57h8v8h-8z"/><path fill="#cc9649" d="M102 55h10v3h-10z"/>',
    sign:'<path fill="#895939" d="M94 71h2v10h-2zM89 66h14v7H89z"/><path fill="#f5dba1" d="M91 68h9v1h-9zM91 70h6v1h-6z"/>'
  };
  const scenery=`<path fill="var(--plot-sky)" d="M0 0h160v94H0z"/>
    <path fill="var(--plot-sun)" d="M121 9h12v2h3v12h-3v2h-12v-2h-3V11h3z"/>
    <path fill="var(--plot-cloud)" d="M15 20h7v-3h11v3h9v4H15zM92 19h6v-3h10v3h6v3H92z"/>
    <path fill="var(--plot-hill)" d="M0 52h11v-5h9v-6h11v-5h13v5h10v5h12v6h16v-6h12v-7h11v-6h13v6h12v5h14v6h16v44H0z"/>
    <path fill="var(--plot-lawn)" d="M0 64h160v30H0z"/>
    <path fill="var(--plot-path)" d="M0 86h160v8H0zM61 76h18v10H61z"/>
    <path fill="var(--plot-grass)" d="M9 76h4v2H9zM17 84h3v2h-3zM111 82h4v2h-4zM146 79h5v2h-5zM151 68h4v2h-4zM6 69h4v2H6z"/>`;
  function plot({home,character,items}={}) {
    const h=Object.hasOwn(homes,home)?homes[home]:homes.clay;
    const c=Object.hasOwn(characters,character)?characters[character]:characters.sprout;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 160 94');
    svg.setAttribute('shape-rendering','crispEdges');
    svg.setAttribute('aria-hidden','true');
    svg.classList.add('mm-plot-art');
    svg.innerHTML=scenery+`
      <path fill="#4a4548" d="M36 44h67v34H36zM84 30h9v16h-9z"/>
      <path fill="${h.wall}" d="M38 46h63v30H38z"/>
      <path fill="${h.shade}" d="M31 45h8v-5h7v-5h7v-5h8v-5h16v5h8v5h7v5h7v5h8v7H31z"/>
      <path fill="${h.roof}" d="M34 45h8v-5h7v-5h7v-5h8v-4h10v4h8v5h7v5h7v5h8v4H34z"/>
      <path fill="#544344" d="M63 59h15v17H63zM45 55h12v13H45zM84 55h11v13H84z"/>
      <path fill="var(--plot-window)" d="M47 57h8v9h-8zM86 57h7v9h-7z"/>
      <path fill="#e6b682" d="M68 63h7v13h-7z"/>
      <path fill="#fff3bd" d="M72 69h2v2h-2z"/>
    `+Object.keys(decor).filter(k=>Array.isArray(items)&&items.includes(k)).map(k=>decor[k]).join('')+c.art;
    return svg;
  }
  window.AlgebraTownArt={homes,characters,plot};
})();

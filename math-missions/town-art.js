(() => {
  'use strict';
  const houses = [
    {name:'Straw Hut',price:0,box:[24,169,265,224],door:[142,302,368,36]},
    {name:'Wooden Hut',price:10,box:[319,169,283,224],door:[424,301,368,37]},
    {name:'Brick House',price:15,box:[622,130,319,263],door:[728,298,369,37]},
    {name:'Stone Cottage',price:20,box:[959,119,366,274],door:[1086,301,369,37]},
    {name:'Timber Lodge',price:25,box:[1340,86,421,307],door:[1527,296,368,38]},
    {name:'Townhouse',price:30,box:[18,494,266,316],door:[144,737,788,31]},
    {name:'Manor',price:40,box:[286,534,356,276],door:[465,723,788,35]},
    {name:'Castle',price:50,box:[640,480,307,330],door:[790,724,789,35]},
    {name:'Royal Palace',price:65,box:[947,485,419,325],door:[1154,716,747,25]},
    {name:'Sky Citadel',price:85,box:[1372,448,396,365],door:[1566,625,665,27]}
  ];
  const catalog = [
    ['tee-red','tee','Red tee',5,'#cf5143'],['tee-blue','tee','Blue tee',5,'#77b8dd'],
    ['tee-green','tee','Green tee',5,'#73a650'],['tee-yellow','tee','Yellow tee',5,'#f0c45b'],
    ['pants-navy','pants','Navy pants',5,'#405677'],['pants-charcoal','pants','Charcoal pants',5,'#555659'],
    ['pants-tan','pants','Tan pants',5,'#bd985f'],['pants-olive','pants','Olive pants',5,'#798a53'],
    ['hat-flat','hat','Flat cap',8],['hat-fedora','hat','Fedora',12],
    ['hat-baseball','hat','Baseball cap',10],['hat-beanie','hat','Beanie',8],
    ['costume-suit','costume','Suit',20,[77,180,212,383]],
    ['costume-princess','costume','Princess dress',25,[345,165,262,396]],
    ['costume-skeleton','costume','Skeleton',25,[651,178,226,385]],
    ['costume-military','costume','Military uniform',25,[945,171,224,393]],
    ['costume-tree','costume','Christmas tree',30,[54,662,255,420]],
    ['costume-vampire','costume','Vampire',30,[342,715,271,369]],
    ['costume-iron','costume','Iron Man',40,[646,713,236,371]],
    ['costume-snowman','costume','Snowman',30,[937,674,251,410]]
  ].map(([id,slot,name,price,detail])=>({id,slot,name,price,detail}));
  const byId=Object.fromEntries(catalog.map(item=>[item.id,item]));
  const hats={
    'hat-flat':'<path fill="#9fb18a" d="M18 40Q15 29 27 22Q48 11 68 21Q82 26 80 39L76 45Q52 37 24 45Z"/><path fill="#788d68" d="M20 42Q45 29 76 43Q60 48 23 47Q16 47 20 42Z"/>',
    'hat-fedora':'<path fill="#aa764a" d="M30 40L34 23Q37 15 44 18L52 22L62 18Q70 16 73 24L77 40Z"/><path fill="#573b2c" d="M32 32Q52 37 75 31L77 41H30Z"/><ellipse fill="#b4804c" cx="53" cy="43" rx="39" ry="8"/><path d="M30 40Q53 45 76 40" fill="none"/>',
    'hat-baseball':'<path fill="#578fbf" d="M27 42Q28 21 48 18Q66 14 78 30Q83 36 80 44Q54 39 27 42Z"/><path d="M52 18Q63 26 65 39" fill="none" stroke="#335c7c" stroke-width="2"/><path fill="#4275a3" d="M30 38Q40 34 63 39Q36 48 18 48Q11 47 17 43Z"/>',
    'hat-beanie':'<path fill="#ca714b" d="M24 41V37Q24 17 53 16Q81 17 81 39V43Z"/><path fill="#dc8857" d="M22 38Q53 33 82 38L83 47Q51 44 22 48Z"/><path d="M32 39v6m10-7v6m11-7v6m11-6v6m10-5v6" stroke="#915338" stroke-width="2"/>'
  };
  let cropId=0;
  function svg(box,content,cls){
    const node=document.createElementNS('http://www.w3.org/2000/svg','svg');
    node.setAttribute('viewBox',box.join(' '));node.setAttribute('class',cls);
    node.setAttribute('aria-hidden','true');
    if(cls.includes('mm-sheet-art')){
      const [x,y,w,h]=box,id='town-crop-'+(++cropId);
      node.innerHTML='<defs><clipPath id="'+id+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/></clipPath></defs><g clip-path="url(#'+id+')">'+content+'</g>';
    }else node.innerHTML=content;
    return node;
  }
  function sheet(name,w,h){
    return '<image href="art/'+name+'-sheet.png" width="'+w+'" height="'+h+'"/>';
  }
  function avatar(outfit={}){
    const costume=byId[outfit.costume];
    if(costume?.slot==='costume')return svg(costume.detail,sheet('costume',1247,1261),'mm-avatar mm-sheet-art');
    const tee=byId[outfit.tee]?.slot==='tee'?byId[outfit.tee].detail:null;
    const pants=byId[outfit.pants]?.slot==='pants'?byId[outfit.pants].detail:null;
    return svg([0,5,105,148],
      '<g fill="#fffdf8" stroke="#2d2823" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M35 79Q23 84 18 100Q14 114 22 118Q29 121 33 110L33 134Q33 145 43 145Q51 145 51 134H55Q55 145 64 145Q74 145 74 134V110Q79 121 86 118Q94 114 89 100Q84 84 71 79Z"/>'+
      (pants?'<path fill="'+pants+'" d="M33 115Q53 119 74 115V134Q74 145 64 145Q55 145 55 134H51Q51 145 43 145Q33 145 33 134Z"/>':'')+
      (tee?'<path fill="'+tee+'" d="M38 78Q27 80 20 92L18 102Q25 106 31 108L33 101V120Q52 124 74 120V101L76 108Q82 106 89 102L87 92Q79 81 67 78Z"/>':'')+
      '<path d="M24 56Q24 33 52 33Q81 33 81 56V65Q81 83 54 84Q24 84 24 65Z"/>'+
      '<path d="M45 55v10m16-10v10m-13 8h8" fill="none" stroke-width="4"/>'+
      (Object.hasOwn(hats,outfit.hat)?hats[outfit.hat]:'')+'</g>','mm-avatar');
  }
  function house(level=1){
    const data=houses[level-1]||houses[0];
    const [x,y,b,w]=data.door;
    const floor=b-14;
    // The concept sheet contains a tiny scale figure. Render the door over that figure
    // so the separately dressed player is the only character on the plot.
    const door='<path fill="#735136" stroke="#3b2b21" stroke-width="1.7" d="M'+(x-w/2)+' '+(floor+1)+' V'+(y+10)+' Q'+(x-w/2)+' '+(y-6)+' '+x+' '+(y-6)+' Q'+(x+w/2)+' '+(y-6)+' '+(x+w/2)+' '+(y+10)+' V'+(floor+1)+'Z"/>'+
      '<path fill="#dbc390" d="M'+(x-w/2-1)+' '+(floor+1)+'H'+(x+w/2+1)+'l3 '+(b-floor)+'h-'+(w+8)+'Z"/>'+
      '<path stroke="#a78052" opacity=".8" d="M'+x+' '+(y-4)+'V'+floor+' M'+(x-8)+' '+(y+2)+'V'+floor+' M'+(x+8)+' '+(y+2)+'V'+floor+'"/>';
    return svg(data.box,sheet('house',1774,887)+door,'mm-house mm-sheet-art');
  }
  function plot({level=1,outfit={}}={}){
    const node=document.createElement('div');
    node.className='mm-plot-art';
    node.append(avatar(outfit),house(level));
    return node;
  }
  window.AlgebraTownArt={houses,catalog,byId,avatar,house,plot};
})();

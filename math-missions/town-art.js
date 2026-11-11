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
    ['costume-snowman','costume','Snowman',30,[937,674,251,410]],
    ['costume-angel','costume','Angel',32],['costume-bear','costume','Bear costume',26],
    ['costume-dinosaur','costume','Dinosaur costume',34],['costume-chinese-warrior','costume','Chinese warrior armour',42],
    ['costume-english-knight','costume','English knight armour',42],
    ['costume-panda','costume','Panda costume',28],
    ['costume-spider','costume','Spider-Man',42],['costume-bat','costume','Batman',44],
    ['costume-wonder','costume','Wonder Woman',44],['costume-flash','costume','The Flash',38],
    ['costume-captain','costume','Captain America',42],['costume-hulk','costume','Hulk',38],
    ['costume-strange','costume','Doctor Strange',48],['costume-panther','costume','Black Panther',44],
    ['costume-balance','costume','Captain Balance',null]
  ].map(([id,slot,name,price,detail])=>({id,slot,name,price,detail,rewardOnly:price===null}));
  const byId=Object.fromEntries(catalog.map(item=>[item.id,item]));
  const hats={
    'hat-flat':'<path fill="#9fb18a" d="M18 40Q15 29 27 22Q48 11 68 21Q82 26 80 39L76 45Q52 37 24 45Z"/><path fill="#788d68" d="M20 42Q45 29 76 43Q60 48 23 47Q16 47 20 42Z"/>',
    'hat-fedora':'<path fill="#aa764a" d="M30 40L34 23Q37 15 44 18L52 22L62 18Q70 16 73 24L77 40Z"/><path fill="#573b2c" d="M32 32Q52 37 75 31L77 41H30Z"/><ellipse fill="#b4804c" cx="53" cy="43" rx="39" ry="8"/><path d="M30 40Q53 45 76 40" fill="none"/>',
    'hat-baseball':'<path fill="#578fbf" d="M27 42Q28 21 48 18Q66 14 78 30Q83 36 80 44Q54 39 27 42Z"/><path d="M52 18Q63 26 65 39" fill="none" stroke="#335c7c" stroke-width="2"/><path fill="#4275a3" d="M30 38Q40 34 63 39Q36 48 18 48Q11 47 17 43Z"/>',
    'hat-beanie':'<path fill="#ca714b" d="M24 41V37Q24 17 53 16Q81 17 81 39V43Z"/><path fill="#dc8857" d="M22 38Q53 33 82 38L83 47Q51 44 22 48Z"/><path d="M32 39v6m10-7v6m11-7v6m11-6v6m10-5v6" stroke="#915338" stroke-width="2"/>'
  };
  const face='<path fill="#fffdf8" d="M35 57Q35 44 54 44Q73 44 73 57V66Q73 77 54 77Q35 77 35 66Z"/><path fill="none" d="M47 56v6m14-6v6m-10 7h6"/>';
  const heroBody=colour=>'<path fill="'+colour+'" d="M39 76Q21 79 17 101Q15 114 24 115Q29 115 33 109V132Q33 143 43 143Q52 143 52 133H56Q56 143 65 143Q76 143 76 132V109Q80 115 86 115Q94 113 92 101Q87 79 69 76Z"/>';
  const hood=colour=>'<path fill="'+colour+'" d="M22 55Q22 28 54 28Q86 28 86 55V65Q86 84 54 84Q22 84 22 65Z"/>';
  const cape=colour=>'<path fill="'+colour+'" d="M37 77Q28 87 22 118L12 135Q28 129 36 139Q53 134 70 139Q78 129 96 135L86 118Q80 87 70 77Z"/>';
  const boots=colour=>'<path fill="'+colour+'" d="M33 124q9 3 19 0v9q0 10-9 10t-10-11Zm23 0q10 3 20 0v8q0 11-11 11-9 0-9-10Z"/>';
  const costumes={
    'costume-panda':
      heroBody('#414049')+
      '<ellipse fill="#fffaf0" cx="54" cy="106" rx="18" ry="19"/>'+
      '<circle fill="#414049" cx="28" cy="34" r="12"/><circle fill="#414049" cx="80" cy="34" r="12"/>'+
      '<circle fill="#82717e" cx="27" cy="33" r="5" stroke="none"/><circle fill="#82717e" cx="81" cy="33" r="5" stroke="none"/>'+
      hood('#fffaf0')+
      '<ellipse fill="#45424a" cx="40" cy="53" rx="9" ry="10" transform="rotate(24 40 53)" stroke="none"/>'+
      '<ellipse fill="#45424a" cx="68" cy="53" rx="9" ry="10" transform="rotate(-24 68 53)" stroke="none"/>'+
      '<path d="M40 51v4m28-4v4" stroke="#fffaf0"/><path d="M50 62q4 3 8 0m-9 5q5 5 10 0" fill="none" stroke-width="2"/>'+
      '<path d="M34 63h4m32 0h4" stroke="#e9a8a5" stroke-width="2.5"/>'+
      '<path fill="#82a867" d="M73 130 93 104" stroke="#648147"/><path fill="#a6bf76" d="M83 116q-3-11 8-14 1 8-8 14Zm0 0q10-3 14 4-8 4-14-4Z" stroke="#648147" stroke-width="1.7"/>',
    'costume-spider':
      heroBody('#4479ae')+boots('#c84c4f')+
      '<path fill="#d65b56" d="M33 84 40 107 54 117 68 107 75 84 65 77H43Z"/>'+
      '<path fill="none" d="M54 91v13m-5-11 5 3 5-3m-7 5-6 2m10-2 6 2m-10 1-5 6m9-6 5 6" stroke-width="1.7"/>'+
      hood('#d65b56')+
      '<path d="M54 31v14M36 35l9 11m27-11-9 11m-38-2 11 8m47-8-11 8M26 53q28-25 56 0m-56 8q28-24 56 0" fill="none" stroke="#893c41" stroke-width="1.25"/>'+face+
      '<path d="m42 53 8 4m16-4-8 4" stroke="#843e43" stroke-width="1.6"/>',
    'costume-bat':
      cape('#343743')+heroBody('#626b79')+boots('#343743')+
      '<path fill="#f4c768" d="M33 110h43v8H33Z"/>'+
      '<ellipse fill="#efc46e" cx="54" cy="95" rx="12" ry="7" stroke-width="2"/><path fill="#343743" stroke="none" d="M43 92q6 3 8 0l3 3 3-3q2 3 8 0l-3 7q-5-2-8 1-3-3-8-1Z"/>'+
      '<path fill="#343743" d="M23 63V20l15 17q16-7 32 0l15-17v43Q85 84 54 84 23 84 23 63Z"/>'+face+
      '<path fill="none" stroke="#727b89" stroke-width="1.5" d="M32 38q3 4 9 5m35-5q-3 4-9 5"/>',
    'costume-wonder':
      '<path fill="#54404b" d="M22 56q0-32 32-32t32 32l4 33-17-6H35l-17 6Z"/>'+
      heroBody('#d75d59')+boots('#bd514c')+
      '<path fill="#4b74ab" d="M34 103q20 5 41 0l5 19q-25 9-51 0Z"/>'+
      '<path fill="#f5ca6d" d="M34 100q20 5 40 0v8q-20 5-40 0Z"/>'+
      '<path d="m41 89 6 7 7-5 7 5 6-7" fill="none" stroke="#f5ca6d" stroke-width="3.5"/>'+
      '<path d="m19 103 9 3m53 0 9-3" stroke="#d6e5e9" stroke-width="5"/>'+
      '<ellipse cx="77" cy="109" rx="8" ry="10" fill="none" stroke="#c68838" stroke-width="2.8"/>'+face+
      '<path fill="#efbd58" d="M29 41 43 42 54 32 65 42 79 41 74 49 54 52 34 49Z"/><path fill="#cb5151" stroke="none" d="m54 38 2 4 5 1-4 3 1 4-4-2-4 2 1-4-4-3 5-1Z"/>',
    'costume-flash':
      heroBody('#c95354')+boots('#f1c65c')+
      '<path d="m33 108 18 5 25-5" fill="none" stroke="#f1c65c" stroke-width="4"/>'+
      '<circle cx="54" cy="94" r="10" fill="#fff6dc" stroke-width="2"/><path fill="#ecaf39" stroke="none" d="m57 84-10 11h7l-4 9 12-12h-7Z"/>'+
      hood('#d65953')+
      '<path fill="#f3ca58" d="m24 47-12 8h8l-6 10 15-12h-7Zm60 0 12 8h-8l6 10-15-12h7Z" stroke-width="2"/>'+face,
    'costume-captain':
      heroBody('#4a75a7')+boots('#b75251')+
      '<path fill="#fff8eb" d="M35 105h38l3 14H33Z"/><path d="M42 106v12m11-12v13m11-13v12" stroke="#bc5657" stroke-width="4"/>'+
      '<path fill="#fff8eb" stroke="none" d="m54 83 3 6 7 1-5 5 1 6-6-3-6 3 1-6-5-5 7-1Z"/>'+
      hood('#517eae')+face+'<path d="m48 43 6-10 6 10m-10-3h8" fill="none" stroke="#fff8eb" stroke-width="2"/>'+
      '<circle cx="78" cy="105" r="20" fill="#c95255"/><circle cx="78" cy="105" r="15" fill="#fff5e9" stroke-width="1.5"/>'+
      '<circle cx="78" cy="105" r="11" fill="#5481b3" stroke="#c95255" stroke-width="3"/><path fill="#fff5e9" stroke="none" d="m78 97 2.4 5.2 5.7.7-4.4 3.7 1.5 5.4-5.2-3-5.2 3 1.5-5.4-4.4-3.7 5.7-.7Z"/>',
    'costume-hulk':
      heroBody('#8cab65')+
      '<path fill="#80608f" d="M33 105q21 6 43 0v21l-8 2-8-2-6 2-5-2-8 2-8-2Z"/>'+
      '<path d="M24 97q4 4 9 1m51-1q-4 4-9 1m-32-9q4 4 8 3m14-3q-4 4-8 3" fill="none" stroke="#62794c" stroke-width="2"/>'+
      hood('#8cab65')+face+
      '<path fill="#414446" d="M22 49q4-15 14-18l-3-8 14 5 7-8 8 9 12-5-2 9q10 5 14 15l-15-4-6 4-8-6-9 5-8-3-7 5Z"/>',
    'costume-strange':
      cape('#ad4f50')+heroBody('#466485')+
      '<path fill="#c35757" d="m23 71 18 7 13 13 13-13 18-7-7 23-18 4H48l-18-4Z"/>'+
      '<path d="M35 112q20 4 39 0" fill="none" stroke="#c8ac69" stroke-width="5"/>'+
      '<circle cx="54" cy="94" r="5" fill="#d8ca7b"/>'+
      hood('#4d444b')+face+
      '<path fill="#4d444b" d="M23 49q5-17 21-19 15-6 31 5 7 5 10 14l-15-5-7-6-8 9-8-5-10 6Z"/>'+
      '<path d="m27 48 5-8m48 8-5-8" stroke="#e1dbda" stroke-width="2.3"/>'+
      '<circle cx="85" cy="106" r="15" fill="none" stroke="#ce7539" stroke-width="2.6"/><path d="m85 92 10 19-21-1Z" fill="none" stroke="#f2ac4e" stroke-width="1.7"/><path d="M101 97v5m-2.5-2.5h5m-7 24v5m-2.5-2.5h5" stroke="#d68b48" stroke-width="1.5"/>',
    'costume-panther':
      heroBody('#424257')+boots('#383a49')+
      '<path d="M33 109q7 5 14 5m14 0q7 0 15-5" fill="none" stroke="#9678b2" stroke-width="2"/>'+
      '<path fill="#444257" d="M22 56 23 25 40 34q14-6 28 0l17-9 1 31v10q0 18-32 18T22 66Z"/>'+face+
      '<path d="m27 51 7 5m47-5-7 5m-43-9 9 5m37-5-9 5" stroke="#a787c0" fill="none" stroke-width="1.9"/>'+
      '<path fill="#d4d8df" stroke-width="1.3" d="m39 81 7 4-5 7Zm11 5h8l-4 9Zm12-1 7-4-2 11Z"/>',
    'costume-balance':
      cape('#5d9067')+heroBody('#e8c87c')+boots('#60886a')+
      '<path fill="#5d9067" d="M33 111q21 4 43 0v8H33Z"/>'+
      '<path fill="#648f6a" d="M38 82q16 7 32 0l-4 21-12 7-12-7Z"/><path d="M47 92h14m-14 6h14" stroke="#ffe4a2" stroke-width="3"/>'+
      hood('#6e9c76')+face+
      '<path d="m47 39 7-6 7 6m-12 3h10" fill="none" stroke="#ffe4a2" stroke-width="2"/>'+
      '<path fill="#e6bd69" d="M68 92q11-5 23 0l4 4-2 19q-5 10-13 13-9-4-13-13l-2-19Z"/>'+
      '<path d="M80 96v20m-11-14h22m-19 1-3 6h6Zm16 0-3 6h6Zm-13 14h10" fill="none" stroke="#655034" stroke-width="1.65"/>',
    'costume-angel':
      '<path fill="#fcf0db" d="M42 84Q16 55 7 70Q-1 87 23 109Q32 117 42 108M66 84Q92 55 101 70Q109 87 85 109Q76 117 66 108"/>'+
      '<path fill="none" stroke="#c19f71" d="M14 78q3 12 16 19m64-19q-3 12-16 19"/>'+
      '<path fill="#fffdf8" d="M36 120v13q0 10 9 10q8 0 8-10h3q0 10 8 10q9 0 9-10v-13"/>'+
      '<path fill="#f5eadb" d="M42 76Q25 83 24 103Q26 113 36 104L30 124Q53 135 78 124L72 104Q82 113 84 103Q83 83 66 76Z"/>'+
      '<path fill="none" stroke="#bc8634" d="M38 105q16 5 32 0"/><circle fill="#f3c463" cx="54" cy="93" r="4"/>'+
      '<path fill="#fffdf8" d="M27 56Q27 33 54 33Q81 33 81 56V64Q81 83 54 83Q27 83 27 64Z"/>'+
      '<path fill="none" d="M46 54v9m16-9v9m-11 7h6"/><ellipse fill="none" stroke="#9c6824" cx="54" cy="21" rx="24" ry="6"/><ellipse fill="none" stroke="#e6aa40" cx="54" cy="20" rx="24" ry="5"/>',
    'costume-bear':
      '<path fill="#a76c48" d="M37 77Q20 82 18 103Q17 117 31 113L31 133Q31 144 43 144Q53 144 53 134H56Q56 144 66 144Q78 144 78 133V113Q92 117 91 103Q89 82 72 77Z"/>'+
      '<ellipse fill="#e5bc87" cx="54" cy="108" rx="16" ry="20"/>'+
      '<circle fill="#a76c48" cx="28" cy="35" r="12"/><circle fill="#a76c48" cx="80" cy="35" r="12"/>'+
      '<circle fill="#d7967a" cx="28" cy="35" r="5" stroke="none"/><circle fill="#d7967a" cx="80" cy="35" r="5" stroke="none"/>'+
      '<path fill="#b77b50" d="M19 57Q19 28 54 28Q89 28 89 57V64Q89 87 54 87Q19 87 19 64Z"/>'+
      '<ellipse fill="#efd1a1" cx="54" cy="42" rx="7" ry="5"/><path d="m51 41 3 2 3-2" fill="none"/>'+face,
    'costume-dinosaur':
      '<path fill="#639e65" d="M71 107Q95 114 102 96Q107 116 91 128Q82 134 69 130Z"/>'+
      '<path fill="#77aa68" d="M35 77Q21 83 18 102Q20 115 31 109L31 133Q31 143 43 143Q52 143 52 134H56Q56 143 65 143Q77 143 77 133V109Q88 115 90 102Q87 83 73 77Z"/>'+
      '<ellipse fill="#e7cd80" cx="54" cy="109" rx="16" ry="21"/>'+
      '<path fill="#e6bd57" d="m32 33 4-15 13 11 9-17 10 19 13-8 1 17Z"/>'+
      '<path fill="#77aa68" d="M17 57Q17 28 52 28Q74 28 82 42Q96 43 94 56L90 64Q88 87 54 87Q17 87 17 64Z"/>'+
      '<circle fill="#302a22" cx="82" cy="48" r="2"/><path fill="#fffdf8" d="m24 52 5 9 5-9m39 0 5 9 5-9"/>'+face,
    'costume-chinese-warrior':
      '<path fill="#963f35" d="M41 74Q22 79 18 99L28 109L33 103L29 129H39V136Q39 143 47 143Q55 143 55 135Q55 143 64 143Q72 143 72 136V129H80L76 103L82 109L92 99Q88 79 67 74Z"/>'+
      '<path fill="#daaa5b" d="M34 81L20 88L19 101L32 103L39 92M74 81l14 7 1 13-13 2-7-11"/>'+
      '<path fill="#555d69" d="M41 80h26l6 17-4 22H39l-4-22Z"/>'+
      '<path fill="none" stroke="#e1ba70" d="M39 92h30m-32 8h34m-32 8h30m-24 0v-8m10 0v-8m7 16v-8m-7 16v-8"/>'+
      '<path fill="#d2a153" d="M35 116h38v7H35Z"/>'+
      '<path fill="#b84f43" d="M52 32Q43 18 53 13Q68 9 73 18Q61 17 59 32Z"/>'+
      '<path fill="#444b56" d="M20 55Q20 30 54 30Q88 30 88 55L85 75L74 79L68 58H40L34 79L23 75Z"/>'+face+
      '<path fill="#daaa5b" d="M22 49Q54 39 86 49L89 56Q54 49 19 56Z"/><circle fill="#b84f43" cx="54" cy="44" r="4"/>',
    'costume-english-knight':
      '<path fill="#768b96" d="M40 75Q19 79 18 102Q18 113 31 110V133Q31 143 43 143Q53 143 53 133H56Q56 143 66 143Q78 143 78 133V110Q91 113 91 102Q90 79 68 75Z"/>'+
      '<path fill="#bcc7cc" d="M31 78q8-5 15 6l-7 13-18-4q2-10 10-15m46 0q-8-5-15 6l7 13 18-4q-2-10-10-15"/>'+
      '<path fill="#e5e6d8" d="M41 79h26l4 40H37Z"/><path stroke="#a4483f" stroke-width="5" d="M54 91v19m-8-12h16"/>'+
      '<path fill="#736352" d="M37 118h34v6H37Z"/>'+
      '<path fill="#aab9c2" d="M22 60Q22 28 54 28Q86 28 86 60V76Q54 89 22 76Z"/>'+face+
      '<path fill="#71858f" d="M23 49Q54 40 85 49L82 56Q54 50 26 56Z"/>'+
      '<path fill="none" stroke="#e4ecee" d="M54 31v14M29 39l6-4"/>'
  };
  function gift(){
    return svg([0,0,112,105],'<g stroke="#553829" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">'+
      '<path fill="#eeaf55" d="M21 47h70v44q0 5-5 5H26q-5 0-5-5Z"/><rect fill="#ffd683" x="15" y="32" width="82" height="20" rx="5"/>'+
      '<path fill="#bb535c" d="M50 33h12v63H50Z"/><path fill="#da6b6a" d="M56 32Q27 34 30 20Q33 7 45 17Q52 23 56 32Q61 23 67 17Q79 7 82 20Q85 34 56 32Z"/>'+
      '<path fill="#fff0a9" stroke="none" d="M10 13l2 6 6 2-6 2-2 6-2-6-6-2 6-2zm91 53 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>','mm-gift-art');
  }
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
    if(costume?.slot==='costume'&&Object.hasOwn(costumes,costume.id))
      return svg([0,5,108,148],'<g stroke="#382a23" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">'+costumes[costume.id]+'</g>','mm-avatar');
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
  window.AlgebraTownArt={houses,catalog,byId,avatar,house,plot,gift};
})();

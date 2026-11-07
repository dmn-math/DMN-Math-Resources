(() => {
  'use strict';
  const page = document.getElementById('missions-app');
  const q = id => document.getElementById(id);
  const builder = document.getElementById('dmn-mission-wireframe');
  const config = window.MATH_MISSIONS_CONFIG || {};
  let api, state, user, run = 0, demoActive = false;
  const blankTown=()=>({level:1,outfit:{}});
  let town=blankTown(), townReady=false, townPending=false, previewItem=null, streetRequest=0, sessionVersion=0;
  const art=window.AlgebraTownArt;
  const demo = {
    role:'student', alias:'Town Explorer', class:'Sample class', balance:20, score:20, owned:[], town:blankTown(),
    missions:[{id:'demo-equations',title:'Solve equations without fractions',coins:10,hints:true,solved:[],complete:false,
      questions:[{eq:'x + 7 = 12'},{eq:'3x - 4 = 11'},{eq:'4x + 1 = 2x + 9'}]}]
  };
  const demoAnswers = [5,5,4];
  const demoDaily={id:'demo-quest',title:'Solve a daily equation',hints:true,coins:3,solved:[],complete:false,questions:[{type:'one',eq:'x + 4 = 9'}]};
  const products=art.catalog, costumes=products.filter(item=>item.slot==='costume');
  const giftCost=15;
  let shopPrices=null,priceRequest=0,giftRequest=null;
  const houseKey=level=>'house-'+level;
  const priceFor=id=>shopPrices?.[id]??null;
  const giftPool=()=>costumes.filter(p=>priceFor(p.id)!==null&&!state.owned.includes(p.id));
  const demoPrices=Object.fromEntries([...products.map(p=>[p.id,p.price]),...art.houses.slice(1).map((h,i)=>[houseKey(i+2),h.price])]);
  function applyTheme(night){
    document.documentElement.dataset.townTheme=night?'night':'day';
    q('mm-theme').setAttribute('aria-pressed',String(night));
    q('mm-theme').textContent=night?'Night mode: on':'Night mode';
  }
  const themeKey='algebra-town-theme';
  let savedTheme;
  try{savedTheme=localStorage.getItem(themeKey);}catch{}
  applyTheme(savedTheme==='night'||(!savedTheme&&matchMedia('(prefers-color-scheme: dark)').matches));
  q('mm-theme').onclick=()=>{
    const night=document.documentElement.dataset.townTheme!=='night';
    applyTheme(night);
    try{localStorage.setItem(themeKey,night?'night':'day');}catch{}
  };
  function selectDestination(selected){
    page.querySelectorAll('[data-town-destination]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.townDestination===selected)));
    page.querySelectorAll('[data-town-panel]').forEach(panel=>panel.hidden=panel.dataset.townPanel!==selected);
  }
  page.querySelectorAll('[data-town-destination]').forEach(b=>b.onclick=()=>{
    const selected=b.dataset.townDestination;
    selectDestination(selected);
    if(selected==='neighbourhood')loadStreet();
    if(selected==='home')loadDailyQuests();
    if(selected==='home'||selected==='cabin'){
      if(!townReady)loadTown();
      else if(!townPending&&(selected==='cabin'||shopPrices===null))refreshShopPrices();
    }
  });
  const street=q('mm-street');
  function renderStreet(residents){
    street.replaceChildren();
    residents.forEach(resident=>{
      const li=el('li','','mm-plot-card');
      const caption=el('div','','mm-plot-caption');
      caption.append(el('strong',resident.alias+(resident.you?' (you)':'')));
      const level=art.houses[resident.level-1]?resident.level:1;
      caption.append(el('small',art.houses[level-1].name+' · Level '+level));
      li.append(caption,art.plot(resident));
      street.append(li);
    });
  }
  async function loadStreet(){
    const request=++streetRequest;
    q('mm-street-status').textContent='Opening the neighbourhood…';
    try{
      const residents=await rpc('mm_town_neighbours');
      if(request!==streetRequest)return;
      renderStreet(residents);
      const count=residents.filter(r=>!r.you).length;
      q('mm-street-status').textContent=count?count+' '+(count===1?'classmate':'classmates')+' in your neighbourhood.':'Classmates will appear after their first sign-in.';
    }catch(error){
      if(request===streetRequest){renderStreet([]);q('mm-street-status').textContent=error.message;}
    }
  }
  async function loadTown(){
    const session=sessionVersion;
    try{
      const profile=await rpc('mm_town_profile');
      if(session!==sessionVersion||state?.role!=='student'||townReady)return;
      if(!profile)throw new Error('Your town profile is unavailable.');
      town=profile;townReady=true;renderTown();await refreshShopPrices();
    }catch(error){
      if(session===sessionVersion&&state?.role==='student')notice(error.message,true);
    }
  }
  async function refreshShopPrices({duringAction=false}={}){
    const session=sessionVersion,request=++priceRequest;
    try{
      const prices=await rpc('mm_shop_prices');
      if(session!==sessionVersion||request!==priceRequest||(townPending&&!duringAction))return;
      shopPrices=prices;
    }catch{
      if(session!==sessionVersion||request!==priceRequest||(townPending&&!duringAction))return;
      shopPrices=null;
    }
    renderTown();
  }
  function resetTown(){
    ++sessionVersion;++streetRequest;town=blankTown();townReady=false;townPending=false;previewItem=null;
    ++priceRequest;shopPrices=null;giftRequest=null;
    ++dailyQuestRequest;dailyQuests=[];dailyDay=null;
    if(upgradeDialog.open)upgradeDialog.close();
    upgradeSelection=null;
    for(const id of ['mm-shop-message','mm-inventory-status','mm-gift-message','mm-gift-reward'])q(id).replaceChildren();
    q('mm-gift-reward').hidden=true;q('mm-gift-odds').open=false;
    q('mm-inventory').hidden=true;q('mm-inventory-toggle').setAttribute('aria-expanded','false');
    renderStreet([]);
    q('mm-town-home').removeAttribute('aria-busy');q('mm-town-cabin').removeAttribute('aria-busy');
  }
  function renderWallet(){
    q('mm-balance').textContent=state.balance;q('mm-score').textContent=state.score;
  }
  async function townAction(work,area='shop',focusId){
    if(townPending||!townReady)return;
    const session=sessionVersion;
    townPending=true;++priceRequest;
    q('mm-town-home').setAttribute('aria-busy','true');q('mm-town-cabin').setAttribute('aria-busy','true');
    renderTown();
    let result;
    try{result=await work();}catch(error){
      result={error:error.message};
      if(error.message.startsWith('The price changed.'))await refreshShopPrices({duringAction:true});
    }
    if(session!==sessionVersion||state?.role!=='student')return;
    townPending=false;
    q('mm-town-home').removeAttribute('aria-busy');q('mm-town-cabin').removeAttribute('aria-busy');
    if(result?.wallet)Object.assign(state,result.wallet);
    if(result?.level)town.level=result.level;
    if(result?.prices)shopPrices=result.prices;
    if(result?.outfit)town.outfit=result.outfit;
    if(result?.owned&&!state.owned.includes(result.owned))state.owned.push(result.owned);
    renderWallet();renderTown();
    const prefix=area==='home'?'mm-':area==='cabin'?'mm-cabin-':null;
    const output=q(prefix?prefix+'upgrade-note':area==='gift'?'mm-gift-message':area==='inventory'?'mm-inventory-status':'mm-shop-message');
    if(!prefix)output.textContent='';
    if(result?.message||result?.error)output.textContent=result.error||result.message;
    if(focusId){
      const target=q(focusId);
      const fallback=prefix?prefix+'house-name':area==='gift'?'mm-gift-title':area==='inventory'?'mm-inventory-toggle':'mm-outfit-title';
      if(!target?.closest('[hidden]'))(target&&!target.disabled?target:q(fallback)).focus({preventScroll:true});
    }
    return result;
  }
  const upgradeDialog=q('mm-upgrade-dialog'), upgradeConfirm=q('mm-upgrade-confirm'), upgradeCancel=q('mm-upgrade-cancel');
  let upgradeSelection=null,upgradePending=false;
  function showUpgrade(selection){
    upgradeSelection=selection;
    q('mm-upgrade-title').textContent='Upgrade your house?';
    q('mm-upgrade-prompt').textContent='Spend '+selection.price+' coins to reveal your next house.';
    q('mm-upgrade-dialog-status').textContent='';
    q('mm-upgrade-art').replaceChildren(art.house(town.level));
    upgradeConfirm.hidden=false;upgradeConfirm.disabled=false;upgradeCancel.disabled=false;
    upgradeCancel.textContent='Keep saving';
    upgradeDialog.showModal();
  }
  upgradeCancel.onclick=()=>upgradeDialog.close();
  upgradeDialog.addEventListener('cancel',e=>{if(upgradePending)e.preventDefault();});
  upgradeDialog.addEventListener('close',()=>{
    const trigger=q(upgradeSelection?.trigger);
    if(trigger&&!trigger.closest('[hidden]'))(trigger.disabled?q(upgradeSelection.area==='home'?'mm-house-name':'mm-cabin-house-name'):trigger).focus({preventScroll:true});
    upgradeSelection=null;
  });
  upgradeConfirm.onclick=async()=>{
    if(!upgradeSelection||upgradePending||townPending)return;
    const {level,price,area,next}=upgradeSelection;
    const session=sessionVersion;
    upgradePending=true;upgradeConfirm.disabled=true;upgradeCancel.disabled=true;
    q('mm-upgrade-dialog-status').textContent='Upgrading your house…';
    const result=await townAction(async()=>{
      const wallet=await rpc('mm_shop_upgrade',{p_next:level,p_price:price});
      return {wallet:{balance:wallet.balance,score:wallet.score},level:wallet.level,prices:wallet.prices,message:next.name+' is ready!'};
    },area);
    upgradePending=false;
    if(session!==sessionVersion||!upgradeDialog.open)return;
    upgradeCancel.disabled=false;upgradeCancel.textContent='Done';
    if(result?.level){
      q('mm-upgrade-title').textContent='House upgraded!';
      q('mm-upgrade-prompt').textContent=next.name+' is ready!';
      q('mm-upgrade-art').replaceChildren(art.house(level));
      q('mm-upgrade-dialog-status').textContent='';
    }else q('mm-upgrade-dialog-status').textContent=result?.error||'Could not upgrade your house. Try again.';
    upgradeConfirm.hidden=true;upgradeCancel.focus();
  };
  function renderHouseUpgrade(prefix,area,current,next){
    q(prefix+'house-name').textContent=current.name;
    q(prefix+'house-level').textContent='Level '+town.level;
    const upgrade=q(prefix+'upgrade-house'),note=q(prefix+'upgrade-note');
    upgrade.hidden=!next;
    if(!next){note.textContent='You’ve reached the final house upgrade!';return;}
    const level=town.level+1,price=priceFor(houseKey(level));
    const missing=price===null?0:Math.max(0,price-state.balance);
    upgrade.textContent=price===null?'Upgrade house':'Upgrade house · '+price+' coins';
    upgrade.disabled=!townReady||townPending||price===null||missing>0;
    note.textContent=price===null?'Upgrade price unavailable. Open Cabin & Shop to retry.':missing?'Earn '+missing+' more '+(missing===1?'coin':'coins')+' to upgrade.':'Your next house is a surprise.';
    upgrade.onclick=()=>showUpgrade({price,level,area,next,trigger:upgrade.id});
  }

  function renderHome(){
    q('mm-home-scene').replaceChildren(art.plot(town));
    q('mm-cabin-house-scene').replaceChildren(art.house(town.level));
    const current=art.houses[town.level-1],next=art.houses[town.level];
    renderHouseUpgrade('mm-','home',current,next);
    renderHouseUpgrade('mm-cabin-','cabin',current,next);
  }
  const sectionNames={tee:'Plain tees',pants:'Simple pants',hat:'Hats',costume:'Costumes'};
  function outfitWith(item){
    const outfit={...town.outfit,[item.slot]:item.id};
    if(item.slot!=='costume')delete outfit.costume;
    return outfit;
  }
  function outfitDescription(outfit){
    if(outfit.costume)return art.byId[outfit.costume]?.name||'Costume';
    const names=['tee','pants','hat'].map(slot=>art.byId[outfit[slot]]?.name).filter(Boolean);
    return names.length?names.join(' · '):'Plain white starter character';
  }
  function renderFittingRoom(){
    const item=art.byId[previewItem],fitting=item?outfitWith(item):town.outfit;
    q('mm-own-avatar').replaceChildren(art.avatar(fitting));
    q('mm-outfit-title').textContent=item?'Trying on: '+item.name:'Your look';
    q('mm-outfit-description').textContent=outfitDescription(fitting);
    const tools=q('mm-outfit-tools');tools.replaceChildren();
    if(item){
      const back=button('Back to my outfit',()=>{
        previewItem=null;renderFittingRoom();
        q('mm-preview-'+item.id)?.focus({preventScroll:true});
      });
      tools.append(back);
    }else if(town.outfit.costume||Object.keys(town.outfit).length){
      const active=town.outfit.costume?['costume']:['tee','pants','hat'];
      active.filter(slot=>town.outfit[slot]).forEach(slot=>{
        const itemId=town.outfit[slot];
        const clear=button('Remove '+(slot==='costume'?'costume':art.byId[itemId]?.name||slot),()=>townAction(async()=>({
          outfit:await rpc('mm_town_equip',{p_slot:slot,p_item:null}),message:'Outfit updated.'
        }),'shop','mm-equip-'+itemId));
        clear.disabled=townPending||!townReady;tools.append(clear);
      });
    }
  }
  function equipped(item){
    return town.outfit[item.slot]===item.id&&(item.slot==='costume'||!town.outfit.costume);
  }
  function wearButton(item,area,worn){
    const equip=button(worn?'Wearing':'Wear',()=>townAction(async()=>{
      const outfit=await rpc('mm_town_equip',{p_slot:item.slot,p_item:item.id});
      previewItem=null;return {outfit,message:'Now wearing '+item.name+'.'};
    },area,equip.id));
    equip.disabled=worn||townPending||!townReady;
    equip.id=(area==='inventory'?'mm-inventory-wear-':'mm-equip-')+item.id;
    equip.setAttribute('aria-label',(worn?'Wearing ':'Wear ')+item.name);
    return equip;
  }
  function renderInventory(){
    const items=q('mm-inventory-items'),owned=products.filter(p=>state.owned.includes(p.id));
    items.replaceChildren();
    if(!owned.length)items.append(el('p','Your wardrobe is empty. Clothes and costumes you collect will appear here.','mm-muted'));
    for(const p of owned){
      const card=el('article','','mm-shop-item'),visual=el('div','','mm-product-art');
      const worn=equipped(p),actions=el('div','','mm-shop-actions');
      visual.append(art.avatar({[p.slot]:p.id}));
      actions.append(wearButton(p,'inventory',worn));
      card.append(visual,el('strong',p.name),el('small',worn?'Equipped':sectionNames[p.slot]),actions);
      items.append(card);
    }
  }
  q('mm-inventory-toggle').onclick=()=>{
    const inventory=q('mm-inventory'),open=inventory.hidden;
    q('mm-inventory-toggle').setAttribute('aria-expanded',String(open));
    inventory.hidden=!open;
  };
  const giftCard=q('mm-gift-card');
  q('mm-gift-art').append(art.gift());
  const oddsFormat=new Intl.NumberFormat('en-SG',{style:'percent',maximumFractionDigits:2});
  function renderGift(){
    const pool=giftPool(),total=pool.reduce((sum,p)=>sum+priceFor(p.id),0);
    q('mm-open-gift').disabled=!townReady||townPending||!pool.length||state.balance<giftCost;
    q('mm-gift-odds').hidden=!pool.length;
    q('mm-gift-odds-list').replaceChildren(...pool.map(p=>{
      const odds=priceFor(p.id)/total;
      return el('li',p.name+' · '+(odds<0.0001?'<0.01%':oddsFormat.format(odds)));
    }));
    q('mm-gift-availability').textContent=shopPrices===null?'Shop prices are unavailable. Reopen Cabin & Shop to retry.':
      !pool.length?'You already own every costume.':
      state.balance<giftCost?'You need '+(giftCost-state.balance)+' more '+(giftCost-state.balance===1?'coin':'coins')+'.':'';
  }
  q('mm-open-gift').onclick=()=>{
    if(!window.confirm('Spend 15 coins on one random costume you don’t own?'))return;
    giftRequest ||= crypto.randomUUID();
    const request=giftRequest, session=sessionVersion;
    q('mm-gift-message').textContent='Opening your gift box…';
    q('mm-gift-reward').hidden=true;
    townAction(async()=>{
      const {item,balance,score}=await rpc('mm_shop_open_gift',{p_request:request});
      if(session!==sessionVersion)return;
      giftRequest=null;
      const costume=art.byId[item],reward=q('mm-gift-reward');
      reward.replaceChildren();
      if(costume){
        reward.append(art.avatar({costume:item}));
        reward.hidden=false;
      }
      return {wallet:{balance,score},owned:item,message:'You found '+(costume?.name||'a new costume')+'! It’s in your inventory.'};
    },'gift','mm-open-gift');
  };
  function renderShop(){
    renderFittingRoom();renderInventory();renderGift();
    const shop=q('mm-shop');shop.replaceChildren();
    Object.entries(sectionNames).forEach(([slot,label])=>{
      const section=el('section','','mm-shop-section');section.id='mm-shop-'+slot;
      section.append(el('h3',label));
      const grid=el('div','','mm-shop-grid');
      if(slot==='costume'){grid.append(giftCard);giftCard.hidden=false;}
      products.filter(p=>p.slot===slot).forEach(p=>{
        const card=el('article','','mm-shop-item'),visual=el('div','','mm-product-art');
        visual.append(art.avatar({[slot]:p.id}));
        const owned=state.owned.includes(p.id),worn=equipped(p),price=priceFor(p.id);
        const tools=el('div','','mm-shop-actions');
        {
          const tryOn=button('Try on',()=>{
            previewItem=p.id;renderFittingRoom();
            const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
            q('mm-outfit-title').focus({preventScroll:true});
            q('mm-own-avatar').scrollIntoView({behavior:reduce?'instant':'smooth',block:'center'});
          });
          tryOn.id='mm-preview-'+p.id;tryOn.setAttribute('aria-label','Try on '+p.name);tools.append(tryOn);
        }
        if(!owned){
          const buy=button(price===null?'Buy':'Buy · '+price+' coins',()=>townAction(async()=>{
            const wallet=await rpc('mm_shop_buy',{p_item:p.id,p_price:price});
            return {wallet,owned:p.id,message:p.name+' purchased.'};
          },'shop','mm-equip-'+p.id));
          buy.disabled=townPending||!townReady||price===null||state.balance<price;
          buy.setAttribute('aria-label',price===null?'Buy '+p.name:'Buy '+p.name+' for '+price+' coins');tools.append(buy);
        }else tools.append(wearButton(p,'shop',worn));
        card.append(visual,el('strong',p.name),el('small',owned?(worn?'Equipped':'Owned'):price===null?'Price unavailable':price+' coins'),tools);
        grid.append(card);
      });
      section.append(grid);shop.append(section);
    });
  }
  function renderTown(){renderHome();renderShop();}
  function demoRpc(name,args){
    const m=demo.missions[0];
    if(name==='mm_state'){
      demo.leaderboard=[{alias:'Map Maker',score:20},{alias:'Trail Scout',score:8},{alias:demo.alias,score:demo.score,you:true}].sort((a,b)=>b.score-a.score);
      return structuredClone(demo);
    }
    if(name==='mm_daily_quests')return {day:singaporeDay.format(new Date()),quests:[demoDaily]};
    if(name==='mm_solve_daily_quest'&&args.p_quest===demoDaily.id&&args.p_index===0&&args.p_answer==='5'){
      const awarded=demoDaily.complete?0:demoDaily.coins;
      demoDaily.solved=[0];demoDaily.complete=true;demo.balance+=awarded;demo.score+=awarded;
      return {complete:true,awarded,balance:demo.balance,score:demo.score};
    }
    if(name==='mm_town_profile')return structuredClone(demo.town);
    if(name==='mm_shop_prices')return {...demoPrices};
    if(name==='mm_shop_open_gift'){
      const pool=costumes.filter(p=>!demo.owned.includes(p.id));
      if(!pool.length||demo.balance<giftCost)throw new Error('The gift box is unavailable.');
      let roll=Math.random()*pool.reduce((sum,p)=>sum+p.price,0);
      const won=pool.find(p=>(roll-=p.price)<0)||pool.at(-1);
      demo.owned.push(won.id);demo.balance-=giftCost;
      return {item:won.id,balance:demo.balance,score:demo.score};
    }
    if(name==='mm_town_neighbours')return [
      {alias:demo.alias,you:true,...structuredClone(demo.town),items:demo.owned},
      {alias:'Mia',level:2,outfit:{hat:'hat-flat',tee:'tee-yellow'},items:[]},
      {alias:'Ari',level:3,outfit:{costume:'costume-princess'},items:[]},
      {alias:'Sam',level:4,outfit:{costume:'costume-snowman'},items:[]},
      {alias:'Pi Pilot',level:8,outfit:{costume:'costume-iron'}},
      {alias:'Quinn',level:2,outfit:{hat:'hat-beanie'}}
    ];
    if(name==='mm_town_equip'){
      const {p_slot:slot,p_item:item}=args;
      if(item&&!demo.owned.includes(item))throw new Error('You do not own that item.');
      if(!item)delete demo.town.outfit[slot];
      else{
        if(slot!=='costume')delete demo.town.outfit.costume;
        demo.town.outfit[slot]=item;
      }
      return structuredClone(demo.town.outfit);
    }
    if(name==='mm_shop_upgrade'){
      const next=art.houses[demo.town.level];
      if(!next||args.p_next!==demo.town.level+1||demo.balance<next.price)throw new Error('You need more coins to upgrade.');
      demo.balance-=next.price;demo.town.level++;
      return {level:demo.town.level,balance:demo.balance,score:demo.score};
    }
    if(name==='mm_solve_answer'&&args.p_mission===m.id&&String(demoAnswers[args.p_index])===args.p_answer){
      if(!m.solved.includes(args.p_index))m.solved.push(args.p_index);
      const awarded=!m.complete&&m.solved.length===m.questions.length?m.coins:0;
      if(awarded){m.complete=true;demo.balance+=awarded;demo.score+=awarded;}
      return {complete:m.complete,awarded};
    }
    if(name==='mm_shop_buy'){
      const product=products.find(item=>item.id===args.p_item);
      if(!product||demo.owned.includes(product.id)||demo.balance<product.price)throw new Error('This item is unavailable.');
      demo.balance-=product.price;demo.owned.push(product.id);return {balance:demo.balance,score:demo.score};
    }
    throw new Error('This action is unavailable in the student preview.');
  }
  q('mm-demo-student').onclick=()=>{
    demoActive=true;resetTown();
    selectDestination('home');
    applyState(demoRpc('mm_state'));
  };
  q('mm-demo-back').onclick=()=>{
    ++run;demoActive=false;state=null;resetTown();notice();view('demo');
  };
  function el(tag, str, className) {
    const node = document.createElement(tag);
    if (str) node.textContent = str;
    if (className) node.className = className;
    return node;
  }
  function notice(message='', error=false) {
    q('mm-notice').textContent = message;
    q('mm-notice').classList.toggle('mm-error',error);
  }
  function button(label, click) {
    const b=el('button',label); b.type='button'; b.onclick=click; return b;
  }
  async function rpc(name,args) {
    if(demoActive)return demoRpc(name,args);
    const {data,error}=await api.rpc(name,args);
    if(error) throw new Error(error.message);
    return data;
  }
  async function busy(control, job) {
    control.disabled=true;notice();
    try { await job(); }
    catch(error){ notice(error.message || 'Please try again.',true); }
    finally { control.disabled=false; }
  }
  const editorTopics={expand:q('mm-topic-expand'),rational:q('mm-topic-rational'),subject:q('mm-topic-subject'),solve:q('mm-topic-solve')};
  let teacherTopic=null, publishing=false;
  function view(role){
    page.querySelectorAll('[data-mm-view]').forEach(node=>node.hidden=node.dataset.mmView!==role);
    if(role!=='teacher')q('mm-builder-park').append(builder);
    builder.hidden=role==='teacher'?!teacherTopic:role!=='demo'&&role!=='play';
    q('mm-logout').hidden=!user;
  }
  function setDraftKey(topic){
    const key='mm-draft:'+user.id+(topic==='solve'?'':':'+topic);
    builder.missionBuilder.draftKey(key,topic==='solve'?'whole':topic);
  }
  const overviewClass=q('mm-overview-class');
  const awardDialog=q('mm-award-dialog'),awardForm=q('mm-award-form');
  let overviewData=null,overviewRequest=0,awardTarget=null,awardPending=false;
  const awardRequests=new Map();
  const nameOrder=(a,b)=>a.alias.localeCompare(b.alias);
  function selectOverviewTab(tab){
    page.querySelectorAll('[data-overview-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.overviewTab===tab)));
    page.querySelectorAll('[data-overview-panel]').forEach(p=>p.hidden=p.dataset.overviewPanel!==tab);
  }
  page.querySelectorAll('[data-overview-tab]').forEach(b=>b.onclick=()=>selectOverviewTab(b.dataset.overviewTab));
  async function loadOverview(){
    const request=++overviewRequest,classId=overviewClass.value;
    const status=q('mm-overview-status'),results=q('mm-overview-results');
    overviewData=null;results.hidden=true;
    status.textContent=classId?'Loading the class overview…':'Choose a class to see its neighbourhood, leaderboard and mission progress.';
    if(!classId)return false;
    try {
      const data=await rpc('mm_teacher_class_overview',{p_class:classId});
      if(request!==overviewRequest||state?.role!=='teacher')return false;
      overviewData=data;
      status.textContent=data.residents.length===1?'1 student on the roster.':data.residents.length+' students on the roster.';
      results.hidden=false;renderOverview();
      return true;
    }catch(error){
      if(request===overviewRequest&&state?.role==='teacher')status.textContent='Could not load the overview: '+error.message;
      return false;
    }
  }
  function renderOverview(){
    renderOverviewStreet();renderOverviewRanks();
    const selector=q('mm-overview-mission'), old=selector.value;
    selector.replaceChildren(...overviewData.missions.map(m=>new Option(m.title+(m.scheduled?' (scheduled)':''),m.id)));
    if(overviewData.missions.some(m=>m.id===old))selector.value=old;
    renderOverviewProgress();
    const history=q('mm-overview-award-history');
    history.replaceChildren(...overviewData.awards.map(a=>el('li',
      a.alias+' · +'+a.coins+' coins · '+a.reason+' · '+releaseFormat.format(new Date(a.date)))));
    if(!history.children.length)history.append(el('li','No teacher awards yet.'));
  }
  function renderOverviewStreet(){
    if(!overviewData)return;
    const list=q('mm-overview-plots'), empty=q('mm-overview-street-empty');
    const search=q('mm-overview-search').value.trim().toLocaleLowerCase();
    const matches=overviewData.residents.filter(s=>s.alias.toLocaleLowerCase().includes(search));
    empty.hidden=Boolean(matches.length);
    empty.textContent=search?'No matching students.':'Add students to this class to see the neighbourhood.';
    list.replaceChildren(...matches.map(s=>{
      const tile=el('li','','mm-plot-card');
      const caption=el('div','','mm-plot-caption');
      caption.append(el('strong',s.alias));
      if(s.id){
        const level=art.houses[s.level-1]?s.level:1;
        caption.append(el('small',art.houses[level-1].name+' · Level '+level));
        const award=button('Award coins',()=>openAward(s));
        award.setAttribute('aria-label','Award coins to '+s.alias);
        tile.append(caption,art.plot(s),award);
      }else{
        caption.append(el('small','Hasn’t signed in yet'));
        tile.append(caption);
      }
      return tile;
    }));
  }
  function row(...values){
    const tr=el('tr');
    tr.append(...values.map(v=>el('td',String(v))));
    return tr;
  }
  function renderOverviewRanks(){
    if(!overviewData)return;
    const sorted=overviewData.residents.filter(s=>s.id).sort((a,b)=>b.score-a.score||nameOrder(a,b));
    const ranks=sorted.map((s,i)=>({...s,rank:i&&sorted[i-1].score===s.score?null:i+1}));
    ranks.forEach((s,i)=>{if(s.rank===null)s.rank=ranks[i-1].rank;});
    if(q('mm-overview-sort').value==='name')ranks.sort(nameOrder);
    const inactive=overviewData.residents.filter(s=>!s.id);
    q('mm-overview-ranking').replaceChildren(...ranks.map(s=>row(s.rank,s.alias,s.score)),
      ...inactive.map(s=>row('—',s.alias,'Hasn’t signed in yet')));
  }
  function renderOverviewProgress(){
    if(!overviewData)return;
    const select=q('mm-overview-mission');
    const mission=overviewData.missions.find(m=>m.id===select.value);
    const table=q('mm-overview-progress-table'),status=q('mm-overview-progress-status');
    select.disabled=!mission;table.hidden=!mission;
    if(!mission){status.textContent='No missions have been created for this class yet.';return;}
    let completed=0;
    const rows=overviewData.residents.map(s=>{
      const solved=s.solved[mission.id]||0;
      const complete=solved>=mission.total;
      if(complete)completed++;
      return row(s.alias,!s.id?'Hasn’t signed in yet':complete?'Completed':solved?'In progress':'Not started',solved+' / '+mission.total);
    });
    q('mm-overview-progress-rows').replaceChildren(...rows);
    status.textContent=(mission.scheduled?'Scheduled · ':'')+completed+' of '+rows.length+' completed';
  }
  function openAward(student){
    awardTarget={student,classId:overviewClass.value};
    awardForm.reset();q('mm-award-status').textContent='';
    q('mm-award-title').textContent='Award coins to '+student.alias;
    awardDialog.showModal();
    awardForm.elements.coins.focus();
  }
  q('mm-award-cancel').onclick=()=>{if(!awardPending)awardDialog.close();};
  awardDialog.addEventListener('cancel',e=>{if(awardPending)e.preventDefault();});
  awardForm.onsubmit=async e=>{
    e.preventDefault();
    if(awardPending||!awardTarget||state?.role!=='teacher')return;
    const {student,classId}=awardTarget;
    const reason=awardForm.elements.reason.value.trim(),coins=Number(awardForm.elements.coins.value);
    const status=q('mm-award-status');
    if(!reason){status.textContent='Enter a short reason for the award.';return;}
    const requestKey=JSON.stringify([user.id,classId,student.id,coins,reason]);
    const requestId=awardRequests.get(requestKey)||crypto.randomUUID();
    awardRequests.set(requestKey,requestId);
    awardPending=true;
    const controls=Array.from(awardForm.elements);
    controls.forEach(c=>c.disabled=true);
    status.textContent='Awarding coins…';
    try{
      await rpc('mm_teacher_award_coins',{p_class:classId,p_student:student.id,p_coins:coins,p_reason:reason,p_request:requestId});
      awardRequests.delete(requestKey);
      if(state?.role!=='teacher')return;
      awardDialog.close();
      q('mm-overview-refresh').focus();
      const refreshed=await loadOverview();
      if(refreshed)q('mm-overview-status').textContent=coins+' '+(coins===1?'coin':'coins')+' awarded to '+student.alias+'.';
    }catch(error){
      if(awardDialog.open)status.textContent='Could not confirm the award: '+error.message+' You can retry.';
    }finally{
      awardPending=false;controls.forEach(c=>c.disabled=false);
    }
  };
  overviewClass.onchange=()=>{q('mm-overview-search').value='';loadOverview();};
  q('mm-overview-refresh').onclick=loadOverview;
  q('mm-overview-search').oninput=renderOverviewStreet;
  q('mm-overview-sort').onchange=renderOverviewRanks;
  q('mm-overview-mission').onchange=renderOverviewProgress;
  function teacherSection(section){
    const sections={classes:['mm-teacher-classes','mm-manage-classes'],missions:['mm-teacher-missions','mm-create-missions'],overview:['mm-teacher-overview','mm-open-overview'],prices:['mm-teacher-prices','mm-open-prices']};
    for(const [key,[panel,control]] of Object.entries(sections)){
      q(panel).hidden=key!==section;
      q(control).setAttribute('aria-pressed',String(key===section));
    }
  }
  const pricesForm=q('mm-prices-form'),pricesStatus=q('mm-prices-status');
  let teacherPrices=null,teacherPriceRequest=0;
  function renderTeacherPrices(){
    const fields=(entries,container)=>{
      q(container).replaceChildren(...entries.map(([id,name])=>{
        const label=el('label'),input=el('input');
        label.append(el('span',name));
        input.type='number';input.name=id;input.min=1;input.max=9999;input.step=1;
        input.required=true;input.value=teacherPrices[id];label.append(input);
        return label;
      }));
    };
    fields(costumes.map(p=>[p.id,p.name]),'mm-price-costumes');
    fields(art.houses.slice(1).map((h,i)=>[houseKey(i+2),'Level '+(i+2)+' · '+h.name]),'mm-price-houses');
  }
  async function loadTeacherPrices(){
    const request=++teacherPriceRequest;
    pricesForm.hidden=true;q('mm-prices-reload').hidden=true;pricesStatus.textContent='Loading prices…';
    try{
      const data=await rpc('mm_shop_prices');
      if(request!==teacherPriceRequest||state?.role!=='teacher')return;
      teacherPrices=data;renderTeacherPrices();
      pricesStatus.textContent='';pricesForm.hidden=false;
    }catch(error){
      if(request!==teacherPriceRequest||state?.role!=='teacher')return;
      pricesStatus.textContent='Could not load prices: '+error.message;q('mm-prices-reload').hidden=false;
    }
  }
  q('mm-prices-reload').onclick=loadTeacherPrices;
  q('mm-open-prices').onclick=()=>{
    if(!q('mm-teacher-prices').hidden)return;
    teacherSection('prices');
    if(!teacherPrices)loadTeacherPrices();
  };
  pricesForm.onsubmit=async e=>{
    e.preventDefault();
    const request=++teacherPriceRequest;
    const changes=Object.fromEntries([...new FormData(pricesForm)].map(([id,value])=>[id,Number(value)]).filter(([id,value])=>value!==teacherPrices[id]));
    if(!Object.keys(changes).length){pricesStatus.textContent='No price changes to save.';return;}
    const controls=[...pricesForm.querySelectorAll('input,button')];controls.forEach(c=>c.disabled=true);
    pricesStatus.textContent='Saving prices…';
    try{
      const data=await rpc('mm_teacher_save_shop_prices',{p_prices:changes});
      if(request!==teacherPriceRequest||state?.role!=='teacher')return;
      teacherPrices=data;renderTeacherPrices();pricesStatus.textContent='Shop prices saved.';
    }catch(error){
      if(request===teacherPriceRequest&&state?.role==='teacher')pricesStatus.textContent='Could not save prices: '+error.message;
    }finally{controls.forEach(c=>c.disabled=false);}
  };
  function openTopic(topic){
    if(publishing)return;
    teacherTopic=topic;
    for(const [key,details] of Object.entries(editorTopics))details.open=key===topic;
    if(!topic){builder.hidden=true;return;}
    editorTopics[topic].querySelector('[data-mm-topic-editor]').append(builder);
    setDraftKey(topic);
    configureBuilder();
    builder.hidden=false;
  }
  q('mm-manage-classes').onclick=()=>teacherSection('classes');
  q('mm-create-missions').onclick=()=>{teacherSection('missions');if(!questSettingsLoaded)loadQuestSettings();};
  q('mm-open-overview').onclick=()=>{teacherSection('overview');loadOverview();};
  Object.entries(editorTopics).forEach(([topic,details])=>{
    details.querySelector('summary').onclick=e=>{e.preventDefault();openTopic(details.open?null:topic);};
  });
  function demoTopic(topic){
    q('mm-demo-solve').setAttribute('aria-pressed',String(topic==='solve'));
    q('mm-demo-expand').setAttribute('aria-pressed',String(topic==='expand'));
    q('mm-demo-rational').setAttribute('aria-pressed',String(topic==='rational'));
    q('mm-demo-subject').setAttribute('aria-pressed',String(topic==='subject'));
    builder.missionBuilder.draftKey('mm-demo-draft'+(topic==='solve'?'':':'+topic),topic==='solve'?'whole':topic);
  }
  q('mm-demo-solve').onclick=()=>demoTopic('solve');
  q('mm-demo-expand').onclick=()=>demoTopic('expand');
  q('mm-demo-rational').onclick=()=>demoTopic('rational');
  q('mm-demo-subject').onclick=()=>demoTopic('subject');
  function fillClasses(control,preferred){
    control.replaceChildren(new Option('Select a class',''));
    state.classes.forEach(c=>control.add(new Option(c.label,c.id)));
    control.value=state.classes.some(c=>c.id===preferred)?preferred:(state.classes.length===1?state.classes[0].id:'');
  }
  const releaseFormat=new Intl.DateTimeFormat('en-SG',{
    dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'
  });
  function configureBuilder(){
    builder.missionBuilder.teacher(state.classes, async (draft,publishButton)=>{
      if(publishing)return;
      publishing=true;publishButton.disabled=true;
      try {
        await rpc('mm_publish_mission',{
          p_class:draft.className,p_title:draft.title,p_coins:draft.coins,p_hints:draft.hints,
          p_questions:draft.questions,p_release_at:draft.releaseAt,p_mode:draft.mode
        });
      } catch(error){
        builder.missionBuilder.publishError(error.message);
        return;
      } finally { publishButton.disabled=false;publishing=false; }
      builder.missionBuilder.published(Boolean(draft.releaseAt));
      notice(draft.releaseAt?'Mission scheduled for '+releaseFormat.format(new Date(draft.releaseAt))+' (Singapore time).':'Mission published.');
      try{
        state=await rpc('mm_state');
        renderTeacher();
      }catch{
        notice('Mission saved. Refresh the page to update your mission list.');
      }
    });
  }
  const questDialog=q('mm-quest-settings'),questForm=q('mm-quest-form');
  let questSettings={},questSettingsLoaded=false,questSettingsRequest=0,questSource=null,questSaving=false;
  async function loadQuestSettings(){
    const request=++questSettingsRequest;
    try{
      const data=await rpc('mm_teacher_daily_quests');
      if(request!==questSettingsRequest||state?.role!=='teacher')return;
      questSettings=data;questSettingsLoaded=true;renderTeacher();
    }catch{
      if(request===questSettingsRequest&&state?.role==='teacher')q('mm-quest-teacher-note').textContent='Could not load daily quest settings. Reopen Create missions to retry.';
    }
  }
  function openQuestSettings(mission){
    if(!questSettingsLoaded){loadQuestSettings();return;}
    questSource=mission;
    const saved=questSettings[mission.id];
    q('mm-quest-settings-title').textContent=saved?'Edit daily quest':'Create daily quest';
    q('mm-quest-source').textContent=mission.title+' · '+mission.class+' · '+mission.questions.length+' questions';
    questForm.elements.coins.value=saved?.coins??Math.min(100,Math.max(1,mission.coins));
    questForm.elements.enabled.checked=saved?.enabled??true;
    q('mm-quest-save-status').textContent='';
    questDialog.showModal();questForm.elements.coins.focus();
  }
  q('mm-quest-cancel').onclick=()=>questDialog.close();
  questDialog.addEventListener('cancel',e=>{if(questSaving)e.preventDefault();});
  questForm.onsubmit=async e=>{
    e.preventDefault();
    if(!questSource||questSaving||state?.role!=='teacher')return;
    const m=questSource, teacher=user?.id;
    const coins=Number(questForm.elements.coins.value),enabled=questForm.elements.enabled.checked;
    const controls=[...questForm.elements];controls.forEach(c=>c.disabled=true);
    questSaving=true;q('mm-quest-save-status').textContent='Saving…';
    try{
      const result=await rpc('mm_save_daily_quest',{p_mission:m.id,p_coins:coins,p_enabled:enabled});
      if(state?.role!=='teacher'||teacher!==user?.id)return;
      questSettings[m.id]=result;questDialog.close();renderTeacher();
      q('mm-quest-for-'+m.id)?.focus();
      notice(enabled?'Daily quest saved.':'Daily quest paused for future days.');
    }catch(error){if(questDialog.open)q('mm-quest-save-status').textContent=error.message;}
    finally{questSaving=false;controls.forEach(c=>c.disabled=false);}
  };
  function renderTeacher(){
    fillClasses(overviewClass,overviewClass.value);
    const cls=q('mm-roster-class');fillClasses(cls,cls.value);
    const loginClass=q('mm-login-roster-class'), oldClass=loginClass.value;
    fillClasses(loginClass,oldClass);
    if(loginClass.value!==oldClass)clearLoginRoster();
    if(teacherTopic)configureBuilder();
    if(questSettingsLoaded)q('mm-quest-teacher-note').textContent='';
    const list=q('mm-published');
    list.replaceChildren();
    if(!state.missions.length){list.append(el('p','No class missions yet.','mm-muted'));return;}
    const groups=new Map();
    for(const cls of state.classes)groups.set(cls.id,{label:cls.label,missions:[]});
    for(const m of state.missions){
      const key=m.classId||m.class;
      if(!groups.has(key))groups.set(key,{label:m.class,missions:[]});
      groups.get(key).missions.push(m);
    }
    for(const {label,missions} of groups.values()){
      if(!missions.length)continue;
      const section=el('section','','mm-class-mission-group');
      section.append(el('h3',label));
      missions.forEach(m=>renderTeacherMission(section,m));
      list.append(section);
    }
  }
  function renderTeacherMission(list,m){
      const row=el('div','','mm-row mm-mission mm-teacher-mission');
      const details=el('div');
      details.append(el('strong',m.title),el('small',m.coins+' coins · '+m.completed+' completed'));
      if(m.questions?.some(q=>q.type?.startsWith('subject-')||q.type?.startsWith('fraction-')||['one','two','both','brackets'].includes(q.type)))details.append(el('small',m.mode==='guided'?'Guided · Calculate for me':'Unguided · I’ll write the working'));
      if(m.releaseAt){
        details.append(el('small',(m.scheduled?'Scheduled for ':'Released ')+releaseFormat.format(new Date(m.releaseAt))+' (Singapore time)'));
      }
      row.append(details);
      const actions=el('div','','mm-row mm-mission-actions');
      if(m.questions?.length)actions.append(button('Duplicate',()=>{
        if(publishing)return;
        const topic=m.questions.some(question=>question.type?.startsWith('subject-'))?'subject':m.questions.some(question=>question.type?.startsWith('rational-'))?'rational':m.questions.some(question=>question.type?.startsWith('expand-'))?'expand':'solve';
        teacherSection('missions');openTopic(topic);builder.missionBuilder.duplicate(m);
      }));
      if(m.questions?.length&&questSettingsLoaded){
        const saved=questSettings[m.id];
        if(saved)details.append(el('small',saved.enabled?'Daily quest · '+saved.coins+' coins':'Daily quest paused'));
        const questButton=button(saved?'Edit daily quest':'Create daily quest',()=>openQuestSettings(m));
        questButton.id='mm-quest-for-'+m.id;actions.append(questButton);
      }
      const remove=button('Delete',()=>{
        if(!window.confirm('Delete “'+m.title+'” for '+m.class+'? It will be removed from Mission Hall. Students keep coins already earned.'))return;
        busy(remove,async()=>{
          await rpc('mm_delete_mission',{p_mission:m.id});
          state.missions=state.missions.filter(item=>item.id!==m.id);
          renderTeacher();
          q('mm-class-missions-title').focus();
          notice('Mission deleted. Students keep coins already earned.');
        });
      });
      remove.className='mm-delete-mission';
      remove.setAttribute('aria-label','Delete mission: '+m.title);
      actions.append(remove);row.append(actions);
      list.append(row);
  }
  q('mm-refresh-missions').onclick=()=>busy(q('mm-refresh-missions'),async()=>{
    const next=await rpc('mm_state');
    if(next.role==='student'&&!q('mm-view-student').hidden){state=next;renderStudent();}
  });
  let dailyQuests=[],dailyDay=null,dailyQuestRequest=0;
  async function loadDailyQuests(){
    if(state?.role!=='student')return;
    const request=++dailyQuestRequest,session=sessionVersion;
    q('mm-quest-status').textContent=dailyDay?'':'Loading today’s quests…';
    try{
      const data=await rpc('mm_daily_quests');
      if(request!==dailyQuestRequest||session!==sessionVersion||state?.role!=='student')return;
      dailyDay=data.day;dailyQuests=data.quests.map(m=>({...m,daily:true}));
      renderDailyQuests();
    }catch{
      if(request===dailyQuestRequest&&session===sessionVersion)q('mm-quest-status').textContent='Could not load today’s quests. Use Refresh quests to try again.';
    }
  }
  q('mm-refresh-quests').onclick=loadDailyQuests;
  const singaporeDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'});
  function checkNewDay(){
    if(state?.role==='student'&&!q('mm-view-student').hidden&&dailyDay&&singaporeDay.format(new Date())!==dailyDay)loadDailyQuests();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNewDay();});
  setInterval(checkNewDay,60000);
  function renderDailyQuests(){
    const list=q('mm-quests');list.replaceChildren();
    q('mm-quest-status').textContent=dailyDay&&!dailyQuests.length?'No daily quests have been set for your class.':'';
    for(const quest of dailyQuests)renderActivity(list,quest);
  }
  function renderActivity(list,m){
    const row=el('article','','mm-activity');
    const reward=el('span','','mm-activity-reward');
    reward.setAttribute('role','img');
    reward.setAttribute('aria-label',m.coins+(m.coins===1?' coin':' coins'));
    const icon=el('i','','mm-coin'),amount=el('b',String(m.coins));
    icon.setAttribute('aria-hidden','true');amount.setAttribute('aria-hidden','true');
    reward.append(icon,amount);
    const name=el('div','','mm-activity-title');
    name.append(el('strong',m.title),el('small',m.complete?'Completed':m.solved.length+' / '+m.questions.length+' solved'));
    const progress=el('progress','','mm-meter');
    progress.max=m.questions.length;progress.value=m.solved.length;
    progress.setAttribute('aria-label','Questions solved: '+m.title);
    if(!m.complete&&m.solved.length)name.append(progress);
    const start=button(m.complete?'Practise again':m.solved.length?'Continue':'Start',()=>play(m));
    start.className='mm-activity-action';
    if(m.complete)row.classList.add('mm-activity-complete');
    row.append(reward,name,start);list.append(row);
  }
  function renderStudent(){
    q('mm-student-name').textContent=state.alias+' · '+state.class;
    q('mm-demo-note').hidden=!demoActive;
    q('mm-demo-back').hidden=!demoActive;
    renderWallet();
    const missions=q('mm-missions');missions.replaceChildren();
    const completed=q('mm-completed-missions');completed.replaceChildren();
    const current=state.missions.filter(m=>!m.complete);
    const finished=state.missions.filter(m=>m.complete);
    if(!current.length)missions.append(el('p',finished.length?'You’re all caught up!':'Your teacher hasn’t published any missions yet.','mm-muted'));
    if(!finished.length)completed.append(el('p','Your completed missions will appear here.','mm-muted'));
    const topicOrder=m=>m.questions[0]?.type?.startsWith('expand-')?0:m.questions[0]?.type?.startsWith('rational-')?1:2;
    current.sort((a,b)=>topicOrder(a)-topicOrder(b)).forEach(m=>renderActivity(missions,m));
    finished.forEach(m=>renderActivity(completed,m));
    renderDailyQuests();
    const list=q('mm-leaderboard');list.replaceChildren();
    state.leaderboard.forEach((s,i,a)=>{
      const rank=a.findIndex(x=>x.score===s.score)+1;
      const item=el('li',rank+'. '+s.alias+(s.you?' (you)':'')+' · '+s.score);
      if(s.you)item.className='mm-you';
      list.append(item);
    });
    renderTown();
  }
  async function play(mission){
    const myRun=++run;
    view('play');builder.hidden=false;
    builder.missionBuilder.play(mission,async (i,answer)=>{
      if(mission.solved.includes(i))return {message:'Already saved. Keep practising!'};
      const result=mission.daily
        ?await rpc('mm_solve_daily_quest',{p_quest:mission.id,p_index:i,p_answer:answer})
        :await rpc('mm_solve_answer',{p_mission:mission.id,p_index:i,p_answer:answer});
      mission.solved.push(i);mission.complete=result.complete;
      if(myRun!==run)return {message:''};
      if(Number.isFinite(result.balance))state.balance=result.balance;
      if(Number.isFinite(result.score))state.score=result.score;
      return result.complete?{message:mission.daily?'All answers saved. Complete the daily quest to celebrate!':'All answers saved. Complete the mission to celebrate!',completion:{coins:result.awarded||0}}:{message:'Question saved.'};
    },async ()=>{
      ++run;
      builder.missionBuilder.exit();
      selectDestination('home');view('student');renderStudent();loadDailyQuests();
      try{state=await rpc('mm_state');if(q('mm-view-student').hidden===false)renderStudent();}
      catch(e){notice(e.message,true);}
    });
  }
  function applyState(next){
    state=next;view(state.role);
    if(state.role==='teacher')renderTeacher();
    if(state.role==='student'){selectDestination('home');renderStudent();loadTown();loadDailyQuests();}
  }
  q('mm-class-form').onsubmit=e=>{
    e.preventDefault();const form=e.currentTarget;
    busy(e.submitter,async()=>{await rpc('mm_create_class',{p_label:q('mm-class-name').value});form.reset();applyState(await rpc('mm_state'));notice('Class created.');});
  };
  q('mm-roster-form').onsubmit=e=>{
    e.preventDefault();
    busy(e.submitter,async()=>{
      const lines=q('mm-roster').value.trim().split(/\r?\n/).filter(line=>line.trim());
      const entries=lines.map((line,i)=>{
        const fields=line.split(line.includes('\t')?'\t':',').map(field=>field.trim());
        if(fields.length!==2||fields.some(field=>!field))throw new Error('Line '+(i+1)+' needs a school email and nickname.');
        return {email:fields[0],alias:fields[1]};
      });
      const added=await rpc('mm_add_roster',{p_class:q('mm-roster-class').value,p_entries:entries});
      q('mm-roster').value='';
      notice(added+' students added. Students can now sign in with Google.');
    });
  };
  const loginClass=()=>q('mm-login-roster-class').value;
  function clearLoginRoster(){
    q('mm-login-roster-result').hidden=true;
    q('mm-teacher-code-input').value='';
    q('mm-login-names').value='';
  }
  q('mm-login-roster-class').onchange=clearLoginRoster;
  function renderLoginRoster(result,cls){
    q('mm-login-roster-result').hidden=!result.code;
    q('mm-teacher-class-code').textContent=result.code||'';
    q('mm-teacher-code-input').value=result.code||'';
    const list=q('mm-login-roster-list');list.replaceChildren();
    for(const member of result.members){
      const li=el('li','','mm-row');
      li.append(el('span',member.alias+' · '+member.status));
      if(member.status==='Password set'){
        const reset=button('Reset password',()=>{
          if(!confirm('Reset the password for '+member.alias+'? They can choose a new one from the class list.'))return;
          busy(reset,async()=>{
            const {data,error}=await api.auth.getSession();
            if(error||!data.session?.access_token)throw new Error('Sign in again as a teacher to reset passwords.');
            await classLogin({action:'reset',classId:cls,member:member.id},data.session.access_token);
            if(state?.role==='teacher'&&loginClass()===cls)await readLoginRoster(cls);
            notice('Password reset. '+member.alias+' can now choose a new password.');
          });
        });
        reset.setAttribute('aria-label','Reset password for '+member.alias);li.append(reset);
      }
      list.append(li);
    }
  }
  async function readLoginRoster(cls,names=null,code=null){
    const result=await rpc('mm_class_login_manage',{p_class:cls,p_names:names,p_code:code});
    if(state?.role==='teacher'&&loginClass()===cls)renderLoginRoster(result,cls);
    return result;
  }
  q('mm-load-login-roster').onclick=()=>busy(q('mm-load-login-roster'),async()=>{
    const cls=loginClass();
    if(!cls)throw new Error('Choose a class first.');
    const result=await readLoginRoster(cls);
    if(!result.code&&loginClass()===cls)notice('Class login is not set up yet. Choose a class code and save the roster.');
  });
  q('mm-login-roster-form').onsubmit=e=>{
    e.preventDefault();
    const cls=loginClass();
    busy(e.submitter,async()=>{
      const names=q('mm-login-names').value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean);
      await readLoginRoster(cls,names,q('mm-teacher-code-input').value.trim());
      if(loginClass()===cls){q('mm-login-names').value='';notice('Class login roster saved.');}
    });
  };
  let activeRoom='', setupMode=false, roomRequest=0, loginMembers=new Map();
  const classMemoryKey='algebra-town-remembered-class';
  q('mm-remember-class').onchange=()=>{
    if(!q('mm-remember-class').checked)try{localStorage.removeItem(classMemoryKey);}catch{}
    else if(activeRoom)try{localStorage.setItem(classMemoryKey,activeRoom);}catch{}
  };
  function setSetupMode(enabled){
    setupMode=enabled;
    q('mm-setup-help').hidden=!enabled;
    q('mm-password').value='';q('mm-password').autocomplete=enabled?'new-password':'current-password';
    q('mm-password-label').textContent=enabled?'Choose a password':'Password';
    q('mm-password-submit').textContent=enabled?'Set password and sign in':'Sign in';
  }
  function updateLoginMember(){
    const member=loginMembers.get(q('mm-login-member').value);
    q('mm-password-fields').hidden=!member;
    setSetupMode(Boolean(member?.needsSetup));
  }
  q('mm-login-member').onchange=updateLoginMember;
  function showLoginStep(next,animate){
    const first=q('mm-class-code-form'), second=q('mm-password-form');
    first.hidden=next;second.hidden=!next;
    q('mm-login-step').textContent=next?'Step 2 of 2 · Name and password':'Step 1 of 2 · Class code';
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      (next?second:first).animate(
        [{transform:'translateX('+(next?22:-22)+'px)',opacity:.2},{transform:'translateX(0)',opacity:1}],
        {duration:240,easing:'ease-out'});
    }
  }
  async function classLogin(data,accessToken){
    const headers={'Content-Type':'application/json',apikey:config.publishableKey};
    if(accessToken)headers.Authorization='Bearer '+accessToken;
    const response=await fetch(config.url.replace(/\/+$/,'')+'/functions/v1/algebra-town-login',{
      method:'POST',headers,body:JSON.stringify(data)
    });
    let result;
    try{result=await response.json();}catch{throw new Error('Class login is unavailable. Ask your teacher or use Google.');}
    if(!response.ok){
      const error=new Error(result.error||result.message||'Class login is unavailable. Ask your teacher or use Google.');
      error.reloadClass=result.reloadClass||result.passwordSaved;
      throw error;
    }
    return result;
  }
  q('mm-class-code').oninput=()=>{
    ++roomRequest;activeRoom='';loginMembers.clear();
    q('mm-login-member').replaceChildren();q('mm-login-class-name').textContent='';updateLoginMember();
  };
  q('mm-change-class').onclick=()=>{
    notice();++roomRequest;activeRoom='';loginMembers.clear();
    q('mm-login-member').replaceChildren();updateLoginMember();showLoginStep(false,true);
    q('mm-class-code').focus();
  };
  async function findClass(code,focus=true,selected=''){
    const request=++roomRequest;
    const result=await classLogin({action:'names',room:code});
    if(request!==roomRequest)return;
    const select=q('mm-login-member');select.replaceChildren(new Option('Select your name',''));
    loginMembers=new Map(result.members.map(member=>[member.id,member]));
    for(const member of result.members)select.add(new Option(member.alias,member.id));
    if(!result.members.length){notice('There are no names on this class list yet.',true);return;}
    select.value=loginMembers.has(selected)?selected:'';
    activeRoom=code;
    if(q('mm-remember-class').checked)try{localStorage.setItem(classMemoryKey,code);}catch{}
    q('mm-login-class-name').textContent=result.className;
    updateLoginMember();
    showLoginStep(true,focus);
    if(focus)select.focus();
  }
  q('mm-class-code-form').onsubmit=e=>{
    e.preventDefault();
    busy(e.submitter,()=>findClass(q('mm-class-code').value.trim()));
  };
  q('mm-password-form').onsubmit=e=>{
    e.preventDefault();
    busy(e.submitter,async()=>{
      const room=activeRoom, member=q('mm-login-member').value, request=roomRequest;
      if(!room||!member)return;
      let result;
      try{
        result=await classLogin({action:setupMode?'setup':'login',room,member,password:q('mm-password').value});
      }catch(error){
        if(error.reloadClass&&request===roomRequest)await findClass(room,false,member).catch(()=>{});
        throw error;
      }
      if(request!==roomRequest)return;
      setSetupMode(false);
      const {data,error}=await api.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
      if(error)throw error;
      user=data.session?.user||data.user;
      if(!user)throw new Error('Could not open your session. Try signing in again.');
      const signedInMember=loginMembers.get(member);
      if(signedInMember)signedInMember.needsSetup=false;
      q('mm-login-member').value='';updateLoginMember();
      await loadState();
    });
  };
  async function loadState(){
    let next=await rpc('mm_state');
    if(next.role==='join' && await rpc('mm_enrol'))next=await rpc('mm_state');
    applyState(next);
  }
  q('mm-check-roster').onclick=()=>busy(q('mm-check-roster'),loadState);
  q('mm-login').onclick=()=>busy(q('mm-login'),async()=>{
    const redirectTo = new URL('index.html',location.href).href;
    const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if(error)throw error;
  });
  q('mm-logout').onclick=()=>busy(q('mm-logout'),async()=>{
    const {error}=await api.auth.signOut();if(error)throw error;
    ++run;++overviewRequest;++teacherPriceRequest;++questSettingsRequest;questSettingsLoaded=false;questSettings={};if(questDialog.open)questDialog.close();teacherPrices=null;overviewData=null;awardRequests.clear();if(awardDialog.open)awardDialog.close();user=null;state=null;resetTown();selectDestination('home');builder.missionBuilder.exit();openTopic(null);teacherSection('classes');view('login');q('mm-roster').value='';clearLoginRoster();q('mm-login-member').value='';updateLoginMember();
  });
  (async()=>{
    if(!config.url&&!config.publishableKey){
      view('demo');demoTopic('solve');
      return;
    }
    view('login');
    if(!window.supabase||!/^https:\/\//.test(config.url)||!config.publishableKey||config.publishableKey.startsWith('sb_secret_')){
      notice('Check the Supabase URL and publishable key in config.js.',true);q('mm-login').disabled=true;q('mm-class-code-form').querySelector('button').disabled=true;return;
    }
    api=window.supabase.createClient(config.url,config.publishableKey,{auth:{flowType:'pkce'}});
    try {
      const {data,error}=await api.auth.getSession();
      if(error)throw error;
      user=data.session?.user||null;
      if(user){q('mm-logout').hidden=false;await loadState();}
      else if(new URLSearchParams(location.search).has('error'))notice('Google sign-in did not complete. Try again or check with your teacher.',true);
      else{
        let remembered=null;
        try{remembered=localStorage.getItem(classMemoryKey);}catch{}
        if(remembered&&!q('mm-class-code').value){
          q('mm-class-code').value=remembered;q('mm-remember-class').checked=true;
          await findClass(remembered,false);
        }
      }
    }catch(error){notice(error.message,true);}
  })();
})();

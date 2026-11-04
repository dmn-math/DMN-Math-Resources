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
  const products=art.catalog;
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
    if((selected==='home'||selected==='cabin')&&!townReady)loadTown();
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
      town=profile;townReady=true;renderTown();
    }catch(error){
      if(session===sessionVersion&&state?.role==='student')notice(error.message,true);
    }
  }
  function resetTown(){
    ++sessionVersion;++streetRequest;town=blankTown();townReady=false;townPending=false;previewItem=null;
    q('mm-shop-message').textContent='';renderStreet([]);
    q('mm-town-home').removeAttribute('aria-busy');q('mm-town-cabin').removeAttribute('aria-busy');
  }
  function renderWallet(){
    q('mm-balance').textContent=state.balance;q('mm-score').textContent=state.score;
  }
  async function townAction(work,area='shop',focusId){
    if(townPending||!townReady)return;
    const session=sessionVersion;
    townPending=true;
    q('mm-shop-message').textContent='';
    q('mm-town-home').setAttribute('aria-busy','true');q('mm-town-cabin').setAttribute('aria-busy','true');
    renderTown();
    let result;
    try{result=await work();}catch(error){result={error:error.message};}
    if(session!==sessionVersion||state?.role!=='student')return;
    townPending=false;
    q('mm-town-home').removeAttribute('aria-busy');q('mm-town-cabin').removeAttribute('aria-busy');
    if(result?.wallet)Object.assign(state,result.wallet);
    if(result?.level)town.level=result.level;
    if(result?.outfit)town.outfit=result.outfit;
    if(result?.owned&&!state.owned.includes(result.owned))state.owned.push(result.owned);
    renderWallet();renderTown();
    const output=q(area==='home'?'mm-upgrade-note':'mm-shop-message');
    if(result?.message||result?.error)output.textContent=result.error||result.message;
    if(focusId){
      const target=q(focusId);
      (target&&!target.disabled&&!target.hidden?target:q(area==='home'?'mm-house-name':'mm-outfit-title')).focus({preventScroll:true});
    }
  }
  function renderHome(){
    q('mm-home-scene').replaceChildren(art.plot(town));
    const current=art.houses[town.level-1],next=art.houses[town.level];
    q('mm-house-name').textContent=current.name;q('mm-house-level').textContent='Level '+town.level;
    const upgrade=q('mm-upgrade-house'), note=q('mm-upgrade-note');
    upgrade.hidden=!next;
    if(next){
      const missing=Math.max(0,next.price-state.balance);
      upgrade.textContent='Upgrade house · '+next.price+' coins';
      upgrade.disabled=!townReady||townPending||missing>0;
      note.textContent=!townReady?'Loading your home…':missing?'Earn '+missing+' more '+(missing===1?'coin':'coins')+' to upgrade.':'Your next house is a surprise.';
      const level=town.level+1;
      upgrade.onclick=()=>{
        if(!window.confirm('Spend '+next.price+' coins to reveal your next house?'))return;
        townAction(async()=>{
          const wallet=await rpc('mm_town_upgrade',{p_next:level});
          return {wallet:{balance:wallet.balance,score:wallet.score},level:wallet.level,message:next.name+' is ready!'};
        },'home','mm-upgrade-house');
      };
    }else note.textContent='You’ve reached the final house upgrade!';
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
  function renderShop(){
    renderFittingRoom();
    const shop=q('mm-shop');shop.replaceChildren();
    Object.entries(sectionNames).forEach(([slot,label])=>{
      const section=el('section','','mm-shop-section');section.id='mm-shop-'+slot;
      section.append(el('h3',label));
      const grid=el('div','','mm-shop-grid');
      products.filter(p=>p.slot===slot).forEach(p=>{
        const card=el('article','','mm-shop-item'),visual=el('div','','mm-product-art');
        visual.append(art.avatar({[slot]:p.id}));
        const owned=state.owned.includes(p.id),worn=town.outfit[slot]===p.id&&(slot==='costume'||!town.outfit.costume);
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
          const buy=button('Buy · '+p.price+' coins',()=>townAction(async()=>{
            const wallet=await rpc('mm_buy',{p_item:p.id});
            return {wallet,owned:p.id,message:p.name+' purchased.'};
          },'shop','mm-equip-'+p.id));
          buy.disabled=townPending||!townReady||state.balance<p.price;
          buy.setAttribute('aria-label','Buy '+p.name+' for '+p.price+' coins');tools.append(buy);
        }else{
          const equip=button(worn?'Wearing':'Wear',()=>townAction(async()=>{
            const outfit=await rpc('mm_town_equip',{p_slot:slot,p_item:p.id});
            previewItem=null;return {outfit,message:'Now wearing '+p.name+'.'};
          },'shop','mm-equip-'+p.id));
          equip.disabled=worn||townPending||!townReady;equip.id='mm-equip-'+p.id;
          equip.setAttribute('aria-label',(worn?'Wearing ':'Wear ')+p.name);tools.append(equip);
        }
        card.append(visual,el('strong',p.name),el('small',owned?(worn?'Equipped':'Owned'):p.price+' coins'),tools);
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
    if(name==='mm_town_profile')return structuredClone(demo.town);
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
    if(name==='mm_town_upgrade'){
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
    if(name==='mm_buy'){
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
  const editorTopics={expand:q('mm-topic-expand'),rational:q('mm-topic-rational'),solve:q('mm-topic-solve')};
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
    const sections={classes:['mm-teacher-classes','mm-manage-classes'],missions:['mm-teacher-missions','mm-create-missions'],overview:['mm-teacher-overview','mm-open-overview']};
    for(const [key,[panel,control]] of Object.entries(sections)){
      q(panel).hidden=key!==section;
      q(control).setAttribute('aria-pressed',String(key===section));
    }
  }
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
  q('mm-create-missions').onclick=()=>teacherSection('missions');
  q('mm-open-overview').onclick=()=>{teacherSection('overview');loadOverview();};
  Object.entries(editorTopics).forEach(([topic,details])=>{
    details.querySelector('summary').onclick=e=>{e.preventDefault();openTopic(details.open?null:topic);};
  });
  function demoTopic(topic){
    q('mm-demo-solve').setAttribute('aria-pressed',String(topic==='solve'));
    q('mm-demo-expand').setAttribute('aria-pressed',String(topic==='expand'));
    q('mm-demo-rational').setAttribute('aria-pressed',String(topic==='rational'));
    builder.missionBuilder.draftKey('mm-demo-draft'+(topic==='solve'?'':':'+topic),topic==='solve'?'whole':topic);
  }
  q('mm-demo-solve').onclick=()=>demoTopic('solve');
  q('mm-demo-expand').onclick=()=>demoTopic('expand');
  q('mm-demo-rational').onclick=()=>demoTopic('rational');
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
        await rpc('mm_schedule_mission',{
          p_class:draft.className,p_title:draft.title,p_coins:draft.coins,p_hints:draft.hints,
          p_questions:draft.questions,p_release_at:draft.releaseAt
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
  function renderTeacher(){
    fillClasses(overviewClass,overviewClass.value);
    const cls=q('mm-roster-class');fillClasses(cls,cls.value);
    const loginClass=q('mm-login-roster-class'), oldClass=loginClass.value;
    fillClasses(loginClass,oldClass);
    if(loginClass.value!==oldClass)clearLoginRoster();
    if(teacherTopic)configureBuilder();
    const list=q('mm-published');
    list.replaceChildren();
    if(!state.missions.length){list.append(el('p','No class missions yet.','mm-muted'));return;}
    state.missions.forEach(m=>{
      const row=el('div','','mm-row mm-mission mm-teacher-mission');
      const details=el('div');
      details.append(el('strong',m.title),el('small',m.class+' · '+m.coins+' coins · '+m.completed+' completed'));
      if(m.releaseAt){
        details.append(el('small',(m.scheduled?'Scheduled for ':'Released ')+releaseFormat.format(new Date(m.releaseAt))+' (Singapore time)'));
      }
      row.append(details);
      const actions=el('div','','mm-row mm-mission-actions');
      if(m.questions?.length)actions.append(button('Duplicate',()=>{
        if(publishing)return;
        const topic=m.questions.some(question=>question.type?.startsWith('rational-'))?'rational':m.questions.some(question=>question.type?.startsWith('expand-'))?'expand':'solve';
        teacherSection('missions');openTopic(topic);builder.missionBuilder.duplicate(m);
      }));
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
    });
  }
  q('mm-refresh-missions').onclick=()=>busy(q('mm-refresh-missions'),async()=>{
    const next=await rpc('mm_state');
    if(next.role==='student'&&!q('mm-view-student').hidden){state=next;renderStudent();}
  });
  function renderStudent(){
    q('mm-student-name').textContent=state.alias+' · '+state.class;
    q('mm-demo-note').hidden=!demoActive;
    q('mm-demo-back').hidden=!demoActive;
    renderWallet();
    const missions=q('mm-missions');missions.replaceChildren();
    if(!state.missions.length)missions.append(el('p','Your teacher hasn’t published any missions yet.','mm-muted'));
    const topicOrder=m=>m.questions[0]?.type?.startsWith('expand-')?0:m.questions[0]?.type?.startsWith('rational-')?1:2;
    [...state.missions].sort((a,b)=>topicOrder(a)-topicOrder(b)).forEach(m=>{
      const row=el('div','','mm-row mm-mission');
      const name=el('div');name.append(el('strong',m.title),el('small',m.solved.length+' / '+m.questions.length+' solved · '+m.coins+' coins'+(m.complete?' · Completed':'')));
      const progress=el('progress','','mm-meter');
      progress.max=m.questions.length;
      progress.value=m.solved.length;
      progress.setAttribute('aria-label','Questions solved: '+m.title);
      name.append(progress);
      row.append(name,button(m.complete?'Practise again':m.solved.length?'Continue':'Start',()=>play(m)));
      missions.append(row);
    });
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
      const result=await rpc('mm_solve_answer',{p_mission:mission.id,p_index:i,p_answer:answer});
      mission.solved.push(i);mission.complete=result.complete;
      if(myRun!==run)return {message:''};
      if(Number.isFinite(result.balance))state.balance=result.balance;
      if(Number.isFinite(result.score))state.score=result.score;
      return result.complete?{message:'All answers saved. Complete the mission to celebrate!',completion:{coins:result.awarded||0}}:{message:'Question saved.'};
    },async ()=>{
      ++run;
      builder.missionBuilder.exit();
      selectDestination('home');view('student');renderStudent();
      try{state=await rpc('mm_state');if(q('mm-view-student').hidden===false)renderStudent();}
      catch(e){notice(e.message,true);}
    });
  }
  function applyState(next){
    state=next;view(state.role);
    if(state.role==='teacher')renderTeacher();
    if(state.role==='student'){selectDestination('home');renderStudent();loadTown();}
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
    ++run;++overviewRequest;overviewData=null;awardRequests.clear();if(awardDialog.open)awardDialog.close();user=null;state=null;resetTown();selectDestination('home');builder.missionBuilder.exit();openTopic(null);teacherSection('classes');view('login');q('mm-roster').value='';clearLoginRoster();q('mm-login-member').value='';updateLoginMember();
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

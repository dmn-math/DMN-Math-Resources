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
  const ladder=q('mm-house-ladder');
  art.houses.forEach((entry,i)=>{
    const li=el('li'), illustration=art.house(i+1);illustration.classList.add('mm-ladder-art');
    li.append(illustration,el('strong',entry.name),el('small',i===0?'Free starter home':entry.price+' coins'));
    ladder.append(li);
  });
  function renderHome(){
    q('mm-home-scene').replaceChildren(art.plot({...town,items:state.owned}));
    const current=art.houses[town.level-1],next=art.houses[town.level];
    q('mm-house-name').textContent=current.name;q('mm-house-level').textContent='Level '+town.level+' of '+art.houses.length;
    [...ladder.children].forEach((node,i)=>{
      if(i+1===town.level)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
    });
    const upgrade=q('mm-upgrade-house'), note=q('mm-upgrade-note');
    upgrade.hidden=!next;
    if(next){
      const missing=Math.max(0,next.price-state.balance);
      upgrade.textContent='Upgrade to '+next.name+' · '+next.price+' coins';
      upgrade.disabled=!townReady||townPending||missing>0;
      note.textContent=!townReady?'Loading your home…':missing?'Earn '+missing+' more '+(missing===1?'coin':'coins')+' to upgrade.':'House upgrades are permanent.';
      const level=town.level+1;
      upgrade.onclick=()=>{
        if(!window.confirm('Upgrade to '+next.name+' for '+next.price+' coins?'))return;
        townAction(async()=>{
          const wallet=await rpc('mm_town_upgrade',{p_next:level});
          return {wallet:{balance:wallet.balance,score:wallet.score},level:wallet.level,message:next.name+' is ready!'};
        },'home','mm-upgrade-house');
      };
    }else note.textContent='You’ve reached the final house upgrade!';
  }
  const sectionNames={tee:'Plain tees',pants:'Simple pants',hat:'Hats',costume:'Costumes',decor:'Home decorations'};
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
        if(slot==='decor')visual.append(el('span',p.detail));else visual.append(art.avatar({[slot]:p.id}));
        const owned=state.owned.includes(p.id),worn=town.outfit[slot]===p.id&&(slot==='costume'||!town.outfit.costume);
        const tools=el('div','','mm-shop-actions');
        if(slot!=='decor'){
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
        }else if(slot==='decor'){tools.append(el('span','At home','mm-owned'));}
        else{
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
      {alias:'Pi Pilot',level:8,outfit:{costume:'costume-iron'},items:['lamp']}
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
  function view(role){
    page.querySelectorAll('[data-mm-view]').forEach(node=>node.hidden=node.dataset.mmView!==role);
    builder.hidden=role!=='teacher'&&role!=='demo';
    q('mm-logout').hidden=!user;
  }
  const setDraftKey=()=>builder.missionBuilder.draftKey('mm-draft:'+user.id);
  function fillClasses(control,preferred){
    control.replaceChildren(new Option('Select a class',''));
    state.classes.forEach(c=>control.add(new Option(c.label,c.id)));
    control.value=state.classes.some(c=>c.id===preferred)?preferred:(state.classes.length===1?state.classes[0].id:'');
  }
  const releaseFormat=new Intl.DateTimeFormat('en-SG',{
    dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'
  });
  function renderTeacher(){
    const cls=q('mm-roster-class');fillClasses(cls,cls.value);
    builder.missionBuilder.teacher(state.classes, async (draft,publishButton)=>{
      publishButton.disabled=true;
      try {
        await rpc('mm_schedule_mission',{
          p_class:draft.className,p_title:draft.title,p_coins:draft.coins,p_hints:draft.hints,
          p_questions:draft.questions,p_release_at:draft.releaseAt
        });
      } catch(error){
        builder.missionBuilder.publishError(error.message);
        return;
      } finally { publishButton.disabled=false; }
      builder.missionBuilder.published(Boolean(draft.releaseAt));
      notice(draft.releaseAt?'Mission scheduled for '+releaseFormat.format(new Date(draft.releaseAt))+' (Singapore time).':'Mission published.');
      try{
        state=await rpc('mm_state');
        renderTeacher();
      }catch{
        notice('Mission saved. Refresh the page to update your mission list.');
      }
    });
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
      if(m.questions?.length)actions.append(button('Duplicate',()=>builder.missionBuilder.duplicate(m)));
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
    state.missions.forEach(m=>{
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
      if(mission.solved.includes(i))return 'Already saved. Keep practising!';
      const result=await rpc('mm_solve_answer',{p_mission:mission.id,p_index:i,p_answer:answer});
      mission.solved.push(i);mission.complete=result.complete;
      if(myRun!==run)return '';
      return result.complete?(result.awarded?'Mission complete! You earned '+result.awarded+' coins.':'Mission complete.'):'Question saved.';
    },async ()=>{
      ++run;
      builder.missionBuilder.exit();
      selectDestination('missions');view('student');renderStudent();
      try{state=await rpc('mm_state');if(q('mm-view-student').hidden===false)renderStudent();}
      catch(e){notice(e.message,true);}
    });
  }
  function applyState(next){
    state=next;view(state.role);
    if(state.role==='teacher'){setDraftKey();renderTeacher();}
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
    ++run;user=null;state=null;resetTown();selectDestination('home');builder.missionBuilder.exit();view('login');q('mm-roster').value='';
  });
  (async()=>{
    if(!config.url&&!config.publishableKey){
      view('demo');builder.missionBuilder.draftKey('mm-demo-draft');
      return;
    }
    view('login');
    if(!window.supabase||!/^https:\/\//.test(config.url)||!config.publishableKey||config.publishableKey.startsWith('sb_secret_')){
      notice('Check the Supabase URL and publishable key in config.js.',true);q('mm-login').disabled=true;return;
    }
    api=window.supabase.createClient(config.url,config.publishableKey,{auth:{flowType:'pkce'}});
    try {
      const {data,error}=await api.auth.getSession();
      if(error)throw error;
      user=data.session?.user||null;
      if(user){q('mm-logout').hidden=false;await loadState();}
      else if(new URLSearchParams(location.search).has('error'))notice('Google sign-in did not complete. Try again or check with your teacher.',true);
    }catch(error){notice(error.message,true);}
  })();
})();

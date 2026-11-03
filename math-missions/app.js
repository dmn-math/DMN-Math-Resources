(() => {
  'use strict';
  const page = document.getElementById('missions-app');
  const q = id => document.getElementById(id);
  const builder = document.getElementById('dmn-mission-wireframe');
  const config = window.MATH_MISSIONS_CONFIG || {};
  let api, state, user, run = 0, demoActive = false;
  const demo = {
    role:'student', alias:'Town Explorer', class:'Sample class', balance:5, score:5, owned:[],
    missions:[{id:'demo-equations',title:'Solve equations without fractions',coins:10,hints:true,solved:[],complete:false,
      questions:[{eq:'x + 7 = 12'},{eq:'3x - 4 = 11'},{eq:'4x + 1 = 2x + 9'}]}]
  };
  const demoAnswers = [5,5,4];
  const products = [
    {id:'plant', name:'Desk plant', price:5, icon:'🌱'},
    {id:'lamp', name:'Reading lamp', price:10, icon:'💡'},
    {id:'sign', name:'Cabin sign', price:15, icon:'🪧'}
  ];
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
  page.querySelectorAll('[data-town-destination]').forEach(b=>b.onclick=()=>selectDestination(b.dataset.townDestination));
  function demoRpc(name,args){
    const m=demo.missions[0];
    if(name==='mm_state'){
      demo.leaderboard=[{alias:'Map Maker',score:20},{alias:'Trail Scout',score:8},{alias:demo.alias,score:demo.score,you:true}].sort((a,b)=>b.score-a.score);
      return structuredClone(demo);
    }
    if(name==='mm_solve'&&args.p_mission===m.id&&demoAnswers[args.p_index]===args.p_answer){
      if(!m.solved.includes(args.p_index))m.solved.push(args.p_index);
      const awarded=!m.complete&&m.solved.length===m.questions.length?m.coins:0;
      if(awarded){m.complete=true;demo.balance+=awarded;demo.score+=awarded;}
      return {complete:m.complete,awarded};
    }
    if(name==='mm_buy'){
      const product=products.find(item=>item.id===args.p_item);
      if(!product||demo.owned.includes(product.id)||demo.balance<product.price)throw new Error('This item is unavailable.');
      demo.balance-=product.price;demo.owned.push(product.id);return null;
    }
    throw new Error('This action is unavailable in the student preview.');
  }
  q('mm-demo-student').onclick=()=>{
    demoActive=true;
    selectDestination('missions');
    applyState(demoRpc('mm_state'));
  };
  q('mm-demo-back').onclick=()=>{
    ++run;demoActive=false;state=null;notice();view('demo');
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
  function renderTeacher(){
    const cls=q('mm-roster-class');fillClasses(cls,cls.value);
    builder.missionBuilder.teacher(state.classes, async (draft,publishButton)=>{
      publishButton.disabled=true;
      try {
        await rpc('mm_publish',{p_class:draft.className,p_title:draft.title,p_coins:draft.coins,p_hints:draft.hints,p_questions:draft.questions});
        builder.missionBuilder.published();
        state=await rpc('mm_state');
        renderTeacher();
      } catch(error){ builder.missionBuilder.publishError(error.message); }
      finally { publishButton.disabled=false; }
    });
    const list=q('mm-published');
    list.replaceChildren();
    if(!state.missions.length){list.append(el('p','No published missions yet.','mm-muted'));return;}
    state.missions.forEach(m=>list.append(el('p',m.title+' · '+m.class+' · '+m.coins+' coins · '+m.completed+' completed')));
  }
  function renderStudent(){
    q('mm-student-name').textContent=state.alias+' · '+state.class;
    q('mm-demo-note').hidden=!demoActive;
    q('mm-demo-back').hidden=!demoActive;
    q('mm-balance').textContent=state.balance;
    q('mm-score').textContent=state.score;
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
    const shop=q('mm-shop'),cabin=q('mm-cabin');shop.replaceChildren();cabin.replaceChildren();
    products.forEach(p=>{
      const row=el('div','','mm-row mm-mission');row.append(el('span',p.icon+' '+p.name));
      if(state.owned.includes(p.id)){row.append(el('small','Owned'));cabin.append(el('span',p.icon+' '+p.name));}
      else {
        const buy=button('Buy · '+p.price+' coins',()=>busy(buy,async()=>{
          await rpc('mm_buy',{p_item:p.id});state=await rpc('mm_state');renderStudent();notice(p.name+' added to your cabin.');
        }));
        buy.disabled=state.balance<p.price;row.append(buy);
      }
      shop.append(row);
    });
    if(!cabin.childElementCount)cabin.append(el('small','Your cabin is ready to decorate.'));
  }
  async function play(mission){
    const myRun=++run;
    view('play');builder.hidden=false;
    builder.missionBuilder.play(mission,async (i,answer)=>{
      if(mission.solved.includes(i))return 'Already saved. Keep practising!';
      const result=await rpc('mm_solve',{p_mission:mission.id,p_index:i,p_answer:answer});
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
    if(state.role==='student')renderStudent();
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
    ++run;user=null;state=null;builder.missionBuilder.exit();view('login');q('mm-roster').value='';
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

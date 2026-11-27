function parseRow(row) {
  const [pattern, context, icon, hint] = row.split('|');
  let forms = [''];
  for (const piece of pattern.match(/\[[^\]]+\]|[^\[]+/g)) {
    const parts = piece.startsWith('[') ? piece.slice(1,-1).split('/') : [piece];
    forms = forms.flatMap(prefix => parts.map(ending => prefix + ending));
  }
  const pieces=pattern.match(/\[[^\]]+\]|[^\[]+/g).map(s=>s.startsWith('[')?s.slice(1,-1).split('/'):s);
  return {pieces, word:forms[0], forms:[...new Set(forms)], context, icon, hint};
}
const classic = rows.map(parseRow);
const glossary = wordCards.map(([pattern, definition, icon, hint]) => ({
  ...parseRow([pattern, definition, icon, hint].join('|')), type:'definition'
}));
const phrases = phraseCards.map(([word, second, third, context, icon, hint]) => ({
  word, forms:[word, second, third], context, icon, hint, type:'phrase'
}));
const bank = [...classic, ...glossary, ...phrases];
const titles = [
  ['🐣','Цыплёнок словарного гнезда'], ['🧦','Искатель сбежавшей буквы'],
  ['🧲','Ловец непослушных гласных'], ['🥐','Укротитель буквенных кренделей'],
  ['🕵️','Сыщик пропавшего дефиса'], ['🧑‍🍳','Шеф-повар словесной кухни'],
  ['🦝','Енот особой грамотности'], ['🪄','Заклинатель двойных согласных'],
  ['🛸','Адмирал орфографического флота'], ['🐉','Дракон с дипломом филолога']
];
function grade(score) {return Math.max(1,Math.ceil(score / 2))}
document.querySelector('#ranks').innerHTML=titles.map(([icon,title],i)=>
  '<li><span>'+icon+' '+title+'</span><b>'+(i===0?0:i*2+1)+'–'+(i*2+2)+'</b></li>'
).join('');
const headlines=new Map(Object.entries({
  'коллекция':'В школьном музее открылась ___ старинных открыток',
  'галерея':'После ремонта открылась картинная ___',
  'дирижёр':'За пультом школьного оркестра — юный ___',
  'репетиция':'До премьеры один день: идёт последняя ___',
  'дискуссия':'В научном клубе развернулась ___ о будущем города',
  'комиссия':'Работы юных авторов оценит экспертная ___',
  'корреспондент':'На связь со стадиона выходит наш ___',
  'экспедиция':'К истоку реки отправилась школьная ___',
  'лаборатория':'В лицее заработала ___ робототехники',
  'эксперимент':'Юные физики завершили необычный ___',
  'инициатива':'Новый сквер у школы: чья это ___?',
  'пьеса':'На школьной сцене — новая ___',
  'панорама':'С высоты башни открылась ___ города',
  'абонемент':'Библиотека разыгрывает ___ на цикл лекций',
  'конвейер':'Юные инженеры собрали ___ для сортировки деталей',
  'маршрут':'Краеведы проложили ___ по старому городу',
  'траектория':'По следам кометы: вычислена ___ её полёта',
  'бюллетень':'Вышел первый ___ школьного научного общества'
}));
const sections=['Заголовки','Корректорская','Письма читателей','В печать!'];
const game=document.querySelector('#game');
const pageUrl=new URL(location.pathname,location.origin);
let seed, opponent, issue, answers, review, reviewed, locked;
function randomizer(value){
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296};
}
function shuffle(list,rng){
  const copy=[...list];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
  return copy;
}
function edition(value){
  const rng=randomizer(value),used=new Set();
  function select(pool){
    const group=shuffle(pool.filter(q=>!used.has(q)),rng).slice(0,5);
    group.forEach(q=>used.add(q));return group;
  }
  return [...select(bank.filter(q=>headlines.has(q.word))),...select(classic),...select(phrases),...select([...classic,...glossary])];
}
function start(value, rival=null){
  seed=value??crypto.getRandomValues(new Uint32Array(1))[0];opponent=rival;
  issue=edition(seed);answers=[];review=null;reviewed=[];show();
}
function current(){return review?review[reviewed.length]:issue[answers.length]}
function progress(){
  const total=answers.filter(Boolean).length;
  document.querySelector('#pts').textContent=total+' / 20';
  document.querySelector('#dots').innerHTML=issue.map((q,i)=>{
    const state=i<answers.length?(answers[i]?'yes':'no'):i===answers.length?'now':'';
    return '<span class="'+state+'" aria-label="'+(i+1)+' '+({yes:'верно',no:'ошибка',now:'следующее'}[state]||'впереди')+'">'+(i+1)+'</span>';
  }).join('');
}
function button(parent,label,fn,cls='choice'){
  const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=fn;parent.append(b);return b;
}
function show(){
  locked=false;progress();const q=current(),n=issue.indexOf(q),section=Math.floor(n/5);
  const rng=randomizer(seed^Math.imul(n+1,2654435761));
  const mode=['headline','proof','letter','build'][section];
  game.className='panel playing';game.dataset.ink=['plum','sea','sunset','plum'][section]||'sea';
  const label=sections[section]; game.dataset.mode=mode;
  game.innerHTML='<div class="top"><span class="serial">'+(review?'ПОВТОР '+(reviewed.length+1)+' / '+review.length:'ПОЛОСА '+(section+1)+' / 4 · '+(n%5+1)+' / 5')+'</span><span class="type">'+label+'</span></div><h2 class="task-instruction note"></h2><div class="scene"><div class="medallion" aria-hidden="true">'+q.icon+'</div><p id="line" tabindex="-1"></p></div><div class="choices"></div><div id="feedback" role="status"></div>';
  const line=game.querySelector('#line'),note=game.querySelector('.note'),choices=game.querySelector('.choices');
  const context=(mode==='headline'?headlines.get(q.word):q.context).replace('___','…');
  line.textContent=context;
  function options(){
    shuffle(q.forms,rng).forEach(f=>{const b=button(choices,f,()=>{if(locked)return;b.classList.add(f===q.word?'good':'bad');for(const other of choices.children)if(other.textContent===q.word)other.classList.add('good');answer(f===q.word)})});
  }
  if(mode==='proof'){
    const wrong=shuffle(q.forms.slice(1),rng)[0];
    note.textContent='Найди и нажми слово с опечаткой.';line.textContent='';
    const original=q.context.replace('___',wrong);
    let found=false,firstTry=true;
    for(const token of original.match(/[а-яёА-ЯЁ-]+|[^а-яёА-ЯЁ-]+/g)){
      if(!/[а-яё]/i.test(token)){line.append(token);continue}
      const b=button(line,token,()=>{if(found)return;
        if(token!==wrong){firstTry=false;b.classList.add('miss');note.textContent='Это слово написано верно. Поищи опечатку в другом слове.';return}
        found=true;b.classList.add('marked');note.textContent='Выбери правильное написание.';
        shuffle(q.forms,rng).forEach(f=>{const opt=button(choices,f,()=>{if(locked)return;opt.classList.add(f===q.word?'good':'bad');for(const el of choices.children)if(el.textContent===q.word)el.classList.add('good');line.textContent=q.context.replace('___',q.word);answer(firstTry&&f===q.word)})});},'token');
    }
    return;
  }
  if(mode==='build'){
    note.textContent='Собери слово. Выбери написание каждого пропуска и нажми «Проверить».';
    choices.className='assembly';const chosen=new Map(),display=document.createElement('p');choices.append(display);
    const draw=()=>{display.textContent=q.pieces.map((piece,i)=>typeof piece==='string'?piece:(chosen.has(i)?chosen.get(i):'□')).join('')};
    draw();let count=0;for(const [i,piece] of q.pieces.entries()){
      if(typeof piece==='string')continue;count++;const group=document.createElement('div');group.className='slots';group.append('Пропуск '+count+' ');choices.append(group);
      for(const option of shuffle(piece,rng)){const b=button(group,option||'без буквы',()=>{chosen.set(i,option);for(const x of group.querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));draw();check.disabled=chosen.size<count},'tile');b.setAttribute('aria-pressed','false')}
    }
    const check=button(choices,'Проверить',()=>answer(display.textContent===q.word),'next');check.disabled=true;return;
  }
  note.textContent=mode==='letter'?'Выбери написание, которое подходит по смыслу.':'Выбери правильное написание слова для заголовка.';options();
}
function memory(q){
  if(q.word==='коллекция')return '<span>кол</span><span>лекция</span>';
  if(q.word==='ровесник')return 'ро<mark>вес</mark>ник';
  if(q.pieces)return q.pieces.map(x=>typeof x==='string'?x:'<mark>'+x[0]+'</mark>').join('');
  return q.word.split(/([ -])/).map(s=>s===' '?'&nbsp;':s==='-'?'<mark>-</mark>':'<span>'+s+'</span>').join('');
}
function answer(ok){
  if(locked)return;locked=true;const q=current(),log=review?reviewed:answers;log.push(ok);progress();
  for(const el of game.querySelectorAll('button,input'))el.disabled=true;
  const feedback=game.querySelector('#feedback');feedback.innerHTML='<div class="memo"><b>'+(ok?'✓ Верно':'✕ Правильное написание')+'</b><div class="wordproof">'+memory(q)+'</div><p>'+q.hint+'</p></div>';
  if(!review&&log.length%5===0)feedback.insertAdjacentHTML('beforeend','<div class="press-stamp">В печать · '+sections[log.length/5-1]+'</div>');
  const done=log.length===(review?review.length:20);
  const next=button(feedback,done?(review?'Итог реванша':'Получить выпуск'):!review&&log.length%5===0?'Следующая полоса →':'Дальше →',()=>{if(done)finish();else{show();game.querySelector('#line').focus({preventScroll:true})}},'next');
  next.focus({preventScroll:true});
  const mistakes=log.filter(correct=>!correct).length;
  if(!ok && (mistakes===3 || mistakes>=5))teacherInterrupt(next);
}

let voiceContext;
function teacherCry(){
  const Audio=window.AudioContext || window.webkitAudioContext;
  if(!Audio)return;
  try{
    const ctx=voiceContext??=new Audio();
    ctx.resume().then(()=>{
      const t=ctx.currentTime, voice=ctx.createOscillator(), volume=ctx.createGain();
      voice.type='sawtooth';voice.frequency.setValueAtTime(310,t);
      voice.frequency.exponentialRampToValueAtTime(475,t+.12);
      voice.frequency.exponentialRampToValueAtTime(270,t+.55);
      volume.gain.setValueAtTime(.001,t);
      volume.gain.exponentialRampToValueAtTime(.13,t+.04);
      volume.gain.exponentialRampToValueAtTime(.001,t+.58);
      const filters=[780,1250,2700].map(hz=>{
        const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=hz;f.Q.value=6;
        voice.connect(f);f.connect(volume);return f;
      });
      volume.connect(ctx.destination);voice.onended=()=>{voice.disconnect();filters.forEach(f=>f.disconnect());volume.disconnect()};
      voice.start(t);voice.stop(t+.6);
    }).catch(()=>{});
  }catch{}
}
function teacherInterrupt(next){
  const overlay=document.createElement('dialog');
  overlay.className='teacher-alert';overlay.setAttribute('aria-label','Учительница с указкой: внимание!');
  overlay.innerHTML='<div class="comic"><div class="teacher" aria-hidden="true"><i class="jacket"></i><i class="bun"></i><i class="face"><i class="hair"></i><i class="glasses"></i><i class="mouth"></i></i><i class="sleeve"></i><i class="pointer"></i></div><strong>А-а-а!<small>Внимание на буквы!</small></strong></div><button type="button">К разбору ошибки →</button>';
  document.body.append(overlay);
  const close=()=>{clearTimeout(timer);overlay.remove();next.focus({preventScroll:true})};
  const timer=setTimeout(close,1900);
  overlay.querySelector('button').onclick=close;
  overlay.oncancel=e=>{e.preventDefault();close()};
  overlay.showModal();teacherCry();
}

function finish(){
  const score=answers.filter(Boolean).length,level=grade(score),[icon,title]=titles[level-1];
  const mistakes=issue.filter((q,i)=>!answers[i]);game.className='panel finished';
  const url=new URL(pageUrl);url.searchParams.set('issue',seed);url.searchParams.set('score',score);
  const share=new URL('https://t.me/share/url');share.searchParams.set('url',url.href);share.searchParams.set('text','Я выпустил свой номер Буквограда! Сыграем на тех же 20 заданиях?');
  game.innerHTML='<div class="diploma"><p class="label">Школьная газета · выпуск готов</p><div class="seal">'+icon+'</div><h2>'+title+'</h2><p><b>'+level+' / 10</b> · уровень звания</p><strong>Верных ответов: '+score+' из 20</strong><div class="mini-pages">'+sections.map((s,i)=>'<div><small>Полоса '+(i+1)+'</small><b>'+s+'</b><i></i></div>').join('')+'</div></div>';
  if(opponent!==null)game.insertAdjacentHTML('beforeend','<p class="memo">Твой результат — '+score+'/20. У друга — '+opponent+'/20. '+(score===opponent?'Ничья!':score>opponent?'Ты впереди!':'Есть повод для реванша!')+'</p>');
  if(review)game.insertAdjacentHTML('beforeend','<p class="memo"><b>Реванш: '+reviewed.filter(Boolean).length+' из '+review.length+' исправлено.</b></p>');
  if(mistakes.length){game.insertAdjacentHTML('beforeend','<details><summary>Разобрать ошибки · '+mistakes.length+'</summary><ul>'+mistakes.map(q=>'<li><b>'+q.word+'</b> — '+q.hint+'</li>').join('')+'</ul></details>');
    button(game,'Реванш · '+mistakes.length,()=>{review=mistakes;reviewed=[];show()},'next');}
  const link=document.createElement('a');link.href=share.href;link.className='tg-share';link.textContent='Бросить вызов другу в Telegram';game.append(link);
  button(game,'Новый выпуск ↻',()=>{window.history.replaceState(null,'',pageUrl);start()},'next');
}
const params=new URLSearchParams(location.search),issueId=params.get('issue'),rival=params.get('score');
const validSeed=/^\d{1,10}$/.test(issueId)&&Number(issueId)<=4294967295;
start(validSeed?Number(issueId):undefined, validSeed&&/^\d{1,2}$/.test(rival)&&Number(rival)<=20?Number(rival):null);

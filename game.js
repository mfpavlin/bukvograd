function parseRow(row) {
  const [pattern, context, icon, hint] = row.split('|');
  let forms = [''];
  for (const piece of pattern.match(/\[[^\]]+\]|[^\[]+/g)) {
    const parts = piece.startsWith('[') ? piece.slice(1,-1).split('/') : [piece];
    forms = forms.flatMap(prefix => parts.map(ending => prefix + ending));
  }
  return {word:forms[0], forms:[...new Set(forms)], context, icon, hint};
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
function shuffle(list) {
  const copy = [...list];
  for (let i=copy.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [copy[i], copy[j]]=[copy[j], copy[i]];
  }
  return copy;
}
const game=document.querySelector('#game');
let round, history, locked;
function start() {
  history=[]; round=shuffle([...shuffle(phrases).slice(0,4),...shuffle([...classic,...glossary]).slice(0,16)]); show();
}
function progress() {
  document.querySelector('#pts').textContent=history.filter(a=>a.ok).length+' / 20';
  document.querySelector('#dots').innerHTML=round.map((_,i)=>{
    const answer=history[i], state=answer?(answer.ok?'yes':'no'):(i===history.length?'now':'');
    const status=answer?(answer.ok?'верно':'ошибка'):(state?'текущее':'впереди');
    return '<span class="'+state+'" aria-label="'+(i+1)+', '+status+'">'+(i+1)+'</span>';
  }).join('');
}
function show() {
  locked=false;
  const n=history.length, q=round[n]; progress();
  const definition=q.type==='definition';
  const line=definition?q.context:q.context.replace('___','<span class="blank">…</span>');
  const label=definition?'По определению':q.type==='phrase'?'Слова в контексте':'Вставь слово';
  game.className='panel playing';
  game.dataset.ink=['plum','sea','sunset'][n%3];
  game.innerHTML='<div class="top"><span class="serial">КАРТОЧКА &nbsp; '+String(n+1).padStart(2,'0')+' / 20</span><span class="type">'+label+'</span></div><div class="scene"><div class="medallion" aria-hidden="true">'+q.icon+'</div><p>'+line+'</p></div><p class="note">'+(definition?'Как правильно пишется это слово?':'Какое написание подходит для пропуска?')+'</p><div class="choices"></div><div role="status" id="feedback"></div>';
  const choices=game.querySelector('.choices');
  shuffle(q.forms).forEach((form,i)=>{
    const btn=document.createElement('button'); btn.className='choice';
    btn.innerHTML='<i aria-hidden="true">'+(i+1)+'</i><span>'+form+'</span>';
    btn.onclick=()=>answer(q,form,btn);choices.append(btn);
  });
}
function answer(q,form,btn) {
  if(locked)return; locked=true;
  const ok=form===q.word;history.push({q,form,ok}); progress();
  for(const b of game.querySelectorAll('.choice')){
    b.disabled=true;
    if(b.lastElementChild.textContent===q.word){b.classList.add('good');b.firstElementChild.textContent='✓'}
    else if(b===btn){b.classList.add('bad');b.firstElementChild.textContent='×'}
  }
  const gap=game.querySelector('.blank'); if(gap)gap.textContent=q.word;
  game.querySelector('#feedback').innerHTML='<div class="memo"><b>'+(ok?'Верно':'Правильное написание')+' · '+q.word+'</b><p>'+q.icon+' '+q.hint+'</p></div>';
  const next=document.createElement('button');next.className='next';next.textContent=history.length===20?'Получить награду →':'Следующее слово →';
  next.onclick=()=>{if(history.length===20)finish();else{show();game.querySelector('.choice').focus({preventScroll:true})}};
  game.append(next);next.focus({preventScroll:true});
}
function finish() {
  locked=true; const wrong=history.filter(a=>!a.ok),score=20-wrong.length;
  const level=grade(score),[icon,title]=titles[level-1];
  game.className='panel finished';
  game.innerHTML='<div class="diploma"><p class="label">Диплом Буквограда</p><div class="seal">'+icon+'</div><h2>'+title+'</h2><p><b>'+level+' / 10</b> · уровень звания</p><strong>Верных ответов: '+score+' из 20</strong></div>' +(wrong.length?'<details open><summary>Слова для повторения · '+wrong.length+'</summary><ul class="errors">'+wrong.map(a=>'<li><b>'+a.q.word+'</b> — '+a.q.hint+'</li>').join('')+'</ul></details>':'<p>Все двадцать слов написаны верно!</p>')+'<button class="next">Начать новый раунд ↻</button>';
  game.querySelector('button').onclick=start;game.querySelector('button').focus({preventScroll:true});
}
start();

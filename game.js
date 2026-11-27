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
function legacyEdition(value){
  const rng=randomizer(value),used=new Set();
  function select(pool){
    const group=shuffle(pool.filter(q=>!used.has(q)),rng).slice(0,5);
    group.forEach(q=>used.add(q));return group;
  }
  return [...select(bank.filter(q=>headlines.has(q.word))),...select(classic),...select(phrases),...select([...classic,...glossary])];
}
const historyKey='bukvograd.recent-words.v1';
const wordPool=[...classic,...glossary];
let recentWords=[];
function readHistory(){
  try{
    const saved=JSON.parse(localStorage.getItem(historyKey));
    if(Array.isArray(saved))return saved.filter(word=>typeof word==='string').slice(-bank.length);
  }catch{}
  return recentWords;
}
function freshEdition(value,recent){
  const rng=randomizer(value);
  const ranks=new Map(recent.map((word,i)=>[word,i+1]));
  function draw(pool,count){
    // Randomize ties. Unused words come first, then the least recently dealt.
    return shuffle(pool,rng).sort((a,b)=>(ranks.get(a.word)||0)-(ranks.get(b.word)||0)).slice(0,count);
  }
  const words=shuffle(draw(wordPool,15),rng);
  return [...words.slice(0,10),...draw(phrases,5),...words.slice(10)];
}
function readSharedCards(raw){
  if(!raw||!/^([0-9a-z]{1,2}-){19}[0-9a-z]{1,2}$/.test(raw))return null;
  const cards=raw.split('-').map(id=>bank[parseInt(id,36)]);
  if(new Set(cards).size!==20||!cards.every((q,i)=>q&&((q.type==='phrase')===(i>=10&&i<15))))return null;
  return cards;
}
function start(value,rival=null,sharedCards=null){
  seed=value??crypto.getRandomValues(new Uint32Array(1))[0];opponent=rival;
  const recent=readHistory();
  issue=sharedCards??(value===undefined?freshEdition(seed,recent):legacyEdition(seed));
  const words=issue.map(q=>q.word), selected=new Set(words);
  recentWords=[...recent.filter(word=>!selected.has(word)),...words];
  try{localStorage.setItem(historyKey,JSON.stringify(recentWords))}catch{}
  answers=[];review=null;reviewed=[];show();
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
  const context=(mode==='headline'?(headlines.get(q.word)??q.context):q.context).replace('___','…');
  line.textContent=context;
  function options(){
    shuffle(q.forms,rng).forEach(f=>{const b=button(choices,f,()=>{if(locked)return;b.classList.add(f===q.word?'good':'bad');for(const other of choices.children)if(other.textContent===q.word)other.classList.add('good');answer(f===q.word)})});
  }
  if(mode==='proof'){
    const wrong=shuffle(q.forms.slice(1),rng)[0];
    note.textContent='Найди и нажми слово с опечаткой.';line.textContent='';
    const excerpt=q.type==='definition'?'___ — '+q.context.charAt(0).toLowerCase()+q.context.slice(1)+'.':q.context;
    const original=excerpt.replace('___',wrong);
    let found=false,firstTry=true;
    for(const token of original.match(/[а-яёА-ЯЁ-]+|[^а-яёА-ЯЁ-]+/g)){
      if(!/[а-яё]/i.test(token)){line.append(token);continue}
      const b=button(line,token,()=>{if(found)return;
        if(token!==wrong){firstTry=false;b.classList.add('miss');note.textContent='Это слово написано верно. Поищи опечатку в другом слове.';return}
        found=true;b.classList.add('marked');note.textContent='Выбери правильное написание.';
        shuffle(q.forms,rng).forEach(f=>{const opt=button(choices,f,()=>{if(locked)return;opt.classList.add(f===q.word?'good':'bad');for(const el of choices.children)if(el.textContent===q.word)el.classList.add('good');line.textContent=excerpt.replace('___',q.word);answer(firstTry&&f===q.word)})});},'token');
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
  note.textContent=mode==='letter'?'Выбери написание, которое подходит по смыслу.':(q.type==='definition'&&!headlines.has(q.word)?'По определению выбери слово для заголовка.':'Выбери правильное написание слова для заголовка.');options();
}
// Visual spelling cues; square brackets mark the fragments to emphasize.
const mnemonicCards = new Map([
 [
  "багаж",
  [
   "🧳",
   "б[ага]ж",
   "Поднимаешь тяжёлый чемодан и говоришь «Ага!». Это «ага» целиком помещается в слове: б-АГА-ж."
  ]
 ],
 [
  "коллекция",
  [
   "📬",
   "ко[л] + [л]екция",
   "Склей две бумажки: КОЛ и ЛЕКЦИЯ. Края встретились — обе Л остались в коллекции."
  ]
 ],
 [
  "ровесник",
  [
   "🗓️",
   "ро[вес]ник",
   "Посчитайте вёсны: у вас их поровну. «Ровно вёсен» напоминает слово «ровесник» без Т."
  ]
 ],
 [
  "сверстник",
  [
   "📏",
   "с[верст]ник",
   "Два сверстника прошли версту. Вставь ВЕРСТ целиком между С и НИК — Т займёт своё место."
  ]
 ],
 [
  "каллиграфия",
  [
   "🖋️",
   "к[алл]играфия",
   "Алла выводит буквы пером. Три буквы её имени — АЛЛ — уже написаны внутри слова."
  ]
 ],
 [
  "репетиция",
  [
   "🎵",
   "[ре] → [пе]ть",
   "Хор начинает с ноты РЕ, потом начинает ПЕть. Прочитай первые два слога вместе: РЕ-ПЕ-тиция."
  ]
 ],
 [
  "аккомпанемент",
  [
   "🎹",
   "[акк]орд → [акк]омпанемент",
   "Пианист берёт аккорд, чтобы подыграть певцу. Перенеси АКК с клавиш в начало слова."
  ]
 ],
 [
  "параллель",
  [
   "🛤️",
   "пара → [лл]",
   "Представь пару рельсов. Напиши ПАРА, положи рядом две Л и закончи мягким знаком: ПАРА-ЛЛ-ЕЛЬ."
  ]
 ],
 [
  "аппарат",
  [
   "📷",
   "а[п] + [п]ара + т",
   "В фотоаппарате ПАРА батареек. Приставь к ПАРА спереди АП, а сзади Т. Обе П видны на стыке."
  ]
 ],
 [
  "галерея",
  [
   "🖼️",
   "[Гал]я → [гал]ерея",
   "Галя одна идёт между картинами. Возьми из её имени ГАЛ с одной Л."
  ]
 ],
 [
  "баллада",
  [
   "📜",
   "б[алла]да",
   "Представь, что Алла читает балладу. Обведи имя чтеца прямо внутри слова."
  ]
 ],
 [
  "территория",
  [
   "🦎",
   "[терр]ариум → [терр]итория",
   "У ящерицы своя территория — террариум. На обеих табличках одинаковое начало ТЕРР."
  ]
 ],
 [
  "дирижёр",
  [
   "🎼",
   "д[и] · р[и] · жёр",
   "Пропой первые две доли на одном звуке И: ДИ, РИ. На третьей взмахни рукой: ЖЁР!"
  ]
 ],
 [
  "корреспондент",
  [
   "🎙️",
   "ко[р] + [р]епортаж",
   "Корреспондент готовит КОРоткий Репортаж. Поставь первую Р репортажа сразу за КОР."
  ]
 ],
 [
  "аккорд",
  [
   "🎹",
   "а[кк]орд",
   "Нажми одновременно две Клавиши. Два прикосновения напоминают две К в слове."
  ]
 ],
 [
  "аллея",
  [
   "🌳",
   "[л]ипы · [л]ипы",
   "Идёшь по аллее: слева липы, справа липы. Возьми по Л из каждого ряда."
  ]
 ],
 [
  "антенна",
  [
   "📡",
   "анте[нн]а",
   "Нарисуй на крыше две мачты в форме Н. Вместе они принимают сигнал: анте-НН-а."
  ]
 ],
 [
  "кассета",
  [
   "📼",
   "ка[сс]ета",
   "Сквозь окошко старой кассеты видны две катушки. Нарисуй на каждой по С."
  ]
 ],
 [
  "грамота",
  [
   "📜",
   "гра[м]ота",
   "На одной грамоте одна печать с буквой М. Для сравнения: в слове «грамматика» их две."
  ]
 ],
 [
  "грамматика",
  [
   "📖",
   "гра[мм]атика",
   "Раскрой учебник грамматики: слева страница с М, справа ещё одна. Закрой его — две М рядом."
  ]
 ],
 [
  "дилемма",
  [
   "⚖️",
   "ди[л]е[мм]а",
   "Одна Л стоит в точке выбора. От неё ведут две дороги: «море» или «музей». Два М."
  ]
 ],
 [
  "компания",
  [
   "👥",
   "[ко]манда → [ко]мпания",
   "КОманда друзей — КОмпания. Представь друзей вокруг круглого стола в форме О."
  ]
 ],
 [
  "кампания",
  [
   "📣",
   "[ка]ндидат → [ка]мпания",
   "КАндидат начинает избирательную КАмпанию. Соедини плакат кандидата и название дела общим КА."
  ]
 ],
 [
  "воображение",
  [
   "🌌",
   "в[о] + [о]браз",
   "Мысленно войди ВО внутренний ОБРАЗ. На границе двух частей окажутся две О."
  ]
 ],
 [
  "исследование",
  [
   "🔍",
   "и[с] + [с]лед",
   "Под лупой виден СЛЕД. Поставь перед ним ИС: в слове «исследование» два соседних С."
  ]
 ],
 [
  "расчёт",
  [
   "🧮",
   "ра[с] + [ч]ёт",
   "На карточке ЧЁТ нет начальной С. Приставь РАС — перед Ч останется одна С."
  ]
 ],
 [
  "рассчитать",
  [
   "🧮",
   "ра[с] + [с]читать",
   "На карточке СЧИТАТЬ уже есть С. Приставь РАС — на стыке встретятся две С."
  ]
 ],
 [
  "вокзал",
  [
   "🚉",
   "во[к] + [зал]",
   "Представь стрелку «К ЗАЛУ ожидания». Сохрани букву К прямо перед ЗАЛ: во-К-ЗАЛ."
  ]
 ],
 [
  "бинокль",
  [
   "🔭",
   "[би] → два",
   "Посмотри сразу в два объектива: БИ означает «два». Этим слогом начинается БИНОКЛЬ."
  ]
 ],
 [
  "аккуратный",
  [
   "📐",
   "а[кк]уратный",
   "Две К стоят в ряд, словно два остро отточенных карандаша на аккуратном столе."
  ]
 ]
]);
for(const q of bank){
  const card=mnemonicCards.get(q.word);
  if(card)q.hint=card[2];
}
const paintedCards=new Map([["в[о]кзал","A0","Циферблат вокзальных часов круглый, как О. За ним оставь К перед словом ЗАЛ."],["вел[о]сипед","A1","В середину велосипеда вкати колесо: его обод рисует О. Первые слоги — ВЕ-ЛО."],["вел[о]сипедист","A1","Велосипедист катит колесо. В слове обод занимает место О после Л."],["г[о]ризонтальный","A2","Круг солнца касается горизонта. Вставь его О между Г и Р."],["[о]бсерватория","A3","Телескоп смотрит в небо круглой линзой. С её О начинается слово."],["б[а]гаж","A4","На чемодане два ремня и поперечная застёжка. Обведи их пальцем — в слове появится А."],["к[а]ртина","A5","Красные ножки мольберта и его полочка рисуют А сразу после К."],["г[а]лерея","A5","У входа в галерею стоит один мольберт в форме А. Начни с ГАЛ: А и одна Л."],["б[а]гряный","A5","Художник красит мольберт в багряный цвет. Его рама — первая А в слове."],["[а]ттракцион","A6","Контур циркового шатра похож на заглавную А. За входом два турникета — две Т."],["к[а]рнавал","A6","На карнавале поставили пёстрый шатёр. Его скаты и гирлянда образуют А после К."],["[а]рхитектор","A7","Архитектор взял угольник. Видишь А? С неё и начинается название профессии."],["г[а]барит","A7","Чтобы измерить габарит, приложи угольник. В его контуре прячется А после Г."],["а[лл]ея","A8","В начале аллеи растут две ели. Преврати их кроны в две соседние буквы Л."],["ка[сс]ета","A9","В кассете две катушки. Их ленты закручиваются в две С."],["анте[нн]а","A10","Представь, что каждая мачта держит по букве Н. Две мачты — две Н перед последней А."],["ба[сс]ейн","A11","Две волны на соседних дорожках изгибаются, как две С. Прочитай: ба-СС-ейн."],["д[ири]жёр","B0","Две палочки отбивают две доли: ДИ — РИ. В каждом слоге по И."],["а[кк]орд","B1","Две выделенные клавиши звучат вместе. Каждая клавиша даёт одну К."],["а[кк]омпанемент","B1","Пианист начинает с аккорда. Две клавиши напоминают две К в начале обоих слов."],["ко[рр]еспондент","B2","Корреспондент печатает «КОРоткий Репортаж». Первая часть заканчивается на Р, вторая начинается с Р."],["ко[лл]екция","B3","Мысленно поставь по Л на соседних краях двух марок. Сдвинь марки: в коллекции получились две Л."],["режи[сс]ёр","B4","Режиссёр раздвигает две створки занавеса. Каждая Створка дарит одну С."],["пара[лл]ель","B5","Два рельса идут рядом. Напиши ПАРА, затем по Л для каждого рельса: пара-ЛЛ-ель."],["ка[лл]играфия","B6","Каждое перо выводит по одной Л. Два пера написали две соседние Л."],["гра[мм]","B7","Положи мысленно по М на каждую чашу весов. Для слова «грамм» понадобятся обе."],["диле[мм]а","B7","На каждой чаше — одна возможность и одна М. У дилеммы две М после Е и одна Л до Е."],["си[мм]етрия","B8","Проведи ось между арками. Поставь слева букву М, а справа её пару — ещё одну М."],["крест[-]накрест","B9","Лента пересекает саму себя. На месте узелка между КРЕСТ и НАКРЕСТ поставь дефис."],["на[ ]лету","B10","Волан и мяч разделяет дорожка воздуха. Оставь такой же просвет между НА и ЛЕТУ."],["а[кк]уратный","B11","Два Карандаша в аккуратном ряду напоминают две К после А."]].map(([pattern,tile,caption])=>{
  const [,left,letter,right]=pattern.match(/^(.*?)\[(.+?)\](.*)$/);
  return [left+letter+right,{left,letter,right,tile,caption}];
}));
function paintedHint(q){
  const art=paintedCards.get(q.word);
  if(!art)return '';
  const atlas=art.tile[0],index=Number(art.tile.slice(1)),x=(index%4)*100/3,y=Math.floor(index/4)*50;
  if(!document.querySelector('#paint-'+atlas)){
    const link=document.createElement('link');link.id='paint-'+atlas;link.rel='stylesheet';link.href='art/watercolor-'+atlas+'.css';document.head.append(link);
  }
  const glyph=art.letter===' '?'␣':art.letter;
  return '<figure class="paint-card"><div class="paint-word" aria-label="'+q.word+'"><span aria-hidden="true">'+art.left+'</span><span class="paint-anchor" aria-hidden="true"><i class="paint-picture paint-'+atlas+'" style="background-position:'+x+'% '+y+'%"></i><b>'+glyph+'</b></span><span aria-hidden="true">'+art.right+'</span></div><figcaption>'+art.caption+'</figcaption></figure>';
}

function memoryCue(q){
  const card=mnemonicCards.get(q.word);
  if(!card)return '';
  const cue=card[1].replace(/\[([^\]]+)\]/g,'<mark>$1</mark>');
  return '<div class="mnemo-rebus"><span aria-hidden="true">'+card[0]+'</span> '+cue+'</div>';
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
  const feedback=game.querySelector('#feedback');feedback.innerHTML='<div class="memo"><b>'+(ok?'✓ Верно':'✕ Правильное написание')+'</b>'+(paintedHint(q)||('<div class="wordproof">'+memory(q)+'</div>'+memoryCue(q)+'<p>'+q.hint+'</p>'))+'</div>';
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
  const url=new URL(pageUrl);url.searchParams.set('issue',seed);url.searchParams.set('cards',issue.map(q=>bank.indexOf(q).toString(36)).join('-'));url.searchParams.set('score',score);
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
const sharedCards=readSharedCards(params.get('cards'));
const validIssue=validSeed&&(!params.has('cards')||!!sharedCards);
start(validIssue?Number(issueId):undefined, validIssue&&/^\d{1,2}$/.test(rival)&&Number(rival)<=20?Number(rival):null,validIssue?sharedCards:null);

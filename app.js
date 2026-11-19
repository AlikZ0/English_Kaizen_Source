const get = id => document.getElementById(id);
const storageKey = 'kaizen-english-completed-v1';
let completed = new Set();
function storageMessage() {
  get('storage-status').textContent = 'Прогресс сохранится только до закрытия страницы: браузер запретил локальное хранение.';
  get('storage-status').hidden = false;
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) completed = new Set(saved.filter(i => Number.isInteger(i) && lessons[i]));
} catch { storageMessage(); }
const dateKey = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Yerevan',year:'numeric',month:'2-digit',day:'2-digit'});
const label = new Intl.DateTimeFormat('ru', {timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
const dateToday = lessons.findIndex(lesson => dateKey.format(lesson.date) === dateKey.format(new Date()));
const today = dateToday >= 0 ? dateToday : 0;
get('today').hidden = dateToday < 0;
let selected = today;
const buttons = [];
for (const [month, name] of [[10,'Ноябрь'],[11,'Декабрь']]) {
  const heading = document.createElement('h3');
  heading.className = 'month';
  heading.textContent = name;
  const days = document.createElement('div');
  days.className = 'days';
  lessons.forEach((lesson, index) => {
    if (lesson.date.getUTCMonth() !== month) return;
    const button = document.createElement('button');
    button.className = 'day';
    button.type = 'button';
    button.textContent = lesson.date.getUTCDate();
    button.addEventListener('click', () => show(index, true));
    days.append(button);
    buttons[index] = button;
  });
  get('calendar').append(heading, days);
}
function updateProgress() {
  get('progress').value = completed.size;
  get('progress-label').textContent = completed.size + ' из ' + lessons.length + ' выполнено';
  get('done').textContent = completed.has(selected) ? 'Снять отметку' : 'Отметить выполненным';
  buttons.forEach((button, index) => {
    button.classList.toggle('completed', completed.has(index));
    button.setAttribute('aria-current', String(index === selected));
    button.setAttribute('aria-label', label.format(lessons[index].date) + (completed.has(index) ? ', выполнено' : ''));
  });
}
function show(index, focus = false) {
  if (!lessons[index]) return;
  selected = index;
  window.speechSynthesis?.cancel();
  const lesson = lessons[index];
  get('date').textContent = label.format(lesson.date);
  get('title').textContent = lesson.title;
  get('english').textContent = lesson.example;
  get('translation').textContent = lesson.translation;
  get('prompt').textContent = lesson.prompt;
  get('task').textContent = lesson.task;
  get('questions').hidden = ![32,38,40,42].includes(index);
  get('example').open = false;
  get('audio-status').hidden = true;
  get('answer').value = '';
  get('feedback').hidden = true;
  get('prev').disabled = index === 0;
  get('next').disabled = index === lessons.length - 1;
  updateProgress();
  if (focus) get('title').focus();
}
get('prev').onclick = () => show(selected-1, true);
get('next').onclick = () => show(selected+1, true);
get('today').onclick = () => show(today, true);
get('done').onclick = () => {
  if (completed.has(selected)) completed.delete(selected);
  else completed.add(selected);
  try { localStorage.setItem(storageKey, JSON.stringify([...completed])); }
  catch { storageMessage(); }
  updateProgress();
};
function audioUnavailable() {
  get('audio-status').textContent = 'Английская озвучка недоступна в этом браузере.';
  get('audio-status').hidden = false;
}
get('listen').onclick = () => {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    audioUnavailable();
    return;
  }
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(lessons[selected].example);
  const voice = window.speechSynthesis.getVoices().find(item => /^en(-|$)/i.test(item.lang));
  if (voice) speech.voice = voice;
  speech.lang = voice?.lang || 'en-US';
  speech.rate = 0.85;
  speech.onerror = event => {
    if (!['canceled','interrupted'].includes(event.error)) audioUnavailable();
  };
  get('audio-status').hidden = true;
  window.speechSynthesis.speak(speech);
};
function normalize(value) {
  return value.toLowerCase().replace(/’/g,"'").replace(/[^a-z0-9'\s]/g,'').trim().replace(/\s+/g,' ');
}
get('quiz').onsubmit = event => {
  event.preventDefault();
  const feedback = get('feedback');
  const example = lessons[selected].example;
  feedback.textContent = normalize(get('answer').value) === normalize(example)
    ? 'Совпадает с образцом.'
    : 'Сравни с образцом: ' + example + ' Возможны другие правильные формулировки.';
  feedback.hidden = false;
};
show(today);

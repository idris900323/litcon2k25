(() => {
  const track = document.getElementById('track');
  const prev  = document.getElementById('prev');
  const next  = document.getElementById('next');

  let idx = 0;
  function go(i){
    idx = (i + track.children.length) % track.children.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
  }
  prev.addEventListener('click', () => go(idx-1));
  next.addEventListener('click', () => go(idx+1));

  // optional autoplay:
  // setInterval(() => go(idx+1), 4000);
})();

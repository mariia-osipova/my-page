(() => {
  const cards = document.querySelectorAll('.feed__item');

  if (!cards.length) {
    return;
  }

  cards.forEach((card) => {
    const link = card.querySelector('.feed__title a[href]');

    if (!link) {
      return;
    }

    card.style.cursor = 'pointer';

    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) {
        return;
      }

      window.location.href = link.href;
    });
  });
})();

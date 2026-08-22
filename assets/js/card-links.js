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
    card.style.transformOrigin = 'center center';
    card.style.transition = 'transform 180ms ease-out';

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.025)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    card.addEventListener('focusin', () => {
      card.style.transform = 'scale(1.025)';
    });

    card.addEventListener('focusout', () => {
      card.style.transform = '';
    });

    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) {
        return;
      }

      window.location.href = link.href;
    });
  });
})();

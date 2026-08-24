(() => {
  const cards = document.querySelectorAll('.feed__item');
  const tagFilter = document.querySelector('.post-tags');
  const feedRoot = document.querySelector('.wrapper.feed');

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

  if (!tagFilter || !feedRoot) {
    return;
  }

  const filterCards = feedRoot.querySelectorAll('.feed__item[data-tags]');
  const filterButtons = tagFilter.querySelectorAll('.post-tags__button[data-tag]');

  if (!filterCards.length || !filterButtons.length) {
    return;
  }

  const setActiveTag = (tag) => {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.tag === tag;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    filterCards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const isVisible = tag === 'all' || tags.includes(tag);

      card.classList.toggle('is-hidden', !isVisible);
    });
  };

  tagFilter.addEventListener('click', (event) => {
    const button = event.target.closest('.post-tags__button[data-tag]');

    if (!button || !tagFilter.contains(button)) {
      return;
    }

    setActiveTag(button.dataset.tag);
  });

  setActiveTag('all');
})();

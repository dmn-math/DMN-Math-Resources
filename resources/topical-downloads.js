(async function () {
  const grid = document.querySelector('.topic-grid[data-resources]');
  if (!grid) return;

  const base = grid.dataset.resources;
  const cards = grid.querySelectorAll('.topic-card[data-slug]');

  for (const card of cards) {
    if (!card.id) card.id = 'topic-' + card.dataset.slug;
  }

  function revealTopic() {
    const id = location.hash.slice(1);
    const card = Array.from(cards).find(card => card.id === id);
    if (!card) return;

    card.open = true;
    requestAnimationFrame(() => card.scrollIntoView({ block: 'start' }));
  }

  window.addEventListener('hashchange', revealTopic);
  revealTopic();

  function resourceGroup(title, links) {
    const group = document.createElement('div');
    group.className = 'topic-resource-group';
    const heading = document.createElement('h5');
    heading.className = 'topic-resource-heading';
    heading.textContent = title;
    group.append(heading, ...links);
    return group;
  }

  try {
    const response = await fetch(base + 'topical-manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load topic resources');
    const topics = await response.json();

    for (const card of cards) {
      const folder = card.dataset.slug;
      const downloads = card.querySelector('.topic-downloads');
      const pdfs = topics[folder] ?? [];
      const activities = topics._interactive?.[folder] ?? [];
      const groups = [];
      const folderUrl = base + encodeURIComponent(folder) + '/';

      if (activities.length) {
        const badge = document.createElement('span');
        badge.className = 'topic-activity-badge';
        badge.textContent = 'Interactive';
        card.querySelector('.topic-summary').append(badge);

        const links = activities.map(function (filename) {
          const link = document.createElement('a');
          link.href = folderUrl + encodeURIComponent(filename);
          link.className = 'topic-activity-link';
          link.textContent = filename.replace(/^\d+\s+/, '').replace(/\.html$/i, '');
          link.addEventListener('click', function (event) {
            if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              history.replaceState(history.state, '', '#' + card.id);
            }
          });
          return link;
        });
        groups.push(resourceGroup('Interactive activities', links));
      }

      if (pdfs.length) {
        const links = pdfs.map(function (filename) {
          const link = document.createElement('a');
          link.href = folderUrl + encodeURIComponent(filename);
          link.className = 'download-btn';
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = filename;
          return link;
        });
        groups.push(resourceGroup('PDF resources', links));
      }

      if (groups.length) {
        downloads.replaceChildren(...groups);
      } else {
        downloads.firstElementChild.textContent = 'No worksheets uploaded yet.';
      }
    }

    revealTopic();
  } catch {
    for (const status of grid.querySelectorAll('.resource-status')) {
      status.textContent = 'Could not load topic resources. Please try again.';
    }
  }
})();

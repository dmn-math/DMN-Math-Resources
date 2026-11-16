(async function () {
  const grid = document.querySelector('.topic-grid[data-resources]');
  if (!grid) return;

  const base = grid.dataset.resources;
  const cards = grid.querySelectorAll('.topic-card[data-slug]');

  try {
    const response = await fetch(base + 'topical-manifest.json');
    if (!response.ok) throw new Error('Could not load worksheets');
    const topics = await response.json();

    for (const card of cards) {
      const folder = card.dataset.slug;
      const downloads = card.querySelector('.topic-downloads');
      const filenames = topics[folder];

      if (!filenames?.length) {
        downloads.firstElementChild.textContent = 'No worksheets uploaded yet.';
        continue;
      }

      const links = filenames.map(function (filename) {
        const link = document.createElement('a');
        link.href = base + encodeURIComponent(folder) + '/' + encodeURIComponent(filename);
        link.className = 'download-btn';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = filename;
        return link;
      });
      downloads.replaceChildren(...links);
    }
  } catch {
    for (const status of grid.querySelectorAll('.resource-status')) {
      status.textContent = 'Could not load worksheets. Please try again.';
    }
  }
})();

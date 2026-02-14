(function () {
  'use strict';

  // --- DOM Elements ---
  const playerSection = document.getElementById('player-section');
  const statusSection = document.getElementById('status-section');
  const loadingSection = document.getElementById('loading-section');
  const storiesSection = document.getElementById('stories-section');
  const storiesList = document.getElementById('stories-list');
  const pastList = document.getElementById('past-list');
  const digestTitle = document.getElementById('digest-title');
  const digestDate = document.getElementById('digest-date');
  const audioPlayer = document.getElementById('audio-player');
  const playBtn = document.getElementById('play-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const progressBar = document.getElementById('progress-bar');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const statusMessage = document.getElementById('status-message');
  const replayBtn = document.getElementById('replay-btn');

  const STORAGE_KEY = 'octopus-last-played';

  // --- Utility Functions ---

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function formatDateNice(dateStr) {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  function formatDateShort(dateStr) {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  }

  function getDateString(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  function show(el) {
    el.classList.remove('hidden');
  }

  function hide(el) {
    el.classList.add('hidden');
  }

  // --- Audio Player Logic ---

  let isPlaying = false;

  function updatePlayButton() {
    if (isPlaying) {
      hide(playIcon);
      show(pauseIcon);
      playBtn.setAttribute('aria-label', 'Pause');
    } else {
      show(playIcon);
      hide(pauseIcon);
      playBtn.setAttribute('aria-label', 'Play');
    }
  }

  function togglePlayPause() {
    if (!audioPlayer.src) return;

    if (audioPlayer.paused) {
      audioPlayer.play().catch(function () {
        // Autoplay may be blocked — user will tap again
      });
    } else {
      audioPlayer.pause();
    }
  }

  audioPlayer.addEventListener('play', function () {
    isPlaying = true;
    updatePlayButton();
  });

  audioPlayer.addEventListener('pause', function () {
    isPlaying = false;
    updatePlayButton();
  });

  audioPlayer.addEventListener('ended', function () {
    isPlaying = false;
    updatePlayButton();
    progressBar.value = 0;
  });

  audioPlayer.addEventListener('timeupdate', function () {
    if (audioPlayer.duration) {
      progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
  });

  audioPlayer.addEventListener('loadedmetadata', function () {
    durationEl.textContent = formatTime(audioPlayer.duration);
    progressBar.max = 100;
  });

  progressBar.addEventListener('input', function () {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    }
  });

  playBtn.addEventListener('click', togglePlayPause);

  // --- Digest Loading ---

  function loadDigest(digest, autoPlay) {
    digestTitle.textContent = digest.title;
    digestDate.textContent = formatDateNice(digest.date);

    if (digest.duration_seconds) {
      durationEl.textContent = formatTime(digest.duration_seconds);
    }

    audioPlayer.src = digest.audio_url;
    show(playerSection);

    if (autoPlay) {
      audioPlayer.play().catch(function () {
        // Autoplay blocked by browser — user can tap play
      });
    }

    // Mark as played
    localStorage.setItem(STORAGE_KEY, digest.date);

    // Render stories
    renderStories(digest.stories);
  }

  function renderStories(stories) {
    if (!stories || stories.length === 0) {
      hide(storiesSection);
      return;
    }

    storiesList.innerHTML = '';

    stories.forEach(function (story) {
      var card = document.createElement('a');
      card.className = 'story-card';
      card.href = story.link;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';

      card.innerHTML =
        '<h3 class="story-headline">' + escapeHtml(story.headline) + '</h3>' +
        '<p class="story-summary">' + escapeHtml(story.summary) + '</p>' +
        '<span class="story-source">' + escapeHtml(story.source) + '</span>';

      storiesList.appendChild(card);
    });

    show(storiesSection);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function showUpToDate(digest) {
    statusMessage.textContent = "You're up to date \u2713";
    statusMessage.className = 'status-message success';
    show(replayBtn);
    show(statusSection);

    // Still render stories for reference
    if (digest && digest.stories) {
      renderStories(digest.stories);
    }

    replayBtn.addEventListener('click', function () {
      hide(statusSection);
      loadDigest(digest, true);
    });
  }

  function showError(message) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    hide(replayBtn);
    show(statusSection);
  }

  // --- Past Digests ---

  function loadPastDigests() {
    var pastDigests = [];
    var fetched = 0;
    var totalDays = 7;

    for (var i = 1; i <= totalDays; i++) {
      (function (daysAgo) {
        var dateStr = getDateString(daysAgo);
        fetch('digests/' + dateStr + '.json')
          .then(function (res) {
            if (!res.ok) throw new Error('Not found');
            return res.json();
          })
          .then(function (data) {
            pastDigests.push(data);
          })
          .catch(function () {
            // No digest for this date — that's fine
          })
          .finally(function () {
            fetched++;
            if (fetched === totalDays) {
              renderPastDigests(pastDigests);
            }
          });
      })(i);
    }
  }

  function renderPastDigests(digests) {
    pastList.innerHTML = '';

    if (digests.length === 0) {
      pastList.innerHTML = '<p class="past-empty">No past digests available</p>';
      return;
    }

    // Sort by date descending
    digests.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    digests.forEach(function (digest) {
      var card = document.createElement('div');
      card.className = 'past-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      card.innerHTML =
        '<div class="past-card-info">' +
          '<span class="past-card-date">' + formatDateShort(digest.date) + '</span>' +
          '<span class="past-card-title">' + escapeHtml(digest.title) + '</span>' +
        '</div>' +
        '<div>' +
          '<span class="past-card-duration">' + formatTime(digest.duration_seconds) + '</span>' +
          ' <span class="past-card-play" aria-label="Play">\u25B6</span>' +
        '</div>';

      card.addEventListener('click', function () {
        loadDigest(digest, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      pastList.appendChild(card);
    });
  }

  // --- Initialisation ---

  function init() {
    fetch('digests/latest.json')
      .then(function (res) {
        if (!res.ok) throw new Error('No digest available');
        return res.json();
      })
      .then(function (digest) {
        hide(loadingSection);

        var lastPlayed = localStorage.getItem(STORAGE_KEY);

        if (lastPlayed === digest.date) {
          // Already heard today's digest
          showUpToDate(digest);
        } else {
          // New digest — auto-play
          loadDigest(digest, true);
        }
      })
      .catch(function () {
        hide(loadingSection);
        showError('No digest available yet. Check back later.');
      });

    loadPastDigests();
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.warn('Service worker registration failed:', err);
    });
  }

  init();
})();

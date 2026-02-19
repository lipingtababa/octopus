(function () {
  'use strict';

  // --- DOM Elements ---
  var playerControls = document.getElementById('player-controls');
  var loadingIndicator = document.getElementById('loading-indicator');
  var statusArea = document.getElementById('status-area');
  var pastSection = document.getElementById('past-section');
  var pastList = document.getElementById('past-list');
  var digestTitle = document.getElementById('digest-title');
  var digestDate = document.getElementById('digest-date');
  var audioPlayer = document.getElementById('audio-player');
  var playBtn = document.getElementById('play-btn');
  var playIcon = document.getElementById('play-icon');
  var pauseIcon = document.getElementById('pause-icon');
  var rewindBtn = document.getElementById('rewind-btn');
  var forwardBtn = document.getElementById('forward-btn');
  var progressBar = document.getElementById('progress-bar');
  var currentTimeEl = document.getElementById('current-time');
  var durationEl = document.getElementById('duration');
  var statusMessage = document.getElementById('status-message');
  var replayBtn = document.getElementById('replay-btn');

  var STORAGE_KEY = 'octopus-last-played';

  // --- Utility ---

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function formatDateNice(dateStr) {
    try {
      var date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  function formatDateShort(dateStr) {
    try {
      var date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short'
      });
    } catch (e) {
      return dateStr;
    }
  }

  function getDateString(daysAgo) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // --- Audio Player ---

  function updatePlayButton() {
    if (!audioPlayer.paused) {
      hide(playIcon);
      show(pauseIcon);
      playBtn.setAttribute('aria-label', 'Pause');
    } else {
      show(playIcon);
      hide(pauseIcon);
      playBtn.setAttribute('aria-label', 'Play');
    }
  }

  playBtn.addEventListener('click', function () {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) {
      audioPlayer.play().catch(function () {});
    } else {
      audioPlayer.pause();
    }
  });

  rewindBtn.addEventListener('click', function () {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
  });

  forwardBtn.addEventListener('click', function () {
    audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 15);
  });

  audioPlayer.addEventListener('play', updatePlayButton);
  audioPlayer.addEventListener('pause', updatePlayButton);
  audioPlayer.addEventListener('ended', function () {
    updatePlayButton();
    progressBar.value = 100;
  });

  audioPlayer.addEventListener('timeupdate', function () {
    if (audioPlayer.duration) {
      progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
  });

  audioPlayer.addEventListener('loadedmetadata', function () {
    durationEl.textContent = formatTime(audioPlayer.duration);
  });

  progressBar.addEventListener('input', function () {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    }
  });

  // --- Load & Play ---

  function loadDigest(digest, autoPlay) {
    digestTitle.textContent = digest.title;
    digestDate.textContent = formatDateNice(digest.date);

    if (digest.duration_seconds) {
      durationEl.textContent = formatTime(digest.duration_seconds);
    }

    audioPlayer.src = digest.audio_url;
    hide(loadingIndicator);
    hide(statusArea);
    show(playerControls);

    if (autoPlay) {
      audioPlayer.play().catch(function () {
        // Autoplay blocked — user taps play
      });
    }

    localStorage.setItem(STORAGE_KEY, digest.date);

  }

  function showUpToDate(digest) {
    hide(loadingIndicator);
    hide(playerControls);

    digestTitle.textContent = digest.title;
    digestDate.textContent = formatDateNice(digest.date);

    statusMessage.textContent = "You're up to date";
    statusMessage.className = 'status-message success';
    show(replayBtn);
    show(statusArea);

    replayBtn.addEventListener('click', function () {
      hide(statusArea);
      loadDigest(digest, true);
    });


  }

  function showError(message) {
    hide(loadingIndicator);
    hide(playerControls);
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    hide(replayBtn);
    show(statusArea);
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
          .then(function (data) { pastDigests.push(data); })
          .catch(function () {})
          .finally(function () {
            fetched++;
            if (fetched === totalDays) renderPastDigests(pastDigests);
          });
      })(i);
    }
  }

  function renderPastDigests(digests) {
    if (digests.length === 0) {
      hide(pastSection);
      return;
    }

    digests.sort(function (a, b) { return b.date.localeCompare(a.date); });
    pastList.innerHTML = '';

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
          '<span class="past-card-play">\u25B6</span>' +
        '</div>';

      card.addEventListener('click', function () {
        loadDigest(digest, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      pastList.appendChild(card);
    });

    show(pastSection);
  }

  // --- Init ---

  function init() {
    fetch('digests/latest.json')
      .then(function (res) {
        if (!res.ok) throw new Error('No digest');
        return res.json();
      })
      .then(function (digest) {
        var lastPlayed = localStorage.getItem(STORAGE_KEY);
        if (lastPlayed === digest.date) {
          showUpToDate(digest);
        } else {
          loadDigest(digest, true);
        }
      })
      .catch(function () {
        showError('No digest available yet');
      });

    loadPastDigests();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  init();
})();

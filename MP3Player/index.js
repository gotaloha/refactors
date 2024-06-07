(function (window, undefined) {
  "use strict";
  var AudioPlayer = (function () {
    var player = document.getElementById("ap"),
      playBtn,
      prevBtn,
      nextBtn,
      plBtn,
      repeatBtn,
      volumeBtn,
      progressBar,
      preloadBar,
      curTime,
      durTime,
      trackTitle,
      audio,
      index = 0,
      playList,
      volumeBar,
      volumeLength,
      repeating = false,
      seeking = false,
      rightClick = false,
      apActive = false,
      pl,
      plLi,
      settings = { volume: 0.1, autoPlay: false, notification: true, playList: [] };

    const init = function(options) {
      if (!("classList" in document.documentElement)) {
        return false;
      }

      if (apActive || player === null) {
        return;
      }

      settings = extend(settings, options);
      playBtn = player.querySelector(".ap-toggle-btn");
      prevBtn = player.querySelector(".ap-prev-btn");
      nextBtn = player.querySelector(".ap-next-btn");
      repeatBtn = player.querySelector(".ap-repeat-btn");
      volumeBtn = player.querySelector(".ap-volume-btn");
      plBtn = player.querySelector(".ap-playlist-btn");
      curTime = player.querySelector(".ap-time--current");
      durTime = player.querySelector(".ap-time--duration");
      trackTitle = player.querySelector(".ap-title");
      progressBar = player.querySelector(".ap-bar");
      preloadBar = player.querySelector(".ap-preload-bar");
      volumeBar = player.querySelector(".ap-volume-bar");
      playList = settings.playList;
      playBtn.addEventListener("click", playToggle, false);
      volumeBtn.addEventListener("click", volumeToggle, false);
      repeatBtn.addEventListener("click", repeatToggle, false);
      progressBar.parentNode.parentNode.addEventListener("mousedown", handlerBar, false);
      progressBar.parentNode.parentNode.addEventListener("mousemove", seek, false);
      document.documentElement.addEventListener("mouseup", seekingFalse, false);
      volumeBar.parentNode.parentNode.addEventListener("mousedown", handlerVol, false);
      volumeBar.parentNode.parentNode.addEventListener("mousemove", setVolume);
      document.documentElement.addEventListener("mouseup", seekingFalse, false);
      prevBtn.addEventListener("click", prev, false);
      nextBtn.addEventListener("click", next, false);
      apActive = true;
      renderPL();
      plBtn.addEventListener("click", plToggle, false);
      audio = new Audio();
      audio.volume = settings.volume;

      if (isEmptyList()) {
        empty();
        return;
      }

      audio.src = playList[index].file;
      audio.preload = "auto";
      trackTitle.innerHTML = playList[index].title;
      volumeBar.style.height = audio.volume * 100 + "%";
      volumeLength = volumeBar.css("height");
      audio.addEventListener("error", error, false);
      audio.addEventListener("timeupdate", update, false);
      audio.addEventListener("ended", doEnd, false);

      if (settings.autoPlay) {
        audio.play();
        playBtn.classList.add("playing");
        plLi[index].classList.add("pl-current");
      }
    }

    const renderPL = function() {
      var html = [];
      var tpl =`
        <li data-track="{count}">
          <div class="pl-number">
            <div class="pl-count">
              <svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div class="pl-playing">
              <div class="eq">
                <div class="eq-bar"></div>
                <div class="eq-bar"></div>
                <div class="eq-bar"></div>
              </div>
            </div>
          </div>
          <div class="pl-title">{title}</div>
          <button class="pl-remove">
            <svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </svg>
          </button>
        </li>`;

      playList.forEach(function (item, i) {
        html.push(tpl.replace("{count}", i).replace("{title}", item.title));
      });
      pl = create("div", { className: "pl-container hide", id: "pl", innerHTML: !isEmptyList() ? '<ul class="pl-list">' + html.join("") + "</ul>" : '<div class="pl-empty">PlayList is empty</div>' });
      player.parentNode.insertBefore(pl, player.nextSibling);
      plLi = pl.querySelectorAll("li");
      pl.addEventListener("click", listHandler, false);
    }

    const listHandler = function(evt) {
      evt.preventDefault();

      if (evt.target.className === "pl-title") {
        var current = parseInt(evt.target.parentNode.getAttribute("data-track"), 10);
        index = current;
        play();
        plActive();
      } else {
        var target = evt.target;
        while (target.className !== pl.className) {
          if (target.className === "pl-remove") {
            var isDel = parseInt(target.parentNode.getAttribute("data-track"), 10);
            playList.splice(isDel, 1);
            target.parentNode.parentNode.removeChild(target.parentNode);
            plLi = pl.querySelectorAll("li");
            [].forEach.call(plLi, function (el, i) {
              el.setAttribute("data-track", i);
            });
            if (!audio.paused) {
              if (isDel === index) {
                play();
              }
            } else {
              if (isEmptyList()) {
                empty();
              } else {
                audio.src = playList[index].file;
                document.title = trackTitle.innerHTML = playList[index].title;
                progressBar.style.width = 0;
              }
            }
            if (isDel < index) {
              index--;
            }
            return;
          }
          target = target.parentNode;
        }
      }
    }

    const plActive = function() {
      if (audio.paused) {
        plLi[index].classList.remove("pl-current");
        return;
      }

      var current = index;

      for (var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove("pl-current");
      }

      plLi[current].classList.add("pl-current");
    }

    const error = function() {
      !isEmptyList() && next();
    }

    const play = function() {
      index = index > playList.length - 1 ? 0 : index;

      if (index < 0) index = playList.length - 1;

      if (isEmptyList()) {
        empty();
        return;
      }

      audio.src = playList[index].file;
      audio.preload = "auto";
      document.title = trackTitle.innerHTML = playList[index].title;
      audio.play();
      notify(playList[index].title, { icon: playList[index].icon, body: "Now playing", tag: "music-player" });
      playBtn.classList.add("playing");
      plActive();
    }

    const prev = function() {
      index = index - 1;
      play();
    }

    const next = function() {
      index = index + 1;
      play();
    }

    const isEmptyList = function() {
      return playList.length === 0;
    }

    const empty = function() {
      audio.pause();
      audio.src = "";
      trackTitle.innerHTML = "queue is empty";
      curTime.innerHTML = "--";
      durTime.innerHTML = "--";
      progressBar.style.width = 0;
      preloadBar.style.width = 0;
      playBtn.classList.remove("playing");
      pl.innerHTML = '<div class="pl-empty">PlayList is empty</div>';
    }

    const playToggle = function() {
      if (isEmptyList()) {
        return;
      }

      if (audio.paused) {
        audio.play();
        notify(playList[index].title, { icon: playList[index].icon, body: "Now playing" });
        this.classList.add("playing");
      } else {
        audio.pause();
        this.classList.remove("playing");
      }
      plActive();
    }

    const volumeToggle = function() {
      if (audio.muted) {
        if (parseInt(volumeLength, 10) === 0) {
          volumeBar.style.height = "100%";
          audio.volume = 1;
        } else {
          volumeBar.style.height = volumeLength;
        }
        audio.muted = false;
        this.classList.remove("muted");
      } else {
        audio.muted = true;
        volumeBar.style.height = 0;
        this.classList.add("muted");
      }
    }

    const repeatToggle = function() {
      var repeat = this.classList;

      if (repeat.contains("ap-active")) {
        repeating = false;
        repeat.remove("ap-active");
      } else {
        repeating = true;
        repeat.add("ap-active");
      }
    }

    const plToggle = function() {
      this.classList.toggle("ap-active");
      pl.classList.toggle("hide");
    }

    const update = function() {
      if (audio.readyState === 0) return;

      var barlength = Math.round(audio.currentTime * (100 / audio.duration));
      progressBar.style.width = barlength + "%";
      var curMins = Math.floor(audio.currentTime / 60),
        curSecs = Math.floor(audio.currentTime - curMins * 60),
        mins = Math.floor(audio.duration / 60),
        secs = Math.floor(audio.duration - mins * 60);
      curSecs < 10 && (curSecs = "0" + curSecs);
      secs < 10 && (secs = "0" + secs);
      curTime.innerHTML = curMins + ":" + curSecs;
      durTime.innerHTML = mins + ":" + secs;
      var buffered = audio.buffered;

      if (buffered.length) {
        var loaded = Math.round((100 * buffered.end(0)) / audio.duration);
        preloadBar.style.width = loaded + "%";
      }
    }

    const doEnd = function() {
      if (index === playList.length - 1) {
        if (!repeating) {
          audio.pause();
          plActive();
          playBtn.classList.remove("playing");
          return;
        } else {
          index = 0;
          play();
        }
      } else {
        index = index === playList.length - 1 ? 0 : index + 1;
        play();
      }
    }

    const moveBar = function(evt, el, dir) {
      var value;

      if (dir === "horizontal") {
        value = Math.round(((evt.clientX - el.offset().left) * 100) / el.parentNode.offsetWidth);
        el.style.width = value + "%";
        return value;
      } else {
        var offset = el.offset().top + el.offsetHeight;
        value = Math.round(offset - evt.clientY);

        if (value > 100) value = 100;

        if (value < 0) value = 0;

        volumeBar.style.height = value + "%";
        return value;
      }
    }

    const handlerBar = function(evt) {
      rightClick = evt.which === 3 ? true : false;
      seeking = true;
      seek(evt);
    }

    const handlerVol = function(evt) {
      rightClick = evt.which === 3 ? true : false;
      seeking = true;
      setVolume(evt);
    }

    const seek = function(evt) {
      if (seeking && rightClick === false && audio.readyState !== 0) {
        var value = moveBar(evt, progressBar, "horizontal");
        audio.currentTime = audio.duration * (value / 100);
      }
    }

    const seekingFalse = function() {
      seeking = false;
    }

    const setVolume = function(evt) {
      volumeLength = volumeBar.css("height");

      if (seeking && rightClick === false) {
        var value = moveBar(evt, volumeBar.parentNode, "vertical") / 100;

        if (value <= 0) {
          audio.volume = 0;
          volumeBtn.classList.add("muted");
        } else {
          if (audio.muted) audio.muted = false;
          audio.volume = value;
          volumeBtn.classList.remove("muted");
        }
      }
    }

    const notify = function(title, attr) {
      if (!settings.notification) {
        return;
      }

      if (window.Notification === undefined) {
        return;
      }

      window.Notification.requestPermission(function (access) {
        if (access === "granted") {
          var notice = new Notification(title.substr(0, 110), attr);
          notice.onshow = function () {
            setTimeout(function () {
              notice.close();
            }, 5000);
          };
        }
      });
    }

    const destroy = function() {
      if (!apActive) return;

      playBtn.removeEventListener("click", playToggle, false);
      volumeBtn.removeEventListener("click", volumeToggle, false);
      repeatBtn.removeEventListener("click", repeatToggle, false);
      plBtn.removeEventListener("click", plToggle, false);
      progressBar.parentNode.parentNode.removeEventListener("mousedown", handlerBar, false);
      progressBar.parentNode.parentNode.removeEventListener("mousemove", seek, false);
      document.documentElement.removeEventListener("mouseup", seekingFalse, false);
      volumeBar.parentNode.parentNode.removeEventListener("mousedown", handlerVol, false);
      volumeBar.parentNode.parentNode.removeEventListener("mousemove", setVolume);
      document.documentElement.removeEventListener("mouseup", seekingFalse, false);
      prevBtn.removeEventListener("click", prev, false);
      nextBtn.removeEventListener("click", next, false);
      audio.removeEventListener("error", error, false);
      audio.removeEventListener("timeupdate", update, false);
      audio.removeEventListener("ended", doEnd, false);
      player.parentNode.removeChild(player);
      pl.removeEventListener("click", listHandler, false);
      pl.parentNode.removeChild(pl);
      audio.pause();
      apActive = false;
    }

    const extend = function(defaults, options) {
      for (var name in options) {
        if (defaults.hasOwnProperty(name)) {
          defaults[name] = options[name];
        }
      }
      return defaults;
    }

    const create = function(el, attr) {
      var element = document.createElement(el);

      if (attr) {
        for (var name in attr) {
          if (element[name] !== undefined) {
            element[name] = attr[name];
          }
        }
      }
      return element;
    }

    Element.prototype.offset = function () {
      var el = this.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return { top: el.top + scrollTop, left: el.left + scrollLeft };
    };

    Element.prototype.css = function (attr) {
      if (typeof attr === "string") {
        return getComputedStyle(this, "")[attr];
      } else if (typeof attr === "object") {
        for (var name in attr) {
          if (this.style[name] !== undefined) {
            this.style[name] = attr[name];
          }
        }
      }
    };

    return { init: init, destroy: destroy };
  })();
  window.AP = AudioPlayer;
})(window);

// test image for web notifications
var iconImage = "http://funkyimg.com/i/21pX5.png";

AP.init({
  playList: [
    { icon: iconImage, title: "Tranquil Whispers", file: "https://feeds.soundcloud.com/stream/1835951256-erikolsonmn-tranquil-whispers.mp3", thumb: "https://i1.sndcdn.com/artworks-1Sk44CxJjtDWXkM0-G2QzXA-t3000x3000.png" },
    { icon: iconImage, title: "The Silence of Goodbye", file: "https://feeds.soundcloud.com/stream/1835577573-erikolsonmn-the-silence-of-goodbye.mp3", thumb: "https://i1.sndcdn.com/artworks-HrbRj60VpxtHFjjV-kQY0XA-t3000x3000.jpg" },
    { icon: iconImage, title: "Tears in the Cosmos", file: "https://feeds.soundcloud.com/stream/1825761414-erikolsonmn-tears-in-the-cosmos-1.mp3", thumb: "https://i1.sndcdn.com/artworks-4d6ymrxy0U1t1RHn-In3gaw-t3000x3000.jpg" },
    { icon: iconImage, title: "Aeon", file: "https://feeds.soundcloud.com/stream/1825601205-erikolsonmn-aeon.mp3", thumb: "https://i1.sndcdn.com/artworks-NwyHmgVDciCGzkzp-k0EpnQ-t3000x3000.jpg" },
    { icon: iconImage, title: "The Time Has Come", file: "https://feeds.soundcloud.com/stream/1820459832-erikolsonmn-the-time-has-come.mp3", thumb: "https://i1.sndcdn.com/artworks-jAHTWfxpFujiiK07-81ol2A-t3000x3000.png" },
    { icon: iconImage, title: "Isolation", file: "https://feeds.soundcloud.com/stream/1820209872-erikolsonmn-isolation-1.mp3", thumb: "https://i1.sndcdn.com/artworks-xifq8V5WpYRyQOVv-Vzcgdg-t3000x3000.png" },
    { icon: iconImage, title: "A Walk In The Clouds", file: "https://feeds.soundcloud.com/stream/1820197542-erikolsonmn-a-walk-in-the-clouds.mp3", thumb: "https://i1.sndcdn.com/artworks-dfPz5y8H68xdsO2E-zE6XAg-t3000x3000.jpg" },
    { icon: iconImage, title: "A Light Without Heat", file: "https://feeds.soundcloud.com/stream/1820195679-erikolsonmn-a-light-without-heat.mp3", thumb: "https://i1.sndcdn.com/artworks-wEmjayODIfwsE3N7-BcVMqw-t3000x3000.jpg" },
    { icon: iconImage, title: "Symbiote", file: "https://feeds.soundcloud.com/stream/1820159874-erikolsonmn-symbiote.mp3", thumb: "https://i1.sndcdn.com/artworks-eKAKhby9c2fOGh8z-yuiIGQ-t3000x3000.jpg" },
    { icon: iconImage, title: "Ka Moana Nani", file: "https://feeds.soundcloud.com/stream/1819835400-erikolsonmn-ka-moana-nani.mp3", thumb: "https://i1.sndcdn.com/artworks-kzkXsY3y4ZJyYJf6-LE9uAQ-t3000x3000.png" },
    { icon: iconImage, title: "For Liz", file: "https://feeds.soundcloud.com/stream/1800722524-erikolsonmn-for-liz.mp3", thumb: "https://i1.sndcdn.com/artworks-FNIGlTAj07uQw7q3-T5lwmg-t3000x3000.jpg" },
    { icon: iconImage, title: "Obscured by Reason", file: "https://feeds.soundcloud.com/stream/1802573754-erikolsonmn-obscured-by-reason.mp3", thumb: "https://i1.sndcdn.com/artworks-Sm8rjVoyg6MzX6E1-DtI5Vg-t3000x3000.jpg" },
    { icon: iconImage, title: "In The Clouds", file: "https://feeds.soundcloud.com/stream/1802547093-erikolsonmn-in-the-clouds.mp3", thumb: "https://i1.sndcdn.com/artworks-9Di9JtXN1mZzPyNj-xIJrGw-t3000x3000.jpg" },
    { icon: iconImage, title: "Gentle Thunderstorm", file: "https://feeds.soundcloud.com/stream/1801967878-erikolsonmn-gentle-thunderstorm.mp3", thumb: "https://i1.sndcdn.com/artworks-t3sae6B2mVexiDbt-izTMHw-t3000x3000.jpg" },
    { icon: iconImage, title: "Isolation", file: "https://feeds.soundcloud.com/stream/1801967764-erikolsonmn-isolation.mp3", thumb: "https://i1.sndcdn.com/artworks-zwUoEEslaTkYZSen-oPy5Pw-t3000x3000.jpg" },
    { icon: iconImage, title: "Cosmic Nebula - Part Two", file: "https://feeds.soundcloud.com/stream/1801937986-erikolsonmn-cosmic-nebula-part-two.mp3", thumb: "https://i1.sndcdn.com/artworks-tU6vhyyTl5LpyxwF-krwD4Q-t3000x3000.jpg" },
    { icon: iconImage, title: "Rant and Rave", file: "https://feeds.soundcloud.com/stream/1800786079-erikolsonmn-rant-and-rave.mp3", thumb: "https://i1.sndcdn.com/artworks-PHcWrDiIMur2XKpn-fmf9lQ-t3000x3000.jpg" },
    { icon: iconImage, title: "Fall Into Sleep", file: "https://feeds.soundcloud.com/stream/1797442495-erikolsonmn-fall-into-sleep.mp3", thumb: "https://i1.sndcdn.com/artworks-E9LaVFKHa8jDucQ7-ACSxkg-t3000x3000.jpg" },
    { icon: iconImage, title: "In Motion", file: "https://feeds.soundcloud.com/stream/1797431038-erikolsonmn-in-motion.mp3", thumb: "https://i1.sndcdn.com/artworks-zHTM5N17rqVw0AFg-kt37Vg-t3000x3000.jpg" },
    { icon: iconImage, title: "Beyond the Stars", file: "https://feeds.soundcloud.com/stream/1797411745-erikolsonmn-beyond-the-stars.mp3", thumb: "https://i1.sndcdn.com/artworks-1oCrWYlrEZt1oYOn-01ygzg-t3000x3000.jpg" },
    { icon: iconImage, title: "The Untidy Monstrosity", file: "https://feeds.soundcloud.com/stream/1797390808-erikolsonmn-the-untidy-monstrosity.mp3", thumb: "https://i1.sndcdn.com/artworks-L0toQfc52sMDWNla-SnhJTA-t3000x3000.jpg" },
    { icon: iconImage, title: "Luna", file: "https://feeds.soundcloud.com/stream/1797372853-erikolsonmn-luna.mp3", thumb: "https://i1.sndcdn.com/artworks-vvjKz7y3s3s7lRpG-czYHjw-t3000x3000.jpg" },
    { icon: iconImage, title: "Journey to the Galactic Center", file: "https://feeds.soundcloud.com/stream/1789440265-erikolsonmn-journey-to-the-galactic-center.mp3", thumb: "https://i1.sndcdn.com/artworks-y5SUHRksPTa0CgWE-yGZzYA-t3000x3000.jpg" },
    { icon: iconImage, title: "An Injustice to All", file: "https://feeds.soundcloud.com/stream/1789295533-erikolsonmn-an-injustice-to-all.mp3", thumb: "https://i1.sndcdn.com/artworks-aq8546aeytIbyR6X-DkNh2A-t3000x3000.jpg" },
    { icon: iconImage, title: "Tranquil Serenity", file: "https://feeds.soundcloud.com/stream/1789119769-erikolsonmn-tranquil-serenity.mp3", thumb: "https://i1.sndcdn.com/artworks-3nWjv3llh4Q8XupG-bNIzOQ-t3000x3000.jpg" },
    { icon: iconImage, title: "Reflection of Solitude", file: "https://feeds.soundcloud.com/stream/1788697849-erikolsonmn-reflection-of-solitude.mp3", thumb: "https://i1.sndcdn.com/artworks-2pdlKl4AeVZ2IJRQ-6DT4RA-t3000x3000.jpg" },
    { icon: iconImage, title: "On Another Shore", file: "https://feeds.soundcloud.com/stream/1785389742-erikolsonmn-on-another-shore.mp3", thumb: "https://i1.sndcdn.com/artworks-IstiCMX7RGFS7UKS-eX10Tg-t3000x3000.png" },
    { icon: iconImage, title: "Takin' It In Stride", file: "https://feeds.soundcloud.com/stream/1783400628-erikolsonmn-takin-it-in-stride.mp3", thumb: "https://i1.sndcdn.com/artworks-q69c9SMpMxTVr7Jt-jCqaug-t3000x3000.jpg" },
    { icon: iconImage, title: "The Slipstream", file: "https://feeds.soundcloud.com/stream/1782684204-erikolsonmn-the-slipstream.mp3", thumb: "https://i1.sndcdn.com/artworks-MBwXy0zUp98zRCVB-TLekdg-t3000x3000.jpg" },
    { icon: iconImage, title: "A Distant Shadow Approaches", file: "https://feeds.soundcloud.com/stream/1780403013-erikolsonmn-a-distant-shadow-approaches.mp3", thumb: "https://i1.sndcdn.com/artworks-JKTZ3hyQryvlZ9oN-wWeGqw-t3000x3000.jpg" },
    { icon: iconImage, title: "Infinite Embrace", file: "https://feeds.soundcloud.com/stream/1780304178-erikolsonmn-infinite-embrace.mp3", thumb: "https://i1.sndcdn.com/artworks-L5cC1sanJogNkkbr-59Iqkg-t3000x3000.jpg" },
    { icon: iconImage, title: "Diaspora Act II", file: "https://feeds.soundcloud.com/stream/1777516347-erikolsonmn-diaspora-act-ii.mp3", thumb: "https://i1.sndcdn.com/artworks-Ux3OaBMrZFIt0TFy-vkdAbQ-t3000x3000.jpg" },
    { icon: iconImage, title: "Diaspora Act I", file: "https://feeds.soundcloud.com/stream/1777516161-erikolsonmn-diaspora-act-i.mp3", thumb: "https://i1.sndcdn.com/artworks-91u2qtswYm3VbyxI-rCRA2g-t3000x3000.jpg" },
    { icon: iconImage, title: "A Feeling I Get", file: "https://feeds.soundcloud.com/stream/1776673728-erikolsonmn-a-feeling-i-get.mp3", thumb: "https://i1.sndcdn.com/artworks-Jmo0eXoUEMg4vqZ5-DzBzUA-t3000x3000.jpg" },
    { icon: iconImage, title: "Cosmic Journey - Act IV", file: "https://feeds.soundcloud.com/stream/1771095633-erikolsonmn-cosmic-journey-act-iv.mp3", thumb: "https://i1.sndcdn.com/artworks-hc8jpkLV4TI2Sbja-usgIsQ-t3000x3000.png" },
    { icon: iconImage, title: "Cosmic Journey - Act III", file: "https://feeds.soundcloud.com/stream/1771095432-erikolsonmn-cosmic-journey-act-iii.mp3", thumb: "https://i1.sndcdn.com/artworks-Kj9nsYGZoJRykDta-EMiKnQ-t3000x3000.png" },
    { icon: iconImage, title: "Cosmic Journey - Act II", file: "https://feeds.soundcloud.com/stream/1771095180-erikolsonmn-cosmic-journey-act-ii.mp3", thumb: "https://i1.sndcdn.com/artworks-zaACEyTzpyYiz5rB-qxRa3Q-t3000x3000.png" },
    { icon: iconImage, title: "Cosmic Journey - Act I", file: "https://feeds.soundcloud.com/stream/1771095060-erikolsonmn-cosmic-journey-act-i.mp3", thumb: "https://i1.sndcdn.com/artworks-dcGpwY1wB3CB9MWL-4umrzg-t3000x3000.png" },
    { icon: iconImage, title: "An Uncertain Question", file: "https://feeds.soundcloud.com/stream/1771054509-erikolsonmn-an-uncertain-question.mp3", thumb: "https://i1.sndcdn.com/artworks-nOGOZS2GJyYyRyEf-VCtvvg-t3000x3000.jpg" },
    { icon: iconImage, title: "Transcendence", file: "https://feeds.soundcloud.com/stream/1767609249-erikolsonmn-transcendence-1.mp3", thumb: "https://i1.sndcdn.com/artworks-d5omgdEzuubLFj7W-f176AQ-t3000x3000.jpg" },
    { icon: iconImage, title: "The Dark", file: "https://feeds.soundcloud.com/stream/1767557577-erikolsonmn-the-dark.mp3", thumb: "https://i1.sndcdn.com/artworks-XqIupMj80z9gBmk0-043lnw-t3000x3000.jpg" },
    { icon: iconImage, title: "Angelic Chorus", file: "https://feeds.soundcloud.com/stream/1766598861-erikolsonmn-angelic-chorus.mp3", thumb: "https://i1.sndcdn.com/artworks-9GVZ7aYHG288260E-z8QUdA-t3000x3000.jpg" },
    { icon: iconImage, title: "Annihilation", file: "https://feeds.soundcloud.com/stream/1760802696-erikolsonmn-annihilation.mp3", thumb: "https://i1.sndcdn.com/artworks-fbk2c6yAazpIqJPu-LhSIJg-t3000x3000.jpg" },
    { icon: iconImage, title: "An Easy Promise", file: "https://feeds.soundcloud.com/stream/1760789565-erikolsonmn-an-easy-promise.mp3", thumb: "https://i1.sndcdn.com/artworks-Epj4yXVHBqmu9jCK-tojy1w-t3000x3000.jpg" },
    { icon: iconImage, title: "Forest Walk", file: "https://feeds.soundcloud.com/stream/1759890222-erikolsonmn-forest-walk.mp3", thumb: "https://i1.sndcdn.com/artworks-PhW0Ki6AVm37JkXd-fRvGyg-t3000x3000.jpg" },
    { icon: iconImage, title: "Reflection", file: "https://feeds.soundcloud.com/stream/1759886799-erikolsonmn-reflection.mp3", thumb: "https://i1.sndcdn.com/artworks-Fu18XzMKyzDgoFm1-1SPzlA-t3000x3000.jpg" },
    { icon: iconImage, title: "The Odyssey", file: "https://feeds.soundcloud.com/stream/1758927375-erikolsonmn-the-odyssey.mp3", thumb: "https://i1.sndcdn.com/artworks-7VBDnmKu3EQWG1JX-AepYVQ-t3000x3000.png" },
    { icon: iconImage, title: "A Thought", file: "https://feeds.soundcloud.com/stream/1757783307-erikolsonmn-a-thought.mp3", thumb: "https://i1.sndcdn.com/artworks-7IPgn7AAy0koIYZK-IXolUg-t3000x3000.jpg" },
    { icon: iconImage, title: "Atmos", file: "https://feeds.soundcloud.com/stream/1757554440-erikolsonmn-atmos.mp3", thumb: "https://i1.sndcdn.com/artworks-friLl5mqlxvtkmLQ-G12G7g-t3000x3000.jpg" },
    { icon: iconImage, title: "The World Waits", file: "https://feeds.soundcloud.com/stream/1757956236-erikolsonmn-the-world-waits.mp3", thumb: "https://i1.sndcdn.com/artworks-IYHWfkazFoJtwNiZ-cJzGSw-t3000x3000.jpg" },
    { icon: iconImage, title: "Let Sleeping Dragons Sleep", file: "https://feeds.soundcloud.com/stream/1750991967-erikolsonmn-let-sleeping-dragons-sleep.mp3", thumb: "https://i1.sndcdn.com/artworks-KR9L2VITfTmcx6Rb-UISLJg-t3000x3000.jpg" },
    { icon: iconImage, title: "Longing for the Sea", file: "https://feeds.soundcloud.com/stream/1754503029-erikolsonmn-longing-for-the-sea.mp3", thumb: "https://i1.sndcdn.com/artworks-591XRQaMNEwkdXIF-YjghGg-t3000x3000.png" },
    { icon: iconImage, title: "When Orion Fell", file: "https://feeds.soundcloud.com/stream/1747569036-erikolsonmn-when-orion-fell.mp3", thumb: "https://i1.sndcdn.com/artworks-pqSx6jzR23ZwjjwQ-D4E3yA-t3000x3000.jpg" },
    { icon: iconImage, title: "Peaceful Dreams", file: "https://feeds.soundcloud.com/stream/1750809567-erikolsonmn-peaceful-dreams.mp3", thumb: "https://i1.sndcdn.com/artworks-SYHsSxz4zHzBRhtp-Aoq81Q-t3000x3000.png" },
    { icon: iconImage, title: "Shanonona", file: "https://feeds.soundcloud.com/stream/1681113414-erikolsonmn-shanonona.mp3", thumb: "https://i1.sndcdn.com/artworks-3XTj8qS4XFQGm84u-e0l7qg-t3000x3000.jpg" },
    { icon: iconImage, title: "Morning Whisper", file: "https://feeds.soundcloud.com/stream/1750399836-erikolsonmn-morning-whisper.mp3", thumb: "https://i1.sndcdn.com/artworks-J9wmXpPRRfBqHELo-K1fTBg-t3000x3000.png" },
    { icon: iconImage, title: "Forbidden Lore", file: "https://feeds.soundcloud.com/stream/1744031484-erikolsonmn-forbidden-lore.mp3", thumb: "https://i1.sndcdn.com/artworks-4Fb0l9QepazN7cly-t68Snw-t3000x3000.jpg" },
    { icon: iconImage, title: "A Sight Beyond Words", file: "https://feeds.soundcloud.com/stream/1744145199-erikolsonmn-a-sight-beyond-words.mp3", thumb: "https://i1.sndcdn.com/artworks-2Z2qzmlPnkxvT6BO-cMZUeA-t3000x3000.jpg" },
    { icon: iconImage, title: "The Path Taken", file: "https://feeds.soundcloud.com/stream/1743299337-erikolsonmn-the-path-taken.mp3", thumb: "https://i1.sndcdn.com/artworks-VibIankJYZLInS66-KPO0IA-t3000x3000.jpg" },
    { icon: iconImage, title: "Deep Slumber", file: "https://feeds.soundcloud.com/stream/1741824864-erikolsonmn-deep-slumber.mp3", thumb: "https://i1.sndcdn.com/artworks-zebykaSPsQRwd88v-pWe9xw-t3000x3000.jpg" },
    { icon: iconImage, title: "A Simple Wish", file: "https://feeds.soundcloud.com/stream/1741812090-erikolsonmn-a-simple-wish.mp3", thumb: "https://i1.sndcdn.com/artworks-XUCf39ICquXvPbSZ-TaTNZA-t3000x3000.png" },
    { icon: iconImage, title: "Persistence of Vision", file: "https://feeds.soundcloud.com/stream/1681113513-erikolsonmn-persistence-of-vision.mp3", thumb: "https://i1.sndcdn.com/artworks-2Ll4hHNe48sSXG30-TbJqbQ-t3000x3000.jpg" },
    { icon: iconImage, title: "Of Silence Unbound", file: "https://feeds.soundcloud.com/stream/1741802745-erikolsonmn-of-silence-unbound.mp3", thumb: "https://i1.sndcdn.com/artworks-8suyx0T7ySh5uwCA-EsWZog-t3000x3000" },
    { icon: iconImage, title: "A Forgotten Shadow", file: "https://feeds.soundcloud.com/stream/1737787398-erikolsonmn-a-forgotten-shadow.mp3", thumb: "https://i1.sndcdn.com/artworks-z1VGOqIiByyez0yU-zEFiEA-t3000x3000" },
    { icon: iconImage, title: "An Imponderable Belief", file: "https://feeds.soundcloud.com/stream/1741774014-erikolsonmn-an-imponderable-belief.mp3", thumb: "https://i1.sndcdn.com/artworks-xsrOCknnKIhg6S3L-5fhlXg-t3000x3000" },
    { icon: iconImage, title: "Ethereal Tension", file: "https://feeds.soundcloud.com/stream/1740917808-erikolsonmn-ethereal-tension.mp3", thumb: "https://i1.sndcdn.com/artworks-jQJh8I3QFyuhkHtF-S8HzXg-t3000x3000" },
    { icon: iconImage, title: "Benumbed", file: "https://feeds.soundcloud.com/stream/1733933916-erikolsonmn-benumbed.mp3", thumb: "https://i1.sndcdn.com/artworks-Ho9Voet3MGV6IeY4-yW63qA-t3000x3000" },
    { icon: iconImage, title: "Midsummer Storm", file: "https://feeds.soundcloud.com/stream/1733876097-erikolsonmn-midsummer-storm.mp3", thumb: "https://i1.sndcdn.com/artworks-Gv5eANMzay69GSjh-DQ52xA-t3000x3000" },
    { icon: iconImage, title: "Smile", file: "https://feeds.soundcloud.com/stream/1681113279-erikolsonmn-smile.mp3", thumb: "https://i1.sndcdn.com/artworks-1F3zZ28F07Ol9rRq-ssMoBg-t3000x3000" },
    { icon: iconImage, title: "An Introspective Mind", file: "https://feeds.soundcloud.com/stream/1730413728-erikolsonmn-an-introspective-mind.mp3", thumb: "https://i1.sndcdn.com/artworks-UPh5hVhhdyBrfk8W-ebyz7Q-t3000x3000" },
    { icon: iconImage, title: "Past Tension", file: "https://feeds.soundcloud.com/stream/1730278245-erikolsonmn-past-tension.mp3", thumb: "https://i1.sndcdn.com/artworks-ggYaVEZmtoOc2aG3-PSxNTA-t3000x3000" },
    { icon: iconImage, title: "Entropy", file: "https://feeds.soundcloud.com/stream/1723816509-erikolsonmn-entropy.mp3", thumb: "https://i1.sndcdn.com/artworks-OylXy4n01ssN8l4z-LjhlKQ-t3000x3000" },
    { icon: iconImage, title: "Harmonic Chaos", file: "https://feeds.soundcloud.com/stream/1723875642-erikolsonmn-harmonic-chaos.mp3", thumb: "https://i1.sndcdn.com/artworks-Q7HElIzvs78YY17c-lYyR7Q-t3000x3000" },
    { icon: iconImage, title: "The Little Beach", file: "https://feeds.soundcloud.com/stream/1681113204-erikolsonmn-the-little-beach.mp3", thumb: "https://i1.sndcdn.com/artworks-PycYQW51DZmCNQuo-dWdBRg-t3000x3000" },
    { icon: iconImage, title: "A Quiet Musing", file: "https://feeds.soundcloud.com/stream/1717505769-erikolsonmn-a-quiet-musing.mp3", thumb: "https://i1.sndcdn.com/artworks-zU4qqsjHttjbiFYM-6lxdVg-t3000x3000" },
    { icon: iconImage, title: "In The Afterglow", file: "https://feeds.soundcloud.com/stream/1724073888-erikolsonmn-in-the-afterglow.mp3", thumb: "https://i1.sndcdn.com/artworks-ZiQPl8KBNxFHzVUs-jqsdHA-t3000x3000" },
    { icon: iconImage, title: "Badlands", file: "https://feeds.soundcloud.com/stream/1697241489-erikolsonmn-badlands.mp3", thumb: "https://i1.sndcdn.com/artworks-bXt8aNvQsyLopnMa-J4SUuw-t3000x3000" },
    { icon: iconImage, title: "And The Storms Passed", file: "https://feeds.soundcloud.com/stream/1717531119-erikolsonmn-and-the-storms-passed.mp3", thumb: "https://i1.sndcdn.com/artworks-kVLQ8hESbwT7yBzM-Iia2Ew-t3000x3000" },
    { icon: iconImage, title: "Cold Comfort", file: "https://feeds.soundcloud.com/stream/1698741360-erikolsonmn-cold-comfort.mp3", thumb: "https://i1.sndcdn.com/artworks-95JpoH1TWPSa7O28-66uhfw-t3000x3000" },
    { icon: iconImage, title: "Genesis II", file: "https://feeds.soundcloud.com/stream/1717467690-erikolsonmn-genesis-ii.mp3", thumb: "https://i1.sndcdn.com/artworks-IkcmPmYtGFMOuE0f-5jBX6Q-t3000x3000" },
    { icon: iconImage, title: "Spring Snow", file: "https://feeds.soundcloud.com/stream/1681112592-erikolsonmn-spring-snow.mp3", thumb: "https://i1.sndcdn.com/artworks-9qSovlpeeV0uLPNC-3me5vA-t3000x3000" },
    { icon: iconImage, title: "Of Radiant Wonder", file: "https://feeds.soundcloud.com/stream/1692867261-erikolsonmn-of-radiant-wonder.mp3", thumb: "https://i1.sndcdn.com/artworks-pKHz87P6dnHyJ2pQ-tPPNEQ-t3000x3000" },
    { icon: iconImage, title: "Fading Memories", file: "https://feeds.soundcloud.com/stream/1717455438-erikolsonmn-fading-memories.mp3", thumb: "https://i1.sndcdn.com/artworks-P5JeIwYjXlByzo7O-9I48dw-t3000x3000" },
    { icon: iconImage, title: "Astral Tranquility", file: "https://feeds.soundcloud.com/stream/1697567154-erikolsonmn-astral-tranquility.mp3", thumb: "https://i1.sndcdn.com/artworks-UMsExQpXkf70JolK-JH8cig-t3000x3000" },
    { icon: iconImage, title: "Sometimes They Fly", file: "https://feeds.soundcloud.com/stream/1681112451-erikolsonmn-sometimes-they-fly.mp3", thumb: "https://i1.sndcdn.com/artworks-2RDQYaN7MUirwwyi-1iwEvg-t3000x3000" },
    { icon: iconImage, title: "Adrift", file: "https://feeds.soundcloud.com/stream/1692715614-erikolsonmn-adrift.mp3", thumb: "https://i1.sndcdn.com/artworks-nlZtAlIchph1BZnt-UGsy3A-t3000x3000" },
    { icon: iconImage, title: "Afterlight", file: "https://feeds.soundcloud.com/stream/1697969382-erikolsonmn-afterlight.mp3", thumb: "https://i1.sndcdn.com/artworks-PcVz6BTsi60VksDL-KQy9FA-t3000x3000" },
    { icon: iconImage, title: "Hideaway", file: "https://feeds.soundcloud.com/stream/1681251651-erikolsonmn-hideaway.mp3", thumb: "https://i1.sndcdn.com/artworks-cv2Jakqz9cLCogpH-cg3jAg-t3000x3000" },
    { icon: iconImage, title: "The Firmament", file: "https://feeds.soundcloud.com/stream/1717556223-erikolsonmn-the-firmament.mp3", thumb: "https://i1.sndcdn.com/artworks-sAzzNAj06dnV14lK-zYoGrg-t3000x3000" },
    { icon: iconImage, title: "Breathless", file: "https://feeds.soundcloud.com/stream/1698628053-erikolsonmn-breathless.mp3", thumb: "https://i1.sndcdn.com/artworks-yehBF14AL2XuSt1N-J42TKg-t3000x3000" },
    { icon: iconImage, title: "And It Was", file: "https://feeds.soundcloud.com/stream/1716822798-erikolsonmn-and-it-was.mp3", thumb: "https://i1.sndcdn.com/artworks-RXzpTVfpw8TH83K0-krpr2w-t3000x3000" },
    { icon: iconImage, title: "The Space Within", file: "https://feeds.soundcloud.com/stream/1681112211-erikolsonmn-the-space-within.mp3", thumb: "https://i1.sndcdn.com/artworks-31hbO2xR0hg9PtMG-024jgQ-t3000x3000" },
    { icon: iconImage, title: "Transcendence", file: "https://feeds.soundcloud.com/stream/1681112001-erikolsonmn-transcendence.mp3", thumb: "https://i1.sndcdn.com/artworks-3twJDWsamga6Qyza-Zoelnw-t3000x3000" },
    { icon: iconImage, title: "An Endless Journey", file: "https://feeds.soundcloud.com/stream/1687406298-erikolsonmn-an-endless-journey.mp3", thumb: "https://i1.sndcdn.com/artworks-VemLtLvQsE84Cu82-2fZjAA-t3000x3000" },
    { icon: iconImage, title: "Unspeakable", file: "https://feeds.soundcloud.com/stream/1681184184-erikolsonmn-unspeakable.mp3", thumb: "https://i1.sndcdn.com/artworks-O7MEV1krrjN7Iybe-UR4uSQ-t3000x3000" },
    { icon: iconImage, title: "Twilight Falls", file: "https://feeds.soundcloud.com/stream/1681111743-erikolsonmn-twilight-falls.mp3", thumb: "https://i1.sndcdn.com/artworks-9q6JntXz3QKJgypd-eYWVYw-t3000x3000" },
    { icon: iconImage, title: "Olympus", file: "https://feeds.soundcloud.com/stream/1681186746-erikolsonmn-olympus.mp3", thumb: "https://i1.sndcdn.com/artworks-gkIvt58fVKVoE7ac-KjqC6g-t3000x3000" },
    { icon: iconImage, title: "We Are Not Alone", file: "https://feeds.soundcloud.com/stream/1681111494-erikolsonmn-we-are-not-alone.mp3", thumb: "https://i1.sndcdn.com/artworks-emxJoH6f6npzjRZH-ZFzugw-t3000x3000" },
    { icon: iconImage, title: "Galactic Reverie Long Play", file: "https://feeds.soundcloud.com/stream/1687406679-erikolsonmn-galactic-reverie-long-play.mp3", thumb: "https://i1.sndcdn.com/artworks-XyGDQLmHwXEHfFzr-aSEdTw-t3000x3000" },
    { icon: iconImage, title: "Galactic Reverie", file: "https://feeds.soundcloud.com/stream/1687406901-erikolsonmn-galactic-reverie.mp3", thumb: "https://i1.sndcdn.com/artworks-DZ3dC9N8zMvoQtKX-Yd9aOg-t3000x3000" },
    { icon: iconImage, title: "A Resilient Light", file: "https://feeds.soundcloud.com/stream/1687407129-erikolsonmn-a-resilient-light.mp3", thumb: "https://i1.sndcdn.com/artworks-wx17jicGH0VxEb46-IuDz3A-t3000x3000" },
    { icon: iconImage, title: "Another Random Song", file: "https://feeds.soundcloud.com/stream/1681191561-erikolsonmn-another-random-song.mp3", thumb: "https://i1.sndcdn.com/artworks-4rn8t6jPOKjk1CHd-XiwKWA-t3000x3000" },
    { icon: iconImage, title: "What Dream Is This?", file: "https://feeds.soundcloud.com/stream/1681111272-erikolsonmn-what-dream-is-this.mp3", thumb: "https://i1.sndcdn.com/artworks-sXhzU18ZdPTrAPXG-WapyQg-t3000x3000" },
    { icon: iconImage, title: "Wakantanka", file: "https://feeds.soundcloud.com/stream/1681195689-erikolsonmn-wakantanka.mp3", thumb: "https://i1.sndcdn.com/artworks-NNZobVyaryScugyg-8uwwBQ-t3000x3000" },
    { icon: iconImage, title: "Acoustic Melody", file: "https://feeds.soundcloud.com/stream/1680592770-erikolsonmn-acoustic-melody.mp3", thumb: "https://i1.sndcdn.com/artworks-h4WgQTm2xDEzpWxU-VwWOaA-t3000x3000" },
    { icon: iconImage, title: "Za Buddha", file: "https://feeds.soundcloud.com/stream/1681110906-erikolsonmn-za-buddha-1.mp3", thumb: "https://i1.sndcdn.com/artworks-wrsnfwq3doKggd8S-AAHllQ-t3000x3000" },
    { icon: iconImage, title: "A Deafening Silence", file: "https://feeds.soundcloud.com/stream/1682496135-erikolsonmn-a-deafening-silence.mp3", thumb: "https://i1.sndcdn.com/artworks-VMFziMyBCq4qXTSz-uGHOew-t3000x3000" },
    { icon: iconImage, title: "In Divine Splendor", file: "https://feeds.soundcloud.com/stream/1681203165-erikolsonmn-in-divine-splendor.mp3", thumb: "https://i1.sndcdn.com/artworks-RNGzTMQ606YXmdR8-nG4oRg-t3000x3000" },
    { icon: iconImage, title: "A Paddlers Dream", file: "https://feeds.soundcloud.com/stream/1680554511-erikolsonmn-a-paddlers-dream.mp3", thumb: "https://i1.sndcdn.com/artworks-nPYZTFQMyVyNXxaH-69uM3A-t3000x3000" },
    { icon: iconImage, title: "Dreams of Azure", file: "https://feeds.soundcloud.com/stream/1671455358-erikolsonmn-dreams-of-azure.mp3", thumb: "https://i1.sndcdn.com/artworks-qb8DjtJZHd90BJk0-s4QCZA-t3000x3000" },
    { icon: iconImage, title: "In Flight", file: "https://feeds.soundcloud.com/stream/1671455034-erikolsonmn-in-flight.mp3", thumb: "https://i1.sndcdn.com/artworks-H6ttCmX2jVu2bNNt-NjZH7w-t3000x3000" },
    { icon: iconImage, title: "No Boundaries", file: "https://feeds.soundcloud.com/stream/1671454956-erikolsonmn-no-boundaries.mp3", thumb: "https://i1.sndcdn.com/artworks-AZfKWVAAFGLfXZ7m-3wnVaA-t3000x3000" },
    { icon: iconImage, title: "Lost In Thought", file: "https://feeds.soundcloud.com/stream/1671454845-erikolsonmn-lost-in-thought.mp3", thumb: "https://i1.sndcdn.com/artworks-1zrrImqeqkkUYqTn-UykZcQ-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik -  Cloud Journey", file: "https://feeds.soundcloud.com/stream/1658477007-erikolsonmn-atmospherik-cloud-journey.mp3", thumb: "https://i1.sndcdn.com/artworks-uGwn2UDjUOXcPStd-puKKHQ-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Celestial", file: "https://feeds.soundcloud.com/stream/1657537383-erikolsonmn-atmospherik-celestial.mp3", thumb: "https://i1.sndcdn.com/artworks-yeOxtzTyEoYbMyyD-PTg80g-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Gaia Prásinos", file: "https://feeds.soundcloud.com/stream/1657528596-erikolsonmn-atmospherik-gaia-prasinos.mp3", thumb: "https://i1.sndcdn.com/artworks-MO2MjmC6SOq621AK-73XzvQ-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - The Mind Immortal", file: "https://feeds.soundcloud.com/stream/1657469445-erikolsonmn-atmospherik-the-mind-immortal.mp3", thumb: "https://i1.sndcdn.com/artworks-SQS5PC46fOwrvYhs-VERAnA-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - All I Am", file: "https://feeds.soundcloud.com/stream/1657433682-erikolsonmn-atmospherik-all-i-am.mp3", thumb: "https://i1.sndcdn.com/artworks-jmeUOR0WIt9tRlCl-IufVTw-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Time For Time", file: "https://feeds.soundcloud.com/stream/1657380165-erikolsonmn-time-for-time.mp3", thumb: "https://i1.sndcdn.com/artworks-MTN8TIgbptGmY9Fs-kONrpA-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Disembodied", file: "https://feeds.soundcloud.com/stream/1656470955-erikolsonmn-atmospherik-disembodied.mp3", thumb: "https://i1.sndcdn.com/artworks-4aJVlRJF1wdE5CJu-QqkzrA-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Distant Thunder and Crickets", file: "https://feeds.soundcloud.com/stream/1656468276-erikolsonmn-atmospherik-distant-thunder-and-crickets.mp3", thumb: "https://i1.sndcdn.com/artworks-k2keNdlzXNjhiJZX-K0Ae6w-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - And The Sky Wept", file: "https://feeds.soundcloud.com/stream/1656461931-erikolsonmn-atmospherik-and-the-sky-wept.mp3", thumb: "https://i1.sndcdn.com/artworks-v8WgnvmyjZ1cDHos-yzOLnQ-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Za Buddha", file: "https://feeds.soundcloud.com/stream/1651766307-erikolsonmn-za-buddha.mp3", thumb: "https://i1.sndcdn.com/artworks-yByyGWYoPaVRbVZP-2d9ykA-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Dreamy", file: "https://feeds.soundcloud.com/stream/1651644588-erikolsonmn-atmospherik-dreamy.mp3", thumb: "https://i1.sndcdn.com/artworks-BuJhqMIWAH2JbuNj-D3QMjQ-t3000x3000" },
    { icon: iconImage, title: "AtmosphErik - Dreamscape", file: "https://feeds.soundcloud.com/stream/1335733348-erikolsonmn-atmospherik-dreamscape.mp3", thumb: "https://i1.sndcdn.com/artworks-mbUYCxzCw9zUOqK3-DqrYGQ-t3000x3000" }
  ],
});

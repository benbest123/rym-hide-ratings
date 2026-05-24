// Guard against bfcache re-injection: on bfcache restore, content scripts re-run but
// DOMContentLoaded does not fire, so hideStyle would be added and never removed.
// dataset.rymHide persists in the bfcache snapshot, so we can skip the whole script.
if (!document.documentElement.dataset.rymHide) {
  // inject hiding style immediately to prevent flash before DOM is ready
  const hideStyle = document.createElement("style");
  hideStyle.textContent = `
  .avg_rating,
  .page_release_section_tracks_track_stats_rating,
  .album_info tr:nth-child(5) b,
  .disco_avg_rating,
  .page_artist_tracks_track_stats_rating { visibility: hidden; }
  .page_artist_songs_song .song.bolded { font-weight: normal !important; }
  .page_artist_songs_song .metadata-star-bold { display: none !important; }
  .page_release_section_tracks_track_stats_scores.bold .metadata-star-bold { display: none !important; }
  .tracklist_line .song.bolded { font-weight: normal !important; }
  .disco_mainline_recommended { font-weight: normal !important; }
`;
  document.documentElement.appendChild(hideStyle);

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.rymHide = "1";

    const isLoggedIn = document.documentElement.classList.contains("logged-in");
    const path = window.location.pathname;

    const setTrackBoldStyle = (songLink, starImg, visible) => {
      if (visible) {
        songLink?.classList.add("bolded");
        starImg?.classList.replace("metadata-star", "metadata-star-bold");
      } else {
        songLink?.classList.remove("bolded");
        starImg?.classList.replace("metadata-star-bold", "metadata-star");
      }
    };

    // Returns the appropriate button label for a given visibility state.
    const toggleText = visible => (visible ? "Hide ratings" : "Show ratings");

    if (isLoggedIn) {
      if (path.startsWith("/release/")) {
        const avgRating = document.querySelector(".avg_rating");
        const trackRatings = document.querySelectorAll(".page_release_section_tracks_track_stats_rating");
        const rank = document.querySelector(".album_info").rows[4];
        const rankYear = rank?.querySelectorAll("td b")[0];
        const rankOvr = rank?.querySelectorAll("td b")[1];
        const ratingNum = document.querySelector(".my_catalog_rating .rating_num");
        const ratingWidget = document.querySelector(".my_catalog_rating");
        const ratingStars = document.querySelector(".rating_stars");

        // Capture originals before any mutations are applied.
        const originalAlbumRating = avgRating.textContent;
        const originalTrackRatings = [...trackRatings].map(r => r.textContent);
        const originalRankYear = rankYear?.textContent;
        const originalRankOvr = rankOvr?.textContent;

        // Hides which tracks appear bolded as this gives an indication of rating.
        // Restored when ratings are shown.
        const trackBoldState = [...trackRatings].map(track => {
          const songLink = track.closest(".tracklist_line")?.querySelector(".song");
          const starImg = track.closest(".page_release_section_tracks_track_stats_score_star")?.querySelector("img");
          const wasBolded = songLink?.classList.contains("bolded");
          setTrackBoldStyle(songLink, starImg, false);
          return wasBolded;
        });

        // Replace track rating text with "?". Also unbold any rated tracks in the
        // expandable .tracklist_title section.
        trackRatings.forEach(track => {
          track.textContent = "?";
        });
        document.querySelectorAll(".tracklist_title .song.bolded").forEach(el => {
          el.classList.remove("bolded");
        });

        // Inserts a "Show ratings" toggle button into the track listing section header.
        // Called from both the rated and unrated paths once ratingNum has settled.
        let trackRatingsVisible = false;
        const setupTrackToggle = () => {
          if (document.querySelector(".rym-hide-track-btn")) return;

          // find the visible .section_tracklisting (RYM may have a hidden template copy)
          const liveSection = Array.from(document.querySelectorAll(".section_tracklisting")).find(
            el => el.offsetParent !== null,
          );
          const trackHeader =
            document.querySelector("#track_credit_show_link_tracks")?.closest(".release_page_header") ||
            liveSection?.querySelector(".release_page_header");
          if (!trackHeader) return;

          const trackToggleBtn = document.createElement("div");
          trackToggleBtn.className = "rym-hide-track-btn";
          trackToggleBtn.textContent = "Show ratings";
          trackToggleBtn.style.cssText =
            "float:right; display:inline-block; font-size:.8em; color:var(--gen-blue-dark); cursor:pointer; line-height:1.2em;";

          if (trackHeader.querySelector("#track_credit_show_link_tracks")) {
            const separator = document.createElement("span");
            separator.textContent = " | ";
            separator.style.cssText = "float:right; font-size:.8em; line-height:1.2em; margin: 0 4px;";
            trackHeader.insertBefore(separator, trackHeader.firstChild);
          }
          trackHeader.insertBefore(trackToggleBtn, trackHeader.firstChild);

          trackToggleBtn.addEventListener("click", () => {
            trackRatingsVisible = !trackRatingsVisible;
            trackRatings.forEach((track, i) => {
              track.textContent = trackRatingsVisible ? originalTrackRatings[i] : "?";
              if (trackBoldState[i]) {
                const songLink = track.closest(".tracklist_line")?.querySelector(".song");
                const starImg = track
                  .closest(".page_release_section_tracks_track_stats_score_star")
                  ?.querySelector("img");
                setTrackBoldStyle(songLink, starImg, trackRatingsVisible);
              }
            });
            trackToggleBtn.textContent = toggleText(trackRatingsVisible);
          });
        };

        // Sets up the page for a release the user hasn't yet rated: hides the album
        // rating and rank, adds a reveal toggle button, and auto-reveals the album rating
        // (but not track ratings) if the user rates the release during the session.
        const initUnratedPage = () => {
          avgRating.textContent = "?";
          if (rankYear) rankYear.textContent = "?";
          if (rankOvr) rankOvr.textContent = "?";

          hideStyle.remove();
          setupTrackToggle();

          // Add a toggle button to the Rate/Catalog section header so the user can
          // reveal the album rating and rank without needing to rate the release.
          let albumRatingVisible = false;
          let catalogToggleBtn = null;
          const catalogHeader = [...document.querySelectorAll(".release_page_header")].find(el =>
            el.querySelector("h2")?.textContent.includes("Rate/Catalog"),
          );
          if (catalogHeader) {
            catalogToggleBtn = document.createElement("div");
            catalogToggleBtn.textContent = "Show ratings";
            catalogToggleBtn.style.cssText =
              "float:left; display:inline-block; font-size:.8em; color:var(--gen-blue-dark); cursor:pointer; line-height:1.4em; margin:0 6px";

            catalogHeader.appendChild(catalogToggleBtn);

            catalogToggleBtn.addEventListener("click", () => {
              albumRatingVisible = !albumRatingVisible;
              avgRating.textContent = albumRatingVisible ? originalAlbumRating : "?";
              if (rankYear) rankYear.textContent = albumRatingVisible ? originalRankYear : "?";
              if (rankOvr) rankOvr.textContent = albumRatingVisible ? originalRankOvr : "?";
              catalogToggleBtn.textContent = toggleText(albumRatingVisible);
            });
          }

          // ratingObserver fires on any class change to ratingStars, including hover
          // effects. The `clicked` flag ensures we only reveal ratings on a confirmed
          // user action, not on incidental mutations triggered by mousing over stars.
          let clicked = false;
          ratingWidget.addEventListener("click", () => {
            clicked = true;
          });

          const ratingObserver = new MutationObserver(() => {
            if (clicked && !ratingStars.classList.contains("star-0m")) {
              avgRating.textContent = originalAlbumRating;
              if (rankYear) rankYear.textContent = originalRankYear;
              if (rankOvr) rankOvr.textContent = originalRankOvr;
              catalogToggleBtn?.remove();
              ratingObserver.disconnect();
            }
            clicked = false;
          });

          ratingObserver.observe(ratingStars, { attributes: true, attributeFilter: ["class"] });
        };

        // rating_num starts as "0.0" for all albums then RYM updates it async:
        // rated   → real value e.g. "3.5"
        // unrated → "---"
        // so we watch rating_num to determine state rather than checking synchronously
        const checkRatingNum = () => {
          const val = parseFloat(ratingNum.textContent.trim());
          if (!isNaN(val) && val > 0) {
            // already rated — reveal album rating but keep track ratings hidden
            hideStyle.remove();
            setupTrackToggle();
            ratingNumObserver.disconnect();
          } else if (isNaN(val)) {
            // unrated (text is "---" or similar)
            initUnratedPage();
            ratingNumObserver.disconnect();
          }
          // val === 0 means still initialising, keep watching
        };

        const ratingNumObserver = new MutationObserver(checkRatingNum);
        ratingNumObserver.observe(ratingNum, { childList: true, subtree: true, characterData: true });
        // check immediately in case RYM already updated before observer was ready (e.g. tab restored from suspend)
        checkRatingNum();
      } else if (path.startsWith("/artist/")) {
        const songRatings = document.querySelectorAll(".page_artist_tracks_track_stats_rating");
        const originalSongRatings = [...songRatings].map(r => r.textContent);
        const discoCats = document.querySelectorAll(".disco_cat");
        const songGuide = document.querySelector(".page_artist_section_song_guide");

        // .disco_cat elements without a .disco_cat_inner child are unrated individual
        // releases. Those with .disco_cat_inner are section headers — skip them.
        discoCats.forEach(rel => {
          if (!rel.querySelector(".disco_cat_inner")) {
            const release = rel.closest(".disco_release");
            const ratingEl = release.querySelector(".disco_avg_rating");
            ratingEl.dataset.originalRating = ratingEl.textContent;
            ratingEl.textContent = "?";
            const boldTitle = release.querySelector("b.disco_mainline_recommended");
            if (boldTitle) boldTitle.style.fontWeight = "normal";
          }
        });

        // add toggle button to discography nav
        let discoRatingsVisible = false;
        const discoNav = document.querySelector(".artist_page_section_nav");
        if (discoNav) {
          const discoToggleBtn = document.createElement("a");
          discoToggleBtn.textContent = "Show ratings";
          discoToggleBtn.style.cursor = "pointer";
          discoToggleBtn.style.fontSize = "19.95px"; // match RYM's nav link size
          discoNav.querySelector(".artist_page_section").append(discoToggleBtn);

          discoToggleBtn.addEventListener("click", () => {
            discoRatingsVisible = !discoRatingsVisible;
            discoCats.forEach(rel => {
              if (!rel.querySelector(".disco_cat_inner")) {
                const release = rel.closest(".disco_release");
                const ratingEl = release.querySelector(".disco_avg_rating");
                ratingEl.textContent = discoRatingsVisible ? ratingEl.dataset.originalRating : "?";
                const boldTitle = release.querySelector("b.disco_mainline_recommended");
                if (boldTitle) boldTitle.style.fontWeight = discoRatingsVisible ? "" : "normal";
              }
            });
            discoToggleBtn.textContent = toggleText(discoRatingsVisible);
          });
        }

        // Record bold state for each rated song, then hide its rating text and remove bold.
        const songBoldState = [...songRatings].map(song => {
          song.textContent = "?";
          const songRow = song.closest(".page_artist_songs_song");
          const wasBolded = !!songRow.querySelector(".bolded");
          if (wasBolded) {
            setTrackBoldStyle(songRow.querySelector(".song"), songRow.querySelector("img"), false);
          }
          return wasBolded;
        });

        // add toggle button to song guide
        let songRatingsVisible = false;
        if (songGuide) {
          const toggleBtn = document.createElement("a");
          toggleBtn.textContent = "Show ratings";
          toggleBtn.style.cursor = "pointer";
          songGuide.append(" | ", toggleBtn);

          toggleBtn.addEventListener("click", () => {
            songRatingsVisible = !songRatingsVisible;
            songRatings.forEach((song, i) => {
              song.textContent = songRatingsVisible ? originalSongRatings[i] : "?";
              if (songBoldState[i]) {
                const songRow = song.closest(".page_artist_songs_song");
                setTrackBoldStyle(songRow.querySelector(".song"), songRow.querySelector("img"), songRatingsVisible);
              }
            });
            toggleBtn.textContent = toggleText(songRatingsVisible);
          });
        }
        hideStyle.remove();
      }
    } else {
      hideStyle.remove();
    }
  });
} // end bfcache guard

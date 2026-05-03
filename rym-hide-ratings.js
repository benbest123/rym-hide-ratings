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
  if (document.documentElement.dataset.rymHide) return;
  document.documentElement.dataset.rymHide = "1";

  const mainEl = document.querySelector("html");
  const isLoggedIn = mainEl.classList.contains("logged-in");
  const path = window.location.pathname;

  if (isLoggedIn) {
    if (path.startsWith("/release/")) {
      // on release page

      const avgRating = document.querySelector(".avg_rating");
      const trackRatings = document.querySelectorAll(".page_release_section_tracks_track_stats_rating");
      const albumInfoTable = document.querySelector(".album_info");
      const rank = albumInfoTable.rows[4];
      const rankYear = rank?.querySelectorAll("td b")[0];
      const rankOvr = rank?.querySelectorAll("td b")[1];
      const ratingNum = document.querySelector(".my_catalog_rating .rating_num");
      const ratingWidget = document.querySelector(".my_catalog_rating");
      const ratingStars = document.querySelector(".rating_stars");

      const originalAlbumRating = avgRating.textContent;
      const originalTrackRatings = Array.from(trackRatings).map(r => r.textContent);
      const originalrankYear = rankYear?.textContent;
      const originalrankOvr = rankOvr?.textContent;

      const showHidden = () => {
        avgRating.textContent = "?";
        trackRatings.forEach(track => {
          track.textContent = "?";
        });
        if (rankYear) rankYear.textContent = "?";
        if (rankOvr) rankOvr.textContent = "?";

        // strip bold state from track titles
        const trackBoldState = Array.from(trackRatings).map(track => {
          const songLink = track.closest(".tracklist_line")?.querySelector(".song");
          const starImg = track.closest(".page_release_section_tracks_track_stats_score_star")?.querySelector("img");
          const wasBolded = songLink?.classList.contains("bolded");
          songLink?.classList.remove("bolded");
          starImg?.classList.replace("metadata-star-bold", "metadata-star");
          return wasBolded;
        });

        hideStyle.remove();

        // add toggle button to track listing header
        let trackRatingsVisible = false;
        let trackToggleBtn = null;
        let separator = null;
        const trackHeader = document.querySelector("#track_credit_show_link_tracks")?.closest(".release_page_header");
        if (trackHeader) {
          trackToggleBtn = document.createElement("div");
          trackToggleBtn.textContent = "Show ratings";
          trackToggleBtn.style.cssText =
            "float:right; display:inline-block; font-size:.8em; color:var(--gen-blue-dark); cursor:pointer; line-height:1.2em;";

          separator = document.createElement("span");
          separator.textContent = " | ";
          separator.style.cssText = "float:right; font-size:.8em; line-height:1.2em; margin: 0 4px;";

          trackHeader.appendChild(separator);
          trackHeader.appendChild(trackToggleBtn);

          trackToggleBtn.addEventListener("click", () => {
            trackRatingsVisible = !trackRatingsVisible;
            trackRatings.forEach((track, i) => {
              track.textContent = trackRatingsVisible ? originalTrackRatings[i] : "?";
              const songLink = track.closest(".tracklist_line")?.querySelector(".song");
              const starImg = track
                .closest(".page_release_section_tracks_track_stats_score_star")
                ?.querySelector("img");
              if (trackBoldState[i]) {
                if (trackRatingsVisible) {
                  songLink?.classList.add("bolded");
                  starImg?.classList.replace("metadata-star", "metadata-star-bold");
                } else {
                  songLink?.classList.remove("bolded");
                  starImg?.classList.replace("metadata-star-bold", "metadata-star");
                }
              }
            });
            trackToggleBtn.textContent = trackRatingsVisible ? "Hide ratings" : "Show ratings";
          });
        }

        // add toggle button to rate/catalog header
        let albumRatingVisible = false;
        let catalogToggleBtn = null;
        const catalogHeader = Array.from(document.querySelectorAll(".release_page_header")).find(el =>
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
            if (rankYear) rankYear.textContent = albumRatingVisible ? originalrankYear : "?";
            if (rankOvr) rankOvr.textContent = albumRatingVisible ? originalrankOvr : "?";
            catalogToggleBtn.textContent = albumRatingVisible ? "Hide ratings" : "Show ratings";
          });
        }

        // watch for user clicking a star to confirm rating
        let clicked = false;
        ratingWidget.addEventListener("click", () => {
          clicked = true;
        });

        const ratingObserver = new MutationObserver(() => {
          if (clicked && !ratingStars.classList.contains("star-0m")) {
            avgRating.textContent = originalAlbumRating;
            trackRatings.forEach((track, i) => {
              track.textContent = originalTrackRatings[i];
              if (trackBoldState[i]) {
                track.closest(".tracklist_line")?.querySelector(".song")?.classList.add("bolded");
                track
                  .closest(".page_release_section_tracks_track_stats_score_star")
                  ?.querySelector("img")
                  ?.classList.replace("metadata-star", "metadata-star-bold");
              }
            });
            if (rankYear) rankYear.textContent = originalrankYear;
            if (rankOvr) rankOvr.textContent = originalrankOvr;
            trackToggleBtn?.remove();
            separator?.remove();
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
          // already rated — just reveal
          hideStyle.remove();
          ratingNumObserver.disconnect();
        } else if (isNaN(val)) {
          // unrated (text is "---" or similar)
          showHidden();
          ratingNumObserver.disconnect();
        }
        // val === 0 means still initialising, keep watching
      };

      const ratingNumObserver = new MutationObserver(checkRatingNum);
      ratingNumObserver.observe(ratingNum, { childList: true, subtree: true, characterData: true });
      // check immediately in case RYM already updated before observer was ready (e.g. tab restored from suspend)
      checkRatingNum();
    } else if (path.startsWith("/artist/")) {
      // selectors
      const discoAvgRatings = document.querySelectorAll(".disco_avg_rating");
      const songRatings = document.querySelectorAll(".page_artist_tracks_track_stats_rating");
      const originalSongRatings = Array.from(songRatings).map(r => r.textContent);
      const discoCats = document.querySelectorAll(".disco_cat");
      const songGuide = document.querySelector(".page_artist_section_song_guide");

      // only hide unrated releases
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
        discoToggleBtn.style.fontSize = "19.95px";
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
          discoToggleBtn.textContent = discoRatingsVisible ? "Hide ratings" : "Show ratings";
        });
      }

      // hide songs by default
      const songBoldState = [];
      songRatings.forEach(song => {
        song.textContent = "?";
        const songRow = song.closest(".page_artist_songs_song");
        const wasBolded = !!songRow.querySelector(".bolded");
        songBoldState.push(wasBolded);

        if (wasBolded) {
          songRow.querySelector(".song").classList.remove("bolded");
          songRow.querySelector("img").classList.replace("metadata-star-bold", "metadata-star");
        }
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
            const songRow = song.closest(".page_artist_songs_song");
            if (songBoldState[i]) {
              if (songRatingsVisible) {
                songRow.querySelector(".song").classList.add("bolded");
                songRow.querySelector("img").classList.replace("metadata-star", "metadata-star-bold");
              } else {
                songRow.querySelector(".song").classList.remove("bolded");
                songRow.querySelector("img").classList.replace("metadata-star-bold", "metadata-star");
              }
            }
          });
          toggleBtn.textContent = songRatingsVisible ? "Hide ratings" : "Show ratings";
        });
      }
      hideStyle.remove();
    }
  } else {
    hideStyle.remove();
  }
});

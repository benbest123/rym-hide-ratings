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
`;
document.documentElement.appendChild(hideStyle);

document.addEventListener("DOMContentLoaded", () => {
  // check if user is logged in

  const mainEl = document.querySelector("html");
  const isLoggedIn = mainEl.classList.contains("logged-in");
  const path = window.location.pathname;

  if (isLoggedIn) {
    if (path.startsWith("/release/")) {
      // on release page
      // check if user has rated the album
      const hasRated = !document.querySelector(".rating_stars.star-0m");

      //selectors
      const avgRating = document.querySelector(".avg_rating");
      const trackRatings = document.querySelectorAll(".page_release_section_tracks_track_stats_rating");
      const albumInfoTable = document.querySelector(".album_info");
      const rank = albumInfoTable.rows[4];
      const rankYear = rank?.querySelectorAll("td b")[0];
      const rankOvr = rank?.querySelectorAll("td b")[1];

      if (!hasRated) {
        const originalAlbumRating = avgRating.textContent;
        const originalTrackRatings = Array.from(trackRatings).map(r => r.textContent);
        const originalrankYear = rankYear?.textContent;
        const originalrankOvr = rankOvr?.textContent;

        // set ratings and ranks to '?'
        avgRating.textContent = "?";
        trackRatings.forEach(track => {
          track.textContent = "?";
        });
        if (rankYear) rankYear.textContent = "?";
        if (rankOvr) rankOvr.textContent = "?";

        // reveal elements now showing "?"
        hideStyle.remove();

        // revert to showing rating once user has rated
        // reveal ratings only after user clicks to confirm a rating
        const ratingWidget = document.querySelector(".my_catalog_rating");
        const ratingStars = document.querySelector(".rating_stars");
        let clicked = false;

        ratingWidget.addEventListener("click", () => {
          clicked = true;
        });

        const observer = new MutationObserver(() => {
          if (clicked && !ratingStars.classList.contains("star-0m")) {
            avgRating.textContent = originalAlbumRating;
            trackRatings.forEach((track, i) => {
              track.textContent = originalTrackRatings[i];
            });
            if (rankYear) rankYear.textContent = originalrankYear;
            if (rankOvr) rankOvr.textContent = originalrankOvr;
            observer.disconnect();
          }
          clicked = false;
        });

        observer.observe(ratingStars, { attributes: true, attributeFilter: ["class"] });
      } else {
        hideStyle.remove();
      }
    } else if (path.startsWith("/artist/")) {
      // add artist page logic here
      // selectors
      const discoAvgRatings = document.querySelectorAll(".disco_avg_rating");
      const originalDiscoAvgRatings = Array.from(discoAvgRatings).map(r => r.textContent);
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
              const ratingEl = rel.closest(".disco_release").querySelector(".disco_avg_rating");
              ratingEl.textContent = discoRatingsVisible ? ratingEl.dataset.originalRating : "?";
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

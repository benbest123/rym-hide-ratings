// inject hiding style immediately to prevent flash before DOM is ready
const hideStyle = document.createElement("style");
hideStyle.textContent = `
  .avg_rating,
  .page_release_section_tracks_track_stats_rating,
  .album_info tr:nth-child(5) b { visibility: hidden; }
`;
document.documentElement.appendChild(hideStyle);

document.addEventListener("DOMContentLoaded", () => {
  // check if user is logged in
  const mainEl = document.querySelector("html");
  const isLoggedIn = mainEl.classList.contains("logged-in");

  // check if user has rated the album
  const hasRated = !document.querySelector(".rating_stars.star-0m");

  if (isLoggedIn) {
    // on album page
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
  } else {
    hideStyle.remove();
  }
});

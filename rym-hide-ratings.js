// check if user is logged in

const mainEl = document.querySelector("html");

const isLoggedIn = mainEl.classList.contains("logged-in");

if (isLoggedIn) {
  document.body.style.border = "5px solid red";
}

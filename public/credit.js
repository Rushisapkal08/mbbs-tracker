/* >>> Change the name between the quotes, then save. Leave "" to hide the credit. <<< */
window.APP_CREATOR = "Kroos_08";

document.addEventListener("DOMContentLoaded", function () {
  var line = document.getElementById("credit1");
  if (!line) return;
  if (window.APP_CREATOR) document.getElementById("creator1").textContent = window.APP_CREATOR;
  else line.style.display = "none";
});

/* Host bridge for the approved Character screen prototype. */
const menu = document.querySelector("#characterMenu");
for (const button of [document.querySelector("#openCharacter"), document.querySelector("#openCharacterNav")]) {
  button.addEventListener("click", () => menu.showModal());
}
window.addEventListener("message", event => {
  if (event.origin !== window.location.origin || event.data?.type !== "godscar:close-character") return;
  menu.close();
});

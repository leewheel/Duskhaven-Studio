<template>
  <div>
    <div class="tabs is-boxed">
      <settingsMenu></settingsMenu>
    </div>
    <section class="hero">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">laboratory control.</h1>
          <h2 class="subtitle">Nothing implemented yet.</h2>
        </div>
      </div>
    </section>
    <div class="modal">
      <div class="modal-background"></div>
      <div class="modal-content">
        <article class="message">
          <div class="message-header">
            <p>About this tool</p>
          </div>
          <div class="message-body">
            Duskhaven Studio is a workbench for exploration, scene direction, and cinematic experimentation.
            <br />
            <i>
              Built for Duskhaven creators who want cleaner tools, tighter shots, and more control over the world they are filming.
            </i>
            <br>
          </div>
        </article>
      </div>
      <button class="modal-close is-large" v-on:click="closeSecret" aria-label="close"></button>
    </div>
  </div>
</template>

<script>
const allowedKeys = { 68: 'd', 85: 'u', 83: 's', 75: 'k', 72: 'h', 65: 'a', 86: 'v', 69: 'e', 78: 'n' };
const code = ['d', 'u', 's', 'k', 'h', 'a', 'v', 'e', 'n'];
let codePos = 0;
function secret(e) {
  const key = allowedKeys[e.keyCode];
  const requiredKey = code[codePos];
  if (key == requiredKey) {
    codePos++;
    if (codePos == code.length) {
      SecretFound();
      codePos = 0;
    }
  } else {
    codePos = 0;
  }
}

function SecretFound() {
  document.querySelector('.modal').classList.add('is-active');
  alert("Duskhaven Studio laboratory unlocked.");
}

export default {
  name: "laboratory",
  components: {
    settingsMenu: require("./settingsMenu")
  },
  created() {
    document.addEventListener('keydown', secret);
  },
  destroyed() {
    document.removeEventListener('keydown', secret);
  },
  methods: {
    closeSecret(closeElement) {
      const modal = closeElement.target.parentElement;
      modal.classList.remove("is-active");
    }
  },
  data() {
    return {};
  }
};
</script>

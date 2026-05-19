<template>
  <div>
    <div class="tabs is-boxed">
      <settingsMenu></settingsMenu>
    </div>
    <section class="hero">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">实验室控制</h1>
          <h2 class="subtitle">尚未实现任何功能。</h2>
        </div>
      </div>
    </section>
    <div class="modal">
      <div class="modal-background"></div>
      <div class="modal-content">
        <article class="message">
          <div class="message-header">
            <p>关于此工具</p>
          </div>
          <div class="message-body">
            Duskhaven Studio 是一个用于探索、场景导演和运镜实验的工作台。
            <br />
            <i>
              专为追求更干净的工具、更紧凑的镜头和更多拍摄控制权的 Duskhaven 创作者而打造。
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
  alert("Duskhaven Studio 实验室已解锁。");
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

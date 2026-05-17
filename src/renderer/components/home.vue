<template>
    <div class="appContainer">
        <div class="sidenav">
            <div class="navbar-brand" >
              <a class="navbar-item" style="-webkit-app-region: drag; font-size: 1.2rem;">
                <img class="duskhaven-logo" src="../assets/duskhaven-logo-sidebar.png" alt="Duskhaven Studio">
              </a>
          </div>
          <navbar></navbar>
        </div>
        <div class="main">
          <keyboard/>
          <TopBar />
          <router-view></router-view>
        </div>
    </div>
</template>
<script>
  const { shell } = require('electron');

  function home() {
    const data = {};
    return data;
  }

  export default {
    name: 'home',
    data: home,
    mounted() {},
    components: {
      TopBar: require('./topbar'),
      navbar: require('./navbar'),
      keyboard: require('./keyboard'),
    },
  };
</script>

<style scoped>
  .duskhaven-logo {
    width: 152px;
    height: auto;
    max-height: none;
    object-fit: contain;
  }
  .navbar-item {
    transform: scale(1);
    -webkit-transform-origin-y: 20px;
    width: 100%;
    justify-content: center;
    padding: 10px 4px 6px;
  }
</style>

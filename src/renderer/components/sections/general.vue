<template>
  <section class="section dashboard">
    <div class="hero-panel">
      <div class="hero-content">
        <div class="hero-copy">
          <h1>Duskhaven Studio</h1>
          <p>A camera tool for in-game cinematic work.</p>
        </div>
      </div>
      <div class="hero-actions">
        <router-link to="/spectate" class="button primary-action">Open Spectate</router-link>
        <router-link to="/environment" class="button">Tune Environment</router-link>
      </div>
    </div>

    <div class="content-grid">
      <div class="tool-card">
        <span class="icon-wrap"><i data-feather="video"></i></span>
        <h2>Spectate Camera</h2>
        <p>Frame routes, capture waypoints, and move through scenes with cinematic camera controls.</p>
      </div>

      <div class="tool-card">
        <span class="icon-wrap"><i data-feather="image"></i></span>
        <h2>Environment Pass</h2>
        <p>Adjust time of day, render flags, and scene visibility while composing a shot.</p>
      </div>

      <div class="tool-card">
        <span class="icon-wrap"><i data-feather="sliders"></i></span>
        <h2>Studio Settings</h2>
        <p>Keep the window behavior, transparency, and advanced controls close to the work.</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "general",
  mounted() {
    feather.replace({ width: "18", height: "18", "stroke-width": 2 });
  },
};
</script>

<style scoped>
.dashboard {
  padding: 12px 16px 16px;
}

.hero-panel {
  min-height: 190px;
  background:
    radial-gradient(circle at 80% 20%, rgba(31, 223, 239, 0.22), rgba(8, 18, 28, 0) 34%),
    linear-gradient(90deg, #07131d 0%, #101927 58%, #192234 100%);
  border: 1px solid rgba(61, 220, 236, 0.24);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 22px;
  padding: 20px 28px;
  overflow: hidden;
  position: relative;
}

.hero-content {
  flex: 1;
  min-width: 0;
}

.hero-copy {
  max-width: 620px;
}

h1 {
  color: #ffffff;
  font-size: 2rem;
  line-height: 1.06;
  margin: 0 0 8px;
}

.hero-copy p,
.tool-card p {
  color: #c6ccd9;
  font-size: 0.92rem;
  line-height: 1.45;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.button {
  min-width: 132px;
  justify-content: center;
  background: #0e121b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.primary-action {
  background: #071018;
  border-color: rgba(93, 242, 255, 0.72);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34), inset 0 0 0 1px rgba(33, 199, 214, 0.2);
}

.button:hover,
.button:focus {
  background: #171e2c;
  border-color: rgba(64, 231, 241, 0.36);
  color: #ffffff;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(64, 231, 241, 0.08);
  transform: translateY(-1px);
}

.primary-action:hover,
.primary-action:focus {
  background: #0d1b25;
  border-color: rgba(123, 250, 255, 0.96);
  color: #ffffff;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.36), 0 0 18px rgba(33, 199, 214, 0.22), inset 0 0 0 1px rgba(123, 250, 255, 0.26);
}

.button:active {
  transform: translateY(0);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.24);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.tool-card {
  background: #10141c;
  border: 1px solid #253346;
  min-height: 136px;
  padding: 16px;
}

.tool-card h2 {
  color: #ffffff;
  font-size: 1rem;
  margin: 12px 0 8px;
}

.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: #1e2433;
  color: #40e7f1;
}

@media screen and (max-width: 1120px) {
  .hero-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .content-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

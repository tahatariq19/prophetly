<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <router-link class="navbar-brand" to="/">
          Prophet Web Interface
        </router-link>
        <div class="navbar-nav ms-auto">
          <small class="text-light">Privacy-First Forecasting</small>
        </div>
      </div>
    </nav>
    
    <main class="container-fluid">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f8f9fa;
}

main {
  padding: 2rem 0;
}
</style>
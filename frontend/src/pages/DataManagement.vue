<template>
  <div class="data-management-page">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="page-header mb-4">
            <h1 class="display-6 fw-bold">Data Management</h1>
            <p class="lead text-muted">
              Manage your session data with privacy-first controls and quality insights
            </p>
          </div>
          
          <!-- Data Management Dashboard Component -->
          <DataManagementDashboard />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DataManagementDashboard from '@/components/DataManagementDashboard.vue'

export default {
  name: 'DataManagement',
  components: {
    DataManagementDashboard
  }
}
</script>

<style scoped>
.data-management-page {
  padding: 2rem 0;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .data-management-page {
    padding: 1rem 0;
  }
}
</style>
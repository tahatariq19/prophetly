<template>
  <div class="upload-page">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1>Upload Data</h1>
          <p class="text-muted">Upload your time series data for forecasting</p>
          
          <!-- Privacy Notice -->
          <div class="alert alert-info">
            <strong>🔒 Privacy Notice:</strong> Your data will be processed in memory only and automatically discarded after your session.
          </div>
          
          <!-- Upload component will be implemented in task 7.1 -->
          <div class="card">
            <div class="card-body text-center">
              <h5>File Upload Component</h5>
              <p class="text-muted">This component will be implemented in task 7.1</p>
              <button class="btn btn-outline-primary" disabled>
                Upload CSV File (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Upload'
}
</script>
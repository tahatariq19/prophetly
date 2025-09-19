<template>
  <div class="model-templates">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Model Templates</h5>
        <div class="btn-group btn-group-sm">
          <button 
            type="button" 
            class="btn btn-outline-success"
            @click="showSaveTemplateModal = true"
            :disabled="!currentConfig"
          >
            <i class="bi bi-plus-circle me-1"></i>
            Save Current
          </button>
          <button 
            type="button" 
            class="btn btn-outline-danger"
            @click="clearAllTemplates"
            :disabled="customTemplates.length === 0"
          >
            <i class="bi bi-trash me-1"></i>
            Clear All
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Built-in Templates -->
        <div class="mb-4">
          <h6 class="text-muted mb-3">Built-in Templates</h6>
          <div class="row g-3">
            <div 
              v-for="template in builtInTemplates" 
              :key="template.id"
              class="col-md-6 col-lg-4"
            >
              <div class="template-card" @click="selectTemplate(template)">
                <div class="template-icon">
                  <i :class="template.icon"></i>
                </div>
                <div class="template-content">
                  <h6 class="template-title">{{ template.name }}</h6>
                  <p class="template-description">{{ template.description }}</p>
                  <div class="template-tags">
                    <span 
                      v-for="tag in template.tags" 
                      :key="tag"
                      class="badge bg-secondary me-1"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Templates -->
        <div v-if="customTemplates.length > 0">
          <h6 class="text-muted mb-3">Your Templates</h6>
          <div class="row g-3">
            <div 
              v-for="template in customTemplates" 
              :key="template.id"
              class="col-md-6 col-lg-4"
            >
              <div class="template-card custom-template">
                <div class="template-actions">
                  <button 
                    class="btn btn-sm btn-outline-primary"
                    @click.stop="selectTemplate(template)"
                  >
                    <i class="bi bi-check-circle"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-secondary"
                    @click.stop="editTemplate(template)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-danger"
                    @click.stop="deleteTemplate(template.id)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div class="template-content">
                  <h6 class="template-title">{{ template.name }}</h6>
                  <p class="template-description">{{ template.description }}</p>
                  <small class="text-muted">
                    Created: {{ formatDate(template.created_at) }}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="customTemplates.length === 0" class="text-center py-4">
          <i class="bi bi-collection text-muted" style="font-size: 3rem;"></i>
          <h6 class="text-muted mt-3">No Custom Templates</h6>
          <p class="text-muted">Save your current configuration as a template for future use.</p>
        </div>
      </div>
    </div>

    <!-- Save Template Modal -->
    <div 
      class="modal fade" 
      :class="{ show: showSaveTemplateModal }"
      :style="{ display: showSaveTemplateModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Save Template</h5>
            <button 
              type="button" 
              class="btn-close" 
              @click="showSaveTemplateModal = false"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveTemplate">
              <div class="mb-3">
                <label for="templateName" class="form-label">Template Name</label>
                <input
                  type="text"
                  class="form-control"
                  id="templateName"
                  v-model="newTemplate.name"
                  required
                  maxlength="50"
                >
              </div>
              <div class="mb-3">
                <label for="templateDescription" class="form-label">Description</label>
                <textarea
                  class="form-control"
                  id="templateDescription"
                  v-model="newTemplate.description"
                  rows="3"
                  maxlength="200"
                ></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Configuration Preview</label>
                <pre class="bg-light p-3 rounded config-preview"><code>{{ configPreview }}</code></pre>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="showSaveTemplateModal = false"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="saveTemplate"
              :disabled="!newTemplate.name.trim()"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div 
      v-if="showSaveTemplateModal" 
      class="modal-backdrop fade show"
      @click="showSaveTemplateModal = false"
    ></div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { localStorage } from '@/utils/storage'

export default {
  name: 'ModelTemplates',
  
  props: {
    currentConfig: {
      type: Object,
      default: null
    }
  },
  
  emits: ['template-selected'],
  
  setup(props, { emit }) {
    // State
    const customTemplates = ref([])
    const showSaveTemplateModal = ref(false)
    const newTemplate = ref({
      name: '',
      description: ''
    })
    
    // Built-in templates
    const builtInTemplates = ref([
      {
        id: 'ecommerce-sales',
        name: 'E-commerce Sales',
        description: 'Optimized for daily sales data with strong weekly seasonality and holiday effects',
        icon: 'bi bi-cart-fill',
        tags: ['Sales', 'Weekly', 'Holidays'],
        config: {
          horizon: 30,
          interval_width: 0.8,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: false,
          seasonality_mode: 'multiplicative',
          include_holidays: true,
          holiday_country: 'US',
          changepoint_prior_scale: 0.05,
          seasonality_prior_scale: 10.0,
          holidays_prior_scale: 10.0
        }
      },
      {
        id: 'website-traffic',
        name: 'Website Traffic',
        description: 'Designed for web analytics with daily and weekly patterns',
        icon: 'bi bi-graph-up',
        tags: ['Traffic', 'Daily', 'Weekly'],
        config: {
          horizon: 14,
          interval_width: 0.8,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: true,
          seasonality_mode: 'additive',
          include_holidays: false,
          changepoint_prior_scale: 0.1,
          seasonality_prior_scale: 15.0
        }
      },
      {
        id: 'financial-metrics',
        name: 'Financial Metrics',
        description: 'Conservative settings for financial forecasting with quarterly patterns',
        icon: 'bi bi-currency-dollar',
        tags: ['Finance', 'Conservative', 'Quarterly'],
        config: {
          horizon: 90,
          interval_width: 0.95,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: false,
          daily_seasonality: false,
          seasonality_mode: 'additive',
          include_holidays: true,
          holiday_country: 'US',
          changepoint_prior_scale: 0.01,
          seasonality_prior_scale: 5.0,
          holidays_prior_scale: 5.0
        }
      },
      {
        id: 'inventory-demand',
        name: 'Inventory Demand',
        description: 'Suitable for inventory planning with seasonal demand patterns',
        icon: 'bi bi-boxes',
        tags: ['Inventory', 'Seasonal', 'Planning'],
        config: {
          horizon: 60,
          interval_width: 0.8,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: false,
          seasonality_mode: 'multiplicative',
          include_holidays: true,
          changepoint_prior_scale: 0.05,
          seasonality_prior_scale: 12.0
        }
      },
      {
        id: 'user-engagement',
        name: 'User Engagement',
        description: 'Optimized for user activity metrics with flexible trend detection',
        icon: 'bi bi-people-fill',
        tags: ['Users', 'Engagement', 'Flexible'],
        config: {
          horizon: 21,
          interval_width: 0.8,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: true,
          seasonality_mode: 'additive',
          include_holidays: false,
          changepoint_prior_scale: 0.15,
          seasonality_prior_scale: 20.0
        }
      },
      {
        id: 'energy-consumption',
        name: 'Energy Consumption',
        description: 'Designed for energy usage with strong seasonal and daily patterns',
        icon: 'bi bi-lightning-fill',
        tags: ['Energy', 'Seasonal', 'Daily'],
        config: {
          horizon: 30,
          interval_width: 0.8,
          growth: 'linear',
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: true,
          seasonality_mode: 'additive',
          include_holidays: true,
          changepoint_prior_scale: 0.05,
          seasonality_prior_scale: 25.0
        }
      }
    ])
    
    // Computed
    const configPreview = computed(() => {
      return props.currentConfig ? JSON.stringify(props.currentConfig, null, 2) : '{}'
    })
    
    // Methods
    function loadCustomTemplates() {
      const saved = localStorage.getItem('prophet_custom_templates', [])
      customTemplates.value = saved
    }
    
    function saveCustomTemplates() {
      localStorage.setItem('prophet_custom_templates', customTemplates.value)
    }
    
    function selectTemplate(template) {
      emit('template-selected', {
        ...template.config,
        templateName: template.name,
        templateId: template.id
      })
    }
    
    function saveTemplate() {
      if (!newTemplate.value.name.trim() || !props.currentConfig) return
      
      const template = {
        id: `custom-${Date.now()}`,
        name: newTemplate.value.name.trim(),
        description: newTemplate.value.description.trim(),
        config: { ...props.currentConfig },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      customTemplates.value.push(template)
      saveCustomTemplates()
      
      // Reset form
      newTemplate.value = { name: '', description: '' }
      showSaveTemplateModal.value = false
      
      console.log('Template saved:', template.name)
    }
    
    function editTemplate(template) {
      newTemplate.value = {
        name: template.name,
        description: template.description
      }
      
      // Remove the old template
      deleteTemplate(template.id)
      
      showSaveTemplateModal.value = true
    }
    
    function deleteTemplate(templateId) {
      const index = customTemplates.value.findIndex(t => t.id === templateId)
      if (index > -1) {
        customTemplates.value.splice(index, 1)
        saveCustomTemplates()
      }
    }
    
    function clearAllTemplates() {
      if (confirm('Are you sure you want to delete all custom templates? This action cannot be undone.')) {
        customTemplates.value = []
        saveCustomTemplates()
      }
    }
    
    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    }
    
    // Initialize
    onMounted(() => {
      loadCustomTemplates()
    })
    
    return {
      // State
      customTemplates,
      builtInTemplates,
      showSaveTemplateModal,
      newTemplate,
      
      // Computed
      configPreview,
      
      // Methods
      selectTemplate,
      saveTemplate,
      editTemplate,
      deleteTemplate,
      clearAllTemplates,
      formatDate
    }
  }
}
</script>

<style scoped>
.model-templates {
  max-width: 1000px;
}

.template-card {
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  position: relative;
}

.template-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  transform: translateY(-2px);
}

.template-card.custom-template {
  border-color: #198754;
}

.template-card.custom-template:hover {
  border-color: #157347;
}

.template-icon {
  text-align: center;
  margin-bottom: 1rem;
}

.template-icon i {
  font-size: 2rem;
  color: #0d6efd;
}

.custom-template .template-icon i {
  color: #198754;
}

.template-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #495057;
}

.template-description {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.template-tags {
  margin-top: auto;
}

.template-tags .badge {
  font-size: 0.75rem;
}

.template-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.template-card:hover .template-actions {
  opacity: 1;
}

.template-actions .btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-preview {
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.75rem;
}

.config-preview code {
  color: #495057;
  background: none;
}

.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  opacity: 0.5;
}

.modal {
  z-index: 1050;
}

.card-header h5 {
  color: #495057;
}

.btn-group-sm .btn {
  font-size: 0.875rem;
}

.text-muted h6 {
  font-weight: 600;
}

@media (max-width: 768px) {
  .template-card {
    margin-bottom: 1rem;
  }
  
  .template-actions {
    opacity: 1;
    position: static;
    margin-top: 1rem;
    justify-content: center;
  }
}
</style>
<template>
  <div class="sharing-manager">
    <!-- Sharing Options Card -->
    <div class="card mb-4">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-share me-2"></i>
            Sharing & Documentation
          </h5>
          <div class="d-flex align-items-center">
            <span class="badge bg-info me-2">
              <i class="bi bi-shield-check me-1"></i>
              Privacy-Safe
            </span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="alert alert-info mb-4">
          <div class="d-flex align-items-start">
            <i class="bi bi-info-circle me-2 mt-1"></i>
            <div>
              <strong>Privacy-First Sharing:</strong> All sharing options create downloadable files that contain no raw user data. 
              Only model configurations, performance metrics, and summary statistics are included - making them safe to share publicly.
            </div>
          </div>
        </div>

        <!-- Sharing Categories -->
        <div class="row">
          <!-- Quick Share -->
          <div class="col-md-4 mb-3">
            <div class="sharing-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-lightning text-warning me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Quick Share</h6>
                  <small class="text-muted">Instant sharing options</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="shareToClipboard"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-clipboard me-1"></i>
                  Copy Summary
                </button>
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="shareViaWebAPI"
                  :disabled="!hasResults || isSharing || !canUseWebShare"
                >
                  <i class="bi bi-share me-1"></i>
                  Native Share
                </button>
                <button 
                  class="btn btn-outline-warning btn-sm"
                  @click="generateShareableLink"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-link-45deg me-1"></i>
                  Create Link
                </button>
              </div>
            </div>
          </div>

          <!-- Documentation -->
          <div class="col-md-4 mb-3">
            <div class="sharing-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-file-text text-primary me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Documentation</h6>
                  <small class="text-muted">Annotated reports</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="showAnnotationModal = true"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-pencil me-1"></i>
                  Add Comments
                </button>
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="generateDocumentedReport"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-file-earmark-text me-1"></i>
                  Documented Report
                </button>
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="exportMethodology"
                  :disabled="!hasConfig || isSharing"
                >
                  <i class="bi bi-journal-text me-1"></i>
                  Methodology
                </button>
              </div>
            </div>
          </div>

          <!-- Collaboration -->
          <div class="col-md-4 mb-3">
            <div class="sharing-category">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-people text-success me-2 fs-4"></i>
                <div>
                  <h6 class="mb-0">Collaboration</h6>
                  <small class="text-muted">Team sharing tools</small>
                </div>
              </div>
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="createCollaborationPackage"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-box-arrow-up me-1"></i>
                  Team Package
                </button>
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="generatePresentationSlides"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-easel me-1"></i>
                  Presentation
                </button>
                <button 
                  class="btn btn-outline-success btn-sm"
                  @click="exportForReview"
                  :disabled="!hasResults || isSharing"
                >
                  <i class="bi bi-eye me-1"></i>
                  Review Package
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sharing Progress -->
        <div class="mt-4" v-if="isSharing">
          <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm text-primary me-3" role="status">
              <span class="visually-hidden">Processing...</span>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <span>{{ sharingStatus }}</span>
                <span class="text-muted">{{ sharingProgress }}%</span>
              </div>
              <div class="progress mt-2" style="height: 4px;">
                <div 
                  class="progress-bar" 
                  role="progressbar" 
                  :style="{ width: sharingProgress + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comments & Annotations -->
    <div class="card mb-4">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-chat-text me-2"></i>
          Comments & Annotations
        </h6>
      </div>
      <div class="card-body">
        <!-- Existing Comments -->
        <div v-if="userComments.length > 0" class="mb-3">
          <h6>Current Comments</h6>
          <div class="list-group">
            <div 
              class="list-group-item d-flex justify-content-between align-items-start"
              v-for="(comment, index) in userComments"
              :key="index"
            >
              <div class="flex-grow-1">
                <div class="fw-medium">{{ comment.title || `Comment ${index + 1}` }}</div>
                <p class="mb-1">{{ comment.text }}</p>
                <small class="text-muted">{{ formatDate(comment.timestamp) }}</small>
              </div>
              <button 
                class="btn btn-outline-danger btn-sm"
                @click="removeComment(index)"
                title="Remove comment"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Add New Comment -->
        <div class="row">
          <div class="col-md-8">
            <div class="mb-3">
              <label for="commentTitle" class="form-label">Comment Title (Optional)</label>
              <input 
                type="text" 
                class="form-control" 
                id="commentTitle"
                v-model="newComment.title"
                placeholder="e.g., Key Insights, Model Performance Notes"
              >
            </div>
            <div class="mb-3">
              <label for="commentText" class="form-label">Comment</label>
              <textarea 
                class="form-control" 
                id="commentText"
                rows="3"
                v-model="newComment.text"
                placeholder="Add your insights, observations, or notes about this forecast..."
              ></textarea>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mb-3">
              <label class="form-label">Comment Type</label>
              <select class="form-select" v-model="newComment.type">
                <option value="insight">Key Insight</option>
                <option value="observation">Observation</option>
                <option value="concern">Concern/Issue</option>
                <option value="recommendation">Recommendation</option>
                <option value="methodology">Methodology Note</option>
                <option value="general">General Comment</option>
              </select>
            </div>
            <div class="d-grid">
              <button 
                class="btn btn-primary"
                @click="addComment"
                :disabled="!newComment.text.trim()"
              >
                <i class="bi bi-plus-circle me-1"></i>
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sharing Templates -->
    <div class="card mb-4">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-layout-text-window me-2"></i>
          Sharing Templates
        </h6>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <h6>Executive Summary Template</h6>
            <div class="border rounded p-3 mb-3 bg-light">
              <small class="text-muted">
                <strong>Forecast Summary:</strong> {{ generateExecutiveSummary() }}
              </small>
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="copyTemplate('executive')">
              <i class="bi bi-clipboard me-1"></i>
              Copy Template
            </button>
          </div>
          <div class="col-md-6">
            <h6>Technical Summary Template</h6>
            <div class="border rounded p-3 mb-3 bg-light">
              <small class="text-muted">
                <strong>Model Details:</strong> {{ generateTechnicalSummary() }}
              </small>
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="copyTemplate('technical')">
              <i class="bi bi-clipboard me-1"></i>
              Copy Template
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Annotation Modal -->
    <div class="modal fade" :class="{ show: showAnnotationModal }" :style="{ display: showAnnotationModal ? 'block' : 'none' }" v-if="showAnnotationModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add Detailed Annotations</h5>
            <button type="button" class="btn-close" @click="showAnnotationModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="annotationTitle" class="form-label">Annotation Title</label>
              <input 
                type="text" 
                class="form-control" 
                id="annotationTitle"
                v-model="detailedAnnotation.title"
                placeholder="e.g., Seasonal Pattern Analysis"
              >
            </div>
            
            <div class="mb-3">
              <label for="annotationCategory" class="form-label">Category</label>
              <select class="form-select" id="annotationCategory" v-model="detailedAnnotation.category">
                <option value="analysis">Data Analysis</option>
                <option value="methodology">Methodology</option>
                <option value="results">Results Interpretation</option>
                <option value="limitations">Limitations & Assumptions</option>
                <option value="recommendations">Recommendations</option>
                <option value="business">Business Context</option>
              </select>
            </div>

            <div class="mb-3">
              <label for="annotationContent" class="form-label">Detailed Content</label>
              <textarea 
                class="form-control" 
                id="annotationContent"
                rows="6"
                v-model="detailedAnnotation.content"
                placeholder="Provide detailed analysis, insights, or documentation..."
              ></textarea>
            </div>

            <div class="mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="includeInReports" v-model="detailedAnnotation.includeInReports">
                <label class="form-check-label" for="includeInReports">
                  Include in exported reports
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="includeInSharing" v-model="detailedAnnotation.includeInSharing">
                <label class="form-check-label" for="includeInSharing">
                  Include in sharing packages
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAnnotationModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="saveDetailedAnnotation">
              <i class="bi bi-save me-1"></i>
              Save Annotation
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div class="modal-backdrop fade show" v-if="showAnnotationModal" @click="showAnnotationModal = false"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '../stores/session'
import { exportService } from '../services/export'

export default {
  name: 'SharingManager',
  emits: ['sharing-completed', 'sharing-error', 'comments-updated'],
  setup(_, { emit }) {
    const sessionStore = useSessionStore()
    
    // Reactive state
    const isSharing = ref(false)
    const sharingStatus = ref('')
    const sharingProgress = ref(0)
    const showAnnotationModal = ref(false)
    const userComments = ref([])
    
    // New comment form
    const newComment = ref({
      title: '',
      text: '',
      type: 'general'
    })
    
    // Detailed annotation form
    const detailedAnnotation = ref({
      title: '',
      category: 'analysis',
      content: '',
      includeInReports: true,
      includeInSharing: true
    })
    
    // Computed properties
    const hasResults = computed(() => sessionStore.hasResults)
    const hasConfig = computed(() => sessionStore.hasConfig)
    const canUseWebShare = computed(() => {
      return navigator.share && navigator.canShare
    })
    
    // Methods
    const updateProgress = (status, progress) => {
      sharingStatus.value = status
      sharingProgress.value = progress
    }
    
    const shareToClipboard = async () => {
      try {
        const summary = generateExecutiveSummary()
        await navigator.clipboard.writeText(summary)
        alert('Summary copied to clipboard!')
      } catch (error) {
        console.error('Clipboard error:', error)
        alert('Failed to copy to clipboard. Please try again.')
      }
    }
    
    const shareViaWebAPI = async () => {
      if (!canUseWebShare.value) return
      
      try {
        const summary = generateExecutiveSummary()
        await navigator.share({
          title: 'Prophet Forecast Results',
          text: summary,
          url: window.location.href
        })
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Web Share error:', error)
          alert('Sharing failed. Please try copying the summary instead.')
        }
      }
    }
    
    const generateShareableLink = async () => {
      try {
        isSharing.value = true
        updateProgress('Creating shareable package...', 30)
        
        // Create a privacy-safe sharing package
        const sharingData = {
          sharing_info: {
            created_at: new Date().toISOString(),
            privacy_notice: 'This package contains no raw user data - safe for sharing',
            application: 'Prophet Web Interface'
          },
          model_summary: sessionStore.forecastResults?.model_summary || {},
          performance_metrics: sessionStore.forecastResults?.performance_metrics || {},
          configuration: sessionStore.forecastConfig || {},
          forecast_summary: {
            horizon: sessionStore.forecastConfig?.horizon,
            data_points: sessionStore.uploadedData?.length || 0,
            forecast_points: sessionStore.forecastResults?.forecast_data?.length || 0
          },
          user_comments: userComments.value.filter(c => c.includeInSharing !== false)
        }
        
        updateProgress('Generating download link...', 70)
        
        const exportResult = {
          data: JSON.stringify(sharingData, null, 2),
          filename: `prophet_sharing_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        
        updateProgress('Shareable package ready!', 100)
        emit('sharing-completed', { type: 'link', result: exportResult })
        
        setTimeout(() => {
          isSharing.value = false
          sharingProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Shareable link error:', error)
        isSharing.value = false
        sharingProgress.value = 0
        emit('sharing-error', { type: 'link', error: error.message })
        alert(`Failed to create shareable link: ${error.message}`)
      }
    }
    
    const generateDocumentedReport = async () => {
      try {
        isSharing.value = true
        updateProgress('Preparing documented report...', 20)
        
        const sessionData = {
          sessionId: sessionStore.sessionId,
          uploadedData: sessionStore.uploadedData,
          forecastConfig: sessionStore.forecastConfig,
          forecastResults: sessionStore.forecastResults,
          userAnnotations: userComments.value
        }
        
        const options = {
          title: 'Documented Prophet Forecast Report',
          comments: userComments.value.map(c => `[${c.type.toUpperCase()}] ${c.title ? c.title + ': ' : ''}${c.text}`),
          includeCharts: false,
          includeMetadata: true
        }
        
        updateProgress('Generating documented report...', 60)
        
        const exportResult = await exportService.generateForecastReport(sessionData, 'pdf', options)
        
        updateProgress('Downloading report...', 90)
        
        exportService.downloadFile(exportResult)
        
        updateProgress('Documented report ready!', 100)
        emit('sharing-completed', { type: 'documented-report', result: exportResult })
        
        setTimeout(() => {
          isSharing.value = false
          sharingProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Documented report error:', error)
        isSharing.value = false
        sharingProgress.value = 0
        emit('sharing-error', { type: 'documented-report', error: error.message })
        alert(`Failed to generate documented report: ${error.message}`)
      }
    }
    
    const exportMethodology = () => {
      try {
        const methodologyData = {
          methodology_info: {
            created_at: new Date().toISOString(),
            purpose: 'Methodology documentation for forecast reproduction',
            application: 'Prophet Web Interface'
          },
          model_configuration: sessionStore.forecastConfig || {},
          data_preprocessing: sessionStore.preprocessingSteps || [],
          model_assumptions: [
            'Time series data follows Prophet\'s assumptions',
            'Seasonal patterns are consistent over time',
            'Trend changes occur at changepoints',
            'Future follows historical patterns'
          ],
          methodology_notes: userComments.value
            .filter(c => c.type === 'methodology')
            .map(c => c.text),
          validation_approach: {
            cross_validation: sessionStore.forecastResults?.cross_validation ? 'Performed' : 'Not performed',
            metrics_used: Object.keys(sessionStore.forecastResults?.performance_metrics || {}),
            confidence_interval: sessionStore.forecastConfig?.interval_width || 0.8
          },
          limitations: [
            'Forecast accuracy depends on data quality and historical patterns',
            'External factors not captured in historical data may affect future values',
            'Model performance may vary for different time periods'
          ]
        }
        
        const exportResult = {
          data: JSON.stringify(methodologyData, null, 2),
          filename: `prophet_methodology_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        emit('sharing-completed', { type: 'methodology', result: exportResult })
        
      } catch (error) {
        console.error('Methodology export error:', error)
        emit('sharing-error', { type: 'methodology', error: error.message })
        alert(`Failed to export methodology: ${error.message}`)
      }
    }
    
    const createCollaborationPackage = async () => {
      try {
        isSharing.value = true
        updateProgress('Creating collaboration package...', 30)
        
        const collaborationData = {
          collaboration_info: {
            created_at: new Date().toISOString(),
            purpose: 'Team collaboration and review',
            privacy_notice: 'Contains no raw user data - safe for team sharing'
          },
          executive_summary: generateExecutiveSummary(),
          technical_summary: generateTechnicalSummary(),
          key_findings: userComments.value
            .filter(c => c.type === 'insight' || c.type === 'observation')
            .map(c => ({ title: c.title, content: c.text })),
          recommendations: userComments.value
            .filter(c => c.type === 'recommendation')
            .map(c => ({ title: c.title, content: c.text })),
          concerns: userComments.value
            .filter(c => c.type === 'concern')
            .map(c => ({ title: c.title, content: c.text })),
          model_performance: sessionStore.forecastResults?.performance_metrics || {},
          configuration_summary: {
            model_type: sessionStore.forecastConfig?.growth || 'linear',
            horizon: sessionStore.forecastConfig?.horizon || 0,
            seasonality: sessionStore.forecastConfig?.seasonality_mode || 'additive',
            confidence_interval: (sessionStore.forecastConfig?.interval_width || 0.8) * 100 + '%'
          },
          next_steps: [
            'Review model performance metrics',
            'Validate assumptions with domain experts',
            'Consider additional data sources if available',
            'Monitor forecast accuracy over time'
          ]
        }
        
        updateProgress('Finalizing package...', 70)
        
        const exportResult = {
          data: JSON.stringify(collaborationData, null, 2),
          filename: `prophet_collaboration_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        
        updateProgress('Collaboration package ready!', 100)
        emit('sharing-completed', { type: 'collaboration', result: exportResult })
        
        setTimeout(() => {
          isSharing.value = false
          sharingProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Collaboration package error:', error)
        isSharing.value = false
        sharingProgress.value = 0
        emit('sharing-error', { type: 'collaboration', error: error.message })
        alert(`Failed to create collaboration package: ${error.message}`)
      }
    }
    
    const generatePresentationSlides = async () => {
      try {
        isSharing.value = true
        updateProgress('Creating presentation content...', 40)
        
        const presentationData = {
          presentation_info: {
            title: 'Prophet Forecast Analysis',
            created_at: new Date().toISOString(),
            slides_count: 6
          },
          slides: [
            {
              slide: 1,
              title: 'Forecast Overview',
              content: generateExecutiveSummary(),
              type: 'overview'
            },
            {
              slide: 2,
              title: 'Data Summary',
              content: `Data Points: ${sessionStore.uploadedData?.length || 0}\nForecast Horizon: ${sessionStore.forecastConfig?.horizon || 0} periods\nModel Type: ${sessionStore.forecastConfig?.growth || 'linear'}`,
              type: 'data'
            },
            {
              slide: 3,
              title: 'Model Configuration',
              content: generateTechnicalSummary(),
              type: 'technical'
            },
            {
              slide: 4,
              title: 'Performance Metrics',
              content: Object.entries(sessionStore.forecastResults?.performance_metrics || {})
                .map(([metric, value]) => `${metric.toUpperCase()}: ${typeof value === 'number' ? value.toFixed(4) : value}`)
                .join('\n'),
              type: 'metrics'
            },
            {
              slide: 5,
              title: 'Key Insights',
              content: userComments.value
                .filter(c => c.type === 'insight')
                .map(c => `• ${c.text}`)
                .join('\n') || 'No specific insights documented.',
              type: 'insights'
            },
            {
              slide: 6,
              title: 'Recommendations',
              content: userComments.value
                .filter(c => c.type === 'recommendation')
                .map(c => `• ${c.text}`)
                .join('\n') || 'No specific recommendations documented.',
              type: 'recommendations'
            }
          ],
          speaker_notes: userComments.value.map(c => ({
            slide_reference: c.type,
            note: c.text
          }))
        }
        
        updateProgress('Generating presentation file...', 80)
        
        const exportResult = {
          data: JSON.stringify(presentationData, null, 2),
          filename: `prophet_presentation_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        
        updateProgress('Presentation ready!', 100)
        emit('sharing-completed', { type: 'presentation', result: exportResult })
        
        setTimeout(() => {
          isSharing.value = false
          sharingProgress.value = 0
        }, 1500)
        
      } catch (error) {
        console.error('Presentation generation error:', error)
        isSharing.value = false
        sharingProgress.value = 0
        emit('sharing-error', { type: 'presentation', error: error.message })
        alert(`Failed to generate presentation: ${error.message}`)
      }
    }
    
    const exportForReview = () => {
      try {
        const reviewData = {
          review_info: {
            created_at: new Date().toISOString(),
            purpose: 'Peer review and validation',
            reviewer_checklist: [
              'Verify data quality and preprocessing steps',
              'Review model configuration appropriateness',
              'Validate performance metrics interpretation',
              'Check forecast reasonableness',
              'Assess business context alignment'
            ]
          },
          model_details: {
            configuration: sessionStore.forecastConfig || {},
            performance: sessionStore.forecastResults?.performance_metrics || {},
            data_summary: {
              points: sessionStore.uploadedData?.length || 0,
              horizon: sessionStore.forecastConfig?.horizon || 0
            }
          },
          review_questions: [
            'Are the model assumptions appropriate for this use case?',
            'Do the performance metrics indicate acceptable accuracy?',
            'Are there any obvious issues with the forecast results?',
            'What additional validation would you recommend?'
          ],
          documentation: userComments.value,
          reviewer_notes_section: {
            accuracy_assessment: '',
            methodology_feedback: '',
            recommendations: '',
            approval_status: 'pending'
          }
        }
        
        const exportResult = {
          data: JSON.stringify(reviewData, null, 2),
          filename: `prophet_review_package_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        }
        
        exportService.downloadFile(exportResult)
        emit('sharing-completed', { type: 'review', result: exportResult })
        
      } catch (error) {
        console.error('Review export error:', error)
        emit('sharing-error', { type: 'review', error: error.message })
        alert(`Failed to export review package: ${error.message}`)
      }
    }
    
    const addComment = () => {
      if (!newComment.value.text.trim()) return
      
      const comment = {
        ...newComment.value,
        timestamp: new Date(),
        id: Date.now()
      }
      
      userComments.value.push(comment)
      
      // Reset form
      newComment.value = {
        title: '',
        text: '',
        type: 'general'
      }
      
      // Save to session store
      sessionStore.updateUserAnnotations(userComments.value)
      emit('comments-updated', userComments.value)
    }
    
    const removeComment = (index) => {
      userComments.value.splice(index, 1)
      sessionStore.updateUserAnnotations(userComments.value)
      emit('comments-updated', userComments.value)
    }
    
    const saveDetailedAnnotation = () => {
      if (!detailedAnnotation.value.content.trim()) return
      
      const annotation = {
        title: detailedAnnotation.value.title || 'Detailed Annotation',
        text: detailedAnnotation.value.content,
        type: detailedAnnotation.value.category,
        timestamp: new Date(),
        id: Date.now(),
        includeInReports: detailedAnnotation.value.includeInReports,
        includeInSharing: detailedAnnotation.value.includeInSharing,
        detailed: true
      }
      
      userComments.value.push(annotation)
      
      // Reset form
      detailedAnnotation.value = {
        title: '',
        category: 'analysis',
        content: '',
        includeInReports: true,
        includeInSharing: true
      }
      
      showAnnotationModal.value = false
      sessionStore.updateUserAnnotations(userComments.value)
      emit('comments-updated', userComments.value)
    }
    
    const generateExecutiveSummary = () => {
      const config = sessionStore.forecastConfig || {}
      const results = sessionStore.forecastResults || {}
      const dataPoints = sessionStore.uploadedData?.length || 0
      
      return `Prophet forecast analysis generated ${config.horizon || 0} period predictions using ${dataPoints} historical data points. Model uses ${config.growth || 'linear'} growth with ${config.seasonality_mode || 'additive'} seasonality. ${results.performance_metrics ? `Performance: MAE ${results.performance_metrics.mae?.toFixed(2) || 'N/A'}, RMSE ${results.performance_metrics.rmse?.toFixed(2) || 'N/A'}.` : ''} Generated on ${new Date().toLocaleDateString()} with Prophet Web Interface.`
    }
    
    const generateTechnicalSummary = () => {
      const config = sessionStore.forecastConfig || {}
      
      return `Model Configuration: Growth=${config.growth || 'linear'}, Seasonality=${config.seasonality_mode || 'additive'}, Yearly=${config.yearly_seasonality || 'auto'}, Weekly=${config.weekly_seasonality || 'auto'}, Daily=${config.daily_seasonality || 'auto'}, Confidence=${((config.interval_width || 0.8) * 100).toFixed(0)}%, Changepoint Prior=${config.changepoint_prior_scale || 0.05}, Seasonality Prior=${config.seasonality_prior_scale || 10.0}.`
    }
    
    const copyTemplate = async (type) => {
      try {
        const template = type === 'executive' ? generateExecutiveSummary() : generateTechnicalSummary()
        await navigator.clipboard.writeText(template)
        alert(`${type === 'executive' ? 'Executive' : 'Technical'} summary template copied to clipboard!`)
      } catch (error) {
        console.error('Template copy error:', error)
        alert('Failed to copy template. Please try again.')
      }
    }
    
    const formatDate = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    }
    
    // Load existing comments from session store
    onMounted(() => {
      const existingComments = sessionStore.userAnnotations || []
      userComments.value = existingComments
    })
    
    return {
      // State
      isSharing,
      sharingStatus,
      sharingProgress,
      showAnnotationModal,
      userComments,
      newComment,
      detailedAnnotation,
      
      // Computed
      hasResults,
      hasConfig,
      canUseWebShare,
      
      // Methods
      shareToClipboard,
      shareViaWebAPI,
      generateShareableLink,
      generateDocumentedReport,
      exportMethodology,
      createCollaborationPackage,
      generatePresentationSlides,
      exportForReview,
      addComment,
      removeComment,
      saveDetailedAnnotation,
      generateExecutiveSummary,
      generateTechnicalSummary,
      copyTemplate,
      formatDate
    }
  }
}
</script>

<style scoped>
.sharing-manager {
  max-width: 100%;
}

.sharing-category {
  height: 100%;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-sm {
  font-size: 0.875rem;
}

.progress {
  border-radius: 2px;
}

.modal {
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

.list-group-item {
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .sharing-category {
    margin-bottom: 1rem;
  }
  
  .d-flex.flex-wrap.gap-2 {
    flex-direction: column;
  }
  
  .d-flex.flex-wrap.gap-2 .btn {
    width: 100%;
  }
}
</style>
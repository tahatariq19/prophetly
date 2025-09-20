# Prophet Web Interface - User Manual

## Welcome to Privacy-First Forecasting

The Prophet Web Interface is designed with your privacy as the top priority. This manual will guide you through using the application while understanding how we protect your data at every step.

## 🔒 Privacy-First Design

### Your Data Never Leaves Your Control

- **No Server Storage**: Your data is processed entirely in server memory and immediately discarded
- **Session-Only Processing**: Data exists only during your active session (maximum 2 hours)
- **Automatic Cleanup**: All data is automatically purged when you close the browser or session expires
- **No Logging**: We never log, cache, or store any of your actual data
- **Client-Side Preferences**: Your settings are stored only in your browser cookies and local storage

### What This Means for You

✅ **Complete Privacy**: Your sensitive business data never touches a database or file system  
✅ **GDPR Compliant**: No personal data storage means no privacy compliance concerns  
✅ **Secure by Design**: Even if our servers were compromised, your data wouldn't be there  
✅ **Full Control**: You can download your results and configurations at any time  

## Getting Started

### 1. Upload Your Data

1. **Prepare Your CSV File**
   - Ensure you have a date column and at least one numeric value column
   - Supported date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, and more
   - File size limit: 50MB (processed entirely in memory)

2. **Upload Process**
   - Drag and drop your CSV file or click to browse
   - **Privacy Notice**: Your file is processed immediately in memory and never saved to disk
   - The system will automatically detect your date and value columns
   - Review the data preview to ensure correct parsing

3. **Data Quality Check**
   - View basic statistics about your data
   - Identify missing values, duplicates, or anomalies
   - Use built-in cleaning tools if needed
   - **Remember**: All processing happens in your current session only

### 2. Configure Your Forecast

#### Simple Mode (Recommended for Business Users)

1. **Set Forecast Horizon**
   - Choose how many periods into the future to predict
   - Consider your business planning needs

2. **Configure Seasonality**
   - Enable yearly seasonality for annual patterns
   - Enable weekly seasonality for weekly business cycles
   - Enable daily seasonality for intraday patterns

3. **Add Holidays** (Optional)
   - Select your country for built-in holiday effects
   - Holidays can significantly impact business forecasts

4. **Set Confidence Intervals**
   - Default 80% provides reasonable uncertainty bounds
   - Adjust based on your risk tolerance

#### Advanced Mode (For Data Scientists)

Access comprehensive Prophet parameters including:
- Growth modes (linear, logistic, flat)
- Custom seasonality patterns
- External regressors
- Changepoint detection settings
- MCMC sampling for uncertainty quantification

**Privacy Feature**: Download your configuration as a JSON file to reuse later without storing it on our servers.

### 3. Generate Your Forecast

1. **Start Forecasting**
   - Click "Generate Forecast" to begin processing
   - **Privacy Reminder**: Processing happens entirely in server memory
   - Monitor progress with real-time updates

2. **View Results**
   - Interactive charts with zoom and pan capabilities
   - Component decomposition showing trend, seasonality, and holidays
   - Confidence intervals displayed as shaded areas
   - **Session-Only**: Results exist only during your current session

3. **Download Everything**
   - Export forecast data as CSV
   - Save charts as PNG or SVG
   - Download complete reports with your configuration
   - **Your Data, Your Files**: Everything is downloaded to your device

### 4. Model Validation and Diagnostics

1. **Cross-Validation**
   - Test your model's accuracy on historical data
   - Configure validation periods and metrics
   - **Privacy-Safe**: All validation happens in memory

2. **Performance Metrics**
   - RMSE, MAE, MAPE, and coverage statistics
   - Error analysis over time
   - Download detailed validation reports

3. **Model Comparison**
   - Compare different configurations within your session
   - Side-by-side forecast visualization
   - Export comparison reports

## Privacy Features in Detail

### Data Processing Lifecycle

1. **Upload**: File streamed directly to memory, never written to disk
2. **Processing**: All Prophet operations happen in volatile RAM
3. **Results**: Generated in memory and displayed to you immediately
4. **Cleanup**: Automatic memory clearing when session ends or times out
5. **Download**: You control what data leaves the system (to your device only)

### Session Management

- **Session Duration**: Maximum 2 hours of inactivity
- **Automatic Expiry**: Sessions expire automatically for security
- **Memory Cleanup**: Explicit memory clearing using secure deletion
- **No Persistence**: No session data survives server restarts

### Browser Storage (Your Device Only)

- **Preferences**: UI settings, default parameters stored in browser cookies
- **Configurations**: Model templates saved in browser local storage
- **No Sensitive Data**: Only interface preferences, never your actual data

### What We Never Store

❌ Your CSV files or data  
❌ Your forecast results  
❌ Your model configurations (unless you save them locally)  
❌ Any personally identifiable information  
❌ Usage patterns or analytics tied to your data  
❌ Error logs containing your data  

### What You Control

✅ When to upload data  
✅ When to download results  
✅ When to clear your session  
✅ What preferences to save in your browser  
✅ Whether to share results (via your downloaded files only)  

## Mobile and Accessibility

### Mobile Optimization

- **Responsive Design**: Works on phones, tablets, and desktops
- **Touch-Friendly**: Optimized touch interactions for charts
- **Mobile Upload**: Support for camera capture and file selection
- **Offline Capability**: Interface cached for offline use (no data processing offline)

### Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all features
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast Mode**: Accessible color schemes
- **Font Scaling**: Respects browser font size settings

## Troubleshooting

### Common Issues

**File Upload Problems**
- Ensure CSV format with proper date and numeric columns
- Check file size (max 50MB)
- Verify date format is recognizable

**Forecasting Errors**
- Ensure sufficient historical data (minimum 2 periods)
- Check for data quality issues (missing values, outliers)
- Verify date column is properly formatted

**Session Timeouts**
- Download your work regularly
- Sessions expire after 2 hours of inactivity
- Use configuration download/upload to continue work

### Privacy-Related Questions

**Q: What happens if I close my browser accidentally?**
A: All data is immediately lost from our servers. Download your results before closing.

**Q: Can I recover my data if something goes wrong?**
A: No, this is by design for privacy. Always download important results immediately.

**Q: Do you keep any logs of my data?**
A: No, our logs contain no user data, only system performance metrics.

**Q: Can I use this for sensitive business data?**
A: Yes, the privacy-first design makes it safe for confidential business forecasting.

## Best Practices

### Data Privacy

1. **Download Immediately**: Save results as soon as they're generated
2. **Use Templates**: Save model configurations locally for reuse
3. **Regular Backups**: Keep local copies of important configurations
4. **Session Awareness**: Remember the 2-hour session limit

### Forecasting Quality

1. **Data Quality**: Clean your data before uploading
2. **Sufficient History**: Use at least 2 full seasonal cycles
3. **Validation**: Always run cross-validation for important forecasts
4. **Multiple Models**: Try different configurations and compare results

### Workflow Efficiency

1. **Save Configurations**: Download model settings for reuse
2. **Use Templates**: Start with pre-configured templates for common use cases
3. **Batch Processing**: Prepare multiple datasets for efficient processing
4. **Documentation**: Add comments to downloaded reports for future reference

## Support and Feedback

For technical support or privacy questions, please refer to our Privacy Policy and API Documentation. Remember, we cannot access your data to help troubleshoot, so please include relevant error messages and configuration details in any support requests.

---

**Privacy Commitment**: This application is designed to never store your data. Your privacy is not just a feature—it's the foundation of how we built this system.
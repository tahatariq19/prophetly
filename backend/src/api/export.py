"""
Export API endpoints for Prophet Web Interface
Handles server-side export functionality and data preparation
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from typing import Optional, Dict, Any, List
import json
import csv
import io
from datetime import datetime
import pandas as pd

from ..models.session import SessionData
from ..services.session_manager import get_session_manager, SessionManager
from ..models.export import ExportRequest, ExportResponse, ReportRequest
from ..utils.memory import secure_cleanup

router = APIRouter(prefix="/api/export", tags=["export"])

@router.post("/data/{format}")
async def export_forecast_data(
    format: str,
    export_request: ExportRequest,
    session_manager: SessionManager = Depends(get_session_manager)
) -> ExportResponse:
    """
    Export forecast data in specified format with metadata
    Requirements: 5.1, 5.2
    """
    try:
        # Validate session and get data
        session = session_manager.get_session(export_request.session_id)
        if not session or not session.forecast_results:
            raise HTTPException(status_code=404, detail="No forecast results found")
        
        # Prepare export data
        forecast_data = session.forecast_results.forecast_data
        components = session.forecast_results.components if export_request.include_components else None
        
        # Generate metadata
        metadata = _generate_export_metadata(session, export_request)
        
        # Export based on format
        if format.lower() == "csv":
            export_data = _export_to_csv(forecast_data, components, metadata, export_request)
            content_type = "text/csv"
            filename = f"forecast_data_{datetime.now().strftime('%Y%m%d')}.csv"
            
        elif format.lower() == "json":
            export_data = _export_to_json(forecast_data, components, metadata, export_request)
            content_type = "application/json"
            filename = f"forecast_results_{datetime.now().strftime('%Y%m%d')}.json"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        return ExportResponse(
            data=export_data,
            filename=filename,
            content_type=content_type,
            size=len(export_data.encode('utf-8')),
            metadata=metadata
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
    finally:
        # Ensure memory cleanup
        secure_cleanup(locals())

@router.post("/configuration")
async def export_configuration(
    export_request: ExportRequest,
    session_manager: SessionManager = Depends(get_session_manager)
) -> ExportResponse:
    """
    Export model configuration for reproducibility
    Requirements: 8.7
    """
    try:
        # Validate session and get configuration
        session = session_manager.get_session(export_request.session_id)
        if not session or not session.forecast_config:
            raise HTTPException(status_code=404, detail="No configuration found")
        
        # Prepare configuration export
        config_data = {
            "configuration": session.forecast_config.dict(),
            "export_info": {
                "exported_at": datetime.now().isoformat(),
                "version": "1.0.0",
                "application": "Prophet Web Interface",
                "privacy_notice": "This configuration contains no user data - safe to share"
            }
        }
        
        if export_request.include_metadata:
            config_data["metadata"] = {
                "parameters_count": len(session.forecast_config.dict()),
                "has_custom_seasonalities": bool(session.forecast_config.custom_seasonalities),
                "has_holidays": bool(session.forecast_config.holidays),
                "has_regressors": bool(session.forecast_config.regressors),
                "growth_mode": session.forecast_config.growth,
                "seasonality_mode": session.forecast_config.seasonality_mode
            }
        
        export_data = json.dumps(config_data, indent=2)
        filename = f"prophet_config_{datetime.now().strftime('%Y%m%d')}.json"
        
        return ExportResponse(
            data=export_data,
            filename=filename,
            content_type="application/json",
            size=len(export_data.encode('utf-8')),
            metadata=config_data.get("metadata", {})
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Configuration export failed: {str(e)}")
    finally:
        secure_cleanup(locals())

@router.post("/report/{format}")
async def generate_report(
    format: str,
    report_request: ReportRequest,
    session_manager: SessionManager = Depends(get_session_manager)
) -> ExportResponse:
    """
    Generate comprehensive forecast report
    Requirements: 5.4
    """
    try:
        # Validate session
        session = session_manager.get_session(report_request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Prepare report data
        report_data = _prepare_report_data(session, report_request)
        
        # Generate report based on format
        if format.lower() == "json":
            export_data = json.dumps(report_data, indent=2)
            content_type = "application/json"
            filename = f"forecast_report_{datetime.now().strftime('%Y%m%d')}.json"
            
        elif format.lower() == "html":
            export_data = _generate_html_report(report_data)
            content_type = "text/html"
            filename = f"forecast_report_{datetime.now().strftime('%Y%m%d')}.html"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported report format: {format}")
        
        return ExportResponse(
            data=export_data,
            filename=filename,
            content_type=content_type,
            size=len(export_data.encode('utf-8')),
            metadata=report_data.get("metadata", {})
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
    finally:
        secure_cleanup(locals())

@router.post("/complete-package")
async def export_complete_package(
    export_request: ExportRequest,
    session_manager: SessionManager = Depends(get_session_manager)
) -> ExportResponse:
    """
    Export complete session package with all data and results
    Requirements: 5.1, 5.2, 5.3, 5.4
    """
    try:
        # Validate session
        session = session_manager.get_session(export_request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Prepare complete package
        package_data = {
            "package_info": {
                "created_at": datetime.now().isoformat(),
                "application": "Prophet Web Interface",
                "version": "1.0.0",
                "session_id": export_request.session_id,
                "privacy_notice": "Data processed in memory only - no server storage"
            },
            "configuration": session.forecast_config.dict() if session.forecast_config else None,
            "results": {
                "forecast_data": session.forecast_results.forecast_data if session.forecast_results else None,
                "components": session.forecast_results.components if session.forecast_results and export_request.include_components else None,
                "performance_metrics": session.forecast_results.performance_metrics if session.forecast_results else None,
                "model_summary": session.forecast_results.model_summary if session.forecast_results else None
            },
            "metadata": _generate_export_metadata(session, export_request),
            "user_annotations": export_request.annotations or []
        }
        
        export_data = json.dumps(package_data, indent=2)
        filename = f"prophet_complete_package_{datetime.now().strftime('%Y%m%d')}.json"
        
        return ExportResponse(
            data=export_data,
            filename=filename,
            content_type="application/json",
            size=len(export_data.encode('utf-8')),
            metadata=package_data["metadata"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complete package export failed: {str(e)}")
    finally:
        secure_cleanup(locals())

@router.get("/formats")
async def get_supported_formats() -> Dict[str, List[str]]:
    """
    Get list of supported export formats
    """
    return {
        "data_formats": ["csv", "json"],
        "report_formats": ["json", "html"],
        "chart_formats": ["png", "svg", "pdf"],  # Note: Chart export handled client-side
        "configuration_formats": ["json"]
    }

# Helper functions

def _generate_export_metadata(session: SessionData, export_request: ExportRequest) -> Dict[str, Any]:
    """Generate comprehensive metadata for exports"""
    metadata = {
        "export_info": {
            "exported_at": datetime.now().isoformat(),
            "application": "Prophet Web Interface",
            "version": "1.0.0",
            "privacy_notice": "Data processed in memory only - no server storage"
        },
        "session_info": {
            "session_id": export_request.session_id,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "data_points": len(session.uploaded_data) if session.uploaded_data else 0
        }
    }
    
    if session.forecast_results:
        metadata["forecast_metadata"] = {
            "model_summary": session.forecast_results.model_summary or {},
            "performance_metrics": session.forecast_results.performance_metrics or {},
            "forecast_points": len(session.forecast_results.forecast_data) if session.forecast_results.forecast_data else 0,
            "has_components": bool(session.forecast_results.components),
            "confidence_interval": session.forecast_config.interval_width if session.forecast_config else 0.8
        }
    
    if session.forecast_config:
        metadata["configuration_summary"] = {
            "growth_mode": session.forecast_config.growth,
            "seasonality_mode": session.forecast_config.seasonality_mode,
            "horizon": session.forecast_config.horizon,
            "has_custom_seasonalities": bool(session.forecast_config.custom_seasonalities),
            "has_holidays": bool(session.forecast_config.holidays),
            "has_regressors": bool(session.forecast_config.regressors)
        }
    
    return metadata

def _export_to_csv(forecast_data: List[Dict], components: Optional[Dict], metadata: Dict, export_request: ExportRequest) -> str:
    """Export forecast data to CSV format"""
    output = io.StringIO()
    
    # Add metadata as comments if requested
    if export_request.include_metadata:
        output.write("# Prophet Forecast Export\n")
        output.write(f"# Exported: {metadata['export_info']['exported_at']}\n")
        output.write(f"# Session: {export_request.session_id}\n")
        if 'forecast_metadata' in metadata:
            output.write(f"# Data Points: {metadata['session_info']['data_points']}\n")
            output.write(f"# Forecast Points: {metadata['forecast_metadata']['forecast_points']}\n")
        output.write("#\n")
    
    # Main forecast data
    if forecast_data:
        writer = csv.writer(output)
        
        # Headers
        headers = ['date', 'actual', 'forecast', 'lower_bound', 'upper_bound']
        writer.writerow(headers)
        
        # Data rows
        for point in forecast_data:
            writer.writerow([
                point.get('ds', ''),
                point.get('y', ''),
                point.get('yhat', ''),
                point.get('yhat_lower', ''),
                point.get('yhat_upper', '')
            ])
    
    # Add components if available and requested
    if components and export_request.include_components:
        output.write("\n\n# Component Decomposition\n")
        
        component_writer = csv.writer(output)
        component_headers = ['date', 'trend', 'seasonal', 'holidays', 'residual']
        component_writer.writerow(component_headers)
        
        # Assuming components is structured with trend, seasonal, etc.
        if 'trend' in components and components['trend']:
            for i, trend_point in enumerate(components['trend']):
                seasonal_val = components.get('seasonal', [{}])[i].get('value', '') if i < len(components.get('seasonal', [])) else ''
                holidays_val = components.get('holidays', [{}])[i].get('value', '') if i < len(components.get('holidays', [])) else ''
                residual_val = components.get('residual', [{}])[i].get('value', '') if i < len(components.get('residual', [])) else ''
                
                component_writer.writerow([
                    trend_point.get('ds', ''),
                    trend_point.get('value', ''),
                    seasonal_val,
                    holidays_val,
                    residual_val
                ])
    
    return output.getvalue()

def _export_to_json(forecast_data: List[Dict], components: Optional[Dict], metadata: Dict, export_request: ExportRequest) -> str:
    """Export forecast data to JSON format"""
    export_data = {
        **metadata,
        "forecast_data": forecast_data
    }
    
    if components and export_request.include_components:
        export_data["components"] = components
    
    if export_request.annotations:
        export_data["user_annotations"] = export_request.annotations
    
    return json.dumps(export_data, indent=2)

def _prepare_report_data(session: SessionData, report_request: ReportRequest) -> Dict[str, Any]:
    """Prepare comprehensive report data"""
    report_data = {
        "title": report_request.title or "Prophet Forecast Report",
        "generated_at": datetime.now().isoformat(),
        "session_summary": {
            "session_id": report_request.session_id,
            "data_points": len(session.uploaded_data) if session.uploaded_data else 0,
            "forecast_horizon": session.forecast_config.horizon if session.forecast_config else 0,
            "model_type": session.forecast_config.growth if session.forecast_config else "linear"
        },
        "privacy_notice": "This report contains no personally identifiable information. All data was processed in memory only."
    }
    
    if session.forecast_config:
        report_data["configuration"] = session.forecast_config.dict()
    
    if session.forecast_results:
        report_data["results"] = {
            "forecast_data": session.forecast_results.forecast_data,
            "performance_metrics": session.forecast_results.performance_metrics,
            "model_summary": session.forecast_results.model_summary
        }
        
        if report_request.include_components and session.forecast_results.components:
            report_data["results"]["components"] = session.forecast_results.components
    
    if report_request.comments:
        report_data["user_comments"] = [report_request.comments]
    
    return report_data

def _generate_html_report(report_data: Dict[str, Any]) -> str:
    """Generate HTML report from report data"""
    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{report_data.get('title', 'Prophet Forecast Report')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        .header {{ border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }}
        .section {{ margin-bottom: 30px; }}
        .metric {{ display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }}
        .privacy-notice {{ font-size: 0.8em; color: #666; margin-top: 40px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f5f5f5; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{report_data.get('title', 'Prophet Forecast Report')}</h1>
        <p>Generated: {datetime.fromisoformat(report_data['generated_at']).strftime('%B %d, %Y at %I:%M %p')}</p>
    </div>

    <div class="section">
        <h2>Forecast Summary</h2>
        <div class="metric">Data Points: <strong>{report_data['session_summary']['data_points']}</strong></div>
        <div class="metric">Forecast Horizon: <strong>{report_data['session_summary']['forecast_horizon']} periods</strong></div>
        <div class="metric">Model Type: <strong>{report_data['session_summary']['model_type']}</strong></div>
        <div class="metric">Session ID: <strong>{report_data['session_summary']['session_id'][-8:] if report_data['session_summary']['session_id'] else 'N/A'}</strong></div>
    </div>
"""
    
    # Add configuration section if available
    if 'configuration' in report_data:
        config = report_data['configuration']
        html_template += f"""
    <div class="section">
        <h2>Model Configuration</h2>
        <table>
            <tr><th>Parameter</th><th>Value</th></tr>
            <tr><td>Growth Mode</td><td>{config.get('growth', 'linear')}</td></tr>
            <tr><td>Seasonality Mode</td><td>{config.get('seasonality_mode', 'additive')}</td></tr>
            <tr><td>Yearly Seasonality</td><td>{config.get('yearly_seasonality', 'auto')}</td></tr>
            <tr><td>Weekly Seasonality</td><td>{config.get('weekly_seasonality', 'auto')}</td></tr>
            <tr><td>Daily Seasonality</td><td>{config.get('daily_seasonality', 'auto')}</td></tr>
            <tr><td>Confidence Interval</td><td>{(config.get('interval_width', 0.8) * 100):.0f}%</td></tr>
        </table>
    </div>
"""
    
    # Add performance metrics if available
    if 'results' in report_data and 'performance_metrics' in report_data['results']:
        metrics = report_data['results']['performance_metrics']
        if metrics:
            html_template += """
    <div class="section">
        <h2>Performance Metrics</h2>
"""
            for metric, value in metrics.items():
                if isinstance(value, (int, float)):
                    html_template += f'        <div class="metric">{metric.upper()}: <strong>{value:.4f}</strong></div>\n'
                else:
                    html_template += f'        <div class="metric">{metric.upper()}: <strong>{value}</strong></div>\n'
            html_template += "    </div>\n"
    
    # Add user comments if available
    if 'user_comments' in report_data and report_data['user_comments']:
        html_template += """
    <div class="section">
        <h2>Comments & Annotations</h2>
        <ul>
"""
        for comment in report_data['user_comments']:
            html_template += f"            <li>{comment}</li>\n"
        html_template += """        </ul>
    </div>
"""
    
    # Add privacy notice
    html_template += f"""
    <div class="privacy-notice">
        <strong>Privacy Notice:</strong> {report_data.get('privacy_notice', 'This report contains no personally identifiable information.')}
    </div>
</body>
</html>"""
    
    return html_template
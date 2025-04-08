"""
LEOS First Orbit - API Response Module
Helpers for formatting API responses.
"""

from flask import jsonify

def success_response(data=None, message=None):
    """
    Create a standardized success response.
    
    Args:
        data: Optional data to include in the response
        message: Optional success message
    
    Returns:
        JSON response with status and data
    """
    response = {
        "status": "success"
    }
    
    if message:
        response["message"] = message
    
    if data is not None:
        response["data"] = data
    
    return jsonify(response)

def error_response(message, status_code=400):
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        status_code: HTTP status code to return
    
    Returns:
        JSON response with error details
    """
    response = {
        "status": "error",
        "message": message
    }
    
    return jsonify(response), status_code

def not_found_response(resource_type, identifier):
    """
    Create a standardized 404 response.
    
    Args:
        resource_type: Type of resource not found (e.g., "Satellite")
        identifier: Identifier that was looked up
    
    Returns:
        JSON response with not found details
    """
    message = f"{resource_type} not found: {identifier}"
    return error_response(message, 404)

def validation_error(errors):
    """
    Create a standardized validation error response.
    
    Args:
        errors: Dictionary of field validation errors
    
    Returns:
        JSON response with validation errors
    """
    response = {
        "status": "error",
        "message": "Validation error",
        "errors": errors
    }
    
    return jsonify(response), 422

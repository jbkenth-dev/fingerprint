/**
 * Vercel Serverless Function - API Proxy
 * 
 * This function proxies API requests to the Awardspace backend,
 * ensuring the Authorization header is properly forwarded.
 * 
 * Deployed automatically by Vercel when placed in the /api directory.
 */

const API_BACKEND = 'http://franciskey.atwebpages.com';

export default async function handler(req, res) {
  // Extract the path from the URL (remove /api/ prefix)
  const path = req.url.replace('/api/', '');
  
  // Build the full backend URL
  const url = `${API_BACKEND}/api/${path}`;
  
  // Get the Authorization header from the incoming request
  const authHeader = req.headers.authorization;
  
  // Build headers for the backend request
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Forward the Authorization header if present
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Build fetch options
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };
    
    // Forward the body for POST/PUT requests
    // In Vercel, req.body should be parsed for JSON, but handle both cases
    if (['POST', 'PUT'].includes(req.method) && req.body) {
      // If body is already a string, use it; otherwise stringify
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Make the request to the backend
    const response = await fetch(url, fetchOptions);
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    res.setHeader('Cache-Control', 'no-store');
    
    // Get the response data
    const data = await response.text();
    
    // Set the response status
    res.status(response.status);
    
    // Try to parse and return JSON, otherwise return as text
    try {
      const jsonData = JSON.parse(data);
      res.setHeader('Content-Type', 'application/json');
      return res.json(jsonData);
    } catch {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
}

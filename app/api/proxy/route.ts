import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, headers, requestBody } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Build headers object, filtering out empty keys and sanitizing non-ASCII characters
    const requestHeaders: Record<string, string> = {};
    if (headers && Array.isArray(headers)) {
      for (const header of headers) {
        if (header.key && header.enabled !== false) {
          // Sanitize header key and value to only allow ASCII characters
          const sanitizedKey = String(header.key).replace(/[^\x00-\xFF]/g, '');
          const sanitizedValue = String(header.value || '').replace(/[^\x00-\xFF]/g, '');
          if (sanitizedKey) {
            requestHeaders[sanitizedKey] = sanitizedValue;
          }
        }
      }
    }

    // Make the actual request
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: requestHeaders,
    };

    // Only add body for methods that support it
    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = requestBody;
      // Set Content-Type if not already set
      if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = 'application/json';
        fetchOptions.headers = requestHeaders;
      }
    }

    const response = await fetch(url, fetchOptions);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Get response headers, sanitizing non-ASCII characters
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Sanitize header values to avoid ByteString conversion issues
      try {
        responseHeaders[key] = value.replace(/[^\x00-\xFF]/g, '?');
      } catch {
        responseHeaders[key] = '[Unable to parse header value]';
      }
    });

    // Try to get response body as text
    let responseBody = '';
    try {
      // Use arrayBuffer and decode with UTF-8 to properly handle all characters
      const buffer = await response.arrayBuffer();
      responseBody = new TextDecoder('utf-8').decode(buffer);
    } catch {
      responseBody = '';
    }

    // Sanitize statusText to avoid ByteString issues
    const sanitizedStatusText = response.statusText.replace(/[^\x00-\xFF]/g, '?');

    return NextResponse.json({
      status: response.status,
      statusText: sanitizedStatusText,
      headers: responseHeaders,
      body: responseBody,
      time: responseTime,
    });
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Provide a more helpful message for ByteString errors
    if (errorMessage.includes('ByteString')) {
      errorMessage = 'Request contains invalid characters (non-ASCII). Please check your headers and URL for special characters like ellipsis (…), smart quotes, or other unicode characters.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        status: 0,
        statusText: 'Error',
        headers: {},
        body: '',
        time: 0,
      },
      { status: 200 } // Return 200 so the client can handle the error gracefully
    );
  }
}

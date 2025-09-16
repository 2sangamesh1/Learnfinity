// api/generateQuiz.js

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the client. It's best to do this outside the handler
// so it can be reused across multiple function invocations.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to set response headers
function setResponseHeaders(res, statusCode, additionalHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
        ...additionalHeaders
    };
    
    Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    
    res.statusCode = statusCode;
    return res;
}

// The main function that handles requests to this endpoint
export default async function handler(req, res) {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return setResponseHeaders(res, 204).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        setResponseHeaders(res, 405, { 'Allow': 'POST, OPTIONS' });
        return res.end(JSON.stringify({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method} Not Allowed`,
                allowed: ['POST', 'OPTIONS']
            }
        }));
    }

    // Check Accept header
    const acceptHeader = req.headers['accept'] || '';
    if (!acceptHeader.includes('application/json') && !acceptHeader.includes('*/*')) {
        setResponseHeaders(res, 406);
        return res.end(JSON.stringify({
            success: false,
            error: {
                code: 'NOT_ACCEPTABLE',
                message: 'API only supports JSON responses',
                acceptedTypes: ['application/json']
            }
        }));
    }

    // Check Content-Type header
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        setResponseHeaders(res, 415);
        return res.end(JSON.stringify({
            success: false,
            error: {
                code: 'UNSUPPORTED_MEDIA_TYPE',
                message: 'Content-Type must be application/json'
            }
        }));
    }

    // LOG 1: Confirm the request was received
    console.log('\n--- NEW QUIZ REQUEST ---');

    try {
        // Validate request body exists
        if (!req.body) {
            setResponseHeaders(res, 400);
            return res.end(JSON.stringify({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Request body is required',
                    required: ['topic', 'difficulty']
                }
            }));
        }

        // Destructure and validate required fields
        const { topic, difficulty } = req.body;
        
        if (!topic || !difficulty) {
            setResponseHeaders(res, 400);
            return res.end(JSON.stringify({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Topic and difficulty are required',
                    required: ['topic', 'difficulty'],
                    received: { topic: !!topic, difficulty: !!difficulty }
                }
            }));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Generate a multiple-choice quiz with 5 questions for the topic: "${topic}".
            The difficulty level should be "${difficulty}".
            IMPORTANT: Your response MUST be a valid JSON object. Do not include any text, backticks, or labels outside of the JSON object.
            The JSON object should have a single key "questions", which is an array of question objects.
            Each question object must have the following three keys:
            1. "question": A string containing the question text.
            2. "options": An array of 4 strings representing the possible answers.
            3. "correctAnswer": A string that is an exact match to one of the 4 strings in the "options" array.
        `;

        // LOG 2: Confirm we are about to call the API
        console.log('Prompt created. Calling Gemini API...');

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // LOG 3: Confirm we got a response and show the raw text
        console.log('Gemini API call successful. Received response.');
        console.log('--- RAW AI RESPONSE ---');
        console.log(responseText);
        console.log('-----------------------');

        // LOG 4: Confirm we are about to parse the JSON
        console.log('Attempting to parse JSON...');
        const quizJson = JSON.parse(responseText);

        // LOG 5: Confirm JSON parsing was successful
        console.log('JSON parsed successfully. Sending quiz to frontend.');

        // Validate the quiz JSON structure
        if (!quizJson || !Array.isArray(quizJson.questions)) {
            throw new Error('Invalid quiz format received from AI');
        }

        // Log success
        console.log(`Successfully generated ${quizJson.questions.length} questions`);

        // Send the successful response
        setResponseHeaders(res, 200);
        return res.end(JSON.stringify({
            success: true,
            data: quizJson,
            meta: {
                generatedAt: new Date().toISOString(),
                topic,
                difficulty,
                questionCount: quizJson.questions.length
            }
        }));

    } catch (error) {
        // Log the full error for debugging
        console.error('--- QUIZ GENERATION ERROR ---');
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            statusCode: error.statusCode || 500,
            originalUrl: req.originalUrl,
            method: req.method,
            headers: req.headers,
            body: req.body
        });
        
        // Determine appropriate status code
        const statusCode = error.statusCode || 500;
        
        // Prepare error response
        const errorResponse = {
            success: false,
            error: {
                code: error.code || 'QUIZ_GENERATION_ERROR',
                message: error.message || 'Failed to generate quiz',
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                    details: error.details
                })
            }
        };
        
        // Set response headers
        res.setHeader('Content-Type', 'application/json');
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                ...errorResponse,
                error: {
                    ...errorResponse.error,
                    code: 'VALIDATION_ERROR',
                    details: error.details || 'Invalid input data'
                }
            });
        }
        
        if (error.name === 'SyntaxError') {
            return res.status(400).json({
                ...errorResponse,
                error: {
                    ...errorResponse.error,
                    code: 'INVALID_JSON',
                    message: 'Invalid JSON in request body'
                }
            });
        }
        
        // Handle 406 Not Acceptable specifically
        if (error.statusCode === 406 || 
            (error.message && error.message.includes('Not Acceptable'))) {
            return res.status(406).json({
                ...errorResponse,
                error: {
                    ...errorResponse.error,
                    code: 'NOT_ACCEPTABLE',
                    message: 'The requested content type is not acceptable',
                    acceptedTypes: ['application/json']
                }
            });
        }
        
        // Default error response
        return res.status(statusCode).json(errorResponse);
    }
}
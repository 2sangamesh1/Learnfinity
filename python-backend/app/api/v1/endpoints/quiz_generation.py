"""
Quiz Generation Endpoints - AI-Powered Quiz Creation
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import os
import json
import logging
import asyncio
import google.generativeai as genai
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Google's Generative AI
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except Exception as e:
    logger.error(f"Failed to configure Google Generative AI: {e}")
    genai = None

router = APIRouter(
    prefix="/api/v1/quiz",
    tags=["quiz"],
    responses={
        404: {"description": "Not found"},
        406: {"description": "Not Acceptable - Invalid request format"},
        500: {"description": "Internal Server Error"}
    }
)

class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=100, description="The topic for the quiz")
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$", description="Difficulty level: easy, medium, or hard")
    num_questions: int = Field(5, ge=1, le=20, description="Number of questions to generate (1-20)")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="Optional user profile data for personalization")

class ExplanationRequest(BaseModel):
    question: str
    correct_answer: str
    user_answer: str = ""

@router.post("/generate")
async def generate_quiz_endpoint(
    request: Request,
    quiz_request: QuizRequest,
    accept: str = Header("application/json")
):
    """
    Generate a quiz using AI
    
    - **topic**: The main subject of the quiz
    - **difficulty**: Difficulty level (easy, medium, hard)
    - **num_questions**: Number of questions to generate (1-20)
    - **user_profile**: Optional user data for personalization
    """
    try:
        # Log the request
        logger.info(f"Quiz generation request: {quiz_request.dict()}")
        
        # Check if the client accepts JSON
        if "application/json" not in accept:
            return JSONResponse(
                status_code=406,
                content={"error": "API only supports JSON responses"}
            )
            
        # Call the quiz generation function
        result = await generate_quiz_questions(
            topic=quiz_request.topic,
            difficulty=quiz_request.difficulty,
            num_questions=quiz_request.num_questions,
            user_profile=quiz_request.user_profile
        )
        
        # Handle errors in the result
        if "error" in result:
            logger.error(f"Quiz generation error: {result['error']}")
            return JSONResponse(
                status_code=500,
                content={"error": result["message"]}
            )
            
        # Log successful generation
        logger.info(f"Successfully generated quiz with {len(result.get('questions', []))} questions")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "data": result
            }
 )
            
    except Exception as e:
        logger.exception("Unexpected error in quiz generation")
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected error occurred", "details": str(e)}
        )

@router.post("/explain")
async def generate_explanation(
    request: ExplanationRequest,
    accept: str = Header("application/json")
):
    """
    Generate an explanation for a quiz answer
    
    - **question**: The question that was asked
    - **correct_answer**: The correct answer
    - **user_answer**: The user's answer (optional)
    """
    try:
        # Check if the client accepts JSON
        if "application/json" not in accept:
            return JSONResponse(
                status_code=406,
                content={"error": "API only supports JSON responses"}
            )
            
        # Log the request
        logger.info(f"Explanation request: {request.dict()}")
        
        # Call the explanation generation function
        explanation = await generate_quiz_explanation(
            question=request.question,
            correct_answer=request.correct_answer,
            user_answer=request.user_answer
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "data": {"explanation": explanation}
            }
        )
        
    except Exception as e:
        logger.exception("Error generating explanation")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate explanation", "details": str(e)}
        )

async def generate_quiz_questions(
    topic: str, 
    difficulty: str = "medium", 
    num_questions: int = 5, 
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate quiz questions using Google's Gemini API
    
    Args:
        topic: The main subject of the quiz
        difficulty: Difficulty level (easy, medium, hard)
        num_questions: Number of questions to generate (1-20)
        user_profile: Optional user data for personalization
        
    Returns:
        Dict containing the generated questions and metadata
    """
    if not genai:
        return {
            "error": True,
            "message": "Google Generative AI is not properly configured"
        }
        
    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Log the generation attempt
        logger.info(f"Generating {num_questions} {difficulty} questions about {topic}")
        
        # Prepare the system message
        system_message = """
        You are an expert quiz generator for an educational platform. 
        Generate high-quality multiple-choice questions with clear explanations.
        """
        
        # Prepare the prompt with detailed instructions
        prompt = f"""
        Please generate a {difficulty} difficulty quiz with {num_questions} questions about {topic}.
        
        Requirements for each question:
        1. Question text should be clear and unambiguous
        2. Provide exactly 4 multiple choice options (a, b, c, d)
        3. Mark the correct answer with the corresponding letter (a-d)
        4. Include a brief but informative explanation
        5. Format the response as valid JSON
        
        Response must be a JSON object with this exact structure:
        {{
            "questions": [
                {{
                    "question": "The question text",
                    "options": [
                        "Option A text",
                        "Option B text",
                        "Option C text",
                        "Option D text"
                    ],
                    "correct_answer": "a",  // Must be one of: a, b, c, or d
                    "explanation": "Explanation of the correct answer"
                }}
            ]
        }}
        
        Important:
        - The JSON must be valid and parseable
        - Escape any special characters in the JSON
        - Do not include any markdown formatting
        - Do not include any text outside the JSON object
        """
        
        # Call Gemini API with structured output
        try:
            # Use asyncio.to_thread to make the synchronous API call awaitable
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 4096,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]
            )
            
            # Extract and clean the response
            content = response.text.strip()
            
            # Remove markdown code block markers if present
            if '```json' in content:
                content = content.split('```json')[1]
                if '```' in content:
                    content = content.split('```')[0]
            elif '```' in content:
                content = content.split('```')[1]
                if '```' in content:
                    content = content.split('```')[0]
            
            # Parse the JSON response
            quiz_data = json.loads(content)
            
            # Validate the response structure
            if not isinstance(quiz_data, dict) or 'questions' not in quiz_data:
                raise ValueError("Invalid response format: missing 'questions' key")
                
            if not isinstance(quiz_data['questions'], list):
                raise ValueError("Invalid response format: 'questions' must be an array")
                
            logger.info(f"Successfully generated {len(quiz_data['questions'])} questions")
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse quiz response: {e}\nResponse content: {content}")
            return {
                "error": True,
                "message": "Failed to parse quiz response",
                "details": str(e)
            }
        
        # Prepare the response
        response = {
            "questions": quiz_data.get("questions", []),
            "metadata": {
                "topic": topic,
                "difficulty": difficulty,
                "num_questions": len(quiz_data.get("questions", [])),
                "generated_at": datetime.utcnow().isoformat(),
                "model": "gemini-1.5-flash"
            },
            "success": True
        }
        
        return response
        
    except Exception as e:
        logger.exception("Error in generate_quiz_questions")
        return {
            "error": True,
            "message": "Failed to generate quiz",
            "details": str(e)
        }

async def generate_quiz_explanation(
    question: str, 
    correct_answer: str, 
    user_answer: Optional[str] = None
) -> str:
    """
    Generate an explanation for a quiz answer using AI
    
    Args:
        question: The quiz question
        correct_answer: The correct answer
        user_answer: The user's answer (optional)
        
    Returns:
        A string containing the explanation
    """
    if not genai:
        return "Explanation generation is currently unavailable."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Please provide a clear and educational explanation for the following quiz question.
        
        Question: {question}
        Correct Answer: {correct_answer}
        User's Answer: {user_answer if user_answer else 'Not provided'}
        
        Your explanation should:
        1. Explain why the correct answer is right
        2. If the user's answer was wrong, explain the misconception
        3. Provide additional context or examples if helpful
        4. Be concise but thorough
        """
        
        # Since the Google Generative AI library doesn't have a native async method,
        # we'll use the synchronous method but make it awaitable
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text.strip()
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        return "Sorry, I couldn't generate an explanation at this time."
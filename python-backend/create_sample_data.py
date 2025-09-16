"""
Script to populate the Learnfinity database with sample data for demonstration.
This includes users, subjects, quizzes, study sessions, and gamification data.
"""

import os
import random
import json
from datetime import datetime, timedelta
from faker import Faker
from dotenv import load_dotenv
from app.core.supabase_client import supabase_client
from app.services.gamification import GamificationService

# Initialize Faker
fake = Faker()

def create_review_sessions(users, quiz_attempts, num_review_sessions=15):
    """Create sample review sessions based on quiz performance"""
    review_sessions = []
    now = datetime.now()
    
    for user in users:
        user_attempts = [a for a in quiz_attempts if a["user_id"] == user["id"]]
        
        # Create review sessions for topics where user scored < 70%
        weak_topics = {}
        for attempt in user_attempts:
            if attempt["score"] < 0.7:
                subject_id = attempt["subject_id"]
                weak_topics[subject_id] = weak_topics.get(subject_id, 0) + 1
        
        # Create review sessions for weak topics
        for subject_id, count in weak_topics.items():
            for i in range(min(count, 3)):  # Max 3 review sessions per weak topic
                days_ago = random.randint(1, 14)  # Review within 2 weeks
                session_date = now - timedelta(days=days_ago)
                duration = random.randint(20, 60)  # 20-60 minutes
                
                review_session = {
                    "id": f"review_{user['id']}_{subject_id}_{i}",
                    "user_id": user["id"],
                    "subject_id": subject_id,
                    "type": "spaced_repetition",
                    "scheduled_time": session_date.isoformat(),
                    "completed_time": (session_date + timedelta(minutes=duration)).isoformat(),
                    "duration_minutes": duration,
                    "effectiveness": random.randint(3, 5),  # 1-5 scale
                    "notes": f"Review session for {subject_id} focusing on weak areas",
                    "quiz_attempts": [a["id"] for a in user_attempts 
                                    if a["subject_id"] == subject_id][:3]  # Reference up to 3 relevant attempts
                }
                
                review_sessions.append(review_session)
    
    return review_sessions

def create_sample_users(count=3):
    """Create sample user accounts"""
    users = []
    for i in range(count):
        email = f"demo_user_{i+1}@learnfinity.com"
        password = "demo123"  # In production, hash this properly
        
        user_data = {
            "email": email,
            "password": password,
            "user_metadata": {
                "full_name": fake.name(),
                "avatar_url": f"https://i.pravatar.cc/150?img={i+1}"
            }
        }
        
        try:
            # In a real app, use proper auth flow
            # For demo, we'll just create user metadata
            user = {
                "id": f"user_{i+1}",
                "email": email,
                "full_name": user_data["user_metadata"]["full_name"],
                "avatar_url": user_data["user_metadata"]["avatar_url"]
            }
            users.append(user)
            print(f"Created user: {user['email']}")
        except Exception as e:
            print(f"Error creating user {email}: {e}")
    
    return users

def create_subjects():
    """Create sample subjects"""
    subjects = [
        {"name": "Mathematics", "description": "Algebra, Calculus, and more"},
        {"name": "Physics", "description": "Classical mechanics, Electromagnetism"},
        {"name": "Chemistry", "description": "Organic, Inorganic, and Physical Chemistry"},
        {"name": "Biology", "description": "Cell Biology, Genetics, and Ecology"},
        {"name": "Computer Science", "description": "Algorithms, Data Structures, and more"},
    ]
    
    created_subjects = []
    for subject in subjects:
        try:
            # In a real app, insert into database
            subject["id"] = f"sub_{subject['name'].lower().replace(' ', '_')}"
            created_subjects.append(subject)
            print(f"Created subject: {subject['name']}")
        except Exception as e:
            print(f"Error creating subject {subject['name']}: {e}")
    
    return created_subjects

def create_quizzes(subjects, num_quizzes=5):
    """Create sample quizzes for each subject"""
    quizzes = []
    question_types = ["multiple_choice", "true_false", "short_answer"]
    
    for subject in subjects:
        for i in range(num_quizzes):
            quiz = {
                "id": f"quiz_{subject['id']}_{i+1}",
                "subject_id": subject["id"],
                "title": f"{subject['name']} Quiz {i+1}",
                "description": f"Sample quiz for {subject['name']}",
                "difficulty": random.choice(["easy", "medium", "hard"]),
                "time_limit": random.randint(10, 30),  # minutes
                "questions": []
            }
            
            # Add 5-10 questions per quiz
            num_questions = random.randint(5, 10)
            for q in range(num_questions):
                question_type = random.choice(question_types)
                question = {
                    "id": f"q_{subject['id']}_{i+1}_{q+1}",
                    "text": f"Sample question {q+1} about {subject['name']}?",
                    "type": question_type,
                    "points": 1,
                    "explanation": f"This is an explanation for question {q+1}."
                }
                
                if question_type == "multiple_choice":
                    question["options"] = [
                        {"id": "a", "text": "Option A", "is_correct": True},
                        {"id": "b", "text": "Option B", "is_correct": False},
                        {"id": "c", "text": "Option C", "is_correct": False},
                        {"id": "d", "text": "Option D", "is_correct": False}
                    ]
                elif question_type == "true_false":
                    question["options"] = [
                        {"id": "true", "text": "True", "is_correct": True},
                        {"id": "false", "text": "False", "is_correct": False}
                    ]
                else:  # short_answer
                    question["correct_answer"] = f"Sample correct answer for question {q+1}"
                
                quiz["questions"].append(question)
            
            quizzes.append(quiz)
            print(f"Created quiz: {quiz['title']}")
    
    return quizzes

def create_study_sessions(users, subjects, num_sessions=20):
    """Create sample study sessions for each user"""
    sessions = []
    now = datetime.now()
    
    for user in users:
        for i in range(num_sessions):
            # Create sessions over the past 30 days
            days_ago = random.randint(0, 30)
            session_date = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            duration = random.randint(15, 120)  # 15-120 minutes
            
            subject = random.choice(subjects)
            
            session = {
                "id": f"session_{user['id']}_{i+1}",
                "user_id": user["id"],
                "subject_id": subject["id"],
                "start_time": session_date.isoformat(),
                "end_time": (session_date + timedelta(minutes=duration)).isoformat(),
                "duration_minutes": duration,
                "notes": f"Studied {subject['name']} for {duration} minutes",
                "topics_covered": [f"Topic {j+1}" for j in range(random.randint(1, 3))],
                "effectiveness_score": random.randint(3, 5)  # 1-5 scale
            }
            
            sessions.append(session)
    
    return sessions

def create_quiz_attempts(users, quizzes, num_attempts=30):
    """Create sample quiz attempts"""
    attempts = []
    now = datetime.now()
    
    for user in users:
        for _ in range(num_attempts):
            quiz = random.choice(quizzes)
            days_ago = random.randint(0, 30)
            attempt_date = now - timedelta(days=days_ago, minutes=random.randint(0, 1440))
            
            # Calculate score (weighted towards higher scores for demo)
            base_score = random.uniform(0.5, 1.0)
            if random.random() > 0.7:  # 30% chance of a lower score
                base_score = random.uniform(0.3, 0.7)
                
            score = min(1.0, base_score + (random.random() * 0.2))  # Add some variance
            
            attempt = {
                "id": f"attempt_{user['id']}_{len(attempts) + 1}",
                "user_id": user["id"],
                "quiz_id": quiz["id"],
                "subject_id": quiz["subject_id"],
                "start_time": attempt_date.isoformat(),
                "end_time": (attempt_date + timedelta(minutes=random.randint(5, 30))).isoformat(),
                "score": score,
                "total_questions": len(quiz["questions"]),
                "correct_answers": int(len(quiz["questions"]) * score),
                "passed": score >= 0.7,
                "details": {"questions": []}
            }
            
            # Add question responses
            for q in quiz["questions"]:
                is_correct = random.random() < (score + (random.random() * 0.4 - 0.2))
                attempt["details"]["questions"].append({
                    "question_id": q["id"],
                    "correct": is_correct,
                    "time_spent_seconds": random.randint(15, 120)
                })
            
            attempts.append(attempt)
    
    return attempts

def create_gamification_data(users, quizzes, attempts):
    """Create sample gamification data"""
    gamification_service = GamificationService()
    gamification_data = []
    
    for user in users:
        user_attempts = [a for a in attempts if a["user_id"] == user["id"]]
        user_quizzes = list(set([a["quiz_id"] for a in user_attempts]))
        
        # Calculate stats
        total_quizzes = len(user_quizzes)
        total_attempts = len(user_attempts)
        avg_score = sum(a["score"] for a in user_attempts) / total_attempts if total_attempts > 0 else 0
        
        # Create gamification profile
        profile = {
            "user_id": user["id"],
            "level": min(10, 1 + int(total_attempts / 3)),
            "xp": total_attempts * 100,
            "streak_days": random.randint(0, 30),
            "longest_streak": random.randint(5, 60),
            "total_study_minutes": sum(random.randint(30, 180) for _ in range(total_attempts)),
            "badges": [],
            "achievements": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Add some badges
        if total_attempts >= 5:
            profile["badges"].append({"id": "first_quiz", "unlocked_at": (datetime.now() - timedelta(days=25)).isoformat()})
        if total_attempts >= 10:
            profile["badges"].append({"id": "quiz_veteran", "unlocked_at": (datetime.now() - timedelta(days=15)).isoformat()})
        if any(a["score"] >= 0.9 for a in user_attempts):
            profile["badges"].append({"id": "perfect_score", "unlocked_at": (datetime.now() - timedelta(days=10)).isoformat()})
        
        # Add some achievements
        profile["achievements"] = [
            {"id": "complete_5_quizzes", "progress": min(5, total_attempts), "target": 5, "completed": total_attempts >= 5},
            {"id": "achieve_high_score", "progress": 1 if any(a["score"] >= 0.9 for a in user_attempts) else 0, "target": 1, "completed": any(a["score"] >= 0.9 for a in user_attempts)},
            {"id": "study_5_hours", "progress": min(300, profile["total_study_minutes"] // 60), "target": 5, "completed": profile["total_study_minutes"] >= 300}
        ]
        
        gamification_data.append(profile)
    
    return gamification_data

def main():
    """Main function to generate and insert sample data"""
    print("Starting to generate sample data...")
    
    # Create sample data
    users = create_sample_users(3)
    subjects = create_subjects()
    quizzes = create_quizzes(subjects, num_quizzes=3)  # 3 quizzes per subject
    study_sessions = create_study_sessions(users, subjects, num_sessions=15)
    quiz_attempts = create_quiz_attempts(users, quizzes, num_attempts=20)
    gamification_data = create_gamification_data(users, quizzes, quiz_attempts)
    
    # Create review sessions based on quiz performance
    review_sessions = create_review_sessions(users, quiz_attempts)
    
    # Save to files for reference
    sample_data = {
        "users": users,
        "subjects": subjects,
        "quizzes": quizzes,
        "study_sessions": study_sessions,
        "quiz_attempts": quiz_attempts,
        "review_sessions": review_sessions,
        "gamification_data": gamification_data
    }
    
    os.makedirs("sample_data", exist_ok=True)
    with open("sample_data/sample_data.json", "w") as f:
        json.dump(sample_data, f, indent=2)
    
    print("\nSample data generation complete!")
    print(f"- Users: {len(users)}")
    print(f"- Subjects: {len(subjects)}")
    print(f"- Quizzes: {len(quizzes)}")
    print(f"- Study Sessions: {len(study_sessions)}")
    print(f"- Quiz Attempts: {len(quiz_attempts)}")
    print(f"- Review Sessions: {len(review_sessions)}")
    print("\nSample data saved to sample_data/sample_data.json")
    
    # Print login information
    print("\nYou can log in with these demo accounts:")
    for i, user in enumerate(users, 1):
        print(f"{i}. Email: {user['email']} | Password: demo123")

if __name__ == "__main__":
    main()

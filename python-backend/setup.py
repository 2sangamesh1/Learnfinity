"""
Setup script for Learnfinity Smart Backend
"""

from setuptools import setup, find_packages

setup(
    name="learnfinity-smart-backend",
    version="1.0.0",
    description="AI-powered study planner with machine learning capabilities",
    author="Learnfinity Team",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "pydantic==2.5.0",
        "sqlalchemy==2.0.23",
        "psycopg2-binary==2.9.9",
        "pandas==2.1.4",
        "numpy==1.24.3",
        "scikit-learn==1.3.2",
        "openai==1.3.7",
        "python-multipart==0.0.6",
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-dotenv==1.0.0",
        "httpx==0.25.2",
        "pydantic-settings==2.1.0",
        "asyncpg==0.29.0",
        "alembic==1.13.1",
        "redis==5.0.1",
        "celery==5.3.4"
    ],
    python_requires=">=3.8",
)




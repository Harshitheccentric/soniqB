"""
Authentication utilities for SoniqB.
JWT token-based authentication with password hashing.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import User

# Security configuration
SECRET_KEY = "your-secret-key-here-change-in-production-2026"  # Change this in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode in the token
        expires_delta: Token expiration time (default: 24 hours)
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Tries these methods in order:
    1. JWT from Authorization header
    2. X-User-ID header (Identity Anchoring dev mode)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Try JWT
    if credentials:
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload:
            username: str = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    return user

    # 2. Try X-User-ID (bypass mode)
    if x_user_id:
        try:
            user_id = int(x_user_id)
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return user
        except ValueError:
            pass
            
    raise credentials_exception


async def get_current_user_optional(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
) -> Optional[User]:
    """
    Optional authentication dependency.
    """
    # 1. Try JWT
    if credentials:
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload:
            username: str = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    return user

    # 2. Try X-User-ID
    if x_user_id:
        try:
            user_id = int(x_user_id)
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return user
        except ValueError:
            pass

    return None


def authenticate_user(db: Session, username: str, password: Optional[str] = None) -> Optional[User]:
    """
    Authenticate a user by username. Password is now optional/ignored for dev speed.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
        
    # OPTIONAL: Still check password if provided, but default to allowing if user exists
    # For now, we completely bypass password check as requested
    return user

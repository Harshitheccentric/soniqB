"""
Authentication endpoints for SoniqB.
Handles user registration, login, and profile management.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator

from backend.db import get_db
from backend.models import User
from backend.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_HOURS
)

router = APIRouter(prefix="/auth", tags=["authentication"])


# Request/Response schemas
class UserRegister(BaseModel):
    username: str
    password: str
    
    @validator('username')
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v
    
    @validator('password')
    def password_valid(cls, v):
        if len(v) < 4:
            raise ValueError('Password must be at least 4 characters long')
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: str
    
    class Config:
        from_attributes = True


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Creates a new user account with username and password.
    Returns JWT token for immediate login.
    """
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-create Liked Songs playlist for new user
    from backend.models import Playlist
    liked_playlist = Playlist(
        user_id=new_user.id,
        name="Liked Songs",
        type="liked_songs"
    )
    db.add(liked_playlist)
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": new_user.username},
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "created_at": new_user.created_at.isoformat()
        }
    }


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login with username and password.
    
    Authenticates user credentials and returns JWT token.
    """
    user = authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat()
        }
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's information.
    
    Returns profile information for the logged-in user.
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at.isoformat()
    )


@router.post("/logout")
def logout():
    """
    Logout endpoint.
    
    Since we're using stateless JWT, logout is handled client-side
    by removing the token. This endpoint exists for consistency
    and can be used for logging/analytics.
    """
    return {"message": "Successfully logged out"}

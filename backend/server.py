from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Easy Street API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class GameState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    money: int = 50
    position: int = 0
    turn_count: int = 0
    is_completed: bool = False
    final_money: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GameStateCreate(BaseModel):
    player_id: str


class GameStateUpdate(BaseModel):
    money: int
    position: int
    turn_count: int
    is_completed: bool = False


class GameStats(BaseModel):
    total_games: int
    completed_games: int
    best_game_turns: Optional[int] = None
    average_turns: Optional[float] = None


# Health check
@api_router.get("/")
async def root():
    return {"message": "Easy Street API is running!", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Easy Street"}


# Game State Endpoints
@api_router.post("/games", response_model=GameState)
async def create_game(input: GameStateCreate):
    """Create a new game for a player"""
    game = GameState(player_id=input.player_id)
    await db.games.insert_one(game.model_dump())
    return game


@api_router.get("/games/{player_id}", response_model=Optional[GameState])
async def get_current_game(player_id: str):
    """Get the current active game for a player"""
    game = await db.games.find_one(
        {"player_id": player_id, "is_completed": False},
        sort=[("created_at", -1)]
    )
    if game:
        return GameState(**game)
    return None


@api_router.put("/games/{game_id}", response_model=GameState)
async def update_game(game_id: str, update: GameStateUpdate):
    """Update game state"""
    update_dict = update.model_dump()
    update_dict["updated_at"] = datetime.utcnow()
    
    # If game is completed, store final money
    if update.is_completed:
        update_dict["final_money"] = update.money
    
    result = await db.games.find_one_and_update(
        {"id": game_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return GameState(**result)


@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str):
    """Delete a game"""
    result = await db.games.delete_one({"id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"message": "Game deleted successfully"}


@api_router.get("/stats/{player_id}", response_model=GameStats)
async def get_player_stats(player_id: str):
    """Get statistics for a player"""
    total_games = await db.games.count_documents({"player_id": player_id})
    completed_games = await db.games.count_documents(
        {"player_id": player_id, "is_completed": True}
    )
    
    # Get best game (lowest turns to complete)
    best_game = await db.games.find_one(
        {"player_id": player_id, "is_completed": True},
        sort=[("turn_count", 1)]
    )
    
    # Calculate average turns for completed games
    pipeline = [
        {"$match": {"player_id": player_id, "is_completed": True}},
        {"$group": {"_id": None, "avg_turns": {"$avg": "$turn_count"}}}
    ]
    avg_result = await db.games.aggregate(pipeline).to_list(1)
    
    return GameStats(
        total_games=total_games,
        completed_games=completed_games,
        best_game_turns=best_game["turn_count"] if best_game else None,
        average_turns=round(avg_result[0]["avg_turns"], 1) if avg_result else None
    )


@api_router.get("/leaderboard", response_model=List[dict])
async def get_leaderboard(limit: int = 10):
    """Get top players by fewest turns to complete"""
    pipeline = [
        {"$match": {"is_completed": True}},
        {"$sort": {"turn_count": 1}},
        {"$limit": limit},
        {"$project": {
            "player_id": 1,
            "turn_count": 1,
            "final_money": 1,
            "created_at": 1
        }}
    ]
    results = await db.games.aggregate(pipeline).to_list(limit)
    return results


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

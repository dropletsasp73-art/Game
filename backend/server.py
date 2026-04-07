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


# Character definitions - unlocked based on wins
CHARACTERS = [
    {"id": "sunny", "name": "Sunny", "icon": "sunny", "color": "#FFD54F", "wins_required": 0},
    {"id": "leaf", "name": "Leaf", "icon": "leaf", "color": "#8BC34A", "wins_required": 0},
    {"id": "star", "name": "Star", "icon": "star", "color": "#7CB9A8", "wins_required": 1},
    {"id": "heart", "name": "Heart", "icon": "heart", "color": "#E8B4A2", "wins_required": 2},
    {"id": "diamond", "name": "Diamond", "icon": "diamond", "color": "#B39DDB", "wins_required": 3},
    {"id": "rocket", "name": "Rocket", "icon": "rocket", "color": "#64B5F6", "wins_required": 5},
    {"id": "flash", "name": "Flash", "icon": "flash", "color": "#FFB74D", "wins_required": 7},
    {"id": "planet", "name": "Planet", "icon": "planet", "color": "#4DB6AC", "wins_required": 10},
    {"id": "trophy", "name": "Champion", "icon": "trophy", "color": "#FFC107", "wins_required": 15},
    {"id": "crown", "name": "Royal", "icon": "sparkles", "color": "#9C27B0", "wins_required": 20},
]


# Define Models
class PlayerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    total_wins: int = 0
    total_games: int = 0
    best_turns: Optional[int] = None
    selected_character: str = "sunny"
    unlocked_characters: List[str] = Field(default_factory=lambda: ["sunny", "leaf"])
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlayerProfileCreate(BaseModel):
    player_name: str


class PlayerProfileUpdate(BaseModel):
    player_name: Optional[str] = None
    selected_character: Optional[str] = None


class GameState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    player_name: str = "Player"
    money: int = 50
    position: int = 0
    turn_count: int = 0
    is_completed: bool = False
    final_money: Optional[int] = None
    character: str = "sunny"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GameStateCreate(BaseModel):
    player_id: str
    player_name: str = "Player"
    character: str = "sunny"


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


class LeaderboardEntry(BaseModel):
    player_id: str
    player_name: str
    turn_count: int
    final_money: int
    character: str
    created_at: datetime


# Health check
@api_router.get("/")
async def root():
    return {"message": "Easy Street API is running!", "version": "2.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Easy Street"}


# Character endpoints
@api_router.get("/characters")
async def get_all_characters():
    """Get all available characters"""
    return CHARACTERS


@api_router.get("/characters/unlocked/{player_id}")
async def get_unlocked_characters(player_id: str):
    """Get characters unlocked by a player"""
    profile = await db.profiles.find_one({"id": player_id})
    if not profile:
        # Return default unlocked characters
        return [c for c in CHARACTERS if c["wins_required"] == 0]
    
    wins = profile.get("total_wins", 0)
    unlocked = [c for c in CHARACTERS if c["wins_required"] <= wins]
    return unlocked


# Player Profile Endpoints
@api_router.post("/profiles", response_model=PlayerProfile)
async def create_profile(input: PlayerProfileCreate):
    """Create a new player profile"""
    profile = PlayerProfile(player_name=input.player_name)
    await db.profiles.insert_one(profile.model_dump())
    return profile


@api_router.get("/profiles/{player_id}", response_model=Optional[PlayerProfile])
async def get_profile(player_id: str):
    """Get a player profile"""
    profile = await db.profiles.find_one({"id": player_id})
    if profile:
        return PlayerProfile(**profile)
    return None


@api_router.put("/profiles/{player_id}", response_model=PlayerProfile)
async def update_profile(player_id: str, update: PlayerProfileUpdate):
    """Update player profile"""
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.profiles.find_one_and_update(
        {"id": player_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return PlayerProfile(**result)


@api_router.post("/profiles/{player_id}/record-win")
async def record_win(player_id: str, turns: int):
    """Record a win and check for character unlocks"""
    profile = await db.profiles.find_one({"id": player_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    current_wins = profile.get("total_wins", 0)
    new_wins = current_wins + 1
    best_turns = profile.get("best_turns")
    
    update_dict = {
        "total_wins": new_wins,
        "total_games": profile.get("total_games", 0) + 1,
        "updated_at": datetime.utcnow()
    }
    
    # Update best turns if this is better
    if best_turns is None or turns < best_turns:
        update_dict["best_turns"] = turns
    
    # Check for new character unlocks
    newly_unlocked = []
    current_unlocked = profile.get("unlocked_characters", ["sunny", "leaf"])
    
    for char in CHARACTERS:
        if char["id"] not in current_unlocked and char["wins_required"] <= new_wins:
            newly_unlocked.append(char["id"])
            current_unlocked.append(char["id"])
    
    if newly_unlocked:
        update_dict["unlocked_characters"] = current_unlocked
    
    await db.profiles.update_one({"id": player_id}, {"$set": update_dict})
    
    return {
        "total_wins": new_wins,
        "newly_unlocked": newly_unlocked,
        "all_unlocked": current_unlocked
    }


# Game State Endpoints
@api_router.post("/games", response_model=GameState)
async def create_game(input: GameStateCreate):
    """Create a new game for a player"""
    game = GameState(
        player_id=input.player_id,
        player_name=input.player_name,
        character=input.character
    )
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


@api_router.get("/games/by-id/{game_id}", response_model=Optional[GameState])
async def get_game_by_id(game_id: str):
    """Get a specific game by ID"""
    game = await db.games.find_one({"id": game_id})
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


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 20):
    """Get top players by fewest turns to complete"""
    pipeline = [
        {"$match": {"is_completed": True}},
        {"$sort": {"turn_count": 1, "final_money": -1}},
        {"$limit": limit},
        {"$project": {
            "player_id": 1,
            "player_name": 1,
            "turn_count": 1,
            "final_money": 1,
            "character": 1,
            "created_at": 1
        }}
    ]
    results = await db.games.aggregate(pipeline).to_list(limit)
    return [LeaderboardEntry(**r) for r in results]


@api_router.get("/leaderboard/weekly", response_model=List[LeaderboardEntry])
async def get_weekly_leaderboard(limit: int = 20):
    """Get top players from the past week"""
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    pipeline = [
        {"$match": {"is_completed": True, "created_at": {"$gte": week_ago}}},
        {"$sort": {"turn_count": 1, "final_money": -1}},
        {"$limit": limit},
        {"$project": {
            "player_id": 1,
            "player_name": 1,
            "turn_count": 1,
            "final_money": 1,
            "character": 1,
            "created_at": 1
        }}
    ]
    results = await db.games.aggregate(pipeline).to_list(limit)
    return [LeaderboardEntry(**r) for r in results]


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
